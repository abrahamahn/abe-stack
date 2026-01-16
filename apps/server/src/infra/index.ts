// apps/server/src/infra/index.ts
/**
 * Infrastructure Layer
 *
 * Technical capabilities organized by concern:
 * - database: Database client, schema, transactions
 * - storage: File storage providers (local, S3)
 * - email: Email sending services
 * - pubsub: Real-time subscription management (with Postgres NOTIFY/LISTEN)
 * - rbac: Role/attribute-based access control (custom Ability system)
 * - security: Login tracking, lockout, audit logging
 * - http: Security headers, CORS middleware
 * - rate-limit: Token Bucket rate limiter
 * - crypto: Native JWT implementation (HS256)
 */

// Database
export {
  // Schema - Users
  USER_ROLES,
  users,
  refreshTokens,
  // Schema - Auth
  refreshTokenFamilies,
  loginAttempts,
  passwordResetTokens,
  emailVerificationTokens,
  securityEvents,
  // Client
  buildConnectionString,
  createDbClient,
  resolveConnectionStringWithFallback,
  // Transaction
  withTransaction,
  isInTransaction,
  // Optimistic locking
  OptimisticLockError,
  updateUserWithVersion,
  isOptimisticLockError,
  // Types
  type UserRole,
  type User,
  type NewUser,
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
  type DbClient,
} from './database';

// Storage
export {
  createStorage,
  LocalStorageProvider,
  S3StorageProvider,
  normalizeStorageKey,
  type StorageConfig,
  type StorageProviderName,
  type LocalStorageConfig,
  type S3StorageConfig,
  type UploadParams,
  type StorageProvider,
} from './storage';

// Email
export type { EmailService, EmailOptions, EmailResult } from './email';
export { ConsoleEmailService, createEmailService, emailTemplates, SmtpEmailService } from './email';

// PubSub
export {
  SubscriptionManager,
  SubKeys,
  publishAfterWrite,
  PostgresPubSub,
  createPostgresPubSub,
} from './pubsub';
export type {
  SubscriptionKey,
  RecordKey,
  ListKey,
  SubscriptionManagerOptions,
  PostgresPubSubOptions,
  PubSubMessage,
} from './pubsub';

// Security
export {
  logLoginAttempt,
  isAccountLocked,
  getProgressiveDelay,
  applyProgressiveDelay,
  clearLoginAttempts,
  getAccountLockoutStatus,
  unlockAccount,
  type LockoutConfig,
  type LockoutStatus,
} from './security';

// Security Events
export {
  logSecurityEvent,
  logTokenReuseEvent,
  logTokenFamilyRevokedEvent,
  logAccountLockedEvent,
  logAccountUnlockedEvent,
  getUserSecurityEvents,
  getSecurityEventMetrics,
  type SecurityEventType,
  type SecurityEventSeverity,
  type SecurityEventMetadata,
  type LogSecurityEventParams,
} from './security/events';

// HTTP (Security headers, CORS)
export { applySecurityHeaders, applyCors, handlePreflight, type CorsOptions } from './http';

// WebSocket
export { registerWebSocket, getWebSocketStats, type WebSocketStats } from './websocket';

// Rate Limiting
export {
  RateLimiter,
  MemoryStore,
  createRateLimiter,
  RateLimitPresets,
  type RateLimitConfig,
  type RateLimitInfo,
  type RateLimiterStats,
  type MemoryStoreStats,
} from './rate-limit';

// Crypto (Native JWT)
export {
  jwtSign,
  jwtVerify,
  jwtDecode,
  JwtError,
  type JwtErrorCode,
  type JwtHeader,
  type JwtPayload,
  type JwtSignOptions,
} from './crypto';

// Health Checks
export {
  checkDatabase,
  checkEmail,
  checkStorage,
  checkPubSub,
  checkWebSocket,
  checkRateLimit,
  getDetailedHealth,
  logStartupSummary,
  type ServiceStatus,
  type OverallStatus,
  type ServiceHealth,
  type DetailedHealthResponse,
  type ReadyResponse,
  type LiveResponse,
  type RoutesResponse,
  type StartupSummaryOptions,
} from './health';
