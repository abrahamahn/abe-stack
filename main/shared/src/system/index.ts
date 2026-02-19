// main/shared/src/system/index.ts
/**
 * Engine Module Barrel
 *
 * Infrastructure layer: errors, constants, env, HTTP, cache, search, logger,
 * health, pubsub, pagination, security, crypto, plus domain-adjacent modules
 * (api-keys, email, feature-flags, files, jobs, media, realtime, usage-metering, webhooks).
 */

// ============================================================================
// Errors
// ============================================================================

export {
  // Base classes + HTTP errors
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
  // Error mapper
  isKnownAuthError,
  mapErrorToHttpResponse,
  type EmailSendErrorShape,
  type ErrorMapperLogger,
  type ErrorMapperOptions,
  type ErrorStatusCode,
  type HttpErrorResponse,
} from './errors';

// ============================================================================
// Constants
// ============================================================================
// Note: Some constants are also exported by domain sub-modules below.
// To avoid duplicate exports, the following are excluded here:
//   DEFAULT_PAGE_LIMIT, DEFAULT_SORT_BY, DEFAULT_SORT_ORDER, PAGINATION_ERROR_TYPES → pagination
//   CONSOLE_LOG_LEVELS → logger
//   JOB_PRIORITIES, JOB_PRIORITY_VALUES, JOB_STATUSES → jobs

export {
  // limits (excluding pagination/job/logger overlaps)
  AGGREGATION_TYPES,
  DEFAULT_PAGINATION,
  FILTER_OPERATOR_VALUES,
  FILTER_OPERATORS,
  LIMITS,
  LOGICAL_OPERATOR_VALUES,
  LOGICAL_OPERATORS,
  MAX_CHUNK_SIZE,
  MAX_DELIVERY_ATTEMPTS,
  MAX_FILENAME_LENGTH,
  MAX_UPLOAD_FILE_SIZE,
  MAX_UPLOAD_TIMEOUT_MS,
  NOTIFICATION_PAYLOAD_MAX_SIZE,
  QUOTAS,
  RETRY_DELAYS_MINUTES,
  SEARCH_DEFAULTS,
  SEARCH_ERROR_TYPES,
  SMS_LIMITS,
  SORT_ORDER,
  // platform
  ACCESS_TOKEN_COOKIE_NAME,
  ANSI,
  API_PREFIX,
  API_VERSIONS,
  AUTH_CONSTANTS,
  AUTH_ERROR_MESSAGES,
  AUTH_ERROR_NAMES,
  AUTH_SUCCESS_MESSAGES,
  CACHE_TTL,
  CORS_CONFIG,
  CRYPTO,
  CSRF_COOKIE_NAME,
  CSRF_EXEMPT_PATHS,
  DEVICE_TYPES,
  EMAIL_PROVIDERS,
  EMAIL_STATUSES,
  ERROR_CODES,
  ERROR_MESSAGES,
  HEALTH_STATUS,
  HTTP_ERROR_MESSAGES,
  HTTP_STATUS,
  JOB_STATUS_CONFIG,
  LOG_LEVELS,
  PLATFORM_TYPES,
  RATE_LIMIT_WINDOWS,
  REFRESH_TOKEN_COOKIE_NAME,
  SAFE_METHODS,
  STANDARD_HEADERS,
  SUBSCRIBABLE_EVENT_TYPES,
  SUDO_TOKEN_HEADER,
  TERMINAL_DELIVERY_STATUSES,
  TERMINAL_STATUSES,
  WEBHOOK_DELIVERY_STATUSES,
  WEBHOOK_EVENT_TYPES,
  WEBSOCKET_PATH,
  WS_CLOSE_POLICY_VIOLATION,
  type HttpStatusCode,
  // security
  SENSITIVE_KEYS,
  // audit
  AUDIT_CATEGORIES,
  AUDIT_SEVERITIES,
} from './constants';

// ============================================================================
// Env
// ============================================================================

export { baseEnvSchema, getRawEnv, validateEnv, type BaseEnv } from './env';

// ============================================================================
// HTTP
// ============================================================================

