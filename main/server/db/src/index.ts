// main/server/db/src/index.ts
/**
 * Database Package Entry Point
 *
 * Exports:
 * - Client: Raw PostgreSQL client (createRawDb, createDbClient)
 * - Schema: TypeScript types for all database tables
 * - Repositories: Data Access Layer (functional-style factories)
 * - Factory: Repository container (Repositories, createRepositories)
 * - Validation: Schema validation utilities
 * - Utils: Database helpers (case conversion, formatting)
 * - Builder: SQL query builder
 *
 * @module @abe-stack/db
 */

// Client
export {
    buildConnectionString,
    canReachDatabase,
    createDbClient,
    createRawDb,
    resolveConnectionStringWithFallback,
    type DbClient,
    type DbConfig,
    type IsolationLevel,
    type QueryOptions,
    type QueryResult,
    type RawDb,
    type SessionContext,
    type TransactionOptions
} from './client';

// Schema
export {
    ACTIVITIES_TABLE,
    // Activity schema
    ACTIVITY_COLUMNS,
    // API Keys
    API_KEYS_TABLE, API_KEY_COLUMNS, AUDIT_EVENTS_TABLE, AUDIT_EVENT_COLUMNS,
    // Billing
    BILLING_EVENTS_TABLE, BILLING_EVENT_COLUMNS,
    BILLING_EVENT_TYPES, BILLING_PROVIDERS, CONSENT_LOGS_TABLE, CONSENT_LOG_COLUMNS, CONSENT_TYPES, CUSTOMER_MAPPINGS_TABLE, CUSTOMER_MAPPING_COLUMNS,
    // Compliance
    DATA_EXPORT_REQUESTS_TABLE, DATA_EXPORT_REQUEST_COLUMNS, DATA_EXPORT_STATUSES,
    DATA_EXPORT_TYPES,
    // Push
    DEFAULT_QUIET_HOURS,
    DEFAULT_TYPE_PREFERENCES,
    // Auth
    EMAIL_CHANGE_TOKENS_TABLE, EMAIL_CHANGE_TOKEN_COLUMNS, EMAIL_VERIFICATION_TOKENS_TABLE, EMAIL_VERIFICATION_TOKEN_COLUMNS, FEATURE_FLAGS_TABLE,
    // Feature flag schema
    FEATURE_FLAG_COLUMNS, FILES_TABLE,
    // Files
    FILE_COLUMNS,
    FILE_PURPOSES, INVOICES_TABLE, INVOICE_COLUMNS,
    INVOICE_STATUSES, LEGAL_DOCUMENTS_TABLE, LEGAL_DOCUMENT_COLUMNS, LOGIN_ATTEMPTS_TABLE, LOGIN_ATTEMPT_COLUMNS,
    // Magic Link
    MAGIC_LINK_TOKENS_TABLE, MAGIC_LINK_TOKEN_COLUMNS, MEMBERSHIPS_TABLE, MEMBERSHIP_COLUMNS, NOTIFICATIONS_TABLE, NOTIFICATION_COLUMNS, NOTIFICATION_PREFERENCES_TABLE, NOTIFICATION_PREFERENCE_COLUMNS,
    // OAuth
    OAUTH_CONNECTIONS_TABLE, OAUTH_CONNECTION_COLUMNS, OAUTH_PROVIDERS, PASSWORD_RESET_TOKENS_TABLE, PASSWORD_RESET_TOKEN_COLUMNS, PAYMENT_METHODS_TABLE, PAYMENT_METHOD_COLUMNS,
    PAYMENT_METHOD_TYPES, PLANS_TABLE, PLAN_COLUMNS,
    PLAN_INTERVALS, PUSH_SUBSCRIPTIONS_TABLE, PUSH_SUBSCRIPTION_COLUMNS, REFRESH_TOKENS_TABLE, REFRESH_TOKEN_COLUMNS,
    REFRESH_TOKEN_FAMILIES_TABLE,
    REFRESH_TOKEN_FAMILY_COLUMNS, SECURITY_EVENTS_TABLE, SECURITY_EVENT_COLUMNS, SECURITY_EVENT_TYPES, SECURITY_SEVERITIES, SMS_VERIFICATION_CODES_TABLE, STORAGE_PROVIDERS, SUBSCRIPTIONS_TABLE, SUBSCRIPTION_COLUMNS,
    SUBSCRIPTION_STATUSES,
    // Tenant schema
    TENANTS_TABLE, TENANT_COLUMNS, TENANT_FEATURE_OVERRIDES_TABLE, TENANT_FEATURE_OVERRIDE_COLUMNS, TOTP_BACKUP_CODES_TABLE, TOTP_BACKUP_CODE_COLUMNS, TRUSTED_DEVICES_TABLE, TRUSTED_DEVICE_COLUMNS, USERS_TABLE, USER_AGREEMENTS_TABLE, USER_AGREEMENT_COLUMNS, USER_COLUMNS, USER_SESSIONS_TABLE, USER_SESSION_COLUMNS, WEBAUTHN_CREDENTIALS_TABLE, WEBAUTHN_CREDENTIAL_COLUMNS, WEBHOOKS_TABLE, WEBHOOK_COLUMNS, WEBHOOK_DELIVERIES_TABLE, WEBHOOK_DELIVERY_COLUMNS, WEBHOOK_DELIVERY_STATUSES,
    // Types
    type Activity, type ApiKey, type AuditEvent, type BillingEvent,
    type BillingEventType,
    type BillingProvider,
    type CardDetails,
    type ConsentLog,
    type ConsentType,
    type CustomerMapping,
    type DataExportRequest,
    type DataExportStatus,
    type DataExportType,
    type DocumentType,
    type EmailChangeToken,
    type EmailVerificationToken, type FeatureFlag, type FilePurpose,
    type FileRecord, type Notification as InAppNotification, type Invoice,
    type InvoiceStatus,
    type LegalDocument,
    type LoginAttempt,
    type MagicLinkToken, type NewActivity, type NewApiKey, type NewAuditEvent, type NewBillingEvent,
    type NewConsentLog,
    type NewCustomerMapping,
    type NewDataExportRequest,
    type NewEmailChangeToken,
    type NewEmailVerificationToken, type NewFeatureFlag, type NewFileRecord, type NewInvoice,
    type NewLegalDocument,
    type NewLoginAttempt,
    type NewMagicLinkToken,
    type NewNotification,
    type NewNotificationPreference, type NewOAuthConnection,
    type NewPasswordResetToken,
    type NewPaymentMethod,
    type NewPlan,
    type NewPushSubscription,
    type NewRefreshToken,
    type NewRefreshTokenFamily,
    type NewSecurityEvent,
    type NewSubscription, type NewTenantFeatureOverride, type NewTotpBackupCode, type NewTrustedDevice, type NewUser,
    type NewUserAgreement, type NewUserSession, type NewWebauthnCredential, type NewWebhook,
    type NewWebhookDelivery, type NotificationChannel, type NotificationLevel, type NotificationPreference,
    type NotificationType,
    type OAuthConnection,
    type OAuthProvider,
    type PasswordResetToken,
    type PaymentMethod,
    type PaymentMethodType,
    type Plan,
    type PlanFeature,
    type PlanInterval,
    type PushSubscription,
    type QuietHoursConfig,
    type RefreshToken,
    type RefreshTokenFamily, type SecurityEvent,
    type SecurityEventType,
    type SecuritySeverity,
    type Subscription,
    type SubscriptionStatus, type TenantFeatureOverride, type TotpBackupCode, type TrustedDevice, type TypePreferences, type UpdateApiKey,
    type UpdateDataExportRequest, type UpdateFeatureFlag, type UpdateFileRecord, type UpdateInvoice, type UpdateLegalDocument, type UpdateOAuthConnection,
    type UpdatePaymentMethod,
    type UpdatePlan,
    type UpdateSubscription, type UpdateTenantFeatureOverride, type UpdateTrustedDevice, type UpdateUser,
    type UpdateUserSession, type UpdateWebauthnCredential, type UpdateWebhook,
    type UpdateWebhookDelivery,
    type User, type UserAgreement, type UserRole,
    type UserSession, type WebauthnCredential, type Webhook,
    type WebhookDelivery,
    type WebhookDeliveryStatus
} from './schema';

