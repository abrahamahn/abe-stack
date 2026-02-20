// main/server/system/src/index.ts
/**
 * @bslt/server-system
 *
 * Server Engine — Consolidated infrastructure adapters and singletons.
 * Provides cache, config, logger, mailer, queue, search, security, and storage.
 *
 * @module @bslt/server-system
 */

// ============================================================================
// Bootstrap (System Context Assembly)
// ============================================================================

export { bootstrapSystem, type SystemContext } from './bootstrap';

// ============================================================================
// Errors
// ============================================================================

// registerErrorHandler moved to apps/server/src/http/error-handler.ts
export { replyError, replyOk, sendResult } from './errors';

// ============================================================================
// Logger
// ============================================================================

// registerLoggingMiddleware and createJobLogger (Fastify-specific) moved to apps/server/src/middleware/logging.ts
export {
  createBaseLogger,
  createBaseRequestLogger,
  createConsoleLogger,
  createLogRequestContext,
  createLogger,
  createRequestLogger,
  getOrCreateCorrelationId,
  type BaseLogger,
  type BaseLoggerType,
  type ConsoleLogLevel,
  type ConsoleLoggerConfig,
  type LogData,
  type LogLevel,
  type LogRequestContext,
  type Logger,
  type LoggerConfig,
} from './logger';

// ============================================================================
// Mailer
// ============================================================================

export {
  MailerClient,
  emailTemplates,
  type AuthEmailTemplates,
  type EmailOptions,
  type EmailResult,
  type EmailService,
} from './email';

// ============================================================================
// Cache
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
  // Configuration
  DEFAULT_CACHE_CONFIG,
  // Core LRU
  LRUCache,
  // Providers
  MemoryCacheProvider,
  // Factory
  createCache,
  createCacheFromEnv,
  createMemoryCache,
  isCacheConnectionError,
  isCacheError,
  isCacheTimeoutError,
  loadCacheConfig,
  toCacheError,
  // Types
  type BaseCacheConfig,
  type CacheConfig,
  type CacheDeleteOptions,
  type CacheEntry,
  type CacheEntryMetadata,
  type CacheEvictionReason,
  type CacheGetOptions,
  type CacheLogger,
  type CacheOperationResult,
  type CacheProvider,
  type CacheSetOptions,
  type CacheStats,
  type CreateCacheOptions,
  type EvictionCallback,
  type EvictionReason,
  type LRUCacheOptions,
  type MemoizeOptions,
  type MemoizeStats,
  type MemoizedFunction,
  type MemoryCacheConfig,
} from './cache';

// ============================================================================
// Config
// ============================================================================

export {
  // Environment Schema
  AuthEnvSchema,
  BillingEnvSchema,
  CacheEnvSchema,
  DatabaseEnvSchema,
  EmailEnvSchema,
  EnvSchema,
  NotificationEnvSchema,
  PackageManagerEnvSchema,
  QueueEnvSchema,
  SearchEnvSchema,
  ServerEnvSchema,
  StorageEnvSchema,
  // Parsers
  getBool,
  getInt,
  getList,
  getRequired,
  // Environment Loading
  initEnv,
  loadServerEnv,
  validateEnvironment,
  type FullEnv,
} from './config';

// ============================================================================
// Security
// ============================================================================

