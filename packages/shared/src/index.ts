// packages/shared/src/index.ts

// ============================================================================
// CORE EXPORTS (Errors, constants, guards, result, policy, etc.)
// ============================================================================

export {
  errorCodeSchema,
  type ApiResponse,
  type ApiResult,
  type Contract,
  type EndpointContract,
  type ErrorResponse,
  type InferResponseData,
  type StatusCode,
} from './core/api';

export { ERROR_CODES, HTTP_STATUS, type ErrorCode } from './core/constants';

export {
  AppError,
  BadRequestError,
  BaseError,
  ConfigurationError,
  ConflictError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  ForbiddenError,
  formatValidationErrors,
  getErrorStatusCode,
  getSafeErrorMessage,
  InternalError,
  InternalServerError,
  InvalidCredentialsError,
  InvalidTokenError,
  isAppError,
  NotFoundError,
  OAuthError,
  OAuthStateMismatchError,
  ResourceNotFoundError,
  toAppError,
  TokenReuseError,
  TooManyRequestsError,
  TotpInvalidError,
  TotpRequiredError,
  UnauthorizedError,
  UnprocessableError,
  UserNotFoundError,
  ValidationError,
  WeakPasswordError,
  type ValidationErrorDetail,
  type ValidationErrorResponse,
} from './core/errors';

export {
  isErrorResponse,
  isSuccessResponse,
  type ApiErrorResponse,
  type ApiSuccessResponse,
} from './core/response';

export {
  assert,
  assertDefined,
  assertNever,
  isNonEmptyString,
  isNumber,
  isObjectLike,
  isPlainObject,
  isString,
} from './core/guard';

export { err, isErr, isOk, ok, type Result } from './core/result';

export {
  can,
  hasPermission,
  type AuthContext,
  type PolicyAction,
  type PolicyResource,
} from './core/policy';

export { baseEnvSchema, getRawEnv, validateEnv, type BaseEnv } from './core/env';

export {
  type Attachment,
  type BaseStorageConfig,
  type CacheService,
  type ConfigService,
  type EmailOptions,
  type EmailService,
  type HealthCheckResult,
  type InfrastructureService,
  type Job,
  type JobHandler,
  type JobOptions,
  type JobQueueService,
  type LocalStorageConfig,
  type MetricsService,
  type ReadableStreamLike,
  type S3StorageConfig,
  type SendResult,
  type StorageClient,
  type StorageConfig,
  type StorageProvider,
} from './core/ports';

export {
  apiResultSchema,
  emailSchema,
  emptyBodySchema,
  errorResponseSchema,
  isoDateTimeSchema,
  passwordSchema,
  successResponseSchema,
  type EmptyBody,
} from './core/schemas';

export type { ModuleDeps, ModuleRegistrationOptions } from './core/module-registration';

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
} from './core/transactions';

// ============================================================================
// DOMAIN EXPORTS
// ============================================================================

// Audit log
export {
  AUDIT_ACTION_REGEX,
  AUDIT_CATEGORIES,
  AUDIT_SEVERITIES,
  auditEventSchema,
  auditLogFilterSchema,
  auditLogListResponseSchema,
  buildAuditEvent,
  createAuditEventSchema,
  sanitizeMetadata,
  type AuditBuilderParams,
  type AuditCategory,
  type AuditEvent,
  type AuditLogFilter,
  type AuditLogListResponse,
  type AuditSeverity,
  type CreateAuditEvent,
} from './domain/audit-log';

