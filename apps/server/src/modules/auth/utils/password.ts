// apps/server/src/modules/auth/utils/password.ts
/**
 * Password Hashing Utilities
 *
 * Uses Argon2id (OWASP recommended) for secure password hashing.
 * All functions accept configuration parameters for testability.
 */

import argon2 from 'argon2';

import type { Options } from 'argon2';

// ============================================================================
// Types
// ============================================================================

export interface Argon2Config {
  type: 0 | 1 | 2;
  memoryCost: number;
  timeCost: number;
  parallelism: number;
}

// Default config matching OWASP recommendations
const DEFAULT_ARGON2_CONFIG: Argon2Config = {
  type: 2, // argon2id
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

// ============================================================================
// Hash Functions
// ============================================================================

/**
 * Hash a password using Argon2id (OWASP recommended)
 */
export async function hashPassword(
  password: string,
  config: Argon2Config = DEFAULT_ARGON2_CONFIG,
): Promise<string> {
  const options: Options = {
    type: config.type,
    memoryCost: config.memoryCost,
    timeCost: config.timeCost,
    parallelism: config.parallelism,
  };
  return argon2.hash(password, options);
}

/**
 * Verify a password against a hash
 * Uses constant-time comparison to prevent timing attacks
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Check if a hash needs to be rehashed (e.g., params changed)
 */
export function needsRehash(hash: string, config: Argon2Config = DEFAULT_ARGON2_CONFIG): boolean {
  // If it's not an argon2 hash, it definitely needs rehashing
  if (!hash.startsWith('$argon2')) {
    return true;
  }

  const options: Options = {
    type: config.type,
    memoryCost: config.memoryCost,
    timeCost: config.timeCost,
    parallelism: config.parallelism,
  };
  return argon2.needsRehash(hash, options);
}

// ============================================================================
// Timing-Safe Verification
// ============================================================================

/**
 * Dummy hash for timing attack prevention
 * When user doesn't exist, we hash against this to maintain constant time
 */
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$dW5yZWFjaGFibGVkdW1teWhhc2g$N8Z0V0V0V0V0V0V0V0V0V0V0V0V0V0V0V0V0V0';

/**
 * Verify password with timing attack protection
 * Always performs hash verification even if user doesn't exist
 */
export async function verifyPasswordSafe(
  password: string,
  hash: string | null | undefined,
): Promise<boolean> {
  const hashToVerify = hash || DUMMY_HASH;
  const isValid = await verifyPassword(password, hashToVerify);
  return hash ? isValid : false;
}
