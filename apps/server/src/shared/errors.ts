// apps/server/src/shared/errors.ts
/**
 * Custom Error Classes
 *
 * Use these instead of generic Error for better error handling
 * and consistent API responses.
 */

import { HTTP_STATUS } from './constants';

/**
 * Base application error
 * All custom errors should extend this
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): { error: string; message: string; code?: string; details?: Record<string, unknown> } {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

// ============================================================================
// HTTP Errors
// ============================================================================

export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code?: string, details?: Record<string, unknown>) {
    super(message, HTTP_STATUS.BAD_REQUEST, code, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code?: string) {
    super(message, HTTP_STATUS.UNAUTHORIZED, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code?: string) {
    super(message, HTTP_STATUS.FORBIDDEN, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', code?: string) {
    super(message, HTTP_STATUS.NOT_FOUND, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', code?: string) {
    super(message, HTTP_STATUS.CONFLICT, code);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(
    message = 'Too many requests',
    public readonly retryAfter?: number,
  ) {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, 'RATE_LIMITED');
  }
}

export class InternalError extends AppError {
  constructor(message = 'Internal server error', code?: string) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, code);
  }
}

// ============================================================================
// Authentication Errors
// ============================================================================

export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super('Invalid email or password', 'INVALID_CREDENTIALS');
  }
}

export class AccountLockedError extends TooManyRequestsError {
  constructor(retryAfter?: number) {
    super('Account temporarily locked due to too many failed attempts', retryAfter);
  }
}

export class InvalidTokenError extends UnauthorizedError {
  constructor(message = 'Invalid or expired token') {
    super(message, 'INVALID_TOKEN');
  }
}

export class TokenReuseError extends UnauthorizedError {
  constructor() {
    super('Token has already been used', 'TOKEN_REUSED');
  }
}

export class WeakPasswordError extends BadRequestError {
  constructor(details?: Record<string, unknown>) {
    super('Password is too weak', 'WEAK_PASSWORD', details);
  }
}

export class EmailAlreadyExistsError extends ConflictError {
  constructor(message = 'Email already registered') {
    super(message, 'EMAIL_EXISTS');
  }
}

export class UserNotFoundError extends NotFoundError {
  constructor(message = 'User not found') {
    super(message, 'USER_NOT_FOUND');
  }
}

// ============================================================================
// OAuth Errors
// ============================================================================

export class OAuthError extends AppError {
  constructor(
    message: string,
    public readonly provider: string,
    code?: string,
  ) {
    super(message, HTTP_STATUS.BAD_REQUEST, code);
  }
}

export class OAuthStateMismatchError extends OAuthError {
  constructor(provider: string) {
    super('OAuth state mismatch - possible CSRF attack', provider, 'OAUTH_STATE_MISMATCH');
  }
}

// ============================================================================
// 2FA Errors
// ============================================================================

export class TotpRequiredError extends AppError {
  constructor() {
    super('Two-factor authentication required', HTTP_STATUS.UNAUTHORIZED, 'TOTP_REQUIRED');
  }
}

export class TotpInvalidError extends BadRequestError {
  constructor() {
    super('Invalid verification code', 'TOTP_INVALID');
  }
}

// ============================================================================
// Validation Errors
// ============================================================================

export class ValidationError extends BadRequestError {
  constructor(
    message: string,
    public readonly fields: Record<string, string[]>,
  ) {
    super(message, 'VALIDATION_ERROR', { fields });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert any error to an AppError
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalError(error.message);
  }

  return new InternalError('An unexpected error occurred');
}
