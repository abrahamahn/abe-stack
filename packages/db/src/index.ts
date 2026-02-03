// packages/db/src/index.ts
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
  // Users
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
  // Auth
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
  // Magic Link
  MAGIC_LINK_TOKEN_COLUMNS,
  MAGIC_LINK_TOKENS_TABLE,
  type MagicLinkToken,
  type NewMagicLinkToken,
  // OAuth
  type NewOAuthConnection,
  OAUTH_CONNECTION_COLUMNS,
  OAUTH_CONNECTIONS_TABLE,
  OAUTH_PROVIDERS,
  type OAuthConnection,
  type OAuthProvider,
  type UpdateOAuthConnection,
  // Push
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
  // Billing
  BILLING_EVENT_COLUMNS,
  BILLING_EVENTS_TABLE,
  BILLING_EVENT_TYPES,
  BILLING_PROVIDERS,
  type BillingEvent,
  type BillingEventType,
  type BillingProvider,
  type CardDetails,
  CUSTOMER_MAPPING_COLUMNS,
  CUSTOMER_MAPPINGS_TABLE,
  type CustomerMapping,
  INVOICE_COLUMNS,
  INVOICE_STATUSES,
  INVOICES_TABLE,
  type Invoice,
  type InvoiceStatus,
  type NewBillingEvent,
  type NewCustomerMapping,
  type NewInvoice,
  type NewPaymentMethod,
  type NewPlan,
  type NewSubscription,
  PAYMENT_METHOD_COLUMNS,
  PAYMENT_METHOD_TYPES,
  PAYMENT_METHODS_TABLE,
  type PaymentMethod,
  type PaymentMethodType,
  PLAN_COLUMNS,
  PLAN_INTERVALS,
  PLANS_TABLE,
  type Plan,
  type PlanFeature,
  type PlanInterval,
  SUBSCRIPTION_COLUMNS,
  SUBSCRIPTION_STATUSES,
  SUBSCRIPTIONS_TABLE,
  type Subscription,
  type SubscriptionStatus,
  type UpdateInvoice,
  type UpdatePaymentMethod,
  type UpdatePlan,
  type UpdateSubscription,
} from './schema';

// Repositories (functional-style)
export {
  // Users
  createUserRepository,
  type AdminUserListFilters,
  type PaginatedUserResult,
  type UserRepository,
  // Auth
  createRefreshTokenRepository,
  createRefreshTokenFamilyRepository,
  createLoginAttemptRepository,
  createPasswordResetTokenRepository,
  createEmailVerificationTokenRepository,
  createSecurityEventRepository,
  type RefreshTokenRepository,
  type RefreshTokenFamilyRepository,
  type LoginAttemptRepository,
  type PasswordResetTokenRepository,
  type EmailVerificationTokenRepository,
  type SecurityEventRepository,
  // Magic Link
  createMagicLinkTokenRepository,
  type MagicLinkTokenRepository,
  // OAuth
  createOAuthConnectionRepository,
  type OAuthConnectionRepository,
  // Push
  createPushSubscriptionRepository,
  createNotificationPreferenceRepository,
  type PushSubscriptionRepository,
  type NotificationPreferenceRepository,
  // Billing
  createBillingEventRepository,
  createCustomerMappingRepository,
  createInvoiceRepository,
  createPaymentMethodRepository,
  createPlanRepository,
  createSubscriptionRepository,
  type BillingEventRepository,
  type CustomerMappingRepository,
  type InvoiceFilters,
  type InvoiceRepository,
  type PaymentMethodRepository,
  type PlanRepository,
  type SubscriptionFilters,
  type SubscriptionRepository,
  // Common types
  type PaginatedResult,
  type PaginationOptions,
  type TimeRangeFilter,
  // Legacy class-based
  BaseRepository,
  type RepositoryConfig,
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
  requireValidSchema,
  REQUIRED_TABLES,
  type RequiredTable,
  SchemaValidationError,
  type SchemaValidationResult,
  validateSchema,
} from './validation';

// Utils
export {
  buildColumnList,
  buildInsertClause,
  buildSetClause,
  camelizeKeys,
  camelToSnake,
  type ColumnMapping,
  formatDate,
  formatJsonb,
  parseJsonb,
  snakeifyKeys,
  snakeToCamel,
  toCamelCase,
  toCamelCaseArray,
  toSnakeCase,
} from './utils';

// Builder
export {
  and,
  deleteFrom,
  eq,
  escapeIdentifier,
  gt,
  gte,
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
export { isOptimisticLockError, OptimisticLockError, updateUserWithVersion } from './utils/optimistic-lock';
