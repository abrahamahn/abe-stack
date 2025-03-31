import {
  JobResult,
  JobType,
  DependencyResolutionStrategy,
} from "@/server/infrastructure/jobs";

/**
 * Job data structure
 */
export interface JobData<T = unknown> {
  id: string;
  type: JobType;
  data: T;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  scheduledFor?: Date;
  result?: JobResult;

  /**
   * Dependencies configuration
   */
  dependencies?: {
    /**
     * IDs of jobs this job depends on
     */
    jobIds: string[];

    /**
     * How to handle dependency failures
     */
    strategy: DependencyResolutionStrategy;
  };

  /**
   * Optional metadata for tracking and custom logic
   */
  metadata?: Record<string, unknown>;
}

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
    status: JobStatus;
    success?: boolean;
  }>;
}

/**
 * Possible job status values
 */
export type JobStatus =
  | "waiting"
  | "active"
  | "completed"
  | "failed"
  | "delayed"
  | "blocked"; // Added for jobs waiting on dependencies

/**
 * Job storage interface
 */
export interface IJobStorage {
  /**
   * Initialize the storage
   */
  initialize(): Promise<void>;

  /**
   * Save a job
   */
  saveJob<T>(job: JobData<T>): Promise<void>;

  /**
   * Get a job by ID
   */
  getJob<T>(type: JobType, id: string): Promise<JobData<T> | null>;

  /**
   * Update a job's status
   */
  updateJobStatus(
    type: JobType,
    id: string,
    status: JobStatus,
    result?: JobResult,
  ): Promise<void>;

  /**
   * Get jobs by status
   */
  getJobsByStatus<T>(
    type: JobType,
    status: JobStatus,
    limit?: number,
  ): Promise<JobData<T>[]>;

  /**
   * Get jobs by status ordered by priority
   */
  getJobsByStatusPrioritized<T>(
    type: JobType,
    status: JobStatus,
    limit?: number,
  ): Promise<JobData<T>[]>;

  /**
   * Check if a job's dependencies are resolved
   */
  checkDependencies(type: JobType, jobId: string): Promise<DependencyStatus>;

  /**
   * Find jobs that depend on the given job
   */
  findDependentJobs<T>(jobId: string): Promise<JobData<T>[]>;

  /**
   * Delete a job
   */
  deleteJob(type: JobType, id: string): Promise<boolean>;

  /**
   * Get job counts by status
   */
  getJobCounts(type: JobType): Promise<Record<JobStatus, number>>;

  /**
   * Clean up old jobs
   */
  cleanup(type?: JobType, olderThan?: Date): Promise<number>;

  /**
   * Close storage
   */
  close(): Promise<void>;
}
