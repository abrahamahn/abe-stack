// packages/sdk/src/persistence/__tests__/mutationQueue.test.ts
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createMutationQueue, MutationQueue } from '@persistence/mutationQueue';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock navigator.onLine to always be true for tests
Object.defineProperty(globalThis, 'navigator', {
  value: { onLine: true },
  writable: true,
});

describe('MutationQueue', () => {
  let queue: MutationQueue;

  beforeEach(() => {
    mockLocalStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    queue?.destroy();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    test('should create a queue with default options', () => {
      queue = new MutationQueue();
      const status = queue.getStatus();
      expect(status.pendingCount).toBe(0);
      expect(status.isProcessing).toBe(false);
    });

    test('should restore queue from localStorage', () => {
      const existingQueue = [{ id: '1', type: 'test', data: {}, timestamp: Date.now(), retries: 0 }];
      mockLocalStorage.setItem('abe-stack-mutation-queue', JSON.stringify(existingQueue));

      queue = new MutationQueue();
      expect(queue.getPending()).toHaveLength(1);
    });
  });

  describe('add', () => {
    test('should add mutation to queue', () => {
      queue = new MutationQueue();
      const id = queue.add('createPost', { title: 'Test' });

      expect(id).toBeDefined();
      expect(queue.getPending()).toHaveLength(1);
      expect(queue.getPending()[0].type).toBe('createPost');
    });

    test('should generate unique IDs', () => {
      queue = new MutationQueue();
      const id1 = queue.add('test', {});
      const id2 = queue.add('test', {});

      expect(id1).not.toBe(id2);
    });

    test('should persist to localStorage', () => {
      queue = new MutationQueue();
      queue.add('test', { data: 'value' });

      const stored = mockLocalStorage.getItem('abe-stack-mutation-queue');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
    });

    test('should call onStatusChange', () => {
      const onStatusChange = vi.fn();
      queue = new MutationQueue({ onStatusChange });

      queue.add('test', {});

      expect(onStatusChange).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    test('should remove mutation by ID', () => {
      queue = new MutationQueue();
      const id = queue.add('test', {});

      const result = queue.remove(id);

      expect(result).toBe(true);
      expect(queue.getPending()).toHaveLength(0);
    });

    test('should return false for non-existent ID', () => {
      queue = new MutationQueue();
      queue.add('test', {});

      const result = queue.remove('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    test('should return current status', () => {
      // Simulate offline so queue doesn't auto-process
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: false },
        writable: true,
      });

      queue = new MutationQueue();
      queue.add('test1', {});
      queue.add('test2', {});

      const status = queue.getStatus();

      expect(status.pendingCount).toBe(2);
      expect(status.isProcessing).toBe(false);
      expect(status.isOnline).toBe(false);

      // Restore online status
      Object.defineProperty(globalThis, 'navigator', {
        value: { onLine: true },
        writable: true,
      });
    });
  });

  describe('getPending', () => {
    test('should return copy of queue', () => {
      queue = new MutationQueue();
      queue.add('test', {});

      const pending = queue.getPending();
      pending.push({ id: 'fake', type: 'fake', data: {}, timestamp: 0, retries: 0 });

      expect(queue.getPending()).toHaveLength(1);
    });
  });

  describe('clear', () => {
    test('should remove all mutations', () => {
      queue = new MutationQueue();
      queue.add('test1', {});
      queue.add('test2', {});

      queue.clear();

      expect(queue.getPending()).toHaveLength(0);
    });

    test('should persist empty queue', () => {
      queue = new MutationQueue();
      queue.add('test', {});
      queue.clear();

      const stored = mockLocalStorage.getItem('abe-stack-mutation-queue');
      expect(JSON.parse(stored!)).toHaveLength(0);
    });
  });

  describe('processing', () => {
    test('should process mutations with onProcess callback', async () => {
      vi.useRealTimers(); // Use real timers for async processing tests
      const onProcess = vi.fn().mockResolvedValue(undefined);
      const onSuccess = vi.fn();
      queue = new MutationQueue({ onProcess, onSuccess });

      queue.add('test', { data: 'value' });

      // Wait for async processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(onProcess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(queue.getPending()).toHaveLength(0);
    });

    test('should retry on failure', async () => {
      vi.useRealTimers(); // Use real timers for async processing tests
      let callCount = 0;
      const onProcess = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount < 2) {
          throw new Error('Temporary failure');
        }
      });
      const onSuccess = vi.fn();

      queue = new MutationQueue({ onProcess, onSuccess, retryDelay: 10 });
      queue.add('test', {});

      // Wait for retries
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onProcess).toHaveBeenCalledTimes(2);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    test('should call onError after max retries', async () => {
      vi.useRealTimers(); // Use real timers for async processing tests
      const onProcess = vi.fn().mockRejectedValue(new Error('Permanent failure'));
      const onError = vi.fn();

      queue = new MutationQueue({ onProcess, onError, maxRetries: 2, retryDelay: 10 });
      queue.add('test', {});

      // Wait for all retries
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onProcess).toHaveBeenCalledTimes(2);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(queue.getPending()).toHaveLength(0);
    });
  });
});

describe('createMutationQueue', () => {
  afterEach(() => {
    mockLocalStorage.clear();
  });

  test('should create a MutationQueue instance', () => {
    const queue = createMutationQueue();
    expect(queue).toBeInstanceOf(MutationQueue);
    queue.destroy();
  });

  test('should pass options to MutationQueue', () => {
    const onProcess = vi.fn();
    const queue = createMutationQueue({ onProcess, maxRetries: 5 });
    expect(queue).toBeInstanceOf(MutationQueue);
    queue.destroy();
  });
});
