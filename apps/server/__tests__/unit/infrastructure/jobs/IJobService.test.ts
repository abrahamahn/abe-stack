import { describe, it, expect, beforeEach, vi, Mock } from "vitest";

import {
  JobProcessor,
  JobStats,
} from "@/server/infrastructure/jobs/IJobService";
import { JobType } from "@/server/infrastructure/jobs/JobTypes";
import { JobStatus } from "@/server/infrastructure/jobs/storage/IJobStorage";

describe("IJobService", () => {
  let mockJobService: {
    initialize: Mock;
    addJob: Mock;
    registerProcessor: Mock;
    pauseQueue: Mock;
    resumeQueue: Mock;
    getStats: Mock;
    checkDependencies: Mock;
    chainJob: Mock;
    getJobStatus: Mock;
    shutdown: Mock;
  };

  beforeEach(() => {
    mockJobService = {
      initialize: vi.fn(),
      addJob: vi.fn(),
      registerProcessor: vi.fn(),
      pauseQueue: vi.fn(),
      resumeQueue: vi.fn(),
      getStats: vi.fn(),
      checkDependencies: vi.fn(),
      chainJob: vi.fn(),
      getJobStatus: vi.fn(),
      shutdown: vi.fn(),
    };
  });

  describe("lifecycle methods", () => {
    it("should initialize the service", async () => {
      await mockJobService.initialize();
      expect(mockJobService.initialize).toHaveBeenCalled();
    });

    it("should shutdown the service", async () => {
      await mockJobService.shutdown();
      expect(mockJobService.shutdown).toHaveBeenCalled();
    });
  });

  describe("job management", () => {
    it("should add a job with data", async () => {
      const jobData = { imageId: "img123" };
      const jobId = "job123";
      mockJobService.addJob.mockResolvedValue(jobId);

      const result = await mockJobService.addJob(
        JobType.MEDIA_PROCESSING,
        jobData,
      );
      expect(result).toBe(jobId);
      expect(mockJobService.addJob).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        jobData,
      );
    });

    it("should add a job with options", async () => {
      const jobData = { imageId: "img123" };
      const options = { priority: 1, attempts: 3 };
      const jobId = "job123";
      mockJobService.addJob.mockResolvedValue(jobId);

      const result = await mockJobService.addJob(
        JobType.MEDIA_PROCESSING,
        jobData,
        options,
      );
      expect(result).toBe(jobId);
      expect(mockJobService.addJob).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        jobData,
        options,
      );
    });

    it("should register a job processor", () => {
      const processor: JobProcessor<unknown> = async () => {};
      mockJobService.registerProcessor(JobType.MEDIA_PROCESSING, processor);
      expect(mockJobService.registerProcessor).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        processor,
      );
    });

    it("should get job status", async () => {
      const status = {
        status: "waiting" as JobStatus,
        data: { imageId: "img123" },
      };
      mockJobService.getJobStatus.mockResolvedValue(status);

      const result = await mockJobService.getJobStatus(
        JobType.MEDIA_PROCESSING,
        "job123",
      );
      expect(result).toEqual(status);
      expect(mockJobService.getJobStatus).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        "job123",
      );
    });
  });

  describe("queue management", () => {
    it("should pause a queue", async () => {
      await mockJobService.pauseQueue(JobType.MEDIA_PROCESSING);
      expect(mockJobService.pauseQueue).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
      );
    });

    it("should resume a queue", async () => {
      await mockJobService.resumeQueue(JobType.MEDIA_PROCESSING);
      expect(mockJobService.resumeQueue).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
      );
    });

    it("should get queue statistics", async () => {
      const stats: JobStats = {
        waiting: 1,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        blocked: 0,
        priorityBreakdown: {},
        performance: {
          averageProcessingTime: 100,
          successRate: 95,
          jobsWithRetries: 5,
          averageWaitTime: 50,
        },
      };

      mockJobService.getStats.mockResolvedValue(stats);
      const result = await mockJobService.getStats(JobType.MEDIA_PROCESSING);
      expect(result).toEqual(stats);
      expect(mockJobService.getStats).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
      );
    });
  });

  describe("job dependencies", () => {
    it("should check job dependencies", async () => {
      const dependencyStatus = {
        resolved: true,
        dependencies: [{ jobId: "dep1", status: "completed", success: true }],
      };

      mockJobService.checkDependencies.mockResolvedValue(dependencyStatus);
      const result = await mockJobService.checkDependencies(
        JobType.MEDIA_PROCESSING,
        "job123",
      );
      expect(result).toEqual(dependencyStatus);
      expect(mockJobService.checkDependencies).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        "job123",
      );
    });

    it("should chain dependent jobs", async () => {
      const jobData = { imageId: "img123" };
      const dependentJobId = "job456";
      mockJobService.chainJob.mockResolvedValue(dependentJobId);

      const result = await mockJobService.chainJob(
        JobType.MEDIA_PROCESSING,
        jobData,
        "job123",
      );
      expect(result).toBe(dependentJobId);
      expect(mockJobService.chainJob).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        jobData,
        "job123",
      );
    });

    it("should chain dependent jobs with options", async () => {
      const jobData = { imageId: "img123" };
      const options = { priority: 1 };
      const dependentJobId = "job456";
      mockJobService.chainJob.mockResolvedValue(dependentJobId);

      const result = await mockJobService.chainJob(
        JobType.MEDIA_PROCESSING,
        jobData,
        "job123",
        options,
      );
      expect(result).toBe(dependentJobId);
      expect(mockJobService.chainJob).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        jobData,
        "job123",
        options,
      );
    });
  });

  describe("error handling", () => {
    it("should handle initialization errors", async () => {
      const error = new Error("Initialization failed");
      mockJobService.initialize.mockRejectedValue(error);
      await expect(mockJobService.initialize()).rejects.toThrow(error);
    });

    it("should handle job addition errors", async () => {
      const error = new Error("Failed to add job");
      mockJobService.addJob.mockRejectedValue(error);
      await expect(
        mockJobService.addJob(JobType.MEDIA_PROCESSING, {}),
      ).rejects.toThrow(error);
    });

    it("should handle shutdown errors", async () => {
      const error = new Error("Shutdown failed");
      mockJobService.shutdown.mockRejectedValue(error);
      await expect(mockJobService.shutdown()).rejects.toThrow(error);
    });
  });
});
