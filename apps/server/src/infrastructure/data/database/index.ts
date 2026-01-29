// apps/server/src/infrastructure/data/database/index.ts
/**
 * Database Module
 *
 * Exports for database operations using raw SQL query builder.
 */

// Query builder, schema types and constants from @abe-stack/db
export {
  // Conditions
  and,
  between,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  ne,
  not,
  notInArray,
  or,
  // Builders
  deleteFrom,
  insert,
  select,
  selectCount,
  update,
  // Utilities
  toCamelCase,
  toCamelCaseArray,
  toSnakeCase,
  // User types and constants
  USER_COLUMNS,
  USERS_TABLE,
  type NewUser,
  type UpdateUser,
  type User,
  type UserRole,
  // Refresh token types and constants
  REFRESH_TOKEN_COLUMNS,
  REFRESH_TOKENS_TABLE,
  type NewRefreshToken,
  type RefreshToken,
  // Auth types and constants
  EMAIL_VERIFICATION_TOKEN_COLUMNS,
  EMAIL_VERIFICATION_TOKENS_TABLE,
  LOGIN_ATTEMPT_COLUMNS,
  LOGIN_ATTEMPTS_TABLE,
  PASSWORD_RESET_TOKEN_COLUMNS,
  PASSWORD_RESET_TOKENS_TABLE,
  REFRESH_TOKEN_FAMILIES_TABLE,
  REFRESH_TOKEN_FAMILY_COLUMNS,
  SECURITY_EVENT_COLUMNS,
  SECURITY_EVENTS_TABLE,
  type EmailVerificationToken,
  type LoginAttempt,
  type NewEmailVerificationToken,
  type NewLoginAttempt,
  type NewPasswordResetToken,
  type NewRefreshTokenFamily,
  type NewSecurityEvent,
  type PasswordResetToken,
  type RefreshTokenFamily,
  type SecurityEvent,
  type SecurityEventSeverity,
  type SecurityEventType,
  // Magic link types and constants
  MAGIC_LINK_TOKEN_COLUMNS,
  MAGIC_LINK_TOKENS_TABLE,
  type MagicLinkToken,
  type NewMagicLinkToken,
  // OAuth types and constants
  OAUTH_CONNECTION_COLUMNS,
  OAUTH_CONNECTIONS_TABLE,
  OAUTH_PROVIDERS,
  type NewOAuthConnection,
  type OAuthConnection,
  type OAuthProvider,
  type UpdateOAuthConnection,
  // Push subscription types and constants
  NOTIFICATION_PREFERENCE_COLUMNS,
  NOTIFICATION_PREFERENCES_TABLE,
  PUSH_SUBSCRIPTION_COLUMNS,
  PUSH_SUBSCRIPTIONS_TABLE,
  type NewNotificationPreference,
  type NewPushSubscription,
  type NotificationChannel,
  type NotificationPreference,
  type NotificationType,
  type PushSubscription,
  type QuietHoursConfig,
  type TypePreferences,
  // Types
  type RawDb,
} from '@abe-stack/db';

// Schema validation (local)
export {
  getExistingTables,
  requireValidSchema,
  REQUIRED_TABLES,
  SchemaValidationError,
  validateSchema,
  type RequiredTable,
  type SchemaValidationResult,
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

// JSON Database (development/testing only)
export { createJsonDbClient, JsonDatabase, JsonDbClient } from './json';

// Repository layer (raw SQL query builder)
export {
  createRepositories,
  getRepositoryContext,
  closeRepositories,
  type Repositories,
  type RepositoryContext,
} from './repositories';
