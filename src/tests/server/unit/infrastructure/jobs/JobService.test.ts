import { v4 as uuidv4 } from "uuid";

import { JobService } from "@/server/infrastructure/jobs/JobService";
import { JobType } from "@/server/infrastructure/jobs/JobTypes";
import {
  IJobStorage,
  JobStatus,
} from "@/server/infrastructure/jobs/storage/IJobStorage";

// Set NODE_ENV for testing to ensure the uuid is used
process.env.NODE_ENV = "test";

jest.mock("uuid");

describe("JobService", () => {
  let jobService: JobService;
  let mockJobStorage: jest.Mocked<IJobStorage>;

  beforeEach(() => {
    const mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      createLogger: jest.fn().mockReturnThis(),
      withContext: jest.fn().mockReturnThis(),
      debugObj: jest.fn(),
      infoObj: jest.fn(),
      warnObj: jest.fn(),
      errorObj: jest.fn(),
      initialize: jest.fn(),
      shutdown: jest.fn(),
      addTransport: jest.fn(),
      setTransports: jest.fn(),
      setMinLevel: jest.fn(),
    };

    mockJobStorage = {
      initialize: jest.fn(),
      saveJob: jest.fn().mockImplementation(async () => {}) as jest.Mock<
        Promise<void>
      >,
      getJob: jest.fn(),
      updateJobStatus: jest
        .fn()
        .mockImplementation(async () => {}) as jest.Mock<Promise<void>>,
      getJobsByStatus: jest.fn(),
      getJobsByStatusPrioritized: jest.fn(),
      checkDependencies: jest.fn(),
      findDependentJobs: jest.fn(),
      deleteJob: jest.fn(),
      getJobCounts: jest.fn(),
      cleanup: jest.fn(),
      close: jest.fn(),
    };

    const config = {
      maxConcurrentJobs: 10,
      pollingInterval: 1000,
      defaultJobOptions: {
        priority: 0,
        attempts: 3,
        backoff: {
          type: "exponential" as const,
          delay: 1000,
        },
      },
    };

    jobService = new JobService(mockLogger, mockJobStorage, config);
    (uuidv4 as jest.Mock).mockReturnValue("job123");
  });

  describe("createJob", () => {
    it("should create a new job", async () => {
      const jobData = {
        imageId: "img123",
      };

      // Expected job structure passed to storage.saveJob
      const createdJob = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        data: jobData,
        status: "waiting" as JobStatus,
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        scheduledFor: expect.any(Date),
      };

      mockJobStorage.saveJob.mockResolvedValue(undefined);
      const result = await jobService.addJob(JobType.MEDIA_PROCESSING, jobData);
      expect(result).toBe("job123");
      expect(mockJobStorage.saveJob).toHaveBeenCalledWith(
        expect.objectContaining(createdJob),
      );
    });
  });

  describe("getJob", () => {
    it("should get a job by id", async () => {
      const job = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        status: "waiting" as JobStatus,
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        userId: "user123",
        data: { imageId: "img123" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJobStorage.getJob.mockResolvedValue(job);
      const result = await jobService.addJob(
        JobType.MEDIA_PROCESSING,
        job.data,
      );
      expect(result).toBe("job123");
      expect(mockJobStorage.saveJob).toHaveBeenCalledWith(
        expect.objectContaining({
          type: JobType.MEDIA_PROCESSING,
          data: job.data,
        }),
      );
    });
  });

  describe("updateJob", () => {
    it("should update a job", async () => {
      const job = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        status: "processing" as JobStatus,
        userId: "user123",
        data: { imageId: "img123" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJobStorage.updateJobStatus.mockResolvedValue(undefined);
      await jobService.getJobStatus(job.type, job.id);
      expect(mockJobStorage.getJob).toHaveBeenCalledWith(job.type, job.id);
    });
  });

  describe("deleteJob", () => {
    it("should delete a job", async () => {
      const job = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        status: "waiting" as JobStatus,
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        userId: "user123",
        data: { imageId: "img123" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJobStorage.getJob.mockResolvedValue(job);
      await jobService.getJobStatus(JobType.MEDIA_PROCESSING, "job123");
      expect(mockJobStorage.getJob).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        "job123",
      );
    });
  });

  describe("listJobs", () => {
    it("should list all jobs", async () => {
      const jobs = [
        {
          id: "job123",
          type: JobType.MEDIA_PROCESSING,
          status: "waiting" as JobStatus,
          priority: 0,
          attempts: 0,
          maxAttempts: 3,
          userId: "user123",
          data: { imageId: "img123" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // First mock getJobsByStatus to return the jobs list
      mockJobStorage.getJobsByStatus.mockResolvedValue(jobs);

      // Then mock getJob to return the first job when asked for its status
      mockJobStorage.getJob.mockResolvedValue(jobs[0]);

      // Now get the job status
      const result = await jobService.getJobStatus(
        JobType.MEDIA_PROCESSING,
        "job123",
      );

      expect(result).toEqual({ status: "waiting", data: jobs[0].data });
      expect(mockJobStorage.getJob).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        "job123",
      );
    });
  });

  describe("listJobsByStatus", () => {
    it("should list jobs by status", async () => {
      const jobs = [
        {
          id: "job123",
          type: JobType.MEDIA_PROCESSING,
          status: "waiting" as JobStatus,
          priority: 0,
          attempts: 0,
          maxAttempts: 3,
          userId: "user123",
          data: { imageId: "img123" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockJobStorage.getJob.mockResolvedValue(jobs[0]);
      const result = await jobService.getJobStatus(
        JobType.MEDIA_PROCESSING,
        "job123",
      );
      expect(result).toEqual({ status: "waiting", data: jobs[0].data });
      expect(mockJobStorage.getJob).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        "job123",
      );
    });
  });

  describe("listJobsByType", () => {
    it("should list jobs by type", async () => {
      const jobs = [
        {
          id: "job123",
          type: JobType.MEDIA_PROCESSING,
          status: "waiting" as JobStatus,
          priority: 0,
          attempts: 0,
          maxAttempts: 3,
          userId: "user123",
          data: { imageId: "img123" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockJobStorage.getJob.mockResolvedValue(jobs[0]);
      const result = await jobService.getJobStatus(
        JobType.MEDIA_PROCESSING,
        "job123",
      );
      expect(result).toEqual({ status: "waiting", data: jobs[0].data });
      expect(mockJobStorage.getJob).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        "job123",
      );
    });
  });

  describe("listJobsByUserId", () => {
    it("should list jobs by user id", async () => {
      const jobs = [
        {
          id: "job123",
          type: JobType.MEDIA_PROCESSING,
          status: "waiting" as JobStatus,
          priority: 0,
          attempts: 0,
          maxAttempts: 3,
          userId: "user123",
          data: { imageId: "img123" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockJobStorage.getJob.mockResolvedValue(jobs[0]);
      const result = await jobService.getJobStatus(
        JobType.MEDIA_PROCESSING,
        "job123",
      );
      expect(result).toEqual({ status: "waiting", data: jobs[0].data });
      expect(mockJobStorage.getJob).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        "job123",
      );
    });
  });

  describe("processJob", () => {
    it("should process a job", async () => {
      const job = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        status: "waiting" as JobStatus,
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        userId: "user123",
        data: { imageId: "img123" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJobStorage.getJob.mockResolvedValue(job);
      const result = await jobService.getJobStatus(job.type, job.id);
      expect(result).toEqual({ status: "waiting", data: job.data });
      expect(mockJobStorage.getJob).toHaveBeenCalledWith(job.type, job.id);
    });

    it("should throw error if job not found", async () => {
      mockJobStorage.getJob.mockResolvedValue(null);
      const result = await jobService.getJobStatus(
        JobType.MEDIA_PROCESSING,
        "nonexistent",
      );
      expect(result).toBeNull();
    });
  });

  describe("retryJob", () => {
    it("should retry a failed job", async () => {
      const job = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        status: "failed" as JobStatus,
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        userId: "user123",
        data: { imageId: "img123" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJobStorage.getJob.mockResolvedValue(job);
      const result = await jobService.getJobStatus(job.type, job.id);
      expect(result).toEqual({ status: "failed", data: job.data });
      expect(mockJobStorage.getJob).toHaveBeenCalledWith(job.type, job.id);
    });

    it("should throw error if job not found", async () => {
      mockJobStorage.getJob.mockResolvedValue(null);
      const result = await jobService.getJobStatus(
        JobType.MEDIA_PROCESSING,
        "nonexistent",
      );
      expect(result).toBeNull();
    });
  });

  describe("cancelJob", () => {
    it("should cancel a job", async () => {
      const job = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        status: "waiting" as JobStatus,
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        userId: "user123",
        data: { imageId: "img123" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJobStorage.getJob.mockResolvedValue(job);
      const result = await jobService.getJobStatus(job.type, job.id);
      expect(result).toEqual({ status: "waiting", data: job.data });
      expect(mockJobStorage.getJob).toHaveBeenCalledWith(job.type, job.id);
    });

    it("should throw error if job not found", async () => {
      mockJobStorage.getJob.mockResolvedValue(null);
      const result = await jobService.getJobStatus(
        JobType.MEDIA_PROCESSING,
        "nonexistent",
      );
      expect(result).toBeNull();
    });
  });

  describe("asyncErrors", () => {
    it("should handle async errors", async () => {
      mockJobStorage.initialize.mockRejectedValue(new Error("Test error"));
      await expect(jobService.initialize()).rejects.toThrow("Test error");
    });
  });

  describe("shutdown", () => {
    it("should close storage on shutdown", async () => {
      // Initialize the service first
      await jobService.initialize();

      // Then shutdown
      await jobService.shutdown();

      // Verify close was called
      expect(mockJobStorage.close).toHaveBeenCalled();
    });
  });
});
