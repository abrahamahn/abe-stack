// packages/backend-core/src/queue/types.ts
/**
 * Queue & Write Types
 *
 * Type definitions for the background job queue system and unified write pattern.
 * Adopted from Chet-stack's QueueServer and transaction-aware write patterns.
 *
 * @module @abe-stack/backend-core/queue
 */

// ============================================================================
// Task Types
// ============================================================================

/**
 * Base task definition
 *
 * @param TName - Task name type
 * @param TArgs - Task arguments type
 */
export interface Task<TName extends string = string, TArgs = unknown> {
  /** Unique task ID */
  id: string;
  /** Task name (maps to handler) */
  name: TName;
  /** Task arguments */
  args: TArgs;
  /** When to run (ISO string) */
  scheduledAt: string;
  /** Number of attempts so far */
  attempts: number;
  /** Max retry attempts */
  maxAttempts: number;
  /** Created timestamp */
  createdAt: string;
}

/**
 * Task result after completion
 */
export interface TaskResult {
  /** Task ID */
  taskId: string;
  /** Success status */
  success: boolean;
  /** Error details if failed */
  error?: TaskError;
  /** Completion timestamp */
  completedAt: string;
  /** Duration in ms */
  durationMs: number;
}

/**
 * Serialized error for storage
 */
export interface TaskError {
  name: string;
  message: string;
  stack?: string;
}

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Task handler function signature
 *
 * @param TArgs - Type of the task arguments
 */
export type TaskHandler<TArgs = unknown> = (args: TArgs) => Promise<void>;

/**
 * Registry of task handlers
 */
export type TaskHandlers = Record<string, TaskHandler>;

// ============================================================================
// Queue Configuration
// ============================================================================

/**
 * Configuration for the queue server
 */
export interface QueueConfig {
  /** Polling interval in ms (default: 1000) */
  pollIntervalMs?: number;
  /** Default max attempts for tasks (default: 3) */
  defaultMaxAttempts?: number;
  /** Base delay for exponential backoff in ms (default: 1000) */
  backoffBaseMs?: number;
  /** Max backoff delay in ms (default: 300000 = 5 min) */
  maxBackoffMs?: number;
}

// ============================================================================
// Queue Store Interface
// ============================================================================

/**
 * Storage interface for the queue.
 * Can be implemented with Postgres or in-memory.
 */
export interface QueueStore {
  /** Enqueue a new task */
  enqueue(task: Task): Promise<void>;

  /** Dequeue the next ready task (returns null if none) */
  dequeue(now: string): Promise<Task | null>;

  /** Mark task as completed */
  complete(taskId: string, result: TaskResult): Promise<void>;

  /** Mark task as failed (will retry if attempts < maxAttempts) */
  fail(taskId: string, error: TaskError, nextAttemptAt?: string): Promise<void>;

  /** Get task by ID */
  get(taskId: string): Promise<Task | null>;

  /** Get pending task count */
  getPendingCount(): Promise<number>;

  /** Get failed task count */
  getFailedCount(): Promise<number>;

  /** Clear all completed tasks older than given date */
  clearCompleted(before: string): Promise<number>;

  /** List jobs with filtering and pagination (for monitoring) */
  listJobs?(options: JobListOptions): Promise<JobListResult>;

  /** Get detailed job information by ID */
  getJobDetails?(taskId: string): Promise<JobDetails | null>;

  /** Get queue statistics */
  getQueueStats?(): Promise<QueueStats>;

  /** Retry a failed job */
  retryJob?(taskId: string): Promise<boolean>;

  /** Cancel a pending or processing job */
  cancelJob?(taskId: string): Promise<boolean>;

  /** Move job to dead letter queue */
  moveToDeadLetter?(taskId: string, reason: string): Promise<boolean>;
}

// ============================================================================
// Job Monitoring Types
// ============================================================================

/**
 * Job status values
 */
export type JobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'dead_letter'
  | 'cancelled';

/**
 * Detailed job information for monitoring
 */
export interface JobDetails {
  id: string;
  name: string;
  args: unknown;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
  error: TaskError | null;
  deadLetterReason?: string | null;
}

/**
 * Options for listing jobs
 */
export interface JobListOptions {
  status?: JobStatus;
  name?: string;
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'scheduledAt' | 'completedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated job list result
 */
export interface JobListResult {
  data: JobDetails[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  totalPages: number;
}

/**
 * Queue statistics for monitoring dashboard
 */
export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
  total: number;
  /** Failure rate as a percentage (0-100) */
  failureRate: number;
  /** Jobs processed in the last hour */
  recentCompleted: number;
  /** Jobs failed in the last hour */
  recentFailed: number;
}

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
