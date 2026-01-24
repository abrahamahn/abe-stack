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
  // Billing schemas
  BILLING_PROVIDERS,
  INVOICE_STATUSES,
  // Jobs schemas (admin job monitoring)
  JOB_STATUSES,
  OAUTH_PROVIDERS,
  PAYMENT_METHOD_TYPES,
  PLAN_INTERVALS,
  SECURITY_EVENT_TYPES,
  SECURITY_SEVERITIES,
  SORT_ORDER,
  SUBSCRIPTION_STATUSES,
  USER_ROLES,
  USER_STATUSES,
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
  invoiceSchema,
  invoicesListResponseSchema,
  jobActionResponseSchema,
  jobDetailsSchema,
  jobErrorSchema,
  jobIdRequestSchema,
  jobListQuerySchema,
  jobListResponseSchema,
  jobStatusSchema,
  jobsContract,
  loginRequestSchema,
  logoutResponseSchema,
  magicLinkRequestResponseSchema,
  magicLinkRequestSchema,
  magicLinkVerifyResponseSchema,
  magicLinkVerifySchema,
  nameSchema,
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
  paymentMethodResponseSchema,
  paymentMethodSchema,
  paymentMethodsListResponseSchema,
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
  // User schemas
  userRoleSchema,
  userSchema,
  userStatusSchema,
  usersContract,
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
  InvoiceStatus,
  InvoicesListResponse,
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
  PaymentMethodType,
  PaymentMethodsListResponse,
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
  SecurityEventType,
  SecurityEventsExportRequest,
  SecurityEventsExportResponse,
  SecurityEventsFilter,
  SecurityEventsListRequest,
  SecurityEventsListResponse,
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
  InternalError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableError,
  ValidationError,
  getErrorStatusCode,
  getSafeErrorMessage,
  isAppError,
  isErrorResponse,
  isSuccessResponse,
  toAppError,
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
  // Constants
  DEFAULT_NOTIFICATION_PREFERENCES,
  // Errors
  InvalidPreferencesError,
  InvalidSubscriptionError,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_TYPES,
  NotificationRateLimitError,
  NotificationSendError,
  NotificationsDisabledError,
  PayloadTooLargeError,
  PreferencesNotFoundError,
  ProviderError,
  SubscriptionExistsError as PushSubscriptionExistsError,
  QuietHoursActiveError,
  SubscriptionExpiredError,
  VapidNotConfiguredError,
  // Schemas
  batchSendResultSchema,
  notificationActionSchema,
  notificationChannelSchema,
  notificationPayloadSchema,
  notificationPrioritySchema,
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
  PAGINATION_ERROR_TYPES,
  PaginationError,
  buildCursorPaginationQuery,
  calculateCursorPaginationMetadata,
  createCursorForItem,
  decodeCursor,
  encodeCursor,
  getSortableValue,
  isCursorValue,
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
  // Errors
  InvalidCursorError,
  InvalidFieldError,
  InvalidFilterError,
  InvalidOperatorError,
  InvalidPaginationError,
  InvalidQueryError,
  InvalidSortError,
  LOGICAL_OPERATORS,
  QueryTooComplexError,
  SEARCH_DEFAULTS,
  SEARCH_ERROR_TYPES,
  SearchError,
  SearchProviderError,
  SearchProviderUnavailableError,
  SearchQueryBuilder,
  SearchTimeoutError,
  UnsupportedOperatorError,
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
  facetResultSchema,
  facetedSearchQuerySchema,
  facetedSearchResultSchema,
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
  isCompoundFilter,
  isFilterCondition,
  isInvalidFilterError,
  isInvalidQueryError,
  isSearchError,
  isSearchProviderError,
  isSearchTimeoutError,
  logicalOperatorSchema,
  paginateArray,
  rangeValueSchema,
  searchQuerySchema,
  searchResultItemSchema,
  searchResultSchema,
  sortArray,
  sortConfigSchema,
  sortOrderSchema,
  urlSearchParamsSchema,
} from './domains/search';
export type {
  CompoundFilter,
  CursorSearchResult,
  FacetBucket,
  FacetConfig,
  FacetResult,
  FacetedSearchQuery,
  FacetedSearchResult,
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
  // Type guards
  isBillingProviderError,
  isPlanError,
  isSubscriptionError,
} from './domains/billing';

// ============================================================================
// Config: Types and helpers
// ============================================================================
export type {
  // Composite types
  AppConfig,
  // Auth types
  AuthConfig,
  AuthStrategy,
  // Service types
  BillingConfig,
  BillingPlansConfig,
  BillingUrlsConfig,
  DatabaseConfig,
  DatabaseProvider,
  ElasticsearchProviderConfig,
  EmailConfig,
  FcmConfig,
  // Infrastructure types
  CacheConfig as InfraCacheConfig,
  JsonDatabaseConfig,
  JwtRotationConfig,
  LocalStorageConfig,
  LogLevel,
  OAuthProviderConfig,
  PayPalProviderConfig,
  PostgresConfig,
  QueueConfig,
  QueueProvider,
  RateLimitConfig,
  S3StorageConfig,
  SearchConfig,
  ServerConfig,
  SmtpConfig,
  SqlSearchProviderConfig,
  StorageConfig,
  StorageConfigBase,
  StorageProviderName,
  StripeProviderConfig,
} from './contracts/config';

export { getBool, getInt, getList, getRequired } from './config/utils';

// ============================================================================
// Errors: HTTP mapping and validation formatting
// ============================================================================
export {
  HTTP_ERROR_MESSAGES,
  formatValidationErrors,
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
