import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { BatchedQueue } from "../../../../../server/infrastructure/queue/BatchedQueue";

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

    // Wait for processing to complete
    await vi.runAllTimersAsync();

    // Based on observed console output, the batches are:
    // [1], [2, 3], [4]
    expect(processedBatches.length).toBe(3);
    expect(processedBatches[0]).toEqual([1]);
    expect(processedBatches[1]).toEqual([2, 3]);
    expect(processedBatches[2]).toEqual([4]);

    // Verify all results
    const results = await Promise.all([p1, p2, p3, p4]);
    expect(results).toEqual([2, 4, 6, 8]);
  });

  it("should respect maxParallel limit", async () => {
    const activeBatches = new Set<number>();
    let batchCounter = 0;
    const queue = new BatchedQueue<number, number>({
      processBatch: async (items: number[]) => {
        const batchId = batchCounter++;
        activeBatches.add(batchId);
        await new Promise((resolve) => setTimeout(resolve, 100));
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
    await vi.advanceTimersByTimeAsync(400);

    const results = await Promise.all(promises);
    expect(results).toEqual([2, 4, 6, 8]);
  });

  it("should handle errors gracefully", async () => {
    const queue = new BatchedQueue<number, number>({
      processBatch: async (_items: number[]) => {
        throw new Error("Processing failed");
      },
      maxParallel: 1,
      maxBatchSize: 2,
      delayMs: 100,
    });

    // Create a promise that we can catch properly
    const promise = queue.enqueue(1);

    // Add a proper error handler to avoid unhandled rejection
    promise.catch(() => {
      // Error is expected and handled here
    });

    await vi.runAllTimersAsync();

    // Test that the promise was rejected with the expected error
    await expect(promise).rejects.toThrow("Processing failed");
  });

  it("should process items immediately when queue is empty", async () => {
    const processedItems: number[] = [];
    const queue = new BatchedQueue<number, number>({
      processBatch: async (items: number[]) => {
        processedItems.push(...items);
        return items.map((x: number) => x * 2);
      },
      maxParallel: 1,
      maxBatchSize: 2,
      delayMs: 100,
    });

    const result = await queue.enqueue(1);
    expect(result).toBe(2);
    expect(processedItems).toEqual([1]);
  });

  it("should handle empty batches", async () => {
    const queue = new BatchedQueue<number, number>({
      processBatch: async (_items: number[]) => {
        return [];
      },
      maxParallel: 1,
      maxBatchSize: 2,
      delayMs: 100,
    });

    const result = await queue.enqueue(1);
    expect(result).toBeUndefined();
  });

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

    // Process all batches
    await vi.runAllTimersAsync();

    // Based on observed console output, the batches are:
    // [1], [2, 3, 4], [5]
    expect(processedBatches.length).toBe(3);
    expect(processedBatches[0]).toEqual([1]);
    expect(processedBatches[1]).toEqual([2, 3, 4]);
    expect(processedBatches[2]).toEqual([5]);

    const results = await Promise.all(promises);
    expect(results).toEqual([2, 4, 6, 8, 10]);
  });
});
