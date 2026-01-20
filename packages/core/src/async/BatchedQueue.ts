// packages/core/src/async/BatchedQueue.ts
import { DeferredPromise } from './DeferredPromise';

/**
 * Configuration options for BatchedQueue.
 */
export interface BatchedQueueOptions<I, O> {
  /**
   * Function to process a batch of inputs and return corresponding outputs.
   * The outputs array must have the same length as the inputs array.
   */
  processBatch: (batch: I[]) => Promise<O[]>;

  /**
   * Maximum number of batches that can be processed in parallel.
   */
  maxParallel: number;

  /**
   * Maximum number of items in a single batch.
   */
  maxBatchSize: number;

  /**
   * Delay in milliseconds before processing a batch.
   * Allows time for more items to be enqueued.
   */
  delayMs: number;
}

interface QueuedTask<I, O> {
  input: I;
  output: DeferredPromise<O>;
}

/**
 * A queue that batches multiple async calls into single operations.
 * Useful for combining multiple database queries or API calls.
 *
 * @example
 * ```typescript
 * const batchedUserFetch = new BatchedQueue({
 *   processBatch: async (ids: string[]) => {
 *     return db.select().from(users).where(inArray(users.id, ids));
 *   },
 *   maxParallel: 5,
 *   maxBatchSize: 100,
 *   delayMs: 1,
 * });
 *
 * // These 3 calls become 1 DB query
 * const [user1, user2, user3] = await Promise.all([
 *   batchedUserFetch.enqueue('id-1'),
 *   batchedUserFetch.enqueue('id-2'),
 *   batchedUserFetch.enqueue('id-3'),
 * ]);
 * ```
 */
export class BatchedQueue<I, O> {
  private tasks: Array<QueuedTask<I, O>> = [];
  private activeBatches = 0;
  private flushScheduled = false;
  private flushTimeoutId: NodeJS.Timeout | null = null;

  constructor(private options: BatchedQueueOptions<I, O>) {}

  /**
   * Enqueue an input for batched processing.
   * Returns a promise that resolves with the corresponding output.
   */
  enqueue(input: I): Promise<O> {
    const output = new DeferredPromise<O>();
    this.tasks.push({ input, output });
    this.scheduleFlush();
    return output.promise;
  }

  /**
   * Get the number of pending tasks in the queue.
   */
  get pendingCount(): number {
    return this.tasks.length;
  }

  /**
   * Get the number of batches currently being processed.
   */
  get activeBatchCount(): number {
    return this.activeBatches;
  }

  private scheduleFlush(): void {
    if (this.flushScheduled) return;
    this.flushScheduled = true;
    this.flushTimeoutId = setTimeout(() => {
      this.flushTimeoutId = null;
      this.flushScheduled = false;
      void this.flush();
    }, this.options.delayMs);
  }

  /**
   * Destroy the queue and cancel any pending flushes.
   * Rejects all pending tasks with an error.
   */
  destroy(): void {
    if (this.flushTimeoutId) {
      clearTimeout(this.flushTimeoutId);
      this.flushTimeoutId = null;
    }
    this.flushScheduled = false;

    // Reject all pending tasks
    const error = new Error('BatchedQueue destroyed');
    for (const task of this.tasks) {
      task.output.reject(error);
    }
    this.tasks = [];
  }

  private flush = async (): Promise<void> => {
    if (this.tasks.length === 0) return;
    if (this.activeBatches >= this.options.maxParallel) return;

    this.activeBatches++;
    const batch = this.tasks.splice(0, this.options.maxBatchSize);

    try {
      const outputs = await this.options.processBatch(batch.map((t) => t.input));

      if (outputs.length !== batch.length) {
        const error = new Error(
          `BatchedQueue: processBatch returned ${String(outputs.length)} outputs for ${String(batch.length)} inputs`,
        );
        batch.forEach(({ output }) => {
          output.reject(error);
        });
      } else {
        outputs.forEach((value, i) => {
          const task = batch[i];
          if (task !== undefined) {
            task.output.resolve(value);
          }
        });
      }
    } catch (error) {
      batch.forEach(({ output }) => {
        output.reject(error);
      });
    } finally {
      this.activeBatches--;
      // Process more if there are remaining tasks
      if (this.tasks.length > 0) {
        void this.flush();
      }
    }
  };
}
