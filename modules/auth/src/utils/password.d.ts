/**
 * Password Hashing Utilities
 *
 * Uses Argon2id (OWASP recommended) for secure password hashing.
 * All functions accept configuration parameters for testability.
 *
 * @module utils/password
 */
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
/**
 * Hash a password using Argon2id (OWASP recommended).
 *
 * @param password - Plain text password to hash
 * @param config - Argon2 configuration (defaults to OWASP recommendations)
 * @returns Argon2 hash string
 * @complexity O(1) - constant time based on config params
 */
export declare function hashPassword(password: string, config?: Argon2Config): Promise<string>;
/**
 * Verify a password against a hash.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @param password - Plain text password to verify
 * @param hash - Argon2 hash to verify against
 * @returns True if the password matches the hash
 * @complexity O(1) - constant time
 */
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
/**
 * Check if a hash needs to be rehashed (e.g., params changed).
 *
 * @param hash - Existing hash to check
 * @param config - Current Argon2 configuration
 * @returns True if the hash should be regenerated
 * @complexity O(1)
 */
export declare function needsRehash(hash: string, config?: Argon2Config): boolean;
/**
 * Initialize the dummy hash pool with pre-computed Argon2id hashes.
 * Should be called at server startup for optimal performance.
 *
 * @param config - Argon2 configuration for generating dummy hashes
 * @returns Promise that resolves when pool is initialized
 * @complexity O(POOL_SIZE) - generates POOL_SIZE hashes
 */
export declare function initDummyHashPool(config?: Argon2Config): Promise<void>;
/**
 * Check if the dummy hash pool has been initialized.
 * Useful for health checks and startup verification.
 *
 * @returns True if the pool is initialized and full
 * @complexity O(1)
 */
export declare function isDummyHashPoolInitialized(): boolean;
/**
 * Reset the dummy hash pool (primarily for testing).
 *
 * @complexity O(1)
 */
export declare function resetDummyHashPool(): void;
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
export declare function verifyPasswordSafe(password: string, hash: string | null | undefined): Promise<boolean>;
//# sourceMappingURL=password.d.ts.map