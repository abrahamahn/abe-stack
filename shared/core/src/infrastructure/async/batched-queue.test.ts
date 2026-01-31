// shared/core/src/infrastructure/async/batched-queue.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BatchedQueue } from './batched-queue';

describe('BatchedQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Basic Batching', () => {
    it('should batch items and process them together', async () => {
      const processor = vi.fn((items: number[]) => Promise.resolve(items.map((n) => n * 2)));
      const queue = new BatchedQueue({
        processBatch: processor,
        maxParallel: 1,
        maxBatchSize: 3,
        delayMs: 100,
      });

      const promise1 = queue.enqueue(1);
      const promise2 = queue.enqueue(2);
      const promise3 = queue.enqueue(3);

      // Should not process yet
      expect(processor).not.toHaveBeenCalled();

      // Advance timers to trigger flush
      await vi.runAllTimersAsync();

      const results = await Promise.all([promise1, promise2, promise3]);
      expect(results).toEqual([2, 4, 6]);
      expect(processor).toHaveBeenCalledTimes(1);
      expect(processor).toHaveBeenCalledWith([1, 2, 3]);
    });

    it('should flush when batch size is reached', async () => {
      // Use real timers for this test since batch size triggers immediate flush
      vi.useRealTimers();

      const processor = vi.fn((items: number[]) => Promise.resolve(items.map((n) => n * 2)));
      const queue = new BatchedQueue({
        processBatch: processor,
        maxParallel: 1,
        maxBatchSize: 2,
        delayMs: 1000,
      });

      const promise1 = queue.enqueue(1);
      const promise2 = queue.enqueue(2);

      // Should flush immediately when batch size reached
      const results = await Promise.all([promise1, promise2]);
      expect(results).toEqual([2, 4]);
      expect(processor).toHaveBeenCalledTimes(1);

      // Restore fake timers for other tests
      vi.useFakeTimers();
    });

    it('should flush on interval even if batch not full', async () => {
      const processor = vi.fn((items: number[]) => Promise.resolve(items.map((n) => n * 2)));
      const queue = new BatchedQueue({
        processBatch: processor,
        maxParallel: 1,
        maxBatchSize: 10,
        delayMs: 50,
      });

      const promise = queue.enqueue(1);

      // Advance timer to trigger flush
      await vi.advanceTimersByTimeAsync(50);

      const result = await promise;
      expect(result).toBe(2);
      expect(processor).toHaveBeenCalledWith([1]);
    });
  });

  describe('Multiple Batches', () => {
    it('should handle multiple batches correctly', async () => {
      // Use real timers since batch size triggers immediate flush
      vi.useRealTimers();

      const processor = vi.fn((items: number[]) => Promise.resolve(items.map((n) => n * 2)));
      const queue = new BatchedQueue({
        processBatch: processor,
        maxParallel: 1,
        maxBatchSize: 2,
        delayMs: 100,
      });

      // First batch
      const p1 = queue.enqueue(1);
      const p2 = queue.enqueue(2);

      await Promise.all([p1, p2]);

      // Second batch
      const p3 = queue.enqueue(3);
      const p4 = queue.enqueue(4);

      await Promise.all([p3, p4]);

      expect(processor).toHaveBeenCalledTimes(2);
      expect(processor).toHaveBeenNthCalledWith(1, [1, 2]);
      expect(processor).toHaveBeenNthCalledWith(2, [3, 4]);

      // Restore fake timers for other tests
      vi.useFakeTimers();
    });
  });

  describe('Error Handling', () => {
    it('should reject all items in batch if processor fails', async () => {
      // Use real timers since batch size triggers immediate flush
      vi.useRealTimers();

      const error = new Error('Processing failed');
      const processor = vi.fn(() => Promise.reject(error));
      const queue = new BatchedQueue({
        processBatch: processor,
        maxParallel: 1,
        maxBatchSize: 2,
        delayMs: 100,
      });

      const promise1 = queue.enqueue(1);
      const promise2 = queue.enqueue(2);

      await expect(promise1).rejects.toThrow('Processing failed');
      await expect(promise2).rejects.toThrow('Processing failed');

      // Restore fake timers for other tests
      vi.useFakeTimers();
    });

    it('should continue processing after error in previous batch', async () => {
      // Use real timers since batch size triggers immediate flush
      vi.useRealTimers();

      let callCount = 0;
      const processor = vi.fn((items: number[]) => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('First batch failed'));
        }
        return Promise.resolve(items.map((n) => n * 2));
      });

      const queue = new BatchedQueue({
        processBatch: processor,
        maxParallel: 1,
        maxBatchSize: 2,
        delayMs: 100,
      });

      // First batch - should fail
      const p1 = queue.enqueue(1);
      const p2 = queue.enqueue(2);

      await expect(Promise.all([p1, p2])).rejects.toThrow('First batch failed');

      // Second batch - should succeed
      const p3 = queue.enqueue(3);
      const p4 = queue.enqueue(4);

      const results = await Promise.all([p3, p4]);
      expect(results).toEqual([6, 8]);

      // Restore fake timers for other tests
      vi.useFakeTimers();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single item batches', async () => {
      // Use real timers since batch size (1) triggers immediate flush
      vi.useRealTimers();

      const processor = vi.fn((items: number[]) => Promise.resolve(items.map((n) => n * 2)));
      const queue = new BatchedQueue({
        processBatch: processor,
        maxParallel: 1,
        maxBatchSize: 1,
        delayMs: 100,
      });

      const result = await queue.enqueue(5);
      expect(result).toBe(10);
      expect(processor).toHaveBeenCalledWith([5]);

      // Restore fake timers for other tests
      vi.useFakeTimers();
    });

    it('should reject when processor returns mismatched length', async () => {
      const processor = vi.fn(() => Promise.resolve([]));
      const queue = new BatchedQueue({
        processBatch: processor,
        maxParallel: 1,
        maxBatchSize: 2,
        delayMs: 100,
      });

      const promise = queue.enqueue(1);

      // Advance timers and handle the rejection
      const runPromise = vi.runAllTimersAsync();

      // Should reject when processor returns wrong number of outputs
      await expect(promise).rejects.toThrow(
        'BatchedQueue: processBatch returned 0 outputs for 1 inputs',
      );

      // Wait for timer resolution to complete
      await runPromise;
    });

    it('should handle concurrent adds', async () => {
      const processor = vi.fn((items: number[]) => Promise.resolve(items.map((n) => n * 2)));
      const queue = new BatchedQueue({
        processBatch: processor,
        maxParallel: 1,
        maxBatchSize: 5,
        delayMs: 100,
      });

      const promises = Array.from({ length: 10 }, (_, i) => queue.enqueue(i));

      await vi.runAllTimersAsync();

      const results = await Promise.all(promises);
      expect(results).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
      expect(processor).toHaveBeenCalledTimes(2);
    });
  });

  describe('Destroy', () => {
    it('should reject pending tasks on destroy', async () => {
      const processor = vi.fn((items: number[]) => Promise.resolve(items));
      const queue = new BatchedQueue({
        processBatch: processor,
        maxParallel: 1,
        maxBatchSize: 10,
        delayMs: 1000,
      });

      const promise = queue.enqueue(1);

      queue.destroy();

      await expect(promise).rejects.toThrow('BatchedQueue destroyed');
    });
  });
});
