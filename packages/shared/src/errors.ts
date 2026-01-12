// packages/shared/src/errors.ts
/**
 * Custom Error Types with HTTP Status Codes
 *
 * Following the Context Object pattern, these errors provide:
 * - Explicit HTTP status codes for API responses
 * - Type-safe error handling across the application
 * - Protection against leaking sensitive information in production
 *
 * Usage:
 *   throw new ValidationError('Invalid email format')
 *   throw new NotFoundError('User not found')
 *   throw new PermissionError('Access denied')
 */

/**
 * Base class for HTTP errors with status codes
 */
export abstract class HttpError extends Error {
  abstract readonly statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    // Maintains proper stack trace for where error was thrown (Node.js)
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 400 Bad Request - Invalid input or request format
 */
export class ValidationError extends HttpError {
  readonly statusCode = 400;
}

/**
 * 401 Unauthorized - Missing or invalid authentication
 */
export class UnauthorizedError extends HttpError {
  readonly statusCode = 401;
}

/**
 * 403 Forbidden - Authenticated but lacks permission
 */
export class PermissionError extends HttpError {
  readonly statusCode = 403;
}

/**
 * 404 Not Found - Resource does not exist
 */
export class NotFoundError extends HttpError {
  readonly statusCode = 404;
}

/**
 * 409 Conflict - Transaction conflict or duplicate resource
 */
export class ConflictError extends HttpError {
  readonly statusCode = 409;
}

/**
 * 422 Unprocessable Entity - Semantic validation error
 * (e.g., password too weak, email already exists)
 */
export class UnprocessableError extends HttpError {
  readonly statusCode = 422;
}

/**
 * 424 Failed Dependency - Server-side invariant broken
 * Use for "this should never happen" scenarios
 */
export class BrokenError extends HttpError {
  readonly statusCode = 424;
}

/**
 * 429 Too Many Requests - Rate limited
 */
export class RateLimitError extends HttpError {
  readonly statusCode = 429;
}

/**
 * Type guard to check if an error is an HttpError
 */
export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

/**
 * Get a safe error message for API responses
 * In production, hides internal error details
 */
export function getSafeErrorMessage(error: unknown, isProduction: boolean): string {
  if (isHttpError(error)) {
    // HttpErrors are safe to expose - they have explicit messages
    return error.message;
  }

  if (!isProduction && error instanceof Error) {
    // In development, show the actual error
    return error.message;
  }

  // In production, hide internal errors
  return 'An unexpected error occurred';
}

/**
 * Get the HTTP status code for an error
 */
export function getErrorStatusCode(error: unknown): number {
  if (isHttpError(error)) {
    return error.statusCode;
  }
  return 500;
}
