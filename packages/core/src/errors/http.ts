// packages/core/src/errors/http.ts
/**
 * HTTP Error Classes
 *
 * Standard HTTP errors with status codes, error codes, and optional details.
 * All extend AppError for consistent error handling across the application.
 */

import { HTTP_STATUS } from '../constants/http';
import { AppError } from './base';

// ============================================================================
// Client Errors (4xx)
// ============================================================================

/**
 * 400 Bad Request - Invalid input or request format
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request', code?: string, details?: Record<string, unknown>) {
    super(message, HTTP_STATUS.BAD_REQUEST, code, details);
  }
}

/**
 * 401 Unauthorized - Missing or invalid authentication
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code?: string) {
    super(message, HTTP_STATUS.UNAUTHORIZED, code);
  }
}

/**
 * 403 Forbidden - Authenticated but lacks permission
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code?: string) {
    super(message, HTTP_STATUS.FORBIDDEN, code);
  }
}

/**
 * 404 Not Found - Resource does not exist
 */
export class NotFoundError extends AppError {
  constructor(message = 'Not found', code?: string) {
    super(message, HTTP_STATUS.NOT_FOUND, code);
  }
}

/**
 * 409 Conflict - Transaction conflict or duplicate resource
 */
export class ConflictError extends AppError {
  constructor(message = 'Conflict', code?: string) {
    super(message, HTTP_STATUS.CONFLICT, code);
  }
}

/**
 * 422 Unprocessable Entity - Semantic validation error
 * (e.g., business rule violation)
 */
export class UnprocessableError extends AppError {
  constructor(message = 'Unprocessable entity', code?: string, details?: Record<string, unknown>) {
    super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, code, details);
  }
}

/**
 * 429 Too Many Requests - Rate limited
 */
export class TooManyRequestsError extends AppError {
  constructor(
    message = 'Too many requests',
    public readonly retryAfter?: number,
  ) {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, 'RATE_LIMITED');
  }
}

// ============================================================================
// Server Errors (5xx)
// ============================================================================

/**
 * 500 Internal Server Error
 */
export class InternalError extends AppError {
  constructor(message = 'Internal server error', code?: string) {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, code);
  }
}

// ============================================================================
// Backward Compatibility Aliases
// ============================================================================

/**
 * @deprecated Use ValidationError from './validation' instead
 */
export { BadRequestError as ValidationError };

/**
 * @deprecated Use ForbiddenError instead
 */
export { ForbiddenError as PermissionError };

/**
 * @deprecated Use TooManyRequestsError instead
 */
export { TooManyRequestsError as RateLimitError };
