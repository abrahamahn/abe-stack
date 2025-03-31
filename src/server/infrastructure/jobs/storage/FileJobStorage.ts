import path from "path";

import { injectable, inject } from "inversify";

import { TYPES } from "@/server/infrastructure/di/types";
import {
  IJobStorage,
  JobData,
  JobStatus,
  JobResult,
  JobType,
} from "@/server/infrastructure/jobs";
import type { ILoggerService } from "@/server/infrastructure/logging";
import type { IStorageService } from "@/server/infrastructure/storage";

interface DependencyStatus {
  resolved: boolean;
  reason?: string;
  dependencies: Array<{
    jobId: string;
    status: JobStatus;
    success?: boolean;
  }>;
}

/**
 * Configuration for file job storage
 */
export interface FileJobStorageConfig {
  /**
   * Base path for storing job files
   */
  basePath: string;

  /**
   * Time in ms to retain completed jobs
   */
  completedJobRetention?: number;

  /**
   * Time in ms to retain failed jobs
   */
  failedJobRetention?: number;
}

/**
 * Simple file-based job storage implementation using StorageService
 */
@injectable()
export class FileJobStorage implements IJobStorage {
  private basePath: string;
  private initialized = false;
  private completedJobRetention: number;
  private failedJobRetention: number;
  private cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Helper method to normalize path for display purposes
   * @param pathToNormalize Path to be normalized with forward slashes
   */
  private normalizePath(pathToNormalize: string): string {
    return pathToNormalize.replace(/\\/g, "/");
  }

  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService,
    @inject(TYPES.StorageService) private storageService: IStorageService,
    @inject(TYPES.JobStorageConfig)
    {
      basePath,
      completedJobRetention,
      failedJobRetention,
    }: FileJobStorageConfig,
  ) {
    this.basePath = basePath;
    this.completedJobRetention = completedJobRetention || 24 * 60 * 60 * 1000; // 24 hours
    this.failedJobRetention = failedJobRetention || 7 * 24 * 60 * 60 * 1000; // 7 days
  }

  /**
   * Initialize storage
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ensure base directory exists
      await this.storageService.createDirectory(this.basePath);

      // Create directories for each status
      const statuses: JobStatus[] = [
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
      ];
      for (const status of statuses) {
        await this.storageService.createDirectory(
          path.join(this.basePath, status),
        );
      }

      // Start cleanup interval (every hour)
      this.startCleanupInterval();

      this.initialized = true;

      this.logger.info("Job storage initialized", {
        path: this.normalizePath(this.basePath),
      });
    } catch (error) {
      this.logger.error("Failed to initialize job storage", { error });
      throw error;
    }
  }

  /**
   * Get file path for a job
   */
  private getJobFilePath(type: JobType, id: string, status: JobStatus): string {
    return path.join(this.basePath, status, `${type}_${id}.json`);
  }

  /**
   * Save a job
   */
  async saveJob<T>(job: JobData<T>): Promise<void> {
    await this.ensureInitialized();

    const filePath = this.getJobFilePath(job.type, job.id, job.status);

    try {
      const data = Buffer.from(JSON.stringify(job), "utf8");
      await this.storageService.saveFile(filePath, data);
    } catch (error) {
      this.logger.error("Failed to save job", {
        jobId: job.id,
        jobType: job.type,
        error,
      });
      throw error;
    }
  }

  /**
   * Get a job by ID
   */
  async getJob<T>(type: JobType, id: string): Promise<JobData<T> | null> {
    await this.ensureInitialized();

    // Try to find the job in any status directory
    const statuses: JobStatus[] = [
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed",
    ];

    for (const status of statuses) {
      const filePath = this.getJobFilePath(type, id, status);

      try {
        if (await this.storageService.fileExists(filePath)) {
          const data = await this.storageService.getFile(filePath);
          return JSON.parse(data.toString("utf8")) as JobData<T>;
        }
      } catch (_error) {
        // File not found in this status, continue to next
      }
    }

    return null;
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    type: JobType,
    id: string,
    newStatus: JobStatus,
    result?: JobResult,
  ): Promise<void> {
    await this.ensureInitialized();

    // First find the job in any status
    const job = await this.getJob(type, id);

    if (!job) {
      throw new Error(`Job not found: ${type} ${id}`);
    }

    // Delete from old status file
    const oldPath = this.getJobFilePath(type, id, job.status);

    try {
      await this.storageService.deleteFile(oldPath);
    } catch (_error) {
      // Ignore errors if file doesn't exist
    }

    // Update job
    job.status = newStatus;
    job.updatedAt = new Date();

    if (result) {
      job.result = result;
    }

    // Save to new location
    await this.saveJob(job);
  }

  /**
   * Get jobs by status
   */
  async getJobsByStatus<T>(
    type: JobType,
    status: JobStatus,
    limit = 100,
  ): Promise<JobData<T>[]> {
    await this.ensureInitialized();

    const statusDir = path.join(this.basePath, status);
    const prefix = `${type}_`;

    try {
      const files = await this.storageService.listFiles(statusDir, prefix);
      const matchingFiles = files
        .filter((file) => file.endsWith(".json"))
        .slice(0, limit);

      const jobs: JobData<T>[] = [];

      for (const file of matchingFiles) {
        const filePath = path.join(statusDir, file);
        try {
          const data = await this.storageService.getFile(filePath);
          jobs.push(JSON.parse(data.toString("utf8")));
        } catch (error) {
          this.logger.warn("Error reading job file", { file, error });
        }
      }

      return jobs;
    } catch (error) {
      this.logger.error("Failed to get jobs by status", {
        type,
        status,
        error,
      });
      return [];
    }
  }

  /**
   * Delete a job
   */
  async deleteJob(type: JobType, id: string): Promise<boolean> {
    await this.ensureInitialized();

    const job = await this.getJob(type, id);

    if (!job) {
      return false;
    }

    const filePath = path.join(
      this.basePath,
      this.getJobFilePath(type, id, job.status),
    );

    try {
      return await this.storageService.deleteFile(filePath);
    } catch (error) {
      this.logger.error("Failed to delete job", {
        jobId: id,
        jobType: type,
        error,
      });
      return false;
    }
  }

  /**
   * Get job counts
   */
  async getJobCounts(type: JobType): Promise<Record<JobStatus, number>> {
    await this.ensureInitialized();

    const statuses: JobStatus[] = [
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed",
    ];
    const counts: Record<JobStatus, number> = {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      blocked: 0,
    };

    for (const status of statuses) {
      const statusDir = path.join(this.basePath, status);
      const prefix = `${type}_`;

      try {
        const files = await this.storageService.listFiles(statusDir, prefix);
        counts[status] = files.filter((file) => file.endsWith(".json")).length;
      } catch (_error) {
        // Ignore errors if directory doesn't exist
      }
    }

    return counts;
  }

  /**
   * Clean up old jobs
   */
  async cleanup(type?: JobType, olderThan?: Date): Promise<number> {
    await this.ensureInitialized();

    let count = 0;

    // Clean completed jobs
    const completedDir = path.join(this.basePath, "completed");
    count += await this.cleanupDirectory(
      completedDir,
      type,
      olderThan || new Date(Date.now() - this.completedJobRetention),
    );

    // Clean failed jobs
    const failedDir = path.join(this.basePath, "failed");
    count += await this.cleanupDirectory(
      failedDir,
      type,
      olderThan || new Date(Date.now() - this.failedJobRetention),
    );

    return count;
  }

  /**
   * Clean a specific directory
   */
  private async cleanupDirectory(
    dir: string,
    type?: JobType,
    olderThan?: Date,
  ): Promise<number> {
    try {
      const prefix = type ? `${type}_` : "";
      const files = await this.storageService.listFiles(dir, prefix);
      let deleteCount = 0;

      for (const file of files) {
        // Skip if not a JSON file
        if (!file.endsWith(".json")) continue;

        const filePath = path.join(dir, file);

        try {
          // Get file data to check the updatedAt date
          const data = await this.storageService.getFile(filePath);
          const job = JSON.parse(data.toString("utf8")) as JobData<unknown>;

          // Delete if older than cutoff date
          if (olderThan && new Date(job.updatedAt) < olderThan) {
            await this.storageService.deleteFile(filePath);
            deleteCount++;
          }
        } catch (_error) {
          // Ignore errors for individual files
        }
      }

      return deleteCount;
    } catch (error) {
      this.logger.warn("Error cleaning up directory", { dir, error });
      return 0;
    }
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Run cleanup every hour
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup().catch((error) => {
          this.logger.error("Job cleanup error", { error });
        });
      },
      60 * 60 * 1000,
    );
  }

  /**
   * Ensure storage is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Close storage
   */
  async close(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  async getJobsByStatusPrioritized<T>(
    type: JobType,
    status: JobStatus,
    limit = 100,
  ): Promise<JobData<T>[]> {
    const jobs = await this.getJobsByStatus<T>(type, status, limit);
    return jobs.sort((a, b) => b.priority - a.priority);
  }

  async checkDependencies(
    type: JobType,
    jobId: string,
  ): Promise<DependencyStatus> {
    const job = await this.getJob(type, jobId);
    if (!job?.dependencies) {
      return { resolved: true, dependencies: [] };
    }

    const dependencies: DependencyStatus["dependencies"] = [];
    let allResolved = true;

    for (const depId of job.dependencies.jobIds) {
      const depJob = await this.getJob(type, depId);
      if (!depJob) {
        allResolved = false;
        dependencies.push({ jobId: depId, status: "failed" });
        continue;
      }

      const success = depJob.status === "completed" && depJob.result?.success;
      dependencies.push({
        jobId: depId,
        status: depJob.status,
        success,
      });

      if (!success) {
        allResolved = false;
      }
    }

    return {
      resolved: allResolved,
      reason: allResolved
        ? undefined
        : "Some dependencies are not completed or failed",
      dependencies,
    };
  }

  async findDependentJobs<T>(jobId: string): Promise<JobData<T>[]> {
    const allJobs: JobData<T>[] = [];
    const statuses: JobStatus[] = [
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed",
      "blocked",
    ];

    // Get all jobs across all types and statuses
    for (const status of statuses) {
      // Use a wildcard/empty prefix to get all job types in this status
      const statusDir = path.join(this.basePath, status);
      try {
        const files = await this.storageService.listFiles(statusDir, "");
        const matchingFiles = files.filter((file) => file.endsWith(".json"));

        for (const file of matchingFiles) {
          const filePath = path.join(statusDir, file);
          try {
            const data = await this.storageService.getFile(filePath);
            const job = JSON.parse(data.toString("utf8")) as JobData<T>;
            allJobs.push(job);
          } catch (error) {
            this.logger.warn("Error reading job file", { file, error });
          }
        }
      } catch (_error) {
        // Ignore errors if directory doesn't exist
      }
    }

    return allJobs.filter((job) => job.dependencies?.jobIds.includes(jobId));
  }
}
