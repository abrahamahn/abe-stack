/**
 * Password Utilities
 *
 * Core functionality for secure password handling, including
 * hashing, verification, and validation.
 */

import { scrypt, randomBytes } from "crypto";

/**
 * Password strength requirements
 */
export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

/**
 * Default password requirements
 */
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

/**
 * Options for password hashing
 */
export interface PasswordHashOptions {
  iterations?: number;
  memory?: number;
  parallelism?: number;
  hashLength?: number;
  salt?: string;
}

/**
 * Generate a secure password hash using scrypt
 *
 * @param password - Plain text password to hash
 * @param salt - Salt for hashing (required)
 * @param options - Password hashing options
 * @returns Promise resolving to the hashed password as a base64 string
 */
export async function hashPassword(
  password: string,
  salt: string,
  options?: PasswordHashOptions
): Promise<string> {
  const iterations = options?.iterations || 16384;
  const keyLength = options?.hashLength || 64;

  return await new Promise<string>((resolve, reject) => {
    // Use reasonable scrypt parameters that won't exceed memory limits
    const scryptOptions = {
      N: iterations, // CPU/memory cost parameter
      r: options?.parallelism || 8, // Block size parameter
      p: options?.memory || 1, // Parallelization parameter
      maxmem: 128 * 1024 * 1024, // 128MB - adjust based on your environment
    };

    scrypt(password, salt, keyLength, scryptOptions, (error, hash) => {
      if (error) return reject(error);
      else resolve(hash.toString("base64"));
    });
  });
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string,
  options?: PasswordHashOptions
): Promise<boolean> {
  const passwordHash = await hashPassword(password, salt, options);
  return passwordHash === hash;
}

/**
 * Generate a secure random password
 */
export function generateRandomPassword(length: number = 12): string {
  if (length < 8) {
    length = 8; // Minimum length to ensure we can include all character types
  }

  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const special = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  // Ensure at least one character from each group
  let result = "";
  result += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  result += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  result += numbers.charAt(Math.floor(Math.random() * numbers.length));
  result += special.charAt(Math.floor(Math.random() * special.length));

  // Fill the rest with random characters from all groups
  const allChars = uppercase + lowercase + numbers + special;
  const randomBytesBuffer = randomBytes(length * 2);

  for (let i = result.length; i < length; i++) {
    const randomIndex =
      randomBytesBuffer[i % randomBytesBuffer.length] % allChars.length;
    result += allChars.charAt(randomIndex);
  }

  // Shuffle the result to make the pattern less predictable
  return shuffleString(result);
}

/**
 * Helper function to shuffle a string
 */
function shuffleString(str: string): string {
  const array = str.split("");
  const randomBytesBuffer = randomBytes(array.length);

  // Fisher-Yates shuffle algorithm with crypto randomness
  for (let i = array.length - 1; i > 0; i--) {
    const j = randomBytesBuffer[i % randomBytesBuffer.length] % (i + 1);
    [array[i], array[j]] = [array[j], array[i]];
  }

  return array.join("");
}

/**
 * Validate password strength against requirements
 *
 * @param password - Password to validate
 * @param requirements - Password requirements (uses default if not provided)
 * @returns Object with result and any failure reasons
 */
export function validatePasswordStrength(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): { valid: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (password.length < requirements.minLength) {
    reasons.push(
      `Password must be at least ${requirements.minLength} characters long`
    );
  }

  if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
    reasons.push("Password must contain at least one uppercase letter");
  }

  if (requirements.requireLowercase && !/[a-z]/.test(password)) {
    reasons.push("Password must contain at least one lowercase letter");
  }

  if (requirements.requireNumbers && !/[0-9]/.test(password)) {
    reasons.push("Password must contain at least one number");
  }

  if (requirements.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
    reasons.push("Password must contain at least one special character");
  }

  return {
    valid: reasons.length === 0,
    reasons,
  };
}
