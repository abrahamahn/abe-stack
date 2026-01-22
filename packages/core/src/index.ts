// packages/core/src/index.ts
/**
 * @abe-stack/core
 *
 * Shared types, validation, errors, and utilities for the ABE Stack.
 * This is the main entry point for the package.
 */

// ============================================================================
// Contracts (API schemas and types)
// ============================================================================
export {
  // API contracts
  adminContract,
  apiContract,
  authContract,
  usersContract,
  // Auth schemas
  authResponseSchema,
  emailVerificationRequestSchema,
  emailVerificationResponseSchema,
  forgotPasswordRequestSchema,
  forgotPasswordResponseSchema,
  loginRequestSchema,
  logoutResponseSchema,
  magicLinkRequestResponseSchema,
  magicLinkRequestSchema,
  magicLinkVerifyResponseSchema,
  magicLinkVerifySchema,
  refreshResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  resendVerificationRequestSchema,
  resendVerificationResponseSchema,
  resetPasswordRequestSchema,
  resetPasswordResponseSchema,
  setPasswordRequestSchema,
  setPasswordResponseSchema,
  // OAuth schemas
  oauthContract,
  oauthProviderSchema,
  oauthInitiateResponseSchema,
  oauthCallbackQuerySchema,
  oauthCallbackResponseSchema,
  oauthLinkResponseSchema,
  oauthLinkCallbackResponseSchema,
  oauthUnlinkResponseSchema,
  oauthConnectionSchema,
  oauthConnectionsResponseSchema,
  OAUTH_PROVIDERS,
  // Admin schemas
  unlockAccountRequestSchema,
  unlockAccountResponseSchema,
  // Common schemas
  emailSchema,
  errorResponseSchema,
  nameSchema,
  passwordSchema,
  requiredNameSchema,
  uuidSchema,
  // Pagination schemas
  cursorPaginatedResultSchema,
  cursorPaginationOptionsSchema,
  paginatedResultSchema,
  paginationOptionsSchema,
  SORT_ORDER,
  universalPaginatedResultSchema,
  universalPaginationOptionsSchema,
  // User schemas
  USER_ROLES,
  userResponseSchema,
  userRoleSchema,
  userSchema,
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
  MagicLinkRequest,
  MagicLinkRequestResponse,
  MagicLinkVerifyRequest,
  MagicLinkVerifyResponse,
  NativeBridge,
  OAuthCallbackQuery,
  OAuthCallbackResponse,
  OAuthConnection,
  OAuthConnectionsResponse,
  OAuthInitiateResponse,
  OAuthLinkCallbackResponse,
  OAuthLinkResponse,
  OAuthProvider,
  OAuthUnlinkResponse,
  PaginatedResult,
  PaginationOptions,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  SetPasswordRequest,
  SetPasswordResponse,
  SortOrder,
  UniversalPaginatedResult,
  UniversalPaginationOptions,
  UnlockAccountRequest,
  UnlockAccountResponse,
  User,
  UserResponse,
  UserRole,
} from './contracts';

// ============================================================================
// Infrastructure: Async utilities
// ============================================================================
export { BatchedQueue, DeferredPromise, ReactiveMap } from './infrastructure/async';
export type { BatchedQueueOptions } from './infrastructure/async';

// ============================================================================
// Infrastructure: Constants
// ============================================================================
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
} from './infrastructure/constants';
export type { HttpStatusCode } from './infrastructure/constants';

// ============================================================================
// Infrastructure: Errors
// ============================================================================
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
} from './infrastructure/errors';
export type { ApiErrorResponse, ApiResponse, ApiSuccessResponse } from './infrastructure/errors';

// ============================================================================
// Infrastructure: HTTP
// ============================================================================
export { parseCookies } from './infrastructure/http';

// ============================================================================
// Stores
// ============================================================================
export { createStore, createUndoRedoStore, toastStore, useUndoRedoStore } from './stores';
export type { StoreApi, ToastMessage, UndoRedoState, UseBoundStore } from './stores';

// ============================================================================
// Infrastructure: Transactions (for undo/redo)
// ============================================================================
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
} from './infrastructure/transactions';
export type {
  ListInsertOperation,
  ListRemoveOperation,
  Operation,
  SetOperation,
  Transaction,
} from './infrastructure/transactions';

