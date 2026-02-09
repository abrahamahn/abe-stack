// src/server/db/src/index.ts
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
  type TransactionOptions,
} from './client';

// Schema
export {
  API_KEY_COLUMNS,
  // API Keys
  API_KEYS_TABLE,
  BILLING_EVENT_COLUMNS,
  BILLING_EVENT_TYPES,
  // Billing
  BILLING_EVENTS_TABLE,
  BILLING_PROVIDERS,
  CUSTOMER_MAPPING_COLUMNS,
  CUSTOMER_MAPPINGS_TABLE,
  DATA_EXPORT_REQUEST_COLUMNS,
  // Compliance
  DATA_EXPORT_REQUESTS_TABLE,
  DATA_EXPORT_STATUSES,
  DATA_EXPORT_TYPES,
  // Push
  DEFAULT_QUIET_HOURS,
  DEFAULT_TYPE_PREFERENCES,
  EMAIL_CHANGE_TOKEN_COLUMNS,
  // Auth
  EMAIL_CHANGE_TOKENS_TABLE,
  EMAIL_VERIFICATION_TOKEN_COLUMNS,
  EMAIL_VERIFICATION_TOKENS_TABLE,
  INVOICE_COLUMNS,
  INVOICE_STATUSES,
  INVOICES_TABLE,
  LOGIN_ATTEMPT_COLUMNS,
  LOGIN_ATTEMPTS_TABLE,
  MAGIC_LINK_TOKEN_COLUMNS,
  // Magic Link
  MAGIC_LINK_TOKENS_TABLE,
  NOTIFICATION_PREFERENCE_COLUMNS,
  NOTIFICATION_PREFERENCES_TABLE,
  OAUTH_CONNECTION_COLUMNS,
  // OAuth
  OAUTH_CONNECTIONS_TABLE,
  OAUTH_PROVIDERS,
  PASSWORD_RESET_TOKEN_COLUMNS,
  PASSWORD_RESET_TOKENS_TABLE,
  PAYMENT_METHOD_COLUMNS,
  PAYMENT_METHOD_TYPES,
  PAYMENT_METHODS_TABLE,
  PLAN_COLUMNS,
  PLAN_INTERVALS,
  PLANS_TABLE,
  PUSH_SUBSCRIPTION_COLUMNS,
  PUSH_SUBSCRIPTIONS_TABLE,
  REFRESH_TOKEN_COLUMNS,
  REFRESH_TOKEN_FAMILIES_TABLE,
  REFRESH_TOKEN_FAMILY_COLUMNS,
  REFRESH_TOKENS_TABLE,
  SECURITY_EVENT_COLUMNS,
  SECURITY_EVENTS_TABLE,
  SUBSCRIPTION_COLUMNS,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTIONS_TABLE,
  TOTP_BACKUP_CODE_COLUMNS,
  TOTP_BACKUP_CODES_TABLE,
  USER_COLUMNS,
  USERS_TABLE,
  USER_SESSION_COLUMNS,
  USER_SESSIONS_TABLE,
  // Types
  type ApiKey,
  type BillingEvent,
  type BillingEventType,
  type BillingProvider,
  type CardDetails,
  type CustomerMapping,
  type DataExportRequest,
  type DataExportStatus,
  type DataExportType,
  type EmailChangeToken,
  type EmailVerificationToken,
  type Invoice,
  type InvoiceStatus,
  type LoginAttempt,
  type MagicLinkToken,
  type NewApiKey,
  type NewBillingEvent,
  type NewCustomerMapping,
  type NewDataExportRequest,
  type NewEmailChangeToken,
  type NewEmailVerificationToken,
  type NewInvoice,
  type NewLoginAttempt,
  type NewMagicLinkToken,
  type NewNotificationPreference,
  type NewOAuthConnection,
  type NewPasswordResetToken,
  type NewPaymentMethod,
  type NewPlan,
  type NewPushSubscription,
  type NewRefreshToken,
  type NewRefreshTokenFamily,
  type NewSecurityEvent,
  type NewSubscription,
  type NewTotpBackupCode,
  type NewUser,
  type NotificationChannel,
  type NotificationPreference,
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
  type RefreshTokenFamily,
  type SecurityEvent,
  type SecurityEventSeverity,
  type SecurityEventType,
  type Subscription,
  type SubscriptionStatus,
  type TotpBackupCode,
  type TypePreferences,
  type UpdateApiKey,
  type UpdateDataExportRequest,
  type UpdateInvoice,
  type UpdateOAuthConnection,
  type UpdatePaymentMethod,
  type UpdatePlan,
  type UpdateSubscription,
  type UpdateUser,
  type UpdateUserSession,
  type User,
  type UserRole,
  type UserSession,
  type NewUserSession,
} from './schema';

// Repositories (functional-style)
export {
  // API Keys
  createApiKeyRepository,
  // Auth
  createBillingEventRepository,
  createCustomerMappingRepository,
  // Compliance
  createDataExportRequestRepository,
  createEmailChangeTokenRepository,
  createEmailVerificationTokenRepository,
  createInvoiceRepository,
  createLoginAttemptRepository,
  // Magic Link
  createMagicLinkTokenRepository,
  createNotificationPreferenceRepository,
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
  createSubscriptionRepository,
  createTotpBackupCodeRepository,
  // Users
  createUserRepository,
  // Types
  type AdminUserListFilters,
  type ApiKeyRepository,
  type BillingEventRepository,
  type CustomerMappingRepository,
  type DataExportRequestRepository,
  type EmailChangeTokenRepository,
  type EmailVerificationTokenRepository,
  type InvoiceFilters,
  type InvoiceRepository,
  type LoginAttemptRepository,
  type MagicLinkTokenRepository,
  type NotificationPreferenceRepository,
  type OAuthConnectionRepository,
  type PaginatedResult,
  type PaginatedUserResult,
  type PaginationOptions,
  type PasswordResetTokenRepository,
  type PaymentMethodRepository,
  type PlanRepository,
  type PushSubscriptionRepository,
  type RefreshTokenFamilyRepository,
  type RefreshTokenRepository,
  type SecurityEventRepository,
  type SubscriptionFilters,
  type SubscriptionRepository,
  type TimeRangeFilter,
  type TotpBackupCodeRepository,
  type UserRepository,
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
export { isInTransaction, withTransaction } from './utils/transaction';

// Optimistic Locking
export {
  isOptimisticLockError,
  OptimisticLockError,
  updateUserWithVersion,
} from './utils/optimistic-lock';

// Queue
export { createPostgresQueueStore, PostgresQueueStore } from './queue/postgres-store';

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
  type TaskResult,
} from './queue/types/queue-types';

// PubSub
export { PostgresPubSub } from './pubsub/postgres-pubsub';
