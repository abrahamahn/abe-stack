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
 * @module @bslt/db
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
  type TransactionOptions,
} from './client';

// Schema
export {
  // Activity schema
  ACTIVITIES_TABLE,
  ACTIVITY_COLUMNS,
  // API Keys
  API_KEY_COLUMNS,
  API_KEYS_TABLE,
  // System
  AUDIT_EVENT_COLUMNS,
  AUDIT_EVENTS_TABLE,
  // Auth tokens (unified)
  AUTH_TOKEN_COLUMNS,
  AUTH_TOKENS_TABLE,
  // Billing
  BILLING_EVENT_COLUMNS,
  BILLING_EVENT_TYPES,
  BILLING_EVENTS_TABLE,
  BILLING_PROVIDERS,
  // Compliance
  CONSENT_RECORD_COLUMNS,
  CONSENT_RECORDS_TABLE,
  CONSENT_TYPES,
  CUSTOMER_MAPPING_COLUMNS,
  CUSTOMER_MAPPINGS_TABLE,
  DATA_EXPORT_REQUEST_COLUMNS,
  DATA_EXPORT_REQUESTS_TABLE,
  DATA_EXPORT_STATUSES,
  DATA_EXPORT_TYPES,
  // Push
  DEFAULT_QUIET_HOURS,
  DEFAULT_TYPE_PREFERENCES,
  // Feature flag schema
  FEATURE_FLAG_COLUMNS,
  FEATURE_FLAGS_TABLE,
  // Files
  FILE_COLUMNS,
  FILE_PURPOSES,
  FILES_TABLE,
  INVOICE_COLUMNS,
  INVOICE_STATUSES,
  INVOICES_TABLE,
  LEGAL_DOCUMENT_COLUMNS,
  LEGAL_DOCUMENTS_TABLE,
  LOGIN_ATTEMPT_COLUMNS,
  LOGIN_ATTEMPTS_TABLE,
  MEMBERSHIP_COLUMNS,
  MEMBERSHIPS_TABLE,
  NOTIFICATION_COLUMNS,
  NOTIFICATION_PREFERENCE_COLUMNS,
  NOTIFICATION_PREFERENCES_TABLE,
  NOTIFICATIONS_TABLE,
  // OAuth
  OAUTH_CONNECTION_COLUMNS,
  OAUTH_CONNECTIONS_TABLE,
  OAUTH_PROVIDERS,
  PAYMENT_METHOD_COLUMNS,
  PAYMENT_METHOD_TYPES,
  PAYMENT_METHODS_TABLE,
  PLAN_COLUMNS,
  PLAN_INTERVALS,
  PLANS_TABLE,
  PUSH_SUBSCRIPTION_COLUMNS,
  PUSH_SUBSCRIPTIONS_TABLE,
  REFRESH_TOKEN_COLUMNS,
  REFRESH_TOKENS_TABLE,
  SECURITY_EVENT_COLUMNS,
  SECURITY_EVENT_TYPES,
  SECURITY_EVENTS_TABLE,
  SECURITY_SEVERITIES,
  SMS_VERIFICATION_CODE_COLUMNS,
  SMS_VERIFICATION_CODES_TABLE,
  STORAGE_PROVIDERS,
  SUBSCRIPTION_COLUMNS,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTIONS_TABLE,
  TENANT_COLUMNS,
  TENANT_FEATURE_OVERRIDE_COLUMNS,
  TENANT_FEATURE_OVERRIDES_TABLE,
  // Tenant schema
  TENANTS_TABLE,
  TOTP_BACKUP_CODE_COLUMNS,
  TOTP_BACKUP_CODES_TABLE,
  TRUSTED_DEVICE_COLUMNS,
  TRUSTED_DEVICES_TABLE,
  USER_COLUMNS,
  USER_SESSION_COLUMNS,
  USER_SESSIONS_TABLE,
  USERS_TABLE,
  WEBAUTHN_CREDENTIAL_COLUMNS,
  WEBAUTHN_CREDENTIALS_TABLE,
  WEBHOOK_COLUMNS,
  WEBHOOK_DELIVERIES_TABLE,
  WEBHOOK_DELIVERY_COLUMNS,
  WEBHOOK_DELIVERY_STATUSES,
  WEBHOOKS_TABLE,
  // Types
  type Activity,
  type ApiKey,
  type AuditEvent,
  type AuthToken,
  type AuthTokenType,
  type BillingEvent,
  type BillingEventType,
  type BillingProvider,
  type CardDetails,
  type ConsentRecord,
  type ConsentRecordType,
  type ConsentType,
  type CustomerMapping,
  type DataExportRequest,
  type DataExportStatus,
  type DataExportType,
  type DocumentType,
  type FeatureFlag,
  type FilePurpose,
  type FileRecord,
  type Notification as InAppNotification,
  type Invoice,
  type InvoiceStatus,
  type LegalDocument,
  type LoginAttempt,
  type NewActivity,
  type NewApiKey,
  type NewAuditEvent,
  type NewAuthToken,
  type NewBillingEvent,
  type NewConsentRecord,
  type NewCustomerMapping,
  type NewDataExportRequest,
  type NewFeatureFlag,
  type NewFileRecord,
  type NewInvoice,
  type NewLegalDocument,
  type NewLoginAttempt,
  type NewNotification,
  type NewNotificationPreference,
  type NewOAuthConnection,
  type NewPaymentMethod,
  type NewPlan,
  type NewPushSubscription,
  type NewRefreshToken,
  type NewSecurityEvent,
  type NewSmsVerificationCode,
  type NewSubscription,
  type NewTenantFeatureOverride,
  type NewTotpBackupCode,
  type NewTrustedDevice,
  type NewUser,
  type NewUserSession,
  type NewWebauthnCredential,
  type NewWebhook,
  type NewWebhookDelivery,
  type NotificationChannel,
  type NotificationLevel,
  type NotificationPreference,
  type NotificationType,
  type OAuthConnection,
  type OAuthProvider,
  type PaymentMethod,
  type PaymentMethodType,
  type Plan,
  type PlanFeature,
  type PlanInterval,
  type PushSubscription,
  type QuietHoursConfig,
  type RefreshToken,
  type RefreshTokenFamilyView,
  type SecurityEvent,
  type SecurityEventType,
  type SecuritySeverity,
  type SmsVerificationCode,
  type Subscription,
  type SubscriptionStatus,
  type TenantFeatureOverride,
  type TotpBackupCode,
  type TrustedDevice,
  type TypePreferences,
  type UpdateApiKey,
  type UpdateDataExportRequest,
  type UpdateFeatureFlag,
  type UpdateFileRecord,
  type UpdateInvoice,
  type UpdateLegalDocument,
  type UpdateOAuthConnection,
  type UpdatePaymentMethod,
  type UpdatePlan,
  type UpdateSmsVerificationCode,
  type UpdateSubscription,
  type UpdateTenantFeatureOverride,
  type UpdateTrustedDevice,
  type UpdateUser,
  type UpdateUserSession,
  type UpdateWebauthnCredential,
  type UpdateWebhook,
  type UpdateWebhookDelivery,
  type User,
  type UserRole,
  type UserSession,
  type WebauthnCredential,
  type Webhook,
  type WebhookDelivery,
  type WebhookDeliveryStatus,
} from './schema';

