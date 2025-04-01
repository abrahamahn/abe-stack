import { describe, it, expect, vi, beforeEach } from "vitest";

import { BatchedQueue } from "../../../../../server/infrastructure/queue/BatchedQueue";

describe("BatchedQueue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("should process items in batches", async () => {
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

    const promises = [
      queue.enqueue(1),
      queue.enqueue(2),
      queue.enqueue(3),
      queue.enqueue(4),
    ];

    // Process first batch
    await vi.advanceTimersByTimeAsync(100);
    expect(processedItems).toEqual([1, 2]);

    // Process second batch
    await vi.advanceTimersByTimeAsync(100);
    expect(processedItems).toEqual([1, 2, 3, 4]);

    const results = await Promise.all(promises);
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

    const promise = queue.enqueue(1);
    await vi.advanceTimersByTimeAsync(100);

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
    const processedItems: number[] = [];
    const queue = new BatchedQueue<number, number>({
      processBatch: async (items: number[]) => {
        processedItems.push(...items);
        return items.map((x: number) => x * 2);
      },
      maxParallel: 1,
      maxBatchSize: 3,
      delayMs: 100,
    });

    const promises = [
      queue.enqueue(1),
      queue.enqueue(2),
      queue.enqueue(3),
      queue.enqueue(4),
      queue.enqueue(5),
    ];

    await vi.advanceTimersByTimeAsync(100);
    expect(processedItems).toEqual([1, 2, 3]);

    await vi.advanceTimersByTimeAsync(100);
    expect(processedItems).toEqual([1, 2, 3, 4, 5]);

    const results = await Promise.all(promises);
    expect(results).toEqual([2, 4, 6, 8, 10]);
  });
});
