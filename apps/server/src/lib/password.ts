// apps/server/src/lib/password.ts
import argon2 from 'argon2';

import { authConfig } from '../config/auth';

/**
 * Hash a password using Argon2id (OWASP recommended)
 * @param password - Plain text password
 * @returns Promise<string> - Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: authConfig.argon2.type,
    memoryCost: authConfig.argon2.memoryCost,
    timeCost: authConfig.argon2.timeCost,
    parallelism: authConfig.argon2.parallelism,
  });
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
 * @param hash - Stored hash
 * @returns boolean - True if rehash is needed
 */
export function needsRehash(hash: string): boolean {
  return argon2.needsRehash(hash, {
    memoryCost: authConfig.argon2.memoryCost,
    timeCost: authConfig.argon2.timeCost,
    parallelism: authConfig.argon2.parallelism,
  });
}
