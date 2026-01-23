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
  addPaymentMethodRequestSchema,
  adminBillingContract,
  // API contracts
  adminContract,
  // Admin schemas
  adminLockUserRequestSchema,
  adminLockUserResponseSchema,
  adminPlanResponseSchema,
  adminPlanSchema,
  adminPlansListResponseSchema,
  adminUpdateUserRequestSchema,
  adminUpdateUserResponseSchema,
  adminUserListFiltersSchema,
  adminUserListResponseSchema,
  adminUserSchema,
  apiContract,
  authContract,
  // Auth schemas
  authResponseSchema,
  avatarDeleteResponseSchema,
  avatarUploadResponseSchema,
  // Billing schemas
  BILLING_PROVIDERS,
  billingContract,
  cancelSubscriptionRequestSchema,
  changePasswordRequestSchema,
  changePasswordResponseSchema,
  checkoutRequestSchema,
  checkoutResponseSchema,
  createPlanRequestSchema,
  // Schema factory
  createSchema,
  // Pagination schemas
  cursorPaginatedResultSchema,
  cursorPaginationOptionsSchema,
  // Common schemas
  emailSchema,
  emailVerificationRequestSchema,
  emailVerificationResponseSchema,
  emptyBillingBodySchema,
  // Auth body schemas
  emptyBodySchema,
  errorResponseSchema,
  forgotPasswordRequestSchema,
  forgotPasswordResponseSchema,
  INVOICE_STATUSES,
  invoiceSchema,
  invoicesListResponseSchema,
  // Jobs schemas (admin job monitoring)
  JOB_STATUSES,
  jobActionResponseSchema,
  jobDetailsSchema,
  jobErrorSchema,
  jobIdRequestSchema,
  jobListQuerySchema,
  jobListResponseSchema,
  jobsContract,
  jobStatusSchema,
  loginRequestSchema,
  logoutResponseSchema,
  magicLinkRequestResponseSchema,
  magicLinkRequestSchema,
  magicLinkVerifyResponseSchema,
  magicLinkVerifySchema,
  nameSchema,
  OAUTH_PROVIDERS,
  oauthCallbackQuerySchema,
  oauthCallbackResponseSchema,
  oauthConnectionSchema,
  oauthConnectionsResponseSchema,
  // OAuth schemas
  oauthContract,
  oauthEnabledProvidersResponseSchema,
  oauthInitiateResponseSchema,
  oauthLinkCallbackResponseSchema,
  oauthLinkResponseSchema,
  oauthProviderSchema,
  oauthUnlinkResponseSchema,
  paginatedResultSchema,
  paginationOptionsSchema,
  passwordSchema,
  PAYMENT_METHOD_TYPES,
  paymentMethodResponseSchema,
  paymentMethodSchema,
  paymentMethodsListResponseSchema,
  PLAN_INTERVALS,
  planSchema,
  plansListResponseSchema,
  queueStatsSchema,
  refreshResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  requiredNameSchema,
  resendVerificationRequestSchema,
  resendVerificationResponseSchema,
  resetPasswordRequestSchema,
  resetPasswordResponseSchema,
  revokeAllSessionsResponseSchema,
  revokeSessionResponseSchema,
  SECURITY_EVENT_TYPES,
  SECURITY_SEVERITIES,
  // Security schemas
  securityContract,
  securityEventDetailRequestSchema,
  securityEventDetailResponseSchema,
  securityEventSchema,
  securityEventsExportRequestSchema,
  securityEventsExportResponseSchema,
  securityEventsFilterSchema,
  securityEventsListRequestSchema,
  securityEventsListResponseSchema,
  securityMetricsRequestSchema,
  securityMetricsResponseSchema,
  securityMetricsSchema,
  sessionSchema,
  sessionsListResponseSchema,
  setPasswordRequestSchema,
  setPasswordResponseSchema,
  setupIntentResponseSchema,
  SORT_ORDER,
  SUBSCRIPTION_STATUSES,
  subscriptionActionResponseSchema,
  subscriptionResponseSchema,
  subscriptionSchema,
  syncStripeResponseSchema,
  universalPaginatedResultSchema,
  universalPaginationOptionsSchema,
  unlockAccountRequestSchema,
  unlockAccountResponseSchema,
  updatePlanRequestSchema,
  updateProfileRequestSchema,
  updateSubscriptionRequestSchema,
  USER_ROLES,
  USER_STATUSES,
  // User schemas
  userRoleSchema,
  userSchema,
  usersContract,
  userStatusSchema,
  uuidSchema,
} from './contracts';
export type {
  // Billing types
  AddPaymentMethodRequest,
  // Admin user management types
  AdminLockUserRequest,
  AdminLockUserResponse,
  AdminPlan,
  AdminPlanResponse,
  AdminPlansListResponse,
  AdminUpdateUserRequest,
  AdminUpdateUserResponse,
  AdminUser,
  AdminUserListFilters,
  AdminUserListResponse,
  // Contracts
  ApiContract,
  AuthResponse,
  AvatarDeleteResponse,
  AvatarUploadResponse,
  BillingProvider,
  CancelSubscriptionRequest,
  CardDetails,
  ChangePasswordRequest,
  ChangePasswordResponse,
  CheckoutRequest,
  CheckoutResponse,
  Contract,
  ContractRouter,
  CreatePlanRequest,
  CursorPaginatedResult,
  CursorPaginationOptions,
  EmailVerificationRequest,
  EmailVerificationResponse,
  EmptyBillingBody,
  // Empty body type
  EmptyBody,
  EndpointDef,
  ErrorResponse,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  HttpMethod,
  InferSchema,
  Invoice,
  InvoicesListResponse,
  InvoiceStatus,
  // Jobs types (admin job monitoring)
  JobActionResponse,
  JobDetails,
  JobError,
  JobIdRequest,
  JobListQuery,
  JobListResponse,
  JobStatus,
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
  OAuthEnabledProvidersResponse,
  OAuthInitiateResponse,
  OAuthLinkCallbackResponse,
  OAuthLinkResponse,
  OAuthProvider,
  OAuthUnlinkResponse,
  PaginatedResult,
  PaginationOptions,
  PaymentMethod,
  PaymentMethodResponse,
  PaymentMethodsListResponse,
  PaymentMethodType,
  Plan,
  PlanFeature,
  PlanInterval,
  PlansListResponse,
  QueryParams,
  QueueStats,
  RefreshResponse,
  RegisterRequest,
  RegisterResponse,
  RequestBody,
  ResendVerificationRequest,
  ResendVerificationResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  RevokeAllSessionsResponse,
  RevokeSessionResponse,
  SafeParseResult,
  // Schema types
  Schema,
  // Security types
  SecurityEvent,
  SecurityEventDetailRequest,
  SecurityEventDetailResponse,
  SecurityEventsExportRequest,
  SecurityEventsExportResponse,
  SecurityEventsFilter,
  SecurityEventsListRequest,
  SecurityEventsListResponse,
  SecurityEventType,
  SecurityMetrics,
  SecurityMetricsRequest,
  SecurityMetricsResponse,
  SecuritySeverity,
  Session,
  SessionsListResponse,
  SetPasswordRequest,
  SetPasswordResponse,
  SetupIntentResponse,
  SortOrder,
  Subscription,
  SubscriptionActionResponse,
  SubscriptionResponse,
  SubscriptionStatus,
  SuccessResponse,
  SyncStripeResponse,
  UniversalPaginatedResult,
  UniversalPaginationOptions,
  UnlockAccountRequest,
  UnlockAccountResponse,
  UpdatePlanRequest,
  // User profile/settings types
  UpdateProfileRequest,
  UpdateSubscriptionRequest,
  User,
  UserRole,
  UserStatus,
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
// Infrastructure: Logger (dev-only helpers)
// ============================================================================
export { createConsoleLogger } from './infrastructure/logger/console';

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
  getRecordsRequestSchema,
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
  GetRecordsRequest,
  GetRecordsResponse,
  ListPosition,
  // Realtime operation types - use distinct names to avoid conflict with Transaction types
  ListInsertOperation as RealtimeListInsertOperation,
  ListRemoveOperation as RealtimeListRemoveOperation,
  Operation as RealtimeOperation,
  RealtimeRecord,
  SetNowOperation as RealtimeSetNowOperation,
  SetOperation as RealtimeSetOperation,
  Transaction as RealtimeTransaction,
  RecordMap,
  RecordPointer,
  WriteResponse,
} from './contracts/realtime';

