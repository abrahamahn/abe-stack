// main/server/system/src/queue/index.ts
/**
 * Queue Module
 *
 * Background job queue system with write service for atomic operations.
 * Includes in-memory store for dev/test and supports Postgres-backed production stores.
 *
 * WriteService and queue types are canonical in @bslt/db — re-exported here for
 * backwards-compatible access via @bslt/server-system.
 *
 * @module @bslt/server-system/queue
 */

// ============================================================================
// Queue Server
// ============================================================================

export { createQueueServer, QueueServer, type QueueServerOptions } from './client';

// ============================================================================
// Write Service (canonical in @bslt/db)
// ============================================================================

export { createWriteService, WriteService, type WriteServiceOptions } from '@bslt/db';

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
// Queue & Write Types (canonical in @bslt/db)
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
