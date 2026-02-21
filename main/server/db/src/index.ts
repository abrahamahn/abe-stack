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
export * from './schema';

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
  createUsageMetricRepository,
  createUsageSnapshotRepository,
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
  type UsageMetricRepository,
  type UsageSnapshotRepository,
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
export {
  isOptimisticLockError,
  OptimisticLockError,
  updateUserWithVersion,
} from './utils/optimistic-lock';

// Queue
export {
  createPostgresQueueStore,
  PostgresQueueStore,
  WriteService,
  createWriteService,
} from './queue';

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
export type { PostgresPubSubOptions, PubSubMessage } from './pubsub';

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
} from './search/types';
