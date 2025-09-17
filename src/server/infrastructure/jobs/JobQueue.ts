import { JobType, JobOptions } from "./JobTypes";

/**
 * Represents a job in the queue
 */
export interface Job<T> {
  /**
   * Unique job ID
   */
  id: string;

  /**
   * Job type
   */
  type: JobType;

  /**
   * Job data
   */
  data: T;

  /**
   * Job options
   */
  options?: JobOptions;

  /**
   * Timestamp when the job was created
   */
  createdAt: Date;

  /**
   * Number of attempts made
   */
  attempts: number;
}

/**
 * Standard job result interface
 */
export interface JobResult {
  /**
   * Whether the job was successful
   */
  success: boolean;

  /**
   * Error message if failed
   */
  error?: string;

  /**
   * Stack trace if failed
   */
  stack?: string;

  /**
   * Processing duration in milliseconds
   */
  duration?: number;

  /**
   * Result data
   */
  data?: unknown;
}
