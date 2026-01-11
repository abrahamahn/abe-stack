// backend/server/src/infra/security/password.ts
/**
 * Password hashing and verification
 * Uses Argon2id (OWASP recommended)
 */

import argon2 from 'argon2';

import type { AuthConfig } from '../config/auth';
import type { Options } from 'argon2';

/**
 * Get Argon2 options from config
 * Centralized to ensure consistency across hashing and rehash checks
 */
function getArgon2Options(authConfig: AuthConfig): Options {
  return {
    type: authConfig.argon2.type,
    memoryCost: authConfig.argon2.memoryCost,
    timeCost: authConfig.argon2.timeCost,
    parallelism: authConfig.argon2.parallelism,
  };
}

/**
 * Hash a password using Argon2id (OWASP recommended)
 * @param authConfig - Authentication configuration
 * @param password - Plain text password
 * @returns Promise<string> - Hashed password
 */
export async function hashPassword(authConfig: AuthConfig, password: string): Promise<string> {
  return argon2.hash(password, getArgon2Options(authConfig));
}

/**
 * Verify a password against a hash
 * Uses constant-time comparison to prevent timing attacks
 * @param password - Plain text password
 * @param hash - Stored hash
 * @returns Promise<boolean> - True if password matches
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    // Invalid hash format or other error
    return false;
  }
}

/**
 * Check if a hash needs to be rehashed (e.g., params changed)
 * @param authConfig - Authentication configuration
 * @param hash - Stored hash
 * @returns boolean - True if rehash is needed
 */
export function needsRehash(authConfig: AuthConfig, hash: string): boolean {
  return argon2.needsRehash(hash, getArgon2Options(authConfig));
}

/**
 * Dummy hash for timing attack prevention
 * When user doesn't exist, we hash against this to maintain constant time
 */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$dW5yZWFjaGFibGVkdW1teWhhc2g$N8Z0V0V0V0V0V0V0V0V0V0V0V0V0V0V0V0V0V0';

/**
 * Verify password with timing attack protection
 * Always performs hash verification even if user doesn't exist
 * @param password - Plain text password
 * @param hash - Stored hash (or null/undefined if user doesn't exist)
 * @returns Promise<boolean> - True if password matches
 */
export async function verifyPasswordSafe(
  password: string,
  hash: string | null | undefined,
): Promise<boolean> {
  const hashToVerify = hash || DUMMY_HASH;
  const isValid = await verifyPassword(password, hashToVerify);
  // If hash was dummy, always return false
  return hash ? isValid : false;
}
