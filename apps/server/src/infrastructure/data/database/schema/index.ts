// apps/server/src/infrastructure/data/database/schema/index.ts

// Users schema
export {
  users,
  refreshTokens,
  type UserRole,
  type User,
  type NewUser,
  type RefreshToken,
  type NewRefreshToken,
} from './users';

// Auth schema
export {
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
} from './auth';

// Magic link schema
export {
  magicLinkTokens,
  type MagicLinkToken,
  type NewMagicLinkToken,
} from './magic-link';

// OAuth schema
export {
  oauthConnections,
  oauthProviderEnum,
  OAUTH_PROVIDERS,
  type OAuthConnection,
  type NewOAuthConnection,
  type OAuthProvider,
} from './oauth';

// Push subscriptions schema
export {
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
} from './push-subscriptions';

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
