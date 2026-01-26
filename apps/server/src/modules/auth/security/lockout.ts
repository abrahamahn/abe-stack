// apps/server/src/modules/auth/security/lockout.ts
/**
 * Account Lockout Functions
 *
 * Handles login attempt tracking, progressive delays, and account lockout.
 */

import {
    and,
    eq,
    gte,
    insert,
    LOGIN_ATTEMPTS_TABLE,
    select,
    selectCount,
    USERS_TABLE,
    type DbClient,
} from '@database';
import { MAX_PROGRESSIVE_DELAY_MS, PROGRESSIVE_DELAY_WINDOW_MS } from '@shared/constants';

import { logAccountUnlockedEvent } from './events';

import type { LockoutConfig, LockoutStatus } from './types';

/**
 * Count failed login attempts for an email within a time window
 * @param db - Database client
 * @param email - User email
 * @param windowStart - Start of the time window
 * @returns Promise<number> - Number of failed attempts
 */
async function countFailedAttempts(
  db: DbClient,
  email: string,
  windowStart: Date,
): Promise<number> {
  const result = await db.queryOne<{ count: number }>(
    selectCount(LOGIN_ATTEMPTS_TABLE)
      .where(and(eq('email', email), eq('success', false), gte('created_at', windowStart)))
      .toSql(),
  );

  return result?.count ?? 0;
}

/**
 * Log a login attempt to the database
 */
export async function logLoginAttempt(
  db: DbClient,
  email: string,
  success: boolean,
  ipAddress?: string,
  userAgent?: string,
  failureReason?: string,
): Promise<void> {
  await db.execute(
    insert(LOGIN_ATTEMPTS_TABLE)
      .values({
        email,
        success,
        ip_address: ipAddress != null && ipAddress !== '' ? ipAddress : null,
        user_agent: userAgent != null && userAgent !== '' ? userAgent : null,
        failure_reason: failureReason != null && failureReason !== '' ? failureReason : null,
      })
      .toSql(),
  );
}

/**
 * Check if an account is currently locked out
 * Returns true if locked, false otherwise
 */
export async function isAccountLocked(
  db: DbClient,
  email: string,
  lockoutConfig: LockoutConfig,
): Promise<boolean> {
  const lockoutWindow = new Date(Date.now() - lockoutConfig.lockoutDurationMs);
  const failedAttempts = await countFailedAttempts(db, email, lockoutWindow);
  return failedAttempts >= lockoutConfig.maxAttempts;
}

/**
 * Get progressive delay in milliseconds based on failed attempt count
 * Implements exponential backoff: 1s, 2s, 4s, 8s, 16s...
 */
export async function getProgressiveDelay(
  db: DbClient,
  email: string,
  lockoutConfig: LockoutConfig,
): Promise<number> {
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
  const delay = Math.min(
    lockoutConfig.baseDelayMs * Math.pow(2, failedAttempts - 1),
    MAX_PROGRESSIVE_DELAY_MS,
  );

  return delay;
}

/**
 * Apply progressive delay before allowing next login attempt
 */
export async function applyProgressiveDelay(
  db: DbClient,
  email: string,
  lockoutConfig: LockoutConfig,
): Promise<void> {
  const delay = await getProgressiveDelay(db, email, lockoutConfig);
  if (delay > 0) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

/**
 * Clear successful login attempts for a user (called after successful login)
 * We don't actually delete them (for audit trail)
 * The lockout check only counts failed attempts within the window
 */
export async function clearLoginAttempts(_db: DbClient, _email: string): Promise<void> {
  // No-op - the success: true entry will be enough to show the account is no longer locked
  // The lockout check only counts failed attempts within the window
}

/**
 * Get detailed account lockout status
 * Returns information about current lockout state and remaining time
 * @param db - Database client
 * @param email - User email
 * @param lockoutConfig - Lockout configuration
 * @returns Promise<LockoutStatus> - Lockout status information
 */
export async function getAccountLockoutStatus(
  db: DbClient,
  email: string,
  lockoutConfig: LockoutConfig,
): Promise<LockoutStatus> {
  const lockoutWindow = new Date(Date.now() - lockoutConfig.lockoutDurationMs);
  const failedAttempts = await countFailedAttempts(db, email, lockoutWindow);
  const isLocked = failedAttempts >= lockoutConfig.maxAttempts;

  if (!isLocked) {
    return {
      isLocked: false,
      failedAttempts,
    };
  }

  // Find the most recent failed attempt to calculate lockout expiration
  type AttemptRow = Record<string, unknown> & { created_at: Date };
  const mostRecentAttempt = await db.queryOne<AttemptRow>(
    select(LOGIN_ATTEMPTS_TABLE)
      .columns('created_at')
      .where(and(eq('email', email), eq('success', false)))
      .orderBy('created_at', 'desc')
      .limit(1)
      .toSql(),
  );

  if (mostRecentAttempt != null) {
    const lockedUntil = new Date(
      mostRecentAttempt.created_at.getTime() + lockoutConfig.lockoutDurationMs,
    );
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
 * Manually unlock an account (admin function)
 * Clears failed login attempts by logging a successful "unlock" event
 *
 * IMPORTANT: This should only be called by authorized admin users
 * Caller is responsible for authorization checks
 *
 * @param db - Database client
 * @param email - User email to unlock
 * @param adminUserId - ID of admin performing the unlock (for audit trail)
 * @param reason - Reason for unlocking the account (for audit trail)
 * @param ipAddress - Optional IP address of admin performing unlock
 * @param userAgent - Optional user agent of admin performing unlock
 * @returns Promise<void>
 */
export async function unlockAccount(
  db: DbClient,
  email: string,
  adminUserId: string,
  reason: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  // Get user info for logging
  type UserRow = Record<string, unknown> & { id: string };
  const user = await db.queryOne<UserRow>(
    select(USERS_TABLE).columns('id').where(eq('email', email)).limit(1).toSql(),
  );

  // Log a manual unlock event
  // The success: true entry will reset the failed attempt counter
  await db.execute(
    insert(LOGIN_ATTEMPTS_TABLE)
      .values({
        email,
        success: true,
        failure_reason: `Unlocked by admin ${adminUserId}: ${reason}`,
        ip_address: ipAddress != null && ipAddress !== '' ? ipAddress : null,
        user_agent: userAgent != null && userAgent !== '' ? userAgent : 'Admin Console',
      })
      .toSql(),
  );

  // Log security event
  if (user != null) {
    await logAccountUnlockedEvent(db, user.id, email, adminUserId, ipAddress, userAgent);
  }
}
