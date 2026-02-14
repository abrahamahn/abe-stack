// main/server/core/src/auth/security/index.ts
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
  flagSuspiciousLogin,
  logNewDeviceLogin,
  logSecurityEvent,
  logTokenFamilyRevokedEvent,
  logTokenReuseEvent,
  // "Was This You?" alerts
  sendEmailChangedAlert,
  sendNewLoginAlert,
  sendPasswordChangedAlert,
  sendTokenReuseAlert,
  type LogSecurityEventParams,
  type SecurityEventMetadata,
  type SecurityEventSeverity,
  type SecurityEventType,
  type SendEmailChangedAlertParams,
  type SendSecurityAlertParams,
  type SendTokenReuseAlertParams,
} from './events';

// Audit Logs
export { registerSecurityAudit, SecurityAuditLogger } from './audit';
export type { AuditConfig, AuditEvent, AuditStats } from './audit';

// Password (validation, patterns, scoring, strength — all from shared)
export {
  calculateEntropy,
  calculateScore,
  COMMON_PASSWORDS,
  containsUserInput,
  defaultPasswordConfig,
  estimateCrackTime,
  estimatePasswordStrength,
  generateFeedback,
  getCharsetSize,
  getStrengthColor,
  getStrengthLabel,
  hasKeyboardPattern,
  hasRepeatedChars,
  hasSequentialChars,
  isCommonPassword,
  KEYBOARD_PATTERNS,
  validatePassword,
  validatePasswordBasic,
  type PasswordConfig,
  type PasswordPenalties,
  type PasswordValidationResult,
  type StrengthResult,
} from '@abe-stack/shared';

// CAPTCHA Verification
export {
  isCaptchaRequired,
  verifyCaptchaToken,
  verifyTurnstileToken,
  type CaptchaVerifyResult,
} from './captcha';

// Sudo Mode
export { createRequireSudo } from './sudo';

// Device Fingerprint
export {
  generateDeviceFingerprint,
  isKnownDevice,
  isTrustedDevice,
  recordDeviceAccess,
} from './device-fingerprint';

// Session Enforcement
export {
  enforceMaxConcurrentSessions,
  getIdleTimeRemaining,
  isSessionIdle,
} from './session-enforcement';
