/**
 * Security Infrastructure
 *
 * Login tracking, account lockout, rate limiting, and security event logging.
 *
 * @module security
 */
export type { LockoutConfig, LockoutStatus } from './types';
export { applyProgressiveDelay, clearLoginAttempts, getAccountLockoutStatus, getProgressiveDelay, isAccountLocked, logLoginAttempt, unlockAccount, } from './lockout';
export { AUTH_RATE_LIMITS, authRateLimiters, createAuthRateLimitHook, type AuthEndpoint, type AuthRateLimitConfig, } from './rateLimitPresets';
export { getSecurityEventMetrics, getUserSecurityEvents, logAccountLockedEvent, logAccountUnlockedEvent, logMagicLinkFailedEvent, logMagicLinkRequestEvent, logMagicLinkVerifiedEvent, logOAuthLinkFailureEvent, logOAuthLinkSuccessEvent, logOAuthLoginFailureEvent, logOAuthLoginSuccessEvent, logOAuthUnlinkFailureEvent, logOAuthUnlinkSuccessEvent, logSecurityEvent, logTokenFamilyRevokedEvent, logTokenReuseEvent, sendTokenReuseAlert, type LogSecurityEventParams, type SecurityEventMetadata, type SecurityEventSeverity, type SecurityEventType, type SendTokenReuseAlertParams, } from './events';
//# sourceMappingURL=index.d.ts.map