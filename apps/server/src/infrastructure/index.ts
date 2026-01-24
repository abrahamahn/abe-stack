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
 * - search: Elasticsearch/SQL search providers
 * - billing: Stripe/PayPal payment providers
 * - media: Video/Image processing queue
 */

// Database
export {
  EMAIL_VERIFICATION_TOKENS_TABLE,
  EMAIL_VERIFICATION_TOKEN_COLUMNS,
  LOGIN_ATTEMPTS_TABLE,
  LOGIN_ATTEMPT_COLUMNS,
  MAGIC_LINK_TOKENS_TABLE,
  MAGIC_LINK_TOKEN_COLUMNS,
  NOTIFICATION_PREFERENCES_TABLE,
  NOTIFICATION_PREFERENCE_COLUMNS,
  OAUTH_CONNECTIONS_TABLE,
  OAUTH_CONNECTION_COLUMNS,
  OAUTH_PROVIDERS,
  // Optimistic locking
  OptimisticLockError,
  PASSWORD_RESET_TOKENS_TABLE,
  PASSWORD_RESET_TOKEN_COLUMNS,
  PUSH_SUBSCRIPTIONS_TABLE,
  PUSH_SUBSCRIPTION_COLUMNS,
  REFRESH_TOKENS_TABLE,
  REFRESH_TOKEN_COLUMNS,
  REFRESH_TOKEN_FAMILIES_TABLE,
  REFRESH_TOKEN_FAMILY_COLUMNS,
  // Schema validation
  REQUIRED_TABLES,
  SECURITY_EVENTS_TABLE,
  SECURITY_EVENT_COLUMNS,
  SchemaValidationError,
  // Table constants
  USERS_TABLE,
  USER_COLUMNS,
  // Client
  buildConnectionString,
  closeRepositories,
  createDbClient,
  // Repository layer (raw SQL query builder)
  createRepositories,
  getExistingTables,
  getRepositoryContext,
  isInTransaction,
  isOptimisticLockError,
  requireValidSchema,
  resolveConnectionStringWithFallback,
  updateUserWithVersion,
  validateSchema,
  // Transaction
  withTransaction,
  type DbClient,
  type NotificationChannel as DbNotificationChannel,
  type NotificationPreference as DbNotificationPreference,
  type NotificationType as DbNotificationType,
  type PushSubscription as DbPushSubscription,
  type EmailVerificationToken,
  type LoginAttempt,
  type MagicLinkToken,
  type NewEmailVerificationToken,
  type NewLoginAttempt,
  type NewMagicLinkToken,
  type NewNotificationPreference,
  type NewOAuthConnection,
  type NewPasswordResetToken,
  type NewPushSubscription,
  type NewRefreshToken,
  type NewRefreshTokenFamily,
  type NewSecurityEvent,
  type NewUser,
  type OAuthConnection,
  type OAuthProvider,
  type PasswordResetToken,
  type QuietHoursConfig,
  type RefreshToken,
  type RefreshTokenFamily,
  type Repositories,
  type RepositoryContext,
  type RequiredTable,
  type SchemaValidationResult,
  type SecurityEvent,
  type TypePreferences,
  type UpdateOAuthConnection,
  type UpdateUser,
  // Types
  type User,
  type UserRole,
} from './data/database';

// Storage
export {
  LocalStorageProvider,
  S3StorageProvider,
  createStorage,
  normalizeStorageKey,
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
  SmtpEmailService,
  createEmailService,
  emailTemplates,
} from './messaging/email';
export type { EmailOptions, EmailResult, EmailService } from './messaging/email';

// PubSub
export {
  PostgresPubSub,
  SubKeys,
  SubscriptionManager,
  createPostgresPubSub,
  publishAfterWrite,
  type ListKey,
  type PostgresPubSubOptions,
  type PubSubMessage,
  type RecordKey,
  type SubscriptionKey,
  type SubscriptionManagerOptions,
} from '@abe-stack/core/pubsub';

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

