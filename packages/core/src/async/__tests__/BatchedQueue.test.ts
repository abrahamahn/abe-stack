// packages/core/src/async/__tests__/BatchedQueue.test.ts
import { describe, expect, it, vi } from 'vitest';

import { BatchedQueue } from '../BatchedQueue';

describe('BatchedQueue', () => {
  describe('basic functionality', () => {
    it('should process a single item', async () => {
      const processBatch = vi.fn(async (batch: number[]) => batch.map((n) => n * 2));
      const queue = new BatchedQueue({
        processBatch,
        maxParallel: 5,
        maxBatchSize: 10,
        delayMs: 1,
      });

      const result = await queue.enqueue(5);

      expect(result).toBe(10);
      expect(processBatch).toHaveBeenCalledTimes(1);
      expect(processBatch).toHaveBeenCalledWith([5]);
    });

    it('should batch multiple items enqueued together', async () => {
      const processBatch = vi.fn(async (batch: number[]) => batch.map((n) => n * 2));
      const queue = new BatchedQueue({
        processBatch,
        maxParallel: 5,
        maxBatchSize: 10,
        delayMs: 10,
      });

      const [r1, r2, r3] = await Promise.all([
        queue.enqueue(1),
        queue.enqueue(2),
        queue.enqueue(3),
      ]);

      expect(r1).toBe(2);
      expect(r2).toBe(4);
      expect(r3).toBe(6);
      expect(processBatch).toHaveBeenCalledTimes(1);
      expect(processBatch).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should return correct results to each caller', async () => {
      const processBatch = vi.fn(async (batch: string[]) => batch.map((s) => s.toUpperCase()));
      const queue = new BatchedQueue({
        processBatch,
        maxParallel: 5,
        maxBatchSize: 10,
        delayMs: 1,
      });

      const results = await Promise.all([
        queue.enqueue('hello'),
        queue.enqueue('world'),
        queue.enqueue('test'),
      ]);

      expect(results).toEqual(['HELLO', 'WORLD', 'TEST']);
    });
  });

  describe('maxBatchSize', () => {
    it('should split into multiple batches when exceeding maxBatchSize', async () => {
      const processBatch = vi.fn(async (batch: number[]) => batch.map((n) => n * 2));
      const queue = new BatchedQueue({
        processBatch,
        maxParallel: 5,
        maxBatchSize: 2,
        delayMs: 1,
      });

      const results = await Promise.all([
        queue.enqueue(1),
        queue.enqueue(2),
        queue.enqueue(3),
        queue.enqueue(4),
        queue.enqueue(5),
      ]);

      expect(results).toEqual([2, 4, 6, 8, 10]);
      expect(processBatch).toHaveBeenCalledTimes(3);
    });
  });

  describe('maxParallel', () => {
    it('should limit concurrent batch processing', async () => {
      let concurrentBatches = 0;
      let maxConcurrentBatches = 0;

      const processBatch = vi.fn(async (batch: number[]) => {
        concurrentBatches++;
        maxConcurrentBatches = Math.max(maxConcurrentBatches, concurrentBatches);
        await new Promise((resolve) => setTimeout(resolve, 20));
        concurrentBatches--;
        return batch.map((n) => n * 2);
      });

      const queue = new BatchedQueue({
        processBatch,
        maxParallel: 2,
        maxBatchSize: 1,
        delayMs: 1,
      });

      await Promise.all([queue.enqueue(1), queue.enqueue(2), queue.enqueue(3), queue.enqueue(4)]);

      expect(maxConcurrentBatches).toBeLessThanOrEqual(2);
    });
  });

  describe('error handling', () => {
    it('should reject all items in batch when processBatch throws', async () => {
      const processBatch = vi.fn(async () => {
        throw new Error('Processing failed');
      });
      const queue = new BatchedQueue({
        processBatch,
        maxParallel: 5,
        maxBatchSize: 10,
        delayMs: 1,
      });

      const promises = [queue.enqueue(1), queue.enqueue(2), queue.enqueue(3)];

      await expect(Promise.all(promises)).rejects.toThrow('Processing failed');
    });

    it('should reject when output count mismatches input count', async () => {
      const processBatch = vi.fn(async (_batch: number[]) => {
        return [1, 2]; // Only 2 results for 3 inputs
      });
      const queue = new BatchedQueue({
        processBatch,
        maxParallel: 5,
        maxBatchSize: 10,
        delayMs: 1,
      });

      const promise = Promise.all([queue.enqueue(1), queue.enqueue(2), queue.enqueue(3)]);

      await expect(promise).rejects.toThrow('processBatch returned 2 outputs for 3 inputs');
    });

    it('should not affect other batches when one batch fails', async () => {
      let callCount = 0;
      const processBatch = vi.fn(async (batch: number[]) => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First batch failed');
        }
        return batch.map((n) => n * 2);
      });

      const queue = new BatchedQueue({
        processBatch,
        maxParallel: 1,
        maxBatchSize: 2,
        delayMs: 1,
      });

      // Enqueue first batch (will fail)
      const promise1 = queue.enqueue(1);
      const promise2 = queue.enqueue(2);

      // Immediately attach catch handlers to prevent unhandled rejection warnings
      const caught1 = promise1.catch((e: unknown) => e);
      const caught2 = promise2.catch((e: unknown) => e);

      // Wait for first batch to process
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Enqueue second batch (should succeed)
      const promise3 = queue.enqueue(3);
      const promise4 = queue.enqueue(4);

      // Verify first batch failed
      const error1 = await caught1;
      const error2 = await caught2;
      expect(error1).toBeInstanceOf(Error);
      expect((error1 as Error).message).toBe('First batch failed');
      expect(error2).toBeInstanceOf(Error);
      expect((error2 as Error).message).toBe('First batch failed');

      // Verify second batch succeeded
      expect(await promise3).toBe(6);
      expect(await promise4).toBe(8);
    });
  });

  describe('queue state', () => {
    it('should track pending count', async () => {
      const processBatch = vi.fn(
        async (batch: number[]) =>
          new Promise<number[]>((resolve) =>
            setTimeout(() => resolve(batch.map((n) => n * 2)), 50),
          ),
      );

      const queue = new BatchedQueue({
        processBatch,
        maxParallel: 1,
        maxBatchSize: 10,
        delayMs: 5,
      });

      expect(queue.pendingCount).toBe(0);

      const p1 = queue.enqueue(1);
      const p2 = queue.enqueue(2);

      // Before flush scheduled
      expect(queue.pendingCount).toBe(2);

      await Promise.all([p1, p2]);

      expect(queue.pendingCount).toBe(0);
    });

    it('should track active batch count', async () => {
      let resolveProcessing: ((value: number[]) => void) | null = null;
      const processBatch = vi.fn(
        async (batch: number[]) =>
          new Promise<number[]>((resolve) => {
            resolveProcessing = () => resolve(batch.map((n) => n * 2));
          }),
      );

      const queue = new BatchedQueue({
        processBatch,
        maxParallel: 5,
        maxBatchSize: 10,
        delayMs: 1,
      });

      expect(queue.activeBatchCount).toBe(0);

      const promise = queue.enqueue(1);

      // Wait for batch to start processing
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(queue.activeBatchCount).toBe(1);

      // Resolve the processing
      resolveProcessing?.([2]);
      await promise;

      expect(queue.activeBatchCount).toBe(0);
    });
  });

  describe('timing behavior', () => {
    it('should wait for delayMs before processing', async () => {
      const processBatch = vi.fn(async (batch: number[]) => batch.map((n) => n * 2));
      const queue = new BatchedQueue({
        processBatch,
        maxParallel: 5,
        maxBatchSize: 10,
        delayMs: 50,
      });

      void queue.enqueue(1);

      // Immediately after enqueue, shouldn't have processed yet
      expect(processBatch).not.toHaveBeenCalled();

      // Wait for delay
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(processBatch).toHaveBeenCalled();
    });

    it('should batch items enqueued within delay window', async () => {
      const processBatch = vi.fn(async (batch: number[]) => batch.map((n) => n * 2));
      const queue = new BatchedQueue({
        processBatch,
        maxParallel: 5,
        maxBatchSize: 10,
        delayMs: 30,
      });

      const p1 = queue.enqueue(1);

      await new Promise((resolve) => setTimeout(resolve, 10));
      const p2 = queue.enqueue(2);

      await new Promise((resolve) => setTimeout(resolve, 10));
      const p3 = queue.enqueue(3);

      await Promise.all([p1, p2, p3]);

      // All should be in one batch since they were enqueued within delay window
      expect(processBatch).toHaveBeenCalledTimes(1);
      expect(processBatch).toHaveBeenCalledWith([1, 2, 3]);
    });
  });

  describe('type safety', () => {
    it('should preserve input and output types', async () => {
      interface User {
        id: string;
        name: string;
      }

      const processBatch = vi.fn(async (ids: string[]) =>
        ids.map((id) => ({ id, name: `User ${id}` })),
      );

      const queue = new BatchedQueue<string, User>({
        processBatch,
        maxParallel: 5,
        maxBatchSize: 10,
        delayMs: 1,
      });

      const user = await queue.enqueue('123');

      expect(user.id).toBe('123');
      expect(user.name).toBe('User 123');
    });
  });
});