export {
  // cookies
  parseCookies,
  serializeCookie,
  type CookieOptions,
  type CookieSerializeOptions,
  // http types
  type BaseRouteDefinition,
  type HandlerContext,
  type HttpMethod,
  type RouteHandler,
  type RouteMap,
  type RouteResult,
  type ValidationSchema,
  // routes
  createRouteMap,
  protectedRoute,
  publicRoute,
  // proxy
  getValidatedClientIp,
  ipMatchesCidr,
  isFromTrustedProxy,
  isValidIp,
  isValidIpv4,
  isValidIpv6,
  parseCidr,
  parseXForwardedFor,
  validateCidrList,
  type ForwardedInfo,
  type ProxyValidationConfig,
  // multipart
  parseMultipartFile,
  type ParsedMultipartFile,
  // request
  extractIpAddress,
  extractUserAgent,
  getRequesterId,
  // csrf
  extractCsrfToken,
  // auth
  extractBearerToken,
  // user agent
  parseUserAgent,
  type ParsedUserAgent,
  // response
  apiResultSchema,
  createErrorCodeSchema,
  emptyBodySchema,
  envelopeErrorResponseSchema,
  errorCodeSchema,
  errorResponseSchema,
  simpleErrorResponseSchema,
  successResponseSchema,
  type ApiResultEnvelope,
  type EmptyBody,
  type SimpleErrorResponse,
  type ErrorResponseEnvelope,
  type SuccessResponseEnvelope,
} from './http';

// ============================================================================
// Cache
// ============================================================================

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
  type BaseCacheConfig,
  type CacheConfig,
  type CacheDeleteOptions,
  type CacheEntry,
  type CacheEntryMetadata,
  type CacheGetOptions,
  type CacheProvider,
  type CacheSetOptions,
  type CacheStats,
  type LRUCacheOptions,
  type MemoizeFunction,
  type MemoizeOptions,
  type MemoryCacheConfig,
  type RedisCacheConfig,
} from './cache';

// ============================================================================
// Search
// ============================================================================

export {
  // errors
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
  SearchError,
  SearchProviderError,
  SearchProviderUnavailableError,
  SearchTimeoutError,
  UnsupportedOperatorError,
  type SearchErrorType,
  // types
  isCompoundFilter,
  isFilterCondition,
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
  type SearchProvider,
  type SearchQuery,
  type SearchResult,
  type SearchResultItem,
  type SortConfig,
  type SortOrder,
  // operators
  evaluateCompoundFilter,
  evaluateCondition,
  evaluateFilter,
  filterArray,
  paginateArray,
  sortArray,
  // schemas
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
  searchQuerySchema,
  searchResultItemSchema,
  searchResultSchema,
  sortConfigSchema,
  urlSearchParamsSchema,
  type RangeValue,
  type SearchQueryInput,
  type SearchQueryOutput,
  type UrlSearchParams,
  type UrlSearchParamsInput,
  // serialization
  buildURLWithQuery,
  deserializeFromHash,
  deserializeFromJSON,
  deserializeFromURLParams,
  extractQueryFromURL,
  mergeSearchParamsIntoURL,
  serializeToHash,
  serializeToJSON,
  serializeToURLParams,
  type SerializationOptions,
  type SerializedFilter,
  type SerializedQuery,
  // query builder
  contains,
  createSearchQuery,
  eq,
  fromSearchQuery,
  gt,
  inArray,
  lt,
  neq,
  SearchQueryBuilder,
} from './search';

// ============================================================================
// Logger
// ============================================================================

export {
  CONSOLE_LOG_LEVELS,
  createConsoleLogger,
  createJobCorrelationId,
  createJobLogger,
  createLogger,
  createLogRequestContext,
  createRequestLogger,
  generateCorrelationId,
  getOrCreateCorrelationId,
  isValidCorrelationId,
  shouldLog,
  type BaseLogger,
  type ConsoleLoggerConfig,
  type ConsoleLogLevel,
  type LogData,
  type Logger,
  type LoggerConfig,
  type LogLevel,
  type LogRequestContext,
} from './logger';

// ============================================================================
// Health
// ============================================================================

