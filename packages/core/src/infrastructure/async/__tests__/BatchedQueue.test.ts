// packages/core/src/infrastructure/async/__tests__/BatchedQueue.test.ts
import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';

import { BatchedQueue } from '../BatchedQueue';

describe('BatchedQueue', () => {
  let batchedQueue: BatchedQueue<number>;

  beforeEach(() => {
    batchedQueue = new BatchedQueue<number>({
      batchSize: 3,
      flushInterval: 100, // 100ms
    });
  });

  afterEach(() => {
    batchedQueue.destroy();
  });

  describe('constructor', () => {
    test('should initialize with correct default options', () => {
      const queue = new BatchedQueue<number>();
      
      expect(queue).toBeDefined();
      expect(queue.size).toBe(0);
    });

    test('should initialize with custom options', () => {
      const options = {
        batchSize: 5,
        flushInterval: 200,
      };
      const queue = new BatchedQueue<number>(options);
      
      expect(queue).toBeDefined();
    });

    test('should handle minimum batch size', () => {
      const queue = new BatchedQueue<number>({ batchSize: 0 });
      
      expect(queue).toBeDefined();
    });
  });

  describe('add', () => {
    test('should add items to the queue', () => {
      batchedQueue.enqueue(1);
      batchedQueue.enqueue(2);
      
      expect(batchedQueue.size).toBe(2);
    });

    test('should not exceed batch size without flushing', () => {
      batchedQueue.enqueue(1);
      batchedQueue.enqueue(2);
      batchedQueue.enqueue(3); // Reaches batch size of 3
      
      expect(batchedQueue.size).toBe(3);
    });

    test('should trigger flush when reaching batch size', async () => {
      const processSpy = vi.fn();
      batchedQueue = new BatchedQueue<number>({
        batchSize: 2,
        flushInterval: 100,
        process: processSpy,
      });

      batchedQueue.enqueue(1);
      expect(processSpy).not.toHaveBeenCalled();

      batchedQueue.enqueue(2); // Should trigger flush
      await new Promise(resolve => setTimeout(resolve, 10)); // Allow async flush

      expect(processSpy).toHaveBeenCalledWith([1, 2]);
    });

    test('should handle multiple batches', async () => {
      const processSpy = vi.fn();
      batchedQueue = new BatchedQueue<number>({
        batchSize: 2,
        flushInterval: 100,
        process: processSpy,
      });

      batchedQueue.enqueue(1);
      batchedQueue.enqueue(2); // First batch
      batchedQueue.enqueue(3);
      batchedQueue.enqueue(4); // Second batch

      await new Promise(resolve => setTimeout(resolve, 20)); // Allow async flush

      expect(processSpy).toHaveBeenCalledTimes(2);
      expect(processSpy).toHaveBeenNthCalledWith(1, [1, 2]);
      expect(processSpy).toHaveBeenNthCalledWith(2, [3, 4]);
    });

    test('should handle single item batches', async () => {
      const processSpy = vi.fn();
      batchedQueue = new BatchedQueue<number>({
        batchSize: 1,
        flushInterval: 100,
        process: processSpy,
      });

      batchedQueue.enqueue(1);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(processSpy).toHaveBeenCalledWith([1]);
    });
  });

  describe('flushInterval', () => {
    test('should flush automatically after interval', async () => {
      const processSpy = vi.fn();
      batchedQueue = new BatchedQueue<number>({
        batchSize: 5,
        flushInterval: 10, // Very short interval
        process: processSpy,
      });

      batchedQueue.enqueue(1);
      await new Promise(resolve => setTimeout(resolve, 15)); // Wait for interval

      expect(processSpy).toHaveBeenCalledWith([1]);
    });

    test('should not flush if no items are added', async () => {
      const processSpy = vi.fn();
      batchedQueue = new BatchedQueue<number>({
        batchSize: 2,
        flushInterval: 10,
        process: processSpy,
      });

      await new Promise(resolve => setTimeout(resolve, 15));

      expect(processSpy).not.toHaveBeenCalled();
    });

    test('should reset interval timer after adding items', async () => {
      const processSpy = vi.fn();
      batchedQueue = new BatchedQueue<number>({
        batchSize: 5,
        flushInterval: 20,
        process: processSpy,
      });

      batchedQueue.enqueue(1);
      await new Promise(resolve => setTimeout(resolve, 10)); // Halfway through interval
      batchedQueue.enqueue(2); // Should reset timer
      await new Promise(resolve => setTimeout(resolve, 10)); // Wait for reset interval

      expect(processSpy).not.toHaveBeenCalled(); // Should not have flushed yet

      await new Promise(resolve => setTimeout(resolve, 15)); // Wait for new interval
      expect(processSpy).toHaveBeenCalledWith([1, 2]);
    });
  });

  describe('process function', () => {
    test('should call process function with batched items', async () => {
      const processSpy = vi.fn().mockResolvedValue(undefined);
      batchedQueue = new BatchedQueue<number>({
        batchSize: 2,
        flushInterval: 100,
        process: processSpy,
      });

      batchedQueue.enqueue(1);
      batchedQueue.enqueue(2);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(processSpy).toHaveBeenCalledWith([1, 2]);
      expect(processSpy).toHaveBeenCalledTimes(1);
    });

    test('should handle process function errors gracefully', async () => {
      const processSpy = vi.fn().mockRejectedValue(new Error('Processing failed'));
      batchedQueue = new BatchedQueue<number>({
        batchSize: 2,
        flushInterval: 100,
        process: processSpy,
      });

      batchedQueue.enqueue(1);
      batchedQueue.enqueue(2);

      await new Promise(resolve => setTimeout(resolve, 10));

      // Process function should be called even if it fails
      expect(processSpy).toHaveBeenCalledWith([1, 2]);
    });

    test('should continue processing after error', async () => {
      const processSpy = vi.fn()
        .mockRejectedValueOnce(new Error('First batch failed'))
        .mockResolvedValueOnce(undefined);
        
      batchedQueue = new BatchedQueue<number>({
        batchSize: 2,
        flushInterval: 100,
        process: processSpy,
      });

      batchedQueue.enqueue(1);
      batchedQueue.enqueue(2); // First batch fails
      await new Promise(resolve => setTimeout(resolve, 10));

      batchedQueue.enqueue(3);
      batchedQueue.enqueue(4); // Second batch succeeds

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(processSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('size', () => {
    test('should return correct queue size', () => {
      expect(batchedQueue.size).toBe(0);

      batchedQueue.enqueue(1);
      expect(batchedQueue.size).toBe(1);

      batchedQueue.enqueue(2);
      expect(batchedQueue.size).toBe(2);

      batchedQueue.enqueue(3);
      expect(batchedQueue.size).toBe(3);
    });

    test('should reset size after flush', async () => {
      const processSpy = vi.fn().mockResolvedValue(undefined);
      batchedQueue = new BatchedQueue<number>({
        batchSize: 2,
        flushInterval: 100,
        process: processSpy,
      });

      batchedQueue.enqueue(1);
      batchedQueue.enqueue(2); // Triggers flush
      expect(batchedQueue.size).toBe(2); // Before flush completes

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(batchedQueue.size).toBe(0); // After flush
    });
  });

  describe('destroy', () => {
    test('should clear the interval timer', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      batchedQueue.destroy();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    test('should flush remaining items on destroy', async () => {
      const processSpy = vi.fn().mockResolvedValue(undefined);
      batchedQueue = new BatchedQueue<number>({
        batchSize: 5,
        flushInterval: 1000, // Long interval
        process: processSpy,
      });

      batchedQueue.enqueue(1);
      batchedQueue.enqueue(2);

      batchedQueue.destroy();

      // Process should be called with remaining items
      expect(processSpy).toHaveBeenCalledWith([1, 2]);
    });

    test('should not process after destroy', async () => {
      const processSpy = vi.fn().mockResolvedValue(undefined);
      batchedQueue = new BatchedQueue<number>({
        batchSize: 2,
        flushInterval: 100,
        process: processSpy,
      });

      batchedQueue.destroy();
      batchedQueue.enqueue(1);
      batchedQueue.enqueue(2);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(processSpy).not.toHaveBeenCalled();
    });

    test('should handle multiple destroy calls', () => {
      expect(() => {
        batchedQueue.destroy();
        batchedQueue.destroy(); // Should not throw
      }).not.toThrow();
    });
  });

  describe('concurrent operations', () => {
    test('should handle concurrent additions', async () => {
      const processSpy = vi.fn().mockResolvedValue(undefined);
      batchedQueue = new BatchedQueue<number>({
        batchSize: 5,
        flushInterval: 100,
        process: processSpy,
      });

      // Add items concurrently
      const promises = Array.from({ length: 10 }, (_, i) => 
        new Promise(resolve => setTimeout(() => {
          batchedQueue.enqueue(i);
          resolve(undefined);
        }, Math.random() * 10))
      );

      await Promise.all(promises);
      await new Promise(resolve => setTimeout(resolve, 20));

      // Should have processed all items
      expect(processSpy).toHaveBeenCalledTimes(2); // 2 batches of 5
    });

    test('should handle rapid additions and destruction', async () => {
      const processSpy = vi.fn().mockResolvedValue(undefined);
      batchedQueue = new BatchedQueue<number>({
        batchSize: 10,
        flushInterval: 100,
        process: processSpy,
      });

      // Add items rapidly
      for (let i = 0; i < 5; i++) {
        batchedQueue.enqueue(i);
      }

      // Destroy immediately
      batchedQueue.destroy();

      // Should have processed the items that were queued
      expect(processSpy).toHaveBeenCalledWith([0, 1, 2, 3, 4]);
    });
  });

  describe('edge cases', () => {
    test('should handle batch size of 1', async () => {
      const processSpy = vi.fn().mockResolvedValue(undefined);
      const queue = new BatchedQueue<number>({
        batchSize: 1,
        flushInterval: 100,
        process: processSpy,
      });

      queue.enqueue(1);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(processSpy).toHaveBeenCalledWith([1]);
      queue.destroy();
    });

    test('should handle very large batch sizes', () => {
      const queue = new BatchedQueue<number>({
        batchSize: 1000000, // Very large batch size
        flushInterval: 100,
      });

      expect(queue).toBeDefined();
      queue.destroy();
    });

    test('should handle negative batch sizes', () => {
      const queue = new BatchedQueue<number>({
        batchSize: -1,
        flushInterval: 100,
      });

      expect(queue).toBeDefined();
      queue.destroy();
    });

    test('should handle null/undefined process function', () => {
      const queue = new BatchedQueue<number>({
        batchSize: 2,
        flushInterval: 100,
        // process function is intentionally omitted
      });

      expect(queue).toBeDefined();
      queue.enqueue(1);
      queue.enqueue(2);
      queue.destroy();
    });
  });
});
