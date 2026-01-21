// packages/sdk/src/__tests__/integration/offline-workflow.integration.test.ts
/**
 * Integration tests for the full offline workflow:
 * RecordCache -> TransactionQueue -> Server Sync
 *
 * Tests optimistic updates, queue processing, and rollback scenarios.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RecordCache, type TableMap } from '../../cache/RecordCache';
import {
  TransactionQueue,
  type QueuedTransaction,
  type TransactionResponse,
} from '../../offline/TransactionQueue';
import { RecordStorage, type VersionedRecord } from '../../storage/RecordStorage';

// ============================================================================
// Test Types
// ============================================================================

interface User extends VersionedRecord {
  id: string;
  version: number;
  name: string;
  email: string;
  status: 'active' | 'inactive';
}

interface Post extends VersionedRecord {
  id: string;
  version: number;
  title: string;
  content: string;
  authorId: string;
}

interface TestTables extends TableMap {
  user: User;
  post: Post;
}

type TestTableNames = 'user' | 'post';

// ============================================================================
// Mock Setup
// ============================================================================

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
    if (!handlers) {
      handlers = new Set();
      mockWindow.eventListeners.set(type, handlers);
    }
    handlers.add(handler);
  },
  removeEventListener: (type: string, handler: EventHandler): void => {
    const handlers = mockWindow.eventListeners.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  },
  dispatchEvent: (event: Event): boolean => {
    const handlers = mockWindow.eventListeners.get(event.type);
    if (handlers) {
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

// ============================================================================
// Test Helpers
// ============================================================================

interface OfflineSystem {
  cache: RecordCache<TestTables>;
  storage: RecordStorage<TestTableNames>;
  queue: TransactionQueue;
  mockSubmit: ReturnType<typeof vi.fn<[QueuedTransaction], Promise<TransactionResponse>>>;
  mockRollback: ReturnType<typeof vi.fn<[QueuedTransaction], Promise<void>>>;
  applyOptimisticUpdate: (
    operations: Array<{
      table: keyof TestTables & string;
      id: string;
      updates: Partial<TestTables[keyof TestTables]>;
    }>,
  ) => { rollbacks: Array<() => void>; transaction: QueuedTransaction };
  simulateServerConfirm: (
    table: keyof TestTables & string,
    id: string,
    record: TestTables[keyof TestTables],
  ) => void;
}

function createOfflineSystem(): OfflineSystem {
  const cache = new RecordCache<TestTables>();
  const storage = new RecordStorage<TestTableNames>({ dbName: 'test-offline' });

  const mockSubmit = vi
    .fn<[QueuedTransaction], Promise<TransactionResponse>>()
    .mockResolvedValue({ status: 200 });

  const mockRollback = vi.fn<[QueuedTransaction], Promise<void>>().mockResolvedValue(undefined);

  const queue = new TransactionQueue({
    submitTransaction: mockSubmit,
    onRollback: mockRollback,
    storageKey: 'test-offline-queue',
  });

  const applyOptimisticUpdate = (
    operations: Array<{
      table: keyof TestTables & string;
      id: string;
      updates: Partial<TestTables[keyof TestTables]>;
    }>,
  ): { rollbacks: Array<() => void>; transaction: QueuedTransaction } => {
    const rollbacks: Array<() => void> = [];

    for (const op of operations) {
      const rollback = cache.optimisticUpdate(op.table, op.id, op.updates);
      if (rollback) {
        rollbacks.push(rollback);
      }
    }

    const transaction: QueuedTransaction = {
      id: `tx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      authorId: 'test-user',
      timestamp: Date.now(),
      operations: operations.map((op) => ({
        type: 'set' as const,
        path: [op.table, op.id, ...Object.keys(op.updates)],
        value: op.updates,
      })),
    };

    return { rollbacks, transaction };
  };

  const simulateServerConfirm = (
    table: keyof TestTables & string,
    id: string,
    record: TestTables[keyof TestTables],
  ): void => {
    cache.set(table, id, record, { force: true });
    cache.commitOptimisticUpdate(table, id);
  };

  return {
    cache,
    storage,
    queue,
    mockSubmit,
    mockRollback,
    applyOptimisticUpdate,
    simulateServerConfirm,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Offline Workflow Integration', () => {
  let system: OfflineSystem;

  beforeEach(async () => {
    mockLocalStorage.clear();
    mockOnline = true;
    mockWindow.eventListeners.clear();
    system = createOfflineSystem();
    await system.storage.ready();
  });

  afterEach(async () => {
    system.queue.destroy();
    system.cache.reset();
    await system.storage.reset();
  });

  describe('optimistic updates with queue', () => {
    it('should apply optimistic update and queue transaction', async () => {
      const { cache, queue, applyOptimisticUpdate } = system;

      // Seed cache
      const user: User = {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'alice@test.com',
        status: 'active',
      };
      cache.set('user', user.id, user);

      // Apply optimistic update
      const { transaction } = applyOptimisticUpdate([
        { table: 'user', id: 'u1', updates: { name: 'Alice Updated' } },
      ]);

      // Cache should have optimistic value
      expect(cache.get('user', 'u1')?.name).toBe('Alice Updated');

      // Enqueue transaction
      const promise = queue.enqueue(transaction);

      // Queue should have the transaction
      expect(queue.getStatus().queueSize).toBe(1);

      // Wait for processing
      await promise;

      // Queue should be empty after processing
      expect(queue.getStatus().queueSize).toBe(0);
    });

    it('should track pending writes for records', async () => {
      const { cache, queue, applyOptimisticUpdate } = system;
      mockOnline = false;

      const user: User = {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'alice@test.com',
        status: 'active',
      };
      cache.set('user', user.id, user);

      const { transaction } = applyOptimisticUpdate([
        { table: 'user', id: 'u1', updates: { name: 'Alice Updated' } },
      ]);

      void queue.enqueue(transaction);

      // Should track pending write
      expect(queue.isPendingWrite({ table: 'user', id: 'u1' })).toBe(true);
      expect(queue.isPendingWrite({ table: 'user', id: 'u2' })).toBe(false);
    });

    it('should rollback optimistic update on server rejection', async () => {
      const { cache, queue, mockSubmit, applyOptimisticUpdate } = system;

      // Server will reject
      mockSubmit.mockResolvedValue({ status: 400, message: 'Validation failed' });

      const user: User = {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'alice@test.com',
        status: 'active',
      };
      cache.set('user', user.id, user);

      const { rollbacks, transaction } = applyOptimisticUpdate([
        { table: 'user', id: 'u1', updates: { name: 'Invalid Name' } },
      ]);

      // Optimistic value applied
      expect(cache.get('user', 'u1')?.name).toBe('Invalid Name');

      // Enqueue and wait for rejection
      const promise = queue.enqueue(transaction);

      await expect(promise).rejects.toThrow();

      // Manually rollback (in real app, onRollback would do this)
      for (const rollback of rollbacks) {
        rollback();
      }

      // Cache should be restored
      expect(cache.get('user', 'u1')?.name).toBe('Alice');
    });

    it('should confirm optimistic update on server success', async () => {
      const { cache, queue, applyOptimisticUpdate, simulateServerConfirm } = system;

      const user: User = {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'alice@test.com',
        status: 'active',
      };
      cache.set('user', user.id, user);

      const { transaction } = applyOptimisticUpdate([
        { table: 'user', id: 'u1', updates: { name: 'Alice Updated' } },
      ]);

      // Should have optimistic state
      expect(cache.hasOptimisticUpdate('user', 'u1')).toBe(true);

      const promise = queue.enqueue(transaction);
      await promise;

      // Simulate server confirming with new version
      simulateServerConfirm('user', 'u1', {
        id: 'u1',
        version: 2,
        name: 'Alice Updated',
        email: 'alice@test.com',
        status: 'active',
      });

      // Optimistic state should be committed
      expect(cache.hasOptimisticUpdate('user', 'u1')).toBe(false);
      expect(cache.get('user', 'u1')?.version).toBe(2);
    });
  });

  describe('offline queue persistence', () => {
    it('should persist queue to localStorage', async () => {
      const { cache, queue, applyOptimisticUpdate } = system;
      mockOnline = false;

      const user: User = {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'alice@test.com',
        status: 'active',
      };
      cache.set('user', user.id, user);

      const { transaction } = applyOptimisticUpdate([
        { table: 'user', id: 'u1', updates: { name: 'Offline Update' } },
      ]);

      void queue.enqueue(transaction);

      // Check localStorage - verify full transaction data was persisted
      const stored = mockLocalStorage.getItem('test-offline-queue');
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!) as QueuedTransaction[];
      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toEqual(
        expect.objectContaining({
          id: transaction.id,
          authorId: 'test-user',
          operations: expect.arrayContaining([
            expect.objectContaining({
              type: 'set',
              value: { name: 'Offline Update' },
            }),
          ]),
        }),
      );
    });

    it('should restore queue from localStorage on init', async () => {
      const existingTx: QueuedTransaction = {
        id: 'restored-tx',
        authorId: 'user-1',
        timestamp: Date.now(),
        operations: [{ type: 'set', path: ['user', 'u1', 'name'], value: { name: 'Restored' } }],
      };

      mockLocalStorage.setItem('test-offline-queue', JSON.stringify([existingTx]));
      mockOnline = false;

      // Create new queue (should restore)
      const newQueue = new TransactionQueue({
        submitTransaction: vi.fn().mockResolvedValue({ status: 200 }),
        onRollback: vi.fn(),
        storageKey: 'test-offline-queue',
      });

      expect(newQueue.getQueuedTransactions()).toHaveLength(1);
      const restoredTx = newQueue.getQueuedTransactions()[0];
      expect(restoredTx).toEqual(
        expect.objectContaining({
          id: 'restored-tx',
          authorId: 'user-1',
          operations: [{ type: 'set', path: ['user', 'u1', 'name'], value: { name: 'Restored' } }],
        }),
      );

      newQueue.destroy();
    });
  });

  describe('online/offline transitions', () => {
    it('should process queue when coming online', async () => {
      mockOnline = false;
      // Create new system after setting offline to ensure correct initial state
      const offlineSystem = createOfflineSystem();
      const { cache, queue, mockSubmit, applyOptimisticUpdate } = offlineSystem;

      const user: User = {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'alice@test.com',
        status: 'active',
      };
      cache.set('user', user.id, user);

      const { transaction } = applyOptimisticUpdate([
        { table: 'user', id: 'u1', updates: { name: 'Offline Update' } },
      ]);

      const promise = queue.enqueue(transaction);

      // Should not be processed yet while offline (queue should have item)
      expect(queue.getQueuedTransactions()).toHaveLength(1);

      // Go online
      mockOnline = true;
      mockWindow.dispatchEvent(new Event('online'));

      await promise;

      expect(mockSubmit).toHaveBeenCalledTimes(1);
      // Verify the submitted transaction contains the expected data
      expect(mockSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          id: transaction.id,
          operations: expect.arrayContaining([
            expect.objectContaining({
              type: 'set',
              value: { name: 'Offline Update' },
            }),
          ]),
        }),
      );

      queue.destroy();
    });

    it('should batch multiple offline operations', async () => {
      const { cache, queue, mockSubmit, applyOptimisticUpdate } = system;
      mockOnline = false;

      // Seed data
      cache.set('user', 'u1', {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'a@test.com',
        status: 'active',
      });
      cache.set('user', 'u2', {
        id: 'u2',
        version: 1,
        name: 'Bob',
        email: 'b@test.com',
        status: 'active',
      });
      cache.set('post', 'p1', {
        id: 'p1',
        version: 1,
        title: 'Post 1',
        content: '',
        authorId: 'u1',
      });

      // Multiple updates while offline
      const { transaction: tx1 } = applyOptimisticUpdate([
        { table: 'user', id: 'u1', updates: { name: 'Alice Updated' } },
      ]);
      const { transaction: tx2 } = applyOptimisticUpdate([
        { table: 'user', id: 'u2', updates: { name: 'Bob Updated' } },
      ]);
      const { transaction: tx3 } = applyOptimisticUpdate([
        { table: 'post', id: 'p1', updates: { title: 'Post Updated' } },
      ]);

      const promise1 = queue.enqueue(tx1);
      const promise2 = queue.enqueue(tx2);
      const promise3 = queue.enqueue(tx3);

      expect(queue.getStatus().queueSize).toBe(3);

      // Go online
      mockOnline = true;
      mockWindow.dispatchEvent(new Event('online'));

      await Promise.all([promise1, promise2, promise3]);

      // All processed - verify queue is empty and cache has final values
      expect(queue.getStatus().queueSize).toBe(0);
      // TransactionQueue may batch operations, so verify at least 1 call was made
      expect(mockSubmit).toHaveBeenCalled();
      expect(mockSubmit.mock.calls.length).toBeGreaterThanOrEqual(1);

      // Verify cache still has the optimistic updates applied
      expect(cache.get('user', 'u1')?.name).toBe('Alice Updated');
      expect(cache.get('user', 'u2')?.name).toBe('Bob Updated');
      expect(cache.get('post', 'p1')?.title).toBe('Post Updated');
    });
  });

  describe('multi-record transactions', () => {
    it('should handle transaction with multiple operations', async () => {
      const { cache, queue, applyOptimisticUpdate } = system;

      // Seed data
      cache.set('user', 'u1', {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'a@test.com',
        status: 'active',
      });
      cache.set('post', 'p1', {
        id: 'p1',
        version: 1,
        title: 'Original',
        content: 'Content',
        authorId: 'u1',
      });

      // Atomic update across records
      const { transaction } = applyOptimisticUpdate([
        { table: 'user', id: 'u1', updates: { status: 'inactive' } },
        { table: 'post', id: 'p1', updates: { title: 'Updated Title' } },
      ]);

      // Both updated optimistically
      expect(cache.get('user', 'u1')?.status).toBe('inactive');
      expect(cache.get('post', 'p1')?.title).toBe('Updated Title');

      await queue.enqueue(transaction);

      expect(queue.getStatus().queueSize).toBe(0);
    });

    it('should rollback all operations on failure', async () => {
      const { cache, queue, mockSubmit, applyOptimisticUpdate } = system;

      mockSubmit.mockResolvedValue({ status: 400, message: 'Transaction failed' });

      cache.set('user', 'u1', {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'a@test.com',
        status: 'active',
      });
      cache.set('post', 'p1', {
        id: 'p1',
        version: 1,
        title: 'Original',
        content: 'Content',
        authorId: 'u1',
      });

      const { rollbacks, transaction } = applyOptimisticUpdate([
        { table: 'user', id: 'u1', updates: { status: 'inactive' } },
        { table: 'post', id: 'p1', updates: { title: 'Updated Title' } },
      ]);

      const promise = queue.enqueue(transaction);

      await expect(promise).rejects.toThrow();

      // Rollback all
      for (const rollback of rollbacks) {
        rollback();
      }

      // Both restored
      expect(cache.get('user', 'u1')?.status).toBe('active');
      expect(cache.get('post', 'p1')?.title).toBe('Original');
    });
  });

  describe('concurrent operations', () => {
    it('should handle rapid successive updates to same record', async () => {
      const { cache, queue, applyOptimisticUpdate } = system;

      cache.set('user', 'u1', {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'a@test.com',
        status: 'active',
      });

      // Rapid updates
      const { transaction: tx1 } = applyOptimisticUpdate([
        { table: 'user', id: 'u1', updates: { name: 'Update 1' } },
      ]);
      const { transaction: tx2 } = applyOptimisticUpdate([
        { table: 'user', id: 'u1', updates: { name: 'Update 2' } },
      ]);
      const { transaction: tx3 } = applyOptimisticUpdate([
        { table: 'user', id: 'u1', updates: { name: 'Update 3' } },
      ]);

      // Latest value should win
      expect(cache.get('user', 'u1')?.name).toBe('Update 3');

      // All transactions queued
      const promises = [queue.enqueue(tx1), queue.enqueue(tx2), queue.enqueue(tx3)];

      await Promise.all(promises);

      expect(queue.getStatus().queueSize).toBe(0);
    });
  });

  describe('cache and storage coordination', () => {
    it('should sync optimistic updates to storage on confirm', async () => {
      const { cache, storage, queue, applyOptimisticUpdate, simulateServerConfirm } = system;

      const user: User = {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'alice@test.com',
        status: 'active',
      };
      cache.set('user', user.id, user);
      await storage.setRecord('user', user);

      const { transaction } = applyOptimisticUpdate([
        { table: 'user', id: 'u1', updates: { name: 'Alice Updated' } },
      ]);

      await queue.enqueue(transaction);

      // Simulate server confirm
      const confirmedUser: User = {
        id: 'u1',
        version: 2,
        name: 'Alice Updated',
        email: 'alice@test.com',
        status: 'active',
      };
      simulateServerConfirm('user', 'u1', confirmedUser);

      // Sync to storage
      await storage.setRecord('user', confirmedUser);

      // Both in sync
      expect(cache.get('user', 'u1')?.version).toBe(2);
      const stored = await storage.getRecord<User>({ table: 'user', id: 'u1' });
      expect(stored?.version).toBe(2);
    });
  });

  describe('error recovery', () => {
    it('should retry on conflict error', async () => {
      const { cache, queue, mockSubmit, applyOptimisticUpdate } = system;

      let callCount = 0;
      mockSubmit.mockImplementation(async () => {
        callCount++;
        if (callCount < 3) {
          return { status: 409, message: 'Conflict' };
        }
        return { status: 200 };
      });

      const user: User = {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'alice@test.com',
        status: 'active',
      };
      cache.set('user', user.id, user);

      const { transaction } = applyOptimisticUpdate([
        { table: 'user', id: 'u1', updates: { name: 'Conflicting Update' } },
      ]);

      await queue.enqueue(transaction);

      expect(mockSubmit).toHaveBeenCalledTimes(3);
      expect(queue.getStatus().queueSize).toBe(0);
    });

    it('should handle permission errors gracefully', async () => {
      const { cache, queue, mockSubmit, mockRollback, applyOptimisticUpdate } = system;

      mockSubmit.mockResolvedValue({ status: 403, message: 'Forbidden' });

      const user: User = {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'alice@test.com',
        status: 'active',
      };
      cache.set('user', user.id, user);

      const { transaction } = applyOptimisticUpdate([
        { table: 'user', id: 'u1', updates: { name: 'Forbidden Update' } },
      ]);

      await expect(queue.enqueue(transaction)).rejects.toThrow('Forbidden');
      expect(mockRollback).toHaveBeenCalled();
    });
  });

  describe('pending write subscriptions', () => {
    it('should notify subscribers of pending write changes', async () => {
      const { cache, queue, applyOptimisticUpdate } = system;
      mockOnline = false;

      const pendingChanges: boolean[] = [];
      queue.subscribeIsPendingWrite({ table: 'user', id: 'u1' }, (isPending) => {
        pendingChanges.push(isPending);
      });

      const user: User = {
        id: 'u1',
        version: 1,
        name: 'Alice',
        email: 'alice@test.com',
        status: 'active',
      };
      cache.set('user', user.id, user);

      const { transaction } = applyOptimisticUpdate([
        { table: 'user', id: 'u1', updates: { name: 'Update' } },
      ]);

      const promise = queue.enqueue(transaction);

      // Should have notified pending = true
      expect(pendingChanges).toContain(true);

      // Go online to process
      mockOnline = true;
      mockWindow.dispatchEvent(new Event('online'));

      await promise;

      // Should have notified pending = false
      expect(pendingChanges).toContain(false);
    });
  });
});
