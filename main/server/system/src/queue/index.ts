// main/server/system/src/queue/index.ts
/**
 * Queue Module
 *
 * Background job queue system with write service for atomic operations.
 * Includes in-memory store for dev/test and supports Postgres-backed production stores.
 *
 * @module @bslt/server-system/queue
 */

// ============================================================================
// Queue Server
// ============================================================================

export { createQueueServer, QueueServer, type QueueServerOptions } from './client';

// ============================================================================
// Write Service
// ============================================================================

export { createWriteService, WriteService, type WriteServiceOptions } from './writer';

// ============================================================================
// Memory Store
// ============================================================================

export { createMemoryQueueStore, MemoryQueueStore } from './memory-store';

// ============================================================================
// Queue Types
// ============================================================================

export type {
  JobDetails,
  JobListOptions,
  JobListResult,
  JobStatus,
  QueueConfig,
  QueueStats,
  QueueStore,
  Task,
  TaskError,
  TaskHandler,
  TaskHandlers,
  TaskResult
} from './types';

// ============================================================================
// Write Types
// ============================================================================

export type {
  AfterWriteHook,
  BeforeValidateHook,
  OperationResult,
  OperationType,
  WriteBatch,
  WriteContext,
  WriteError,
  WriteHooks,
  WriteOperation,
  WriteResult
} from './types';

