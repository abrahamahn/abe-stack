// infra/db/src/index.ts
/**
 * @abe-stack/db - Type-safe SQL Query Builder for PostgreSQL
 *
 * A lightweight, parameterized SQL query builder that provides:
 * - Fluent API for SELECT, INSERT, UPDATE, DELETE
 * - Type-safe condition helpers (eq, and, or, etc.)
 * - SQL injection prevention (all values parameterized)
 * - Raw PostgreSQL client wrapper with transactions
 *
 * @example
 * import { createRawDb, select, insert, eq, and } from '@abe-stack/db';
 *
 * const db = createRawDb('postgres://localhost/mydb');
 *
 * // Select with conditions
 * const users = await db.query<User>(
 *   select('users')
 *     .columns('id', 'email', 'name')
 *     .where(and(eq('active', true), gt('age', 18)))
 *     .orderBy('created_at', 'desc')
 *     .limit(10)
 *     .toSql()
 * );
 *
 * // Insert with returning
 * const [newUser] = await db.query<User>(
 *   insert('users')
 *     .values({ email: 'user@example.com', name: 'John' })
 *     .returning('id', 'created_at')
 *     .toSql()
 * );
 *
 * // Transaction
 * await db.transaction(async (tx) => {
 *   await tx.execute(update('accounts').set({ balance: 0 }).where(eq('id', accountId)).toSql());
 *   await tx.execute(insert('audit_log').values({ action: 'reset' }).toSql());
 * });
 */

// Builder exports
export {
  // Types
  combine,
  EMPTY_FRAGMENT,
  escapeIdentifier,
  formatTable,
  fragment,
  param,
  raw,
  type ColumnSpec,
  type DbValue,
  type JoinSpec,
  type QueryBuilder,
  type QueryResult,
  type SortDirection,
  type SortSpec,
  type SqlFragment,
  type TableSpec,
  // Conditions
  and,
  any,
  arrayContains,
  arrayOverlaps,
  between,
  colEq,
  contains,
  endsWith,
  eq,
  escapeLikePattern,
  exists,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  jsonbContainedBy,
  jsonbContains,
  jsonbEq,
  jsonbHasAllKeys,
  jsonbHasAnyKey,
  jsonbHasKey,
  jsonbPath,
  jsonbPathEq,
  jsonbPathText,
  like,
  lt,
  lte,
  ne,
  not,
  notBetween,
  notExists,
  notIlike,
  notInArray,
  notLike,
  or,
  rawCondition,
  startsWith,
  // Builders
  select,
  selectCount,
  SelectBuilder,
  selectExists,
  insert,
  InsertBuilder,
  update,
  UpdateBuilder,
  del,
  deleteFrom,
  DeleteBuilder,
  truncate,
  truncateCascade,
  // Window Functions
  arrayAgg,
  avg,
  count,
  cumeDist,
  denseRank,
  emptyWindow,
  firstValue,
  lag,
  lastValue,
  lead,
  max,
  min,
  nthValue,
  ntile,
  orderBy,
  partitionBy,
  percentRank,
  rank,
  rowNumber,
  stringAgg,
  sum,
  type AggregateFunction,
  type AliasedWindowExpr,
  type FrameBound,
  type WindowExpr,
  type WindowFunction,
  type WindowSpec,
  // CTEs
  withCte,
  withRecursiveCte,
  type CteBuilder,
  type CteDeleteBuilder,
  type CteInsertBuilder,
  type CteSelectBuilder,
  type CteUpdateBuilder,
} from './builder/index';

// Client exports
export {
  buildConnectionString,
  canReachDatabase,
  createRawDb,
  resolveConnectionStringWithFallback,
  type DbConfig,
  type IsolationLevel,
  type QueryOptions,
  type RawDb,
  type TransactionOptions,
} from './client';

