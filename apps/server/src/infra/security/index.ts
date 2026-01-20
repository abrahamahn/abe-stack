// apps/server/src/infra/security/index.ts
/**
 * Security Infrastructure
 *
 * Login tracking, account lockout, rate limiting, and security event logging.
 */

// Types
export type { LockoutConfig, LockoutStatus } from './types';

// Lockout functions
export {
  logLoginAttempt,
  isAccountLocked,
  getProgressiveDelay,
  applyProgressiveDelay,
  clearLoginAttempts,
  getAccountLockoutStatus,
  unlockAccount,
} from './lockout';

// Auth rate limiting
export {
  AUTH_RATE_LIMITS,
  authRateLimiters,
  createAuthRateLimitHook,
  type AuthEndpoint,
  type AuthRateLimitConfig,
} from './rateLimitPresets';

// Security events (re-exported for convenience)
export {
  logSecurityEvent,
  logTokenReuseEvent,
  logTokenFamilyRevokedEvent,
  logAccountLockedEvent,
  logAccountUnlockedEvent,
  getUserSecurityEvents,
  getSecurityEventMetrics,
  type SecurityEventType,
  type SecurityEventSeverity,
  type SecurityEventMetadata,
  type LogSecurityEventParams,
} from './events';