// Auth
export {
  AccountLockedError,
  AUTH_ERROR_MESSAGES,
  AUTH_SUCCESS_MESSAGES,
  authContract,
  authResponseSchema,
  changeEmailRequestSchema,
  changeEmailResponseSchema,
  confirmEmailChangeRequestSchema,
  confirmEmailChangeResponseSchema,
  EmailSendError,
  emailVerificationRequestSchema,
  emailVerificationResponseSchema,
  forgotPasswordRequestSchema,
  forgotPasswordResponseSchema,
  HTTP_ERROR_MESSAGES,
  isKnownAuthError,
  loginRequestSchema,
  logoutResponseSchema,
  magicLinkRequestResponseSchema,
  magicLinkRequestSchema,
  magicLinkVerifyRequestSchema,
  magicLinkVerifyResponseSchema,
  mapErrorToHttpResponse,
  refreshResponseSchema,
  registerRequestSchema,
  registerResponseSchema,
  resendVerificationRequestSchema,
  resendVerificationResponseSchema,
  resetPasswordRequestSchema,
  resetPasswordResponseSchema,
  setPasswordRequestSchema,
  setPasswordResponseSchema,
  totpSetupResponseSchema,
  totpStatusResponseSchema,
  totpVerifyRequestSchema,
  totpVerifyResponseSchema,
  validatePassword,
  type AuthResponse,
  type ChangeEmailRequest,
  type ChangeEmailResponse,
  type ConfirmEmailChangeRequest,
  type ConfirmEmailChangeResponse,
  type EmailVerificationRequest,
  type EmailVerificationResponse,
  type ErrorMapperLogger,
  type ErrorMapperOptions,
  type ErrorStatusCode,
  type ForgotPasswordRequest,
  type ForgotPasswordResponse,
  type HttpErrorResponse,
  type LoginRequest,
  type LogoutResponse,
  type MagicLinkRequest,
  type MagicLinkRequestResponse,
  type MagicLinkVerifyRequest,
  type MagicLinkVerifyResponse,
  type RefreshResponse,
  type RegisterRequest,
  type RegisterResponse,
  type ResendVerificationRequest,
  type ResendVerificationResponse,
  type ResetPasswordRequest,
  type ResetPasswordResponse,
  type SetPasswordRequest,
  type SetPasswordResponse,
  type TotpSetupResponse,
  type TotpStatusResponse,
  type TotpVerifyRequest,
  type TotpVerifyResponse,
} from './domain/auth';

// Billing
export {
  addPaymentMethodRequestSchema,
  adminBillingStatsSchema,
  adminPlansListResponseSchema,
  BillingProviderError,
  BillingProviderNotConfiguredError,
  billingContract,
  BillingSubscriptionExistsError,
  BillingSubscriptionNotFoundError,
  BILLING_PROVIDERS,
  calculateProration,
  cancelSubscriptionRequestSchema,
  CannotDeactivatePlanWithActiveSubscriptionsError,
  CannotDowngradeInTrialError,
  CannotRemoveDefaultPaymentMethodError,
  cardDetailsSchema,
  CheckoutSessionError,
  checkoutRequestSchema,
  checkoutResponseSchema,
  createPlanRequestSchema,
  CustomerNotFoundError,
  FEATURE_KEYS,
  InvoiceNotFoundError,
  invoiceSchema,
  invoicesListResponseSchema,
  INVOICE_STATUSES,
  isBillingProviderError,
  isPlanError,
  isSubscriptionError,
  PAYMENT_METHOD_TYPES,
  PaymentMethodNotFoundError,
  PaymentMethodValidationError,
  paymentMethodResponseSchema,
  paymentMethodSchema,
  paymentMethodsListResponseSchema,
  PlanHasActiveSubscriptionsError,
  PLAN_FEES,
  PLAN_INTERVALS,
  PlanNotActiveError,
  PlanNotFoundError,
  planFeatureSchema,
  planSchema,
  plansListResponseSchema,
  setupIntentResponseSchema,
  SubscriptionAlreadyCanceledError,
  SubscriptionNotActiveError,
  SubscriptionNotCancelingError,
  SUBSCRIPTION_STATUSES,
  subscriptionActionResponseSchema,
  subscriptionResponseSchema,
  subscriptionSchema,
  updatePlanRequestSchema,
  updateSubscriptionRequestSchema,
  WebhookEventAlreadyProcessedError,
  WebhookSignatureError,
  type AddPaymentMethodRequest,
  type AdminBillingStats,
  type AdminPlansListResponse,
  type BillingProvider,
  type BillingStats,
  type CancelSubscriptionRequest,
  type CardDetails,
  type CheckoutRequest,
  type CheckoutResponse,
  type CreatePlanRequest,
  type FeatureKey,
  type Invoice,
  type InvoiceStatus,
  type InvoicesListResponse,
  type PaymentMethod,
  type PaymentMethodResponse,
  type PaymentMethodType,
  type PaymentMethodsListResponse,
  type Plan,
  type PlanFeature,
  type PlanInterval,
  type PlansListResponse,
  type SetupIntentResponse,
  type Subscription,
  type SubscriptionActionResponse,
  type SubscriptionResponse,
  type SubscriptionStatus,
  type UpdatePlanRequest,
  type UpdateSubscriptionRequest,
} from './domain/billing';