// ============================================================================
// Domain: Auth (errors and validation)
// ============================================================================
export {
  // Auth errors
  AccountLockedError,
  // Password validation
  defaultPasswordConfig,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  EmailSendError,
  estimatePasswordStrength,
  getStrengthColor,
  getStrengthLabel,
  InvalidCredentialsError,
  InvalidTokenError,
  OAuthError,
  OAuthStateMismatchError,
  TokenReuseError,
  TotpInvalidError,
  TotpRequiredError,
  UserNotFoundError,
  validatePassword,
  validatePasswordBasic,
  WeakPasswordError,
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
  // Constants
  DEFAULT_NOTIFICATION_PREFERENCES,
  // Errors
  InvalidPreferencesError,
  InvalidSubscriptionError,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_TYPES,
  notificationActionSchema,
  notificationChannelSchema,
  notificationPayloadSchema,
  notificationPrioritySchema,
  NotificationRateLimitError,
  NotificationsDisabledError,
  NotificationSendError,
  notificationTypePreferenceSchema,
  notificationTypeSchema,
  PayloadTooLargeError,
  PreferencesNotFoundError,
  preferencesResponseSchema,
  ProviderError,
  SubscriptionExistsError as PushSubscriptionExistsError,
  pushSubscriptionKeysSchema,
  pushSubscriptionSchema,
  QuietHoursActiveError,
  quietHoursSchema,
  sendNotificationRequestSchema,
  sendNotificationResponseSchema,
  sendResultSchema,
  subscribeRequestSchema,
  subscribeResponseSchema,
  SubscriptionExpiredError,
  unsubscribeRequestSchema,
  unsubscribeResponseSchema,
  updatePreferencesRequestSchema,
  vapidKeyResponseSchema,
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
  paginateArrayWithCursor,
  paginateLargeArrayWithCursor,
  PAGINATION_ERROR_TYPES,
  PaginationError,
} from './domains/pagination';
export type { CursorData, PaginationErrorType } from './domains/pagination';

