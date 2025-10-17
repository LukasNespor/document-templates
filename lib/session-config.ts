/**
 * Centralized session configuration for iron-session
 * This module ensures consistent session configuration across the application
 * and validates that SESSION_SECRET is properly configured in production
 */

import { SessionOptions } from "iron-session";

/**
 * Validates SESSION_SECRET configuration at runtime
 * This is called lazily to avoid build-time failures when SESSION_SECRET isn't available
 */
let hasValidated = false;
function validateSessionSecret() {
  if (hasValidated) return;
  hasValidated = true;

  const sessionSecret = process.env.SESSION_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (!sessionSecret && isProduction) {
    throw new Error(
      "SESSION_SECRET environment variable is required in production. " +
      "Please set a secure random string of at least 32 characters."
    );
  }

  if (sessionSecret && sessionSecret.length < 32) {
    console.warn(
      "WARNING: SESSION_SECRET should be at least 32 characters long for security. " +
      `Current length: ${sessionSecret.length} characters.`
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

  return {
    password: sessionSecret || "complex_password_at_least_32_characters_long_change_this",
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
 * Uses Proxy to validate SESSION_SECRET only when actually accessed at runtime
 */
let cachedOptions: SessionOptions | null = null;

export const sessionOptions = new Proxy({} as SessionOptions, {
  get(_target, prop) {
    if (!cachedOptions) {
      validateSessionSecret();
      cachedOptions = getSessionOptions();
    }
    return cachedOptions[prop as keyof SessionOptions];
  },
  ownKeys(_target) {
    if (!cachedOptions) {
      validateSessionSecret();
      cachedOptions = getSessionOptions();
    }
    return Reflect.ownKeys(cachedOptions);
  },
  getOwnPropertyDescriptor(_target, prop) {
    if (!cachedOptions) {
      validateSessionSecret();
      cachedOptions = getSessionOptions();
    }
    return Reflect.getOwnPropertyDescriptor(cachedOptions, prop);
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
