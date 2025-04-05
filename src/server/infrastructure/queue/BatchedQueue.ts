import { DeferredPromise } from "@/server/infrastructure/promises";

/**
 * Base error class for all batched queue errors
 */
export class BatchedQueueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BatchedQueueError";
  }
}

/**
 * Error thrown when batch processing fails
 */
export class BatchProcessingError extends BatchedQueueError {
  constructor(
    message: string,
    public originalError: Error,
  ) {
    super(`Batch processing failed: ${message}`);
    this.name = "BatchProcessingError";
    this.cause = originalError;
  }
}

/**
 * Error thrown when batch output count doesn't match input count
 */
export class BatchOutputMismatchError extends BatchedQueueError {
  constructor(
    public expectedCount: number,
    public actualCount: number,
  ) {
    super(`Expected ${expectedCount} outputs but got ${actualCount}`);
    this.name = "BatchOutputMismatchError";
  }
}

/**
 * Error thrown when batch output is empty
 */
export class BatchEmptyResultError extends BatchedQueueError {
  constructor() {
    super("Process batch returned empty result");
    this.name = "BatchEmptyResultError";
  }
}

/**
 * Error thrown when a task is cancelled
 */
export class TaskCancellationError extends BatchedQueueError {
  constructor(
    public taskId: string,
    public reason?: string,
  ) {
    super(`Task ${taskId} was cancelled${reason ? `: ${reason}` : ""}`);
    this.name = "TaskCancellationError";
  }
}

/**
 * Type representing a task in the queue
 */
type Task<I, O> = {
  /** The input to be processed */
  input: I;

  /** The deferred promise to be resolved with the output */
  output: DeferredPromise<O>;

  /** Timestamp when the task was enqueued */
  enqueuedAt: number;

  /** Unique ID for the task */
  id: string;
};

/**
 * Represents the current state of the batch queue
 */
export enum BatchState {
  /** Queue is idle (no tasks and no processing) */
  IDLE = "idle",

  /** Queue is collecting tasks to form a batch */
  BATCHING = "batching",

  /** Queue is processing one or more batches */
  PROCESSING = "processing",
}

/**
 * Configuration options for the BatchedQueue
 */
export interface BatchedQueueOptions<I, O> {
  /**
   * Function that processes a batch of inputs and returns a batch of outputs
   * @param batch Array of input items to process
   * @returns Promise resolving to an array of output items
   */
  processBatch: (batch: I[]) => Promise<O[]>;

  /**
   * Maximum number of batches that can be processed in parallel
   * @default 1
   */
  maxParallel: number;

  /**
   * Maximum size of a batch
   * @default 10
   */
  maxBatchSize: number;

  /**
   * Delay in milliseconds before processing a batch
   * @default 100
   */
  delayMs: number;

  /**
   * Optional error handler function
   * Called when batch processing fails
   */
  onError?: (error: Error, inputs: I[]) => void;

  /**
   * Optional metrics handler function
   * Called after each batch is processed
   */
  onMetrics?: (metrics: BatchMetrics<I>) => void;

  /**
   * Logger to use for queue operations
   * If not provided, console will be used
   */
  logger?: {
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
}

/**
 * Performance metrics for batch processing
 */
export interface BatchMetrics<I> {
  /** Number of items in the batch */
  batchSize: number;

  /** Time taken to process the batch in milliseconds */
  processingTimeMs: number;

  /** Average time per item in milliseconds */
  avgItemTimeMs: number;

  /** The batch inputs */
  batch: I[];

  /** Whether the batch processing succeeded */
  success: boolean;
}

/**
 * Statistics about the queue's operation
 */
export interface QueueStats {
  /** Current number of pending tasks */
  pendingTasks: number;

  /** Current number of active batches being processed */
  activeBatches: number;

  /** Total number of tasks processed since queue creation */
  totalProcessed: number;

  /** Total number of batches processed since queue creation */
  totalBatches: number;

  /** Current state of the queue */
  state: BatchState;

  /** Total number of errors encountered */
  errors: number;

  /** Average batch processing time in milliseconds */
  avgBatchTimeMs: number | null;
}

/**
 * A utility for batching computations and processing them in parallel.
 * This queue batches items together to improve processing efficiency and
 * controls the level of parallelism.
 *
 * Features:
 * - Batches items together for efficient processing
 * - Controls maximum parallel processing
 * - Enforces maximum batch size
 * - Provides metrics and error handling
 * - Supports task cancellation
 */
export class BatchedQueue<I, O> {
  private tasks: Task<I, O>[] = [];
  private flushTimeoutId: NodeJS.Timeout | null = null;
  private activeBatches = 0;
  private state: BatchState = BatchState.IDLE;
  private creatingBatch = false;
  private totalProcessed = 0;
  private totalBatches = 0;
  private totalErrors = 0;
  private processingTimesMs: number[] = [];

