// apps/server/src/infrastructure/data/database/index.ts
/**
 * Database Module
 *
 * Exports for database operations using raw SQL query builder.
 */

// Schema types and constants from @abe-stack/db
export {
  // User types and constants
  USERS_TABLE,
  USER_COLUMNS,
  REFRESH_TOKENS_TABLE,
  REFRESH_TOKEN_COLUMNS,
  type User,
  type NewUser,
  type UpdateUser,
  type UserRole,
  type RefreshToken,
  type NewRefreshToken,
  // Auth types and constants
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
  type SecurityEventType,
  type SecurityEventSeverity,
  // Magic link types and constants
  MAGIC_LINK_TOKENS_TABLE,
  MAGIC_LINK_TOKEN_COLUMNS,
  type MagicLinkToken,
  type NewMagicLinkToken,
  // OAuth types and constants
  OAUTH_CONNECTIONS_TABLE,
  OAUTH_CONNECTION_COLUMNS,
  OAUTH_PROVIDERS,
  type OAuthConnection,
  type NewOAuthConnection,
  type UpdateOAuthConnection,
  type OAuthProvider,
  // Push subscription types and constants
  PUSH_SUBSCRIPTIONS_TABLE,
  PUSH_SUBSCRIPTION_COLUMNS,
  NOTIFICATION_PREFERENCES_TABLE,
  NOTIFICATION_PREFERENCE_COLUMNS,
  type PushSubscription,
  type NewPushSubscription,
  type NotificationPreference,
  type NewNotificationPreference,
  type NotificationChannel,
  type NotificationType,
  type TypePreferences,
  type QuietHoursConfig,
  // Schema validation
  REQUIRED_TABLES,
  validateSchema,
  requireValidSchema,
  getExistingTables,
  SchemaValidationError,
  type RequiredTable,
  type SchemaValidationResult,
} from './schema';

// Query builder from @abe-stack/db
export {
  // Conditions
  and,
  or,
  not,
  eq,
  ne,
  gt,
  gte,
  lt,
  lte,
  isNull,
  isNotNull,
  inArray,
  notInArray,
  like,
  ilike,
  between,
  // Builders
  select,
  selectCount,
  insert,
  update,
  deleteFrom,
  // Utilities
  toSnakeCase,
  toCamelCase,
  toCamelCaseArray,
  // Types
  type RawDb,
} from '@abe-stack/db';

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
