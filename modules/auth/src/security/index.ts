// modules/auth/src/security/index.ts
/**
 * Security Infrastructure
 *
 * Login tracking, account lockout, rate limiting, and security event logging.
 *
 * @module security
 */

// Types
export type { LockoutConfig, LockoutStatus } from './types';

// Lockout functions
export {
  applyProgressiveDelay,
  clearLoginAttempts,
  getAccountLockoutStatus,
  getProgressiveDelay,
  isAccountLocked,
  logLoginAttempt,
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
  getSecurityEventMetrics,
  getUserSecurityEvents,
  logAccountLockedEvent,
  logAccountUnlockedEvent,
  logMagicLinkFailedEvent,
  logMagicLinkRequestEvent,
  logMagicLinkVerifiedEvent,
  // OAuth events
  logOAuthLinkFailureEvent,
  logOAuthLinkSuccessEvent,
  logOAuthLoginFailureEvent,
  logOAuthLoginSuccessEvent,
  logOAuthUnlinkFailureEvent,
  logOAuthUnlinkSuccessEvent,
  logSecurityEvent,
  logTokenFamilyRevokedEvent,
  logTokenReuseEvent,
  sendTokenReuseAlert,
  type LogSecurityEventParams,
  type SecurityEventMetadata,
  type SecurityEventSeverity,
  type SecurityEventType,
  type SendTokenReuseAlertParams,
} from './events';