  /**
   * Creates a new BatchedQueue instance
   *
   * @param options Configuration options for the queue
   */
  constructor(private options: BatchedQueueOptions<I, O>) {
    // Set default values if not provided
    this.options.maxParallel = options.maxParallel ?? 1;
    this.options.maxBatchSize = options.maxBatchSize ?? 10;
    this.options.delayMs = options.delayMs ?? 100;
  }

  /**
   * Get the number of active batches (for testing and monitoring)
   * @returns The number of active batches
   */
  public getActiveBatches(): number {
    return this.activeBatches;
  }

  /**
   * Get the current state of the queue
   * @returns The current state as a BatchState enum value
   */
  public getState(): BatchState {
    return this.state;
  }

  /**
   * Get statistics about the queue's operation
   * @returns Current queue statistics
   */
  public getStats(): QueueStats {
    // Calculate average processing time if we have data
    const avgBatchTimeMs =
      this.processingTimesMs.length > 0
        ? this.processingTimesMs.reduce((sum, time) => sum + time, 0) /
          this.processingTimesMs.length
        : null;

    return {
      pendingTasks: this.tasks.length,
      activeBatches: this.activeBatches,
      totalProcessed: this.totalProcessed,
      totalBatches: this.totalBatches,
      state: this.state,
      errors: this.totalErrors,
      avgBatchTimeMs,
    };
  }

  /**
   * Add an item to the queue and return a promise that resolves with the result
   *
   * @param input The input item to process
   * @returns A promise that resolves with the processed result
   */
  public enqueue(input: I): Promise<O> {
    const output = new DeferredPromise<O>();

    // Create a unique ID for the task
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Create a task with the current timestamp and unique ID
    const task: Task<I, O> = {
      input,
      output,
      enqueuedAt: Date.now(),
      id: taskId,
    };

    this.tasks.push(task);

    // If we're already batching, let the current batch timer continue
    if (this.state === BatchState.BATCHING) {
      return output.promise;
    }

    // Cancel any existing timeout - we'll create a new one
    if (this.flushTimeoutId) {
      clearTimeout(this.flushTimeoutId);
      this.flushTimeoutId = null;
    }

    // If we should process immediately (no batching delay, no active batches)
    if (
      this.options.delayMs <= 0 &&
      this.activeBatches < this.options.maxParallel
    ) {
      this.state = BatchState.PROCESSING;
      this.flush();
      return output.promise;
    }

    // Enter batching state and schedule processing after the delay
    this.state = BatchState.BATCHING;
    this.flushTimeoutId = setTimeout(() => {
      this.state = BatchState.PROCESSING;
      this.flushTimeoutId = null;
      this.flush();
    }, this.options.delayMs);

    return output.promise;
  }

  /**
   * Cancel pending tasks that match the provided predicate
   *
   * @param predicate A function that returns true for tasks that should be cancelled
   * @param reason Optional reason for cancellation
   * @returns The number of tasks that were cancelled
   */
  public cancelTasks(
    predicate: (input: I, taskId: string) => boolean,
    reason?: string,
  ): number {
    let cancelCount = 0;

    // Create a new array of tasks, excluding cancelled ones
    const remainingTasks: Task<I, O>[] = [];

    for (const task of this.tasks) {
      if (predicate(task.input, task.id)) {
        // Reject the task's promise with a cancellation error
        const error = new TaskCancellationError(task.id, reason);
        task.output.reject(error);
        cancelCount++;

        const logger = this.options.logger || console;
        logger.debug(
          `Cancelled task ${task.id}${reason ? ` - Reason: ${reason}` : ""}`,
        );
      } else {
        remainingTasks.push(task);
      }
    }

    // Replace the tasks array with the filtered version
    this.tasks = remainingTasks;

    // If no more tasks and in batching state, clear the timeout
    if (this.tasks.length === 0 && this.state === BatchState.BATCHING) {
      if (this.flushTimeoutId) {
        clearTimeout(this.flushTimeoutId);
        this.flushTimeoutId = null;
      }
      this.state = BatchState.IDLE;
    }

    return cancelCount;
  }

  /**
   * Clear all pending tasks in the queue
   *
   * @param reason Optional reason for clearing the queue (will be included in rejection message)
   * @returns The number of tasks that were cleared
   */
  public clear(reason = "Queue cleared"): number {
    const count = this.tasks.length;

    // Reject all pending task promises
    for (const task of this.tasks) {
      task.output.reject(new Error(reason));
    }

    // Clear the tasks array
    this.tasks = [];

    // Cancel any scheduled flush
    if (this.flushTimeoutId) {
      clearTimeout(this.flushTimeoutId);
      this.flushTimeoutId = null;
    }

    // Reset to idle state if not processing
    if (this.state === BatchState.BATCHING) {
      this.state = BatchState.IDLE;
    }

    return count;
  }