export {
  buildDetailedHealthResponse,
  checkCache,
  checkDatabase,
  checkEmail,
  checkPubSub,
  checkQueue,
  checkRateLimit,
  checkSchema,
  checkStorage,
  checkWebSocket,
  detailedHealthResponseSchema,
  determineOverallStatus,
  liveResponseSchema,
  readyResponseSchema,
  type DetailedHealthResponse,
  type EmailHealthConfig,
  type HealthCheckCache,
  type HealthCheckDatabase,
  type HealthCheckPubSub,
  type HealthCheckQueue,
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
} from './health';

// ============================================================================
// PubSub
// ============================================================================

export {
  parseRecordKey,
  publishAfterWrite,
  SubKeys,
  SubscriptionManager,
  type ClientMessage,
  type ListKey,
  type ParsedRecordKey,
  type PostgresPubSub,
  type PostgresPubSubOptions,
  type PubSubMessage,
  type RecordKey,
  type ServerMessage,
  type SubscriptionKey,
  type SubscriptionManagerOptions,
  type WebSocket,
} from './pubsub';

// ============================================================================
// Pagination
// ============================================================================

export {
  buildCursorPaginationQuery,
  calculateCursorPaginationMetadata,
  calculateOffsetPaginationMetadata,
  createCursorForItem,
  createCursorPaginatedResult,
  createPaginatedResult,
  cursorPaginatedResultSchema,
  cursorPaginationOptionsSchema,
  decodeCursor,
  DEFAULT_PAGE_LIMIT,
  DEFAULT_PAGINATION_PARAMS,
  DEFAULT_SORT_BY,
  DEFAULT_SORT_ORDER,
  encodeCursor,
  getQueryParam,
  getSortableValue,
  isCursorValue,
  paginatedResultSchema,
  paginateArrayWithCursor,
  paginateLargeArrayWithCursor,
  PAGINATION_ERROR_TYPES,
  PaginationError,
  paginationOptionsSchema,
  parseLimitParam,
  parsePageParam,
  parseSortByParam,
  parseSortOrderParam,
  sortOrderSchema,
  type CursorData,
  type CursorPaginatedResult,
  type CursorPaginationOptions,
  type PaginatedResult,
  type PaginationErrorType,
  type PaginationOptions,
  type PaginationParamNames,
  type PaginationParseConfig,
} from './pagination';

// ============================================================================
// Security
// ============================================================================

export {
  // input
  detectNoSQLInjection,
  detectSQLInjection,
  isValidInputKeyName,
  sanitizeString,
  type SQLInjectionDetectionOptions,
  // prototype
  hasDangerousKeys,
  sanitizePrototype,
  // rate limit
  createRateLimiter,
  type RateLimitInfo,
  // sanitization
  getInjectionErrors,
  sanitizeObject,
  type SanitizationResult,
  type ValidationOptions,
} from './security';

// ============================================================================
// Crypto
// ============================================================================

export {
  // jwt
  checkTokenSecret,
  createJwtRotationHandler,
  decode,
  jwtDecode,
  JwtError,
  jwtSign,
  jwtVerify,
  sign,
  signWithRotation,
  verify,
  verifyWithRotation,
  type JwtErrorCode,
  type JwtHeader,
  type JwtPayload,
  type JwtRotationConfig,
  type SignOptions,
  type VerifyOptions,
  // token
  addAuthHeader,
  createTokenStore,
  tokenStore,
  type TokenStore,
} from './crypto';

// ============================================================================
// API Keys
// ============================================================================

export {
  apiKeyItemSchema,
  apiKeySchema,
  createApiKeyRequestSchema,
  createApiKeyResponseSchema,
  createApiKeySchema,
  deleteApiKeyResponseSchema,
  listApiKeysResponseSchema,
  revokeApiKeyResponseSchema,
  updateApiKeySchema,
  type ApiKey,
  type ApiKeyItem,
  type CreateApiKey,
  type CreateApiKeyRequest,
  type CreateApiKeyResponse,
  type DeleteApiKeyResponse,
  type ListApiKeysResponse,
  type RevokeApiKeyResponse,
  type UpdateApiKey,
} from './api-keys';

