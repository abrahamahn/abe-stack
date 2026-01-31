// infra/media/src/queue/queue.ts
/**
 * Custom In-Memory Job Queue
 *
 * Lightweight job queue implementation providing basic queuing, retry logic,
 * concurrency control, and automatic cleanup of completed/failed jobs.
 * Replaces BullMQ to keep dependencies minimal.
 *
 * @module queue/queue
 */

import type { Logger } from '@abe-stack/core';

/**
 * Serialized job data with metadata for tracking and retry
 *
 * @typeParam T - The shape of the job's payload data
 */
export interface JobData<T = unknown> {
  id: string;
  data: T;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  failedAt?: number;
  error?: string;
  nextRetryAt?: number;
}

/**
 * Configuration options for the job queue
 */
export interface QueueOptions {
  /** Maximum number of jobs to process concurrently */
  concurrency?: number;
  /** Base delay in milliseconds between retry attempts */
  retryDelayMs?: number;
  /** Maximum number of retry attempts per job */
  maxRetries?: number;
  /** Time in ms to keep completed/failed jobs before cleanup (default: 1 hour) */
  jobRetentionMs?: number;
  /** Maximum number of jobs to keep in the jobs Map (default: 10000) */
  maxJobsSize?: number;
  /** Logger instance for structured logging */
  logger: Logger;
}

/**
 * Resolved queue options with all defaults applied
 */
interface RequiredQueueOptions {
  concurrency: number;
  retryDelayMs: number;
  maxRetries: number;
  jobRetentionMs: number;
  maxJobsSize: number;
  logger: Logger;
}

/**
 * In-memory job queue with concurrency control, priority ordering,
 * exponential backoff retry, and automatic cleanup.
 *
 * Subclass this and override `processJobData` to implement custom job processing.
 *
 * @typeParam T - The shape of the job's payload data
 *
 * @example
 * ```typescript
 * class MyQueue extends CustomJobQueue<{ taskId: string }> {
 *   protected override async processJobData(data: { taskId: string }): Promise<void> {
 *     // Process the job
 *   }
 * }
 * ```
 *
 * @complexity
 * - add: O(n log n) due to priority sort
 * - processQueue: O(1) per iteration
 * - cleanupJobs: O(n) where n is total jobs
 */
export class CustomJobQueue<T = unknown> {
  private jobs: Map<string, JobData<T>> = new Map();
  private waitingQueue: JobData<T>[] = [];
  private activeJobs: Set<string> = new Set();
  private running = false;
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;
  protected options: RequiredQueueOptions;

  /**
   * Create a new job queue
   *
   * @param options - Queue configuration options
   */
  constructor(options: QueueOptions) {
    this.options = {
      concurrency: 3,
      retryDelayMs: 1000,
      maxRetries: 3,
      jobRetentionMs: 60 * 60 * 1000, // 1 hour
      maxJobsSize: 10000,
      ...options,
    };
  }

  /**
   * Add a job to the queue. Jobs are sorted by priority (higher first).
   *
   * @param jobId - Unique identifier for the job
   * @param data - Job payload data
   * @param options - Optional priority and delay configuration
   * @returns The job ID
   * @complexity O(n log n) due to priority sort
   */
  add(
    jobId: string,
    data: T,
    options: { priority?: number; delay?: number } = {},
  ): Promise<string> {
    const job: JobData<T> = {
      id: jobId,
      data,
      priority: options.priority ?? 0,
      attempts: 0,
      maxAttempts: this.options.maxRetries,
      createdAt: Date.now(),
    };

    if (options.delay !== undefined && options.delay > 0) {
      job.nextRetryAt = Date.now() + options.delay;
    }

    this.jobs.set(jobId, job);
    this.waitingQueue.push(job);

    // Sort by priority (higher priority first)
    this.waitingQueue.sort((a, b) => b.priority - a.priority);

    this.options.logger.info('Job added to queue', { jobId, priority: job.priority });

    return Promise.resolve(jobId);
  }

  /**
   * Start processing jobs from the queue
   *
   * @returns Resolves immediately; processing continues in background
   */
  start(): Promise<void> {
    if (this.running) return Promise.resolve();
    this.running = true;

    this.options.logger.info('Job queue started', {
      concurrency: this.options.concurrency,
      waitingJobs: this.waitingQueue.length,
    });

    this.startCleanupInterval();
    void this.processQueue();
    return Promise.resolve();
  }

  /**
   * Stop processing jobs
   *
   * @returns Resolves immediately; active jobs may still be completing
   */
  stop(): Promise<void> {
    this.running = false;
    this.stopCleanupInterval();
    this.options.logger.info('Job queue stopped');
    return Promise.resolve();
  }

  /**
   * Main processing loop. Polls for available jobs respecting concurrency limits.
   */
  private async processQueue(): Promise<void> {
    while (this.running) {
      // Check if we can process more jobs
      if (this.activeJobs.size >= this.options.concurrency) {
        await this.sleep(100);
        continue;
      }

      // Find next job to process
      const job = this.getNextJob();
      if (job === null) {
        await this.sleep(500);
        continue;
      }

      // Process the job (non-blocking)
      void this.processJob(job);
    }
  }

  /**
   * Get the next eligible job from the waiting queue, skipping delayed jobs.
   *
   * @returns The next job to process, or null if none available
   * @complexity O(n) in worst case scanning delayed jobs
   */
  private getNextJob(): JobData<T> | null {
    const now = Date.now();

    for (let i = 0; i < this.waitingQueue.length; i++) {
      const job = this.waitingQueue[i];
      if (job === undefined) {
        continue;
      }

      // Check if job is delayed
      if (job.nextRetryAt !== undefined && job.nextRetryAt > now) {
        continue;
      }

      // Remove from waiting queue
      this.waitingQueue.splice(i, 1);
      return job;
    }

    return null;
  }

