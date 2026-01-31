// modules/auth/src/security/types.ts
/**
 * Security Types
 *
 * Type definitions for account lockout and security event tracking.
 *
 * @module security/types
 */

/**
 * Lockout configuration (subset of AuthConfig.lockout).
 *
 * Controls how many failed login attempts are allowed before lockout
 * and the duration of the lockout period.
 */
export interface LockoutConfig {
  /** Maximum failed login attempts before lockout */
  maxAttempts: number;
  /** Duration of lockout in milliseconds */
  lockoutDurationMs: number;
  /** Whether progressive delay is enabled */
  progressiveDelay: boolean;
  /** Base delay in milliseconds for progressive backoff */
  baseDelayMs: number;
}

/**
 * Account lockout status information.
 *
 * Provides details about the current lockout state of an account.
 */
export interface LockoutStatus {
  /** Whether the account is currently locked */
  isLocked: boolean;
  /** Number of failed login attempts within the lockout window */
  failedAttempts: number;
  /** Remaining time until unlock in milliseconds */
  remainingTime?: number;
  /** Timestamp when the lockout will expire */
  lockedUntil?: Date;
}
