// shared/src/__tests__/async-utilities.integration.test.ts
/**
 * Integration tests for async utilities under load
 *
 * Tests BatchedQueue and ReactiveMap with realistic usage patterns.
 */

import { describe, expect, it, vi } from 'vitest';

import { BatchedQueue } from '../primitives/utils/async/batched-queue';
import { DeferredPromise } from '../primitives/utils/async/deferred-promise';
import { ReactiveMap } from '../primitives/utils/async/reactive-map';

describe('Async Utilities Integration', () => {
  describe('BatchedQueue under load', () => {
    describe('High-volume request batching', () => {
      it('should handle 1000 concurrent requests efficiently', async () => {
        let batchCallCount = 0;
        const processBatch = vi.fn(async (ids: number[]) => {
          batchCallCount++;
          // Use minimal delay to reduce flakiness while still testing async behavior
          await Promise.resolve();
          return ids.map((id) => ({ id, data: `Item ${String(id)}` }));
        });

        const queue = new BatchedQueue<number, { id: number; data: string }>(processBatch, {
          maxBatchSize: 100,
          maxWaitMs: 1,
        });

        // Enqueue 1000 items
        const promises = Array.from({ length: 1000 }, (_, i) => queue.enqueue(i));
        const results = await Promise.all(promises);

        // All results should be correct
        expect(results).toHaveLength(1000);
        results.forEach((result, i) => {
          expect(result.id).toBe(i);
          expect(result.data).toBe(`Item ${String(i)}`);
        });

        // Should have batched efficiently (1000 items / 100 batch size = 10 batches minimum)
        // Sequential processing means exactly 10 batches when items arrive fast enough,
        // but timing variations may cause a few extra partial batches
        expect(batchCallCount).toBeGreaterThanOrEqual(10);
        expect(batchCallCount).toBeLessThanOrEqual(20);
      });

      it('should maintain order under sequential processing', async () => {
        const processedOrder: number[][] = [];

        const processBatch = vi.fn(async (batch: number[]) => {
          processedOrder.push([...batch]);
          // Use minimal async delay for stability
          await Promise.resolve();
          return batch.map((n) => n * 2);
        });

        const queue = new BatchedQueue<number, number>(processBatch, {
          maxBatchSize: 5,
          maxWaitMs: 0,
        });

        const results = await Promise.all(Array.from({ length: 20 }, (_, i) => queue.enqueue(i)));

        // Results should maintain input order (sequential processing guarantees this)
        results.forEach((result, i) => {
          expect(result).toBe(i * 2);
        });
      });
    });

    describe('Error isolation between batches', () => {
      it('should not affect successful batches when one fails', async () => {
        let callCount = 0;
        const processBatch = vi.fn(async (batch: number[]) => {
          callCount++;
          // Fail on second batch
          if (callCount === 2) {
            throw new Error('Batch 2 failed');
          }
          // Minimal async for stability
          await Promise.resolve();
          return batch.map((n) => n * 2);
        });

        const queue = new BatchedQueue<number, number>(processBatch, {
          maxBatchSize: 2,
          maxWaitMs: 0,
          errorHandling: 'continue',
        });

        // Batch 1: items 0, 1
        const batch1Promise1 = queue.enqueue(0);
        const batch1Promise2 = queue.enqueue(1);

        // Wait for batch 1 to complete
        await Promise.all([batch1Promise1, batch1Promise2]);

        // Verify batch 1 succeeded
        expect(await batch1Promise1).toBe(0);
        expect(await batch1Promise2).toBe(2);

        // Batch 2: items 2, 3 (will fail)
        const batch2Promise1 = queue.enqueue(2).catch((e: unknown) => e);
        const batch2Promise2 = queue.enqueue(3).catch((e: unknown) => e);

        // Wait for batch 2 to complete (with error)
        const [result2a, result2b] = await Promise.all([batch2Promise1, batch2Promise2]);

        // Verify batch 2 failed
        expect(result2a).toBeInstanceOf(Error);
        expect(result2b).toBeInstanceOf(Error);

        // Batch 3: items 4, 5 (should succeed)
        const batch3Promise1 = queue.enqueue(4);
        const batch3Promise2 = queue.enqueue(5);

        // Verify batch 3 succeeded
        expect(await batch3Promise1).toBe(8);
        expect(await batch3Promise2).toBe(10);
      });
    });

    describe('Backpressure handling', () => {
      it('should reject enqueue when maxQueueSize is exceeded', () => {
        const processBatch = vi.fn(async (batch: number[]) => {
          // Slow processor to keep items in queue
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return batch.map((n) => n);
        });

        const queue = new BatchedQueue<number, number>(processBatch, {
          maxBatchSize: 100,
          maxWaitMs: 5000,
          maxQueueSize: 5,
        });

        // Fill the queue to its maxQueueSize limit, catching rejections from clear()
        const promises: Array<Promise<number>> = [];
        for (let i = 0; i < 5; i++) {
          promises.push(queue.enqueue(i).catch(() => -1));
        }

        // The 6th enqueue should throw because maxQueueSize is exceeded
        expect(() => queue.enqueue(6)).toThrow('Queue size exceeded maximum of 5');

        // Clean up pending promises (they will be caught by the .catch above)
        queue.clear();
      });
    });

    describe('Clear behavior', () => {
      it('should reject pending items and stop processing', async () => {
        const processBatch = vi.fn(async (batch: number[]) => {
          // Long delay that should never complete
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return batch;
        });

        const queue = new BatchedQueue(processBatch, {
          maxBatchSize: 10,
          maxWaitMs: 100, // Long enough to ensure items are pending when cleared
        });

        // Enqueue items
        const promise1 = queue.enqueue(1).catch((e: unknown) => e);
        const promise2 = queue.enqueue(2).catch((e: unknown) => e);

        // Clear immediately (items should still be pending due to maxWaitMs)
        queue.clear();

        const result1 = await promise1;
        const result2 = await promise2;

        expect(result1).toBeInstanceOf(Error);
        expect((result1 as Error).message).toBe('Queue cleared');
        expect(result2).toBeInstanceOf(Error);
        expect((result2 as Error).message).toBe('Queue cleared');

        // Verify processBatch was never called (items were pending)
        expect(processBatch).not.toHaveBeenCalled();
      });
    });
  });

  describe('ReactiveMap integration', () => {
    describe('High-frequency updates', () => {
      it('should handle rapid set/get operations', () => {
        const map = new ReactiveMap<string, number>();

        // Perform 10000 operations
        for (let i = 0; i < 10000; i++) {
          map.set(`key-${String(i)}`, i);
        }

        expect(map.size).toBe(10000);

        // Verify all values
        for (let i = 0; i < 10000; i++) {
          expect(map.get(`key-${String(i)}`)).toBe(i);
        }
      });

      it('should notify subscribers on each update', () => {
        const map = new ReactiveMap<string, number>();
        const notifications: number[] = [];

        map.subscribe('counter', (value) => {
          if (value !== undefined) {
            notifications.push(value);
          }
        });

        // Update 100 times
        for (let i = 0; i < 100; i++) {
          map.set('counter', i);
        }

        expect(notifications).toHaveLength(100);
        expect(notifications).toEqual(Array.from({ length: 100 }, (_, i) => i));
      });
    });

    describe('Multiple subscribers', () => {
      it('should notify all subscribers for same key', () => {
        const map = new ReactiveMap<string, string>();
        const subscriber1Calls: string[] = [];
        const subscriber2Calls: string[] = [];
        const subscriber3Calls: string[] = [];

        map.subscribe('shared-key', (value) => {
          if (value !== undefined) subscriber1Calls.push(value);
        });
        map.subscribe('shared-key', (value) => {
          if (value !== undefined) subscriber2Calls.push(value);
        });
        map.subscribe('shared-key', (value) => {
          if (value !== undefined) subscriber3Calls.push(value);
        });

        map.set('shared-key', 'value1');
        map.set('shared-key', 'value2');

        expect(subscriber1Calls).toEqual(['value1', 'value2']);
        expect(subscriber2Calls).toEqual(['value1', 'value2']);
        expect(subscriber3Calls).toEqual(['value1', 'value2']);
      });

      it('should only notify relevant subscribers', () => {
        const map = new ReactiveMap<string, number>();
        const key1Calls: number[] = [];
        const key2Calls: number[] = [];

        map.subscribe('key1', (value) => {
          if (value !== undefined) key1Calls.push(value);
        });
        map.subscribe('key2', (value) => {
          if (value !== undefined) key2Calls.push(value);
        });

        map.set('key1', 1);
        map.set('key2', 2);
        map.set('key1', 3);

        expect(key1Calls).toEqual([1, 3]);
        expect(key2Calls).toEqual([2]);
      });
    });

    describe('Atomic batch writes', () => {
      it('should apply all writes before notifying', () => {
        const map = new ReactiveMap<string, number>();
        const observedStates: Array<{
          a?: number | undefined;
          b?: number | undefined;
          c?: number | undefined;
        }> = [];

        // Subscribe to all keys
        ['a', 'b', 'c'].forEach((key) => {
          map.subscribe(key, () => {
            observedStates.push({
              a: map.get('a'),
              b: map.get('b'),
              c: map.get('c'),
            });
          });
        });

        // Batch write
        map.write([
          { key: 'a', value: 1 },
          { key: 'b', value: 2 },
          { key: 'c', value: 3 },
        ]);

        // All notifications should see complete state
        observedStates.forEach((state) => {
          expect(state.a).toBe(1);
          expect(state.b).toBe(2);
          expect(state.c).toBe(3);
        });
      });

      it('should handle mixed set/delete in batch', () => {
        const map = new ReactiveMap<string, string>();

        map.set('keep', 'value1');
        map.set('remove', 'value2');

        const deletedValues: Array<string | undefined> = [];
        map.subscribe('remove', (value) => {
          deletedValues.push(value);
        });

        map.write([
          { key: 'keep', value: 'updated' },
          { key: 'remove', value: undefined },
          { key: 'new', value: 'added' },
        ]);

        expect(map.get('keep')).toBe('updated');
        expect(map.has('remove')).toBe(false);
        expect(map.get('new')).toBe('added');
        expect(deletedValues).toContain(undefined);
      });
    });

    describe('Subscriber cleanup', () => {
      it('should stop notifying after unsubscribe', () => {
        const map = new ReactiveMap<string, number>();
        const calls: number[] = [];

        const unsubscribe = map.subscribe('key', (value) => {
          if (value !== undefined) calls.push(value);
        });

        map.set('key', 1);
        map.set('key', 2);

        unsubscribe();

        map.set('key', 3);
        map.set('key', 4);

        expect(calls).toEqual([1, 2]);
      });

      it('should clean up listener set when all unsubscribe', () => {
        const map = new ReactiveMap<string, number>();

        const unsub1 = map.subscribe('key', () => {});
        const unsub2 = map.subscribe('key', () => {});
        const unsub3 = map.subscribe('key', () => {});

        expect(map.listenerCount('key')).toBe(3);

        unsub1();
        expect(map.listenerCount('key')).toBe(2);

        unsub2();
        expect(map.listenerCount('key')).toBe(1);

        unsub3();
        expect(map.listenerCount('key')).toBe(0);
      });
    });

    describe('Clear operation', () => {
      it('should notify all subscribers on clear', () => {
        const map = new ReactiveMap<string, number>();
        const deletedKeys: string[] = [];

        map.set('a', 1);
        map.set('b', 2);
        map.set('c', 3);

        ['a', 'b', 'c'].forEach((key) => {
          map.subscribe(key, (value) => {
            if (value === undefined) {
              deletedKeys.push(key);
            }
          });
        });

        map.clear();

        expect(map.size).toBe(0);
        expect(deletedKeys.sort()).toEqual(['a', 'b', 'c']);
      });
    });
  });

  describe('DeferredPromise integration', () => {
    it('should resolve after delay', async () => {
      const deferred = new DeferredPromise<string>();

      // Use queueMicrotask for more stable timing than setTimeout
      queueMicrotask(() => {
        deferred.resolve('delayed result');
      });

      const result = await deferred.promise;
      expect(result).toBe('delayed result');
    });

    it('should reject with error', async () => {
      const deferred = new DeferredPromise<string>();

      queueMicrotask(() => {
        deferred.reject(new Error('test error'));
      });

      await expect(deferred.promise).rejects.toThrow('test error');
    });

    it('should propagate rejection through promise chain', async () => {
      const deferred = new DeferredPromise<number>();
      const error = new Error('propagated rejection');

      // Chain transformations
      const chainedPromise = deferred.promise
        .then((value) => value * 2)
        .then((value) => value + 10);

      // Reject the original deferred
      deferred.reject(error);

      // Error should propagate through the chain
      await expect(chainedPromise).rejects.toThrow('propagated rejection');
    });

    it('should handle rejection in catch handler', async () => {
      const deferred = new DeferredPromise<string>();
      const originalError = new Error('original error');

      let caughtError: unknown = null;
      const handledPromise = deferred.promise.catch((err: unknown) => {
        caughtError = err;
        return 'recovered';
      });

      deferred.reject(originalError);

      const result = await handledPromise;
      expect(caughtError).toBe(originalError);
      expect(result).toBe('recovered');
    });

    it('should rethrow in catch and propagate to next handler', async () => {
      const deferred = new DeferredPromise<string>();
      const originalError = new Error('original');
      const transformedError = new Error('transformed');

      const rethrowChain = deferred.promise
        .catch(() => {
          throw transformedError;
        })
        .catch((err: unknown) => (err as Error).message);

      deferred.reject(originalError);

      const result = await rethrowChain;
      expect(result).toBe('transformed');
    });

    it('should handle async rejection propagation', async () => {
      const deferred1 = new DeferredPromise<number>();
      const deferred2 = new DeferredPromise<number>();

      // Chain two deferred promises
      const chainedResult = deferred1.promise.then(() => deferred2.promise);

      // Resolve first, reject second
      deferred1.resolve(1);
      deferred2.reject(new Error('second rejection'));

      await expect(chainedResult).rejects.toThrow('second rejection');
    });

    it('should work in producer/consumer pattern', async () => {
      const queue: Array<DeferredPromise<number>> = [];

      // Producer: creates deferred promises
      const produce = () => {
        const deferred = new DeferredPromise<number>();
        queue.push(deferred);
        return deferred.promise;
      };

      // Consumer: resolves deferred promises
      const consume = (value: number) => {
        const deferred = queue.shift();
        if (deferred !== undefined) {
          deferred.resolve(value);
        }
      };

      // Start consumers waiting
      const promises = [produce(), produce(), produce()];

      // Resolve them synchronously (no timing issues)
      consume(1);
      consume(2);
      consume(3);

      const results = await Promise.all(promises);
      expect(results).toEqual([1, 2, 3]);
    });

    it('should handle mixed resolve and reject in producer/consumer', async () => {
      const queue: Array<DeferredPromise<number>> = [];

      const produce = () => {
        const deferred = new DeferredPromise<number>();
        queue.push(deferred);
        return deferred.promise;
      };

      // Create promises
      const p1 = produce();
      const p2 = produce();
      const p3 = produce();

      // Mix of resolve and reject
      queue[0]!.resolve(1);
      queue[1]!.reject(new Error('rejected'));
      queue[2]!.resolve(3);

      // Use allSettled to check all outcomes
      const results = await Promise.allSettled([p1, p2, p3]);

      expect(results[0]).toEqual({ status: 'fulfilled', value: 1 });
      expect(results[1]).toEqual({ status: 'rejected', reason: expect.any(Error) });
      expect((results[1] as PromiseRejectedResult).reason.message).toBe('rejected');
      expect(results[2]).toEqual({ status: 'fulfilled', value: 3 });
    });
  });

  describe('Combined async utilities', () => {
    it('should use BatchedQueue to update ReactiveMap', async () => {
      interface User {
        id: string;
        name: string;
      }

      const cache = new ReactiveMap<string, User>();
      const updates: Array<{ id: string; user: User | undefined }> = [];

      // Simulate user fetch batching with minimal async delay
      const batchedFetch = new BatchedQueue<string, User>(
        async (ids) => {
          // Minimal async for stability
          await Promise.resolve();
          return ids.map((id) => ({ id, name: `User ${id}` }));
        },
        {
          maxBatchSize: 5,
          maxWaitMs: 0,
        },
      );

      // Subscribe to cache updates
      ['1', '2', '3'].forEach((id) => {
        cache.subscribe(id, (user) => {
          updates.push({ id, user });
        });
      });

      // Fetch users and update cache
      const users = await Promise.all([
        batchedFetch.enqueue('1'),
        batchedFetch.enqueue('2'),
        batchedFetch.enqueue('3'),
      ]);

      // Update cache
      users.forEach((user) => {
        cache.set(user.id, user);
      });

      // Verify cache
      expect(cache.get('1')).toEqual({ id: '1', name: 'User 1' });
      expect(cache.get('2')).toEqual({ id: '2', name: 'User 2' });
      expect(cache.get('3')).toEqual({ id: '3', name: 'User 3' });

      // Verify notifications
      expect(updates).toHaveLength(3);
    });

    it('should handle concurrent cache invalidation and refetch', async () => {
      const cache = new ReactiveMap<string, { value: number; version: number }>();
      let fetchVersion = 0;

      const batchedFetch = new BatchedQueue<string, { value: number; version: number }>(
        async (ids) => {
          fetchVersion++;
          const currentVersion = fetchVersion;
          // Minimal async for stability
          await Promise.resolve();
          return ids.map((id) => ({
            value: parseInt(id, 10) * 10,
            version: currentVersion,
          }));
        },
        {
          maxBatchSize: 10,
          maxWaitMs: 0,
        },
      );

      // Initial fetch
      const initial = await batchedFetch.enqueue('1');
      cache.set('1', initial);

      // Invalidate and refetch
      cache.delete('1');
      const refetched = await batchedFetch.enqueue('1');
      cache.set('1', refetched);

      expect(cache.get('1')?.version).toBe(2);
    });
  });
});
