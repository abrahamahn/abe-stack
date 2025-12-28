import { injectable } from "inversify";

import type { Job, JobResult } from "@infrastructure/jobs/JobQueue";
import { JobType } from "@infrastructure/jobs/JobTypes";
import type { ILoggerService } from "@infrastructure/logging";

/**
 * Base job processor class that provides common functionality for all job processors.
 * Job processors are responsible for:
 * 1. Processing jobs from the queue
 * 2. Handling retries and failures
 * 3. Reporting job results
 */
@injectable()
export abstract class BaseJobProcessor<T extends JobType> {
  /**
   * The type of job this processor handles
   */
  protected abstract jobType: T;

  /**
   * Logger instance for this processor
   */
  protected abstract logger: ILoggerService;

  /**
   * Constructor
   * @param loggerService Logger service
   */
  constructor(protected loggerService: ILoggerService) {}

  /**
   * Process a job
   * @param job The job to process
   */
  public async process(job: Job<any>): Promise<JobResult> {
    try {
      this.logger.debug(`Processing job ${job.id}`, {
        jobType: this.jobType,
        jobId: job.id,
      });

      const startTime = Date.now();
      const result = await this.processJob(job);
      const duration = Date.now() - startTime;

      this.logger.info(`Job ${job.id} completed in ${duration}ms`, {
        jobType: this.jobType,
        jobId: job.id,
        duration,
      });

      return {
        success: true,
        duration,
        ...result,
      };
    } catch (error) {
      this.logger.error(`Job ${job.id} failed`, {
        jobType: this.jobType,
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };
    }
  }

  /**
   * Process the job (to be implemented by subclasses)
   * @param job The job to process
   */
  protected abstract processJob(job: Job<any>): Promise<Partial<JobResult>>;
}