// Compliance
export {
  CONSENT_TYPES,
  consentLogSchema,
  createConsentLogSchema,
  createLegalDocumentSchema,
  createUserAgreementSchema,
  DOCUMENT_TYPES,
  getEffectiveConsent,
  isConsentGranted,
  legalDocumentSchema,
  needsReacceptance,
  updateLegalDocumentSchema,
  userAgreementSchema,
  type ConsentLog,
  type ConsentType,
  type CreateConsentLog,
  type CreateLegalDocument,
  type CreateUserAgreement,
  type DocumentType,
  type LegalDocument,
  type UpdateLegalDocument,
  type UserAgreement,
} from './domain/compliance';

// Feature flags
export {
  evaluateFlag,
  featureFlagSchema,
  tenantFeatureOverrideSchema,
  type FeatureFlag,
  type TenantFeatureOverride,
} from './domain/feature-flags';

// Jobs
export {
  calculateBackoff,
  canRetry,
  createJobSchema,
  isTerminalStatus,
  JOB_PRIORITIES,
  JOB_PRIORITY_VALUES,
  JOB_STATUSES,
  jobSchema,
  shouldProcess,
  updateJobSchema,
  type CreateJob,
  type DomainJob,
  type JobPriority,
  type JobStatus,
  type UpdateJob,
} from './domain/jobs';

// Membership
export {
  acceptInvitationSchema,
  canAcceptInvite,
  canRevokeInvite,
  createInvitationSchema,
  hasAtLeastRole,
  INVITATION_STATUSES,
  invitationSchema,
  isInviteExpired,
  membershipSchema,
  updateMembershipRoleSchema,
  type AcceptInvitation,
  type CreateInvitation,
  type Invitation,
  type InvitationStatus,
  type Membership,
  type UpdateMembershipRole,
} from './domain/membership';

// Notifications
export {
  baseMarkAsReadRequestSchema,
  DEFAULT_NOTIFICATION_PREFERENCES,
  InvalidPreferencesError,
  InvalidSubscriptionError,
  NotificationRateLimitError,
  NotificationSendError,
  NOTIFICATION_TYPES,
  NotificationsDisabledError,
  notificationPreferencesSchema,
  notificationSchema,
  notificationsListRequestSchema,
  notificationsListResponseSchema,
  PayloadTooLargeError,
  PreferencesNotFoundError,
  ProviderError,
  PushProviderNotConfiguredError,
  PushSubscriptionExistsError,
  PushSubscriptionNotFoundError,
  QuietHoursActiveError,
  shouldSendNotification,
  SubscriptionExpiredError,
  VapidNotConfiguredError,
  type BaseMarkAsReadRequest,
  type BatchSendResult,
  type Notification,
  type NotificationAction,
  type NotificationChannel,
  type NotificationMessage,
  type NotificationPayload,
  type NotificationPreferences,
  type NotificationPriority,
  type NotificationType,
  type NotificationsListRequest,
  type NotificationsListResponse,
  type PreferencesResponse,
  type PushSendResult,
  type PushSubscription,
  type PushSubscriptionKeys,
  type SendNotificationRequest,
  type SendNotificationResponse,
  type StoredPushSubscription,
  type SubscribeRequest,
  type SubscribeResponse,
  type UnsubscribeRequest,
  type UnsubscribeResponse,
  type UpdatePreferencesRequest,
  type VapidKeyResponse,
} from './domain/notifications';

