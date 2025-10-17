/**
 * Centralized error handling and logging utilities for authentication
 * Ensures sensitive information is never logged or exposed to clients
 */

/**
 * Standard authentication error messages (in Czech)
 * Using generic messages to prevent user enumeration attacks
 */
export const AUTH_ERRORS = {
  INVALID_CREDENTIALS: "Neplatné uživatelské jméno nebo heslo",
  UNAUTHORIZED: "Neautorizováno",
  SESSION_ERROR: "Při kontrole relace došlo k chybě",
  LOGIN_ERROR: "Při přihlašování došlo k chybě",
  LOGOUT_ERROR: "Při odhlašování došlo k chybě",
  MISSING_CREDENTIALS: "Uživatelské jméno a heslo jsou povinné",
  INVALID_USERNAME: "Neplatné uživatelské jméno",
  INVALID_PASSWORD: "Neplatné heslo",
  SETUP_ALREADY_COMPLETED: "Počáteční nastavení již bylo dokončeno",
  SETUP_FAILED: "Nepodařilo se dokončit počáteční nastavení",
  SERVER_ERROR: "Došlo k chybě serveru",
} as const;

/**
 * Authentication error types for internal tracking
 */
export enum AuthErrorType {
  USER_NOT_FOUND = "USER_NOT_FOUND",
  INVALID_PASSWORD = "INVALID_PASSWORD",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  SESSION_ERROR = "SESSION_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

/**
 * Safely logs authentication errors without exposing sensitive information
 * @param context - Description of where the error occurred
 * @param error - The error object
 * @param metadata - Additional non-sensitive metadata for debugging
 */
export function logAuthError(
  context: string,
  error: unknown,
  metadata?: Record<string, string | number | boolean>
): void {
  // Create a sanitized error object without sensitive data
  const sanitizedError = {
    context,
    timestamp: new Date().toISOString(),
    errorType: error instanceof Error ? error.constructor.name : "Unknown",
    message: error instanceof Error ? error.message : String(error),
    metadata: metadata || {},
  };

  // In production, you might want to send this to a logging service
  console.error("[AUTH ERROR]", JSON.stringify(sanitizedError, null, 2));
}

/**
 * Safely logs authentication attempts for security monitoring
 * @param username - The username (safe to log)
 * @param success - Whether the attempt was successful
 * @param errorType - The type of error if unsuccessful
 */
export function logAuthAttempt(
  username: string,
  success: boolean,
  errorType?: AuthErrorType
): void {
  const logEntry = {
    timestamp: new Date().toISOString(),
    username: username || "unknown",
    success,
    errorType: errorType || null,
  };

  // In production, you might want to send this to a security monitoring service
  console.log("[AUTH ATTEMPT]", JSON.stringify(logEntry));
}

/**
 * Creates a safe error response for authentication failures
 * Always returns generic messages to prevent user enumeration
 * @param errorType - Internal error type for logging
 * @param username - Username for logging (optional)
 * @returns Generic error message suitable for client response
 */
export function createAuthErrorResponse(
  errorType: AuthErrorType,
  username?: string
): string {
  // Log the specific error internally
  if (username) {
    logAuthAttempt(username, false, errorType);
  }

  // Return generic message to client to prevent user enumeration
  switch (errorType) {
    case AuthErrorType.USER_NOT_FOUND:
    case AuthErrorType.INVALID_PASSWORD:
      return AUTH_ERRORS.INVALID_CREDENTIALS;
    case AuthErrorType.VALIDATION_ERROR:
      return AUTH_ERRORS.INVALID_CREDENTIALS;
    default:
      return AUTH_ERRORS.LOGIN_ERROR;
  }
}
