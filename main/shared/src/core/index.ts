// main/shared/src/core/index.ts

// Engine layer: base classes, HTTP errors, utilities
import {
  AppError,
  BadRequestError,
  BaseError,
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
} from '../engine/errors';

export {
  AppError,
  BadRequestError,
  BaseError,
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
};

// Auth & account errors (canonical in engine/errors)
import {
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
} from '../engine/errors';

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
};

export {
  can,
  hasPermission,
  type AuthContext,
  type PolicyAction,
  type PolicyResource,
} from './policy';

export { baseEnvSchema, getRawEnv, validateEnv, type BaseEnv } from './env';

// Engine layer: response envelope schemas
import {
  apiResultSchema,
  createErrorCodeSchema,
  emptyBodySchema,
  envelopeErrorResponseSchema,
  errorCodeSchema,
  errorResponseSchema,
  successResponseSchema,
  type ApiResultEnvelope,
  type EmptyBody,
  type ErrorResponseEnvelope,
  type SuccessResponseEnvelope,
} from '../engine/http';

export {
  apiResultSchema,
  createErrorCodeSchema,
  emptyBodySchema,
  envelopeErrorResponseSchema,
  errorCodeSchema,
  errorResponseSchema,
  successResponseSchema,
  type ApiResultEnvelope,
  type EmptyBody,
  type ErrorResponseEnvelope,
  type SuccessResponseEnvelope,
};

// Field validation schemas
export {
  bioSchema,
  dateOfBirthSchema,
  emailSchema,
  firstNameSchema,
  genderSchema,
  identifierSchema,
  isoDateTimeSchema,
  lastNameSchema,
  nameSchema,
  optionalShortTextSchema,
  passwordSchema,
  phoneSchema,
  requiredNameSchema,
  usernameSchema,
  uuidSchema,
  websiteSchema,
} from './schemas';

export {
  createListInsertOperation,
  createListRemoveOperation,
  createSetOperation,
  createTransaction,
  invertOperation,
  invertTransaction,
  isListInsertOperation,
  isListRemoveOperation,
  isSetOperation,
  mergeTransactions,
  type ListInsertOperation,
  type ListRemoveOperation,
  type Operation,
  type SetOperation,
  type Transaction,
} from './transactions';
