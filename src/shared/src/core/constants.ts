// src/shared/src/core/constants.ts
/**
 * Global Constants
 *
 * Centralized constants for the entire application, including HTTP status codes,
 * application-wide limits, and standard error codes.
 */

// Re-export L0 constants
export { HTTP_STATUS, type HttpStatusCode } from '../utils/constants/http-status';
export { ERROR_CODES, ERROR_MESSAGES, type ErrorCode } from '../utils/constants/error-codes';

/**
 * Application Limits
 */
export const LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_UPLOAD_FILES: 10,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
} as const;

/** Default HTTP request body size limit (1MB) */
export const HTTP_BODY_LIMIT = 1024 * 1024;

/**
 * Default pagination settings
 */
export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 50,
  MAX_LIMIT: 1000,
} as const;

/**
 * Retention period defaults (days).
 * Used by scheduled cleanup tasks, PII anonymization, and hard-delete logic.
 */
export const RETENTION_PERIODS = {
  /** Grace period after soft-delete before PII anonymization */
  PII_GRACE_DAYS: 30,
  /** Retention after anonymization before hard-delete */
  HARD_DELETE_DAYS: 30,
  /** Audit log retention */
  AUDIT_DAYS: 90,
  /** Login attempt log retention */
  LOGIN_ATTEMPTS_DAYS: 90,
  /** Revoked session record retention */
  SESSIONS_DAYS: 30,
  /** Grace period for hard-banned users before permanent deletion */
  HARD_BAN_GRACE_DAYS: 7,
} as const;

// ============================================================================
// Auth Expiry Constants
// ============================================================================

/**
 * Token and session expiry durations.
 * Centralizes all auth-related timeout values for consistency.
 */
export const AUTH_EXPIRY = {
  /** Email change confirmation token (hours) */
  EMAIL_CHANGE_HOURS: 24,
  /** Email change revert token (hours) */
  EMAIL_CHANGE_REVERT_HOURS: 48,
  /** Magic link token default (minutes) */
  MAGIC_LINK_MINUTES: 15,
  /** OAuth state CSRF token (minutes) */
  OAUTH_STATE_MINUTES: 10,
  /** Password reset / email verification token (hours) */
  VERIFICATION_TOKEN_HOURS: 24,
  /** Sudo mode elevation (minutes) */
  SUDO_MINUTES: 5,
  /** Invitation default expiry (days) */
  INVITE_DAYS: 7,
  /** SMS verification code (minutes) */
  SMS_CODE_MINUTES: 5,
  /** Impersonation token default TTL (minutes) */
  IMPERSONATION_MINUTES: 30,
} as const;

// ============================================================================
// SMS 2FA Constants
// ============================================================================

/**
 * SMS-based two-factor authentication limits.
 */
export const SMS_LIMITS = {
  /** Maximum verification attempts per code */
  MAX_ATTEMPTS: 3,
  /** Maximum SMS sends per hour per user */
  RATE_LIMIT_HOURLY: 3,
  /** Maximum SMS sends per day per user */
  RATE_LIMIT_DAILY: 10,
} as const;

// ============================================================================
// Quota / Limit Constants
// ============================================================================

/**
 * Application-wide quota and limit values.
 */
export const QUOTAS = {
  /** Maximum pending invitations per tenant */
  MAX_PENDING_INVITATIONS: 50,
  /** Maximum username length */
  MAX_USERNAME_LENGTH: 15,
  /** Magic link max requests per email per hour */
  MAGIC_LINK_MAX_PER_EMAIL: 3,
  /** Magic link max requests per IP per hour */
  MAGIC_LINK_MAX_PER_IP: 10,
  /** Max impersonations per admin per hour */
  IMPERSONATION_MAX_PER_HOUR: 5,
} as const;

// ============================================================================
// Login Failure Reasons
// ============================================================================

/**
 * Standardized login failure reason codes.
 *
 * Stored in `login_attempts.failure_reason` for structured filtering and
 * support diagnostics. NEVER exposed to the client (anti-enumeration).
 */
export const LOGIN_FAILURE_REASON = {
  /** Email/username not found in database */
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  /** User exists but password does not match */
  PASSWORD_MISMATCH: 'PASSWORD_MISMATCH',
  /** Correct credentials but email not verified */
  UNVERIFIED_EMAIL: 'UNVERIFIED_EMAIL',
  /** Correct credentials but account is locked/suspended */
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  /** Correct credentials but TOTP 2FA challenge needed (not a failure) */
  TOTP_REQUIRED: 'TOTP_REQUIRED',
  /** Correct credentials but SMS 2FA challenge needed (not a failure) */
  SMS_REQUIRED: 'SMS_REQUIRED',
  /** Wrong TOTP code during 2FA challenge */
  TOTP_INVALID: 'TOTP_INVALID',
  /** Bot protection (CAPTCHA) check failed */
  CAPTCHA_FAILED: 'CAPTCHA_FAILED',
  /** Account has been deactivated by user */
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
  /** Account has been deleted (past grace period) */
  ACCOUNT_DELETED: 'ACCOUNT_DELETED',
} as const;

/** Type for login failure reason values */
export type LoginFailureReason = (typeof LOGIN_FAILURE_REASON)[keyof typeof LOGIN_FAILURE_REASON];

// ============================================================================
// Sudo Token Header
// ============================================================================

/** Sudo token header name (client-server contract) */
export const SUDO_TOKEN_HEADER = 'x-sudo-token';

// ============================================================================
// WebSocket Constants
// ============================================================================

/** WebSocket close code: Policy Violation (RFC 6455 §7.4.1) */
export const WS_CLOSE_POLICY_VIOLATION = 1008;

/** Standard WebSocket endpoint path */
export const WEBSOCKET_PATH = '/ws';

// ============================================================================
// Cookie Name Constants
// ============================================================================

/** CSRF double-submit cookie name */
export const CSRF_COOKIE_NAME = '_csrf';

/** Access token cookie name (used by WebSocket auth fallback) */
export const ACCESS_TOKEN_COOKIE_NAME = 'accessToken';

/** Refresh token cookie name */
export const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

// ============================================================================
// HTTP Header Constants
// ============================================================================

/** CSRF token header name (double-submit pattern) */
export const CSRF_TOKEN_HEADER = 'x-csrf-token';

// ============================================================================
// API Constants
// ============================================================================

/** Common API route prefix */
export const API_PREFIX = '/api';
