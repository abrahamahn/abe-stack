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
// Timing-Safe Verification with Dummy Hash Pool
// ============================================================================

/**
 * Pool of pre-computed dummy hashes for timing attack prevention
 * Using a pool with random selection prevents attackers from detecting
 * patterns in timing when the user doesn't exist.
 */
const DUMMY_HASH_POOL_SIZE = 10;
let dummyHashPool: string[] = [];
let poolInitialized = false;

/**
 * Initialize the dummy hash pool with pre-computed Argon2id hashes
 * Should be called at server startup for optimal performance
 */
export async function initDummyHashPool(
  config: Argon2Config = DEFAULT_ARGON2_CONFIG,
): Promise<void> {
  if (poolInitialized && dummyHashPool.length === DUMMY_HASH_POOL_SIZE) {
    return;
  }

  const hashPromises: Promise<string>[] = [];
  for (let i = 0; i < DUMMY_HASH_POOL_SIZE; i++) {
    // Use unique dummy passwords to ensure different salts/hashes
    const dummyPassword = `dummy_password_${i}_${Date.now()}_${Math.random()}`;
    hashPromises.push(hashPassword(dummyPassword, config));
  }

  dummyHashPool = await Promise.all(hashPromises);
  poolInitialized = true;
}

/**
 * Get a random dummy hash from the pool
 * Falls back to generating one on-the-fly if pool not initialized
 */
async function getRandomDummyHash(config: Argon2Config = DEFAULT_ARGON2_CONFIG): Promise<string> {
  if (dummyHashPool.length > 0) {
    const randomIndex = Math.floor(Math.random() * dummyHashPool.length);
    return dummyHashPool[randomIndex] as string;
  }

  // Fallback: generate hash on-the-fly (less optimal but secure)
  return hashPassword(`fallback_dummy_${Date.now()}`, config);
}

/**
 * Check if the dummy hash pool has been initialized
 * Useful for health checks and startup verification
 */
export function isDummyHashPoolInitialized(): boolean {
  return poolInitialized && dummyHashPool.length === DUMMY_HASH_POOL_SIZE;
}

/**
 * Reset the dummy hash pool (primarily for testing)
 */
export function resetDummyHashPool(): void {
  dummyHashPool = [];
  poolInitialized = false;
}

/**
 * Verify password with timing attack protection
 * Always performs hash verification even if user doesn't exist
 * Uses random hash from pool to prevent timing analysis patterns
 */
export async function verifyPasswordSafe(
  password: string,
  hash: string | null | undefined,
): Promise<boolean> {
  const hashToVerify = hash || (await getRandomDummyHash());
  const isValid = await verifyPassword(password, hashToVerify);
  return hash ? isValid : false;
}