// ============================================================================
// Contracts: Realtime API (for REST endpoints)
// ============================================================================
export {
  conflictResponseSchema,
  getRecordsResponseSchema,
  listInsertOperationSchema,
  listPositionSchema,
  listRemoveOperationSchema,
  operationSchema,
  realtimeContract,
  recordMapSchema,
  recordPointerSchema,
  recordSchema,
  setNowOperationSchema,
  setOperationSchema,
  transactionSchema,
  writeResponseSchema,
} from './contracts/realtime';
export type {
  ConflictResponse,
  GetRecordsResponse,
  ListPosition,
  RealtimeRecord,
  RecordMap,
  RecordPointer,
  WriteResponse,
  // Realtime operation types - use distinct names to avoid conflict with Transaction types
  ListInsertOperation as RealtimeListInsertOperation,
  ListRemoveOperation as RealtimeListRemoveOperation,
  Operation as RealtimeOperation,
  SetNowOperation as RealtimeSetNowOperation,
  SetOperation as RealtimeSetOperation,
  Transaction as RealtimeTransaction,
} from './contracts/realtime';

// ============================================================================
// Domain: Auth (errors and validation)
// ============================================================================
export {
  // Auth errors
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
  // Password validation
  defaultPasswordConfig,
  estimatePasswordStrength,
  getStrengthColor,
  getStrengthLabel,
  validatePassword,
  validatePasswordBasic,
} from './domains/auth';
export type {
  PasswordConfig,
  PasswordPenalties,
  PasswordValidationResult,
  StrengthResult,
} from './domains/auth';

// ============================================================================
// Domain: Cache
// ============================================================================
export {
  // Errors
  CacheCapacityError,
  CacheConnectionError,
  CacheDeserializationError,
  CacheError,
  CacheInvalidKeyError,
  CacheMemoryLimitError,
  CacheNotInitializedError,
  CacheProviderNotFoundError,
  CacheSerializationError,
  CacheTimeoutError,
  isCacheConnectionError,
  isCacheError,
  isCacheTimeoutError,
  toCacheError,
} from './domains/cache';
export type {
  BaseCacheConfig,
  CacheConfig,
  CacheDeleteOptions,
  CacheEntry,
  CacheEntryMetadata,
  CacheGetOptions,
  CacheProvider,
  CacheSetOptions,
  CacheStats,
  MemoryCacheConfig,
} from './domains/cache';

// ============================================================================
// Domain: Notifications (Push notifications)
// ============================================================================
export {
  // Schemas
  batchSendResultSchema,
  notificationActionSchema,
  notificationChannelSchema,
  notificationPayloadSchema,
  notificationPrioritySchema,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_TYPES,
  notificationTypePreferenceSchema,
  notificationTypeSchema,
  preferencesResponseSchema,
  pushSubscriptionKeysSchema,
  pushSubscriptionSchema,
  quietHoursSchema,
  sendNotificationRequestSchema,
  sendNotificationResponseSchema,
  sendResultSchema,
  subscribeRequestSchema,
  subscribeResponseSchema,
  unsubscribeRequestSchema,
  unsubscribeResponseSchema,
  updatePreferencesRequestSchema,
  vapidKeyResponseSchema,
  // Constants
  DEFAULT_NOTIFICATION_PREFERENCES,
  // Errors
  InvalidPreferencesError,
  InvalidSubscriptionError,
  NotificationRateLimitError,
  NotificationSendError,
  NotificationsDisabledError,
  PayloadTooLargeError,
  PreferencesNotFoundError,
  ProviderError,
  ProviderNotConfiguredError,
  QuietHoursActiveError,
  SubscriptionExistsError,
  SubscriptionExpiredError,
  SubscriptionNotFoundError,
  VapidNotConfiguredError,
} from './domains/notifications';
export type {
  BatchSendResult,
  NotificationAction,
  NotificationChannel,
  NotificationMessage,
  NotificationPayload,
  NotificationPayloadSchema,
  NotificationPreferences,
  NotificationPriority,
  NotificationType,
  NotificationTypePreference,
  PreferencesResponse,
  PushSubscription,
  PushSubscriptionKeys,
  SendNotificationRequest,
  SendNotificationRequestSchema,
  SendNotificationResponse,
  SendResult,
  StoredPushSubscription,
  SubscribeRequest,
  SubscribeRequestSchema,
  SubscribeResponse,
  UnsubscribeRequest,
  UnsubscribeRequestSchema,
  UnsubscribeResponse,
  UpdatePreferencesRequest,
  UpdatePreferencesRequestSchema,
  VapidKeyResponse,
} from './domains/notifications';

// ============================================================================
// Domain: Pagination
// ============================================================================
export {
  buildCursorPaginationQuery,
  calculateCursorPaginationMetadata,
  createCursorForItem,
  decodeCursor,
  encodeCursor,
  getSortableValue,
  isCursorValue,
  PAGINATION_ERROR_TYPES,
  PaginationError,
  paginateArrayWithCursor,
  paginateLargeArrayWithCursor,
} from './domains/pagination';
export type { CursorData, PaginationErrorType } from './domains/pagination';

