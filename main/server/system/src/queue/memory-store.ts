// main/server/system/src/queue/memory-store.ts
/**
 * In-Memory Queue Store
 *
 * Simple in-memory implementation for testing and development.
 * Not suitable for production (no persistence, no horizontal scaling).
 *
 * @module @bslt/server-system/queue
 */

import type { QueueStore, Task, TaskError, TaskResult } from './types';

// ============================================================================
// Types
// ============================================================================

/**
 * Internal representation of a task with status tracking
 */
interface StoredTask extends Task {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: TaskError;
  completedAt?: string;
  durationMs?: number;
}

// ============================================================================
// Memory Store
// ============================================================================

/**
 * In-memory queue store backed by a Map.
 * Uses linear scan for dequeue (acceptable for dev/test workloads).
 *
 * @complexity O(n) dequeue, O(1) enqueue/complete/fail
 */
export class MemoryQueueStore implements QueueStore {
  private readonly tasks = new Map<string, StoredTask>();

  /**
   * Enqueue a new task
   *
   * @param task - The task to enqueue
   * @complexity O(1)
   */
  enqueue(task: Task): Promise<void> {
    this.tasks.set(task.id, { ...task, status: 'pending' });
    return Promise.resolve();
  }

  /**
   * Dequeue the next ready task (oldest pending task whose scheduledAt <= now)
   *
   * @param now - Current timestamp as ISO string
   * @returns The dequeued task or null
   * @complexity O(n) where n is the number of tasks
   */
  dequeue(now: string): Promise<Task | null> {
    const nowTime = new Date(now).getTime();

    let oldest: StoredTask | null = null;
    let oldestTime = Infinity;

    for (const task of this.tasks.values()) {
      if (task.status !== 'pending') continue;

      const scheduledTime = new Date(task.scheduledAt).getTime();
      if (scheduledTime > nowTime) continue;

      if (scheduledTime < oldestTime) {
        oldest = task;
        oldestTime = scheduledTime;
      }
    }

    if (oldest === null) return Promise.resolve(null);

    oldest.status = 'processing';
    oldest.attempts += 1;

    return Promise.resolve({
      id: oldest.id,
      name: oldest.name,
      args: oldest.args,
      scheduledAt: oldest.scheduledAt,
      attempts: oldest.attempts,
      maxAttempts: oldest.maxAttempts,
      createdAt: oldest.createdAt,
    });
  }

  /**
   * Mark task as completed
   *
   * @param taskId - ID of the task to complete
   * @param result - Completion result with timing info
   * @complexity O(1)
   */
  complete(taskId: string, result: TaskResult): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task === undefined) return Promise.resolve();

    task.status = 'completed';
    task.completedAt = result.completedAt;
    task.durationMs = result.durationMs;
    return Promise.resolve();
  }

  /**
   * Mark task as failed, optionally scheduling a retry
   *
   * @param taskId - ID of the failed task
   * @param error - Serialized error information
   * @param nextAttemptAt - If provided, reschedule for retry at this ISO timestamp
   * @complexity O(1)
   */
  fail(taskId: string, error: TaskError, nextAttemptAt?: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task === undefined) return Promise.resolve();

    task.error = error;

    if (nextAttemptAt != null && nextAttemptAt !== '') {
      task.status = 'pending';
      task.scheduledAt = nextAttemptAt;
    } else {
      task.status = 'failed';
      task.completedAt = new Date().toISOString();
    }
    return Promise.resolve();
  }

  /**
   * Get task by ID
   *
   * @param taskId - ID of the task to retrieve
   * @returns The task or null if not found
   * @complexity O(1)
   */
  get(taskId: string): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (task === undefined) return Promise.resolve(null);

    return Promise.resolve({
      id: task.id,
      name: task.name,
      args: task.args,
      scheduledAt: task.scheduledAt,
      attempts: task.attempts,
      maxAttempts: task.maxAttempts,
      createdAt: task.createdAt,
    });
  }

  /**
   * Get count of pending tasks
   *
   * @returns Number of tasks in pending status
   * @complexity O(n)
   */
  getPendingCount(): Promise<number> {
    let count = 0;
    for (const task of this.tasks.values()) {
      if (task.status === 'pending') count++;
    }
    return Promise.resolve(count);
  }

  /**
   * Get count of failed tasks
   *
   * @returns Number of tasks in failed status
   * @complexity O(n)
   */
  getFailedCount(): Promise<number> {
    let count = 0;
    for (const task of this.tasks.values()) {
      if (task.status === 'failed') count++;
    }
    return Promise.resolve(count);
  }

  /**
   * Clear all completed tasks older than the given timestamp
   *
   * @param before - ISO timestamp cutoff
   * @returns Number of tasks cleared
   * @complexity O(n)
   */
  clearCompleted(before: string): Promise<number> {
    const beforeTime = new Date(before).getTime();
    let count = 0;

    for (const [id, task] of this.tasks.entries()) {
      if (task.status !== 'completed') continue;
      const completedAt = task.completedAt;
      if (completedAt == null || completedAt === '') continue;

      const completedTime = new Date(completedAt).getTime();
      if (completedTime < beforeTime) {
        this.tasks.delete(id);
        count++;
      }
    }

    return Promise.resolve(count);
  }

  /**
   * Clear all tasks (for testing)
   */
  clear(): void {
    this.tasks.clear();
  }

  /**
   * Get all stored tasks (for debugging)
   *
   * @returns Array of all stored tasks with status
   */
  getAll(): StoredTask[] {
    return Array.from(this.tasks.values());
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a new in-memory queue store
 *
 * @returns A new MemoryQueueStore instance
 */
export function createMemoryQueueStore(): MemoryQueueStore {
  return new MemoryQueueStore();
}
