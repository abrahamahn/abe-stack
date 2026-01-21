// apps/server/src/infrastructure/jobs/queue/types.ts
/**
 * Queue Types
 *
 * Type definitions for the background job queue system.
 * Adopted from Chet-stack's QueueServer pattern.
 */

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
 * Can be implemented with Postgres, Redis, or in-memory
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
}