// Billing
export { createBillingProvider, isBillingConfigured } from './billing';
export type {
  BillingConfig,
  BillingService,
  CheckoutParams,
  CheckoutResult,
  ProviderInvoice,
  ProviderPaymentMethod,
  ProviderSubscription,
} from './billing';

// Search
export { SearchProviderFactory, getSearchProviderFactory } from './search';
export type { SearchProviderType, SearchResultWithMetrics, ServerSearchProvider } from './search';

// Write Service
export { WriteService, createWriteService } from './jobs/write';
export type { OperationResult, WriteBatch, WriteOperation, WriteResult } from './jobs/write';

// Rate Limiting
export {
  MemoryStore,
  RateLimitPresets,
  RateLimiter,
  createRateLimiter,
  type MemoryStoreStats,
  type RateLimitConfig,
  type RateLimitInfo,
  type RateLimiterStats,
} from './security/rate-limit';

// Crypto (Native JWT)
export {
  JwtError,
  // JWT Rotation Support
  checkTokenSecret,
  createJwtRotationHandler,
  jwtDecode,
  jwtSign,
  jwtVerify,
  signWithRotation,
  verifyWithRotation,
  type JwtErrorCode,
  type JwtHeader,
  type JwtPayload,
  type JwtRotationConfig,
  type JwtSignOptions,
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
  LOG_LEVELS,
  createJobCorrelationId,
  createJobLogger,
  createLogger,
  createRequestContext,
  createRequestLogger,
  generateCorrelationId,
  getOrCreateCorrelationId,
  registerLoggingMiddleware,
  shouldLog,
  type LogData,
  type LogLevel,
  type Logger,
  type LoggerConfig,
  type RequestContext,
} from './monitor/logger';

// Queue (Background Jobs)
export {
  MemoryQueueStore,
  PostgresQueueStore,
  QueueServer,
  createMemoryQueueStore,
  createPostgresQueueStore,
  createQueueServer,
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

// Scheduled Jobs (Cleanup, Maintenance)
export {
  DEFAULT_INACTIVE_DAYS,
  DEFAULT_RETENTION_DAYS,
  MAX_BATCH_SIZE,
  MIN_RETENTION_DAYS,
  PUSH_MAX_BATCH_SIZE,
  // Login Cleanup
  cleanupOldLoginAttempts,
  // Push Subscription Cleanup
  cleanupPushSubscriptions,
  countOldLoginAttempts,
  countPushCleanupCandidates,
  getLoginAttemptStats,
  getPushSubscriptionStats,
  getTotalLoginAttemptCount,
  type CleanupOptions,
  type CleanupResult,
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
  PERMISSION_TYPES,
  PermissionChecker,
  // Types and helpers
  allowed,
  // Checker
  createAdminRule,
  createCustomRule,
  createDefaultPermissionConfig,
  createMemberRule,
  createOwnerRule,
  createPermissionChecker,
  // Middleware
  createPermissionMiddleware,
  createStandalonePermissionGuard,
  denied,
  getPermissionDenialReason,
  getRecordIdFromParams,
  getRecordKey,
  hasPermission,
  isAllowed,
  isDenied,
  parseRecordKey,
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
  type PermissionResult,
  type PermissionRule,
  type PermissionRuleBase,
  type PermissionRuleType,
  type PermissionType,
  type PreHandlerHook,
  type RecordLoader,
  type RecordPointer,
  type RoleRule,
  type TablePermissionConfig,
} from './security/permissions';

// Media (Processing)
export { ServerMediaQueue, createServerMediaQueue, type MediaJobData } from './media';

// Notifications (Push)
export {
  FcmProvider,
  createFcmProvider,
  createNotificationService,
  createNotificationServiceFromEnv,
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
  MemoryCacheProvider,
  createCache,
  createCacheFromEnv,
  createMemoryCache,
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
  type MemoizeOptions,
  type MemoizeStats,
  type MemoizedFunction,
  type MemoryCacheConfig,
} from './cache';
