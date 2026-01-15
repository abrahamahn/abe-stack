// apps/server/src/infra/security/types.ts
/**
 * Security Types
 */

/**
 * Lockout configuration (subset of AuthConfig.lockout)
 */
export interface LockoutConfig {
  maxAttempts: number;
  lockoutDurationMs: number;
  progressiveDelay: boolean;
  baseDelayMs: number;
}

/**
 * Account lockout status information
 */
export interface LockoutStatus {
  isLocked: boolean;
  failedAttempts: number;
  remainingTime?: number; // milliseconds until unlock
  lockedUntil?: Date;
}
