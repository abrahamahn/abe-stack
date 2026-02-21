// main/server/system/src/queue/redis-queue-store.ts
/**
 * Redis Queue Store
 *
 * Redis-backed queue implementation for horizontal scaling.
 * Uses Redis lists (LPUSH/BRPOP) for job queuing, sorted sets for scheduling,
 * and includes dead letter queue support with exponential backoff retries.
 *
 * Not a drop-in replacement for MemoryQueueStore in single-instance mode,
 * but provides the same QueueStore contract for multi-instance deployments.
 *
 * @module @bslt/server-system/queue
 */

import redisConstructor, { type Redis, type RedisOptions } from 'ioredis';

import type { QueueStore, Task, TaskError, TaskResult } from '@bslt/db';

// ============================================================================
// Types
// ============================================================================

/**
 * Minimal logger interface for queue store operations.
 * Compatible with any structured logger (Fastify, Pino, etc.)
 */
export interface QueueLogger {
  debug(msg: string, data?: Record<string, unknown>): void;
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
}

/**
 * Configuration options for the Redis queue store.
 */
export interface RedisQueueStoreOptions {
  /** Redis server hostname (default: 'localhost') */
  host?: string;
  /** Redis server port (default: 6379) */
  port?: number;
  /** Redis auth password */
  password?: string;
  /** Redis database index (default: 0) */
  db?: number;
  /** Enable TLS connection */
  tls?: boolean;
  /** Connection timeout in ms (default: 5000) */
  connectTimeout?: number;
  /** Command timeout in ms (default: 3000) */
  commandTimeout?: number;
  /** Key prefix for all queue keys (default: 'queue') */
  keyPrefix?: string;
  /** Logger instance */
  logger?: QueueLogger;
  /** Existing ioredis client to reuse (skips internal connection) */
  client?: Redis;
  /** Base delay for exponential backoff in ms (default: 1000) */
  backoffBaseMs?: number;
  /** Maximum backoff delay in ms (default: 300000 = 5 min) */
  maxBackoffMs?: number;
}

/**
 * Internal representation of a stored task with status metadata.
 */
interface StoredTask extends Task {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead_letter';
  error?: TaskError;
  completedAt?: string;
  durationMs?: number;
  deadLetterReason?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_HOST = 'localhost';
const DEFAULT_PORT = 6379;
const DEFAULT_KEY_PREFIX = 'queue';
const DEFAULT_CONNECT_TIMEOUT = 5000;
const DEFAULT_COMMAND_TIMEOUT = 3000;
const DEFAULT_BACKOFF_BASE_MS = 1000;
const DEFAULT_MAX_BACKOFF_MS = 300_000; // 5 minutes
const MAX_RETRY_ATTEMPTS = 3;

// ============================================================================
// Redis Queue Store Implementation
// ============================================================================

/**
 * Redis-backed queue store using lists for FIFO ordering and sorted sets
 * for scheduled/delayed jobs.
 *
 * Key layout:
 * - `{prefix}:task:{taskId}`     — Hash/string storing the full task JSON
 * - `{prefix}:ready`             — List of task IDs ready for immediate processing
 * - `{prefix}:scheduled`         — Sorted set of task IDs scored by scheduledAt timestamp
 * - `{prefix}:processing`        — Set of task IDs currently being processed
 * - `{prefix}:dead_letter`       — List of task IDs in the dead letter queue
 */
export class RedisQueueStore implements QueueStore {
  private readonly client: Redis;
  private readonly ownsClient: boolean;
  private readonly keyPrefix: string;
  private readonly logger: QueueLogger | undefined;
  private readonly backoffBaseMs: number;
  private readonly maxBackoffMs: number;
  private closed = false;