// Sessions
export {
  createUserSessionSchema,
  getSessionAge,
  isSessionActive,
  isSessionRevoked,
  updateUserSessionSchema,
  userSessionSchema,
  type CreateUserSession,
  type UpdateUserSession,
  type UserSession,
} from './domain/sessions';

// Tenant
export {
  createTenantSchema,
  tenantSchema,
  updateTenantSchema,
  type CreateTenantInput,
  type Tenant,
  type UpdateTenantInput,
} from './domain/tenant';

// Usage metering
export {
  aggregateSnapshots,
  aggregateValues,
  isOverQuota,
  usageMetricSchema,
  usageSnapshotSchema,
  type UsageMetric,
  type UsageSnapshot,
} from './domain/usage-metering';

// Users
export {
  APP_ROLES,
  appRoleSchema,
  avatarDeleteResponseSchema,
  avatarUploadResponseSchema,
  canUser,
  changePasswordRequestSchema,
  changePasswordResponseSchema,
  getAllRoles,
  getRoleDisplayName,
  hasRole,
  isAdmin,
  isModerator,
  isOwner,
  isRegularUser,
  isUser,
  revokeAllSessionsResponseSchema,
  revokeSessionResponseSchema,
  sessionSchema,
  sessionsListResponseSchema,
  updateProfileRequestSchema,
  userIdSchema,
  userSchema,
  usersContract,
  type AppRole,
  type AvatarDeleteResponse,
  type AvatarUploadResponse,
  type ChangePasswordRequest,
  type ChangePasswordResponse,
  type RevokeAllSessionsResponse,
  type RevokeSessionResponse,
  type Session,
  type SessionsListResponse,
  type UpdateProfileRequest,
  type User,
  type UserId,
} from './domain/users';

// Webhooks
export {
  calculateRetryDelay,
  createWebhookDeliverySchema,
  createWebhookSchema,
  isDeliveryTerminal,
  matchesEventFilter,
  shouldRetryDelivery,
  updateWebhookDeliverySchema,
  updateWebhookSchema,
  WEBHOOK_DELIVERY_STATUSES,
  webhookDeliverySchema,
  webhookSchema,
  type CreateWebhook,
  type CreateWebhookDelivery,
  type UpdateWebhook,
  type UpdateWebhookDelivery,
  type Webhook,
  type WebhookDelivery,
  type WebhookDeliveryStatus,
} from './domain/webhooks';

// ============================================================================
// API CONTRACTS (Namespace + flat convenience exports)
// ============================================================================

export * as Contracts from './contracts';

// OAuth (flat convenience)
export {
  OAUTH_PROVIDERS,
  oauthCallbackQuerySchema,
  oauthCallbackResponseSchema,
  oauthConnectionSchema,
  oauthConnectionsResponseSchema,
  oauthContract,
  oauthEnabledProvidersResponseSchema,
  oauthInitiateResponseSchema,
  oauthLinkCallbackResponseSchema,
  oauthLinkResponseSchema,
  oauthProviderSchema,
  oauthUnlinkResponseSchema,
  type OAuthCallbackQuery,
  type OAuthCallbackResponse,
  type OAuthConnection,
  type OAuthConnectionsResponse,
  type OAuthEnabledProvidersResponse,
  type OAuthInitiateResponse,
  type OAuthLinkCallbackResponse,
  type OAuthLinkResponse,
  type OAuthProvider,
  type OAuthUnlinkResponse,
} from './contracts/oauth';

