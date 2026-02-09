// src/shared/src/utils/async/batched-queue.test.ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { BatchedQueue } from './batched-queue';

describe('BatchedQueue', () => {
  let queue: BatchedQueue<number, number>;

  beforeEach(() => {
    queue = new BatchedQueue(
      async (items: number[]) => {
        // Simulate async processing
        await new Promise((resolve) => setTimeout(resolve, 10));
        return items.map((item) => item * 2);
      },
      { maxBatchSize: 3, maxWaitMs: 50, maxQueueSize: 10 },
    );
  });

  afterEach(() => {
    queue.clear();
  });

  it('should process items in batches', async () => {
    const promises = [1, 2, 3, 4, 5].map((item) => queue.enqueue(item));
    const results = await Promise.all(promises);

    expect(results).toEqual([2, 4, 6, 8, 10]);
  });

  it('should enforce max queue size', () => {
    // Reconfigure queue with large batch size to ensure it fills up
    const limitedQueue = new BatchedQueue((i) => Promise.resolve(i), {
      maxBatchSize: 100,
      maxQueueSize: 5,
    });

    // Fill the queue to max capacity
    for (let i = 0; i < 5; i++) {
      limitedQueue.enqueue(i).catch(() => {}); // Catch to avoid unhandled rejection on clear
    }

    // The next enqueue should throw synchronously
    expect(() => limitedQueue.enqueue(5)).toThrow('Queue size exceeded maximum of 5');

    limitedQueue.clear();
  });

  it('should process immediately when reaching max batch size', async () => {
    const promises = [1, 2, 3].map((item) => queue.enqueue(item));
    const results = await Promise.all(promises);

    expect(results).toEqual([2, 4, 6]);
  });

  it('should process after timeout if batch is not full', async () => {
    const result = await queue.enqueue(1);
    expect(result).toBe(2);
  });

  it('should handle errors appropriately', async () => {
    const errorQueue = new BatchedQueue(
      (_items: number[]) => Promise.reject(new Error('Processing failed')),
      {
        maxBatchSize: 3,
        maxWaitMs: 50,
        maxQueueSize: 10,
        errorHandling: 'continue',
      },
    );

    await expect(errorQueue.enqueue(1)).rejects.toThrow('Processing failed');
  });

  it('should return correct status', () => {
    expect(queue.getStatus()).toEqual({
      size: 0,
      maxSize: 10,
      isFull: false,
    });

    queue.enqueue(1).catch(() => {});
    expect(queue.getStatus().size).toBe(1);
  });

  it('should flush remaining items', async () => {
    void queue.enqueue(1).catch(() => {});
    void queue.enqueue(2).catch(() => {});

    await queue.flush();

    expect(queue.size).toBe(0);
  });
});
