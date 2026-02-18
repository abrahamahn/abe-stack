// main/server/system/src/queue/client.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createQueueServer } from './client';
import { createMemoryQueueStore } from './memory-store';

import type { MemoryQueueStore } from './memory-store';
import type { TaskHandlers } from './types';

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
        config: { pollIntervalMs: 10000 }, // Long interval to avoid actual polling
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
        config: { pollIntervalMs: 10000 },
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

  describe('configuration', () => {
    test('should use default configuration when not provided', () => {
      const server = createQueueServer({ store, handlers });

      // We can't directly test private config, but we can verify behavior
      expect(server).toBeDefined();
    });

    test('should accept custom config', () => {
      const server = createQueueServer({
        store,
        handlers,
        config: {
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

  describe('abort listener cleanup', () => {
    test('should use { once: true } on abort listener to prevent accumulation', async () => {
      vi.useFakeTimers();

      const addEventListenerSpy = vi.spyOn(AbortSignal.prototype, 'addEventListener');

      const server = createQueueServer({
        store,
        handlers: {},
        config: { pollIntervalMs: 50 },
      });

      server.start();

      // Let a few poll cycles run (each creates a sleep → abort listener)
      await vi.advanceTimersByTimeAsync(200);

      await server.stop();

      // Verify all addEventListener calls use { once: true }
      const abortCalls = addEventListenerSpy.mock.calls.filter((call) => call[0] === 'abort');

      for (const call of abortCalls) {
        const options = call[2] as { once?: boolean } | undefined;
        expect(options).toBeDefined();
        expect(options?.once).toBe(true);
      }

      addEventListenerSpy.mockRestore();
      vi.useRealTimers();
    });

    test('should stop cleanly when abort is triggered during sleep', async () => {
      const server = createQueueServer({
        store,
        handlers: {},
        config: { pollIntervalMs: 100 },
      });

      server.start();

      // Let the server enter its first poll cycle (real timer)
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Stop should resolve quickly (abort triggers immediate resolution)
      await server.stop();

      // If we got here, abort-based stop works correctly
      expect(true).toBe(true);
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
        config: { defaultMaxAttempts: 3 },
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
        config: { defaultMaxAttempts: 1 },
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
        config: { defaultMaxAttempts: 1 },
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
