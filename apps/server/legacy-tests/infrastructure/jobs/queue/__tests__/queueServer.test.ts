// apps/server/src/infrastructure/jobs/queue/__tests__/queueServer.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createMemoryQueueStore, createQueueServer } from '../index';

import type { MemoryQueueStore } from '../index';
import type { TaskHandlers } from '../types';

// ============================================================================
// QueueServer Tests
// ============================================================================

describe('QueueServer', () => {
  let store: MemoryQueueStore;
  let handlers: TaskHandlers;

  beforeEach(() => {
    store = createMemoryQueueStore();
    handlers = {};
  });

  describe('enqueue', () => {
    test('should enqueue a task and return task id', async () => {
      const server = createQueueServer({ store, handlers });

      const taskId = await server.enqueue('test-task', { foo: 'bar' });

      expect(typeof taskId).toBe('string');
      expect(taskId.length).toBeGreaterThan(0);
    });

    test('should store task with correct properties', async () => {
      const server = createQueueServer({ store, handlers });

      const taskId = await server.enqueue('email', { to: 'test@example.com' });

      const task = await store.get(taskId);
      expect(task).toBeDefined();
      expect(task?.name).toBe('email');
      expect(task?.args).toEqual({ to: 'test@example.com' });
      expect(task?.attempts).toBe(0);
      expect(task?.maxAttempts).toBe(3); // default
    });

    test('should respect custom maxAttempts', async () => {
      const server = createQueueServer({ store, handlers });

      const taskId = await server.enqueue('important-task', {}, { maxAttempts: 5 });

      const task = await store.get(taskId);
      expect(task?.maxAttempts).toBe(5);
    });

    test('should schedule task for future execution', async () => {
      const server = createQueueServer({ store, handlers });

      const scheduledAt = new Date(Date.now() + 60000); // 1 minute from now
      const taskId = await server.enqueue('delayed-task', {}, { scheduledAt });

      const task = await store.get(taskId);
      expect(task?.scheduledAt).toBe(scheduledAt.toISOString());
    });
  });

  describe('start and stop', () => {
    test('should not throw when stopping a non-started server', async () => {
      const server = createQueueServer({ store, handlers });

      await expect(server.stop()).resolves.toBeUndefined();
    });

    test('should log when starting', () => {
      const logSpy = vi.fn();
      const mockLog = { info: logSpy, debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
      const server = createQueueServer({
        store,
        handlers,
        log: mockLog as never,
        : { pollIntervalMs: 10000 }, // Long interval to avoid actual polling
      });

      server.start();

      expect(logSpy).toHaveBeenCalledWith('Queue server started');

      // Stop immediately
      void server.stop();
    });

    test('should not log start twice when called twice', () => {
      const logSpy = vi.fn();
      const mockLog = { info: logSpy, debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
      const server = createQueueServer({
        store,
        handlers,
        log: mockLog as never,
        : { pollIntervalMs: 10000 },
      });

      server.start();
      server.start(); // Second call should be no-op

      const startCalls = logSpy.mock.calls.filter((call) => call[0] === 'Queue server started');
      expect(startCalls).toHaveLength(1);

      void server.stop();
    });
  });

  describe('getStats', () => {
    test('should return correct pending count', async () => {
      const server = createQueueServer({ store, handlers });

      await server.enqueue('task1', {});
      await server.enqueue('task2', {});

      const stats = await server.getStats();
      expect(stats.pending).toBe(2);
      expect(stats.failed).toBe(0);
    });

    test('should return correct failed count after manual failure', async () => {
      const server = createQueueServer({ store, handlers });

      const taskId = await server.enqueue('task1', {});

      // Manually fail the task
      await store.dequeue(new Date().toISOString());
      await store.fail(taskId, { name: 'Error', message: 'Test failure' });

      const stats = await server.getStats();
      expect(stats.failed).toBe(1);
      expect(stats.pending).toBe(0);
    });
  });

  describe('uration', () => {
    test('should use default uration when not provided', () => {
      const server = createQueueServer({ store, handlers });

      // We can't directly test private , but we can verify behavior
      expect(server).toBeDefined();
    });

    test('should accept custom ', () => {
      const server = createQueueServer({
        store,
        handlers,
        : {
          pollIntervalMs: 5000,
          defaultMaxAttempts: 5,
          backoffBaseMs: 2000,
          maxBackoffMs: 600000,
        },
      });

      expect(server).toBeDefined();
    });
  });

  describe('factory function', () => {
    test('should create QueueServer instance', () => {
      const server = createQueueServer({ store, handlers });
      expect(server.constructor.name).toBe('QueueServer');
    });
  });

  describe('task processing', () => {
    test('should process task and call handler with args', async () => {
      vi.useFakeTimers();
      const handlerSpy = vi.fn().mockResolvedValue(undefined);
      const testHandlers: TaskHandlers = {
        'test-task': handlerSpy,
      };

      const server = createQueueServer({ store, handlers: testHandlers });

      // Enqueue a task
      await server.enqueue('test-task', { data: 'value' });

      // Start server
      server.start();

      // Wait for poll
      await vi.advanceTimersByTimeAsync(100);

      // Handler should be called
      expect(handlerSpy).toHaveBeenCalledWith({ data: 'value' });

      await server.stop();
      vi.useRealTimers();
    });

    test('should log error for task with no handler', async () => {
      vi.useFakeTimers();
      const logSpy = vi.fn();
      const mockLog = { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: logSpy };

      const server = createQueueServer({
        store,
        handlers: {},
        log: mockLog as never,
      });

      // Enqueue a task with no handler
      await server.enqueue('unknown-task', {});

      server.start();
      await vi.advanceTimersByTimeAsync(100);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('No handler for task'),
        expect.any(Object),
      );

      await server.stop();
      vi.useRealTimers();
    });

    test('should retry failed task with exponential backoff', async () => {
      vi.useFakeTimers();
      const handlerSpy = vi.fn().mockRejectedValue(new Error('Task failed'));
      const testHandlers: TaskHandlers = {
        'failing-task': handlerSpy,
      };

      const logSpy = vi.fn();
      const mockLog = { info: vi.fn(), debug: logSpy, warn: vi.fn(), error: vi.fn() };

      const server = createQueueServer({
        store,
        handlers: testHandlers,
        log: mockLog as never,
        : { defaultMaxAttempts: 3 },
      });

      await server.enqueue('failing-task', {});
      server.start();
      await vi.advanceTimersByTimeAsync(100);

      expect(handlerSpy).toHaveBeenCalled();
      // Should log scheduled for retry
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('scheduled for retry'),
        expect.any(Object),
      );

      await server.stop();
      vi.useRealTimers();
    });

    test('should mark task as permanently failed after max attempts', async () => {
      vi.useFakeTimers();
      const handlerSpy = vi.fn().mockRejectedValue(new Error('Task failed'));
      const testHandlers: TaskHandlers = {
        'failing-task': handlerSpy,
      };

      const logSpy = vi.fn();
      const mockLog = { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: logSpy };

      const server = createQueueServer({
        store,
        handlers: testHandlers,
        log: mockLog as never,
        : { defaultMaxAttempts: 1 },
      });

      await server.enqueue('failing-task', {}, { maxAttempts: 1 });
      server.start();

      // Process task (first attempt)
      await vi.advanceTimersByTimeAsync(100);

      // Dequeue again to process the retried task at max attempts
      await vi.advanceTimersByTimeAsync(2000);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('permanently failed'),
        expect.any(Object),
      );

      await server.stop();
      vi.useRealTimers();
    });

    test('should handle non-Error thrown by handler', async () => {
      vi.useFakeTimers();
      const handlerSpy = vi.fn().mockRejectedValue('string error');
      const testHandlers: TaskHandlers = {
        'string-error-task': handlerSpy,
      };

      const server = createQueueServer({
        store,
        handlers: testHandlers,
        : { defaultMaxAttempts: 1 },
      });

      await server.enqueue('string-error-task', {}, { maxAttempts: 1 });
      server.start();
      await vi.advanceTimersByTimeAsync(100);

      // Task should have been marked as failed
      const stats = await server.getStats();
      expect(stats.failed).toBe(1);

      await server.stop();
      vi.useRealTimers();
    });

    test('should gracefully handle poll errors', async () => {
      vi.useFakeTimers();

      // Create a store that throws on dequeue
      const errorStore = createMemoryQueueStore();
      vi.spyOn(errorStore, 'dequeue').mockRejectedValue(new Error('DB error'));

      const logSpy = vi.fn();
      const mockLog = { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: logSpy };

      const server = createQueueServer({
        store: errorStore,
        handlers: {},
        log: mockLog as never,
      });

      server.start();
      await vi.advanceTimersByTimeAsync(100);

      expect(logSpy).toHaveBeenCalledWith('Queue poll error', expect.any(Object));

      await server.stop();
      vi.useRealTimers();
    });
  });
});

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
  });

  describe('factory function', () => {
    test('should create MemoryQueueStore instance', () => {
      const store = createMemoryQueueStore();
      expect(store.constructor.name).toBe('MemoryQueueStore');
    });
  });
});
