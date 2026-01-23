// packages/db/src/schema/index.ts
/**
 * Schema Type Exports
 *
 * Explicit TypeScript interfaces for all database tables.
 * These replace Drizzle's $inferSelect/$inferInsert with explicit definitions.
 */

// Users & Refresh Tokens
export {
  type NewRefreshToken,
  type NewUser,
  REFRESH_TOKEN_COLUMNS,
  REFRESH_TOKENS_TABLE,
  type RefreshToken,
  type UpdateUser,
  USER_COLUMNS,
  type User,
  type UserRole,
  USERS_TABLE,
} from './users';

// Auth (token families, login attempts, password reset, email verification, security events)
export {
  EMAIL_VERIFICATION_TOKEN_COLUMNS,
  EMAIL_VERIFICATION_TOKENS_TABLE,
  type EmailVerificationToken,
  LOGIN_ATTEMPT_COLUMNS,
  LOGIN_ATTEMPTS_TABLE,
  type LoginAttempt,
  type NewEmailVerificationToken,
  type NewLoginAttempt,
  type NewPasswordResetToken,
  type NewRefreshTokenFamily,
  type NewSecurityEvent,
  PASSWORD_RESET_TOKEN_COLUMNS,
  PASSWORD_RESET_TOKENS_TABLE,
  type PasswordResetToken,
  REFRESH_TOKEN_FAMILIES_TABLE,
  REFRESH_TOKEN_FAMILY_COLUMNS,
  type RefreshTokenFamily,
  SECURITY_EVENT_COLUMNS,
  SECURITY_EVENTS_TABLE,
  type SecurityEvent,
  type SecurityEventSeverity,
  type SecurityEventType,
} from './auth';

// Magic Link
export {
  MAGIC_LINK_TOKEN_COLUMNS,
  MAGIC_LINK_TOKENS_TABLE,
  type MagicLinkToken,
  type NewMagicLinkToken,
} from './magic-link';

// OAuth
export {
  type NewOAuthConnection,
  OAUTH_CONNECTION_COLUMNS,
  OAUTH_CONNECTIONS_TABLE,
  OAUTH_PROVIDERS,
  type OAuthConnection,
  type OAuthProvider,
  type UpdateOAuthConnection,
} from './oauth';

// Push Subscriptions & Notification Preferences
export {
  DEFAULT_QUIET_HOURS,
  DEFAULT_TYPE_PREFERENCES,
  type NewNotificationPreference,
  type NewPushSubscription,
  NOTIFICATION_PREFERENCE_COLUMNS,
  NOTIFICATION_PREFERENCES_TABLE,
  type NotificationChannel,
  type NotificationPreference,
  type NotificationType,
  PUSH_SUBSCRIPTION_COLUMNS,
  PUSH_SUBSCRIPTIONS_TABLE,
  type PushSubscription,
  type QuietHoursConfig,
  type TypePreferences,
} from './push';

// Billing
export {
  // Table names
  BILLING_EVENTS_TABLE,
  CUSTOMER_MAPPINGS_TABLE,
  INVOICES_TABLE,
  PAYMENT_METHODS_TABLE,
  PLANS_TABLE,
  SUBSCRIPTIONS_TABLE,
  // Column mappings
  BILLING_EVENT_COLUMNS,
  CUSTOMER_MAPPING_COLUMNS,
  INVOICE_COLUMNS,
  PAYMENT_METHOD_COLUMNS,
  PLAN_COLUMNS,
  SUBSCRIPTION_COLUMNS,
  // Constants
  BILLING_EVENT_TYPES,
  BILLING_PROVIDERS,
  INVOICE_STATUSES,
  PAYMENT_METHOD_TYPES,
  PLAN_INTERVALS,
  SUBSCRIPTION_STATUSES,
  // Types
  type BillingEvent,
  type BillingEventType,
  type BillingProvider,
  type CardDetails,
  type CustomerMapping,
  type Invoice,
  type InvoiceStatus,
  type NewBillingEvent,
  type NewCustomerMapping,
  type NewInvoice,
  type NewPaymentMethod,
  type NewPlan,
  type NewSubscription,
  type PaymentMethod,
  type PaymentMethodType,
  type Plan,
  type PlanFeature,
  type PlanInterval,
  type Subscription,
  type SubscriptionStatus,
  type UpdateInvoice,
  type UpdatePaymentMethod,
  type UpdatePlan,
  type UpdateSubscription,
} from './billing';
