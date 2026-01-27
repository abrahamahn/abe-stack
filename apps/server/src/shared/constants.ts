// apps/server/src/shared/constants.ts
/**
 * Server-Specific Constants
 *
 * Centralized constants for the server application.
 * Note: Time constants (MS_PER_SECOND, etc.) should be imported
 * directly from @abe-stack/core.
 */

import { MS_PER_MINUTE, MS_PER_SECOND } from '@abe-stack/core';

// ============================================================================
// Security Constants
// ============================================================================

export const MIN_JWT_SECRET_LENGTH = 32; // 256 bits
export const REFRESH_TOKEN_BYTES = 64; // 512 bits

// Progressive delay constants
export const PROGRESSIVE_DELAY_WINDOW_MS = 5 * MS_PER_MINUTE;
export const MAX_PROGRESSIVE_DELAY_MS = 30 * MS_PER_SECOND;

// ============================================================================
// Cookie Names
// ============================================================================

export const REFRESH_COOKIE_NAME = 'refreshToken';
export const CSRF_COOKIE_NAME = '_csrf';

// ============================================================================
// HTTP Status Codes
// ============================================================================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  // General
  INTERNAL_ERROR: 'Internal server error',
  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Bad request',

  // Authentication
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_ALREADY_REGISTERED: 'Email already registered',
  USER_NOT_FOUND: 'User not found',
  ACCOUNT_LOCKED:
    'Account temporarily locked due to too many failed attempts. Please try again later.',
  WEAK_PASSWORD: 'Password is too weak',
  INVALID_TOKEN: 'Invalid or expired token',
  NO_REFRESH_TOKEN: 'No refresh token provided',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden - insufficient permissions',
  MISSING_AUTH_HEADER: 'Missing or invalid authorization header',
  INVALID_OR_EXPIRED_TOKEN: 'Invalid or expired token',

  // User operations
  FAILED_USER_CREATION: 'Failed to create user',
  FAILED_TOKEN_FAMILY: 'Failed to create refresh token family',

  // OAuth
  OAUTH_STATE_MISMATCH: 'OAuth state mismatch - possible CSRF attack',
  OAUTH_CODE_MISSING: 'OAuth authorization code missing',
  OAUTH_PROVIDER_ERROR: 'OAuth provider returned an error',

  // Magic Link
  MAGIC_LINK_EXPIRED: 'Magic link has expired',
  MAGIC_LINK_INVALID: 'Invalid magic link',
  MAGIC_LINK_ALREADY_USED: 'Magic link has already been used',

  // Email
  EMAIL_VERIFICATION_NOT_IMPLEMENTED: 'Email verification not implemented',
  EMAIL_SEND_FAILED: 'Failed to send email. Please try again or use the resend option.',

  // TOTP
  TOTP_INVALID_CODE: 'Invalid verification code',
  TOTP_ALREADY_ENABLED: '2FA is already enabled',
  TOTP_NOT_ENABLED: '2FA is not enabled for this account',
  TOTP_REQUIRED: '2FA verification required',
} as const;

// ============================================================================
// Success Messages
// ============================================================================

export const SUCCESS_MESSAGES = {
  LOGGED_OUT: 'Logged out successfully',
  ACCOUNT_UNLOCKED: 'Account unlocked successfully',
  PASSWORD_RESET_SENT: 'Password reset email sent',
  VERIFICATION_EMAIL_SENT:
    'Verification email sent. Please check your inbox and click the confirmation link.',
  MAGIC_LINK_SENT: 'Magic link sent to your email',
  TOTP_ENABLED: 'Two-factor authentication enabled',
  TOTP_DISABLED: 'Two-factor authentication disabled',
} as const;

// ============================================================================
// Failure Reasons (for audit logging)
// ============================================================================

export const FAILURE_REASONS = {
  ACCOUNT_LOCKED: 'Account locked',
  USER_NOT_FOUND: 'User not found',
  INVALID_PASSWORD: 'Invalid password',
  TOKEN_EXPIRED: 'Token expired',
  TOKEN_REUSED: 'Token reuse detected',
  TOKEN_REVOKED: 'Token family revoked',
  OAUTH_FAILED: 'OAuth authentication failed',
  MAGIC_LINK_FAILED: 'Magic link authentication failed',
  TOTP_FAILED: 'TOTP verification failed',
} as const;