  /**
   * Process the next batch of tasks
   * @private
   */
  private flush = async (): Promise<void> => {
    // If another call to flush is already creating a batch, or there are no tasks, or we've reached max parallel batches, do nothing
    if (
      this.creatingBatch ||
      this.tasks.length === 0 ||
      this.activeBatches >= this.options.maxParallel
    ) {
      return;
    }

    // Mark that we're creating a batch to prevent concurrent batch creation
    this.creatingBatch = true;
    this.activeBatches += 1;

    // Take only maxBatchSize items from the queue
    const batch = this.tasks.splice(0, this.options.maxBatchSize);
    const inputs = batch.map((task) => task.input);

    const logger = this.options.logger || console;
    logger.debug(`Creating batch with ${batch.length} items`);

    // Batch is created, so we can allow other batches to be created if needed
    this.creatingBatch = false;

    // Prepare metrics
    const startTime = Date.now();
    let metrics: BatchMetrics<I> | null = null;

    try {
      // Process the batch
      const outputs = await this.options.processBatch(inputs);

      // Handle outputs gracefully
      if (!outputs || outputs.length === 0) {
        // If outputs array is empty or undefined, reject all tasks with an error
        const error = new BatchEmptyResultError();
        for (const task of batch) {
          task.output.reject(error);
        }
        // Also throw this error so it's caught by the catch block
        throw error;
      } else if (outputs.length !== inputs.length) {
        // If output length doesn't match input length, reject all tasks with an error
        const error = new BatchOutputMismatchError(
          inputs.length,
          outputs.length,
        );
        logger.warn(`BatchedQueue: ${error.message}`);

        for (const task of batch) {
          task.output.reject(error);
        }
        // Also throw this error so it's caught by the catch block
        throw error;
      } else {
        // Normal case: resolve each task with its corresponding output
        for (let i = 0; i < batch.length; i++) {
          batch[i].output.resolve(outputs[i]);
        }
      }

      // Update statistics
      this.totalProcessed += batch.length;
      this.totalBatches++;

      // Calculate and record metrics
      const processingTimeMs = Date.now() - startTime;
      this.processingTimesMs.push(processingTimeMs);

      // Keep only the last 100 processing times to avoid memory growth
      if (this.processingTimesMs.length > 100) {
        this.processingTimesMs.shift();
      }

      // Prepare metrics object for the callback
      metrics = {
        batchSize: batch.length,
        processingTimeMs,
        avgItemTimeMs: processingTimeMs / batch.length,
        batch: inputs,
        success: true,
      };
    } catch (error) {
      // Update error statistics
      this.totalErrors++;

      // Convert generic errors to BatchedQueueError
      const queueError =
        error instanceof BatchedQueueError
          ? error
          : new BatchProcessingError(
              error instanceof Error ? error.message : String(error),
              error instanceof Error ? error : new Error(String(error)),
            );

      // Reject all promises in the batch with the enhanced error
      for (const { output } of batch) {
        output.reject(queueError);
      }

      // Log the error
      logger.error(`Batch processing error: ${queueError.message}`, queueError);

      // Call error handler if provided
      if (this.options.onError) {
        try {
          this.options.onError(queueError, inputs);
        } catch (handlerError) {
          // Log errors from the error handler
          logger.error("Error in batch error handler:", handlerError);
        }
      }

      // Prepare metrics object for failed processing
      metrics = {
        batchSize: batch.length,
        processingTimeMs: Date.now() - startTime,
        avgItemTimeMs: (Date.now() - startTime) / batch.length,
        batch: inputs,
        success: false,
      };
    } finally {
      this.activeBatches -= 1;

      // Report metrics if handler is provided
      if (metrics && this.options.onMetrics) {
        try {
          this.options.onMetrics(metrics);
        } catch (metricsError) {
          // Ignore errors from the metrics handler
          logger.error("Error in batch metrics handler:", metricsError);
        }
      }

      // If there are more tasks, schedule another flush
      if (this.tasks.length > 0) {
        // If we have tasks and have capacity, process immediately
        if (this.activeBatches < this.options.maxParallel) {
          logger.debug(
            `Processing next batch immediately, ${this.tasks.length} tasks left`,
          );
          this.state = BatchState.PROCESSING;
          // Use setTimeout with 0 delay to allow other events to process
          setTimeout(() => this.flush(), 0);
        }
        // Otherwise, if we're not in batching state, start a new batch
        else if (this.state !== BatchState.BATCHING && !this.flushTimeoutId) {
          logger.debug(
            `Scheduling next batch in ${this.options.delayMs}ms, ${this.tasks.length} tasks left`,
          );
          this.state = BatchState.BATCHING;
          this.flushTimeoutId = setTimeout(() => {
            this.state = BatchState.PROCESSING;
            this.flushTimeoutId = null;
            this.flush();
          }, this.options.delayMs);
        }
      } else {
        logger.debug("No more tasks, returning to idle state");
        // No more tasks, return to idle state
        this.state = BatchState.IDLE;
      }
    }
  };
}
