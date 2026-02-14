// main/server/db/src/queue/types/queue-types.ts
/**
 * Queue Types
 *
 * Type definitions for the background job queue system.
 * Adopted from Chet-stack's QueueServer pattern.
 *
 * Monitoring types (JobStatus, JobDetails, QueueStats, etc.) are imported
 * from @abe-stack/shared to enforce DRY.
 */

import type {
  JobDetails as SharedJobDetails,
  JobError,
  JobListQuery,
  JobListResponse,
  JobStatus,
  QueueStats,
} from '@abe-stack/shared';

// Re-export shared types for consumers that import from queue-types
export type { JobStatus, QueueStats };

/** Alias: shared uses JobListQuery, queue uses JobListOptions */
export type JobListOptions = JobListQuery;

/** Alias: shared uses JobListResponse, queue uses JobListResult */
export type JobListResult = JobListResponse;

/** Alias: shared uses JobError, queue uses TaskError (same shape) */
export type TaskError = JobError;

/**
 * JobDetails with TaskError alias for queue compatibility.
 * Shared defines error as JobError; structurally identical to TaskError.
 */
export type JobDetails = SharedJobDetails;

// ============================================================================
// Task Types
// ============================================================================

/**
 * Base task definition
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

// TaskError is aliased from shared's JobError (see imports above)

// ============================================================================
// Handler Types
// ============================================================================

/**
 * Task handler function signature
 */
export type TaskHandler<TArgs = unknown> = (args: TArgs) => Promise<void>;

/**
 * Registry of task handlers
 */
export type TaskHandlers = Record<string, TaskHandler>;

// ============================================================================
// Queue Configuration
// ============================================================================

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
 * Storage interface for the queue
 * Can be implemented with Postgres or in-memory
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

// Job monitoring types (JobStatus, JobDetails, JobListOptions, JobListResult,
// QueueStats) are imported from @abe-stack/shared — see top of file.