// Repositories (functional-style)
export {
    // Activities
    createActivityRepository,
    // API Keys
    createApiKeyRepository,
    // Audit
    createAuditEventRepository,
    // Auth
    createBillingEventRepository,
    // Compliance
    createConsentLogRepository, createCustomerMappingRepository, createDataExportRequestRepository, createEmailChangeRevertTokenRepository, createEmailChangeTokenRepository, createEmailVerificationTokenRepository,
    // Features
    createFeatureFlagRepository,
    // Files
    createFileRepository, createInvitationRepository, createInvoiceRepository, createLegalDocumentRepository, createLoginAttemptRepository,
    // Magic Link
    createMagicLinkTokenRepository, createMembershipRepository, createNotificationPreferenceRepository,
    // In-App Notifications
    createNotificationRepository,
    // OAuth
    createOAuthConnectionRepository,
    createPasswordResetTokenRepository,
    createPaymentMethodRepository,
    createPlanRepository,
    // Push
    createPushSubscriptionRepository,
    createRefreshTokenFamilyRepository,
    createRefreshTokenRepository,
    createSecurityEventRepository,
    createSubscriptionRepository, createTenantFeatureOverrideRepository,
    // Tenant
    createTenantRepository, createTotpBackupCodeRepository,
    // Trusted Devices
    createTrustedDeviceRepository, createUserAgreementRepository,
    // Users
    createUserRepository,
    // Sessions
    createUserSessionRepository,
    // WebAuthn Credentials
    createWebauthnCredentialRepository,
    // Types
    type ActivityRepository,
    type AdminUserListFilters,
    type ApiKeyRepository,
    type AuditEventRepository,
    type BillingEventRepository,
    type ConsentLogRepository,
    type CursorPaginatedResult,
    type CursorPaginationOptions,
    type CustomerMappingRepository,
    type DataExportRequestRepository, type EmailChangeRevertTokenRepository, type EmailChangeTokenRepository, type EmailVerificationTokenRepository,
    type FeatureFlagRepository,
    type FileRepository, type InvitationRepository, type InvoiceFilters,
    type InvoiceRepository,
    type LegalDocumentRepository,
    type LoginAttemptRepository,
    type MagicLinkTokenRepository, type MembershipRepository, type NotificationPreferenceRepository,
    type NotificationRepository,
    type OAuthConnectionRepository,
    type PasswordResetTokenRepository,
    type PaymentMethodRepository,
    type PlanRepository,
    type PushSubscriptionRepository,
    type RefreshTokenFamilyRepository,
    type RefreshTokenRepository,
    type SecurityEventRepository,
    type SubscriptionFilters,
    type SubscriptionRepository,
    type TenantFeatureOverrideRepository, type TenantRepository, type TimeRangeFilter,
    type TotpBackupCodeRepository,
    type TrustedDeviceRepository, type UserAgreementRepository,
    type UserRepository,
    type UserSessionRepository, type WebauthnCredentialRepository, type WebhookDeliveryRepository, type WebhookRepository
} from './repositories';