// Schema type exports
export {
  // Table names
  EMAIL_VERIFICATION_TOKENS_TABLE,
  LOGIN_ATTEMPTS_TABLE,
  MAGIC_LINK_TOKENS_TABLE,
  NOTIFICATION_PREFERENCES_TABLE,
  OAUTH_CONNECTIONS_TABLE,
  PASSWORD_RESET_TOKENS_TABLE,
  PUSH_SUBSCRIPTIONS_TABLE,
  REFRESH_TOKEN_FAMILIES_TABLE,
  REFRESH_TOKENS_TABLE,
  SECURITY_EVENTS_TABLE,
  USERS_TABLE,
  // Column mappings
  EMAIL_VERIFICATION_TOKEN_COLUMNS,
  LOGIN_ATTEMPT_COLUMNS,
  MAGIC_LINK_TOKEN_COLUMNS,
  NOTIFICATION_PREFERENCE_COLUMNS,
  OAUTH_CONNECTION_COLUMNS,
  PASSWORD_RESET_TOKEN_COLUMNS,
  PUSH_SUBSCRIPTION_COLUMNS,
  REFRESH_TOKEN_COLUMNS,
  REFRESH_TOKEN_FAMILY_COLUMNS,
  SECURITY_EVENT_COLUMNS,
  USER_COLUMNS,
  // Constants
  DEFAULT_QUIET_HOURS,
  DEFAULT_TYPE_PREFERENCES,
  OAUTH_PROVIDERS,
  // User types
  type NewUser,
  type UpdateUser,
  type User,
  type UserRole,
  // Refresh token types
  type NewRefreshToken,
  type RefreshToken,
  // Auth types
  type EmailVerificationToken,
  type LoginAttempt,
  type NewEmailVerificationToken,
  type NewLoginAttempt,
  type NewPasswordResetToken,
  type NewRefreshTokenFamily,
  type NewSecurityEvent,
  type PasswordResetToken,
  type RefreshTokenFamily,
  type SecurityEvent,
  type SecurityEventSeverity,
  type SecurityEventType,
  // Magic link types
  type MagicLinkToken,
  type NewMagicLinkToken,
  // OAuth types
  type NewOAuthConnection,
  type OAuthConnection,
  type OAuthProvider,
  type UpdateOAuthConnection,
  // Push notification types
  type NewNotificationPreference,
  type NewPushSubscription,
  type NotificationChannel,
  type NotificationPreference,
  type NotificationType,
  type PushSubscription,
  type QuietHoursConfig,
  type TypePreferences,
  // Billing table names
  BILLING_EVENTS_TABLE,
  CUSTOMER_MAPPINGS_TABLE,
  INVOICES_TABLE,
  PAYMENT_METHODS_TABLE,
  PLANS_TABLE,
  SUBSCRIPTIONS_TABLE,
  // Billing column mappings
  BILLING_EVENT_COLUMNS,
  CUSTOMER_MAPPING_COLUMNS,
  INVOICE_COLUMNS,
  PAYMENT_METHOD_COLUMNS,
  PLAN_COLUMNS,
  SUBSCRIPTION_COLUMNS,
  // Billing constants
  BILLING_EVENT_TYPES,
  BILLING_PROVIDERS,
  INVOICE_STATUSES,
  PAYMENT_METHOD_TYPES,
  PLAN_INTERVALS,
  SUBSCRIPTION_STATUSES,
  // Billing types
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
} from './schema/index';

// Utilities
export {
  buildColumnList,
  buildInsertClause,
  buildSetClause,
  camelToSnake,
  type ColumnMapping,
  formatDate,
  formatJsonb,
  parseJsonb,
  snakeToCamel,
  toCamelCase,
  toCamelCaseArray,
  toSnakeCase,
} from './utils';

// Repositories
export {
  // Types
  type PaginatedResult,
  type PaginationOptions,
  type Repository,
  type TimeRangeFilter,
  // User
  createRefreshTokenRepository,
  createUserRepository,
  type AdminUserListFilters,
  type RefreshTokenRepository,
  type UserRepository,
  // Auth
  createEmailVerificationTokenRepository,
  createLoginAttemptRepository,
  createPasswordResetTokenRepository,
  createRefreshTokenFamilyRepository,
  createSecurityEventRepository,
  type EmailVerificationTokenRepository,
  type LoginAttemptRepository,
  type PasswordResetTokenRepository,
  type RefreshTokenFamilyRepository,
  type SecurityEventRepository,
  // Magic Link
  createMagicLinkTokenRepository,
  type MagicLinkTokenRepository,
  // OAuth
  createOAuthConnectionRepository,
  type OAuthConnectionRepository,
  // Push
  createNotificationPreferenceRepository,
  createPushSubscriptionRepository,
  type NotificationPreferenceRepository,
  type PushSubscriptionRepository,
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
} from './repositories/index';

// DbClient type and singleton factory
export { createDbClient, type DbClient } from './client';

// Repository container (factory)
export {
  closeRepositories,
  createRepositories,
  getRepositoryContext,
  type Repositories,
  type RepositoryContext,
} from './factory';

// Schema validation
export {
  getExistingTables,
  requireValidSchema,
  REQUIRED_TABLES,
  SchemaValidationError,
  validateSchema,
  type RequiredTable,
  type SchemaValidationResult,
} from './validation';

// Transaction and optimistic locking utilities
export {
  isInTransaction,
  isOptimisticLockError,
  OptimisticLockError,
  updateUserWithVersion,
  withTransaction,
} from './utils/index';

// Testing: JSON Database (development/testing only)
export {
  createJsonDbClient,
  JsonDatabase,
  JsonDbClient,
  type JsonDatabaseConfig,
} from './testing/index';

// Database configuration
export {
  buildConfigConnectionString,
  getSafeConnectionString,
  isJsonDatabase,
  isPostgres,
  loadDatabaseConfig,
} from './config/index';

// Scripts (CLI database management)
export {
  bootstrapAdmin,
  getSchemaStatements,
  pushSchema,
  seed,
  TEST_USERS,
  type PasswordHasher,
  type SeedUser,
} from './scripts/index';

// Search (SQL + Elasticsearch providers and factory)
export {
  createElasticsearchProvider,
  createSqlSearchProvider,
  ElasticsearchProvider,
  getSearchProviderFactory,
  resetSearchProviderFactory,
  SearchProviderFactory,
  SqlSearchProvider,
  type ElasticsearchProviderConfig,
  type ElasticsearchProviderOptions,
  type IndexHint,
  type ProviderOptions,
  type SearchContext,
  type SearchMetrics,
  type SearchProviderConfig,
  type SearchProviderFactoryOptions,
  type SearchProviderType,
  type SearchResultWithMetrics,
  type ServerSearchProvider,
  type SqlColumnMapping,
  type SqlCursorData,
  type SqlFilterResult,
  type SqlOperatorMap,
  type SqlOperatorTranslator,
  type SqlQueryOptions,
  type SqlSearchProviderConfig,
  type SqlSearchProviderOptions,
  type SqlTableConfig,
} from './search/index';
