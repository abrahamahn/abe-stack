// apps/server/src/infrastructure/jobs/index.ts
/**
 * Jobs Layer
 *
 * Background processing:
 * - queue: Background job processing (Chet-stack pattern)
 * - write: Unified write pattern for database operations
 */

// Queue
export {
  createMemoryQueueStore,
  createPostgresQueueStore,
  createQueueServer,
  MemoryQueueStore,
  PostgresQueueStore,
  QueueServer,
  type QueueConfig,
  type QueueServerOptions,
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
  cleanupOldLoginAttempts,
  countOldLoginAttempts,
  getLoginAttemptStats,
  getTotalLoginAttemptCount,
  DEFAULT_RETENTION_DAYS,
  MIN_RETENTION_DAYS,
  MAX_BATCH_SIZE,
  type CleanupOptions,
  type CleanupResult,
} from './scheduled';
