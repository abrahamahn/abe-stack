// apps/server/src/infrastructure/index.ts
/**
 * Infrastructure Layer
 *
 * Technical capabilities organized by concern:
 * - database: Database client, schema, transactions
 * - storage: File storage providers (local, S3)
 * - email: Email sending services
 * - pubsub: Real-time subscription management (with Postgres NOTIFY/LISTEN)
 * - queue: Background job processing (Chet-stack pattern)
 * - rbac: Role/attribute-based access control (custom Ability system)
 * - security: Login tracking, lockout, audit logging
 * - http: Security headers, CORS middleware
 * - rate-limit: Token Bucket rate limiter
 * - crypto: Native JWT implementation (HS256)
 * - permissions: Row-level permissions for realtime features
 */

// Database
export {
  // Client
  buildConnectionString,
  createDbClient,
  resolveConnectionStringWithFallback,
  type DbClient,
  // Table constants
  USERS_TABLE,
  USER_COLUMNS,
  REFRESH_TOKENS_TABLE,
  REFRESH_TOKEN_COLUMNS,
  REFRESH_TOKEN_FAMILIES_TABLE,
  REFRESH_TOKEN_FAMILY_COLUMNS,
  LOGIN_ATTEMPTS_TABLE,
  LOGIN_ATTEMPT_COLUMNS,
  PASSWORD_RESET_TOKENS_TABLE,
  PASSWORD_RESET_TOKEN_COLUMNS,
  EMAIL_VERIFICATION_TOKENS_TABLE,
  EMAIL_VERIFICATION_TOKEN_COLUMNS,
  SECURITY_EVENTS_TABLE,
  SECURITY_EVENT_COLUMNS,
  MAGIC_LINK_TOKENS_TABLE,
  MAGIC_LINK_TOKEN_COLUMNS,
  OAUTH_CONNECTIONS_TABLE,
  OAUTH_CONNECTION_COLUMNS,
  PUSH_SUBSCRIPTIONS_TABLE,
  PUSH_SUBSCRIPTION_COLUMNS,
  NOTIFICATION_PREFERENCES_TABLE,
  NOTIFICATION_PREFERENCE_COLUMNS,
  OAUTH_PROVIDERS,
  // Schema validation
  REQUIRED_TABLES,
  requireValidSchema,
  validateSchema,
  getExistingTables,
  SchemaValidationError,
  type RequiredTable,
  type SchemaValidationResult,
  // Optimistic locking
  OptimisticLockError,
  updateUserWithVersion,
  isOptimisticLockError,
  // Transaction
  withTransaction,
  isInTransaction,
  // Types
  type User,
  type NewUser,
  type UpdateUser,
  type UserRole,
  type RefreshToken,
  type NewRefreshToken,
  type RefreshTokenFamily,
  type NewRefreshTokenFamily,
  type LoginAttempt,
  type NewLoginAttempt,
  type PasswordResetToken,
  type NewPasswordResetToken,
  type EmailVerificationToken,
  type NewEmailVerificationToken,
  type SecurityEvent,
  type NewSecurityEvent,
  type MagicLinkToken,
  type NewMagicLinkToken,
  type OAuthConnection,
  type NewOAuthConnection,
  type UpdateOAuthConnection,
  type OAuthProvider,
  type PushSubscription as DbPushSubscription,
  type NewPushSubscription,
  type NotificationPreference as DbNotificationPreference,
  type NewNotificationPreference,
  type NotificationChannel as DbNotificationChannel,
  type NotificationType as DbNotificationType,
  type TypePreferences,
  type QuietHoursConfig,
  // Repository layer (raw SQL query builder)
  createRepositories,
  getRepositoryContext,
  closeRepositories,
  type Repositories,
  type RepositoryContext,
} from './data/database';

// Storage
export {
  createStorage,
  LocalStorageProvider,
  normalizeStorageKey,
  S3StorageProvider,
  type LocalStorageConfig,
  type S3StorageConfig,
  type StorageConfig,
  type StorageProvider,
  type StorageProviderName,
  type UploadParams,
} from './data/storage';

// Email
export {
  ConsoleEmailService,
  createEmailService,
  emailTemplates,
  SmtpEmailService,
} from './messaging/email';
export type { EmailOptions, EmailResult, EmailService } from './messaging/email';

// PubSub
export {
  createPostgresPubSub,
  PostgresPubSub,
  publishAfterWrite,
  SubKeys,
  SubscriptionManager,
} from './messaging/pubsub';
export type {
  ListKey,
  PostgresPubSubOptions,
  PubSubMessage,
  RecordKey,
  SubscriptionKey,
  SubscriptionManagerOptions,
} from './messaging/pubsub';

// Login Security (from auth module)
export {
  applyProgressiveDelay,
  clearLoginAttempts,
  getAccountLockoutStatus,
  getProgressiveDelay,
  isAccountLocked,
  logLoginAttempt,
  unlockAccount,
  type LockoutConfig,
  type LockoutStatus,
} from '../modules/auth/security';

// Security Events (from auth module)
export {
  getSecurityEventMetrics,
  getUserSecurityEvents,
  logAccountLockedEvent,
  logAccountUnlockedEvent,
  logSecurityEvent,
  logTokenFamilyRevokedEvent,
  logTokenReuseEvent,
  type LogSecurityEventParams,
  type SecurityEventMetadata,
  type SecurityEventSeverity,
  type SecurityEventType,
} from '../modules/auth/security/events';

// HTTP (Security headers, CORS)
export { applyCors, applySecurityHeaders, handlePreflight, type CorsOptions } from './http';

// Proxy Validation (IP address validation with CIDR support)
export {
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
} from './http/middleware';

