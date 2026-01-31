/**
 * Account Lockout Functions
 *
 * Handles login attempt tracking, progressive delays, and account lockout.
 *
 * @module security/lockout
 */
import { type DbClient } from '@abe-stack/db';
import type { LockoutConfig, LockoutStatus } from './types';
/**
 * Log a login attempt to the database.
 *
 * @param db - Database client
 * @param email - User email
 * @param success - Whether the login attempt succeeded
 * @param ipAddress - Client IP address
 * @param userAgent - Client user agent
 * @param failureReason - Reason for failure (if applicable)
 * @returns Promise that resolves when the attempt is logged
 * @complexity O(1)
 */
export declare function logLoginAttempt(db: DbClient, email: string, success: boolean, ipAddress?: string, userAgent?: string, failureReason?: string): Promise<void>;
/**
 * Check if an account is currently locked out.
 *
 * @param db - Database client
 * @param email - User email to check
 * @param lockoutConfig - Lockout configuration
 * @returns True if the account is locked, false otherwise
 * @complexity O(1) - database count query
 */
export declare function isAccountLocked(db: DbClient, email: string, lockoutConfig: LockoutConfig): Promise<boolean>;
/**
 * Get progressive delay in milliseconds based on failed attempt count.
 * Implements exponential backoff: 1s, 2s, 4s, 8s, 16s...
 *
 * @param db - Database client
 * @param email - User email
 * @param lockoutConfig - Lockout configuration
 * @returns Delay in milliseconds (0 if no delay needed)
 * @complexity O(1) - database count query
 */
export declare function getProgressiveDelay(db: DbClient, email: string, lockoutConfig: LockoutConfig): Promise<number>;
/**
 * Apply progressive delay before allowing next login attempt.
 *
 * @param db - Database client
 * @param email - User email
 * @param lockoutConfig - Lockout configuration
 * @returns Promise that resolves after the delay
 * @complexity O(1) + delay time
 */
export declare function applyProgressiveDelay(db: DbClient, email: string, lockoutConfig: LockoutConfig): Promise<void>;
/**
 * Clear successful login attempts for a user (called after successful login).
 * We don't actually delete them (for audit trail).
 * The lockout check only counts failed attempts within the window.
 *
 * @param _db - Database client (unused - kept for API compatibility)
 * @param _email - User email (unused - kept for API compatibility)
 * @returns Promise that resolves immediately
 * @complexity O(1)
 */
export declare function clearLoginAttempts(_db: DbClient, _email: string): Promise<void>;
/**
 * Get detailed account lockout status.
 * Returns information about current lockout state and remaining time.
 *
 * @param db - Database client
 * @param email - User email
 * @param lockoutConfig - Lockout configuration
 * @returns Lockout status information
 * @complexity O(1) - database queries
 */
export declare function getAccountLockoutStatus(db: DbClient, email: string, lockoutConfig: LockoutConfig): Promise<LockoutStatus>;
/**
 * Manually unlock an account (admin function).
 * Clears failed login attempts by logging a successful "unlock" event.
 *
 * IMPORTANT: This should only be called by authorized admin users.
 * Caller is responsible for authorization checks.
 *
 * @param db - Database client
 * @param email - User email to unlock
 * @param adminUserId - ID of admin performing the unlock (for audit trail)
 * @param reason - Reason for unlocking the account (for audit trail)
 * @param ipAddress - Optional IP address of admin performing unlock
 * @param userAgent - Optional user agent of admin performing unlock
 * @returns Promise that resolves when account is unlocked
 * @complexity O(1) - database queries
 */
export declare function unlockAccount(db: DbClient, email: string, adminUserId: string, reason: string, ipAddress?: string, userAgent?: string): Promise<void>;
//# sourceMappingURL=lockout.d.ts.map