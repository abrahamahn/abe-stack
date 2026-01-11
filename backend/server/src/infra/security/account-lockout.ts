// backend/server/src/infra/security/account-lockout.ts
/**
 * Account lockout and login attempt tracking
 * Protects against brute force attacks with progressive delays
 */

import { loginAttempts, users } from '@db';
import { and, count, eq, gte } from 'drizzle-orm';

import { MAX_PROGRESSIVE_DELAY_MS, PROGRESSIVE_DELAY_WINDOW_MS } from '../../common/constants';

import type { DbClient } from '@db';
import type { AuthConfig } from '../config/auth';

/**
 * Account lockout status information
 */
export interface LockoutStatus {
  isLocked: boolean;
  failedAttempts: number;
  remainingTime?: number; // milliseconds until unlock
  lockedUntil?: Date;
}

/**
 * Count failed login attempts for an email within a time window
 */
async function countFailedAttempts(
  db: DbClient,
  email: string,
  windowStart: Date,
): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, email),
        eq(loginAttempts.success, false),
        gte(loginAttempts.createdAt, windowStart),
      ),
    );

  return result?.count || 0;
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
  await db.insert(loginAttempts).values({
    email,
    success,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    failureReason: failureReason || null,
  });
}

/**
 * Check if an account is currently locked out
 * Returns true if locked, false otherwise
 */
export async function isAccountLocked(
  db: DbClient,
  authConfig: AuthConfig,
  email: string,
): Promise<boolean> {
  const lockoutWindow = new Date(Date.now() - authConfig.lockout.lockoutDurationMs);
  const failedAttempts = await countFailedAttempts(db, email, lockoutWindow);
  return failedAttempts >= authConfig.lockout.maxAttempts;
}

/**
 * Get progressive delay in milliseconds based on failed attempt count
 * Implements exponential backoff: 1s, 2s, 4s, 8s, 16s...
 */
export async function getProgressiveDelay(
  db: DbClient,
  authConfig: AuthConfig,
  email: string,
): Promise<number> {
  if (!authConfig.lockout.progressiveDelay) {
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
    authConfig.lockout.baseDelayMs * Math.pow(2, failedAttempts - 1),
    MAX_PROGRESSIVE_DELAY_MS,
  );

  return delay;
}

/**
 * Apply progressive delay before allowing next login attempt
 */
export async function applyProgressiveDelay(
  db: DbClient,
  authConfig: AuthConfig,
  email: string,
): Promise<void> {
  const delay = await getProgressiveDelay(db, authConfig, email);
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
 */
export async function getAccountLockoutStatus(
  db: DbClient,
  authConfig: AuthConfig,
  email: string,
): Promise<LockoutStatus> {
  const lockoutWindow = new Date(Date.now() - authConfig.lockout.lockoutDurationMs);
  const failedAttempts = await countFailedAttempts(db, email, lockoutWindow);
  const isLocked = failedAttempts >= authConfig.lockout.maxAttempts;

  if (!isLocked) {
    return {
      isLocked: false,
      failedAttempts,
    };
  }

  // Find the most recent failed attempt to calculate lockout expiration
  const [mostRecentAttempt] = await db
    .select({ createdAt: loginAttempts.createdAt })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.email, email), eq(loginAttempts.success, false)))
    .orderBy(loginAttempts.createdAt)
    .limit(1);

  if (mostRecentAttempt) {
    const lockedUntil = new Date(
      mostRecentAttempt.createdAt.getTime() + authConfig.lockout.lockoutDurationMs,
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
 */
export async function unlockAccount(
  db: DbClient,
  email: string,
  adminUserId: string,
  logSecurityEvent: (
    userId: string,
    email: string,
    adminUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) => Promise<void>,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  // Get user info for logging
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  // Log a manual unlock event
  // The success: true entry will reset the failed attempt counter
  await db.insert(loginAttempts).values({
    email,
    success: true,
    failureReason: `Manually unlocked by admin ${adminUserId}`,
    ipAddress: ipAddress || null,
    userAgent: userAgent || 'Admin Console',
  });

  // Log security event
  if (user) {
    await logSecurityEvent(user.id, email, adminUserId, ipAddress, userAgent);
  }
}
