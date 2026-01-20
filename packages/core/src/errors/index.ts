// packages/core/src/errors/index.ts
/**
 * Error Module
 *
 * Centralized error handling for the application.
 * All custom errors, helper functions, and response types.
 */

// Base error class and helpers
export { AppError, getErrorStatusCode, getSafeErrorMessage, isAppError, toAppError } from './base';

// HTTP errors
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

// Auth errors
export {
  AccountLockedError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  InvalidCredentialsError,
  InvalidTokenError,
  OAuthError,
  OAuthStateMismatchError,
  TokenReuseError,
  TotpInvalidError,
  TotpRequiredError,
  UserNotFoundError,
  WeakPasswordError,
} from './auth';

// Validation error
export { ValidationError } from './validation';

// Response types
export type { ApiErrorResponse, ApiResponse, ApiSuccessResponse } from './response';
export { isErrorResponse, isSuccessResponse } from './response';
