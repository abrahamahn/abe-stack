import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  BatchedQueue,
  BatchProcessingError,
  BatchEmptyResultError,
  TaskCancellationError,
} from "../../../../../server/infrastructure/queue/BatchedQueue";

describe("BatchedQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.clearAllMocks();
  });

  it("should process items in batches", async () => {
    // Track when items are processed to verify batching
    const processedBatches: number[][] = [];

    const queue = new BatchedQueue<number, number>({
      processBatch: async (items: number[]) => {
        // Save the batch for verification
        processedBatches.push([...items]);
        console.log("Processing batch:", items);

        // Return the processed items (double each value)
        return items.map((x: number) => x * 2);
      },
      maxParallel: 1,
      maxBatchSize: 2,
      delayMs: 100,
    });

    // Queue all items before any processing starts
    const p1 = queue.enqueue(1);
    const p2 = queue.enqueue(2);
    const p3 = queue.enqueue(3);
    const p4 = queue.enqueue(4);

    // First batch [1, 2] processes immediately as we observed
    await vi.runOnlyPendingTimersAsync();

    // Process the next batch [3, 4]
    await vi.runOnlyPendingTimersAsync();

    // Make sure all batches are processed
    await vi.runAllTimersAsync();

    // Verify all results are available
    const results = await Promise.all([p1, p2, p3, p4]);
    expect(results).toEqual([2, 4, 6, 8]);

    // Verify batching behavior based on actual implementation
    expect(processedBatches.length).toBe(2);
    expect(processedBatches[0]).toEqual([1, 2]);
    expect(processedBatches[1]).toEqual([3, 4]);
  }, 5000); // Increase timeout to 5 seconds

  it("should respect maxParallel limit", async () => {
    const activeBatches = new Set<number>();
    let batchCounter = 0;
    const queue = new BatchedQueue<number, number>({
      processBatch: async (items: number[]) => {
        const batchId = batchCounter++;
        activeBatches.add(batchId);
        // Don't use real timeouts in tests
        await vi.advanceTimersByTimeAsync(50);
        activeBatches.delete(batchId);
        return items.map((x: number) => x * 2);
      },
      maxParallel: 2,
      maxBatchSize: 1,
      delayMs: 0,
    });

    const promises = [
      queue.enqueue(1),
      queue.enqueue(2),
      queue.enqueue(3),
      queue.enqueue(4),
    ];

    // Start processing
    await vi.advanceTimersByTimeAsync(0);

    // Should have at most 2 active batches
    expect(activeBatches.size).toBeLessThanOrEqual(2);

    // Wait for all batches to complete
    await vi.advanceTimersByTimeAsync(200);

    const results = await Promise.all(promises);
    expect(results).toEqual([2, 4, 6, 8]);
  }, 5000); // Increase timeout to 5 seconds

  it("should handle errors gracefully", async () => {
    const onErrorMock = vi.fn();
    const queue = new BatchedQueue<number, number>({
      processBatch: async (_items: number[]) => {
        throw new Error("Processing failed");
      },
      maxParallel: 1,
      maxBatchSize: 2,
      delayMs: 0, // Use 0 delay to process immediately
      onError: onErrorMock,
    });

    // Create a promise that we can catch properly
    const promise = queue.enqueue(1);

    // Add proper catch handler to avoid unhandled rejections
    promise.catch(() => {
      // Expected rejection, just consume it to avoid unhandled rejection
    });

    // Process immediately to trigger the error
    await vi.runAllTimersAsync();

    // Test that the promise was rejected with the expected error
    await expect(promise).rejects.toThrow(
      "Batch processing failed: Processing failed",
    );

    // Verify error is instance of BatchProcessingError
    await expect(promise).rejects.toBeInstanceOf(BatchProcessingError);

    // Verify onError callback was called
    expect(onErrorMock).toHaveBeenCalledTimes(1);
    expect(onErrorMock.mock.calls[0][0]).toBeInstanceOf(BatchProcessingError);
    expect(onErrorMock.mock.calls[0][1]).toEqual([1]);
  }, 5000); // Increase timeout to 5 seconds

  it("should process items immediately when queue is empty", async () => {
    const processedItems: number[] = [];
    const queue = new BatchedQueue<number, number>({
      processBatch: async (items: number[]) => {
        processedItems.push(...items);
        return items.map((x: number) => x * 2);
      },
      maxParallel: 1,
      maxBatchSize: 2,
      delayMs: 0, // Use 0 delay to process immediately
    });

    // First item should be processed immediately with 0 delay
    const resultPromise = queue.enqueue(1);

    // Advance timer to let the task complete
    await vi.runAllTimersAsync();

    const result = await resultPromise;
    expect(result).toBe(2);
    expect(processedItems).toEqual([1]);
  }, 5000); // Increase timeout to 5 seconds

  it("should handle empty batches", async () => {
    const queue = new BatchedQueue<number, number>({
      processBatch: async (_items: number[]) => {
        // Return empty array
        return [];
      },
      maxParallel: 1,
      maxBatchSize: 2,
      delayMs: 0, // Use 0 delay to process immediately
    });

    const resultPromise = queue.enqueue(1);

    // Add a catch handler to prevent unhandled rejection
    resultPromise.catch(() => {
      // Expected rejection, just consume it
    });

    // Advance timer to let the task complete
    await vi.runAllTimersAsync();

    // Should reject with an error
    await expect(resultPromise).rejects.toThrow(
      "Process batch returned empty result",
    );

    // Verify error is instance of BatchEmptyResultError
    await expect(resultPromise).rejects.toBeInstanceOf(BatchEmptyResultError);
  }, 5000); // Increase timeout to 5 seconds

  it("should process items in order within each batch", async () => {
    // Track each batch separately to verify ordering
    const processedBatches: number[][] = [];

    const queue = new BatchedQueue<number, number>({
      processBatch: async (items: number[]) => {
        // Track this batch
        processedBatches.push([...items]);
        console.log("Processing batch:", items);
        return items.map((x: number) => x * 2);
      },
      maxParallel: 1,
      maxBatchSize: 3,
      delayMs: 100,
    });

    // Enqueue all items before processing starts
    const promises = [
      queue.enqueue(1),
      queue.enqueue(2),
      queue.enqueue(3),
      queue.enqueue(4),
      queue.enqueue(5),
    ];

    // Process first batch - actual behavior shows [1, 2, 3]
    await vi.runOnlyPendingTimersAsync();

    // Wait for next batch to be processed [4, 5]
    await vi.runOnlyPendingTimersAsync();

    // Make sure all batches complete
    await vi.runAllTimersAsync();

    // Verify batching behavior based on actual implementation
    expect(processedBatches.length).toBe(2);
    expect(processedBatches[0]).toEqual([1, 2, 3]); // First batch has first 3 items
    expect(processedBatches[1]).toEqual([4, 5]); // Second batch has remaining items

    // Verify all results
    const results = await Promise.all(promises);
    expect(results).toEqual([2, 4, 6, 8, 10]);
  }, 5000); // Increase timeout to 5 seconds

  it("should allow cancelling tasks", async () => {
    const processedItems: number[] = [];
    const queue = new BatchedQueue<number, number>({
      processBatch: async (items: number[]) => {
        processedItems.push(...items);
        return items.map((x) => x * 2);
      },
      maxParallel: 1,
      maxBatchSize: 5,
      delayMs: 100,
    });

    // Queue several items
    const p1 = queue.enqueue(1);
    const p2 = queue.enqueue(2);
    const p3 = queue.enqueue(3);

    // Add catch handlers to prevent unhandled rejections
    p2.catch(() => {
      /* Expected rejection */
    });

    // Cancel the second task
    const cancelCount = queue.cancelTasks(
      (item, _) => item === 2,
      "Test cancellation",
    );

    // Verify one task was cancelled
    expect(cancelCount).toBe(1);

    // Advance timers to complete processing
    await vi.runAllTimersAsync();

    // Check remaining tasks were processed
    const r1 = await p1;
    expect(r1).toBe(2);

    // Check cancelled task was rejected
    await expect(p2).rejects.toThrow("Task");
    await expect(p2).rejects.toThrow("was cancelled: Test cancellation");
    await expect(p2).rejects.toBeInstanceOf(TaskCancellationError);

    const r3 = await p3;
    expect(r3).toBe(6);

    // Verify only non-cancelled items were processed
    expect(processedItems).toEqual([1, 3]);
  }, 5000); // Increase timeout to 5 seconds
});
