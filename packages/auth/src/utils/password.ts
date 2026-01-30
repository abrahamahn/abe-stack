// packages/auth/src/utils/password.ts
/**
 * Password Hashing Utilities
 *
 * Uses Argon2id (OWASP recommended) for secure password hashing.
 * All functions accept configuration parameters for testability.
 *
 * @module utils/password
 */

import argon2 from 'argon2';

import type { Options } from 'argon2';

// ============================================================================
// Types
// ============================================================================

/**
 * Argon2 hashing configuration.
 */
export interface Argon2Config {
  /** Argon2 type: 0 = argon2d, 1 = argon2i, 2 = argon2id */
  type: 0 | 1 | 2;
  /** Memory cost in KiB */
  memoryCost: number;
  /** Number of iterations */
  timeCost: number;
  /** Degree of parallelism */
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
 * Hash a password using Argon2id (OWASP recommended).
 *
 * @param password - Plain text password to hash
 * @param config - Argon2 configuration (defaults to OWASP recommendations)
 * @returns Argon2 hash string
 * @complexity O(1) - constant time based on config params
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
 * Verify a password against a hash.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param password - Plain text password to verify
 * @param hash - Argon2 hash to verify against
 * @returns True if the password matches the hash
 * @complexity O(1) - constant time
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Check if a hash needs to be rehashed (e.g., params changed).
 *
 * @param hash - Existing hash to check
 * @param config - Current Argon2 configuration
 * @returns True if the hash should be regenerated
 * @complexity O(1)
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
 * Pool of pre-computed dummy hashes for timing attack prevention.
 * Using a pool with random selection prevents attackers from detecting
 * patterns in timing when the user doesn't exist.
 */
const DUMMY_HASH_POOL_SIZE = 10;
let dummyHashPool: string[] = [];
let poolInitialized = false;

/**
 * Initialize the dummy hash pool with pre-computed Argon2id hashes.
 * Should be called at server startup for optimal performance.
 *
 * @param config - Argon2 configuration for generating dummy hashes
 * @returns Promise that resolves when pool is initialized
 * @complexity O(POOL_SIZE) - generates POOL_SIZE hashes
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
    const dummyPassword = `dummy_password_${String(i)}_${String(Date.now())}_${String(Math.random())}`;
    hashPromises.push(hashPassword(dummyPassword, config));
  }

  dummyHashPool = await Promise.all(hashPromises);
  poolInitialized = true;
}

/**
 * Get a random dummy hash from the pool.
 * Falls back to generating one on-the-fly if pool not initialized.
 *
 * @param config - Argon2 configuration for fallback generation
 * @returns A dummy hash for timing-safe comparison
 * @complexity O(1) if pool initialized, O(1) async otherwise
 */
async function getRandomDummyHash(config: Argon2Config = DEFAULT_ARGON2_CONFIG): Promise<string> {
  if (dummyHashPool.length > 0) {
    const randomIndex = Math.floor(Math.random() * dummyHashPool.length);
    return dummyHashPool[randomIndex] as string;
  }

  // Fallback: generate hash on-the-fly (less optimal but secure)
  return hashPassword(`fallback_dummy_${String(Date.now())}`, config);
}

/**
 * Check if the dummy hash pool has been initialized.
 * Useful for health checks and startup verification.
 *
 * @returns True if the pool is initialized and full
 * @complexity O(1)
 */
export function isDummyHashPoolInitialized(): boolean {
  return poolInitialized && dummyHashPool.length === DUMMY_HASH_POOL_SIZE;
}

/**
 * Reset the dummy hash pool (primarily for testing).
 *
 * @complexity O(1)
 */
export function resetDummyHashPool(): void {
  dummyHashPool = [];
  poolInitialized = false;
}

/**
 * Verify password with timing attack protection.
 * Always performs hash verification even if user doesn't exist.
 * Uses random hash from pool to prevent timing analysis patterns.
 *
 * @param password - Plain text password to verify
 * @param hash - User's password hash (null if user not found)
 * @returns True if password is valid and hash is present
 * @complexity O(1) - constant time regardless of user existence
 */
export async function verifyPasswordSafe(
  password: string,
  hash: string | null | undefined,
): Promise<boolean> {
  const hashToVerify =
    hash !== undefined && hash !== null && hash !== '' ? hash : await getRandomDummyHash();
  const isValid = await verifyPassword(password, hashToVerify);
  return hash !== undefined && hash !== null && hash !== '' ? isValid : false;
}
