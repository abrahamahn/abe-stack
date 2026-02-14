// main/shared/src/core/errors.ts
/**
 * Core Error Classes and Utilities
 *
 * Consolidated error definitions for the ABE Stack.
 * All custom errors extend AppError for consistent error handling.
 */

import { AppError, type ValidationIssue } from '../utils/errors/base';

import { ERROR_CODES, ERROR_MESSAGES, HTTP_STATUS } from './constants';

// Re-export base error classes from L1
export { AppError, BaseError, type ValidationIssue } from '../utils/errors/base';

// ============================================================================
// HTTP Error Classes (4xx and 5xx)
// ============================================================================

/**
 * 400 Bad Request - Invalid input or request format
 */
export class BadRequestError extends AppError {
  constructor(
    message = 'Bad request',
    code: string = ERROR_CODES.BAD_REQUEST,
    details?: Record<string, unknown>,
  ) {
    super(message, HTTP_STATUS.BAD_REQUEST, code, details);
  }
}

/**
 * 401 Unauthorized - Missing or invalid authentication
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code: string = ERROR_CODES.UNAUTHORIZED) {
    super(message, HTTP_STATUS.UNAUTHORIZED, code);
  }
}

/**
 * 403 Forbidden - Authenticated but lacks permission
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code: string = ERROR_CODES.FORBIDDEN) {
    super(message, HTTP_STATUS.FORBIDDEN, code);
  }
}

/**
 * 404 Not Found - Resource does not exist
 */
export class NotFoundError extends AppError {
  constructor(message = 'Not found', code: string = ERROR_CODES.RESOURCE_NOT_FOUND) {
    super(message, HTTP_STATUS.NOT_FOUND, code);
  }
}

/**
 * Generic Resource Not Found Error
 * Use this instead of creating specific not-found errors for each entity
 */
export class ResourceNotFoundError extends NotFoundError {
  constructor(resource: string, identifier?: string) {
    super(
      `${resource}${identifier !== undefined && identifier !== '' ? ` (${identifier})` : ''} not found`,
      ERROR_CODES.RESOURCE_NOT_FOUND,
    );
  }
}

/**
 * 409 Conflict - Transaction conflict or duplicate resource
 */
export class ConflictError extends AppError {
  constructor(message = 'Conflict', code: string = ERROR_CODES.CONFLICT) {
    super(message, HTTP_STATUS.CONFLICT, code);
  }
}

/**
 * 422 Unprocessable Entity - Validation or business logic errors
 */
export class ValidationError extends AppError {
  constructor(
    message = 'Validation failed',
    public readonly fields: Record<string, string[]>,
  ) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, ERROR_CODES.VALIDATION_ERROR, { fields });
  }
}

/**
 * 422 Unprocessable Entity - Business logic rejection (no field mapping)
 */
export class UnprocessableError extends AppError {
  constructor(
    message = 'Unprocessable entity',
    code: string = ERROR_CODES.VALIDATION_ERROR,
    details?: Record<string, unknown>,
  ) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, code, details);
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 */
export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests', code: string = ERROR_CODES.RATE_LIMITED) {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, code);
  }
}

/**
 * 500 Internal Server Error - Unexpected server error
 */
export class InternalServerError extends AppError {
  constructor(message = 'Internal server error', code: string = ERROR_CODES.INTERNAL_ERROR) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, code);
  }
}

/**
 * Compatible alias for InternalServerError
 */
export { InternalServerError as InternalError };

/**
 * Configuration Error
 *
 * Thrown when a required environment variable is missing or invalid.
 */