// Factory
export {
    closeRepositories,
    createRepositories,
    getRepositoryContext,
    type Repositories,
    type RepositoryContext
} from './factory';

// Validation
export {
    REQUIRED_TABLES, SchemaValidationError, getExistingTables, requireValidSchema, validateSchema,
    type RequiredTable,
    type SchemaValidationResult
} from './validation';

// Utils
export {
    applyCursorPagination, applyOffsetPagination, buildColumnList,
    buildInsertClause,
    buildSetClause, camelToSnake, camelizeKeys, formatDate,
    formatJsonb,
    parseJsonb, snakeToCamel, snakeifyKeys, toCamelCase,
    toCamelCaseArray,
    toSnakeCase,
    type ColumnMapping, type CountResult, type CursorPaginationQueryBuilder, type OffsetPaginationQueryBuilder
} from './utils';

// Builder
export {
    and,
    deleteFrom,
    eq,
    escapeIdentifier,
    gt,
    gte,
    ilike,
    inArray,
    insert,
    isNotNull,
    isNull,
    lt,
    lte,
    ne,
    not,
    or,
    select,
    selectCount,
    update,
    type QueryBuilder,
    type SqlFragment
} from './builder';

// Transaction
export { isInTransaction, withTransaction } from './utils/transaction';

// Optimistic Locking
export { OptimisticLockError, isOptimisticLockError, updateUserWithVersion } from './utils/optimistic-lock';

// Queue
export { PostgresQueueStore, createPostgresQueueStore } from './queue/postgres-store';

export {
    type JobDetails,
    type JobListOptions,
    type JobListResult,
    type JobStatus,
    type QueueConfig,
    type QueueStats,
    type QueueStore,
    type Task,
    type TaskError,
    type TaskHandler,
    type TaskHandlers,
    type TaskResult
} from './queue/types/queue-types';

// Read Replica
export {
    createReadReplicaClient,
    type ReadReplicaClient,
    type ReadReplicaOptions
} from './read-replica';

// PubSub
export { PostgresPubSub, createPostgresPubSub } from './pubsub/postgres-pubsub';

// Search
export { SqlSearchProvider, createSqlSearchProvider } from './search/sql-provider';

export type {
    ElasticsearchProviderConfig,
    IndexHint,
    SearchContext,
    SearchMetrics,
    SearchProviderConfig,
    SearchProviderFactoryOptions,
    SearchProviderType,
    SearchResultWithMetrics,
    ServerSearchProvider,
    SqlColumnMapping,
    SqlCursorData,
    SqlFilterResult,
    SqlOperatorMap,
    SqlOperatorTranslator,
    SqlQueryOptions,
    SqlSearchProviderConfig,
    SqlTableConfig
} from './search/types';