// WebSocket
export { getWebSocketStats, registerWebSocket, type WebSocketStats } from './messaging/websocket';

// Rate Limiting
export {
  createRateLimiter,
  MemoryStore,
  RateLimiter,
  RateLimitPresets,
  type MemoryStoreStats,
  type RateLimitConfig,
  type RateLimiterStats,
  type RateLimitInfo,
} from './security/rate-limit';

// Crypto (Native JWT)
export {
  jwtDecode,
  JwtError,
  jwtSign,
  jwtVerify,
  type JwtErrorCode,
  type JwtHeader,
  type JwtPayload,
  type JwtSignOptions,
  // JWT Rotation Support
  checkTokenSecret,
  createJwtRotationHandler,
  signWithRotation,
  verifyWithRotation,
  type JwtRotationConfig,
  type RotatingJwtOptions,
} from './security/crypto';

// Health Checks
export {
  checkDatabase,
  checkEmail,
  checkPubSub,
  checkRateLimit,
  checkStorage,
  checkWebSocket,
  getDetailedHealth,
  logStartupSummary,
  type DetailedHealthResponse,
  type LiveResponse,
  type OverallStatus,
  type ReadyResponse,
  type RoutesResponse,
  type ServiceHealth,
  type ServiceStatus,
  type StartupSummaryOptions,
} from './monitor/health';

// Logger
export {
  createJobCorrelationId,
  createJobLogger,
  createLogger,
  createRequestContext,
  createRequestLogger,
  generateCorrelationId,
  getOrCreateCorrelationId,
  LOG_LEVELS,
  registerLoggingMiddleware,
  shouldLog,
  type LogData,
  type Logger,
  type LoggerConfig,
  type LogLevel,
  type RequestContext,
} from './monitor/logger';

// Queue (Background Jobs)
export {
  createMemoryQueueStore,
  createPostgresQueueStore,
  createQueueServer,
  MemoryQueueStore,
  PostgresQueueStore,
  QueueServer,
  type JobDetails,
  type JobListOptions,
  type JobListResult,
  type JobStatus,
  type QueueConfig,
  type QueueServerOptions,
  type QueueStats,
  type QueueStore,
  type Task,
  type TaskError,
  type TaskHandler,
  type TaskHandlers,
  type TaskResult,
} from './jobs/queue';

// Write (Unified Write Pattern)
export {
  createWriteService,
  WriteService,
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
  type WriteServiceOptions,
} from './jobs/write';

// Scheduled Jobs (Cleanup, Maintenance)
export {
  // Login Cleanup
  cleanupOldLoginAttempts,
  countOldLoginAttempts,
  getLoginAttemptStats,
  getTotalLoginAttemptCount,
  DEFAULT_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  MAX_BATCH_SIZE,
  type CleanupOptions,
  type CleanupResult,
  // Push Subscription Cleanup
  cleanupPushSubscriptions,
  countPushCleanupCandidates,
  getPushSubscriptionStats,
  DEFAULT_INACTIVE_DAYS,
  PUSH_MAX_BATCH_SIZE,
  type PushCleanupOptions,
  type PushCleanupResult,
} from './jobs/scheduled';

// Router (Generic Route Registration)
export {
  protectedRoute,
  publicRoute,
  registerRouteMap,
  type HttpMethod,
  type ProtectedHandler,
  type PublicHandler,
  type RouteDefinition,
  type RouteHandler,
  type RouteMap,
  type RouteResult,
  type RouterOptions,
  type ValidationSchema,
} from './http/router';

// Pagination
export {
  createPaginationHelpers,
  createPaginationMiddleware,
  type PaginationContext,
  type PaginationHelpers,
  type PaginationMiddlewareOptions,
  type PaginationRequest,
} from './http/pagination';

// Permissions (Row-level access control)
export {
  // Types and helpers
  allowed,
  denied,
  getRecordKey,
  isAllowed,
  isDenied,
  parseRecordKey,
  PERMISSION_TYPES,
  // Checker
  createAdminRule,
  createCustomRule,
  createDefaultPermissionConfig,
  createMemberRule,
  createOwnerRule,
  createPermissionChecker,
  PermissionChecker,
  // Middleware
  createPermissionMiddleware,
  createStandalonePermissionGuard,
  getPermissionDenialReason,
  getRecordIdFromParams,
  hasPermission,
  // Types
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
  type PermissionGuardOptions,
  type PermissionMiddlewareOptions,
  type PermissionRecord,
  type PreHandlerHook,
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

// Media (Processing)
export { createServerMediaQueue, ServerMediaQueue, type MediaJobData } from './media';

// Notifications (Push)
export {
  createFcmProvider,
  createNotificationService,
  createNotificationServiceFromEnv,
  FcmProvider,
  getNotificationService,
  resetNotificationService,
  type FcmConfig,
  type NotificationFactoryOptions,
  type NotificationService,
  type ProviderConfig,
  type PushNotificationProvider,
  type SendOptions,
  type SubscriptionWithId,
} from './notifications';

// Cache
export {
  createCache,
  createCacheFromEnv,
  createMemoryCache,
  MemoryCacheProvider,
  memoize,
  memoizeMethod,
  type BaseCacheConfig,
  type CacheDeleteOptions,
  type CacheEntry,
  type CacheEntryMetadata,
  type CacheGetOptions,
  type CacheLogger,
  type CacheOperationResult,
  type CacheProvider,
  type CacheSetOptions,
  type CacheStats,
  type CreateCacheOptions,
  type EvictionReason,
  type LRUNode,
  type MemoizedFunction,
  type MemoizeOptions,
  type MemoizeStats,
  type MemoryCacheConfig,
} from './cache';
