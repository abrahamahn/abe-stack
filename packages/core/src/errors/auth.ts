// packages/core/src/errors/auth.ts
/**
 * Authentication & Authorization Errors
 *
 * Specific error types for auth flows including login, tokens, OAuth, and 2FA.
 */

import { HTTP_STATUS } from '../constants/http';

import { AppError } from './base';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
} from './http';

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
  constructor(retryAfter?: number) {
    super('Account temporarily locked due to too many failed attempts', retryAfter);
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
 */
export class TokenReuseError extends UnauthorizedError {
  constructor() {
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

// ============================================================================
// 2FA Errors
// ============================================================================

/**
 * Two-factor authentication required to complete login
 */
export class TotpRequiredError extends AppError {
  constructor() {
    super('Two-factor authentication required', HTTP_STATUS.UNAUTHORIZED, 'TOTP_REQUIRED');
  }
}

/**
 * Invalid TOTP verification code
 */
export class TotpInvalidError extends BadRequestError {
  constructor() {
    super('Invalid verification code', 'TOTP_INVALID');
  }
}