// Realtime (flat convenience)
// NOTE: Types SetOperation, ListInsertOperation, ListRemoveOperation, Operation,
// Transaction are exported from ./core/transactions. Use Contracts.* for the
// realtime-specific versions if needed.
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
  type ConflictResponse,
  type GetRecordsRequest,
  type GetRecordsResponse,
  type ListPosition,
  type RealtimeRecord,
  type RealtimeTransaction,
  type RecordMap,
  type RecordPointer,
  type SetNowOperation,
  type WriteResponse,
} from './contracts/realtime';

// Security (flat convenience)
export {
  SECURITY_EVENT_TYPES,
  SECURITY_SEVERITIES,
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
  type SecurityEvent,
  type SecurityEventDetailRequest,
  type SecurityEventDetailResponse,
  type SecurityEventsExportRequest,
  type SecurityEventsExportResponse,
  type SecurityEventsFilter,
  type SecurityEventsListRequest,
  type SecurityEventsListResponse,
  type SecurityEventType,
  type SecurityMetrics,
  type SecurityMetricsRequest,
  type SecurityMetricsResponse,
  type SecuritySeverity,
} from './contracts/security';

// ============================================================================
// TYPE DEFINITIONS (Namespace)
// ============================================================================

export * as Types from './types';

// ============================================================================
// BROWSER-SAFE UTILITIES
// ============================================================================

// --- Async ---
export * as Async from './utils/async';

export {
  BatchedQueue,
  DeferredPromise,
  delay,
  ReactiveMap,
  type BatchedQueueOptions,
  type BatchProcessResult,
} from './utils/async';

// --- Cache ---
export * as Cache from './utils/cache';

export {
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
  LRUCache,
  memoize,
  toCacheError,
  type CacheConfig,
  type CacheEntry,
  type CacheProvider,
  type CacheStats,
  type LRUCacheOptions,
  type MemoizeFunction,
  type MemoizeOptions,
} from './utils/cache';

// --- Search ---
export * as Search from './utils/search';

export {
  compoundFilterSchema,
  createSearchQuery,
  cursorSearchResultSchema,
  evaluateCompoundFilter,
  evaluateCondition,
  evaluateFilter,
  facetBucketSchema,
  facetConfigSchema,
  facetedSearchQuerySchema,
  facetedSearchResultSchema,
  facetResultSchema,
  filterArray,
  filterConditionSchema,
  FILTER_OPERATORS,
  filterOperatorSchema,
  filterPrimitiveSchema,
  filterSchema,
  filterValueSchema,
  fromSearchQuery,
  fullTextSearchConfigSchema,
  getFieldValue,
  highlightedFieldSchema,
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
  UnsupportedOperatorError,
  urlSearchParamsSchema,
  type CompoundFilter,
  type CursorSearchResult,
  type FacetBucket,
  type FacetConfig,
  type FacetedSearchQuery,
  type FacetedSearchResult,
  type FacetResult,
  type FilterCondition,
  type FilterOperator,
  type FilterPrimitive,
  type FilterValue,
  type FullTextSearchConfig,
  type HighlightedField,
  type LogicalOperator,
  type SearchCapabilities,
  type SearchErrorType,
  type SearchProvider,
  type SearchQuery,
  type SearchQueryInput,
  type SearchQueryOutput,
  type SearchResult,
  type SearchResultItem,
  type SortConfig,
  type UrlSearchParamsInput,
} from './utils/search';

// --- Logger ---
export * as Logger from './utils/logger';

export {
  CONSOLE_LOG_LEVELS,
  createConsoleLogger,
  createJobCorrelationId,
  createJobLogger,
  createLogger,
  createRequestContext,
  createRequestLogger,
  generateCorrelationId,
  getOrCreateCorrelationId,
  LOG_LEVELS,
  shouldLog,
  type BaseLogger,
  type ConsoleLogLevel,
  type ConsoleLoggerConfig,
  type LogData,
  type Logger,
  type LoggerConfig,
  type LogLevel,
  type RequestContext,
} from './utils/logger';