// Repositories (functional-style)
export {
  // Activities
  createActivityRepository,
  // API Keys
  createApiKeyRepository,
  // Audit
  createAuditEventRepository,
  // Auth tokens (unified)
  createAuthTokenRepository,
  // Billing
  createBillingEventRepository,
  // Compliance
  createConsentRecordRepository,
  createCustomerMappingRepository,
  createDataExportRequestRepository,
  // Features
  createFeatureFlagRepository,
  // Files
  createFileRepository,
  createInvitationRepository,
  createInvoiceRepository,
  createLegalDocumentRepository,
  createLoginAttemptRepository,
  createMembershipRepository,
  createNotificationPreferenceRepository,
  // In-App Notifications
  createNotificationRepository,
  // OAuth
  createOAuthConnectionRepository,
  createPaymentMethodRepository,
  createPlanRepository,
  // Push
  createPushSubscriptionRepository,
  createRefreshTokenRepository,
  createSecurityEventRepository,
  createSubscriptionRepository,
  createTenantFeatureOverrideRepository,
  // Tenant
  createTenantRepository,
  createTotpBackupCodeRepository,
  // Trusted Devices
  createTrustedDeviceRepository,
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
  type AuthTokenRepository,
  type BillingEventRepository,
  type ConsentRecordRepository,
  type CursorPaginatedResult,
  type CursorPaginationOptions,
  type CustomerMappingRepository,
  type DataExportRequestRepository,
  type FeatureFlagRepository,
  type FileRepository,
  type InvitationRepository,
  type InvoiceFilters,
  type InvoiceRepository,
  type LegalDocumentRepository,
  type LoginAttemptRepository,
  type MembershipRepository,
  type NotificationPreferenceRepository,
  type NotificationRepository,
  type OAuthConnectionRepository,
  type PaymentMethodRepository,
  type PlanRepository,
  type PushSubscriptionRepository,
  type RefreshTokenRepository,
  type SecurityEventRepository,
  type SubscriptionFilters,
  type SubscriptionRepository,
  type TenantFeatureOverrideRepository,
  type TenantRepository,
  type TimeRangeFilter,
  type TotpBackupCodeRepository,
  type TrustedDeviceRepository,
  type UserRepository,
  type UserSessionRepository,
  type WebauthnCredentialRepository,
  type WebhookDeliveryRepository,
  type WebhookRepository,
} from './repositories';