  constructor(options: RedisQueueStoreOptions = {}) {
    this.keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX;
    this.logger = options.logger;
    this.backoffBaseMs = options.backoffBaseMs ?? DEFAULT_BACKOFF_BASE_MS;
    this.maxBackoffMs = options.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;

    if (options.client !== undefined) {
      this.client = options.client;
      this.ownsClient = false;
    } else {
      const redisOptions: RedisOptions = {
        host: options.host ?? DEFAULT_HOST,
        port: options.port ?? DEFAULT_PORT,
        db: options.db ?? 0,
        connectTimeout: options.connectTimeout ?? DEFAULT_CONNECT_TIMEOUT,
        commandTimeout: options.commandTimeout ?? DEFAULT_COMMAND_TIMEOUT,
        retryStrategy: (times: number): number | null => {
          if (times > MAX_RETRY_ATTEMPTS) return null;
          return Math.min(times * 200, 2000);
        },
        lazyConnect: true,
      };

      if (options.password !== undefined) {
        redisOptions.password = options.password;
      }

      if (options.tls === true) {
        redisOptions.tls = {};
      }

      this.client = new redisConstructor(redisOptions);
      this.ownsClient = true;

      this.client.on('error', (err: Error) => {
        this.logger?.error('Redis queue store connection error', { error: err.message });
      });

      this.client.on('connect', () => {
        this.logger?.debug('Redis queue store connected', {
          host: options.host ?? DEFAULT_HOST,
          port: options.port ?? DEFAULT_PORT,
        });
      });

      // Eagerly connect
      this.client.connect().catch((err: unknown) => {
        const error = err instanceof Error ? err : new Error(String(err));
        this.logger?.error('Redis queue store initial connection failed', {
          error: error.message,
        });
      });
    }
  }

  // --------------------------------------------------------------------------
  // QueueStore Interface — Core Operations
  // --------------------------------------------------------------------------

  /**
   * Enqueue a new task.
   *
   * If the task carries an idempotency key that has already been seen, the
   * enqueue is silently skipped (SET NX is used to atomically guard the key).
   *
   * If the task's scheduledAt is in the future, it is placed in the scheduled
   * sorted set. Otherwise it is pushed directly to the ready list.
   */
  async enqueue(task: Task): Promise<void> {
    // Idempotency guard — use SET NX so the check is atomic in Redis
    if (task.idempotencyKey != null && task.idempotencyKey !== '') {
      const idempotencyRedisKey = this.key(`idem:${task.idempotencyKey}`);
      const wasSet = await this.client.set(idempotencyRedisKey, task.id, 'NX');
      if (wasSet === null) {
        this.logger?.debug('Duplicate idempotency key, skipping enqueue', {
          taskId: task.id,
          idempotencyKey: task.idempotencyKey,
        });
        return;
      }
    }

    const storedTask: StoredTask = { ...task, status: 'pending' };
    const taskKey = this.taskKey(task.id);
    const serialized = JSON.stringify(storedTask);

    const now = Date.now();
    const scheduledTime = new Date(task.scheduledAt).getTime();

    const pipeline = this.client.pipeline();
    pipeline.set(taskKey, serialized);

    if (scheduledTime > now) {
      // Delayed task — add to scheduled sorted set scored by timestamp
      pipeline.zadd(this.key('scheduled'), String(scheduledTime), task.id);
    } else {
      // Immediately ready — push to ready list
      pipeline.lpush(this.key('ready'), task.id);
    }

    await pipeline.exec();
    this.logger?.debug('Task enqueued', { taskId: task.id, name: task.name });
  }

  /**
   * Dequeue the next ready task.
   *
   * First promotes any scheduled tasks whose time has arrived, then pops
   * the oldest task from the ready list.
   */
  async dequeue(now: string): Promise<Task | null> {
    const nowMs = new Date(now).getTime();

    // Step 1: Promote scheduled tasks that are now ready
    await this.promoteScheduledTasks(nowMs);

    // Step 2: Pop from the ready list (RPOP for FIFO — LPUSH + RPOP)
    const taskId = await this.client.rpop(this.key('ready'));
    if (taskId === null) return null;

    // Step 3: Load the task data
    const raw = await this.client.get(this.taskKey(taskId));
    if (raw === null) {
      this.logger?.warn('Task ID in ready list but data missing', { taskId });
      return null;
    }

    const storedTask = JSON.parse(raw) as StoredTask;

    // Step 4: Mark as processing
    storedTask.status = 'processing';
    storedTask.attempts += 1;

    const pipeline = this.client.pipeline();
    pipeline.set(this.taskKey(taskId), JSON.stringify(storedTask));
    pipeline.sadd(this.key('processing'), taskId);
    await pipeline.exec();

    return {
      id: storedTask.id,
      name: storedTask.name,
      args: storedTask.args,
      scheduledAt: storedTask.scheduledAt,
      attempts: storedTask.attempts,
      maxAttempts: storedTask.maxAttempts,
      createdAt: storedTask.createdAt,
    };
  }

