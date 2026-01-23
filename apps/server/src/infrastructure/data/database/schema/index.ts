// apps/server/src/infrastructure/data/database/schema/index.ts
/**
 * Schema Exports
 *
 * Re-exports types and constants from @abe-stack/db.
 * Table names and column mappings are used with the raw SQL query builder.
 */

// User types and constants
export {
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
} from '@abe-stack/db';

// Auth types and constants
export {
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
} from '@abe-stack/db';

// Magic link types and constants
export {
  MAGIC_LINK_TOKENS_TABLE,
  MAGIC_LINK_TOKEN_COLUMNS,
  type MagicLinkToken,
  type NewMagicLinkToken,
} from '@abe-stack/db';

// OAuth types and constants
export {
  OAUTH_CONNECTIONS_TABLE,
  OAUTH_CONNECTION_COLUMNS,
  OAUTH_PROVIDERS,
  type OAuthConnection,
  type NewOAuthConnection,
  type UpdateOAuthConnection,
  type OAuthProvider,
} from '@abe-stack/db';

// Push subscription types and constants
export {
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
} from '@abe-stack/db';

// Schema validation
export {
  REQUIRED_TABLES,
  validateSchema,
  requireValidSchema,
  getExistingTables,
  SchemaValidationError,
  type RequiredTable,
  type SchemaValidationResult,
} from './validation';
