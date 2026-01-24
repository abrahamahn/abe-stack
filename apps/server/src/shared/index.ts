// apps/server/src/shared/index.ts
/**
 * Shared Kernel
 *
 * Framework-agnostic constants, types, and errors
 * used throughout the application.
 */

// Basic types (from @abe-stack/core)
export {
  // Business Errors (Mapped from Core)
  AccountLockedError,
  // Errors
  AppError,
  BadRequestError,
  ConflictError,
  DAYS_PER_WEEK,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  EmailSendError,
  ForbiddenError,
  HOURS_PER_DAY,
  HTTP_STATUS,
  InternalError,
  InvalidCredentialsError,
  InvalidTokenError,
  MINUTES_PER_HOUR,
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  // Constants
  MS_PER_SECOND,
  NotFoundError,
  OAuthError,
  OAuthStateMismatchError,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
  TokenReuseError,
  TooManyRequestsError,
  TotpInvalidError,
  TotpRequiredError,
  UnauthorizedError,
  UserNotFoundError,
  WeakPasswordError,
  isAppError,
  // Auth Results
  isKnownAuthError,
  mapErrorToHttpResponse,
  toAppError,
} from '@abe-stack/core';

// API Response Types (from @abe-stack/core)
export type {
  ApiErrorResponse,
  ApiResponse,
  ApiSuccessResponse,
  AppConfig,
  BillingService,
  // Service Interfaces (Ports)
  EmailService,
  ErrorResponse,
  Logger,
  NotificationService,
  StorageService,
} from '@abe-stack/core';

// Server-specific shared types
export type {
  AppContext,
  AuthResult,
  HasContext,
  IServiceContainer,
  MagicLinkData,
  OAuthUserInfo,
  RefreshTokenData,
  ReplyWithCookies,
  RequestInfo,
  RequestWithCookies,
  TokenPayload,
  TotpSecret,
  User,
  UserRole,
  UserWithPassword,
} from './types';

// Error mapping (Adapted for Server AppContext)
export { mapErrorToResponse } from './errorMapper';

// Constants and Messages
export {
  CSRF_COOKIE_NAME,
  ERROR_MESSAGES,
  FAILURE_REASONS,
  REFRESH_COOKIE_NAME,
  SUCCESS_MESSAGES,
} from './constants';

// Validation error utilities
export {
  formatValidationErrors,
  type ValidationErrorDetail,
  type ValidationErrorResponse,
  type ZodIssueMinimal,
} from './validationError';
