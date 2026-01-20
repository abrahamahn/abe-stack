// packages/core/src/infrastructure/errors/index.ts
/**
 * Error Classes and Utilities
 *
 * Base error class, HTTP errors, and API response types.
 */

// Base error class and utilities
export { AppError, getErrorStatusCode, getSafeErrorMessage, isAppError, toAppError } from './base';

// HTTP error classes
export {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableError,
} from './http';

// API response types and guards
export { isErrorResponse, isSuccessResponse } from './response';
export type { ApiErrorResponse, ApiResponse, ApiSuccessResponse } from './response';

// Validation error
export { ValidationError } from './validation';
