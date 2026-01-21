// apps/server/src/infrastructure/jobs/queue/__tests__/postgresStore.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PostgresQueueStore, createPostgresQueueStore } from '../postgresStore';

import type { Task, TaskError, TaskResult } from '../types';

// ============================================================================
// Mock Database Client
// ============================================================================

interface MockQueryResult {
  rows: unknown[];
  rowCount: number;
}

function createMockDb() {
  const mockExecute = vi.fn<(sql: unknown) => Promise<MockQueryResult>>();

  return {
    execute: mockExecute,
    mockExecute,
  };
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
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();
    store = new PostgresQueueStore(
      mockDb as unknown as Parameters<typeof createPostgresQueueStore>[0],
    );
  });

  // ============================================================================
  // enqueue Tests
  // ============================================================================

  describe('enqueue', () => {
    test('should insert task into database', async () => {
      const task = createTestTask();
      mockDb.mockExecute.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await store.enqueue(task);

      expect(mockDb.mockExecute).toHaveBeenCalledTimes(1);
      // Verify the SQL template was called (we can't easily inspect the exact SQL)
      expect(mockDb.mockExecute).toHaveBeenCalled();
    });

    test('should handle task with complex args', async () => {
      const task = createTestTask({
        args: {
          nested: { deep: { value: 123 } },
          array: [1, 2, 3],
          string: 'test',
        },
      });
      mockDb.mockExecute.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await store.enqueue(task);

      expect(mockDb.mockExecute).toHaveBeenCalledTimes(1);
    });

    test('should propagate database errors', async () => {
      const task = createTestTask();
      const dbError = new Error('Connection failed');
      mockDb.mockExecute.mockRejectedValueOnce(dbError);

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

      mockDb.mockExecute.mockResolvedValueOnce({
        rows: [row],
        rowCount: 1,
      });

      const result = await store.dequeue(new Date().toISOString());

      expect(result).not.toBeNull();
      expect(result?.id).toBe(task.id);
      expect(result?.name).toBe(task.name);
      expect(result?.attempts).toBe(1);
    });

    test('should return null when no tasks are available', async () => {
      mockDb.mockExecute.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await store.dequeue(new Date().toISOString());

      expect(result).toBeNull();
    });

    test('should handle array-style result', async () => {
      const task = createTestTask();
      const row = createTaskRow({ ...task, attempts: 1 });

      // Some Drizzle versions return array directly
      mockDb.mockExecute.mockResolvedValueOnce([row] as unknown as MockQueryResult);

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

      mockDb.mockExecute.mockResolvedValueOnce({
        rows: [row],
        rowCount: 1,
      });

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

      mockDb.mockExecute.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await store.complete('task-123', taskResult);

      expect(mockDb.mockExecute).toHaveBeenCalledTimes(1);
    });

    test('should handle completion with error result', async () => {
      const taskResult: TaskResult = {
        taskId: 'task-123',
        success: false,
        error: { name: 'Error', message: 'Something failed' },
        completedAt: new Date().toISOString(),
        durationMs: 50,
      };

      mockDb.mockExecute.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await store.complete('task-123', taskResult);

      expect(mockDb.mockExecute).toHaveBeenCalledTimes(1);
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

      mockDb.mockExecute.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await store.fail('task-123', error, nextAttemptAt);

      expect(mockDb.mockExecute).toHaveBeenCalledTimes(1);
    });

    test('should mark task as permanently failed when no nextAttemptAt', async () => {
      const error: TaskError = {
        name: 'FatalError',
        message: 'Unrecoverable error',
      };

      mockDb.mockExecute.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await store.fail('task-123', error);

      expect(mockDb.mockExecute).toHaveBeenCalledTimes(1);
    });

    test('should handle error without stack trace', async () => {
      const error: TaskError = {
        name: 'Error',
        message: 'Simple error',
      };

      mockDb.mockExecute.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await store.fail('task-123', error);

      expect(mockDb.mockExecute).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // get Tests
  // ============================================================================

  describe('get', () => {
    test('should return task by id', async () => {
      const task = createTestTask({ id: 'task-abc' });
      const row = createTaskRow(task);

      mockDb.mockExecute.mockResolvedValueOnce({
        rows: [row],
        rowCount: 1,
      });

      const result = await store.get('task-abc');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('task-abc');
    });

    test('should return null for non-existent task', async () => {
      mockDb.mockExecute.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const result = await store.get('non-existent');

      expect(result).toBeNull();
    });

    test('should handle array-style result for get', async () => {
      const task = createTestTask();
      const row = createTaskRow(task);

      mockDb.mockExecute.mockResolvedValueOnce([row] as unknown as MockQueryResult);

      const result = await store.get(task.id);

      expect(result?.id).toBe(task.id);
    });
  });

  // ============================================================================
  // getPendingCount Tests
  // ============================================================================

  describe('getPendingCount', () => {
    test('should return pending task count', async () => {
      mockDb.mockExecute.mockResolvedValueOnce({
        rows: [{ count: '42' }],
        rowCount: 1,
      });

      const count = await store.getPendingCount();

      expect(count).toBe(42);
    });

    test('should return 0 when no pending tasks', async () => {
      mockDb.mockExecute.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        rowCount: 1,
      });

      const count = await store.getPendingCount();

      expect(count).toBe(0);
    });

    test('should handle empty result', async () => {
      mockDb.mockExecute.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const count = await store.getPendingCount();

      expect(count).toBe(0);
    });

    test('should parse string count to number', async () => {
      mockDb.mockExecute.mockResolvedValueOnce({
        rows: [{ count: '1000000' }],
        rowCount: 1,
      });

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
      mockDb.mockExecute.mockResolvedValueOnce({
        rows: [{ count: '5' }],
        rowCount: 1,
      });

      const count = await store.getFailedCount();

      expect(count).toBe(5);
    });

    test('should return 0 when no failed tasks', async () => {
      mockDb.mockExecute.mockResolvedValueOnce({
        rows: [{ count: '0' }],
        rowCount: 1,
      });

      const count = await store.getFailedCount();

      expect(count).toBe(0);
    });

    test('should handle empty result', async () => {
      mockDb.mockExecute.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const count = await store.getFailedCount();

      expect(count).toBe(0);
    });
  });

  // ============================================================================
  // clearCompleted Tests
  // ============================================================================

  describe('clearCompleted', () => {
    test('should return number of cleared tasks', async () => {
      mockDb.mockExecute.mockResolvedValueOnce({
        rows: [],
        rowCount: 10,
      });

      const cleared = await store.clearCompleted('2024-01-01T00:00:00.000Z');

      expect(cleared).toBe(10);
    });

    test('should return 0 when no tasks cleared', async () => {
      mockDb.mockExecute.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
      });

      const cleared = await store.clearCompleted('2024-01-01T00:00:00.000Z');

      expect(cleared).toBe(0);
    });

    test('should handle null rowCount', async () => {
      mockDb.mockExecute.mockResolvedValueOnce({
        rows: [],
        rowCount: null as unknown as number,
      });

      const cleared = await store.clearCompleted('2024-01-01T00:00:00.000Z');

      expect(cleared).toBe(0);
    });

    test('should handle result without rowCount property', async () => {
      mockDb.mockExecute.mockResolvedValueOnce({
        rows: [],
      } as unknown as MockQueryResult);

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
      const store = createPostgresQueueStore(
        db as unknown as Parameters<typeof createPostgresQueueStore>[0],
      );

      expect(store).toBeInstanceOf(PostgresQueueStore);
    });

    test('should create functional store', async () => {
      const db = createMockDb();
      const store = createPostgresQueueStore(
        db as unknown as Parameters<typeof createPostgresQueueStore>[0],
      );

      db.mockExecute.mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1 });

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
      mockDb.mockExecute.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await store.enqueue(task);

      expect(mockDb.mockExecute).toHaveBeenCalledTimes(1);
    });

    test('should handle task with empty args object', async () => {
      const task = createTestTask({ args: {} });
      mockDb.mockExecute.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await store.enqueue(task);

      expect(mockDb.mockExecute).toHaveBeenCalledTimes(1);
    });

    test('should handle very long task names', async () => {
      const task = createTestTask({ name: 'a'.repeat(1000) });
      mockDb.mockExecute.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await store.enqueue(task);

      expect(mockDb.mockExecute).toHaveBeenCalledTimes(1);
    });

    test('should handle special characters in task id', async () => {
      const task = createTestTask({ id: 'task-with-special-chars-!@#$%' });
      mockDb.mockExecute.mockResolvedValueOnce({ rows: [], rowCount: 1 });

      await store.enqueue(task);

      expect(mockDb.mockExecute).toHaveBeenCalledTimes(1);
    });

    test('should propagate database errors on dequeue', async () => {
      mockDb.mockExecute.mockRejectedValueOnce(new Error('Lock timeout'));

      await expect(store.dequeue(new Date().toISOString())).rejects.toThrow('Lock timeout');
    });

    test('should propagate database errors on complete', async () => {
      mockDb.mockExecute.mockRejectedValueOnce(new Error('Write failed'));

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
      mockDb.mockExecute.mockRejectedValueOnce(new Error('Transaction aborted'));

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
      mockDb.mockExecute.mockResolvedValueOnce({
        rows: [{ count: '10' }],
        rowCount: 1,
      });

      const count = await store.getPendingCount();

      expect(count).toBe(10);
    });

    test('should handle array result directly', async () => {
      // Drizzle sometimes returns arrays directly
      mockDb.mockExecute.mockResolvedValueOnce([{ count: '20' }] as unknown as MockQueryResult);

      const count = await store.getPendingCount();

      expect(count).toBe(20);
    });

    test('should handle unexpected result format gracefully', async () => {
      mockDb.mockExecute.mockResolvedValueOnce('unexpected' as unknown as MockQueryResult);

      const count = await store.getPendingCount();

      expect(count).toBe(0);
    });

    test('should handle result with undefined rows', async () => {
      mockDb.mockExecute.mockResolvedValueOnce({
        rows: undefined,
        rowCount: 0,
      } as unknown as MockQueryResult);

      const result = await store.dequeue(new Date().toISOString());

      expect(result).toBeNull();
    });
  });
});
