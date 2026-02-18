// main/server/engine/src/index.ts
/**
 * @bslt/server-engine
 *
 * Server Engine — Consolidated infrastructure adapters and singletons.
 * Provides cache, config, logger, mailer, queue, search, security, and storage.
 *
 * @module @bslt/server-engine
 */

// ============================================================================
// Logger
// ============================================================================

export {
  CONSOLE_LOG_LEVELS, createBaseLogger,
  createBaseRequestLogger,
  createConsoleLogger,
  createJobCorrelationId,
  createJobLogger,
  createLogger,
  createRequestContext,
  createRequestLogger,
  generateCorrelationId,
  getOrCreateCorrelationId,
  isValidCorrelationId, LOG_LEVELS, registerLoggingMiddleware,
  shouldLog,
  type BaseLogger,
  type BaseLoggerType, type ConsoleLoggerConfig, type ConsoleLogLevel, type LogData, type Logger,
  type LoggerConfig, type LogLevel, type RequestContext
} from './logger';

// ============================================================================
// Mailer
// ============================================================================

export {
  emailTemplates,
  type AuthEmailTemplates,
  type EmailOptions,
  type EmailResult,
  type EmailService
} from './mailer';
export { MailerClient } from './mailer/client';

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
  // Factory
  createCache,
  createCacheFromEnv,
  createMemoryCache,
  // Configuration
  DEFAULT_CACHE_CONFIG,
  isCacheConnectionError,
  isCacheError,
  isCacheTimeoutError,
  loadCacheConfig,
  // Core LRU
  LRUCache,
  // Providers
  MemoryCacheProvider,
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
  type MemoizedFunction,
  type MemoizeOptions,
  type MemoizeStats,
  type MemoryCacheConfig
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
  // Parsers
  getBool,
  getInt,
  getList,
  getRequired,
  // Environment Loading
  initEnv,
  loadServerEnv,
  NotificationEnvSchema,
  PackageManagerEnvSchema,
  QueueEnvSchema,
  SearchEnvSchema,
  ServerEnvSchema,
  StorageEnvSchema,
  validateEnvironment,
  type FullEnv
} from './config';

// ============================================================================
// Security — Crypto (JWT)
// ============================================================================

export {
  checkTokenSecret,
  createJwtRotationHandler,
  decode,
  JwtError,
  sign,
  signWithRotation,
  verify,
  verifyWithRotation,
  type JwtErrorCode,
  type JwtHeader,
  type JwtPayload,
  type JwtRotationConfig,
  type JwtRotationHandler,
  type RotatingJwtOptions,
  type SignOptions,
  type VerifyOptions
} from './security/crypto';

// ============================================================================
// Security — Token (CSRF)
// ============================================================================

export {
  decryptToken,
  encryptToken,
  generateToken,
  signToken,
  TOKEN_LENGTH,
  validateCsrfToken,
  verifyToken as verifyCsrfToken,
  verifyToken,
  type CsrfValidationOptions
} from './security/token';

export {
  generateSecurityHeaders,
  getProductionSecurityDefaults,
  type SecurityHeaderOptions,
  type SecurityHeaders
} from './security/headers';

// ============================================================================
// Security — Permissions
// ============================================================================

export {
  allowed,
  createAdminRule,
  createCustomRule,
  createDefaultPermissionConfig,
  createMemberRule,
  createOwnerRule,
  createPermissionChecker,
  denied,
  getRecordKey,
  isAllowed,
  isDenied,
  parseRecordKey,
  PERMISSION_TYPES,
  PermissionChecker,
  type BatchRecordLoader,
  type CustomRule,
  type MembershipRule,
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
  type RecordLoader,
  type RecordPointer,
  type RoleRule,
  type TablePermissionConfig
} from './security/permissions';

// ============================================================================
// Security — Rate Limiting
// ============================================================================

export {
  createRateLimiter,
  MemoryStore,
  RateLimiter,
  RateLimitPresets,
  type MemoryStoreConfig,
  type MemoryStoreStats,
  type RateLimitConfig,
  type RateLimiterStats,
  type RateLimitInfo
} from './security/rate-limit';

// ============================================================================
// Storage
// ============================================================================

