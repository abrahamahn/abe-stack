// modules/auth/src/security/lockout.ts
/**
 * Account Lockout Functions
 *
 * Handles login attempt tracking, progressive delays, and account lockout.
 *
 * @module security/lockout
 */
import { and, eq, gte, insert, LOGIN_ATTEMPTS_TABLE, select, selectCount, USERS_TABLE, } from '@abe-stack/db';
import { MAX_PROGRESSIVE_DELAY_MS, PROGRESSIVE_DELAY_WINDOW_MS } from '../types';
import { logAccountUnlockedEvent } from './events';
/**
 * Count failed login attempts for an email within a time window.
 *
 * @param db - Database client
 * @param email - User email
 * @param windowStart - Start of the time window
 * @returns Number of failed attempts
 * @complexity O(1) - database index lookup
 */
async function countFailedAttempts(db, email, windowStart) {
    const result = await db.queryOne(selectCount(LOGIN_ATTEMPTS_TABLE)
        .where(and(eq('email', email), eq('success', false), gte('created_at', windowStart)))
        .toSql());
    return result?.count ?? 0;
}
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
export async function logLoginAttempt(db, email, success, ipAddress, userAgent, failureReason) {
    await db.execute(insert(LOGIN_ATTEMPTS_TABLE)
        .values({
        email,
        success,
        ip_address: ipAddress != null && ipAddress !== '' ? ipAddress : null,
        user_agent: userAgent != null && userAgent !== '' ? userAgent : null,
        failure_reason: failureReason != null && failureReason !== '' ? failureReason : null,
    })
        .toSql());
}
/**
 * Check if an account is currently locked out.
 *
 * @param db - Database client
 * @param email - User email to check
 * @param lockoutConfig - Lockout configuration
 * @returns True if the account is locked, false otherwise
 * @complexity O(1) - database count query
 */
export async function isAccountLocked(db, email, lockoutConfig) {
    const lockoutWindow = new Date(Date.now() - lockoutConfig.lockoutDurationMs);
    const failedAttempts = await countFailedAttempts(db, email, lockoutWindow);
    return failedAttempts >= lockoutConfig.maxAttempts;
}
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
export async function getProgressiveDelay(db, email, lockoutConfig) {
    if (!lockoutConfig.progressiveDelay) {
        return 0;
    }
    const progressiveDelayWindow = new Date(Date.now() - PROGRESSIVE_DELAY_WINDOW_MS);
    const failedAttempts = await countFailedAttempts(db, email, progressiveDelayWindow);
    if (failedAttempts === 0) {
        return 0;
    }
    // Exponential backoff: baseDelay * 2^(attempts - 1)
    // Cap at MAX_PROGRESSIVE_DELAY_MS to prevent excessive delays
    const delay = Math.min(lockoutConfig.baseDelayMs * Math.pow(2, failedAttempts - 1), MAX_PROGRESSIVE_DELAY_MS);
    return delay;
}
/**
 * Apply progressive delay before allowing next login attempt.
 *
 * @param db - Database client
 * @param email - User email
 * @param lockoutConfig - Lockout configuration
 * @returns Promise that resolves after the delay
 * @complexity O(1) + delay time
 */
export async function applyProgressiveDelay(db, email, lockoutConfig) {
    const delay = await getProgressiveDelay(db, email, lockoutConfig);
    if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
}
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
export async function clearLoginAttempts(_db, _email) {
    // No-op - the success: true entry will be enough to show the account is no longer locked
    // The lockout check only counts failed attempts within the window
}
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
export async function getAccountLockoutStatus(db, email, lockoutConfig) {
    const lockoutWindow = new Date(Date.now() - lockoutConfig.lockoutDurationMs);
    const failedAttempts = await countFailedAttempts(db, email, lockoutWindow);
    const isLocked = failedAttempts >= lockoutConfig.maxAttempts;
    if (!isLocked) {
        return {
            isLocked: false,
            failedAttempts,
        };
    }
    const mostRecentAttempt = await db.queryOne(select(LOGIN_ATTEMPTS_TABLE)
        .columns('created_at')
        .where(and(eq('email', email), eq('success', false)))
        .orderBy('created_at', 'desc')
        .limit(1)
        .toSql());
    if (mostRecentAttempt != null) {
        const lockedUntil = new Date(mostRecentAttempt.created_at.getTime() + lockoutConfig.lockoutDurationMs);
        const remainingTime = Math.max(0, lockedUntil.getTime() - Date.now());
        return {
            isLocked: true,
            failedAttempts,
            remainingTime,
            lockedUntil,
        };
    }
    return {
        isLocked: true,
        failedAttempts,
    };
}
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
export async function unlockAccount(db, email, adminUserId, reason, ipAddress, userAgent) {
    const user = await db.queryOne(select(USERS_TABLE).columns('id').where(eq('email', email)).limit(1).toSql());
    // Log a manual unlock event
    // The success: true entry will reset the failed attempt counter
    await db.execute(insert(LOGIN_ATTEMPTS_TABLE)
        .values({
        email,
        success: true,
        failure_reason: `Unlocked by admin ${adminUserId}: ${reason}`,
        ip_address: ipAddress != null && ipAddress !== '' ? ipAddress : null,
        user_agent: userAgent != null && userAgent !== '' ? userAgent : 'Admin Console',
    })
        .toSql());
    // Log security event
    if (user != null) {
        await logAccountUnlockedEvent(db, user.id, email, adminUserId, ipAddress, userAgent);
    }
}
//# sourceMappingURL=lockout.js.map