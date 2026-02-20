// main/server/db/src/schema/index.ts
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
  type RefreshTokenFamilyView,
  type UpdateUser,
  USER_COLUMNS,
  type User,
  type UserRole,
  USERS_TABLE,
} from './users';

// Auth (unified auth tokens, login attempts, security events, TOTP, SMS, WebAuthn)
export {
  AUTH_TOKEN_COLUMNS,
  AUTH_TOKENS_TABLE,
  type AuthToken,
  type AuthTokenType,
  LOGIN_ATTEMPT_COLUMNS,
  LOGIN_ATTEMPTS_TABLE,
  type LoginAttempt,
  type NewAuthToken,
  type NewLoginAttempt,
  type NewSecurityEvent,
  type NewSmsVerificationCode,
  type NewTotpBackupCode,
  type NewWebauthnCredential,
  SECURITY_EVENT_COLUMNS,
  SECURITY_EVENT_TYPES,
  SECURITY_EVENTS_TABLE,
  SMS_VERIFICATION_CODES_TABLE,
  SMS_VERIFICATION_CODE_COLUMNS,
  type SmsVerificationCode,
  type NewSmsVerificationCode,
  type UpdateSmsVerificationCode,
  SECURITY_SEVERITIES,
  type SecurityEvent,
  type SecurityEventType,
  type SecuritySeverity,
  type SmsVerificationCode,
  type UpdateSmsVerificationCode,
  TOTP_BACKUP_CODES_TABLE,
  TOTP_BACKUP_CODE_COLUMNS,
  type TotpBackupCode,
  WEBAUTHN_CREDENTIALS_TABLE,
  WEBAUTHN_CREDENTIAL_COLUMNS,
  type WebauthnCredential,
  type UpdateWebauthnCredential,
} from './auth';

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

// Tenants, Memberships & Invitations
export {
  INVITATION_COLUMNS,
  INVITATION_STATUSES,
  INVITATIONS_TABLE,
  type Invitation,
  type InvitationStatus,
  MEMBERSHIP_COLUMNS,
  MEMBERSHIPS_TABLE,
  type Membership,
  type NewInvitation,
  type NewMembership,
  type NewTenant,
  TENANT_COLUMNS,
  TENANT_ROLES,
  TENANTS_TABLE,
  type Tenant,
  type TenantRole,
  type UpdateInvitation,
  type UpdateMembership,
  type UpdateTenant,
} from './tenant';

// User Sessions
export {
  type NewUserSession,
  USER_SESSION_COLUMNS,
  USER_SESSIONS_TABLE,
  type UpdateUserSession,
  type UserSession,
} from './sessions';

// In-App Notifications
export {
  type NewNotification,
  NOTIFICATION_COLUMNS,
  NOTIFICATION_LEVELS,
  NOTIFICATIONS_TABLE,
  type Notification,
  type NotificationLevel,
  type UpdateNotification,
} from './notifications';

// System Infrastructure (Jobs, Audit, Webhooks)
export {
  // Table names
  AUDIT_EVENTS_TABLE,
  JOBS_TABLE,
  WEBHOOK_DELIVERIES_TABLE,
  WEBHOOKS_TABLE,
  // Column mappings
  AUDIT_EVENT_COLUMNS,
  JOB_COLUMNS,
  WEBHOOK_COLUMNS,
  WEBHOOK_DELIVERY_COLUMNS,
  // Constants
  AUDIT_CATEGORIES,
  AUDIT_SEVERITIES,
  JOB_STATUSES,
  WEBHOOK_DELIVERY_STATUSES,
  // Types
  type AuditCategory,
  type AuditEvent,
  type AuditSeverity,
  type Job,
  type JobStatus,
  type NewAuditEvent,
  type NewJob,
  type NewWebhook,
  type NewWebhookDelivery,
  type UpdateJob,
  type UpdateWebhook,
  type UpdateWebhookDelivery,
  type Webhook,
  type WebhookDelivery,
  type WebhookDeliveryStatus,
} from './system';

