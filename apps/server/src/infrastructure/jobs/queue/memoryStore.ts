// apps/server/src/infrastructure/jobs/queue/memoryStore.ts
/**
 * In-Memory Queue Store
 *
 * Simple in-memory implementation for testing and development.
 * Not suitable for production (no persistence, no horizontal scaling).
 */

import type { QueueStore, Task, TaskError, TaskResult } from './types';

// ============================================================================
// Types
// ============================================================================

interface StoredTask extends Task {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: TaskError;
  completedAt?: string;
  durationMs?: number;
}

// ============================================================================
// Memory Store
// ============================================================================

export class MemoryQueueStore implements QueueStore {
  private tasks = new Map<string, StoredTask>();

  enqueue(task: Task): Promise<void> {
    this.tasks.set(task.id, { ...task, status: 'pending' });
    return Promise.resolve();
  }

  dequeue(now: string): Promise<Task | null> {
    const nowTime = new Date(now).getTime();

    // Find oldest pending task that's ready
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

    if (!oldest) return Promise.resolve(null);

    // Mark as processing and increment attempts
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

  complete(taskId: string, result: TaskResult): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return Promise.resolve();

    task.status = 'completed';
    task.completedAt = result.completedAt;
    task.durationMs = result.durationMs;
    return Promise.resolve();
  }

  fail(taskId: string, error: TaskError, nextAttemptAt?: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return Promise.resolve();

    task.error = error;

    if (nextAttemptAt) {
      // Retry
      task.status = 'pending';
      task.scheduledAt = nextAttemptAt;
    } else {
      // Final failure
      task.status = 'failed';
      task.completedAt = new Date().toISOString();
    }
    return Promise.resolve();
  }

  get(taskId: string): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task) return Promise.resolve(null);

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

  getPendingCount(): Promise<number> {
    let count = 0;
    for (const task of this.tasks.values()) {
      if (task.status === 'pending') count++;
    }
    return Promise.resolve(count);
  }

  getFailedCount(): Promise<number> {
    let count = 0;
    for (const task of this.tasks.values()) {
      if (task.status === 'failed') count++;
    }
    return Promise.resolve(count);
  }

  clearCompleted(before: string): Promise<number> {
    const beforeTime = new Date(before).getTime();
    let count = 0;

    for (const [id, task] of this.tasks.entries()) {
      if (task.status !== 'completed') continue;
      if (!task.completedAt) continue;

      const completedTime = new Date(task.completedAt).getTime();
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
   * Get all tasks (for debugging)
   */
  getAll(): StoredTask[] {
    return Array.from(this.tasks.values());
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createMemoryQueueStore(): MemoryQueueStore {
  return new MemoryQueueStore();
}
