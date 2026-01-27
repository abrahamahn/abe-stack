// packages/sdk/src/errors.ts
/**
 * SDK Error Classes
 *
 * Maps HTTP response errors to typed error classes that extend @abe-stack/core errors.
 * Provides consistent error handling across the SDK.
 */

import {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableError,
} from '@abe-stack/core';

// HTTP Status Constants
const HttpStatus = {
  BadRequest: 400,
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  Conflict: 409,
  UnprocessableEntity: 422,
  TooManyRequests: 429,
  InternalServerError: 500,
} as const;

/**
 * API Error response structure from the server
 */
export interface ApiErrorBody {
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * SDK-specific API error that wraps HTTP errors
 * Extends AppError for consistency with core error handling
 */
export class ApiError extends AppError {
  constructor(
    message: string,
    public readonly status: number,
    code?: string,
    details?: Record<string, unknown>,
  ) {
    super(message, status, code, details);
  }

  /**
   * Check if this is a client error (4xx)
   */
  isClientError(): boolean {
    return this.status >= HttpStatus.BadRequest && this.status < HttpStatus.InternalServerError;
  }

  /**
   * Check if this is a server error (5xx)
   */
  isServerError(): boolean {
    return this.status >= HttpStatus.InternalServerError;
  }

  /**
   * Check if this error indicates the user should retry
   */
  isRetryable(): boolean {
    return (
      this.status === HttpStatus.TooManyRequests || this.status >= HttpStatus.InternalServerError
    );
  }
}

/**
 * Network error when request fails to reach the server
 */
export class NetworkError extends AppError {
  constructor(
    message = 'Network request failed',
    public readonly originalError?: Error,
  ) {
    super(message, 0, 'NETWORK_ERROR');
  }
}

/**
 * Timeout error when request exceeds time limit
 */
export class TimeoutError extends AppError {
  constructor(
    message = 'Request timed out',
    public readonly timeoutMs?: number,
  ) {
    super(message, 0, 'TIMEOUT_ERROR', timeoutMs !== undefined ? { timeoutMs } : undefined);
  }
}

/**
 * Creates a typed error from an HTTP response
 *
 * Maps HTTP status codes to specific error types from @abe-stack/core:
 * - 400 -> BadRequestError
 * - 401 -> UnauthorizedError
 * - 403 -> ForbiddenError
 * - 404 -> NotFoundError
 * - 409 -> ConflictError
 * - 422 -> UnprocessableError
 * - 429 -> TooManyRequestsError
 * - 5xx -> InternalError
 * - Other -> ApiError
 *
 * @param status - HTTP status code
 * @param body - Parsed error response body
 * @returns Typed error instance
 *
 * @example
 * ```ts
 * const error = createApiError(401, { message: 'Invalid credentials' });
 * if (error instanceof UnauthorizedError) {
 *   // Handle auth error
 * }
 * ```
 */
export function createApiError(status: number, body?: ApiErrorBody): AppError {
  const message = body?.message ?? `HTTP ${status.toString()}`;
  const code = body?.code;
  const details = body?.details;

  switch (status) {
    case HttpStatus.BadRequest:
      return new BadRequestError(message, code, details);

    case HttpStatus.Unauthorized:
      return new UnauthorizedError(message, code);

    case HttpStatus.Forbidden:
      return new ForbiddenError(message, code);

    case HttpStatus.NotFound:
      return new NotFoundError(message, code);

    case HttpStatus.Conflict:
      return new ConflictError(message, code);

    case HttpStatus.UnprocessableEntity:
      return new UnprocessableError(message, code, details);

    case HttpStatus.TooManyRequests:
      return new TooManyRequestsError(message);

    default:
      if (status >= HttpStatus.InternalServerError) {
        return new InternalError(message, code);
      }
      return new ApiError(message, status, code, details);
  }
}

/**
 * Type guard to check if an error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Type guard to check if an error is a NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Type guard to check if an error is a TimeoutError
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}

/**
 * Type guard to check if an error indicates the user is unauthorized
 */
export function isUnauthorizedError(error: unknown): error is UnauthorizedError {
  return error instanceof UnauthorizedError;
}

/**
 * Extract a user-friendly error message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}
