// backend/db/src/index.ts
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
  BILLING_EVENTS_TABLE,
  // Billing
  BILLING_EVENT_COLUMNS,
  BILLING_EVENT_TYPES,
  BILLING_PROVIDERS,
  CUSTOMER_MAPPINGS_TABLE,
  CUSTOMER_MAPPING_COLUMNS,
  // Push
  DEFAULT_QUIET_HOURS,
  DEFAULT_TYPE_PREFERENCES,
  EMAIL_VERIFICATION_TOKENS_TABLE,
  // Auth
  EMAIL_VERIFICATION_TOKEN_COLUMNS,
  INVOICES_TABLE,
  INVOICE_COLUMNS,
  INVOICE_STATUSES,
  LOGIN_ATTEMPTS_TABLE,
  LOGIN_ATTEMPT_COLUMNS,
  MAGIC_LINK_TOKENS_TABLE,
  // Magic Link
  MAGIC_LINK_TOKEN_COLUMNS,
  NOTIFICATION_PREFERENCES_TABLE,
  NOTIFICATION_PREFERENCE_COLUMNS,
  OAUTH_CONNECTIONS_TABLE,
  OAUTH_CONNECTION_COLUMNS,
  OAUTH_PROVIDERS,
  PASSWORD_RESET_TOKENS_TABLE,
  PASSWORD_RESET_TOKEN_COLUMNS,
  PAYMENT_METHODS_TABLE,
  PAYMENT_METHOD_COLUMNS,
  PAYMENT_METHOD_TYPES,
  PLANS_TABLE,
  PLAN_COLUMNS,
  PLAN_INTERVALS,
  PUSH_SUBSCRIPTIONS_TABLE,
  PUSH_SUBSCRIPTION_COLUMNS,
  REFRESH_TOKENS_TABLE,
  REFRESH_TOKEN_COLUMNS,
  REFRESH_TOKEN_FAMILIES_TABLE,
  REFRESH_TOKEN_FAMILY_COLUMNS,
  SECURITY_EVENTS_TABLE,
  SECURITY_EVENT_COLUMNS,
  SUBSCRIPTIONS_TABLE,
  SUBSCRIPTION_COLUMNS,
  SUBSCRIPTION_STATUSES,
  USERS_TABLE,
  USER_COLUMNS,
  type BillingEvent,
  type BillingEventType,
  type BillingProvider,
  type CardDetails,
  type CustomerMapping,
  type EmailVerificationToken,
  type Invoice,
  type InvoiceStatus,
  type LoginAttempt,
  type MagicLinkToken,
  type NewBillingEvent,
  type NewCustomerMapping,
  type NewEmailVerificationToken,
  type NewInvoice,
  type NewLoginAttempt,
  type NewMagicLinkToken,
  type NewNotificationPreference,
  // OAuth
  type NewOAuthConnection,
  type NewPasswordResetToken,
  type NewPaymentMethod,
  type NewPlan,
  type NewPushSubscription,
  // Users
  type NewRefreshToken,
  type NewRefreshTokenFamily,
  type NewSecurityEvent,
  type NewSubscription,
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
  type TypePreferences,
  type UpdateInvoice,
  type UpdateOAuthConnection,
  type UpdatePaymentMethod,
  type UpdatePlan,
  type UpdateSubscription,
  type UpdateUser,
  type User,
  type UserRole,
} from './schema';

// Repositories (functional-style)
export {
  // Billing
  createBillingEventRepository,
  createCustomerMappingRepository,
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
  // Auth
  createRefreshTokenRepository,
  createSecurityEventRepository,
  createSubscriptionRepository,
  // Users
  createUserRepository,
  type AdminUserListFilters,
  type BillingEventRepository,
  type CustomerMappingRepository,
  type EmailVerificationTokenRepository,
  type InvoiceFilters,
  type InvoiceRepository,
  type LoginAttemptRepository,
  type MagicLinkTokenRepository,
  type NotificationPreferenceRepository,
  type OAuthConnectionRepository,
  // Common types
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
  REQUIRED_TABLES,
  SchemaValidationError,
  getExistingTables,
  requireValidSchema,
  validateSchema,
  type RequiredTable,
  type SchemaValidationResult,
} from './validation';

// Utils
export {
  buildColumnList,
  buildInsertClause,
  buildSetClause,
  camelToSnake,
  camelizeKeys,
  formatDate,
  formatJsonb,
  parseJsonb,
  snakeToCamel,
  snakeifyKeys,
  toCamelCase,
  toCamelCaseArray,
  toSnakeCase,
  type ColumnMapping,
} from './utils';

export { RateLimiter, type RateLimitConfig, type RateLimitInfo } from './utils/rate-limiter';

export {
  createRouteMap,
  protectedRoute,
  publicRoute,
  registerRouteMap,
  type AuthGuardFactory,
  type HandlerContext,
  type RouteDefinition,
  type RouteMap,
  type RouteResult,
  type RouteSchema,
  type ValidationSchema,
} from './utils/routing';

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
  OptimisticLockError,
  isOptimisticLockError,
  updateUserWithVersion,
} from './utils/optimistic-lock';

// Write Queue
export { PostgresQueueStore, createPostgresQueueStore } from './write/postgres-store';

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
} from './write/queue-types';

// PubSub
export { PostgresPubSub } from './pubsub/postgres-pubsub';