  /**
   * Process a single job with retry logic on failure.
   * Uses exponential backoff: delay * 2^(attempt-1)
   *
   * @param job - The job to process
   */
  private async processJob(job: JobData<T>): Promise<void> {
    if (this.activeJobs.has(job.id)) return;

    this.activeJobs.add(job.id);
    job.startedAt = Date.now();
    job.attempts++;

    try {
      this.options.logger.info('Processing job', {
        jobId: job.id,
        attempt: job.attempts,
        maxAttempts: job.maxAttempts,
      });

      await this.processJobData(job.data);

      // Mark as completed
      job.completedAt = Date.now();
      this.options.logger.info('Job completed successfully', {
        jobId: job.id,
        duration: job.completedAt - (job.startedAt ?? 0),
      });
    } catch (error) {
      this.options.logger.error('Job failed', {
        jobId: job.id,
        attempt: job.attempts,
        error: error instanceof Error ? error.message : String(error),
      });

      // Handle retry logic with exponential backoff
      if (job.attempts < job.maxAttempts) {
        job.nextRetryAt = Date.now() + this.options.retryDelayMs * Math.pow(2, job.attempts - 1);
        this.waitingQueue.push(job);
        this.options.logger.info('Job scheduled for retry', {
          jobId: job.id,
          nextRetryAt: new Date(job.nextRetryAt).toISOString(),
        });
      } else {
        job.failedAt = Date.now();
        job.error = error instanceof Error ? error.message : String(error);
        this.options.logger.error('Job permanently failed', {
          jobId: job.id,
          finalError: job.error,
        });
      }
    } finally {
      this.activeJobs.delete(job.id);
    }
  }

  /**
   * Process job data. Override in subclasses to implement actual job processing.
   *
   * @param _data - The job payload data
   * @throws Error by default -- must be overridden
   */
  protected processJobData(_data: T): Promise<void> {
    return Promise.reject(new Error('processJobData must be implemented by subclass'));
  }

  /**
   * Get queue statistics including counts by state
   *
   * @returns Object with total, waiting, active, delayed, completed, and failed counts
   * @complexity O(n) where n is total jobs
   */
  getStats(): {
    total: number;
    waiting: number;
    active: number;
    delayed: number;
    completed: number;
    failed: number;
  } {
    const now = Date.now();
    const activeJobsList = Array.from(this.activeJobs)
      .map((id) => this.jobs.get(id))
      .filter((job): job is JobData<T> => job !== undefined);
    const waitingJobs = this.waitingQueue.filter(
      (job) => job.nextRetryAt === undefined || job.nextRetryAt <= now,
    );
    const delayedJobs = this.waitingQueue.filter(
      (job) => job.nextRetryAt !== undefined && job.nextRetryAt > now,
    );

    return {
      total: this.jobs.size,
      waiting: waitingJobs.length,
      active: activeJobsList.length,
      delayed: delayedJobs.length,
      completed: Array.from(this.jobs.values()).filter((job) => job.completedAt !== undefined)
        .length,
      failed: Array.from(this.jobs.values()).filter((job) => job.failedAt !== undefined).length,
    };
  }

  /**
   * Sleep utility for polling loops
   *
   * @param ms - Duration to sleep in milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Clean up completed/failed jobs that have exceeded retention time.
   * Also enforces maxJobsSize with LRU-style eviction (oldest finished first).
   *
   * @complexity O(n log n) due to sorting for eviction
   */
  private cleanupJobs(): void {
    const now = Date.now();
    const retentionMs = this.options.jobRetentionMs;
    let cleanedCount = 0;

    // Remove expired completed/failed jobs
    for (const [jobId, job] of this.jobs) {
      const finishedAt = job.completedAt ?? job.failedAt;
      if (finishedAt !== undefined && now - finishedAt > retentionMs) {
        this.jobs.delete(jobId);
        cleanedCount++;
      }
    }

    // Enforce maxJobsSize with LRU-style eviction (oldest finished jobs first)
    if (this.jobs.size > this.options.maxJobsSize) {
      const finishedJobs = Array.from(this.jobs.entries())
        .filter(([, job]) => job.completedAt !== undefined || job.failedAt !== undefined)
        .sort(([, a], [, b]) => {
          const aTime = a.completedAt ?? a.failedAt ?? 0;
          const bTime = b.completedAt ?? b.failedAt ?? 0;
          return aTime - bTime;
        });

      const toRemove = this.jobs.size - this.options.maxJobsSize;
      for (let i = 0; i < toRemove && i < finishedJobs.length; i++) {
        const entry = finishedJobs[i];
        if (entry !== undefined) {
          this.jobs.delete(entry[0]);
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      this.options.logger.debug('Cleaned up old jobs', {
        removedCount: cleanedCount,
        remainingJobs: this.jobs.size,
      });
    }
  }

  /**
   * Start the periodic cleanup interval (every 5 minutes)
   */
  private startCleanupInterval(): void {
    const cleanupIntervalMs = 5 * 60 * 1000;
    this.cleanupIntervalId = setInterval(() => {
      this.cleanupJobs();
    }, cleanupIntervalMs);

    // Run initial cleanup
    this.cleanupJobs();
  }

  /**
   * Stop the cleanup interval and release the timer
   */
  private stopCleanupInterval(): void {
    if (this.cleanupIntervalId !== null) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }
}