// ============================================================================
// Domain: Search
// ============================================================================
export {
  // Types and constants
  FILTER_OPERATORS,
  isCompoundFilter,
  isFilterCondition,
  LOGICAL_OPERATORS,
  // SORT_ORDER is exported from contracts
  // Schemas
  compoundFilterSchema,
  cursorSearchResultSchema,
  facetBucketSchema,
  facetConfigSchema,
  facetedSearchQuerySchema,
  facetedSearchResultSchema,
  facetResultSchema,
  filterConditionSchema,
  filterOperatorSchema,
  filterPrimitiveSchema,
  filterSchema,
  filterValueSchema,
  fullTextSearchConfigSchema,
  highlightedFieldSchema,
  logicalOperatorSchema,
  rangeValueSchema,
  SEARCH_DEFAULTS,
  searchQuerySchema,
  searchResultItemSchema,
  searchResultSchema,
  sortConfigSchema,
  sortOrderSchema,
  urlSearchParamsSchema,
  // Operators
  evaluateCompoundFilter,
  evaluateCondition,
  evaluateFilter,
  filterArray,
  getFieldValue,
  paginateArray,
  sortArray,
  // Query Builder
  createSearchQuery,
  fromSearchQuery,
  SearchQueryBuilder,
  // Errors
  InvalidCursorError,
  InvalidFieldError,
  InvalidFilterError,
  InvalidOperatorError,
  InvalidPaginationError,
  InvalidQueryError,
  InvalidSortError,
  isInvalidFilterError,
  isInvalidQueryError,
  isSearchError,
  isSearchProviderError,
  isSearchTimeoutError,
  QueryTooComplexError,
  SEARCH_ERROR_TYPES,
  SearchError,
  SearchProviderError,
  SearchProviderUnavailableError,
  SearchTimeoutError,
  UnsupportedOperatorError,
} from './domains/search';
export type {
  CompoundFilter,
  CursorSearchResult,
  FacetBucket,
  FacetConfig,
  FacetedSearchQuery,
  FacetedSearchResult,
  FacetResult,
  FilterCondition,
  FilterOperator,
  FilterPrimitive,
  FilterValue,
  FullTextSearchConfig,
  HighlightedField,
  LogicalOperator,
  SearchCapabilities,
  SearchErrorType,
  SearchProvider,
  SearchQuery,
  SearchQueryInput,
  SearchQueryOutput,
  SearchResult,
  SearchResultItem,
  SortConfig,
  // SortOrder is exported from contracts
  UrlSearchParamsInput,
} from './domains/search';

// ============================================================================
// Errors: HTTP mapping and validation formatting
// ============================================================================
export {
  formatValidationErrors,
  HTTP_ERROR_MESSAGES,
  isKnownAuthError,
  mapErrorToHttpResponse,
} from './errors';
export type {
  ErrorMapperLogger,
  ErrorMapperOptions,
  ErrorStatusCode,
  HttpErrorResponse,
  ValidationErrorDetail,
  ValidationErrorResponse,
  ZodIssueMinimal,
} from './errors';

// ============================================================================
// Media (server-only) - Import from '@abe-stack/core/media' for server apps
// ============================================================================
// Note: Media utilities use Node.js APIs (fs, child_process) and are not
// exported from the main entry point to avoid breaking browser builds.
// Server applications should import directly:
//   import { parseAudioMetadata, ... } from '@abe-stack/core/media';

// ============================================================================
// Shared: Token storage and utilities
// ============================================================================
export { addAuthHeader, createTokenStore, randomId, tokenStore } from './shared';
export type { TokenStore } from './shared';

// ============================================================================
// Utils: Async and storage (browser-safe)
// ============================================================================
export { delay, normalizeStorageKey } from './utils';

// Note: Port utilities (isPortFree, pickAvailablePort, etc.) use Node.js APIs
// and should be imported from '@abe-stack/core/utils' for server apps only.

// ============================================================================
// Environment validation (server-only, also available via @abe-stack/core/env)
// ============================================================================
export {
  envSchema,
  getEnvValidator,
  loadServerEnv,
  serverEnvSchema,
  validateDatabaseEnv,
  validateDevelopmentEnv,
  validateEmailEnv,
  validateEnvironment,
  validateEnvironmentSafe,
  validateProductionEnv,
  validateSecurityEnv,
  validateStorageEnv,
} from './env';
export type { ServerEnv } from './env';
