/**
 * Centralized session configuration for iron-session
 * This module ensures consistent session configuration across the application
 * and validates that SESSION_SECRET is properly configured before any session
 * is created or read
 */

import { SessionOptions } from "iron-session";

/**
 * The placeholder value shipped in .env.example. It is published with the
 * source code, so a deployment still using it has no session security at all -
 * anyone could seal their own cookie and log in as an administrator.
 */
const INSECURE_DEFAULT_SECRET =
  "complex_password_at_least_32_characters_long_change_this";

/**
 * Minimum secret length. iron-session itself refuses anything shorter.
 */
const MIN_SESSION_SECRET_LENGTH = 32;

/**
 * Validates SESSION_SECRET and fails fast when it cannot protect a session.
 * Applies in every environment - a development session is sealed with the same
 * mechanism as a production one, and a secret that is public is never usable.
 */
function validateSessionSecret(
  secret: string | undefined
): asserts secret is string {
  if (!secret) {
    throw new Error(
      "SESSION_SECRET environment variable is required. " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }

  if (secret === INSECURE_DEFAULT_SECRET) {
    throw new Error(
      "SESSION_SECRET is still set to the placeholder from .env.example. " +
      "That value is public, so session cookies sealed with it can be forged. " +
      "Generate your own secret before starting the application."
    );
  }

  if (secret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error(
      `SESSION_SECRET must be at least ${MIN_SESSION_SECRET_LENGTH} characters long. ` +
      `Current length: ${secret.length} characters.`
    );
  }
}

/**
 * Gets session configuration options for iron-session
 * Used consistently across lib/auth.ts and middleware.ts
 * Validates SESSION_SECRET on first access
 */
function getSessionOptions(): SessionOptions {
  const sessionSecret = process.env.SESSION_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  validateSessionSecret(sessionSecret);

  return {
    password: sessionSecret,
    cookieName: "word_templates_session",
    cookieOptions: {
      secure: isProduction,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  };
}

/**
 * Lazy-initialized session options
 * Uses Proxy to validate SESSION_SECRET only when actually accessed at runtime.
 * Nothing is cached until validation passes, so a misconfigured deployment keeps
 * failing on every request instead of succeeding once.
 */
let cachedOptions: SessionOptions | null = null;

function resolveOptions(): SessionOptions {
  if (!cachedOptions) {
    cachedOptions = getSessionOptions();
  }
  return cachedOptions;
}

export const sessionOptions = new Proxy({} as SessionOptions, {
  get(_target, prop) {
    return resolveOptions()[prop as keyof SessionOptions];
  },
  ownKeys(_target) {
    return Reflect.ownKeys(resolveOptions());
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(resolveOptions(), prop);
  }
});

/**
 * Session duration in seconds (7 days)
 */
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

/**
 * Session duration in human-readable format
 */
export const SESSION_DURATION_DESCRIPTION = "7 days";