// Factory
export {
  closeRepositories,
  createRepositories,
  getRepositoryContext,
  type Repositories,
  type RepositoryContext,
} from './factory';

// Validation
export {
  getExistingTables,
  REQUIRED_TABLES,
  requireValidSchema,
  SchemaValidationError,
  validateSchema,
  type RequiredTable,
  type SchemaValidationResult,
} from './validation';

// Utils
export {
  applyCursorPagination,
  applyOffsetPagination,
  buildColumnList,
  buildInsertClause,
  buildSetClause,
  camelizeKeys,
  camelToSnake,
  formatDate,
  formatJsonb,
  parseJsonb,
  snakeifyKeys,
  snakeToCamel,
  toCamelCase,
  toCamelCaseArray,
  toSnakeCase,
  type ColumnMapping,
  type CountResult,
  type CursorPaginationQueryBuilder,
  type OffsetPaginationQueryBuilder,
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
  type SqlFragment,
} from './builder';

// Transaction
export { isInTransaction, withTransaction } from './utils';

// Optimistic Locking
export { isOptimisticLockError, OptimisticLockError, updateUserWithVersion } from './utils';

// Queue
export { createPostgresQueueStore, PostgresQueueStore, WriteService, createWriteService } from './queue';

export {
  type AfterWriteHook,
  type BeforeValidateHook,
  type JobDetails,
  type JobListOptions,
  type JobListResult,
  type JobStatus,
  type OperationResult,
  type OperationType,
  type QueueConfig,
  type QueueStats,
  type QueueStore,
  type Task,
  type TaskError,
  type TaskHandler,
  type TaskHandlers,
  type TaskResult,
  type WriteBatch,
  type WriteContext,
  type WriteError,
  type WriteHooks,
  type WriteOperation,
  type WriteResult,
  type WriteServiceOptions,
} from './queue';

// Read Replica
export {
  createReadReplicaClient,
  type ReadReplicaClient,
  type ReadReplicaOptions,
} from './read-replica';

// PubSub
export { createPostgresPubSub, PostgresPubSub } from './pubsub';

// Search
export {
  createSqlSearchProvider,
  getSearchProviderFactory,
  resetSearchProviderFactory,
  SearchProviderFactory,
  SqlSearchProvider,
} from './search';
export type { ProviderOptions, SqlSearchProviderOptions } from './search';

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
  SqlTableConfig,
} from './search';
