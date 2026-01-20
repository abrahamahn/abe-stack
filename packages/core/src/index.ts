// packages/core/src/index.ts
// NOTE: This file is manually maintained
// IMPORTANT: Only browser-safe exports here. Server-only modules use subpath exports:
//   - @abe-stack/core/crypto - JWT/token functions (uses node:crypto)
//   - @abe-stack/core/env - Server environment config
//   - @abe-stack/core/media - Media processing (uses fs, child_process)

// Async utilities
export { BatchedQueue, DeferredPromise, ReactiveMap, type BatchedQueueOptions } from './async';

// Constants
export {
  DAYS_PER_WEEK,
  HOURS_PER_DAY,
  HTTP_STATUS,
  MINUTES_PER_HOUR,
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  MS_PER_SECOND,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
  type HttpStatusCode,
} from './constants';

// Contracts
export {
  SORT_ORDER,
  USER_ROLES,
  adminContract,
  apiContract,
  authContract,
  authResponseSchema,
  cursorPaginatedResultSchema,
  cursorPaginationOptionsSchema,
  emailVerificationRequestSchema,
  emailVerificationResponseSchema,
  errorResponseSchema,
  forgotPasswordRequestSchema,
  forgotPasswordResponseSchema,
  loginRequestSchema,
  logoutResponseSchema,
  paginatedResultSchema,
  paginationOptionsSchema,
  refreshResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  resendVerificationRequestSchema,
  resendVerificationResponseSchema,
  resetPasswordRequestSchema,
  resetPasswordResponseSchema,
  universalPaginatedResultSchema,
  universalPaginationOptionsSchema,
  unlockAccountRequestSchema,
  unlockAccountResponseSchema,
  userResponseSchema,
  userRoleSchema,
  userSchema,
  usersContract,
} from './contracts';
export type {
  ApiContract,
  AuthResponse,
  CursorPaginatedResult,
  CursorPaginationOptions,
  EmailVerificationRequest,
  EmailVerificationResponse,
  ErrorResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LogoutResponse,
  NativeBridge,
  PaginatedResult,
  PaginationOptions,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SortOrder,
  UniversalPaginatedResult,
  UniversalPaginationOptions,
  UnlockAccountRequest,
  UnlockAccountResponse,
  UserResponse,
  UserRole,
} from './contracts';

// Errors
export {
  AccountLockedError,
  AppError,
  BadRequestError,
  ConflictError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  ForbiddenError,
  InternalError,
  InvalidCredentialsError,
  InvalidTokenError,
  NotFoundError,
  OAuthError,
  OAuthStateMismatchError,
  TokenReuseError,
  TooManyRequestsError,
  TotpInvalidError,
  TotpRequiredError,
  UnauthorizedError,
  UnprocessableError,
  UserNotFoundError,
  ValidationError,
  WeakPasswordError,
  getErrorStatusCode,
  getSafeErrorMessage,
  isAppError,
  isErrorResponse,
  isSuccessResponse,
  toAppError,
} from './errors';
export type { ApiErrorResponse, ApiResponse, ApiSuccessResponse } from './errors';

// HTTP utilities
export { parseCookies } from './http';

// Pagination
export {
  PAGINATION_ERROR_TYPES,
  PaginationError,
  buildCursorPaginationQuery,
  calculateCursorPaginationMetadata,
  createCursorForItem,
  decodeCursor,
  encodeCursor,
  paginateArrayWithCursor,
  paginateLargeArrayWithCursor,
} from './pagination';
export type { CursorData, PaginationErrorType } from './pagination';

// Shared utilities
export { addAuthHeader, createTokenStore, randomId, tokenStore } from './shared';
export type { TokenStore } from './shared';

// Stores
export { createUndoRedoStore, toastStore, useUndoRedoStore } from './stores';
export type { ToastMessage, UndoRedoState } from './stores';

// Transactions
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
} from './transactions';
export type {
  ListInsertOperation,
  ListRemoveOperation,
  Operation,
  SetOperation,
  Transaction,
} from './transactions';

// Utils
export { normalizeStorageKey } from './utils';

// Validation
export {
  defaultPasswordConfig,
  estimatePasswordStrength,
  getStrengthColor,
  getStrengthLabel,
  validatePassword,
  validatePasswordBasic,
} from './validation';
export type { PasswordConfig, PasswordValidationResult, StrengthResult } from './validation';