export class ConfigurationError extends AppError {
  constructor(
    public readonly variable: string,
    message?: string,
  ) {
    super(
      message !== undefined && message !== ''
        ? message
        : `Missing required environment variable: ${variable}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.CONFIGURATION_ERROR,
    );
  }
}

// ============================================================================
// Auth & Account Errors
// ============================================================================

/**
 * Invalid email or password during login
 */
export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    super('Invalid email or password', ERROR_CODES.INVALID_CREDENTIALS);
  }
}

/**
 * Password does not meet strength requirements
 */
export class WeakPasswordError extends BadRequestError {
  constructor(details?: Record<string, unknown>) {
    super('Password is too weak', ERROR_CODES.WEAK_PASSWORD, details);
  }
}

/**
 * Email address already registered
 */
export class EmailAlreadyExistsError extends ConflictError {
  constructor(message = 'Email already registered') {
    super(message, ERROR_CODES.EMAIL_ALREADY_EXISTS);
  }
}

/**
 * Email address not verified
 */
export class EmailNotVerifiedError extends UnauthorizedError {
  constructor(
    public readonly email: string,
    message = 'Please verify your email address before logging in',
  ) {
    super(message, ERROR_CODES.EMAIL_NOT_VERIFIED);
  }
}

/**
 * User not found
 */
export class UserNotFoundError extends NotFoundError {
  constructor(message = 'User not found') {
    super(message, ERROR_CODES.USER_NOT_FOUND);
  }
}

/**
 * Invalid or expired token
 */
export class InvalidTokenError extends UnauthorizedError {
  constructor(message = 'Invalid or expired token') {
    super(message, ERROR_CODES.INVALID_TOKEN);
  }
}

/**
 * Token has already been used (replay attack detection)
 *
 * @param userId - ID of the user whose token was reused
 * @param email - Email of the user for sending security alerts
 * @param familyId - Refresh token family ID
 * @param ipAddress - IP address of the reuse attempt
 * @param userAgent - User agent string of the reuse attempt
 */
export class TokenReuseError extends UnauthorizedError {
  constructor(
    public readonly userId?: string,
    public readonly email?: string,
    public readonly familyId?: string,
    public readonly ipAddress?: string,
    public readonly userAgent?: string,
  ) {
    super('Token has already been used', ERROR_CODES.TOKEN_REUSED);
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
    code: string = ERROR_CODES.OAUTH_ERROR,
  ) {
    super(message, HTTP_STATUS.BAD_REQUEST, code);
  }
}

/**
 * OAuth state mismatch - possible CSRF attack
 */
export class OAuthStateMismatchError extends OAuthError {
  constructor(provider: string) {
    super(
      'OAuth state mismatch - possible CSRF attack',
      provider,
      ERROR_CODES.OAUTH_STATE_MISMATCH,
    );
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
    super(
      'Two-factor authentication required',
      HTTP_STATUS.UNAUTHORIZED,
      ERROR_CODES.TOTP_REQUIRED,
    );
  }
}

/**
 * Invalid TOTP verification code
 */
export class TotpInvalidError extends BadRequestError {
  constructor() {
    super('Invalid verification code', ERROR_CODES.TOTP_INVALID);
  }
}

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Error info extracted from an application error.
 * Used by the error handler to build the response.
 */
export interface AppErrorInfo {
  /** HTTP status code */
  statusCode: number;
  /** Error code string */
  code: string;
  /** Error message */
  message: string;
  /** Optional error details */
  details?: Record<string, unknown>;
}

/**
 * Type guard to check if an error is an instance of AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Normalizes any error into an AppError instance.
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }

  return new AppError(ERROR_MESSAGES.DEFAULT, HTTP_STATUS.INTERNAL_SERVER_ERROR);
}

/**
 * Extracts a user-facing error message from an error.
 * In production environments, sensitive internal error messages are obfuscated.
 */
export function getSafeErrorMessage(error: unknown, isProduction: boolean): string {
  if (isAppError(error)) {
    if (!isProduction) return error.message;
    return error.expose ? error.message : ERROR_MESSAGES.DEFAULT;
  }

  if (!isProduction && error instanceof Error) {
    return error.message;
  }

  return ERROR_MESSAGES.DEFAULT;
}

/**
 * Resolves the appropriate HTTP status code for a given error.
 */
export function getErrorStatusCode(error: unknown): number {
  if (isAppError(error)) {
    return error.statusCode;
  }
  return HTTP_STATUS.INTERNAL_SERVER_ERROR;
}

// ============================================================================
// Validation Error Formatting
// ============================================================================

/**
 * Individual validation error detail
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
}

/**
 * Standardized validation error response structure
 */
export interface ValidationErrorResponse {
  ok: false;
  error: {
    code: string;
    message: string;
    details: {
      fields: Record<string, string[]>;
      issues: ValidationErrorDetail[];
    };
  };
}

/**
 * Formats Zod validation issues into a standardized error response.
 */
export function formatValidationErrors(
  issues: readonly ValidationIssue[],
): ValidationErrorResponse {
  const fields: Record<string, string[]> = {};
  const detailIssues: ValidationErrorDetail[] = [];

  for (const issue of issues) {
    const joined = issue.path.map(String).join('.');
    const field = joined === '' ? '_root' : joined;
    fields[field] ??= [];
    fields[field].push(issue.message);
    detailIssues.push({ field, message: issue.message, code: issue.code });
  }

  return {
    ok: false,
    error: {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Request validation failed',
      details: {
        fields,
        issues: detailIssues,
      },
    },
  };
}
