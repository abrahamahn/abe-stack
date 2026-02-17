// main/shared/src/engine/errors/index.ts

// Base classes, HTTP errors, utilities
export {
  AppError,
  BaseError,
  BadRequestError,
  ConfigurationError,
  ConflictError,
  ForbiddenError,
  formatValidationErrors,
  getErrorStatusCode,
  getSafeErrorMessage,
  InternalError,
  InternalServerError,
  isAppError,
  NotFoundError,
  ResourceNotFoundError,
  toAppError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableError,
  ValidationError,
  type AppErrorInfo,
  type ValidationErrorDetail,
  type ValidationErrorResponse,
  type ValidationIssue,
} from './errors';

// Auth & account errors
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
} from './errors';

// HTTP error mapper
export {
  isKnownAuthError,
  mapErrorToHttpResponse,
  type EmailSendErrorShape,
  type ErrorMapperLogger,
  type ErrorMapperOptions,
  type ErrorStatusCode,
  type HttpErrorResponse,
} from './error-mapper';
