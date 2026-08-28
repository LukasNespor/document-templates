/**
 * Rate limiting and lockout for authentication endpoints.
 *
 * State lives in Azure Table Storage, not in memory, so the limit holds across
 * all serverless instances. Keys are stored as SHA-256 hashes - the table never
 * contains a plain username or IP address.
 */

import { TableClient, AzureNamedKeyCredential } from "@azure/data-tables";
import { createHash } from "crypto";

const tableName = "DocumentTemplateLoginAttempts";

/**
 * Lockout policy. Failed attempts are counted inside a rolling window;
 * reaching the limit locks the key for the lockout duration.
 */
export const RATE_LIMIT_MAX_ATTEMPTS = 5;
export const RATE_LIMIT_WINDOW_MINUTES = 15;
export const RATE_LIMIT_LOCKOUT_MINUTES = 15;

const WINDOW_MS = RATE_LIMIT_WINDOW_MINUTES * 60 * 1000;
const LOCKOUT_MS = RATE_LIMIT_LOCKOUT_MINUTES * 60 * 1000;

// Number of tries when a concurrent request wins the read-modify-write race
const MAX_WRITE_RETRIES = 3;

export type RateLimitScope = "username" | "ip" | "user";

export interface RateLimitKey {
  scope: RateLimitScope;
  value: string;
}

interface AttemptEntity {
  partitionKey: string;
  rowKey: string;
  failedAttempts: number;
  windowStartedAt: string;
  lockedUntil: string;
  etag?: string;
}

let tableClient: TableClient;
let tableExistsPromise: Promise<void> | null = null;

function getTableClient(): TableClient {
  if (!tableClient) {
    // Read environment variables when the function is called, not at module load time
    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || "";
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || "";

    const credential = new AzureNamedKeyCredential(accountName, accountKey);
    tableClient = new TableClient(
      `https://${accountName}.table.core.windows.net`,
      tableName,
      credential
    );
  }
  return tableClient;
}

async function ensureTableExists(): Promise<void> {
  // Cache the promise so we only check once per serverless function instance
  if (!tableExistsPromise) {
    tableExistsPromise = (async () => {
      const tableClient = getTableClient();
      try {
        await tableClient.createTable();
      } catch (error: any) {
        // Only ignore "table already exists" errors
        if (error?.statusCode !== 409 && !error?.message?.includes("TableAlreadyExists")) {
          console.error("Failed to create login attempts table:", error);
          throw error;
        }
      }
    })();
  }
  return tableExistsPromise;
}

/**
 * Hash the key so the table stores no personal data and the value is always
 * a valid Azure Table row key.
 */
function hashKey(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

/**
 * Resolve the client IP behind the Vercel proxy.
 * Falls back to a constant so requests without headers still share one bucket.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstAddress = forwardedFor.split(",")[0].trim();
    if (firstAddress) {
      return firstAddress;
    }
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  return "unknown";
}

async function getAttemptEntity(key: RateLimitKey): Promise<AttemptEntity | null> {
  const tableClient = getTableClient();

  try {
    const entity = await tableClient.getEntity(key.scope, hashKey(key.value));
    return {
      partitionKey: entity.partitionKey as string,
      rowKey: entity.rowKey as string,
      failedAttempts: (entity.failedAttempts as number) || 0,
      windowStartedAt: (entity.windowStartedAt as string) || "",
      lockedUntil: (entity.lockedUntil as string) || "",
      etag: entity.etag as string,
    };
  } catch (error: any) {
    if (error?.statusCode === 404 || error?.message?.includes("ResourceNotFound")) {
      return null;
    }
    throw error;
  }
}

function isConflict(error: any): boolean {
  return error?.statusCode === 409 || error?.statusCode === 412;
}

function isLocked(entity: AttemptEntity | null, now: number): boolean {
  if (!entity || !entity.lockedUntil) {
    return false;
  }

  const lockedUntil = Date.parse(entity.lockedUntil);
  return Number.isFinite(lockedUntil) && lockedUntil > now;
}

/**
 * Check whether any of the given keys is currently locked out.
 * Must be called before loading the user and before verifying the password.
 *
 * Storage problems fail open so a Table Storage outage cannot lock every user
 * out of the application. The error is logged instead.
 */
export async function isRateLimited(keys: RateLimitKey[]): Promise<boolean> {
  try {
    await ensureTableExists();

    const now = Date.now();
    const entities = await Promise.all(keys.map((key) => getAttemptEntity(key)));

    return entities.some((entity) => isLocked(entity, now));
  } catch (error) {
    console.error("Rate limit check failed, allowing the request:", error);
    return false;
  }
}

async function recordFailureForKey(key: RateLimitKey): Promise<void> {
  const tableClient = getTableClient();
  const rowKey = hashKey(key.value);

  for (let retry = 0; retry < MAX_WRITE_RETRIES; retry++) {
    const now = Date.now();
    const existing = await getAttemptEntity(key);

    const windowStartedAt = existing?.windowStartedAt
      ? Date.parse(existing.windowStartedAt)
      : NaN;
    const windowIsOpen =
      Number.isFinite(windowStartedAt) && now - windowStartedAt < WINDOW_MS;

    const failedAttempts = windowIsOpen ? (existing?.failedAttempts || 0) + 1 : 1;
    const lockedUntil =
      failedAttempts >= RATE_LIMIT_MAX_ATTEMPTS
        ? new Date(now + LOCKOUT_MS).toISOString()
        : "";

    const entity = {
      partitionKey: key.scope,
      rowKey,
      failedAttempts,
      windowStartedAt: windowIsOpen
        ? (existing?.windowStartedAt as string)
        : new Date(now).toISOString(),
      lockedUntil,
    };

    try {
      if (existing) {
        await tableClient.updateEntity(entity, "Replace", { etag: existing.etag });
      } else {
        await tableClient.createEntity(entity);
      }
      return;
    } catch (error: any) {
      // Another request updated the same key first, read it again and retry
      if (!isConflict(error)) {
        throw error;
      }
    }
  }
}

/**
 * Count one failed attempt against every given key and lock it once the
 * limit inside the window is reached.
 */
export async function recordFailedAttempt(keys: RateLimitKey[]): Promise<void> {
  try {
    await ensureTableExists();
    await Promise.all(keys.map((key) => recordFailureForKey(key)));
  } catch (error) {
    console.error("Failed to record a failed authentication attempt:", error);
  }
}

/**
 * Clear the counter for the given keys after a successful authentication.
 */
export async function resetAttempts(keys: RateLimitKey[]): Promise<void> {
  try {
    await ensureTableExists();
    const tableClient = getTableClient();

    await Promise.all(
      keys.map(async (key) => {
        try {
          await tableClient.deleteEntity(key.scope, hashKey(key.value));
        } catch (error: any) {
          // Nothing to clear when the key was never counted
          if (error?.statusCode !== 404) {
            throw error;
          }
        }
      })
    );
  } catch (error) {
    console.error("Failed to reset authentication attempts:", error);
  }
}
