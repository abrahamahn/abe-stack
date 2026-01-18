// apps/server/src/infra/queue/__tests__/memoryStore.test.ts
import { beforeEach, describe, expect, test } from 'vitest';

import { createMemoryQueueStore } from '../memoryStore';

import type { MemoryQueueStore } from '../memoryStore';

// ============================================================================
// MemoryQueueStore Tests
// ============================================================================

describe('MemoryQueueStore', () => {
  let store: MemoryQueueStore;

  beforeEach(() => {
    store = createMemoryQueueStore();
  });

  describe('enqueue', () => {
    test('should store task', async () => {
      const task = {
        id: 'task-1',
        name: 'test',
        args: { foo: 'bar' },
        scheduledAt: new Date().toISOString(),
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date().toISOString(),
      };

      await store.enqueue(task);

      const retrieved = await store.get('task-1');
      expect(retrieved).toEqual(task);
    });

    test('should store multiple tasks', async () => {
      const now = new Date().toISOString();

      await store.enqueue({
        id: 'task-1',
        name: 'test-1',
        args: {},
        scheduledAt: now,
        attempts: 0,
        maxAttempts: 3,
        createdAt: now,
      });

      await store.enqueue({
        id: 'task-2',
        name: 'test-2',
        args: {},
        scheduledAt: now,
        attempts: 0,
        maxAttempts: 3,
        createdAt: now,
      });

      expect(await store.getPendingCount()).toBe(2);
    });
  });

  describe('dequeue', () => {
    test('should return oldest pending task ready for processing', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 1000);

      await store.enqueue({
        id: 'task-2',
        name: 'newer',
        args: {},
        scheduledAt: now.toISOString(),
        attempts: 0,
        maxAttempts: 3,
        createdAt: now.toISOString(),
      });

      await store.enqueue({
        id: 'task-1',
        name: 'older',
        args: {},
        scheduledAt: past.toISOString(),
        attempts: 0,
        maxAttempts: 3,
        createdAt: past.toISOString(),
      });

      const dequeued = await store.dequeue(now.toISOString());

      expect(dequeued?.id).toBe('task-1'); // Older task first
      expect(dequeued?.attempts).toBe(1); // Attempts incremented
    });

    test('should not return tasks scheduled in the future', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 60000);

      await store.enqueue({
        id: 'task-future',
        name: 'future-task',
        args: {},
        scheduledAt: future.toISOString(),
        attempts: 0,
        maxAttempts: 3,
        createdAt: now.toISOString(),
      });

      const dequeued = await store.dequeue(now.toISOString());

      expect(dequeued).toBeNull();
    });

    test('should return null when no tasks are pending', async () => {
      const dequeued = await store.dequeue(new Date().toISOString());
      expect(dequeued).toBeNull();
    });

    test('should not return tasks already being processed', async () => {
      const now = new Date().toISOString();

      await store.enqueue({
        id: 'task-1',
        name: 'test',
        args: {},
        scheduledAt: now,
        attempts: 0,
        maxAttempts: 3,
        createdAt: now,
      });

      // Dequeue once (marks as processing)
      await store.dequeue(now);

      // Second dequeue should return null
      const secondDequeue = await store.dequeue(now);
      expect(secondDequeue).toBeNull();
    });

    test('should increment attempts on dequeue', async () => {
      const now = new Date().toISOString();

      await store.enqueue({
        id: 'task-1',
        name: 'test',
        args: {},
        scheduledAt: now,
        attempts: 2,
        maxAttempts: 5,
        createdAt: now,
      });

      const dequeued = await store.dequeue(now);

      expect(dequeued?.attempts).toBe(3);
    });
  });

  describe('get', () => {
    test('should return task by id', async () => {
      const now = new Date().toISOString();
      const task = {
        id: 'task-123',
        name: 'get-test',
        args: { key: 'value' },
        scheduledAt: now,
        attempts: 0,
        maxAttempts: 3,
        createdAt: now,
      };

      await store.enqueue(task);

      const retrieved = await store.get('task-123');
      expect(retrieved).toEqual(task);
    });

    test('should return null for non-existent task', async () => {
      const retrieved = await store.get('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('complete', () => {
    test('should mark task as completed', async () => {
      const now = new Date().toISOString();
      await store.enqueue({
        id: 'task-1',
        name: 'test',
        args: {},
        scheduledAt: now,
        attempts: 0,
        maxAttempts: 3,
        createdAt: now,
      });

      await store.dequeue(now);
      await store.complete('task-1', {
        taskId: 'task-1',
        success: true,
        completedAt: now,
        durationMs: 100,
      });

      // Task should no longer be pending
      const pending = await store.getPendingCount();
      expect(pending).toBe(0);
    });

    test('should handle non-existent task gracefully', async () => {
      await expect(
        store.complete('non-existent', {
          taskId: 'non-existent',
          success: true,
          completedAt: new Date().toISOString(),
          durationMs: 0,
        }),
      ).resolves.toBeUndefined();
    });

    test('should store completion metadata', async () => {
      const now = new Date().toISOString();
      await store.enqueue({
        id: 'task-1',
        name: 'test',
        args: {},
        scheduledAt: now,
        attempts: 0,
        maxAttempts: 3,
        createdAt: now,
      });

      await store.dequeue(now);
      await store.complete('task-1', {
        taskId: 'task-1',
        success: true,
        completedAt: now,
        durationMs: 250,
      });

      const all = store.getAll();
      const completed = all.find((t) => t.id === 'task-1');
      expect(completed?.completedAt).toBe(now);
      expect(completed?.durationMs).toBe(250);
    });
  });

  describe('fail', () => {
    test('should reschedule task for retry', async () => {
      const now = new Date();
      const nextAttempt = new Date(now.getTime() + 1000);

      await store.enqueue({
        id: 'task-1',
        name: 'test',
        args: {},
        scheduledAt: now.toISOString(),
        attempts: 0,
        maxAttempts: 3,
        createdAt: now.toISOString(),
      });

      await store.dequeue(now.toISOString());
      await store.fail(
        'task-1',
        { name: 'Error', message: 'Something went wrong' },
        nextAttempt.toISOString(),
      );

      // Task should be rescheduled (pending again)
      const pending = await store.getPendingCount();
      expect(pending).toBe(1);
    });

    test('should mark task as permanently failed when no nextAttemptAt', async () => {
      const now = new Date().toISOString();

      await store.enqueue({
        id: 'task-1',
        name: 'test',
        args: {},
        scheduledAt: now,
        attempts: 0,
        maxAttempts: 1,
        createdAt: now,
      });

      await store.dequeue(now);
      await store.fail('task-1', { name: 'Error', message: 'Failed permanently' });

      const failed = await store.getFailedCount();
      expect(failed).toBe(1);
    });

    test('should store error information', async () => {
      const now = new Date().toISOString();

      await store.enqueue({
        id: 'task-1',
        name: 'test',
        args: {},
        scheduledAt: now,
        attempts: 0,
        maxAttempts: 1,
        createdAt: now,
      });

      await store.dequeue(now);
      await store.fail('task-1', {
        name: 'TestError',
        message: 'Test failure',
        stack: 'stack trace',
      });

      const all = store.getAll();
      const failed = all.find((t) => t.id === 'task-1');
      expect(failed?.error).toEqual({
        name: 'TestError',
        message: 'Test failure',
        stack: 'stack trace',
      });
    });

    test('should handle non-existent task gracefully', async () => {
      await expect(
        store.fail('non-existent', { name: 'Error', message: 'Test' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('getPendingCount', () => {
    test('should return correct count', async () => {
      const now = new Date().toISOString();

      await store.enqueue({
        id: 'task-1',
        name: 'test',
        args: {},
        scheduledAt: now,
        attempts: 0,
        maxAttempts: 3,
        createdAt: now,
      });

      await store.enqueue({
        id: 'task-2',
        name: 'test',
        args: {},
        scheduledAt: now,
        attempts: 0,
        maxAttempts: 3,
        createdAt: now,
      });

      expect(await store.getPendingCount()).toBe(2);
    });

    test('should return 0 for empty store', async () => {
      expect(await store.getPendingCount()).toBe(0);
    });

    test('should not count processing tasks', async () => {
      const now = new Date().toISOString();

      await store.enqueue({
        id: 'task-1',
        name: 'test',
        args: {},
        scheduledAt: now,
        attempts: 0,
        maxAttempts: 3,
        createdAt: now,
      });

      await store.dequeue(now);

      expect(await store.getPendingCount()).toBe(0);
    });
  });

  describe('getFailedCount', () => {
    test('should return correct count', async () => {
      const now = new Date().toISOString();

      await store.enqueue({
        id: 'task-1',
        name: 'test',
        args: {},
        scheduledAt: now,
        attempts: 0,
        maxAttempts: 1,
        createdAt: now,
      });

      await store.dequeue(now);
      await store.fail('task-1', { name: 'Error', message: 'Failed' });

      expect(await store.getFailedCount()).toBe(1);
    });

    test('should return 0 when no failed tasks', async () => {
      expect(await store.getFailedCount()).toBe(0);
    });
  });

  describe('clearCompleted', () => {
    test('should remove completed tasks older than given date', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 60000);

      await store.enqueue({
        id: 'task-1',
        name: 'test',
        args: {},
        scheduledAt: past.toISOString(),
        attempts: 0,
        maxAttempts: 3,
        createdAt: past.toISOString(),
      });

      await store.dequeue(past.toISOString());
      await store.complete('task-1', {
        taskId: 'task-1',
        success: true,
        completedAt: past.toISOString(),
        durationMs: 100,
      });

      const cleared = await store.clearCompleted(now.toISOString());

      expect(cleared).toBe(1);
    });

    test('should not remove completed tasks newer than given date', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 60000);

      await store.enqueue({
        id: 'task-1',
        name: 'test',
        args: {},
        scheduledAt: now.toISOString(),
        attempts: 0,
        maxAttempts: 3,
        createdAt: now.toISOString(),
      });

      await store.dequeue(now.toISOString());
      await store.complete('task-1', {
        taskId: 'task-1',
        success: true,
        completedAt: now.toISOString(),
        durationMs: 100,
      });

      const cleared = await store.clearCompleted(past.toISOString());

      expect(cleared).toBe(0);
    });

    test('should not affect pending or failed tasks', async () => {
      const now = new Date();
      const future = new Date(now.getTime() + 60000); // Schedule in future so it stays pending

      // Create a pending task (scheduled in future so it won't be dequeued)
      await store.enqueue({
        id: 'pending-task',
        name: 'test',
        args: {},
        scheduledAt: future.toISOString(),
        attempts: 0,
        maxAttempts: 3,
        createdAt: now.toISOString(),
      });

      // Create a task that will be failed
      await store.enqueue({
        id: 'failed-task',
        name: 'test',
        args: {},
        scheduledAt: now.toISOString(),
        attempts: 0,
        maxAttempts: 1,
        createdAt: now.toISOString(),
      });

      // Dequeue and fail the second task
      await store.dequeue(now.toISOString());
      await store.fail('failed-task', { name: 'Error', message: 'Failed' });

      const cleared = await store.clearCompleted(now.toISOString());

      expect(cleared).toBe(0);
      expect(await store.getPendingCount()).toBe(1); // pending-task is still pending
      expect(await store.getFailedCount()).toBe(1); // failed-task is failed
    });
  });

  describe('clear', () => {
    test('should remove all tasks', async () => {
      const now = new Date().toISOString();

      await store.enqueue({
        id: 'task-1',
        name: 'test',
        args: {},
        scheduledAt: now,
        attempts: 0,
        maxAttempts: 3,
        createdAt: now,
      });

      store.clear();

      expect(await store.getPendingCount()).toBe(0);
      expect(store.getAll()).toHaveLength(0);
    });
  });

  describe('getAll', () => {
    test('should return all stored tasks', async () => {
      const now = new Date().toISOString();

      await store.enqueue({
        id: 'task-1',
        name: 'test-1',
        args: {},
        scheduledAt: now,
        attempts: 0,
        maxAttempts: 3,
        createdAt: now,
      });

      await store.enqueue({
        id: 'task-2',
        name: 'test-2',
        args: {},
        scheduledAt: now,
        attempts: 0,
        maxAttempts: 3,
        createdAt: now,
      });

      const all = store.getAll();

      expect(all).toHaveLength(2);
      expect(all.map((t) => t.id).sort()).toEqual(['task-1', 'task-2']);
    });

    test('should return empty array for empty store', () => {
      expect(store.getAll()).toHaveLength(0);
    });
  });

  describe('factory function', () => {
    test('should create MemoryQueueStore instance', () => {
      const newStore = createMemoryQueueStore();
      expect(newStore.constructor.name).toBe('MemoryQueueStore');
    });
  });
});
