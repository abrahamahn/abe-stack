// backend/server/src/common/errors/index.ts
/**
 * Custom error types for the application
 * Provides structured error handling with HTTP status codes
 */

import { HTTP_STATUS } from '../constants';

/**
 * Base application error
 * Extends Error with HTTP status code and optional details
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly isOperational: boolean;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Distinguishes from programming errors
    this.details = details;

    // Maintains proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Authentication error (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', details?: Record<string, unknown>) {
    super(message, HTTP_STATUS.UNAUTHORIZED, details);
  }
}

/**
 * Authorization error (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', details?: Record<string, unknown>) {
    super(message, HTTP_STATUS.FORBIDDEN, details);
  }
}

/**
 * Resource not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Not found', details?: Record<string, unknown>) {
    super(message, HTTP_STATUS.NOT_FOUND, details);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  readonly field?: string;

  constructor(message: string, field?: string, details?: Record<string, unknown>) {
    super(message, HTTP_STATUS.BAD_REQUEST, details);
    this.field = field;
  }
}

/**
 * Conflict error (409) - e.g., duplicate email
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', details?: Record<string, unknown>) {
    super(message, HTTP_STATUS.CONFLICT, details);
  }
}

/**
 * Rate limit error (429)
 */
export class TooManyRequestsError extends AppError {
  readonly retryAfter?: number;

  constructor(
    message: string = 'Too many requests',
    retryAfter?: number,
    details?: Record<string, unknown>,
  ) {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, details);
    this.retryAfter = retryAfter;
  }
}

/**
 * Check if an error is an operational AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError && error.isOperational;
}

/**
 * Convert any error to a standardized response format
 */
export function toErrorResponse(error: unknown): {
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
} {
  if (isAppError(error)) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    };
  }

  // Don't expose internal error details
  return {
    message: 'Internal server error',
    statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
  };
}