// ============================================================================
// Domain: Search
// ============================================================================
export {
  // SORT_ORDER is exported from contracts
  // Schemas
  compoundFilterSchema,
  // Query Builder
  createSearchQuery,
  cursorSearchResultSchema,
  // Operators
  evaluateCompoundFilter,
  evaluateCondition,
  evaluateFilter,
  facetBucketSchema,
  facetConfigSchema,
  facetedSearchQuerySchema,
  facetedSearchResultSchema,
  facetResultSchema,
  // Types and constants
  FILTER_OPERATORS,
  filterArray,
  filterConditionSchema,
  filterOperatorSchema,
  filterPrimitiveSchema,
  filterSchema,
  filterValueSchema,
  fromSearchQuery,
  fullTextSearchConfigSchema,
  getFieldValue,
  highlightedFieldSchema,
  // Errors
  InvalidCursorError,
  InvalidFieldError,
  InvalidFilterError,
  InvalidOperatorError,
  InvalidPaginationError,
  InvalidQueryError,
  InvalidSortError,
  isCompoundFilter,
  isFilterCondition,
  isInvalidFilterError,
  isInvalidQueryError,
  isSearchError,
  isSearchProviderError,
  isSearchTimeoutError,
  LOGICAL_OPERATORS,
  logicalOperatorSchema,
  paginateArray,
  QueryTooComplexError,
  rangeValueSchema,
  SEARCH_DEFAULTS,
  SEARCH_ERROR_TYPES,
  SearchError,
  SearchProviderError,
  SearchProviderUnavailableError,
  SearchQueryBuilder,
  searchQuerySchema,
  searchResultItemSchema,
  searchResultSchema,
  SearchTimeoutError,
  sortArray,
  sortConfigSchema,
  sortOrderSchema,
  UnsupportedOperatorError,
  urlSearchParamsSchema,
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
// Domain: Billing
// ============================================================================
export {
  // Provider errors
  BillingProviderError,
  ProviderNotConfiguredError as BillingProviderNotConfiguredError,
  // Subscription errors
  SubscriptionExistsError as BillingSubscriptionExistsError,
  SubscriptionNotFoundError as BillingSubscriptionNotFoundError,
  CannotDeactivatePlanWithActiveSubscriptionsError,
  CannotDowngradeInTrialError,
  CannotRemoveDefaultPaymentMethodError,
  CheckoutSessionError,
  // Customer errors
  CustomerNotFoundError,
  // Invoice errors
  InvoiceNotFoundError,
  // Type guards
  isBillingProviderError,
  isPlanError,
  isSubscriptionError,
  // Payment method errors
  PaymentMethodNotFoundError,
  PaymentMethodValidationError,
  PlanHasActiveSubscriptionsError,
  PlanNotActiveError,
  // Plan errors
  PlanNotFoundError,
  SubscriptionAlreadyCanceledError,
  SubscriptionNotActiveError,
  SubscriptionNotCancelingError,
  WebhookEventAlreadyProcessedError,
  WebhookSignatureError,
} from './domains/billing';

// ============================================================================
// Config: Types and helpers
// ============================================================================
export type {
  // Composite types
  AppConfig,
  SearchConfig,
  // Auth types
  AuthConfig,
  AuthStrategy,
  JwtRotationConfig,
  OAuthProviderConfig,
  RateLimitConfig,
  // Infrastructure types
  CacheConfig as InfraCacheConfig,
  DatabaseConfig,
  DatabaseProvider,
  JsonDatabaseConfig,
  LocalStorageConfig,
  LogLevel,
  PostgresConfig,
  QueueConfig,
  QueueProvider,
  S3StorageConfig,
  ServerConfig,
  StorageConfig,
  StorageConfigBase,
  StorageProviderName,
  // Service types
  BillingConfig,
  BillingPlansConfig,
  BillingUrlsConfig,
  ElasticsearchProviderConfig,
  EmailConfig,
  FcmConfig,
  PayPalProviderConfig,
  SmtpConfig,
  SqlSearchProviderConfig,
  StripeProviderConfig,
} from './contracts/config';

export { getBool, getInt, getList, getRequired } from './config/utils';

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
