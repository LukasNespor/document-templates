import bcrypt from "bcrypt";
import { getIronSession, IronSession } from "iron-session";
import { SessionData } from "@/types";
import { cookies } from "next/headers";
import { sessionOptions } from "./session-config";
import { getUserById } from "./azure-users";

const SALT_ROUNDS = 10;

// Re-export session options for backward compatibility
export { sessionOptions };

/**
 * Hash a plain text password using bcrypt
 * This is a one-way operation - the hash cannot be converted back to the original password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a plain text password against a stored hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Get the current session
 */
export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export interface CurrentUser {
  userId: string;
  username: string;
  salutation?: string;
  isAdmin?: boolean;
  canBulkGenerate?: boolean;
}

/**
 * Check if the user is authenticated
 * Backed by the same storage check as getCurrentUser, so a session that is no
 * longer valid does not pass here either
 */
export async function isAuthenticated(): Promise<boolean> {
  return (await getCurrentUser()) !== null;
}

/**
 * Get the current user for the request
 *
 * The session cookie only identifies the user - the account itself and its
 * privileges are always re-read from storage. A cookie is signed but not
 * revocable, so trusting the isAdmin or canBulkGenerate values it carries would
 * keep a deleted account alive and let a revoked administrator act as one until
 * the cookie expired. Reading the record instead makes deletion, a changed
 * privilege and a password reset take effect on the very next request.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();

  if (!session.isLoggedIn || !session.userId || !session.username) {
    return null;
  }

  // A missing record means the account was deleted, or storage is unreachable.
  // Both end the session - failing closed is the safe direction here.
  const user = await getUserById(session.userId);
  if (!user) {
    return null;
  }

  // Sessions issued before the last password change are no longer valid, so
  // resetting a password evicts whoever else was holding a session
  if (user.passwordChangedAt && user.passwordChangedAt !== session.passwordChangedAt) {
    return null;
  }

  return {
    userId: user.id,
    username: user.username,
    salutation: user.salutation,
    isAdmin: user.isAdmin,
    canBulkGenerate: user.canBulkGenerate,
  };
}
