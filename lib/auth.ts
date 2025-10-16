import bcrypt from "bcrypt";
import { getIronSession, IronSession } from "iron-session";
import { SessionData } from "@/types";
import { cookies } from "next/headers";

const SALT_ROUNDS = 10;

// Session configuration
export const sessionOptions = {
  password: process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long_change_this",
  cookieName: "word_templates_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

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

/**
 * Check if the user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return session.isLoggedIn === true;
}

/**
 * Get the current user from session
 */
export async function getCurrentUser(): Promise<{ userId: string; username: string; salutation?: string; isAdmin?: boolean } | null> {
  const session = await getSession();
  if (session.isLoggedIn && session.userId && session.username) {
    return {
      userId: session.userId,
      username: session.username,
      salutation: session.salutation,
      isAdmin: session.isAdmin,
    };
  }
  return null;
}
