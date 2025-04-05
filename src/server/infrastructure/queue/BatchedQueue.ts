import { DeferredPromise } from "@infrastructure/promises";

type Task<I, O> = {
  input: I;
  output: DeferredPromise<O | undefined>;
};

/** A useful tool for batching computation and working in parallel. */
export class BatchedQueue<I, O> {
  constructor(
    private args: {
      processBatch: (batch: I[]) => Promise<O[]>;
      maxParallel: number;
      maxBatchSize: number;
      delayMs: number;
    },
  ) {}

  private tasks: Task<I, O>[] = [];
  private flushTimeoutId: NodeJS.Timeout | null = null;
  private activeBatches = 0;
  private isProcessingScheduled = false;

  /**
   * Get the number of active batches (for testing purposes)
   */
  public getActiveBatches(): number {
    return this.activeBatches;
  }

  public enqueue(input: I): Promise<O | undefined> {
    const output = new DeferredPromise<O | undefined>();
    this.tasks.push({ input, output });

    // Cancel any existing timeout - we'll create a new one
    if (this.flushTimeoutId) {
      clearTimeout(this.flushTimeoutId);
      this.flushTimeoutId = null;
    }

    // If we should process immediately (no active batches and no scheduled processing)
    const shouldProcessImmediately =
      this.activeBatches === 0 && !this.isProcessingScheduled;

    // Schedule processing after the delay
    this.flushTimeoutId = setTimeout(() => this.flush(), this.args.delayMs);
    this.isProcessingScheduled = true;

    // If there are no active batches, process immediately
    if (shouldProcessImmediately) {
      clearTimeout(this.flushTimeoutId);
      this.flushTimeoutId = null;
      this.flush();
    }

    return output.promise;
  }

  private flush = async (): Promise<void> => {
    this.isProcessingScheduled = false;

    // If there are no tasks or we've reached max parallel batches, do nothing
    if (this.tasks.length === 0) return;
    if (this.activeBatches >= this.args.maxParallel) return;

    this.activeBatches += 1;

    // Take only maxBatchSize items from the queue
    const batch = this.tasks.splice(0, this.args.maxBatchSize);
    const inputs = batch.map((task) => task.input);

    try {
      const outputs = await this.args.processBatch(inputs);

      // Resolve promises with outputs
      for (let i = 0; i < batch.length; i++) {
        if (i < outputs.length) {
          batch[i].output.resolve(outputs[i]);
        } else {
          // If processBatch returns fewer items than inputs
          batch[i].output.resolve(undefined);
        }
      }
    } catch (error) {
      // Reject all promises in the batch if there's an error
      for (const { output } of batch) {
        output.reject(error);
      }
    } finally {
      this.activeBatches -= 1;

      // If there are more tasks, schedule another flush
      if (this.tasks.length > 0 && !this.isProcessingScheduled) {
        // Try to process immediately if possible
        this.flush();
      }
    }
  };
}
