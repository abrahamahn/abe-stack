import { JobType, JobOptions } from "@/server/infrastructure/jobs";

/**
 * Dependency status result
 */
export interface DependencyStatus {
  /**
   * Whether all dependencies are resolved
   */
  resolved: boolean;

  /**
   * Reason if not resolved
   */
  reason?: string;

  /**
   * Status of each dependency
   */
  dependencies: Array<{
    jobId: string;
    status: string;
    success?: boolean;
  }>;
}

/**
 * Standard job result interface
 */
export interface JobResult {
  success: boolean;
  error?: string;
  data?: unknown;
}

/**
 * Job processor function type
 */
export type JobProcessor<T> = (data: T) => Promise<void>;

/**
 * Enhanced job statistics
 */
export interface JobStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  blocked: number; // Jobs waiting on dependencies

  /**
   * Number of jobs by priority level
   */
  priorityBreakdown: Record<string, number>;

  /**
   * Performance metrics for this job type
   */
  performance?: {
    /**
     * Average processing time in milliseconds
     */
    averageProcessingTime: number;

    /**
     * Success rate (percent of jobs that succeeded)
     */
    successRate: number;

    /**
     * Number of jobs that required retries
     */
    jobsWithRetries: number;

    /**
     * Average wait time before processing
     */
    averageWaitTime: number;
  };
}

/**
 * Core job service interface
 */
export interface IJobService {
  /**
   * Add a job to the queue
   * @param type The job type
   * @param data The data required for the job
   * @param options Optional job configuration
   * @returns A unique job ID
   */
  addJob<T>(type: JobType, data: T, options?: JobOptions): Promise<string>;

  /**
   * Register a processor function for a job type
   * @param type The job type
   * @param processor The function that processes jobs of this type
   */
  registerProcessor<T>(type: JobType, processor: JobProcessor<T>): void;

  /**
   * Pause processing for a specific job queue
   * @param type The job type
   */
  pauseQueue(type: JobType): Promise<void>;

  /**
   * Resume processing for a specific job queue
   * @param type The job type
   */
  resumeQueue(type: JobType): Promise<void>;

  /**
   * Get statistics for a specific job type
   * @param type The job type
   * @returns Current job statistics
   */
  getStats(type: JobType): Promise<JobStats>;

  /**
   * Check the status of a job's dependencies
   * @param jobId The job ID
   * @param type The job type
   * @returns Status of the job's dependencies
   */
  checkDependencies(type: JobType, jobId: string): Promise<DependencyStatus>;

  /**
   * Chain a new job to depend on completion of an existing job
   * @param type The job type
   * @param data The data required for the job
   * @param dependsOnJobId The ID of the job this new job depends on
   * @param options Optional job configuration
   * @returns A unique job ID
   */
  chainJob<T>(
    type: JobType,
    data: T,
    dependsOnJobId: string,
    options?: JobOptions,
  ): Promise<string>;

  /**
   * Get the current status of a job
   * @param type The job type
   * @param jobId The job ID
   * @returns The job status and result if available
   */
  getJobStatus<T>(
    type: JobType,
    jobId: string,
  ): Promise<{ status: string; result?: JobResult; data?: T } | null>;

  /**
   * Cancel a job
   * @param type The job type
   * @param jobId The job ID
   * @returns True if the job was successfully cancelled
   */
  cancelJob(type: JobType, jobId: string): Promise<boolean>;

  /**
   * Initialize the job service
   */
  initialize(): Promise<void>;

  /**
   * Gracefully shut down the job service
   */
  shutdown(): Promise<void>;
}
