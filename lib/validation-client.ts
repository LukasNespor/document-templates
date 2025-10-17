/**
 * Client-side validation utilities that mirror lib/validation.ts
 * Used in React components for real-time form validation
 */

// Validation constants
export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 50;
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 72;

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates username on the client side
 * @param username - The username to validate
 * @param allowEmpty - If true, empty username is considered valid (for optional profile updates)
 * @returns ValidationResult with isValid flag and error message if invalid
 */
export function validateUsernameClient(
  username: string,
  allowEmpty: boolean = false
): ValidationResult {
  if (!username || typeof username !== "string") {
    return {
      isValid: allowEmpty,
      error: allowEmpty ? undefined : "Uživatelské jméno je povinné",
    };
  }

  const trimmed = username.trim();

  if (trimmed.length === 0) {
    return {
      isValid: allowEmpty,
      error: allowEmpty ? undefined : "Uživatelské jméno nesmí být prázdné",
    };
  }

  if (trimmed.length < MIN_USERNAME_LENGTH) {
    return {
      isValid: false,
      error: `Uživatelské jméno musí mít alespoň ${MIN_USERNAME_LENGTH} znaky`,
    };
  }

  if (trimmed.length > MAX_USERNAME_LENGTH) {
    return {
      isValid: false,
      error: `Uživatelské jméno může mít maximálně ${MAX_USERNAME_LENGTH} znaků`,
    };
  }

  const validPattern = /^[a-zA-Z0-9\s._-]+$/;
  if (!validPattern.test(trimmed)) {
    return {
      isValid: false,
      error: "Uživatelské jméno může obsahovat pouze písmena, čísla, mezery, tečky, pomlčky a podtržítka",
    };
  }

  return { isValid: true };
}

/**
 * Validates password on the client side
 * @param password - The password to validate
 * @param allowEmpty - If true, empty password is considered valid (for optional profile updates)
 * @returns ValidationResult with isValid flag and error message if invalid
 */
export function validatePasswordClient(
  password: string,
  allowEmpty: boolean = false
): ValidationResult {
  if (!password || typeof password !== "string") {
    return {
      isValid: allowEmpty,
      error: allowEmpty ? undefined : "Heslo je povinné",
    };
  }

  if (password.length === 0) {
    return {
      isValid: allowEmpty,
      error: allowEmpty ? undefined : "Heslo nesmí být prázdné",
    };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      isValid: false,
      error: `Heslo musí mít alespoň ${MIN_PASSWORD_LENGTH} znaků`,
    };
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    return {
      isValid: false,
      error: `Heslo může mít maximálně ${MAX_PASSWORD_LENGTH} znaků`,
    };
  }

  return { isValid: true };
}
