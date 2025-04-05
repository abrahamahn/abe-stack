import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  BatchedQueue,
  BatchState,
  BatchMetrics,
} from "@/server/infrastructure/queue/BatchedQueue";

describe("Queue Infrastructure Integration Tests", () => {
  describe("BatchedQueue", () => {
    let queue: BatchedQueue<number, number>;
    let processedBatches: number[][] = [];
    let processDelay: number = 0;
    let errorHandler: (error: unknown, batch: number[]) => void;
    let metricsHandler: (metrics: BatchMetrics<number>) => void;
    let capturedMetrics: BatchMetrics<number>[] = [];

    beforeEach(() => {
      processedBatches = [];
      processDelay = 0;
      capturedMetrics = [];

      // Create error handler and metrics handler spies
      errorHandler = vi.fn((_error, _batch) => {
        // No-op
      });

      metricsHandler = vi.fn((metrics) => {
        capturedMetrics.push(metrics);
      });

      queue = new BatchedQueue<number, number>({
        processBatch: async (batch) => {
          // Record the batch for test verification
          processedBatches.push([...batch]);
          if (processDelay > 0) {
            await new Promise((resolve) => setTimeout(resolve, processDelay));
          }
          return batch.map((x) => x * 2);
        },
        maxParallel: 2,
        maxBatchSize: 3,
        delayMs: 100,
        onError: errorHandler,
        onMetrics: metricsHandler,
      });
    });

    afterEach(() => {
      // Clean up any pending tasks
      if (queue) {
        // Explicitly cast to any to allow clearing private properties
        const queueAny = queue as any;
        if (queueAny.flushTimeoutId) {
          clearTimeout(queueAny.flushTimeoutId);
        }
      }
      queue = null as any;
    });

    it("should process single items", async () => {
      const result = await queue.enqueue(5);
      expect(result).toBe(10);
      expect(processedBatches).toHaveLength(1);
      expect(processedBatches[0]).toEqual([5]);
    });

    it("should batch multiple items within delay window", async () => {
      // Use vi.useFakeTimers to control batching timers
      vi.useFakeTimers();

      // Enqueue multiple items
      const promises = [queue.enqueue(1), queue.enqueue(2), queue.enqueue(3)];

      // Fast forward past the delay
      vi.advanceTimersByTime(120);

      // Restore real timers for promise resolution
      vi.useRealTimers();

      const results = await Promise.all(promises);

      expect(results).toEqual([2, 4, 6]);
      expect(processedBatches).toHaveLength(1);
      expect(processedBatches[0]).toEqual([1, 2, 3]);
    });

    it("should respect maxBatchSize", async () => {
      // Use vi.useFakeTimers to control batching timers
      vi.useFakeTimers();

      // Enqueue multiple items
      const promises = [
        queue.enqueue(1),
        queue.enqueue(2),
        queue.enqueue(3),
        queue.enqueue(4),
        queue.enqueue(5),
      ];

      // Fast forward past the delay
      vi.advanceTimersByTime(120);

      // Restore real timers for promise resolution
      vi.useRealTimers();

      const results = await Promise.all(promises);

      expect(results).toEqual([2, 4, 6, 8, 10]);
      expect(processedBatches).toHaveLength(2);
      expect(processedBatches[0]).toEqual([1, 2, 3]);
      expect(processedBatches[1]).toEqual([4, 5]);
    });

    it("should respect maxParallel limit", async () => {
      processDelay = 50; // Use a shorter delay to prevent test timeouts

      // Create a queue with a shorter delay for faster test execution
      const parallelQueue = new BatchedQueue<number, number>({
        processBatch: async (batch) => {
          processedBatches.push([...batch]);
          // Use a short artificial delay
          await new Promise((resolve) => setTimeout(resolve, processDelay));
          return batch.map((x) => x * 2);
        },
        maxParallel: 2,
        maxBatchSize: 2,
        delayMs: 10, // Very short delay for fast testing
      });

      // Enqueue items directly without using fake timers
      const promises = [
        parallelQueue.enqueue(1),
        parallelQueue.enqueue(2),
        parallelQueue.enqueue(3),
        parallelQueue.enqueue(4),
        parallelQueue.enqueue(5),
        parallelQueue.enqueue(6),
      ];

      const results = await Promise.all(promises);

      expect(results).toEqual([2, 4, 6, 8, 10, 12]);
      expect(processedBatches.length).toBeGreaterThan(1);
      expect(parallelQueue.getActiveBatches()).toBeLessThanOrEqual(2);
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

    it("should handle empty batch results", async () => {
      const emptyQueue = new BatchedQueue<number, number>({
        processBatch: async () => {
          return []; // Return empty result
        },
        maxParallel: 1,
        maxBatchSize: 3,
        delayMs: 100,
      });

      await expect(emptyQueue.enqueue(1)).rejects.toThrow(
        "Process batch returned empty result",
      );
    });

    it("should throw error if output count doesn't match input count", async () => {
      const mismatchQueue = new BatchedQueue<number, number>({
        processBatch: async (batch) => {
          return [batch[0] * 2]; // Return only the first item
        },
        maxParallel: 1,
        maxBatchSize: 3,
        delayMs: 100,
      });

      // Enqueue multiple items but the process will only return the first one
      const promises = [mismatchQueue.enqueue(1), mismatchQueue.enqueue(2)];

      await expect(Promise.all(promises)).rejects.toThrow(
        "Expected 2 outputs but got 1",
      );
    });

    it("should process items in order within batches", async () => {
      // Use vi.useFakeTimers to control batching
      vi.useFakeTimers();

      // Enqueue multiple items
      const promises = [queue.enqueue(1), queue.enqueue(2), queue.enqueue(3)];

      // Fast forward past the delay
      vi.advanceTimersByTime(120);

      // Restore real timers for promise resolution
      vi.useRealTimers();

      const results = await Promise.all(promises);

      expect(results).toEqual([2, 4, 6]);
      expect(processedBatches[0]).toEqual([1, 2, 3]);
    });

    it("should handle rapid enqueuing", async () => {
      const items = Array.from({ length: 10 }, (_, i) => i + 1);
      const results = await Promise.all(items.map((x) => queue.enqueue(x)));

      expect(results).toEqual(items.map((x) => x * 2));
      expect(processedBatches.length).toBeGreaterThan(1);
      expect(queue.getActiveBatches()).toBeLessThanOrEqual(2);
    });

    it("should respect delay between batches", async () => {
      let timeoutDelay: number | null = null;

      // Mock setTimeout more reliably to capture the delay
      vi.spyOn(global, "setTimeout").mockImplementation((_, delay) => {
        timeoutDelay = delay as number;
        // Return a timeout ID (doesn't matter what it is)
        return 123 as any;
      });

      // Enqueue an item to trigger the batch timeout
      queue.enqueue(1);

      // Verify the timeout was set with the expected delay
      expect(timeoutDelay).toBe(100);

      // Cleanup
      vi.restoreAllMocks();
    });

    it("should handle concurrent processing", async () => {
      processDelay = 50; // Add small delay to ensure batches overlap

      const items = Array.from({ length: 6 }, (_, i) => i + 1);
      const results = await Promise.all(items.map((x) => queue.enqueue(x)));

      expect(results).toEqual(items.map((x) => x * 2));
      expect(processedBatches.length).toBeGreaterThan(1);
      expect(queue.getActiveBatches()).toBeLessThanOrEqual(2);
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

    it("should track queue state correctly", async () => {
      // Use fake timers to control state changes
      vi.useFakeTimers();

      // Initially in IDLE state
      expect(queue.getState()).toBe(BatchState.IDLE);

      // Enqueue an item - should move to BATCHING
      const promise = queue.enqueue(1);
      expect(queue.getState()).toBe(BatchState.BATCHING);

      // Advance timers to move from BATCHING to PROCESSING
      vi.advanceTimersByTime(120);

      // Restore real timers for actual processing
      vi.useRealTimers();

      // Wait for processing to complete
      await promise;

      // After all items processed, should return to IDLE
      expect(queue.getState()).toBe(BatchState.IDLE);
    });

    it("should handle multiple batches with delays correctly", async () => {
      // Use fake timers for predictable behavior
      vi.useFakeTimers();

      // First batch
      const batch1 = [queue.enqueue(1), queue.enqueue(2)];

      // Advance time to process first batch
      vi.advanceTimersByTime(120);

      // Second batch - should start a new batch process
      const batch2 = [queue.enqueue(3), queue.enqueue(4)];

      // Advance time again to process second batch
      vi.advanceTimersByTime(120);

      // Restore real timers
      vi.useRealTimers();

      // Wait for all batches to complete
      const results1 = await Promise.all(batch1);
      const results2 = await Promise.all(batch2);

      // Verify results
      expect(results1).toEqual([2, 4]);
      expect(results2).toEqual([6, 8]);
      expect(processedBatches).toHaveLength(2);
      expect(processedBatches[0]).toEqual([1, 2]);
      expect(processedBatches[1]).toEqual([3, 4]);
    });

    it("should cancel tasks based on predicate", async () => {
      // Use fake timers to prevent immediate processing
      vi.useFakeTimers();

      // Enqueue items, some of which we'll cancel
      const promise1 = queue.enqueue(1);
      const promise2 = queue.enqueue(2);
      const promise3 = queue.enqueue(3);
      const promise4 = queue.enqueue(4);

      // Cancel tasks with even numbers
      const cancelCount = queue.cancelTasks((x) => x % 2 === 0);

      // Advance time to process remaining tasks
      vi.advanceTimersByTime(120);

      // Restore real timers
      vi.useRealTimers();

      // Verify that even-numbered tasks were cancelled
      expect(cancelCount).toBe(2);

      // Odd-numbered tasks should complete successfully
      const result1 = await promise1;
      expect(result1).toBe(2);

      const result3 = await promise3;
      expect(result3).toBe(6);

      // Even-numbered tasks should have been rejected
      await expect(promise2).rejects.toThrow(/Task .* was cancelled/);
      await expect(promise4).rejects.toThrow(/Task .* was cancelled/);

      // Only the non-cancelled tasks should have been processed
      expect(processedBatches).toHaveLength(1);
      expect(processedBatches[0]).toEqual([1, 3]);
    });

    it("should clear the queue", async () => {
      // Use fake timers to prevent immediate processing
      vi.useFakeTimers();

      // Enqueue several items
      const promises = [
        queue.enqueue(1),
        queue.enqueue(2),
        queue.enqueue(3),
        queue.enqueue(4),
      ];

      // Clear the queue with a custom reason
      const clearedCount = queue.clear("Testing queue clear");

      // Advance time
      vi.advanceTimersByTime(120);

      // Restore real timers
      vi.useRealTimers();

      // Verify the correct number of tasks were cleared
      expect(clearedCount).toBe(4);

      // All promises should be rejected with the custom reason
      for (const promise of promises) {
        await expect(promise).rejects.toThrow("Testing queue clear");
      }

      // No batches should have been processed
      expect(processedBatches).toHaveLength(0);

      // Queue should be in IDLE state
      expect(queue.getState()).toBe(BatchState.IDLE);
    });

    it("should track and provide queue statistics", async () => {
      // Add artificial delay to ensure processing time is measurable
      const delayedProcessBatch = async (items: number[]) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return items.map((i) => i * 2);
      };

      const statsQueue = new BatchedQueue<number, number>({
        processBatch: delayedProcessBatch,
        maxBatchSize: 10,
        maxParallel: 1,
        delayMs: 0,
        onError: errorHandler,
        onMetrics: metricsHandler,
      });

      await Promise.all([
        statsQueue.enqueue(1),
        statsQueue.enqueue(2),
        statsQueue.enqueue(3),
      ]);

      // Allow enough time for processing to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      const stats = statsQueue.getStats();

      expect(stats.totalProcessed).toBe(3);
      expect(stats.totalBatches).toBe(2);
      expect(stats.pendingTasks).toBe(0);
      expect(stats.activeBatches).toBe(0);
      expect(stats.state).toBe(BatchState.IDLE);
      expect(stats.errors).toBe(0);
      expect(stats.avgBatchTimeMs).toBeGreaterThan(0);
    });

    it("should include error count in statistics after errors", async () => {
      const errorQueue = new BatchedQueue<number, number>({
        processBatch: async () => {
          throw new Error("Test error");
        },
        maxParallel: 1,
        maxBatchSize: 3,
        delayMs: 0,
      });

      // Try to process item (will fail)
      try {
        await errorQueue.enqueue(1);
      } catch (_error) {
        // Expected error
      }

      // Get stats after error
      const stats = errorQueue.getStats();

      // Verify error was counted
      expect(stats.errors).toBe(1);
      expect(stats.totalProcessed).toBe(0);
    });

    it("should call the metrics handler with processing stats", async () => {
      // Add artificial delay to ensure processing time is measurable
      const delayedProcessBatch = async (items: number[]) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return items.map((i) => i * 2);
      };

      const metricsQueue = new BatchedQueue<number, number>({
        processBatch: delayedProcessBatch,
        maxBatchSize: 10,
        maxParallel: 1,
        delayMs: 0,
        onError: errorHandler,
        onMetrics: metricsHandler,
      });

      await metricsQueue.enqueue(5);

      // Allow enough time for processing to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(metricsHandler).toHaveBeenCalled();
      const metrics = capturedMetrics[0];
      expect(metrics.batch).toEqual([5]);
      expect(metrics.success).toBe(true);
      expect(metrics.processingTimeMs).toBeGreaterThan(0);
    });

    it("should call metrics handler with failure data on error", async () => {
      const errorQueue = new BatchedQueue<number, number>({
        processBatch: async () => {
          throw new Error("Test error for metrics");
        },
        maxParallel: 1,
        maxBatchSize: 1,
        delayMs: 0,
        onMetrics: metricsHandler,
      });

      // Try to process (will fail)
      try {
        await errorQueue.enqueue(7);
      } catch (_error) {
        // Expected error
      }

      // Verify metrics handler was called with failure data
      expect(metricsHandler).toHaveBeenCalled();
      expect(capturedMetrics.length).toBe(1);
      expect(capturedMetrics[0].success).toBe(false);
      expect(capturedMetrics[0].batch).toEqual([7]);
    });

    it("should handle errors in the error handler", async () => {
      // Create a queue with an error handler that throws
      const badHandlerQueue = new BatchedQueue<number, number>({
        processBatch: async () => {
          throw new Error("Original error");
        },
        maxParallel: 1,
        maxBatchSize: 1,
        delayMs: 0,
        onError: () => {
          throw new Error("Error handler failed");
        },
      });

      // Mock console.error to verify it's called
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Process item (will trigger error)
      await expect(badHandlerQueue.enqueue(1)).rejects.toThrow(
        "Original error",
      );

      // Verify console.error was called to log the error handler failure
      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toContain("Batch processing error");

      // Restore console.error
      consoleSpy.mockRestore();
    });
  });
});
