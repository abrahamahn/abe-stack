// infra/jobs/src/index.ts
/**
 * Jobs Layer
 *
 * Background processing:
 * - queue: Background job processing (Chet-stack pattern)
 * - write: Unified write pattern for database operations
 * - scheduled: Maintenance and cleanup tasks
 */

// Queue
export {
  createMemoryQueueStore,
  createPostgresQueueStore,
  createQueueServer,
  MemoryQueueStore,
  PostgresQueueStore,
  QueueServer,
  type JobDetails,
  type JobListOptions,
  type JobListResult,
  type JobStatus,
  type QueueConfig,
  type QueueServerOptions,
  type QueueStats,
  type QueueStore,
  type Task,
  type TaskError,
  type TaskHandler,
  type TaskHandlers,
  type TaskResult,
} from './queue';

// Write Service
export {
  createWriteService,
  WriteService,
  type AfterWriteHook,
  type BeforeValidateHook,
  type OperationResult,
  type OperationType,
  type WriteBatch,
  type WriteContext,
  type WriteError,
  type WriteHooks,
  type WriteOperation,
  type WriteResult,
  type WriteServiceOptions,
} from './write';

// Scheduled Jobs
export {
  // Login Cleanup
  cleanupOldLoginAttempts,
  countOldLoginAttempts,
  getLoginAttemptStats,
  getTotalLoginAttemptCount,
  DEFAULT_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  MAX_BATCH_SIZE,
  type CleanupOptions,
  type CleanupResult,
  // Push Subscription Cleanup
  cleanupPushSubscriptions,
  countPushCleanupCandidates,
  getPushSubscriptionStats,
  DEFAULT_INACTIVE_DAYS,
  MIN_INACTIVE_DAYS,
  PUSH_MAX_BATCH_SIZE,
  type PushCleanupOptions,
  type PushCleanupResult,
  // Magic Link Token Cleanup
  cleanupMagicLinkTokens,
  countOldMagicLinkTokens,
  getMagicLinkTokenStats,
  getTotalMagicLinkTokenCount,
  MAGIC_LINK_DEFAULT_RETENTION_HOURS,
  MAGIC_LINK_MIN_RETENTION_HOURS,
  MAGIC_LINK_MAX_BATCH_SIZE,
  type MagicLinkCleanupOptions,
  type MagicLinkCleanupResult,
  // OAuth Token Refresh
  refreshExpiringOAuthTokens,
  countExpiringOAuthTokens,
  getOAuthTokenStats,
  OAUTH_DEFAULT_REFRESH_BEFORE_HOURS,
  OAUTH_MIN_REFRESH_BEFORE_HOURS,
  OAUTH_MAX_BATCH_SIZE,
  type OAuthTokenRefreshOptions,
  type OAuthTokenRefreshResult,
} from './scheduled';