// ============================================================================
// Email
// ============================================================================

export {
  createEmailLogEntrySchema,
  createEmailTemplateSchema,
  emailLogEntrySchema,
  emailProviderSchema,
  emailStatusSchema,
  emailTemplateSchema,
  updateEmailTemplateSchema,
  type CreateEmailLogEntry,
  type CreateEmailTemplate,
  type EmailLogEntry,
  type EmailProvider,
  type EmailStatus,
  type EmailTemplate,
  type UpdateEmailTemplate,
} from './email';

// ============================================================================
// Feature Flags
// ============================================================================

export {
  createFeatureFlagRequestSchema,
  evaluateFlag,
  featureFlagActionResponseSchema,
  featureFlagSchema,
  featureFlagsListResponseSchema,
  setTenantFeatureOverrideRequestSchema,
  tenantFeatureOverrideSchema,
  updateFeatureFlagRequestSchema,
  type CreateFeatureFlagRequest,
  type FeatureFlag,
  type FeatureFlagActionResponse,
  type FeatureFlagMetadata,
  type FeatureFlagsListResponse,
  type SetTenantFeatureOverrideRequest,
  type TenantFeatureOverride,
  type UpdateFeatureFlagRequest,
} from './feature-flags';

// ============================================================================
// Files
// ============================================================================

export {
  ALLOWED_IMAGE_TYPES,
  createFileRecordSchema,
  FILE_PURPOSES,
  fileDeleteResponseSchema,
  filePurposeSchema,
  fileRecordSchema,
  filesListResponseSchema,
  fileUploadRequestSchema,
  fileUploadResponseSchema,
  generateUniqueFilename,
  joinStoragePath,
  MAX_IMAGE_SIZE,
  MAX_LOGO_SIZE,
  normalizeStoragePath,
  STORAGE_PROVIDERS,
  storageProviderSchema,
  updateFileRecordSchema,
  validateFileType,
  type CreateFileRecord,
  type FileDeleteResponse,
  type FilePurpose,
  type FileRecord,
  type FilesListResponse,
  type FileUploadRequest,
  type FileUploadResponse,
  type StorageProvider,
  type UpdateFileRecord,
} from './files';

// ============================================================================
// Jobs
// ============================================================================

export {
  calculateBackoff,
  canRetry,
  createJobSchema,
  getJobStatusLabel,
  getJobStatusTone,
  isTerminalStatus,
  JOB_PRIORITIES,
  JOB_PRIORITY_VALUES,
  JOB_STATUSES,
  jobActionResponseSchema,
  jobDetailsSchema,
  jobErrorSchema,
  jobIdRequestSchema,
  jobListQuerySchema,
  jobListResponseSchema,
  jobSchema,
  jobStatusSchema,
  queueStatsSchema,
  shouldProcess,
  updateJobSchema,
  type CreateJob,
  type DomainJob,
  type Job,
  type JobActionResponse,
  type JobDetails,
  type JobError,
  type JobIdRequest,
  type JobListQuery,
  type JobListResponse,
  type JobPriority,
  type JobStatus,
  ReactiveMap,
  type QueueStats,
  type UpdateJob,
} from './jobs';

// ============================================================================
// Media
// ============================================================================

export {
  detectFileType,
  detectFileTypeFromPath,
  generateFileId,
  getMimeType,
  isAllowedFileType,
  parseAudioMetadataFromBuffer,
  sanitizeFilename,
  validateUploadConfig,
  type AudioMetadata,
  type AudioProcessingOptions,
  type ContentModerationResult,
  type FileTypeResult,
  type ImageProcessingOptions,
  type MediaMetadata,
  type MediaProcessingOptions,
  type ProcessingResult,
  type SecurityScanResult,
  type UploadConfig,
  type VideoProcessingOptions,
} from './media';

// ============================================================================
// Realtime
// ============================================================================