export {
  createFileSignature,
  // URL Signing
  createSignedUrl,
  // Factory
  createStorage,
  createStorageSignature,
  getDefaultExpiration,
  isUrlExpired,
  // Configuration
  loadStorageConfig,
  // Providers
  LocalStorageProvider,
  normalizeFilename,
  normalizeStorageFilename,
  normalizeStorageKey,
  parseSignedUrl,
  // HTTP Server
  registerFileServer,
  S3StorageProvider,
  validateStorage,
  verifyFileSignature,
  verifyStorageSignature,
  type FilesConfig,
  type FileSignatureData,
  // Types
  type LocalStorageConfig,
  type S3StorageConfig,
  type SignedUrlData,
  type StorageConfig,
  type StorageProvider,
  type StorageProviderName,
  type UploadParams
} from './storage';

// ============================================================================
// Queue
// ============================================================================

export {
  // Memory Store
  createMemoryQueueStore,
  // Queue Server
  createQueueServer,
  // Write Service
  createWriteService,
  MemoryQueueStore,
  QueueServer,
  WriteService,
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
  type QueueServerOptions,
  type QueueStats,
  type QueueStore,
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
  type WriteServiceOptions
} from './queue';

// ============================================================================
// Search
// ============================================================================

export {
  // Query Builder
  createSearchQuery,
  // SQL Provider
  createSqlSearchProvider,
  fromSearchQuery,
  // Factory
  getSearchProviderFactory,
  resetSearchProviderFactory,
  SearchProviderFactory,
  SearchQueryBuilder,
  SqlSearchProvider,
  // Types
  type ElasticsearchProviderConfig,
  type ProviderOptions,
  type SearchContext,
  type SearchProviderConfig,
  type SearchProviderFactoryOptions,
  type SearchProviderType,
  type ServerSearchProvider,
  type SqlColumnMapping,
  type SqlQueryOptions,
  type SqlSearchProviderConfig,
  type SqlSearchProviderOptions,
  type SqlTableConfig
} from './search';

// ============================================================================
// System Health
// ============================================================================

export {
  checkDbStatus,
  checkEmailStatus,
  checkPubSubStatus,
  checkRateLimitStatus,
  checkSchemaStatus,
  checkStorageStatus,
  checkWebSocketStatus,
  getDetailedHealth,
  getMetricsCollector,
  logStartupSummary,
  MetricsCollector,
  resetMetricsCollector,
  type MetricsSummary,
  type SystemContext
} from './system';

// ============================================================================
// SMS
// ============================================================================

export {
  ConsoleSmsProvider,
  createSmsProvider,
  TwilioSmsProvider,
  type SmsConfig,
  type SmsOptions,
  type SmsProvider,
  type SmsResult,
  type TwilioConfig
} from './sms';

// ============================================================================
// Geo-IP
// ============================================================================

export {
  createGeoIpProvider,
  IpApiGeoIpProvider,
  NoopGeoIpProvider,
  type GeoIpConfig,
  type GeoIpProvider,
  type GeoIpResult
} from './geo-ip';

// ============================================================================
// Routing (Fastify-specific)
// ============================================================================

export {
  clearRegistry,
  createRouteMap,
  getRegisteredRoutes,
  protectedRoute,
  publicRoute,
  registerRoute,
  registerRouteMap,
  type AuthGuardFactory,
  type HandlerContext,
  type HttpMethod,
  type JsonSchemaObject,
  type RouteDefinition,
  type RouteHandler,
  type RouteMap,
  type RouteOpenApiMeta,
  type RouteRegistryEntry,
  type RouteResult,
  type RouterOptions,
  type RouteSchema,
  type ValidationSchema
} from './routing';

// ============================================================================
// Observability
// ============================================================================

export {
  addBreadcrumb,
  captureError,
  ConsoleErrorTrackingProvider,
  createErrorTracker,
  initSentry,
  NoopErrorTrackingProvider,
  setUserContext,
  type Breadcrumb,
  type BreadcrumbLevel,
  type ErrorContext,
  type ErrorTrackingConfig,
  type ErrorTrackingProvider
} from './observability';

// ============================================================================
// Utils
// ============================================================================

export { isSafePath } from './utils/fs';
export {
  isPortFree,
  isPortListening,
  pickAvailablePort,
  uniquePorts,
  waitForPort
} from './utils/port';
export { swaggerThemeCss } from './utils/swagger';

