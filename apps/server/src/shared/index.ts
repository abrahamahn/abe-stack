// apps/server/src/shared/index.ts
/**
 * Shared Kernel
 *
 * Framework-agnostic constants, types, and errors
 * used throughout the application.
 */

// Constants
export {
  // Time constants
  MS_PER_SECOND,
  SECONDS_PER_MINUTE,
  MINUTES_PER_HOUR,
  HOURS_PER_DAY,
  DAYS_PER_WEEK,
  MS_PER_MINUTE,
  MS_PER_HOUR,
  MS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_DAY,
  // Security constants
  MIN_JWT_SECRET_LENGTH,
  REFRESH_TOKEN_BYTES,
  PROGRESSIVE_DELAY_WINDOW_MS,
  MAX_PROGRESSIVE_DELAY_MS,
  // Cookie names
  REFRESH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  // HTTP status codes
  HTTP_STATUS,
  // Messages
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  FAILURE_REASONS,
} from './constants';

// Errors
export {
  // Base error
  AppError,
  // HTTP errors
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  InternalError,
  // Auth errors
  InvalidCredentialsError,
  AccountLockedError,
  InvalidTokenError,
  TokenReuseError,
  WeakPasswordError,
  EmailAlreadyExistsError,
  UserNotFoundError,
  // OAuth errors
  OAuthError,
  OAuthStateMismatchError,
  // 2FA errors
  TotpRequiredError,
  TotpInvalidError,
  // Validation errors
  ValidationError,
  // Helpers
  isAppError,
  toAppError,
} from './errors';

// Types
export type {
  // User types
  UserRole,
  User,
  UserWithPassword,
  // Token types
  TokenPayload,
  RefreshTokenData,
  // Auth types
  AuthResult,
  OAuthUserInfo,
  MagicLinkData,
  TotpSecret,
  // Request context
  RequestInfo,
  // Service interfaces
  Logger,
  EmailService,
  EmailOptions,
  EmailResult,
  StorageService,
  // DI Container
  IServiceContainer,
  AppContext,
} from './types';
