// main/shared/src/core/auth/auth.errors.schemas.ts
/**
 * @file Auth Errors
 * @description Authentication and authorization error types for login, tokens, OAuth, and 2FA.
 * @module Core/Auth
 */

import { HTTP_STATUS } from '../../engine/constants/platform';
import {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} from '../../engine/errors/errors';

// ============================================================================
// Credential Errors
// ============================================================================

/**
 * Invalid email or password during login
 */
export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super('Invalid email or password', 'INVALID_CREDENTIALS');
  }
}

/**
 * Password does not meet strength requirements
 */
export class WeakPasswordError extends BadRequestError {
  constructor(details?: Record<string, unknown>) {
    super('Password is too weak', 'WEAK_PASSWORD', details);
  }
}

// ============================================================================
// Account Errors
// ============================================================================

/**
 * Account temporarily locked due to failed attempts
 */
export class AccountLockedError extends TooManyRequestsError {
  constructor(public readonly retryAfter?: number) {
    super('Account temporarily locked due to too many failed attempts', 'ACCOUNT_LOCKED');
  }
}

/**
 * Email address already registered
 */
export class EmailAlreadyExistsError extends ConflictError {
  constructor(message = 'Email already registered') {
    super(message, 'EMAIL_EXISTS');
  }
}

/**
 * Email address not verified - user must verify email before logging in
 */
export class EmailNotVerifiedError extends UnauthorizedError {
  constructor(
    public readonly email: string,
    message = 'Please verify your email address before logging in',
  ) {
    super(message, 'EMAIL_NOT_VERIFIED');
  }
}

/**
 * User not found
 */
export class UserNotFoundError extends NotFoundError {
  constructor(message = 'User not found') {
    super(message, 'USER_NOT_FOUND');
  }
}

// ============================================================================
// Token Errors
// ============================================================================

/**
 * Invalid or expired token
 */
export class InvalidTokenError extends UnauthorizedError {
  constructor(message = 'Invalid or expired token') {
    super(message, 'INVALID_TOKEN');
  }
}

/**
 * Token has already been used (replay attack detection)
 * Captures user details for security alerting
 */
export class TokenReuseError extends UnauthorizedError {
  constructor(
    public readonly userId?: string,
    public readonly email?: string,
    public readonly familyId?: string,
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
  ) {
    super('Token has already been used', 'TOKEN_REUSED');
  }
}

// ============================================================================
// OAuth Errors
// ============================================================================

/**
 * Base OAuth error
 */
export class OAuthError extends AppError {
  constructor(
    message: string,
    public readonly provider: string,
    code?: string,
  ) {
    super(message, HTTP_STATUS.BAD_REQUEST, code);
  }
}

/**
 * OAuth state mismatch - possible CSRF attack
 */
export class OAuthStateMismatchError extends OAuthError {
  constructor(provider: string) {
    super('OAuth state mismatch - possible CSRF attack', provider, 'OAUTH_STATE_MISMATCH');
  }
}

/**
 * Failed to send email (SMTP error, API error, etc.)
 */
export class EmailSendError extends AppError {
  constructor(message = 'Failed to send email', public readonly originalError?: unknown) {
    super(message, HTTP_STATUS.SERVICE_UNAVAILABLE, 'EMAIL_SEND_FAILED');
  }
}

// ============================================================================
// 2FA / TOTP Errors
// ============================================================================

/**
 * Invalid TOTP code provided
 */
export class TotpInvalidError extends UnauthorizedError {
  constructor() {
    super('Invalid 2FA code', 'TOTP_INVALID');
  }
}

/**
 * 2FA is required for this action/account
 */
export class TotpRequiredError extends UnauthorizedError {
  constructor() {
    super('2FA code is required', 'TOTP_REQUIRED');
  }
}
