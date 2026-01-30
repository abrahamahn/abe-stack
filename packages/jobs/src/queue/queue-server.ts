// packages/jobs/src/queue/queue-server.ts
/**
 * Queue Server
 *
 * Background job processor with polling, retries, and exponential backoff.
 * Adopted from Chet-stack's QueueServer pattern.
 *
 * Features:
 * - Polling-based job processing
 * - Configurable retry with exponential backoff
 * - Graceful shutdown
 * - Error serialization for debugging
 */

import type { QueueConfig, QueueStore, Task, TaskError, TaskHandler, TaskHandlers } from './types';

// ============================================================================
// Logger Interface
// ============================================================================

/**
 * Minimal logger interface for queue server.
 * Compatible with any structured logger (Fastify, Pino, etc.)
 */
interface Logger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string | Error, data?: Record<string, unknown>): void;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: Required<QueueConfig> = {
  pollIntervalMs: 1000,
  defaultMaxAttempts: 3,
  backoffBaseMs: 1000,
  maxBackoffMs: 300_000, // 5 minutes
};

// ============================================================================
// Queue Server
// ============================================================================

export interface QueueServerOptions {
  store: QueueStore;
  handlers: TaskHandlers;
  config?: QueueConfig;
  log?: Logger;
}

export class QueueServer {
  private store: QueueStore;
  private handlers: TaskHandlers;
  private config: Required<QueueConfig>;
  private log?: Logger;
  private running = false;
  private stopPromise: Promise<void> | null = null;
  private stopResolve: (() => void) | null = null;
  private sleepAbortController: AbortController | null = null;

  constructor(options: QueueServerOptions) {
    this.store = options.store;
    this.handlers = options.handlers;
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    if (options.log !== undefined) {
      this.log = options.log;
    }
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Start processing jobs
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.stopPromise = new Promise((resolve) => {
      this.stopResolve = resolve;
    });

    this.log?.info('Queue server started');
    void this.poll();
  }

  /**
   * Stop processing jobs (gracefully waits for current job)
   */
  async stop(): Promise<void> {
    if (!this.running) return;

    this.running = false;
    this.log?.info('Queue server stopping...');

    // Abort any pending sleep
    if (this.sleepAbortController !== null) {
      this.sleepAbortController.abort();
      this.sleepAbortController = null;
    }

    if (this.stopPromise !== null) {
      await this.stopPromise;
    }

    this.log?.info('Queue server stopped');
  }

  /**
   * Enqueue a new task
   */
  async enqueue(
    name: string,
    args: Task['args'],
    options?: { scheduledAt?: Date; maxAttempts?: number },
  ): Promise<string> {
    const taskId = crypto.randomUUID();
    const now = new Date().toISOString();

    const task: Task = {
      id: taskId,
      name,
      args,
      scheduledAt: options?.scheduledAt?.toISOString() ?? now,
      attempts: 0,
      maxAttempts: options?.maxAttempts ?? this.config.defaultMaxAttempts,
      createdAt: now,
    };

    await this.store.enqueue(task);
    this.log?.debug(`Task enqueued: ${name}`, { taskId });

    return taskId;
  }

  /**
   * Get queue stats
   */
  async getStats(): Promise<{ pending: number; failed: number }> {
    const [pending, failed] = await Promise.all([
      this.store.getPendingCount(),
      this.store.getFailedCount(),
    ]);
    return { pending, failed };
  }

  // ==========================================================================
  // Internal
  // ==========================================================================

  private async poll(): Promise<void> {
    while (this.running) {
      try {
        const now = new Date().toISOString();
        const task = await this.store.dequeue(now);

        if (task !== null) {
          await this.processTask(task);
        } else {
          // No tasks available, wait before polling again
          await this.sleep(this.config.pollIntervalMs);
        }
      } catch (error) {
        this.log?.error('Queue poll error', { error: serializeError(error) });
        await this.sleep(this.config.pollIntervalMs);
      }
    }

    // Signal that polling has stopped
    this.stopResolve?.();
  }

  private async processTask(task: Task): Promise<void> {
    const handler = this.handlers[task.name] as TaskHandler | undefined;
    const startTime = Date.now();

    if (handler === undefined) {
      this.log?.error(`No handler for task: ${task.name}`, { taskId: task.id });
      await this.store.fail(task.id, {
        name: 'UnknownTaskError',
        message: `No handler registered for task: ${task.name}`,
      });
      return;
    }

    try {
      this.log?.debug(`Processing task: ${task.name}`, { taskId: task.id, attempt: task.attempts });

      await handler(task.args);

      const durationMs = Date.now() - startTime;
      await this.store.complete(task.id, {
        taskId: task.id,
        success: true,
        completedAt: new Date().toISOString(),
        durationMs,
      });

      this.log?.debug(`Task completed: ${task.name}`, { taskId: task.id, durationMs });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      const taskError = serializeError(error);

      this.log?.warn(`Task failed: ${task.name}`, {
        taskId: task.id,
        attempt: task.attempts,
        error: taskError,
        durationMs,
      });

      if (task.attempts < task.maxAttempts) {
        // Schedule retry with exponential backoff
        const delay = this.calculateBackoff(task.attempts);
        const nextAttemptAt = new Date(Date.now() + delay).toISOString();

        this.log?.debug(`Task scheduled for retry: ${task.name}`, {
          taskId: task.id,
          nextAttempt: task.attempts + 1,
          delayMs: delay,
        });

        await this.store.fail(task.id, taskError, nextAttemptAt);
      } else {
        // Max attempts reached, permanent failure
        this.log?.error(`Task permanently failed: ${task.name}`, {
          taskId: task.id,
          attempts: task.attempts,
          error: taskError,
        });

        await this.store.fail(task.id, taskError);
      }
    }
  }

  private calculateBackoff(attempt: number): number {
    // Exponential backoff: base * 2^(attempt-1) with jitter
    const exponentialDelay = this.config.backoffBaseMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
    return Math.min(exponentialDelay + jitter, this.config.maxBackoffMs);
  }

  private sleep(ms: number): Promise<void> {
    this.sleepAbortController = new AbortController();
    const signal = this.sleepAbortController.signal;

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.sleepAbortController = null;
        resolve();
      }, ms);

      signal.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        this.sleepAbortController = null;
        resolve();
      });
    });
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Serialize an error for storage
 */
function serializeError(error: unknown): TaskError {
  if (error instanceof Error) {
    const taskError: TaskError = {
      name: error.name,
      message: error.message,
    };
    if (error.stack !== undefined) {
      taskError.stack = error.stack;
    }
    return taskError;
  }

  return {
    name: 'UnknownError',
    message: String(error),
  };
}

// ============================================================================
// Factory
// ============================================================================

export function createQueueServer(options: QueueServerOptions): QueueServer {
  return new QueueServer(options);
}
