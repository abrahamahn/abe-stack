// src/shared/src/core/constants.ts
/**
 * Global Constants
 *
 * Centralized constants for the entire application, including HTTP status codes,
 * application-wide limits, and standard error codes.
 */
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Client Errors (4xx)
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server Errors (5xx)
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Union type of all HTTP status code values
 */
export type HttpStatusCode = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

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
 * Application Error Codes
 */
export const ERROR_CODES = {
  // Generic
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  CONFLICT: 'CONFLICT',

  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_REUSED: 'TOKEN_REUSED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  WEAK_PASSWORD: 'WEAK_PASSWORD',

  // OAuth
  OAUTH_ERROR: 'OAUTH_ERROR',
  OAUTH_STATE_MISMATCH: 'OAUTH_STATE_MISMATCH',

  // 2FA
  TOTP_REQUIRED: 'TOTP_REQUIRED',
  TOTP_INVALID: 'TOTP_INVALID',

  // Billing
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  INSUFFICIENT_ENTITLEMENTS: 'INSUFFICIENT_ENTITLEMENTS',

  // Rate Limit
  RATE_LIMITED: 'RATE_LIMITED',

  // Client/SDK
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',

  // Legal
  TOS_ACCEPTANCE_REQUIRED: 'TOS_ACCEPTANCE_REQUIRED',
} as const;

/**
 * Union type for all application error codes
 */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/**
 * Standard human-readable error messages.
 * Companion to `ERROR_CODES` — use these for user-facing `message` fields
 * so every handler returns the same wording for the same error class.
 */
export const ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Authentication required',
  INTERNAL_ERROR: 'Internal server error',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized',
  BAD_REQUEST: 'Bad request',
  DEFAULT: 'An unexpected error occurred',
} as const;

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
