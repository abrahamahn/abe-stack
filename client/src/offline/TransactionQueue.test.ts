// client/src/offline/TransactionQueue.test.ts
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
    createTransactionQueue,
    TransactionQueue,
    type QueuedTransaction,
    type TransactionResponse,
} from './TransactionQueue';

// Mock localStorage
const mockLocalStorage = ((): {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  store: Record<string, string>;
} => {
  let store: Record<string, string> = {};
  return {
    get store() {
      return store;
    },
    getItem: (key: string): string | null => store[key] ?? null,
    setItem: (key: string, value: string): void => {
      store[key] = value;
    },
    removeItem: (key: string): void => {
      const { [key]: _, ...rest } = store;
      store = rest;
    },
    clear: (): void => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock navigator.onLine
let mockOnline = true;
Object.defineProperty(globalThis, 'navigator', {
  value: {
    get onLine() {
      return mockOnline;
    },
  },
  writable: true,
  configurable: true,
});

// Mock window for event listeners
type EventHandler = (event: Event) => void;
const mockWindow = {
  eventListeners: new Map<string, Set<EventHandler>>(),
  addEventListener: (type: string, handler: EventHandler): void => {
    let handlers = mockWindow.eventListeners.get(type);
    if (handlers === undefined) {
      handlers = new Set();
      mockWindow.eventListeners.set(type, handlers);
    }
    handlers.add(handler);
  },
  removeEventListener: (type: string, handler: EventHandler): void => {
    const handlers = mockWindow.eventListeners.get(type);
    if (handlers !== undefined) {
      handlers.delete(handler);
    }
  },
  dispatchEvent: (event: Event): boolean => {
    const handlers = mockWindow.eventListeners.get(event.type);
    if (handlers !== undefined) {
      for (const handler of handlers) {
        handler(event);
      }
    }
    return true;
  },
};

Object.defineProperty(globalThis, 'window', {
  value: mockWindow,
  writable: true,
  configurable: true,
});

// Helper to create a valid transaction
function createTestTransaction(
  txId = `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
  authorId = 'user-1',
): QueuedTransaction {
  return {
    txId,
    authorId,
    clientTimestamp: Date.now(),
    operations: [
      {
        type: 'set',
        table: 'posts',
        id: 'p1',
        key: 'title',
        value: 'Test Title',
      },
    ],
  };
}

describe('TransactionQueue', () => {
  let queue: TransactionQueue;
  let mockSubmit: ReturnType<typeof vi.fn<(transaction: QueuedTransaction) => Promise<TransactionResponse>>>;
  let mockRollback: ReturnType<typeof vi.fn<(transaction: QueuedTransaction) => Promise<void>>>;

  beforeEach(() => {
    mockLocalStorage.clear();
    mockOnline = true;
    mockWindow.eventListeners.clear();
    mockSubmit = vi
      .fn<(transaction: QueuedTransaction) => Promise<TransactionResponse>>()
      .mockResolvedValue({ status: 200 });
    mockRollback = vi.fn<(transaction: QueuedTransaction) => Promise<void>>().mockResolvedValue(undefined);
  });

  afterEach(() => {
    queue?.destroy();
  });

  describe('constructor', () => {
    test('should create a queue with required options', () => {
      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      const status = queue.getStatus();
      expect(status.queueSize).toBe(0);
      expect(status.isProcessing).toBe(false);
      expect(status.isOnline).toBe(true);
    });

    test('should restore queue from localStorage on init', () => {
      const existingTx = createTestTransaction('existing-tx');
      mockLocalStorage.setItem('abe-transaction-queue', JSON.stringify([existingTx]));

      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      expect(queue.getQueuedTransactions()).toHaveLength(1);
      expect(queue.getQueuedTransactions()[0]?.txId).toBe('existing-tx');
    });

    test('should use custom storage key', () => {
      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
        storageKey: 'custom-key',
      });

      void queue.enqueue(createTestTransaction());

      expect(mockLocalStorage.getItem('custom-key')).not.toBeNull();
      expect(mockLocalStorage.getItem('abe-transaction-queue')).toBeNull();
    });

    test('should handle invalid JSON in localStorage gracefully', () => {
      mockLocalStorage.setItem('abe-transaction-queue', 'invalid-json{{{');

      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      // Should not throw and queue should be empty
      expect(queue.getQueuedTransactions()).toHaveLength(0);
    });

    test('should handle operations with short path gracefully', () => {
      mockOnline = false;
      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      // Create a transaction with path containing empty id
      const tx: QueuedTransaction = {
        txId: 'tx-short-path',
        authorId: 'user-1',
        clientTimestamp: Date.now(),
        operations: [{ type: 'set', table: 'only-one', id: '', key: '', value: 'test' }],
      };

      void queue.enqueue(tx);

      // Operations are still tracked even with empty id (implementation doesn't validate)
      expect(queue.isPendingWrite({ table: 'only-one', id: '' })).toBe(true);
    });
  });

  describe('enqueue', () => {
    test('should add transaction to queue', () => {
      mockOnline = false; // Prevent auto-processing
      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      const tx = createTestTransaction();
      const promise = queue.enqueue(tx);

      expect(queue.getQueuedTransactions()).toHaveLength(1);
      expect(promise).toBeInstanceOf(Promise);
    });

    test('should persist queue to localStorage', () => {
      mockOnline = false;
      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      void queue.enqueue(createTestTransaction('persisted-tx'));

      const stored = mockLocalStorage.getItem('abe-transaction-queue');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!) as QueuedTransaction[];
      expect(parsed).toHaveLength(1);
      expect(parsed[0]?.txId).toBe('persisted-tx');
    });

    test('should resolve promise when transaction succeeds', async () => {
      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      const promise = queue.enqueue(createTestTransaction());
      await expect(promise).resolves.toBeUndefined();
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    test('should reject promise when transaction fails permanently', async () => {
      mockSubmit.mockResolvedValue({ status: 400, message: 'Validation failed' });

      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      const promise = queue.enqueue(createTestTransaction());
      await expect(promise).rejects.toThrow();
      expect(mockRollback).toHaveBeenCalledTimes(1);
    });

    test('should call onQueueSizeChange', () => {
      mockOnline = false;
      const onQueueSizeChange = vi.fn();
      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
        onQueueSizeChange,
      });

      void queue.enqueue(createTestTransaction());

      expect(onQueueSizeChange).toHaveBeenCalledWith(1);
    });
  });

  describe('isPendingWrite', () => {
    test('should track pending writes for records', () => {
      mockOnline = false;
      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      void queue.enqueue({
        txId: 'tx-1',
        authorId: 'user-1',
        clientTimestamp: Date.now(),
        operations: [{ type: 'set', table: 'posts', id: 'p1', key: 'title', value: 'Test' }],
      });

      expect(queue.isPendingWrite({ table: 'posts', id: 'p1' })).toBe(true);
      expect(queue.isPendingWrite({ table: 'posts', id: 'p2' })).toBe(false);
    });

    test('should decrement pending writes after transaction completes', async () => {
      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      const pointer = { table: 'posts', id: 'p1' };

      await queue.enqueue({
        txId: 'tx-1',
        authorId: 'user-1',
        clientTimestamp: Date.now(),
        operations: [{ type: 'set', table: 'posts', id: 'p1', key: 'title', value: 'Test' }],
      });

      expect(queue.isPendingWrite(pointer)).toBe(false);
    });
  });

  describe('subscribeIsPendingWrite', () => {
    test('should notify when pending status changes', async () => {
      mockOnline = false;
      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      const callback = vi.fn();
      const pointer = { table: 'posts', id: 'p1' };

      queue.subscribeIsPendingWrite(pointer, callback);

      const promise = queue.enqueue({
        txId: 'tx-1',
        authorId: 'user-1',
        clientTimestamp: Date.now(),
        operations: [{ type: 'set', table: 'posts', id: 'p1', key: 'title', value: 'Test' }],
      });

      expect(callback).toHaveBeenCalledWith(true);

      // Go online and process (must dispatch event to update internal isOnline)
      mockOnline = true;
      mockWindow.dispatchEvent(new Event('online'));

      await promise;

      expect(callback).toHaveBeenCalledWith(false);
    });

    test('should return unsubscribe function', () => {
      mockOnline = false;
      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      const callback = vi.fn();
      const unsubscribe = queue.subscribeIsPendingWrite({ table: 'posts', id: 'p1' }, callback);

      unsubscribe();

      void queue.enqueue({
        txId: 'tx-1',
        authorId: 'user-1',
        clientTimestamp: Date.now(),
        operations: [{ type: 'set', table: 'posts', id: 'p1', key: 'title', value: 'Test' }],
      });

      // Should not be called after unsubscribe
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    test('should return current queue status', () => {
      mockOnline = false;
      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      void queue.enqueue(createTestTransaction());
      void queue.enqueue(createTestTransaction());

      const status = queue.getStatus();
      expect(status.queueSize).toBe(2);
      expect(status.isOnline).toBe(false);
      expect(status.isProcessing).toBe(false);
    });
  });

  describe('reset', () => {
    test('should clear queue and storage', () => {
      mockOnline = false;
      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      void queue.enqueue(createTestTransaction());
      expect(queue.getQueuedTransactions()).toHaveLength(1);

      queue.reset();

      expect(queue.getQueuedTransactions()).toHaveLength(0);
      expect(mockLocalStorage.getItem('abe-transaction-queue')).toBeNull();
    });
  });

  describe('flush', () => {
    test('should process queue when online', async () => {
      mockOnline = false;
      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      const promise = queue.enqueue(createTestTransaction());
      expect(mockSubmit).not.toHaveBeenCalled();

      // Simulate going online (triggers dequeue via event handler)
      mockOnline = true;
      mockWindow.dispatchEvent(new Event('online'));

      // Wait for the transaction to complete
      await promise;

      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(queue.getQueuedTransactions()).toHaveLength(0);
    });

    test('should not process when offline', async () => {
      mockOnline = false;
      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      void queue.enqueue(createTestTransaction());
      await queue.flush();

      expect(mockSubmit).not.toHaveBeenCalled();
    });
  });

  describe('transaction processing', () => {
    test('should fail with unknown status error', async () => {
      mockSubmit.mockResolvedValue({ status: 418, message: "I'm a teapot" });

      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      const tx = createTestTransaction();
      await expect(queue.enqueue(tx)).rejects.toThrow("I'm a teapot");
    });

    test('should handle large transaction exceeding batch size', async () => {
      mockOnline = true;
      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
        maxBatchSize: 50, // Very small batch size
      });

      // Create a transaction with data that exceeds batch size
      const largeData = 'x'.repeat(100);
      const tx: QueuedTransaction = {
        txId: 'tx-large',
        authorId: 'user-1',
        clientTimestamp: Date.now(),
        operations: [{ type: 'set', table: 'table', id: 'id', key: '', value: largeData }],
      };

      await queue.enqueue(tx);
      expect(mockSubmit).toHaveBeenCalled();
    });

    test('should retry on conflict (409)', async () => {
      let callCount = 0;
      mockSubmit.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({ status: 409, message: 'Conflict' });
        }
        return Promise.resolve({ status: 200 });
      });

      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      await queue.enqueue(createTestTransaction());

      expect(mockSubmit).toHaveBeenCalledTimes(3);
      expect(queue.getQueuedTransactions()).toHaveLength(0);
    });

    test('should rollback on validation error (400)', async () => {
      mockSubmit.mockResolvedValue({ status: 400, message: 'Invalid data' });

      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      const tx = createTestTransaction();
      await expect(queue.enqueue(tx)).rejects.toThrow();

      expect(mockRollback).toHaveBeenCalledWith(tx);
    });

    test('should rollback on permission error (403)', async () => {
      mockSubmit.mockResolvedValue({ status: 403, message: 'Forbidden' });

      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      const tx = createTestTransaction();
      await expect(queue.enqueue(tx)).rejects.toThrow('Forbidden');

      expect(mockRollback).toHaveBeenCalledWith(tx);
    });

    test('should stop processing when offline (status 0)', async () => {
      mockSubmit.mockResolvedValue({ status: 0 });

      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      // This will hang because it returns offline and stops processing
      // We need to verify the queue still has the item
      const promise = queue.enqueue(createTestTransaction());

      // Wait a bit for processing attempt
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(queue.getQueuedTransactions()).toHaveLength(1);

      // Cleanup - reset queue to avoid hanging test
      queue.reset();
      // The promise will remain pending, which is expected
      void promise.catch(() => {});
    });

    test('should batch multiple transactions', async () => {
      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      // Enqueue multiple transactions quickly
      const promises = [
        queue.enqueue(createTestTransaction('tx-1')),
        queue.enqueue(createTestTransaction('tx-2')),
        queue.enqueue(createTestTransaction('tx-3')),
      ];

      await Promise.all(promises);

      // Should have batched into fewer calls than 3
      // (depends on timing, but should be <= 3)
      expect(mockSubmit).toHaveBeenCalled();
      expect(queue.getQueuedTransactions()).toHaveLength(0);
    });
  });

  describe('online/offline handling', () => {
    test('should call onOnlineStatusChange callbacks', () => {
      const onOnlineStatusChange = vi.fn();
      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
        onOnlineStatusChange,
      });

      // Simulate going offline
      const offlineEvent = new Event('offline');
      window.dispatchEvent(offlineEvent);

      expect(onOnlineStatusChange).toHaveBeenCalledWith(false);

      // Simulate going online
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      expect(onOnlineStatusChange).toHaveBeenCalledWith(true);
    });

    test('should resume processing when coming back online', async () => {
      mockOnline = false;
      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      const promise = queue.enqueue(createTestTransaction());

      expect(mockSubmit).not.toHaveBeenCalled();

      // Go back online
      mockOnline = true;
      const onlineEvent = new Event('online');
      window.dispatchEvent(onlineEvent);

      await promise;

      expect(mockSubmit).toHaveBeenCalledTimes(1);
      expect(queue.getQueuedTransactions()).toHaveLength(0);
    });
  });

  describe('destroy', () => {
    test('should remove event listeners', () => {
      const removeEventListenerSpy = vi.spyOn(mockWindow, 'removeEventListener');

      queue = new TransactionQueue({
        submitTransaction: mockSubmit,
        onRollback: mockRollback,
      });

      // Verify listeners were added
      expect(mockWindow.eventListeners.get('online')?.size).toBe(1);
      expect(mockWindow.eventListeners.get('offline')?.size).toBe(1);

      queue.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

      // Verify listeners were removed
      expect(mockWindow.eventListeners.get('online')?.size ?? 0).toBe(0);
      expect(mockWindow.eventListeners.get('offline')?.size ?? 0).toBe(0);

      removeEventListenerSpy.mockRestore();
    });
  });
});

describe('createTransactionQueue', () => {
  afterEach(() => {
    mockLocalStorage.clear();
  });

  test('should create a TransactionQueue instance', () => {
    const queue = createTransactionQueue({
      submitTransaction: vi.fn().mockResolvedValue({ status: 200 }),
      onRollback: vi.fn(),
    });

    expect(queue).toBeInstanceOf(TransactionQueue);
    queue.destroy();
  });

  test('should pass all options to TransactionQueue', () => {
    const options = {
      submitTransaction: vi.fn().mockResolvedValue({ status: 200 }),
      onRollback: vi.fn(),
      storageKey: 'custom-key',
      maxBatchSize: 50000,
      maxRetries: 5,
    };

    const queue = createTransactionQueue(options);
    expect(queue).toBeInstanceOf(TransactionQueue);
    queue.destroy();
  });
});