export {
  // IP Blocklist / Reputation
  IpBlocklist,
  JwtError,
  // Rate Limiting
  MemoryStore,
  // Permissions
  PERMISSION_TYPES,
  PermissionChecker,
  RateLimitPresets,
  RateLimiter,
  // Token (CSRF)
  TOKEN_LENGTH,
  // Upload Scanning
  UploadScanner,
  allowed,
  // Crypto (JWT)
  checkTokenSecret,
  createAdminRule,
  createCustomRule,
  createDefaultPermissionConfig,
  createIpBlocklist,
  createIpBlocklistMiddleware,
  createJwtRotationHandler,
  createMemberRule,
  createOwnerRule,
  createPermissionChecker,
  createRateLimiter,
  createUploadScanner,
  decode,
  decryptToken,
  DEFAULT_BLOCKED_EXTENSIONS,
  denied,
  detectMimeFromMagicBytes,
  detectScriptContent,
  encryptToken,
  // Headers
  generateSecurityHeaders,
  generateToken,
  getFileExtension,
  getProductionSecurityDefaults,
  getRecordKey,
  ipv4ToInt,
  isAllowed,
  isDenied,
  isInCidrRange,
  parseCidr,
  parseRecordKey,
  sign,
  signToken,
  signWithRotation,
  validateCsrfToken,
  verify,
  verifyToken as verifyCsrfToken,
  verifyToken,
  verifyWithRotation,
  type BatchRecordLoader,
  type CsrfValidationOptions,
  type CustomRule,
  type IpBlocklistConfig,
  type IpPolicyLevel,
  type IpReputationProvider,
  type IpReputationResult,
  type JwtErrorCode,
  type JwtHeader,
  type JwtPayload,
  type JwtRotationConfig,
  type JwtRotationHandler,
  type MembershipRule,
  type MemoryStoreConfig,
  type MemoryStoreStats,
  type OwnershipRule,
  type PermissionAllowed,
  type PermissionCheck,
  type PermissionCheckerOptions,
  type PermissionConfig,
  type PermissionContext,
  type PermissionDenied,
  type PermissionRecord,
  type PermissionResult,
  type PermissionRule,
  type PermissionRuleBase,
  type PermissionRuleType,
  type PermissionType,
  type RateLimitConfig,
  type RateLimitInfo,
  type RateLimiterStats,
  type RecordLoader,
  type RecordPointer,
  type RoleRule,
  type RotatingJwtOptions,
  type ScannableFile,
  type ScannerPlugin,
  type ScanResult,
  type SecurityHeaderOptions,
  type SecurityHeaders,
  type SignOptions,
  type TablePermissionConfig,
  type UploadScannerConfig,
  type VerifyOptions,
} from './security';

// ============================================================================
// Storage
// ============================================================================

// registerFileServer and FilesConfig moved to apps/server/src/http/file-server.ts
export {
  // Providers
  LocalStorageProvider,
  S3StorageProvider,
  // Errors
  StorageError,
  StorageNotFoundError,
  StorageUploadError,
  createFileSignature,
  // URL Signing
  createSignedUrl,
  // Factory
  createStorage,
  createStorageSignature,
  getDefaultExpiration,
  isStorageError,
  isStorageNotFoundError,
  isUrlExpired,
  // Configuration
  loadStorageConfig,
  normalizeFilename,
  normalizeStorageFilename,
  normalizeStorageKey,
  parseSignedUrl,
  toStorageError,
  validateStorage,
  verifyFileSignature,
  verifyStorageSignature,
  type FileSignatureData,
  // Types
  type LocalStorageConfig,
  type S3StorageConfig,
  type SignedUrlData,
  type StorageConfig,
  type StorageProvider,
  type StorageProviderName,
  type UploadParams,
} from './storage';

// ============================================================================
// Queue
// ============================================================================

export {
  MemoryQueueStore,
  // Postgres Queue Store (canonical here)
  PostgresQueueStore,
  QueueServer,
  // Redis Store
  RedisQueueStore,
  WriteService,
  // Memory Store
  createMemoryQueueStore,
  // Postgres Queue Store Factory
  createPostgresQueueStore,
  // Queue Server
  createQueueServer,
  // Redis Queue Store
  createRedisQueueStore,
  // Write Service
  createWriteService,
  // Write Types
  type AfterWriteHook,
  type BeforeValidateHook,
  // Queue Types
  type JobDetails,
  type JobListOptions,
  type JobListResult,
  type JobStatus,
  type OperationResult,
  type OperationType,
  type QueueConfig,
  type QueueLogger,
  type QueueServerOptions,
  type QueueStats,
  type QueueStore,
  type RedisQueueStoreOptions,
  type Task,
  type TaskError,
  type TaskHandler,
  type TaskHandlers,
  type TaskResult,
  type WriteBatch,
  type WriteContext,
  type WriteError,
  type WriteHooks,
  type WriteOperation,
  type WriteResult,
  type WriteServiceOptions,
} from './queue';

// ============================================================================
// Session
// ============================================================================

export {
  RedisSessionStore,
  createRedisSessionStore,
  type RedisSessionStoreOptions,
  type SessionData,
  type SessionLogger,
  type SessionStore,
} from './session';

// ============================================================================
// PubSub (canonical here)
// ============================================================================

