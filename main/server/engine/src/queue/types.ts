// main/server/engine/src/queue/types.ts
/**
 * Queue & Write Types
 *
 * Type definitions for the background job queue system and unified write pattern.
 * Queue infrastructure types imported from @bslt/db (canonical source).
 * Write operation types are engine-specific.
 *
 * @module @bslt/server-engine/queue
 */

// Re-export all queue types from db (which re-exports monitoring types from shared)
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
} from '@bslt/db';

// ============================================================================
// Write Operation Types
// ============================================================================

/**
 * Supported write operation types
 */
export type OperationType = 'create' | 'update' | 'delete';

/**
 * A single write operation
 *
 * @param T - Type of the record data
 */
export interface WriteOperation<T = unknown> {
  /** Operation type */
  type: OperationType;
  /** Table name */
  table: string;
  /** Record ID */
  id: string;
  /** Record data (for create/update) */
  data?: T;
  /** Expected version for optimistic locking (for update/delete) */
  expectedVersion?: number;
}

/**
 * A batch of operations to execute atomically
 */
export interface WriteBatch {
  /** Unique transaction ID */
  txId: string;
  /** User ID performing the write */
  authorId: string;
  /** Operations to execute */
  operations: WriteOperation[];
}

// ============================================================================
// Write Result Types
// ============================================================================

/**
 * Result of a single operation
 *
 * @param T - Type of the record data
 */
export interface OperationResult<T = unknown> {
  /** Operation that was executed */
  operation: WriteOperation<T>;
  /** Resulting record (undefined for delete) */
  record?: T & { id: string; version: number };
  /** Previous version (for undo support) */
  previousVersion?: number;
}

/**
 * Result of a write batch
 *
 * @param T - Type of the record data
 */
export interface WriteResult<T = unknown> {
  /** Transaction ID */
  txId: string;
  /** Whether all operations succeeded */
  success: boolean;
  /** Results for each operation */
  results: OperationResult<T>[];
  /** Error if failed */
  error?: WriteError;
}

/**
 * Write error with details
 */
export interface WriteError {
  /** Error code */
  code: 'VALIDATION' | 'PERMISSION' | 'CONFLICT' | 'NOT_FOUND' | 'INTERNAL';
  /** Human-readable message */
  message: string;
  /** Which operation failed */
  operationIndex?: number;
  /** Additional details */
  details?: Record<string, unknown>;
}

// ============================================================================
// Write Context Types
// ============================================================================

/**
 * Write context for hooks
 */
export interface WriteContext {
  /** Transaction ID */
  txId: string;
  /** User performing the write */
  authorId: string;
  /** Timestamp of the write */
  timestamp: Date;
}

// ============================================================================
// Write Hook Types
// ============================================================================

/**
 * Hook called before validation
 *
 * @param T - Type of the record data
 */
export type BeforeValidateHook<T = unknown> = (
  operation: WriteOperation<T>,
  ctx: WriteContext,
) => Promise<WriteOperation<T>>;

/**
 * Hook called after successful write
 *
 * @param T - Type of the record data
 */
export type AfterWriteHook<T = unknown> = (
  result: OperationResult<T>,
  ctx: WriteContext,
) => Promise<void>;

/**
 * Write hooks configuration
 */
export interface WriteHooks {
  beforeValidate?: BeforeValidateHook[];
  afterWrite?: AfterWriteHook[];
}
