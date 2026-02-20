// main/server/system/src/queue/index.ts
/**
 * Queue Module
 *
 * Background job queue system with write service for atomic operations.
 * Includes in-memory store for dev/test, Postgres-backed production store,
 * and Redis store for distributed deployments.
 *
 * PostgresQueueStore and WriteService are canonical in @bslt/server-system.
 * They are re-exported from @bslt/db for backwards compatibility.
 *
 * @module @bslt/server-system/queue
 */

// ============================================================================
// Queue Server
// ============================================================================

export { createQueueServer, QueueServer, type QueueServerOptions } from './client';

// ============================================================================
// Postgres Queue Store (canonical here)
// ============================================================================

export { createPostgresQueueStore, PostgresQueueStore } from './postgres-store';

// ============================================================================
// Write Service (canonical here)
// ============================================================================

export { createWriteService, WriteService, type WriteServiceOptions } from './write-service';

// ============================================================================
// Memory Store
// ============================================================================

export { createMemoryQueueStore, MemoryQueueStore } from './memory.store';

// ============================================================================
// Redis Store
// ============================================================================

export {
  createRedisQueueStore,
  RedisQueueStore,
  type QueueLogger,
  type RedisQueueStoreOptions,
} from './redis-queue-store';

// ============================================================================
// Queue & Write Types (from @bslt/db)
// ============================================================================

export type {
  AfterWriteHook,
  BeforeValidateHook,
  JobDetails,
  JobListOptions,
  JobListResult,
  JobStatus,
  OperationResult,
  OperationType,
  QueueConfig,
  QueueStats,
  QueueStore,
  Task,
  TaskError,
  TaskHandler,
  TaskHandlers,
  TaskResult,
  WriteBatch,
  WriteContext,
  WriteError,
  WriteHooks,
  WriteOperation,
  WriteResult,
} from '@bslt/db';