// Feature Flags & Tenant Overrides
export {
  FEATURE_FLAG_COLUMNS,
  FEATURE_FLAGS_TABLE,
  type FeatureFlag,
  type NewFeatureFlag,
  type NewTenantFeatureOverride,
  TENANT_FEATURE_OVERRIDE_COLUMNS,
  TENANT_FEATURE_OVERRIDES_TABLE,
  type TenantFeatureOverride,
  type UpdateFeatureFlag,
  type UpdateTenantFeatureOverride,
} from './features';

// Usage Metering
export {
  AGGREGATION_TYPES,
  type AggregationType,
  type NewUsageMetric,
  type NewUsageSnapshot,
  type UpdateUsageMetric,
  type UpdateUsageSnapshot,
  USAGE_METRIC_COLUMNS,
  USAGE_METRICS_TABLE,
  type UsageMetric,
  USAGE_SNAPSHOT_COLUMNS,
  USAGE_SNAPSHOTS_TABLE,
  type UsageSnapshot,
} from './metering';

// API Keys
export {
  API_KEYS_TABLE,
  API_KEY_COLUMNS,
  type ApiKey,
  type NewApiKey,
  type UpdateApiKey,
} from './api-keys';

// Compliance (Legal Documents, Consent Records, Data Export Requests)
export {
  CONSENT_RECORD_COLUMNS,
  CONSENT_RECORDS_TABLE,
  CONSENT_TYPES,
  type ConsentRecord,
  type ConsentRecordType,
  type ConsentType,
  DATA_EXPORT_REQUEST_COLUMNS,
  DATA_EXPORT_REQUESTS_TABLE,
  DATA_EXPORT_STATUSES,
  DATA_EXPORT_TYPES,
  type DataExportRequest,
  type DataExportStatus,
  type DataExportType,
  DOCUMENT_TYPES,
  type DocumentType,
  LEGAL_DOCUMENT_COLUMNS,
  LEGAL_DOCUMENTS_TABLE,
  type LegalDocument,
  type NewConsentRecord,
  type NewDataExportRequest,
  type NewLegalDocument,
  type UpdateDataExportRequest,
  type UpdateLegalDocument,
} from './compliance';

// Files/Uploads
export {
  FILE_COLUMNS,
  FILE_PURPOSES,
  FILES_TABLE,
  type FilePurpose,
  type FileRecord,
  type NewFileRecord,
  STORAGE_PROVIDERS,
  type StorageProvider,
  type UpdateFileRecord,
} from './files';

// Email (Templates & Delivery Log)
export {
  EMAIL_LOG_COLUMNS,
  EMAIL_LOG_TABLE,
  EMAIL_PROVIDERS,
  EMAIL_STATUSES,
  EMAIL_TEMPLATE_COLUMNS,
  EMAIL_TEMPLATES_TABLE,
  type EmailLog,
  type EmailProvider,
  type EmailStatus,
  type EmailTemplate,
  type NewEmailLog,
  type NewEmailTemplate,
  type UpdateEmailTemplate,
} from './email';

// Tenant Settings
export {
  type NewTenantSetting,
  TENANT_SETTING_COLUMNS,
  TENANT_SETTINGS_TABLE,
  type TenantSetting,
  type UpdateTenantSetting,
} from './tenant-settings';

// Trusted Devices
export {
  type NewTrustedDevice,
  TRUSTED_DEVICE_COLUMNS,
  TRUSTED_DEVICES_TABLE,
  type TrustedDevice,
  type UpdateTrustedDevice,
} from './trusted-devices';

// Activities (Activity Feed)
export {
  ACTIVITIES_TABLE,
  ACTIVITY_COLUMNS,
  ACTOR_TYPES,
  type Activity,
  type ActorType,
  type NewActivity,
} from './activities';
