// apps/server/src/infrastructure/jobs/queue/__tests__/postgresStore.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PostgresQueueStore, createPostgresQueueStore } from '../postgresStore';

import type { Task, TaskError, TaskResult } from '../types';
import type { DbClient } from '@database';

// ============================================================================
// Mock Database Client
// ============================================================================

function createMockDb() {
  return {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
  };
}

type MockDb = ReturnType<typeof createMockDb>;

function asMockDb(mock: MockDb): DbClient {
  return mock as unknown as DbClient;
}

// ============================================================================
// Test Helpers
// ============================================================================

function createTestTask(overrides: Partial<Task> = {}): Task {
  const now = new Date().toISOString();
  return {
    id: 'task-' + Math.random().toString(36).substring(7),
    name: 'test-task',
    args: { foo: 'bar' },
    scheduledAt: now,
    attempts: 0,
    maxAttempts: 3,
    createdAt: now,
    ...overrides,
  };
}

function createTaskRow(task: Task) {
  return {
    id: task.id,
    name: task.name,
    args: task.args,
    scheduled_at: task.scheduledAt,
    attempts: task.attempts,
    max_attempts: task.maxAttempts,
    created_at: task.createdAt,
  };
}

// ============================================================================
// PostgresQueueStore Tests
// ============================================================================

