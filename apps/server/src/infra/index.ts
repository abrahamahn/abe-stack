// apps/server/src/infra/index.ts
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
  emailVerificationTokens,
  getExistingTables,
  isInTransaction,
  isOptimisticLockError,
  loginAttempts,
  // Optimistic locking
  OptimisticLockError,
  passwordResetTokens,
  // Schema - Auth
  refreshTokenFamilies,
  refreshTokens,
  // Schema validation
  REQUIRED_TABLES,
  requireValidSchema,
  resolveConnectionStringWithFallback,
  SchemaValidationError,
  securityEvents,
  updateUserWithVersion,
  // Schema - Users
  USER_ROLES,
  users,
  validateSchema,
  // Transaction
  withTransaction,
  type DbClient,
  type EmailVerificationToken,
  type LoginAttempt,
  type NewEmailVerificationToken,
  type NewLoginAttempt,
  type NewPasswordResetToken,
  type NewRefreshToken,
  type NewRefreshTokenFamily,
  type NewSecurityEvent,
  type NewUser,
  type PasswordResetToken,
  type RefreshToken,
  type RefreshTokenFamily,
  type RequiredTable,
  type SchemaValidationResult,
  type SecurityEvent,
  type User,
  // Types
  type UserRole,
} from './database';

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
} from './storage';

// Email
export { ConsoleEmailService, createEmailService, emailTemplates, SmtpEmailService } from './email';
export type { EmailOptions, EmailResult, EmailService } from './email';

// PubSub
export {
  createPostgresPubSub,
  PostgresPubSub,
  publishAfterWrite,
  SubKeys,
  SubscriptionManager,
} from './pubsub';
export type {
  ListKey,
  PostgresPubSubOptions,
  PubSubMessage,
  RecordKey,
  SubscriptionKey,
  SubscriptionManagerOptions,
} from './pubsub';

// Security
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
} from './security';

// Security Events
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
} from './security/events';

// HTTP (Security headers, CORS)
export { applyCors, applySecurityHeaders, handlePreflight, type CorsOptions } from './http';

// WebSocket
export { getWebSocketStats, registerWebSocket, type WebSocketStats } from './websocket';

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
} from './rate-limit';

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
} from './crypto';

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
} from './health';

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
} from './logger';

// Queue (Background Jobs)
export {
  createMemoryQueueStore,
  createPostgresQueueStore,
  createQueueServer,
  MemoryQueueStore,
  PostgresQueueStore,
  QueueServer,
  type QueueConfig,
  type QueueServerOptions,
  type QueueStore,
  type Task,
  type TaskError,
  type TaskHandler,
  type TaskHandlers,
  type TaskResult,
} from './queue';

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
} from './write';

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
} from './router';

// Pagination
export {
  createPaginationHelpers,
  createPaginationMiddleware,
  type PaginationContext,
  type PaginationHelpers,
  type PaginationMiddlewareOptions,
  type PaginationRequest,
} from './pagination';

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
} from './permissions';
