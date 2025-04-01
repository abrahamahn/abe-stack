import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { BatchedQueue } from "@/server/infrastructure/queue/BatchedQueue";

describe("Queue Infrastructure Integration Tests", () => {
  describe("BatchedQueue", () => {
    let queue: BatchedQueue<number, number>;
    let processedBatches: number[][] = [];
    let processDelay: number = 0;

    beforeEach(() => {
      processedBatches = [];
      processDelay = 0;
      queue = new BatchedQueue<number, number>({
        processBatch: async (batch) => {
          processedBatches.push(batch);
          if (processDelay > 0) {
            await new Promise((resolve) => setTimeout(resolve, processDelay));
          }
          return batch.map((x) => x * 2);
        },
        maxParallel: 2,
        maxBatchSize: 3,
        delayMs: 100,
      });
    });

    afterEach(() => {
      // Clean up any pending tasks
      queue = null as any;
    });

    it("should process single items", async () => {
      const result = await queue.enqueue(5);
      expect(result).toBe(10);
      expect(processedBatches).toHaveLength(1);
      expect(processedBatches[0]).toEqual([5]);
    });

    it("should batch multiple items within delay window", async () => {
      const results = await Promise.all([
        queue.enqueue(1),
        queue.enqueue(2),
        queue.enqueue(3),
      ]);

      expect(results).toEqual([2, 4, 6]);
      expect(processedBatches).toHaveLength(1);
      expect(processedBatches[0]).toEqual([1, 2, 3]);
    });

    it("should respect maxBatchSize", async () => {
      const results = await Promise.all([
        queue.enqueue(1),
        queue.enqueue(2),
        queue.enqueue(3),
        queue.enqueue(4),
        queue.enqueue(5),
      ]);

      expect(results).toEqual([2, 4, 6, 8, 10]);
      expect(processedBatches).toHaveLength(2);
      expect(processedBatches[0]).toEqual([1, 2, 3]);
      expect(processedBatches[1]).toEqual([4, 5]);
    });

    it("should respect maxParallel limit", async () => {
      processDelay = 100; // Add delay to ensure batches overlap

      const results = await Promise.all([
        queue.enqueue(1),
        queue.enqueue(2),
        queue.enqueue(3),
        queue.enqueue(4),
        queue.enqueue(5),
        queue.enqueue(6),
      ]);

      expect(results).toEqual([2, 4, 6, 8, 10, 12]);
      expect(processedBatches).toHaveLength(3);
      expect(queue.activeBatches).toBeLessThanOrEqual(2);
    });

    it("should handle processing errors", async () => {
      const errorQueue = new BatchedQueue<number, number>({
        processBatch: async () => {
          throw new Error("Processing failed");
        },
        maxParallel: 1,
        maxBatchSize: 3,
        delayMs: 100,
      });

      await expect(errorQueue.enqueue(1)).rejects.toThrow("Processing failed");
    });

    it("should handle empty batches", async () => {
      const emptyQueue = new BatchedQueue<number, number>({
        processBatch: async () => [],
        maxParallel: 1,
        maxBatchSize: 3,
        delayMs: 100,
      });

      await expect(emptyQueue.enqueue(1)).rejects.toThrow();
    });

    it("should process items in order within batches", async () => {
      const results = await Promise.all([
        queue.enqueue(1),
        queue.enqueue(2),
        queue.enqueue(3),
      ]);

      expect(results).toEqual([2, 4, 6]);
      expect(processedBatches[0]).toEqual([1, 2, 3]);
    });

    it("should handle rapid enqueuing", async () => {
      const items = Array.from({ length: 10 }, (_, i) => i + 1);
      const results = await Promise.all(items.map((x) => queue.enqueue(x)));

      expect(results).toEqual(items.map((x) => x * 2));
      expect(processedBatches.length).toBeGreaterThan(1);
    });

    it("should respect delay between batches", async () => {
      const startTime = Date.now();
      const delays: number[] = [];

      // Override setTimeout to track delays
      const originalSetTimeout = setTimeout;
      vi.spyOn(global, "setTimeout").mockImplementation((fn, delay = 0) => {
        delays.push(delay);
        return originalSetTimeout(fn, delay);
      });

      await Promise.all([queue.enqueue(1), queue.enqueue(2), queue.enqueue(3)]);

      expect(delays).toContain(100); // Check for configured delay
      expect(Date.now() - startTime).toBeGreaterThanOrEqual(100);
    });

    it("should handle concurrent processing", async () => {
      processDelay = 50; // Add small delay to ensure batches overlap

      const items = Array.from({ length: 6 }, (_, i) => i + 1);
      const results = await Promise.all(items.map((x) => queue.enqueue(x)));

      expect(results).toEqual(items.map((x) => x * 2));
      expect(processedBatches.length).toBeGreaterThan(1);
      expect(queue.activeBatches).toBeLessThanOrEqual(2);
    });

    it("should handle large batches efficiently", async () => {
      const largeQueue = new BatchedQueue<number, number>({
        processBatch: async (batch) => batch.map((x) => x * 2),
        maxParallel: 1,
        maxBatchSize: 100,
        delayMs: 100,
      });

      const items = Array.from({ length: 150 }, (_, i) => i + 1);
      const results = await Promise.all(
        items.map((x) => largeQueue.enqueue(x)),
      );

      expect(results).toEqual(items.map((x) => x * 2));
      expect(results.length).toBe(150);
    });

    it("should handle zero delay", async () => {
      const zeroDelayQueue = new BatchedQueue<number, number>({
        processBatch: async (batch) => batch.map((x) => x * 2),
        maxParallel: 1,
        maxBatchSize: 3,
        delayMs: 0,
      });

      const results = await Promise.all([
        zeroDelayQueue.enqueue(1),
        zeroDelayQueue.enqueue(2),
        zeroDelayQueue.enqueue(3),
      ]);

      expect(results).toEqual([2, 4, 6]);
    });

    it("should handle processing timeouts", async () => {
      const timeoutQueue = new BatchedQueue<number, number>({
        processBatch: async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return [2];
        },
        maxParallel: 1,
        maxBatchSize: 1,
        delayMs: 100,
      });

      const result = await timeoutQueue.enqueue(1);
      expect(result).toBe(2);
    });
  });
});