export {
  PostgresPubSub,
  createPostgresPubSub,
  type PostgresPubSubOptions,
  type PubSubMessage,
} from './pubsub';

// ============================================================================
// Search
// ============================================================================

// SearchProviderFactory, SqlSearchProvider canonical in @bslt/server-system
export {
  SearchProviderFactory,
  SearchQueryBuilder,
  SqlSearchProvider,
  // Query Builder
  createSearchQuery,
  // SQL Provider
  createSqlSearchProvider,
  fromSearchQuery,
  // Factory
  getSearchProviderFactory,
  resetSearchProviderFactory,
  // Types
  type ElasticsearchProviderConfig,
  type SearchContext,
  type SearchProviderConfig,
  type SearchProviderFactoryOptions,
  type SearchProviderType,
  type ServerSearchProvider,
  type SqlColumnMapping,
  type SqlQueryOptions,
  type SqlSearchProviderConfig,
  type SqlTableConfig,
} from './search';

// ============================================================================
// System Health
// ============================================================================

export {
  MetricsCollector,
  checkCacheStatus,
  checkDbStatus,
  checkEmailStatus,
  checkPubSubStatus,
  checkQueueStatus,
  checkRateLimitStatus,
  checkSchemaStatus,
  checkStorageStatus,
  checkWebSocketStatus,
  getDetailedHealth,
  getMetricsCollector,
  logStartupSummary,
  resetMetricsCollector,
  type DetailedHealthOptions,
  type HealthContext,
  type MetricsSummary,
  type SchemaValidatorFn,
} from './system';

// ============================================================================
// SMS
// ============================================================================

export {
  ConsoleSmsProvider,
  TwilioSmsProvider,
  createSmsProvider,
  type SmsConfig,
  type SmsOptions,
  type SmsProvider,
  type SmsResult,
  type TwilioConfig,
} from './sms';

// ============================================================================
// Geo-IP
// ============================================================================

export {
  IpApiGeoIpProvider,
  NoopGeoIpProvider,
  createGeoIpProvider,
  type GeoIpConfig,
  type GeoIpProvider,
  type GeoIpResult,
} from './geo-ip';

// ============================================================================
// Routing
// ============================================================================

export {
  API_VERSIONS,
  CURRENT_API_VERSION,
  SUPPORTED_API_VERSIONS,
  apiVersioningPlugin,
  clearRegistry,
  createRouteMap,
  extractApiVersion,
  getRegisteredRoutes,
  protectedRoute,
  publicRoute,
  registerRoute,
  registerRouteMap,
  type ApiVersion,
  type ApiVersionInfo,
  type ApiVersionSource,
  type AuthGuardFactory,
  type HandlerContext,
  type HttpMethod,
  type HttpReply,
  type HttpRequest,
  type JsonSchemaObject,
  type RouteDefinition,
  type RouteHandler,
  type RouteMap,
  type RouteOpenApiMeta,
  type RouteRegistryEntry,
  type RouteResult,
  type RouteSchema,
  type RouterOptions,
  type ValidationSchema,
} from './routing';

// ============================================================================
// Middleware
// ============================================================================

export {
  addTiming,
  createEnrichedContext,
  requestContextPlugin,
  severityFromStatus,
  type EnrichedRequestContext,
  type RequestSeverity,
  type TimingEntry,
} from './middleware';

// ============================================================================
// Observability
// ============================================================================

export {
  ConsoleErrorTrackingProvider,
  NoopErrorTrackingProvider,
  addBreadcrumb,
  captureError,
  createErrorTracker,
  initSentry,
  setUserContext,
  type Breadcrumb,
  type BreadcrumbLevel,
  type ErrorContext,
  type ErrorTrackingConfig,
  type ErrorTrackingProvider,
} from './observability';

// ============================================================================
// Scaling
// ============================================================================

export {
  getInstanceId,
  getInstanceMetadata,
  registerGracefulShutdown,
  type CloseableResource,
  type GracefulShutdownOptions,
  type InstanceMetadata,
  type ShutdownHandle,
  type ShutdownLogger,
  type ShutdownMetrics,
} from './scaling';

// ============================================================================
// Utils
// ============================================================================

export {
  isPortFree,
  isPortListening,
  isSafePath,
  pickAvailablePort,
  uniquePorts,
  waitForPort,
} from './utils';
