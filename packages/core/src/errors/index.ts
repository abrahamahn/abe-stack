// packages/core/src/errors/index.ts
/**
 * Error Handling
 *
 * HTTP error mapping and validation error formatting.
 * Re-exports infrastructure errors for convenience.
 */

// HTTP error mapper
export { HTTP_ERROR_MESSAGES, isKnownAuthError, mapErrorToHttpResponse } from './httpMapper';
export type {
  ErrorMapperLogger,
  ErrorMapperOptions,
  ErrorStatusCode,
  HttpErrorResponse,
} from './httpMapper';

// Validation error formatting
export { formatValidationErrors } from './validationError';
export type {
  ValidationErrorDetail,
  ValidationErrorResponse,
  ZodIssueMinimal,
} from './validationError';

// Re-export infrastructure errors for convenience
export {
  AppError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  getErrorStatusCode,
  getSafeErrorMessage,
  InternalError,
  isAppError,
  isErrorResponse,
  isSuccessResponse,
  NotFoundError,
  toAppError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableError,
  ValidationError,
} from '../infrastructure/errors';
export type { ApiErrorResponse, ApiResponse, ApiSuccessResponse } from '../infrastructure/errors';

// Re-export auth errors for convenience
export {
  AccountLockedError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  EmailSendError,
  InvalidCredentialsError,
  InvalidTokenError,
  OAuthError,
  OAuthStateMismatchError,
  TokenReuseError,
  TotpInvalidError,
  TotpRequiredError,
  UserNotFoundError,
  WeakPasswordError,
} from '../domains/auth/errors';