export {
  applyOperation,
  applyOperations,
  checkVersionConflicts,
  conflictResponseSchema,
  getOperationPointers,
  getRecordsRequestSchema,
  getRecordsResponseSchema,
  isFieldMutable,
  listInsertOperationSchema,
  listPositionSchema,
  listRemoveOperationSchema,
  operationSchema,
  PROTECTED_FIELDS,
  REALTIME_ERRORS,
  recordMapSchema,
  recordPointerSchema,
  recordSchema,
  setNowOperationSchema,
  setOperationSchema,
  setPath,
  transactionSchema,
  writeResponseSchema,
  type ApplyOperationsResult,
  type ConflictResponse,
  type GetRecordsRequest,
  type GetRecordsResponse,
  type ListPosition,
  type RealtimeListInsertOperation,
  type RealtimeListRemoveOperation,
  type RealtimeOperation,
  type RealtimeRecord,
  type RealtimeSetNowOperation,
  type RealtimeSetOperation,
  type RealtimeTransaction,
  type RecordMap,
  type RecordPointer,
  type VersionConflict,
  type VersionedRecord,
  type WriteResponse,
} from './realtime';

// ============================================================================
// Usage Metering
// ============================================================================

export {
  aggregateSnapshots,
  aggregateValues,
  isOverQuota,
  usageMetricSchema,
  usageMetricSummarySchema,
  usageSnapshotSchema,
  usageSummaryResponseSchema,
  type AggregationType,
  type UsageMetric,
  type UsageMetricSummary,
  type UsageSnapshot,
  type UsageSummaryResponse,
} from './usage-metering';

// ============================================================================
// Webhooks
// ============================================================================

export {
  calculateRetryDelay,
  createWebhookDeliverySchema,
  createWebhookSchema,
  isDeliveryTerminal,
  matchesEventFilter,
  rotateSecretResponseSchema,
  shouldRetryDelivery,
  updateWebhookDeliverySchema,
  updateWebhookSchema,
  webhookDeleteResponseSchema,
  webhookDeliveryItemSchema,
  webhookDeliverySchema,
  webhookItemSchema,
  webhookListResponseSchema,
  webhookMutationResponseSchema,
  webhookResponseSchema,
  webhookSchema,
  webhookWithDeliveriesSchema,
  type CreateWebhook,
  type CreateWebhookDelivery,
  type RotateSecretResponse,
  type UpdateWebhook,
  type UpdateWebhookDelivery,
  type Webhook,
  type WebhookDeleteResponse,
  type WebhookDelivery,
  type WebhookDeliveryItem,
  type WebhookDeliveryStatus,
  type WebhookItem,
  type WebhookListResponse,
  type WebhookMutationResponse,
  type WebhookResponse,
  type WebhookEventType,
  type WebhookWithDeliveries,
} from './webhooks';

// ============================================================================
// Context
// ============================================================================

export type {
  AuthenticatedUser,
  BaseContext,
  HasBilling,
  HasCache,
  HasEmail,
  HasNotifications,
  HasPubSub,
  HasQueue,
  HasStorage,
  ReplyContext,
  RequestContext,
  RequestInfo,
} from './context';

// ============================================================================
// DI
// ============================================================================

export type { ModuleDeps, ModuleRegistrationOptions } from './di';

// ============================================================================
// Native
// ============================================================================

export type { NativeBridge } from './native';

// ============================================================================
// Ports
// ============================================================================

export type {
  Attachment,
  AuditEntry,
  AuditQuery,
  AuditResponse,
  AuditService,
  BaseStorageConfig,
  BreadcrumbData,
  CacheService,
  ConfigService,
  DeletionService,
  EmailOptions,
  EmailService,
  ErrorTracker,
  HasErrorTracker,
  HealthCheckResult,
  InfrastructureService,
  QueueJob,
  QueueJobHandler,
  JobOptions,
  JobQueueService,
  LocalStorageConfig,
  MetricsService,
  NotificationService,
  ReadableStreamLike,
  RecordAuditRequest,
  S3StorageConfig,
  SendResult,
  ServerLogger,
  StorageBackend,
  StorageClient,
  StorageConfig,
  StorageService,
} from './ports';
// Note: Logger from ports is re-exported via ./logger to avoid duplicate export.
