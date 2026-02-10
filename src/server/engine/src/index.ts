// src/server/engine/src/index.ts
/**
 * @abe-stack/server-engine
 *
 * Server Engine — Consolidated infrastructure adapters and singletons.
 * Provides cache, config, logger, mailer, queue, search, security, and storage.
 *
 * @module @abe-stack/server-engine
 */

// ============================================================================
// Logger
// ============================================================================

export {
  CONSOLE_LOG_LEVELS,
  createConsoleLogger,
  type ConsoleLogLevel,
  type ConsoleLoggerConfig,
} from './logger';

// ============================================================================
// Mailer
// ============================================================================

export { MailerClient } from './mailer/client';
export { emailTemplates } from './mailer/templates';
export type { EmailOptions, EmailResult, EmailService } from './mailer/types';

// ============================================================================
// Cache
// ============================================================================

export {
  // Core LRU
  LRUCache,
  type EvictionCallback,
  type EvictionReason,
  type LRUCacheOptions,
  // Providers
  MemoryCacheProvider,
  // Factory
  createCache,
  createCacheFromEnv,
  createMemoryCache,
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
  // Configuration
  DEFAULT_CACHE_CONFIG,
  loadCacheConfig,
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
  type MemoizedFunction,
  type MemoizeOptions,
  type MemoizeStats,
  type MemoryCacheConfig,
} from './cache';

// ============================================================================
// Config
// ============================================================================

export {
  // Environment Loading
  initEnv,
  loadServerEnv,
  validateEnvironment,
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
  type FullEnv,
  // Parsers
  getBool,
  getInt,
  getList,
  getRequired,
} from './config';

// ============================================================================
// Security — Crypto (JWT)
// ============================================================================

export {
  JwtError,
  checkTokenSecret,
  createJwtRotationHandler,
  decode,
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
  type VerifyOptions,
} from './security/crypto';

// ============================================================================
// Security — Token (CSRF)
// ============================================================================

export {
  TOKEN_LENGTH,
  decryptToken,
  encryptToken,
  generateToken,
  signToken,
  validateCsrfToken,
  verifyToken,
  type CsrfValidationOptions,
} from './security/token';

// ============================================================================
// Security — Permissions
// ============================================================================

export {
  PERMISSION_TYPES,
  PermissionChecker,
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
  type TablePermissionConfig,
} from './security/permissions';

// ============================================================================
// Security — Rate Limiting
// ============================================================================

export {
  MemoryStore,
  RateLimitPresets,
  RateLimiter,
  createRateLimiter,
  type MemoryStoreConfig,
  type MemoryStoreStats,
  type RateLimitConfig,
  type RateLimitInfo,
  type RateLimiterStats,
} from './security/rate-limit';

// ============================================================================
// Storage
// ============================================================================

export {
  // Configuration
  loadStorageConfig,
  validateStorage,
  // Factory
  createStorage,
  // Providers
  LocalStorageProvider,
  S3StorageProvider,
  // URL Signing
  createSignedUrl,
  getDefaultExpiration,
  isUrlExpired,
  normalizeStorageKey,
  parseSignedUrl,
  normalizeStorageFilename,
  createStorageSignature,
  verifyStorageSignature,
  type SignedUrlData,
  // HTTP Server
  registerFileServer,
  normalizeFilename,
  createFileSignature,
  verifyFileSignature,
  type FilesConfig,
  type FileSignatureData,
  // Types
  type LocalStorageConfig,
  type S3StorageConfig,
  type StorageConfig,
  type StorageProvider,
  type StorageProviderName,
  type UploadParams,
} from './storage';

// ============================================================================
// Queue
// ============================================================================

export {
  // Queue Server
  createQueueServer,
  QueueServer,
  type QueueServerOptions,
  // Write Service
  createWriteService,
  WriteService,
  type WriteServiceOptions,
  // Memory Store
  createMemoryQueueStore,
  MemoryQueueStore,
  // Queue Types
  type JobDetails,
  type JobListOptions,
  type JobListResult,
  type JobStatus,
  type QueueConfig,
  type QueueStats,
  type QueueStore,
  type Task,
  type TaskError,
  type TaskHandler,
  type TaskHandlers,
  type TaskResult,
  // Write Types
  type AfterWriteHook,
  type BeforeValidateHook,
  type OperationResult,
  type OperationType,
  type WriteBatch,
  type WriteContext,
  type WriteError,
  type WriteHooks,
  type WriteOperation,
  type WriteResult,
} from './queue';

// ============================================================================
// Search
// ============================================================================

export {
  // SQL Provider
  createSqlSearchProvider,
  SqlSearchProvider,
  // Query Builder
  createSearchQuery,
  fromSearchQuery,
  SearchQueryBuilder,
  // Factory
  getSearchProviderFactory,
  resetSearchProviderFactory,
  SearchProviderFactory,
  type ProviderOptions,
  type SqlSearchProviderOptions,
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
  checkDbStatus,
  checkEmailStatus,
  checkPubSubStatus,
  checkRateLimitStatus,
  checkSchemaStatus,
  checkStorageStatus,
  checkWebSocketStatus,
  getDetailedHealth,
  logStartupSummary,
  type SystemContext,
} from './system';

// ============================================================================
// SMS (Stub — provider not yet selected)
// ============================================================================

export {
  ConsoleSmsProvider,
  createSmsProvider,
  type SmsConfig,
  type SmsOptions,
  type SmsProvider,
  type SmsResult,
} from './sms';

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
  type RouteSchema,
  type RouterOptions,
  type ValidationSchema,
} from './routing';
