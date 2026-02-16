// main/shared/src/utils/async/batched-queue.ts
/**
 * Batched Queue with Backpressure Control
 *
 * A utility for batching and processing tasks with configurable limits to prevent
 * memory overflow under high load. Implements backpressure by rejecting new tasks
 * when the queue exceeds the maximum size.
 */

import { AppError } from '../../../engine/errors/base';
import { HTTP_STATUS } from '../../constants';

import { DeferredPromise } from './deferred-promise';

/**
 * Error thrown when the queue exceeds its maximum size.
 */
export class QueueFullError extends AppError {
  constructor(message: string) {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, 'QUEUE_FULL');
  }
}

/**
 * Options for configuring the BatchedQueue
 */
export interface BatchedQueueOptions {
  /** Maximum number of items per batch (default: 10) */
  maxBatchSize?: number;
  /** Maximum time to wait before processing a batch (default: 1000ms) */
  maxWaitMs?: number;
  /** Maximum number of items in the queue before rejecting new tasks (default: 1000) */
  maxQueueSize?: number;

  /** Error handling strategy */
  errorHandling?: 'fail-fast' | 'continue' | 'retry';
  /** Retry configuration (if errorHandling is 'retry') */
  retryConfig?: {
    maxRetries: number;
    backoffMultiplier: number;
    maxDelayMs: number;
  };
}

/**
 * Result of processing a batch of items
 */
export interface BatchProcessResult<T> {
  /** Items that were successfully processed */
  success: T[];
  /** Items that failed to process */
  failed: Array<{ item: T; error: unknown }>;
}

/**
 * A queue that batches items and processes them in groups with backpressure protection.
 */
/** @typeParam T - Input type for the queue items */
/** @typeParam R - Return type for the processed items */

export class BatchedQueue<T, R = T> {
  private tasks: Array<{ item: T; deferred: DeferredPromise<R> }> = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private readonly processor: (batch: T[]) => Promise<R[]>;
  private readonly options: Required<BatchedQueueOptions>;

  constructor(processor: (batch: T[]) => Promise<R[]>, options: BatchedQueueOptions = {}) {
    this.processor = processor;
    this.options = {
      maxBatchSize: options.maxBatchSize ?? 10,
      maxWaitMs: options.maxWaitMs ?? 1000,
      maxQueueSize: options.maxQueueSize ?? 1000,

      errorHandling: options.errorHandling ?? 'continue',
      retryConfig: options.retryConfig ?? {
        maxRetries: 3,
        backoffMultiplier: 2,
        maxDelayMs: 30000,
      },
    };
  }

  /**
   * Enqueue an item for batch processing.
   *
   * @param item - The item to process
   * @returns A promise that resolves when the item is processed
   * @throws TooManyRequestsError if the queue exceeds maxQueueSize
   */
  enqueue(item: T): Promise<R> {
    // Check if we've exceeded the maximum queue size
    if (this.tasks.length >= this.options.maxQueueSize) {
      throw new QueueFullError(`Queue size exceeded maximum of ${this.options.maxQueueSize}`);
    }

    const deferred = new DeferredPromise<R>();
    this.tasks.push({ item, deferred });

    // Start the timer if it's not already running
    this.timer ??= setTimeout(() => {
      this.timer = null;
      void this.processBatch();
    }, this.options.maxWaitMs);

    // Process immediately if we've reached max batch size
    if (this.tasks.length >= this.options.maxBatchSize) {
      void this.processBatch();
    }

    return deferred.promise;
  }

  private isProcessing = false;

  /**
   * Process the current batch of tasks.
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      if (this.timer !== null) {
        clearTimeout(this.timer);
        this.timer = null;
      }

      while (this.tasks.length > 0) {
        // Take a batch
        const batch = this.tasks.slice(0, this.options.maxBatchSize);
        // Remove them from queue immediately to prevent double processing
        this.tasks = this.tasks.slice(batch.length);

        try {
          await this.processSingleBatch(batch);
        } catch (error) {
          if (this.options.errorHandling === 'fail-fast') {
            this.clear(); // Reject remaining tasks in the queue
            throw error; // Stop the loop
          }
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single batch of tasks.
   */
  private async processSingleBatch(
    batch: Array<{ item: T; deferred: DeferredPromise<R> }>,
    attempt = 0,
  ): Promise<void> {
    const items = batch.map((task) => task.item);

    try {
      const results = await this.processor(items);

      // Resolve each deferred promise with the corresponding result
      for (let i = 0; i < batch.length; i++) {
        const task = batch[i];
        if (task === undefined) continue;

        if (i < results.length) {
          const result = results[i] as R;
          task.deferred.resolve(result);
        } else {
          task.deferred.reject(new Error('Processor returned fewer results than expected'));
        }
      }
    } catch (error) {
      // Handle errors based on the error handling strategy
      if (this.options.errorHandling !== 'retry') {
        for (const task of batch) {
          task.deferred.reject(error);
        }
        if (this.options.errorHandling === 'fail-fast') {
          throw error;
        }
        return;
      }

      const max = this.options.retryConfig.maxRetries;
      if (attempt >= max) {
        for (const task of batch) {
          task.deferred.reject(
            new Error(`Max retries exceeded (${max}). Original error: ${String(error)}`),
          );
        }
        return;
      }

      // Wait with exponential backoff
      const delay = Math.min(
        this.options.retryConfig.maxDelayMs,
        Math.pow(this.options.retryConfig.backoffMultiplier, attempt) * 1000,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));

      // Try processing the batch again, incrementing attempt
      await this.processSingleBatch(batch, attempt + 1);
    }
  }

  /**
   * Get the current number of items in the queue.
   */
  get size(): number {
    return this.tasks.length;
  }

  /**
   * Get the current queue status.
   */
  getStatus(): { size: number; maxSize: number; isFull: boolean } {
    return {
      size: this.size,
      maxSize: this.options.maxQueueSize,
      isFull: this.size >= this.options.maxQueueSize,
    };
  }

  /**
   * Clear the queue and reject all pending promises.
   */
  clear(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Reject all pending promises
    for (const task of this.tasks) {
      task.deferred.reject(new Error('Queue cleared'));
    }

    this.tasks = [];
  }

  /**
   * Flush the queue by processing all remaining items immediately.
   */
  async flush(): Promise<void> {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    await this.processBatch();
  }
}
