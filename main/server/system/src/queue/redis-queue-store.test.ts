// main/server/system/src/queue/redis-queue-store.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { RedisQueueStore, createRedisQueueStore } from './redis-queue-store';

import type { Task } from '@bslt/db';

// ============================================================================
// Mock ioredis
// ============================================================================

/**
 * Creates a mock pipeline that records commands and executes them
 * in order when exec() is called.
 */
function createMockPipeline() {
  return {
    set: vi.fn().mockReturnThis(),
    lpush: vi.fn().mockReturnThis(),
    zadd: vi.fn().mockReturnThis(),
    srem: vi.fn().mockReturnThis(),
    sadd: vi.fn().mockReturnThis(),
    del: vi.fn().mockReturnThis(),
    zrem: vi.fn().mockReturnThis(),
    zremrangebyscore: vi.fn().mockReturnThis(),
    lrem: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([]),
  };
}

const mockRedisInstance = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  rpop: vi.fn(),
  lpush: vi.fn(),
  llen: vi.fn(),
  zcard: vi.fn(),
  zadd: vi.fn(),
  zrangebyscore: vi.fn(),
  zremrangebyscore: vi.fn(),
  sadd: vi.fn(),
  srem: vi.fn(),
  lrem: vi.fn(),
  keys: vi.fn(),
  mget: vi.fn(),
  quit: vi.fn(),
  connect: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  pipeline: vi.fn(() => createMockPipeline()),
};

vi.mock('ioredis', () => {
  // Use a real function so `new` works without vitest warnings
  function MockRedis() {
    return mockRedisInstance;
  }
  return { default: MockRedis };
});

// ============================================================================
// Test Helpers
// ============================================================================

function makeTask(overrides: Partial<Task> = {}): Task {
  const now = new Date().toISOString();
  return {
    id: 'task-1',
    name: 'test-task',
    args: { foo: 'bar' },
    scheduledAt: now,
    attempts: 0,
    maxAttempts: 3,
    createdAt: now,
    ...overrides,
  };
}

function storedTaskJson(task: Task, status = 'pending', extra: Record<string, unknown> = {}): string {
  return JSON.stringify({ ...task, status, ...extra });
}

// ============================================================================
// RedisQueueStore Tests
// ============================================================================

