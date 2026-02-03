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
  unlockAccount
} from './lockout';

// Auth rate limiting
export {
  AUTH_RATE_LIMITS,
  authRateLimiters,
  createAuthRateLimitHook,
  type AuthEndpoint,
  type AuthRateLimitConfig
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
  type SendTokenReuseAlertParams
} from './events';

// Audit Logs
export { registerSecurityAudit, SecurityAuditLogger } from './audit';
export type { AuditConfig, AuditEvent, AuditStats } from './audit';

// Password Validation
export {
  defaultPasswordConfig,
  getStrengthColor,
  getStrengthLabel,
  validatePassword,
  validatePasswordBasic
} from './password';
export type { PasswordConfig, PasswordValidationResult } from './password';

// Password Patterns
export {
  COMMON_PASSWORDS,
  containsUserInput,
  hasKeyboardPattern,
  hasRepeatedChars,
  hasSequentialChars,
  isCommonPassword,
  KEYBOARD_PATTERNS
} from './password-patterns';

// Password Scoring
export {
  calculateEntropy,
  calculateScore,
  estimateCrackTime,
  generateFeedback,
  getCharsetSize
} from './password-scoring';
export type { PasswordPenalties } from './password-scoring';

// Password Strength Estimation
export { estimatePasswordStrength } from './password-strength';
export type { StrengthResult } from './password-strength';

