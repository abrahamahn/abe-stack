// apps/server/src/infrastructure/data/index.ts
/**
 * Data Layer
 *
 * Data persistence and file handling:
 * - database: Database client, schema, transactions
 * - storage: File storage providers (local, S3)
 * - files: File handling utilities
 */

// Database - Schema types and table constants
export {
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
  // Types
  type EmailVerificationToken,
  type LoginAttempt,
  type NewEmailVerificationToken,
  type NewLoginAttempt,
  type NewPasswordResetToken,
  type NewRefreshToken,
  type NewRefreshTokenFamily,
  type NewSecurityEvent,
  type NewUser,
  type UpdateUser,
  type PasswordResetToken,
  type RefreshToken,
  type RefreshTokenFamily,
  type SecurityEvent,
  type User,
  type UserRole,
  type MagicLinkToken,
  type NewMagicLinkToken,
  type OAuthConnection,
  type NewOAuthConnection,
  type UpdateOAuthConnection,
  type OAuthProvider,
  type PushSubscription,
  type NewPushSubscription,
  type NotificationPreference,
  type NewNotificationPreference,
  type NotificationChannel,
  type NotificationType,
  type TypePreferences,
  type QuietHoursConfig,
  type SecurityEventType,
  type SecurityEventSeverity,
} from '@abe-stack/db';

// Database - Client
export {
  buildConnectionString,
  createDbClient,
  resolveConnectionStringWithFallback,
  type DbClient,
} from '@abe-stack/db';

// Database - Utils
export {
  isInTransaction,
  isOptimisticLockError,
  OptimisticLockError,
  updateUserWithVersion,
  withTransaction,
} from '@abe-stack/db';

// Note: createMockDb and MockDbClient are NOT exported here.
// They import vitest which cannot be loaded at runtime.
// Import directly from '@abe-stack/db/testing/mocks' in test files.

// Database - Schema Validation
export {
  getExistingTables,
  REQUIRED_TABLES,
  requireValidSchema,
  SchemaValidationError,
  validateSchema,
  type RequiredTable,
  type SchemaValidationResult,
} from '@abe-stack/db';

// Storage
export {
  createStorage,
  LocalStorageProvider,
  S3StorageProvider,
  createSignedUrl,
  parseSignedUrl,
  isUrlExpired,
  getDefaultExpiration,
  createStorageSignature,
  verifyStorageSignature,
  normalizeStorageFilename,
  type SignedUrlData,
  type StorageConfig,
  type StorageProviderName,
  type LocalStorageConfig,
  type S3StorageConfig,
  type UploadParams,
  type StorageProvider,
} from '@abe-stack/storage';

// Files - explicit exports
export {
  normalizeFilename as normalizeFileFilename,
  createFileSignature,
  verifyFileSignature,
  registerFileServer,
  type FileSignatureData,
  type FilesConfig,
} from '@abe-stack/storage';