describe('RedisQueueStore', () => {
  let store: RedisQueueStore;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRedisInstance.connect.mockResolvedValue(undefined);
    // Reset pipeline mock to return fresh pipeline per call
    mockRedisInstance.pipeline.mockImplementation(() => createMockPipeline());
    store = new RedisQueueStore({
      host: 'localhost',
      port: 6379,
      keyPrefix: 'q',
    });
  });

  // --------------------------------------------------------------------------
  // enqueue
  // --------------------------------------------------------------------------

  describe('enqueue', () => {
    test('should store task and push to ready list for immediate tasks', async () => {
      const task = makeTask({ scheduledAt: new Date(Date.now() - 1000).toISOString() });
      let capturedPipeline: ReturnType<typeof createMockPipeline> | undefined;
      mockRedisInstance.pipeline.mockImplementation(() => {
        capturedPipeline = createMockPipeline();
        return capturedPipeline;
      });

      await store.enqueue(task);

      expect(capturedPipeline).toBeDefined();
      expect(capturedPipeline!.set).toHaveBeenCalledWith(
        `q:task:${task.id}`,
        expect.stringContaining('"status":"pending"'),
      );
      expect(capturedPipeline!.lpush).toHaveBeenCalledWith('q:ready', task.id);
      expect(capturedPipeline!.exec).toHaveBeenCalled();
    });

    test('should add to scheduled set for future tasks', async () => {
      const futureTime = new Date(Date.now() + 60000);
      const task = makeTask({ scheduledAt: futureTime.toISOString() });
      let capturedPipeline: ReturnType<typeof createMockPipeline> | undefined;
      mockRedisInstance.pipeline.mockImplementation(() => {
        capturedPipeline = createMockPipeline();
        return capturedPipeline;
      });

      await store.enqueue(task);

      expect(capturedPipeline).toBeDefined();
      expect(capturedPipeline!.zadd).toHaveBeenCalledWith(
        'q:scheduled',
        String(futureTime.getTime()),
        task.id,
      );
      expect(capturedPipeline!.lpush).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // dequeue
  // --------------------------------------------------------------------------

  describe('dequeue', () => {
    test('should return task from ready list', async () => {
      const task = makeTask();
      const stored = storedTaskJson(task, 'pending');

      // No scheduled tasks to promote
      mockRedisInstance.zrangebyscore.mockResolvedValue([]);
      // Pop task ID from ready list
      mockRedisInstance.rpop.mockResolvedValue(task.id);
      // Load task data
      mockRedisInstance.get.mockResolvedValue(stored);

      const result = await store.dequeue(new Date().toISOString());

      expect(result).not.toBeNull();
      expect(result?.id).toBe(task.id);
      expect(result?.name).toBe(task.name);
      expect(result?.attempts).toBe(1); // incremented
    });

    test('should return null when no tasks are ready', async () => {
      mockRedisInstance.zrangebyscore.mockResolvedValue([]);
      mockRedisInstance.rpop.mockResolvedValue(null);

      const result = await store.dequeue(new Date().toISOString());

      expect(result).toBeNull();
    });

    test('should return null when task data is missing', async () => {
      mockRedisInstance.zrangebyscore.mockResolvedValue([]);
      mockRedisInstance.rpop.mockResolvedValue('ghost-task');
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await store.dequeue(new Date().toISOString());

      expect(result).toBeNull();
    });

    test('should promote scheduled tasks before dequeuing', async () => {
      const task = makeTask({ id: 'scheduled-task' });
      const stored = storedTaskJson(task, 'pending');

      // One scheduled task ready to promote
      mockRedisInstance.zrangebyscore.mockResolvedValue(['scheduled-task']);
      // After promotion, rpop returns the task
      mockRedisInstance.rpop.mockResolvedValue('scheduled-task');
      mockRedisInstance.get.mockResolvedValue(stored);

      await store.dequeue(new Date().toISOString());

      // Verify promote was called (pipeline with lpush + zremrangebyscore)
      expect(mockRedisInstance.zrangebyscore).toHaveBeenCalledWith(
        'q:scheduled',
        '-inf',
        expect.any(String),
      );
    });

    test('should mark dequeued task as processing', async () => {
      const task = makeTask();
      const stored = storedTaskJson(task, 'pending');

      mockRedisInstance.zrangebyscore.mockResolvedValue([]);
      mockRedisInstance.rpop.mockResolvedValue(task.id);
      mockRedisInstance.get.mockResolvedValue(stored);

      let capturedPipeline: ReturnType<typeof createMockPipeline> | undefined;
      let pipelineCallCount = 0;
      mockRedisInstance.pipeline.mockImplementation(() => {
        pipelineCallCount++;
        const p = createMockPipeline();
        // The second pipeline call is the one that sets processing status
        // (first may be the promote call)
        capturedPipeline = p;
        return p;
      });

      await store.dequeue(new Date().toISOString());

      expect(capturedPipeline).toBeDefined();
      // Should add to processing set
      expect(capturedPipeline!.sadd).toHaveBeenCalledWith('q:processing', task.id);
    });
  });

  // --------------------------------------------------------------------------
  // complete
  // --------------------------------------------------------------------------

  describe('complete', () => {
    test('should mark task as completed', async () => {
      const task = makeTask();
      const stored = storedTaskJson(task, 'processing', { attempts: 1 });
      const completedAt = new Date().toISOString();

      mockRedisInstance.get.mockResolvedValue(stored);
      let capturedPipeline: ReturnType<typeof createMockPipeline> | undefined;
      mockRedisInstance.pipeline.mockImplementation(() => {
        capturedPipeline = createMockPipeline();
        return capturedPipeline;
      });

      await store.complete(task.id, {
        taskId: task.id,
        success: true,
        completedAt,
        durationMs: 150,
      });

      expect(capturedPipeline).toBeDefined();
      expect(capturedPipeline!.set).toHaveBeenCalledWith(
        `q:task:${task.id}`,
        expect.stringContaining('"status":"completed"'),
      );
      expect(capturedPipeline!.srem).toHaveBeenCalledWith('q:processing', task.id);
    });

    test('should no-op when task does not exist', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

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

  // --------------------------------------------------------------------------
  // fail
  // --------------------------------------------------------------------------

  describe('fail', () => {
    test('should reschedule task for retry when nextAttemptAt is provided', async () => {
      const task = makeTask();
      const stored = storedTaskJson(task, 'processing', { attempts: 1 });
      const nextAttempt = new Date(Date.now() + 5000).toISOString();

      mockRedisInstance.get.mockResolvedValue(stored);
      let capturedPipeline: ReturnType<typeof createMockPipeline> | undefined;
      mockRedisInstance.pipeline.mockImplementation(() => {
        capturedPipeline = createMockPipeline();
        return capturedPipeline;
      });

      await store.fail(task.id, { name: 'Error', message: 'Something broke' }, nextAttempt);

      expect(capturedPipeline).toBeDefined();
      expect(capturedPipeline!.zadd).toHaveBeenCalledWith(
        'q:scheduled',
        String(new Date(nextAttempt).getTime()),
        task.id,
      );
      expect(capturedPipeline!.srem).toHaveBeenCalledWith('q:processing', task.id);
      // Task data should reflect pending status for retry
      expect(capturedPipeline!.set).toHaveBeenCalledWith(
        `q:task:${task.id}`,
        expect.stringContaining('"status":"pending"'),
      );
    });

    test('should mark task as permanently failed when no nextAttemptAt', async () => {
      const task = makeTask();
      const stored = storedTaskJson(task, 'processing', { attempts: 3 });

      mockRedisInstance.get.mockResolvedValue(stored);
      let capturedPipeline: ReturnType<typeof createMockPipeline> | undefined;
      mockRedisInstance.pipeline.mockImplementation(() => {
        capturedPipeline = createMockPipeline();
        return capturedPipeline;
      });

      await store.fail(task.id, { name: 'Error', message: 'Permanently failed' });

      expect(capturedPipeline).toBeDefined();
      expect(capturedPipeline!.set).toHaveBeenCalledWith(
        `q:task:${task.id}`,
        expect.stringContaining('"status":"failed"'),
      );
      expect(capturedPipeline!.zadd).not.toHaveBeenCalled();
    });

    test('should store error information', async () => {
      const task = makeTask();
      const stored = storedTaskJson(task, 'processing', { attempts: 1 });

      mockRedisInstance.get.mockResolvedValue(stored);
      let capturedPipeline: ReturnType<typeof createMockPipeline> | undefined;
      mockRedisInstance.pipeline.mockImplementation(() => {
        capturedPipeline = createMockPipeline();
        return capturedPipeline;
      });

      const taskError = { name: 'TestError', message: 'Test failure', stack: 'stack trace' };
      await store.fail(task.id, taskError);

      expect(capturedPipeline!.set).toHaveBeenCalledWith(
        `q:task:${task.id}`,
        expect.stringContaining('"name":"TestError"'),
      );
    });

    test('should no-op when task does not exist', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      await expect(
        store.fail('non-existent', { name: 'Error', message: 'Test' }),
      ).resolves.toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // get
  // --------------------------------------------------------------------------

  describe('get', () => {
    test('should return task by id', async () => {
      const task = makeTask();
      const stored = storedTaskJson(task, 'pending');

      mockRedisInstance.get.mockResolvedValue(stored);

      const result = await store.get(task.id);

      expect(mockRedisInstance.get).toHaveBeenCalledWith(`q:task:${task.id}`);
      expect(result).toEqual(task);
    });

    test('should return null for non-existent task', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await store.get('non-existent');

      expect(result).toBeNull();
    });

    test('should strip internal status fields from returned task', async () => {
      const task = makeTask();
      const stored = storedTaskJson(task, 'processing', {
        error: { name: 'Err', message: 'msg' },
        completedAt: '2025-01-01T00:00:00.000Z',
      });

      mockRedisInstance.get.mockResolvedValue(stored);

      const result = await store.get(task.id);

      expect(result).not.toHaveProperty('status');
      expect(result).not.toHaveProperty('error');
      expect(result).not.toHaveProperty('completedAt');
    });
  });

  // --------------------------------------------------------------------------
  // getPendingCount
  // --------------------------------------------------------------------------

  describe('getPendingCount', () => {
    test('should return sum of ready list and scheduled set', async () => {
      mockRedisInstance.llen.mockResolvedValue(3);
      mockRedisInstance.zcard.mockResolvedValue(2);

      const count = await store.getPendingCount();

      expect(mockRedisInstance.llen).toHaveBeenCalledWith('q:ready');
      expect(mockRedisInstance.zcard).toHaveBeenCalledWith('q:scheduled');
      expect(count).toBe(5);
    });

    test('should return 0 when queue is empty', async () => {
      mockRedisInstance.llen.mockResolvedValue(0);
      mockRedisInstance.zcard.mockResolvedValue(0);

      const count = await store.getPendingCount();

      expect(count).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // getFailedCount
  // --------------------------------------------------------------------------

  describe('getFailedCount', () => {
    test('should count failed tasks', async () => {
      const failedTask = storedTaskJson(makeTask({ id: 'failed-1' }), 'failed');
      const pendingTask = storedTaskJson(makeTask({ id: 'pending-1' }), 'pending');

      mockRedisInstance.keys.mockResolvedValue(['q:task:failed-1', 'q:task:pending-1']);
      mockRedisInstance.mget.mockResolvedValue([failedTask, pendingTask]);

      const count = await store.getFailedCount();

      expect(count).toBe(1);
    });

    test('should return 0 when no tasks exist', async () => {
      mockRedisInstance.keys.mockResolvedValue([]);

      const count = await store.getFailedCount();

      expect(count).toBe(0);
    });

    test('should skip malformed entries', async () => {
      mockRedisInstance.keys.mockResolvedValue(['q:task:bad']);
      mockRedisInstance.mget.mockResolvedValue(['not-json']);

      const count = await store.getFailedCount();

      expect(count).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // clearCompleted
  // --------------------------------------------------------------------------

  describe('clearCompleted', () => {
    test('should delete completed tasks older than given date', async () => {
      const past = new Date(Date.now() - 60000).toISOString();
      const completedTask = storedTaskJson(
        makeTask({ id: 'completed-1' }),
        'completed',
        { completedAt: past, durationMs: 100 },
      );

      mockRedisInstance.keys.mockResolvedValue(['q:task:completed-1']);
      mockRedisInstance.mget.mockResolvedValue([completedTask]);
      mockRedisInstance.del.mockResolvedValue(1);

      const cleared = await store.clearCompleted(new Date().toISOString());

      expect(cleared).toBe(1);
      expect(mockRedisInstance.del).toHaveBeenCalledWith('q:task:completed-1');
    });

    test('should not delete recently completed tasks', async () => {
      const now = new Date();
      const completedTask = storedTaskJson(
        makeTask({ id: 'completed-1' }),
        'completed',
        { completedAt: now.toISOString(), durationMs: 100 },
      );

      mockRedisInstance.keys.mockResolvedValue(['q:task:completed-1']);
      mockRedisInstance.mget.mockResolvedValue([completedTask]);

      const cleared = await store.clearCompleted(new Date(now.getTime() - 60000).toISOString());

      expect(cleared).toBe(0);
      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });

    test('should not affect non-completed tasks', async () => {
      const pendingTask = storedTaskJson(makeTask({ id: 'pending-1' }), 'pending');
      const failedTask = storedTaskJson(makeTask({ id: 'failed-1' }), 'failed');

      mockRedisInstance.keys.mockResolvedValue(['q:task:pending-1', 'q:task:failed-1']);
      mockRedisInstance.mget.mockResolvedValue([pendingTask, failedTask]);

      const cleared = await store.clearCompleted(new Date().toISOString());

      expect(cleared).toBe(0);
    });

    test('should return 0 when no tasks exist', async () => {
      mockRedisInstance.keys.mockResolvedValue([]);

      const cleared = await store.clearCompleted(new Date().toISOString());

      expect(cleared).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // moveToDeadLetter
  // --------------------------------------------------------------------------

  describe('moveToDeadLetter', () => {
    test('should move task to dead letter queue', async () => {
      const task = makeTask();
      const stored = storedTaskJson(task, 'failed');

      mockRedisInstance.get.mockResolvedValue(stored);
      let capturedPipeline: ReturnType<typeof createMockPipeline> | undefined;
      mockRedisInstance.pipeline.mockImplementation(() => {
        capturedPipeline = createMockPipeline();
        return capturedPipeline;
      });

      const result = await store.moveToDeadLetter(task.id, 'Max retries exceeded');

      expect(result).toBe(true);
      expect(capturedPipeline).toBeDefined();
      expect(capturedPipeline!.set).toHaveBeenCalledWith(
        `q:task:${task.id}`,
        expect.stringContaining('"status":"dead_letter"'),
      );
      expect(capturedPipeline!.set).toHaveBeenCalledWith(
        `q:task:${task.id}`,
        expect.stringContaining('"deadLetterReason":"Max retries exceeded"'),
      );
      expect(capturedPipeline!.lpush).toHaveBeenCalledWith('q:dead_letter', task.id);
    });

    test('should return false when task does not exist', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await store.moveToDeadLetter('non-existent', 'reason');

      expect(result).toBe(false);
    });

    test('should remove task from processing and scheduled sets', async () => {
      const task = makeTask();
      const stored = storedTaskJson(task, 'processing');

      mockRedisInstance.get.mockResolvedValue(stored);
      let capturedPipeline: ReturnType<typeof createMockPipeline> | undefined;
      mockRedisInstance.pipeline.mockImplementation(() => {
        capturedPipeline = createMockPipeline();
        return capturedPipeline;
      });

      await store.moveToDeadLetter(task.id, 'Manual intervention');

      expect(capturedPipeline!.srem).toHaveBeenCalledWith('q:processing', task.id);
      expect(capturedPipeline!.zrem).toHaveBeenCalledWith('q:scheduled', task.id);
    });
  });

  // --------------------------------------------------------------------------
  // retryJob
  // --------------------------------------------------------------------------

  describe('retryJob', () => {
    test('should reschedule a failed task', async () => {
      const task = makeTask({ attempts: 3, maxAttempts: 3 });
      const stored = storedTaskJson(task, 'failed', {
        error: { name: 'Error', message: 'Failed' },
      });

      mockRedisInstance.get.mockResolvedValue(stored);
      let capturedPipeline: ReturnType<typeof createMockPipeline> | undefined;
      mockRedisInstance.pipeline.mockImplementation(() => {
        capturedPipeline = createMockPipeline();
        return capturedPipeline;
      });

      const result = await store.retryJob(task.id);

      expect(result).toBe(true);
      expect(capturedPipeline).toBeDefined();
      expect(capturedPipeline!.set).toHaveBeenCalledWith(
        `q:task:${task.id}`,
        expect.stringContaining('"status":"pending"'),
      );
      expect(capturedPipeline!.zadd).toHaveBeenCalledWith(
        'q:scheduled',
        expect.any(String),
        task.id,
      );
    });

    test('should reschedule a dead letter task', async () => {
      const task = makeTask({ attempts: 3, maxAttempts: 3 });
      const stored = storedTaskJson(task, 'dead_letter', {
        deadLetterReason: 'Max retries',
      });

      mockRedisInstance.get.mockResolvedValue(stored);
      let capturedPipeline: ReturnType<typeof createMockPipeline> | undefined;
      mockRedisInstance.pipeline.mockImplementation(() => {
        capturedPipeline = createMockPipeline();
        return capturedPipeline;
      });

      const result = await store.retryJob(task.id);

      expect(result).toBe(true);
      // Should remove from dead letter list
      expect(capturedPipeline!.lrem).toHaveBeenCalledWith('q:dead_letter', 0, task.id);
    });

    test('should extend maxAttempts when already exhausted', async () => {
      const task = makeTask({ attempts: 3, maxAttempts: 3 });
      const stored = storedTaskJson(task, 'failed');

      mockRedisInstance.get.mockResolvedValue(stored);
      let capturedPipeline: ReturnType<typeof createMockPipeline> | undefined;
      mockRedisInstance.pipeline.mockImplementation(() => {
        capturedPipeline = createMockPipeline();
        return capturedPipeline;
      });

      await store.retryJob(task.id);

      // Task data should have maxAttempts increased to allow the retry
      expect(capturedPipeline!.set).toHaveBeenCalledWith(
        `q:task:${task.id}`,
        expect.stringContaining('"maxAttempts":4'),
      );
    });

    test('should return false for non-existent task', async () => {
      mockRedisInstance.get.mockResolvedValue(null);

      const result = await store.retryJob('non-existent');

      expect(result).toBe(false);
    });

    test('should return false for pending task', async () => {
      const task = makeTask();
      const stored = storedTaskJson(task, 'pending');

      mockRedisInstance.get.mockResolvedValue(stored);

      const result = await store.retryJob(task.id);

      expect(result).toBe(false);
    });

    test('should return false for processing task', async () => {
      const task = makeTask();
      const stored = storedTaskJson(task, 'processing');

      mockRedisInstance.get.mockResolvedValue(stored);

      const result = await store.retryJob(task.id);

      expect(result).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // close
  // --------------------------------------------------------------------------

  describe('close', () => {
    test('should quit the Redis client when it owns the client', async () => {
      mockRedisInstance.quit.mockResolvedValue('OK');

      await store.close();

      expect(mockRedisInstance.quit).toHaveBeenCalled();
    });

    test('should not quit a shared Redis client', async () => {
      const sharedStore = new RedisQueueStore({ client: mockRedisInstance as never });

      await sharedStore.close();

      expect(mockRedisInstance.quit).not.toHaveBeenCalled();
    });

    test('should be idempotent', async () => {
      mockRedisInstance.quit.mockResolvedValue('OK');

      await store.close();
      await store.close();

      expect(mockRedisInstance.quit).toHaveBeenCalledTimes(1);
    });
  });

  // --------------------------------------------------------------------------
  // Key prefixing
  // --------------------------------------------------------------------------

  describe('key prefixing', () => {
    test('should use configured prefix for all keys', async () => {
      const task = makeTask({ scheduledAt: new Date(Date.now() - 1000).toISOString() });
      let capturedPipeline: ReturnType<typeof createMockPipeline> | undefined;
      mockRedisInstance.pipeline.mockImplementation(() => {
        capturedPipeline = createMockPipeline();
        return capturedPipeline;
      });

      await store.enqueue(task);

      expect(capturedPipeline!.set).toHaveBeenCalledWith(
        `q:task:${task.id}`,
        expect.any(String),
      );
      expect(capturedPipeline!.lpush).toHaveBeenCalledWith('q:ready', task.id);
    });

    test('should use default "queue" prefix when not configured', async () => {
      const defaultStore = new RedisQueueStore({ client: mockRedisInstance as never });
      mockRedisInstance.get.mockResolvedValue(null);

      await defaultStore.get('test-id');

      expect(mockRedisInstance.get).toHaveBeenCalledWith('queue:task:test-id');
    });
  });

  // --------------------------------------------------------------------------
  // Factory function
  // --------------------------------------------------------------------------

  describe('createRedisQueueStore', () => {
    test('should create a RedisQueueStore instance', () => {
      const factoryStore = createRedisQueueStore({ client: mockRedisInstance as never });

      expect(factoryStore).toBeInstanceOf(RedisQueueStore);
    });

    test('should accept empty options', () => {
      const factoryStore = createRedisQueueStore();

      expect(factoryStore).toBeInstanceOf(RedisQueueStore);
    });
  });

  // --------------------------------------------------------------------------
  // Constructor
  // --------------------------------------------------------------------------

  describe('constructor', () => {
    test('should accept an existing Redis client', () => {
      const sharedStore = new RedisQueueStore({ client: mockRedisInstance as never });

      expect(sharedStore.getClient()).toBe(mockRedisInstance);
    });

    test('should create a new client when none provided', () => {
      expect(store.getClient()).toBeDefined();
    });
  });

  // --------------------------------------------------------------------------
  // idempotency
  // --------------------------------------------------------------------------

  describe('idempotency', () => {
    test('should skip enqueue when duplicate idempotency key is detected', async () => {
      const task = makeTask({
        scheduledAt: new Date(Date.now() - 1000).toISOString(),
        idempotencyKey: 'idem-1',
      });

      // First enqueue: SET NX succeeds (returns 'OK')
      mockRedisInstance.set.mockResolvedValueOnce('OK');
      let firstPipeline: ReturnType<typeof createMockPipeline> | undefined;
      mockRedisInstance.pipeline.mockImplementationOnce(() => {
        firstPipeline = createMockPipeline();
        return firstPipeline;
      });

      await store.enqueue(task);

      expect(mockRedisInstance.set).toHaveBeenCalledWith('q:idem:idem-1', task.id, 'NX');
      expect(firstPipeline).toBeDefined();
      expect(firstPipeline!.set).toHaveBeenCalled();

      // Second enqueue with same idempotency key: SET NX returns null (key exists)
      mockRedisInstance.set.mockResolvedValueOnce(null);
      let secondPipeline: ReturnType<typeof createMockPipeline> | undefined;
      mockRedisInstance.pipeline.mockImplementationOnce(() => {
        secondPipeline = createMockPipeline();
        return secondPipeline;
      });

      const duplicateTask = makeTask({ id: 'task-2', idempotencyKey: 'idem-1' });
      await store.enqueue(duplicateTask);

      // Pipeline should NOT have been created for the duplicate
      expect(secondPipeline).toBeUndefined();
    });

    test('should enqueue normally when no idempotency key is provided', async () => {
      const task = makeTask({ scheduledAt: new Date(Date.now() - 1000).toISOString() });

      await store.enqueue(task);

      // SET NX should not have been called (no idempotency key)
      const setNxCalls = mockRedisInstance.set.mock.calls.filter(
        (call: unknown[]) => call.length === 3 && call[2] === 'NX',
      );
      expect(setNxCalls).toHaveLength(0);

      // Pipeline should have been used for normal enqueue
      expect(mockRedisInstance.pipeline).toHaveBeenCalled();
    });

    test('should allow enqueue when idempotency keys differ', async () => {
      const taskA = makeTask({
        id: 'task-a',
        scheduledAt: new Date(Date.now() - 1000).toISOString(),
        idempotencyKey: 'key-a',
      });
      const taskB = makeTask({
        id: 'task-b',
        scheduledAt: new Date(Date.now() - 1000).toISOString(),
        idempotencyKey: 'key-b',
      });

      // Both SET NX calls succeed
      mockRedisInstance.set.mockResolvedValueOnce('OK');
      mockRedisInstance.pipeline.mockImplementationOnce(() => createMockPipeline());
      await store.enqueue(taskA);

      mockRedisInstance.set.mockResolvedValueOnce('OK');
      let capturedPipeline: ReturnType<typeof createMockPipeline> | undefined;
      mockRedisInstance.pipeline.mockImplementationOnce(() => {
        capturedPipeline = createMockPipeline();
        return capturedPipeline;
      });
      await store.enqueue(taskB);

      expect(capturedPipeline).toBeDefined();
      expect(capturedPipeline!.set).toHaveBeenCalled();
    });
  });
});
