// main/shared/src/domain/auth/auth.messages.ts

/**
 * @file Auth Messages
 * @description Centralized dictionary of user-facing messages for authentication outcomes.
 * @module Domain/Auth
 */

// ============================================================================
// Error Messages
// ============================================================================

export const AUTH_ERROR_MESSAGES = {
  // General Errors
  INTERNAL_ERROR: 'Internal server error',
  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Bad request',
  UNAUTHORIZED: 'Unauthorized',
  FORBIDDEN: 'Forbidden - insufficient permissions',

  // Credential Validation
  INVALID_CREDENTIALS: 'Invalid email or password',
  EMAIL_ALREADY_EXISTS: 'Email already registered',
  USER_NOT_FOUND: 'User not found',
  WEAK_PASSWORD: 'Password is too weak',

  // Account Security
  ACCOUNT_LOCKED:
    'Account temporarily locked due to too many failed attempts. Please try again later.',

  // Token & Session
  INVALID_TOKEN: 'Invalid or expired token',
  INVALID_OR_EXPIRED_TOKEN: 'Invalid or expired token',
  NO_REFRESH_TOKEN: 'No refresh token provided',
  MISSING_AUTH_HEADER: 'Missing or invalid authorization header',
  FAILED_TOKEN_FAMILY: 'Failed to create refresh token family',

  // Creation Failures
  FAILED_USER_CREATION: 'Failed to create user',

  // OAuth Specific
  OAUTH_STATE_MISMATCH: 'OAuth state mismatch - possible CSRF attack',
  OAUTH_CODE_MISSING: 'OAuth authorization code missing',
  OAUTH_PROVIDER_ERROR: 'OAuth provider returned an error',

  // Magic Link Specific
  MAGIC_LINK_EXPIRED: 'Magic link has expired',
  MAGIC_LINK_INVALID: 'Invalid magic link',
  MAGIC_LINK_ALREADY_USED: 'Magic link has already been used',

  // Email Operations
  EMAIL_VERIFICATION_NOT_IMPLEMENTED: 'Email verification not implemented',
  EMAIL_SEND_FAILED: 'Failed to send email. Please try again or use the resend option.',
} as const;

// ============================================================================
// Success Messages
// ============================================================================

export const AUTH_SUCCESS_MESSAGES = {
  LOGGED_OUT: 'Logged out successfully',
  ACCOUNT_UNLOCKED: 'Account unlocked successfully',
  PASSWORD_RESET_SENT: 'Password reset email sent',
  VERIFICATION_EMAIL_SENT:
    'Verification email sent. Please check your inbox and click the confirmation link.',
  MAGIC_LINK_SENT: 'Magic link sent to your email',
} as const;