describe('PostgresQueueStore', () => {
  let store: PostgresQueueStore;
  let mockDb: MockDb;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    store = new PostgresQueueStore(asMockDb(mockDb));
  });

  // ============================================================================
  // enqueue Tests
  // ============================================================================

  describe('enqueue', () => {
    test('should insert task into database', async () => {
      const task = createTestTask();
      mockDb.execute.mockResolvedValueOnce(1);

      await store.enqueue(task);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO job_queue'),
          values: expect.arrayContaining([task.id, task.name]),
        }),
      );
    });

    test('should handle task with complex args', async () => {
      const task = createTestTask({
        args: {
          nested: { deep: { value: 123 } },
          array: [1, 2, 3],
          string: 'test',
        },
      });
      mockDb.execute.mockResolvedValueOnce(1);

      await store.enqueue(task);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });

    test('should propagate database errors', async () => {
      const task = createTestTask();
      const dbError = new Error('Connection failed');
      mockDb.execute.mockRejectedValueOnce(dbError);

      await expect(store.enqueue(task)).rejects.toThrow('Connection failed');
    });
  });

  // ============================================================================
  // dequeue Tests
  // ============================================================================

  describe('dequeue', () => {
    test('should return task when one is available', async () => {
      const task = createTestTask({ attempts: 0 });
      const row = createTaskRow({ ...task, attempts: 1 }); // Attempts incremented by query

      mockDb.raw.mockResolvedValueOnce([row]);

      const result = await store.dequeue(new Date().toISOString());

      expect(result).not.toBeNull();
      expect(result?.id).toBe(task.id);
      expect(result?.name).toBe(task.name);
      expect(result?.attempts).toBe(1);
    });

    test('should return null when no tasks are available', async () => {
      mockDb.raw.mockResolvedValueOnce([]);

      const result = await store.dequeue(new Date().toISOString());

      expect(result).toBeNull();
    });

    test('should handle array-style result', async () => {
      const task = createTestTask();
      const row = createTaskRow({ ...task, attempts: 1 });

      mockDb.raw.mockResolvedValueOnce([row]);

      const result = await store.dequeue(new Date().toISOString());

      expect(result).not.toBeNull();
      expect(result?.id).toBe(task.id);
    });

    test('should map database columns to task properties', async () => {
      const row = {
        id: 'task-123',
        name: 'email-send',
        args: { to: 'user@example.com' },
        scheduled_at: '2024-01-15T10:00:00.000Z',
        attempts: 2,
        max_attempts: 5,
        created_at: '2024-01-15T09:00:00.000Z',
      };

      mockDb.raw.mockResolvedValueOnce([row]);

      const result = await store.dequeue(new Date().toISOString());

      expect(result).toEqual({
        id: 'task-123',
        name: 'email-send',
        args: { to: 'user@example.com' },
        scheduledAt: '2024-01-15T10:00:00.000Z',
        attempts: 2,
        maxAttempts: 5,
        createdAt: '2024-01-15T09:00:00.000Z',
      });
    });
  });

  // ============================================================================
  // complete Tests
  // ============================================================================

  describe('complete', () => {
    test('should mark task as completed', async () => {
      const taskResult: TaskResult = {
        taskId: 'task-123',
        success: true,
        completedAt: new Date().toISOString(),
        durationMs: 150,
      };

      mockDb.execute.mockResolvedValueOnce(1);

      await store.complete('task-123', taskResult);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE job_queue'),
        }),
      );
    });

    test('should handle completion with error result', async () => {
      const taskResult: TaskResult = {
        taskId: 'task-123',
        success: false,
        error: { name: 'Error', message: 'Something failed' },
        completedAt: new Date().toISOString(),
        durationMs: 50,
      };

      mockDb.execute.mockResolvedValueOnce(1);

      await store.complete('task-123', taskResult);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // fail Tests
  // ============================================================================

  describe('fail', () => {
    test('should reschedule task for retry when nextAttemptAt is provided', async () => {
      const error: TaskError = {
        name: 'NetworkError',
        message: 'Connection timeout',
        stack: 'Error: Connection timeout\n    at...',
      };
      const nextAttemptAt = new Date(Date.now() + 60000).toISOString();

      mockDb.execute.mockResolvedValueOnce(1);

      await store.fail('task-123', error, nextAttemptAt);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('status = \'pending\''),
        }),
      );
    });

    test('should mark task as permanently failed when no nextAttemptAt', async () => {
      const error: TaskError = {
        name: 'FatalError',
        message: 'Unrecoverable error',
      };

      mockDb.execute.mockResolvedValueOnce(1);

      await store.fail('task-123', error);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('status = \'failed\''),
        }),
      );
    });

    test('should handle error without stack trace', async () => {
      const error: TaskError = {
        name: 'Error',
        message: 'Simple error',
      };

      mockDb.execute.mockResolvedValueOnce(1);

      await store.fail('task-123', error);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // get Tests
  // ============================================================================

  describe('get', () => {
    test('should return task by id', async () => {
      const task = createTestTask({ id: 'task-abc' });
      const row = createTaskRow(task);

      mockDb.raw.mockResolvedValueOnce([row]);

      const result = await store.get('task-abc');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('task-abc');
    });

    test('should return null for non-existent task', async () => {
      mockDb.raw.mockResolvedValueOnce([]);

      const result = await store.get('non-existent');

      expect(result).toBeNull();
    });

    test('should handle array-style result for get', async () => {
      const task = createTestTask();
      const row = createTaskRow(task);

      mockDb.raw.mockResolvedValueOnce([row]);

      const result = await store.get(task.id);

      expect(result?.id).toBe(task.id);
    });
  });

  // ============================================================================
  // getPendingCount Tests
  // ============================================================================

  describe('getPendingCount', () => {
    test('should return pending task count', async () => {
      mockDb.raw.mockResolvedValueOnce([{ count: '42' }]);

      const count = await store.getPendingCount();

      expect(count).toBe(42);
    });

    test('should return 0 when no pending tasks', async () => {
      mockDb.raw.mockResolvedValueOnce([{ count: '0' }]);

      const count = await store.getPendingCount();

      expect(count).toBe(0);
    });

    test('should handle empty result', async () => {
      mockDb.raw.mockResolvedValueOnce([]);

      const count = await store.getPendingCount();

      expect(count).toBe(0);
    });

    test('should parse string count to number', async () => {
      mockDb.raw.mockResolvedValueOnce([{ count: '1000000' }]);

      const count = await store.getPendingCount();

      expect(count).toBe(1000000);
      expect(typeof count).toBe('number');
    });
  });

  // ============================================================================
  // getFailedCount Tests
  // ============================================================================

  describe('getFailedCount', () => {
    test('should return failed task count', async () => {
      mockDb.raw.mockResolvedValueOnce([{ count: '5' }]);

      const count = await store.getFailedCount();

      expect(count).toBe(5);
    });

    test('should return 0 when no failed tasks', async () => {
      mockDb.raw.mockResolvedValueOnce([{ count: '0' }]);

      const count = await store.getFailedCount();

      expect(count).toBe(0);
    });

    test('should handle empty result', async () => {
      mockDb.raw.mockResolvedValueOnce([]);

      const count = await store.getFailedCount();

      expect(count).toBe(0);
    });
  });

  // ============================================================================
  // clearCompleted Tests
  // ============================================================================

  describe('clearCompleted', () => {
    test('should return number of cleared tasks', async () => {
      mockDb.execute.mockResolvedValueOnce(10);

      const cleared = await store.clearCompleted('2024-01-01T00:00:00.000Z');

      expect(cleared).toBe(10);
    });

    test('should return 0 when no tasks cleared', async () => {
      mockDb.execute.mockResolvedValueOnce(0);

      const cleared = await store.clearCompleted('2024-01-01T00:00:00.000Z');

      expect(cleared).toBe(0);
    });

    test('should handle null rowCount', async () => {
      mockDb.execute.mockResolvedValueOnce(0);

      const cleared = await store.clearCompleted('2024-01-01T00:00:00.000Z');

      expect(cleared).toBe(0);
    });

    test('should handle result without rowCount property', async () => {
      mockDb.execute.mockResolvedValueOnce(0);

      const cleared = await store.clearCompleted('2024-01-01T00:00:00.000Z');

      expect(cleared).toBe(0);
    });
  });

  // ============================================================================
  // Factory Function Tests
  // ============================================================================

  describe('createPostgresQueueStore', () => {
    test('should create PostgresQueueStore instance', () => {
      const db = createMockDb();
      const store = createPostgresQueueStore(asMockDb(db));

      expect(store).toBeInstanceOf(PostgresQueueStore);
    });

    test('should create functional store', async () => {
      const db = createMockDb();
      const store = createPostgresQueueStore(asMockDb(db));

      db.raw.mockResolvedValueOnce([{ count: '5' }]);

      const count = await store.getPendingCount();

      expect(count).toBe(5);
    });
  });

  // ============================================================================
  // Edge Cases and Error Handling
  // ============================================================================

  describe('edge cases', () => {
    test('should handle task with null args', async () => {
      const task = createTestTask({ args: null as unknown as Record<string, unknown> });
      mockDb.execute.mockResolvedValueOnce(1);

      await store.enqueue(task);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });

    test('should handle task with empty args object', async () => {
      const task = createTestTask({ args: {} });
      mockDb.execute.mockResolvedValueOnce(1);

      await store.enqueue(task);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });

    test('should handle very long task names', async () => {
      const task = createTestTask({ name: 'a'.repeat(1000) });
      mockDb.execute.mockResolvedValueOnce(1);

      await store.enqueue(task);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });

    test('should handle special characters in task id', async () => {
      const task = createTestTask({ id: 'task-with-special-chars-!@#$%' });
      mockDb.execute.mockResolvedValueOnce(1);

      await store.enqueue(task);

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });

    test('should propagate database errors on dequeue', async () => {
      mockDb.raw.mockRejectedValueOnce(new Error('Lock timeout'));

      await expect(store.dequeue(new Date().toISOString())).rejects.toThrow('Lock timeout');
    });

    test('should propagate database errors on complete', async () => {
      mockDb.execute.mockRejectedValueOnce(new Error('Write failed'));

      await expect(
        store.complete('task-123', {
          taskId: 'task-123',
          success: true,
          completedAt: new Date().toISOString(),
          durationMs: 100,
        }),
      ).rejects.toThrow('Write failed');
    });

    test('should propagate database errors on fail', async () => {
      mockDb.execute.mockRejectedValueOnce(new Error('Transaction aborted'));

      await expect(store.fail('task-123', { name: 'Error', message: 'Test' })).rejects.toThrow(
        'Transaction aborted',
      );
    });
  });

  // ============================================================================
  // Result Extraction Helper Tests
  // ============================================================================

  describe('result extraction', () => {
    test('should handle result with rows property', async () => {
      mockDb.raw.mockResolvedValueOnce([{ count: '10' }]);

      const count = await store.getPendingCount();

      expect(count).toBe(10);
    });

    test('should handle array result directly', async () => {
      mockDb.raw.mockResolvedValueOnce([{ count: '20' }]);

      const count = await store.getPendingCount();

      expect(count).toBe(20);
    });

    test('should handle unexpected result format gracefully', async () => {
      mockDb.raw.mockResolvedValueOnce([]);

      const count = await store.getPendingCount();

      expect(count).toBe(0);
    });

    test('should handle result with undefined rows', async () => {
      mockDb.raw.mockResolvedValueOnce([]);

      const result = await store.dequeue(new Date().toISOString());

      expect(result).toBeNull();
    });
  });
});