// --- Monitor ---
export * as Monitor from './utils/monitor';

export {
  buildDetailedHealthResponse,
  checkDatabase,
  checkEmail,
  checkPubSub,
  checkRateLimit,
  checkSchema,
  checkStorage,
  checkWebSocket,
  determineOverallStatus,
  type DetailedHealthResponse,
  type EmailHealthConfig,
  type HealthCheckDatabase,
  type HealthCheckPubSub,
  type LiveResponse,
  type OverallStatus,
  type ReadyResponse,
  type RoutesResponse,
  type SchemaHealth,
  type SchemaValidationResult,
  type SchemaValidator,
  type ServiceHealth,
  type ServiceStatus,
  type StartupSummaryOptions,
  type StorageHealthConfig,
  type WebSocketStats,
} from './utils/monitor';

// --- PubSub ---
export * as PubSub from './utils/pubsub';

export {
  publishAfterWrite,
  SubKeys,
  SubscriptionManager,
  type ClientMessage,
  type ListKey,
  type PostgresPubSub,
  type PostgresPubSubOptions,
  type PubSubMessage,
  type RecordKey,
  type ServerMessage,
  type SubscriptionKey,
  type SubscriptionManagerOptions,
  type WebSocket,
} from './utils/pubsub';

// --- Casing ---
export {
  camelizeKeys,
  camelToSnake,
  snakeifyKeys,
  snakeToCamel,
  toCamelCaseArray,
  toSnakeCase,
  type KeyMapping,
} from './utils/casing';

// --- Constants ---
export {
  DAYS_PER_WEEK,
  HOURS_PER_DAY,
  MINUTES_PER_HOUR,
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  MS_PER_SECOND,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
  SORT_ORDER,
  type SortOrder,
} from './utils/constants';

// --- Crypto ---
export {
  constantTimeCompare,
  generateSecureId,
  generateToken,
  generateUUID,
} from './utils/crypto';

// --- HTTP ---
export {
  parseCookies,
  serializeCookie,
  type CookieOptions,
  type CookieSerializeOptions,
} from './utils/http';

export {
  type RequestInfo,
  type RouteResult,
  type ValidationSchema,
} from './utils/http-types';

// --- Pagination ---
export {
  calculateCursorPaginationMetadata,
  calculateOffsetPaginationMetadata,
  createCursorPaginatedResult,
  createPaginatedResult,
  cursorPaginatedResultSchema,
  cursorPaginationOptionsSchema,
  paginatedResultSchema,
  PAGINATION_ERROR_TYPES,
  PaginationError,
  paginationOptionsSchema,
  sortOrderSchema,
  type CursorPaginatedResult,
  type CursorPaginationOptions,
  type PaginatedResult,
  type PaginationErrorType,
  type PaginationOptions,
} from './utils/pagination';

// --- Password ---
export {
  calculateEntropy,
  calculateScore,
  containsUserInput,
  estimateCrackTime,
  estimatePasswordStrength,
  generateFeedback,
  getStrengthColor,
  getStrengthLabel,
  hasKeyboardPattern,
  hasRepeatedChars,
  hasSequentialChars,
  isCommonPassword,
  type PasswordPenalties,
  type StrengthResult,
} from './utils/password';

// --- Rate Limit ---
export { createRateLimiter } from './utils/rate-limit';

// --- Storage ---
export {
  generateUniqueFilename,
  joinStoragePath,
  normalizeStoragePath,
  validateFileType,
} from './utils/storage';

// --- String ---
export {
  capitalize,
  countCharactersNoWhitespace,
  countWords,
  escapeHtml,
  normalizeWhitespace,
  padLeft,
  slugify,
  stripControlChars,
  titleCase,
  toCamelCase,
  toKebabCase,
  toPascalCase,
  truncate,
} from './utils/string';

// --- Token ---
export {
  addAuthHeader,
  createTokenStore,
  tokenStore,
  type TokenStore,
} from './utils/token';