  /**
   * Mark task as completed.
   */
  async complete(taskId: string, result: TaskResult): Promise<void> {
    const raw = await this.client.get(this.taskKey(taskId));
    if (raw === null) return;

    const storedTask = JSON.parse(raw) as StoredTask;
    storedTask.status = 'completed';
    storedTask.completedAt = result.completedAt;
    storedTask.durationMs = result.durationMs;

    const pipeline = this.client.pipeline();
    pipeline.set(this.taskKey(taskId), JSON.stringify(storedTask));
    pipeline.srem(this.key('processing'), taskId);
    await pipeline.exec();

    this.logger?.debug('Task completed', { taskId, durationMs: result.durationMs });
  }

  /**
   * Mark task as failed, optionally scheduling a retry.
   *
   * If `nextAttemptAt` is provided the task is rescheduled to the scheduled
   * sorted set for later retry. Otherwise it is marked as permanently failed.
   */
  async fail(taskId: string, error: TaskError, nextAttemptAt?: string): Promise<void> {
    const raw = await this.client.get(this.taskKey(taskId));
    if (raw === null) return;

    const storedTask = JSON.parse(raw) as StoredTask;
    storedTask.error = error;

    const pipeline = this.client.pipeline();
    pipeline.srem(this.key('processing'), taskId);

    if (nextAttemptAt != null && nextAttemptAt !== '') {
      // Reschedule for retry
      storedTask.status = 'pending';
      storedTask.scheduledAt = nextAttemptAt;
      const scheduledMs = new Date(nextAttemptAt).getTime();
      pipeline.zadd(this.key('scheduled'), String(scheduledMs), taskId);
      this.logger?.debug('Task scheduled for retry', { taskId, nextAttemptAt });
    } else {
      // Permanent failure
      storedTask.status = 'failed';
      storedTask.completedAt = new Date().toISOString();
      this.logger?.debug('Task permanently failed', { taskId });
    }

    pipeline.set(this.taskKey(taskId), JSON.stringify(storedTask));
    await pipeline.exec();
  }

  /**
   * Get task by ID.
   */
  async get(taskId: string): Promise<Task | null> {
    const raw = await this.client.get(this.taskKey(taskId));
    if (raw === null) return null;

    const storedTask = JSON.parse(raw) as StoredTask;
    return {
      id: storedTask.id,
      name: storedTask.name,
      args: storedTask.args,
      scheduledAt: storedTask.scheduledAt,
      attempts: storedTask.attempts,
      maxAttempts: storedTask.maxAttempts,
      createdAt: storedTask.createdAt,
    };
  }

  /**
   * Get count of pending tasks (ready list + scheduled set).
   */
  async getPendingCount(): Promise<number> {
    const [readyLen, scheduledLen] = await Promise.all([
      this.client.llen(this.key('ready')),
      this.client.zcard(this.key('scheduled')),
    ]);
    return readyLen + scheduledLen;
  }

  /**
   * Get count of failed tasks by scanning task data.
   *
   * Note: In production a secondary index (Redis set) would be more efficient.
   * This implementation scans task keys for correctness with the QueueStore contract.
   */
  async getFailedCount(): Promise<number> {
    const keys = await this.client.keys(`${this.keyPrefix}:task:*`);
    if (keys.length === 0) return 0;

    let count = 0;
    const values = await this.client.mget(...keys);
    for (const raw of values) {
      if (raw === null) continue;
      try {
        const task = JSON.parse(raw) as StoredTask;
        if (task.status === 'failed') count++;
      } catch {
        // Skip malformed entries
      }
    }
    return count;
  }

  /**
   * Clear completed tasks older than the given timestamp.
   */
  async clearCompleted(before: string): Promise<number> {
    const beforeMs = new Date(before).getTime();
    const keys = await this.client.keys(`${this.keyPrefix}:task:*`);
    if (keys.length === 0) return 0;

    let count = 0;
    const values = await this.client.mget(...keys);
    const toDelete: string[] = [];

    for (let i = 0; i < keys.length; i++) {
      const raw = values[i];
      const key = keys[i];
      if (raw == null || raw === '' || key === undefined) continue;

      try {
        const task = JSON.parse(raw) as StoredTask;
        if (task.status !== 'completed') continue;
        if (task.completedAt == null || task.completedAt === '') continue;

        const completedMs = new Date(task.completedAt).getTime();
        if (completedMs < beforeMs) {
          toDelete.push(key);
          count++;
        }
      } catch {
        // Skip malformed entries
      }
    }

    if (toDelete.length > 0) {
      await this.client.del(...toDelete);
    }

    return count;
  }

  // --------------------------------------------------------------------------
  // Extended Operations — Dead Letter Queue
  // --------------------------------------------------------------------------

