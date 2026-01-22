// apps/server/src/infrastructure/data/database/index.ts

// Schema exports
export {
  // Users
  users,
  refreshTokens,
  type UserRole,
  type User,
  type NewUser,
  type RefreshToken,
  type NewRefreshToken,
  // Auth
  refreshTokenFamilies,
  loginAttempts,
  passwordResetTokens,
  emailVerificationTokens,
  securityEvents,
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
  // Magic Link
  magicLinkTokens,
  type MagicLinkToken,
  type NewMagicLinkToken,
  // OAuth
  oauthConnections,
  oauthProviderEnum,
  OAUTH_PROVIDERS,
  type OAuthConnection,
  type NewOAuthConnection,
  type OAuthProvider,
  // Push Subscriptions
  pushSubscriptions,
  notificationPreferences,
  type PushSubscription,
  type NewPushSubscription,
  type NotificationPreference,
  type NewNotificationPreference,
  type NotificationChannel,
  type NotificationType,
  type TypePreferences,
  type QuietHoursConfig,
} from './schema';

// Client exports
export {
  buildConnectionString,
  createDbClient,
  resolveConnectionStringWithFallback,
  type DbClient,
} from './client';

// Utils exports (transaction, optimistic locking)
export {
  withTransaction,
  isInTransaction,
  OptimisticLockError,
  updateUserWithVersion,
  isOptimisticLockError,
} from './utils';

// Note: test-utils (createMockDb, MockDbClient) are NOT exported here.
// They import vitest which cannot be loaded at runtime.
// Import directly from './utils/test-utils' in test files.

// Schema validation
export {
  REQUIRED_TABLES,
  validateSchema,
  requireValidSchema,
  getExistingTables,
  SchemaValidationError,
  type RequiredTable,
  type SchemaValidationResult,
} from './schema';

// JSON Database (development/testing only)
export { createJsonDbClient, JsonDatabase, JsonDbClient } from './json';