  /**
   * Move a task to the dead letter queue.
   *
   * Implements the optional `moveToDeadLetter` method from QueueStore.
   */
  async moveToDeadLetter(taskId: string, reason: string): Promise<boolean> {
    const raw = await this.client.get(this.taskKey(taskId));
    if (raw === null) return false;

    const storedTask = JSON.parse(raw) as StoredTask;
    storedTask.status = 'dead_letter';
    storedTask.deadLetterReason = reason;
    storedTask.completedAt = new Date().toISOString();

    const pipeline = this.client.pipeline();
    pipeline.set(this.taskKey(taskId), JSON.stringify(storedTask));
    pipeline.srem(this.key('processing'), taskId);
    pipeline.srem(this.key('ready'), taskId);
    pipeline.zrem(this.key('scheduled'), taskId);
    pipeline.lpush(this.key('dead_letter'), taskId);
    await pipeline.exec();

    this.logger?.warn('Task moved to dead letter queue', { taskId, reason });
    return true;
  }

  /**
   * Retry a failed task by rescheduling it with exponential backoff.
   *
   * Implements the optional `retryJob` method from QueueStore.
   */
  async retryJob(taskId: string): Promise<boolean> {
    const raw = await this.client.get(this.taskKey(taskId));
    if (raw === null) return false;

    const storedTask = JSON.parse(raw) as StoredTask;

    if (storedTask.status !== 'failed' && storedTask.status !== 'dead_letter') {
      return false;
    }

    if (storedTask.attempts >= storedTask.maxAttempts) {
      // Extend max attempts by 1 to allow the retry
      storedTask.maxAttempts = storedTask.attempts + 1;
    }

    // Calculate backoff delay
    const delay = this.calculateBackoff(storedTask.attempts);
    const nextAttemptAt = new Date(Date.now() + delay);

    storedTask.status = 'pending';
    storedTask.scheduledAt = nextAttemptAt.toISOString();
    delete storedTask.error;
    delete storedTask.deadLetterReason;

    const pipeline = this.client.pipeline();
    pipeline.set(this.taskKey(taskId), JSON.stringify(storedTask));
    pipeline.zadd(this.key('scheduled'), String(nextAttemptAt.getTime()), taskId);
    // Remove from dead letter list if present
    pipeline.lrem(this.key('dead_letter'), 0, taskId);
    await pipeline.exec();

    this.logger?.info('Task retried', { taskId, nextAttemptAt: nextAttemptAt.toISOString() });
    return true;
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Close the store and release connections.
   * Only closes the client if it was created internally.
   */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;

    if (this.ownsClient) {
      await this.client.quit();
      this.logger?.info('Redis queue store closed');
    }
  }

  /**
   * Get the underlying Redis client (for testing or advanced use).
   */
  getClient(): Redis {
    return this.client;
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  /**
   * Build a namespaced Redis key.
   */
  private key(suffix: string): string {
    return `${this.keyPrefix}:${suffix}`;
  }

  /**
   * Build the key for a specific task's data.
   */
  private taskKey(taskId: string): string {
    return `${this.keyPrefix}:task:${taskId}`;
  }

  /**
   * Promote scheduled tasks whose scheduled time has arrived.
   * Moves them from the sorted set to the ready list.
   */
  private async promoteScheduledTasks(nowMs: number): Promise<void> {
    // Get all task IDs scored <= now
    const readyIds = await this.client.zrangebyscore(this.key('scheduled'), '-inf', String(nowMs));

    if (readyIds.length === 0) return;

    const pipeline = this.client.pipeline();
    for (const taskId of readyIds) {
      pipeline.lpush(this.key('ready'), taskId);
    }
    pipeline.zremrangebyscore(this.key('scheduled'), '-inf', String(nowMs));
    await pipeline.exec();

    this.logger?.debug('Promoted scheduled tasks', { count: readyIds.length });
  }

  /**
   * Calculate exponential backoff delay with jitter.
   */
  private calculateBackoff(attempt: number): number {
    const exponentialDelay = this.backoffBaseMs * Math.pow(2, Math.max(attempt - 1, 0));
    const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
    return Math.min(exponentialDelay + jitter, this.maxBackoffMs);
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new Redis queue store.
 *
 * @param options - Configuration options
 * @returns A new RedisQueueStore instance
 */
export function createRedisQueueStore(options: RedisQueueStoreOptions = {}): RedisQueueStore {
  return new RedisQueueStore(options);
}
