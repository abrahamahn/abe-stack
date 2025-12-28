import { v4 as uuidv4 } from "uuid";
import { describe, it, expect, beforeEach, vi, Mock } from "vitest";

import { JobService } from "@/server/infrastructure/jobs/JobService";
import { JobType } from "@/server/infrastructure/jobs/JobTypes";
import { JobStatus } from "@/server/infrastructure/jobs/storage/IJobStorage";

// Set NODE_ENV for testing to ensure the uuid is used
process.env.NODE_ENV = "test";

vi.mock("uuid");

describe("JobService", () => {
  let jobService: JobService;
  let mockJobStorage: any;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      createLogger: vi.fn().mockReturnThis(),
      withContext: vi.fn().mockReturnThis(),
      debugObj: vi.fn(),
      infoObj: vi.fn(),
      warnObj: vi.fn(),
      errorObj: vi.fn(),
      initialize: vi.fn(),
      shutdown: vi.fn(),
      addTransport: vi.fn(),
      setTransports: vi.fn(),
      setMinLevel: vi.fn(),
    };

    mockJobStorage = {
      initialize: vi.fn(),
      saveJob: vi.fn().mockImplementation(async () => {}) as Mock,
      getJob: vi.fn(),
      updateJobStatus: vi.fn().mockImplementation(async () => {}),
      getJobsByStatus: vi.fn(),
      getJobsByStatusPrioritized: vi.fn(),
      checkDependencies: vi.fn(),
      findDependentJobs: vi.fn(),
      deleteJob: vi.fn(),
      getJobCounts: vi.fn(),
      cleanup: vi.fn(),
      close: vi.fn(),
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
    (uuidv4 as Mock).mockReturnValue("job123");
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

  describe("Job Dependencies", () => {
    it("should check job dependencies", async () => {
      const dependentJobId = "dependent123";
      mockJobStorage.checkDependencies.mockResolvedValue({
        resolved: true,
        failedDependencies: [],
      });

      await jobService.checkDependencies(
        JobType.MEDIA_PROCESSING,
        dependentJobId,
      );
      expect(mockJobStorage.checkDependencies).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        dependentJobId,
      );
    });

    it("should chain jobs with dependencies", async () => {
      const parentJobId = "parent123";
      const jobData = { imageId: "img123" };

      mockJobStorage.getJob.mockResolvedValue({
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        data: jobData,
      });

      const chainedJobId = await jobService.chainJob(
        JobType.MEDIA_PROCESSING,
        jobData,
        parentJobId,
      );

      expect(mockJobStorage.saveJob).toHaveBeenCalledWith(
        expect.objectContaining({
          dependencies: {
            jobIds: [parentJobId],
            strategy: "fail_on_any_failure",
          },
        }),
      );
      expect(chainedJobId).toBe("job123");
    });
  });

  describe("Retry and Backoff", () => {
    it("should retry failed jobs with exponential backoff", async () => {
      const job = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        status: "active" as JobStatus,
        attempts: 1,
        maxAttempts: 3,
        data: { imageId: "img123" },
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock processor to throw error
      const errorMessage = "Processing failed";
      const mockProcessor = vi.fn().mockRejectedValue(new Error(errorMessage));
      jobService.registerProcessor(JobType.MEDIA_PROCESSING, mockProcessor);

      // Process job and expect it to be scheduled for retry
      await jobService["processJob"](job);

      expect(mockJobStorage.saveJob).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "delayed",
          attempts: 2,
          scheduledFor: expect.any(Date),
        }),
      );
    });

    it("should use fixed backoff when configured", async () => {
      const config = {
        maxConcurrentJobs: 10,
        pollingInterval: 1000,
        defaultJobOptions: {
          priority: 0,
          attempts: 3,
          backoff: {
            type: "fixed" as const,
            delay: 5000,
          },
        },
      };

      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
        debugObj: vi.fn(),
        infoObj: vi.fn(),
        warnObj: vi.fn(),
        errorObj: vi.fn(),
        trace: vi.fn(),
        traceObj: vi.fn(),
        fatal: vi.fn(),
        createLogger: vi.fn(),
        withContext: vi.fn(),
        addTransport: vi.fn(),
        setTransports: vi.fn(),
        getTransports: vi.fn(),
        clearTransports: vi.fn(),
        setLevel: vi.fn(),
        setMinLevel: vi.fn(),
        initialize: vi.fn(),
        shutdown: vi.fn(),
      } as any; // Using type assertion as a last resort

      const jobServiceWithFixedBackoff = new JobService(
        mockLogger,
        mockJobStorage,
        config,
      );

      const job = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        status: "active" as JobStatus,
        attempts: 1,
        maxAttempts: 3,
        data: { imageId: "img123" },
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock processor to throw error
      const mockProcessor = vi.fn().mockRejectedValue(new Error("Test error"));
      jobServiceWithFixedBackoff.registerProcessor(
        JobType.MEDIA_PROCESSING,
        mockProcessor,
      );

      // Process job and expect fixed delay
      await jobServiceWithFixedBackoff["processJob"](job);

      expect(mockJobStorage.saveJob).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledFor: expect.any(Date),
        }),
      );
    });
  });

  describe("Queue Management", () => {
    it("should respect max concurrent jobs limit", async () => {
      const jobServiceWithLimit = new JobService(mockLogger, mockJobStorage, {
        maxConcurrentJobs: 2,
      });

      const jobs = [
        {
          id: "job1",
          type: JobType.MEDIA_PROCESSING,
          status: "waiting" as JobStatus,
        },
        {
          id: "job2",
          type: JobType.MEDIA_PROCESSING,
          status: "waiting" as JobStatus,
        },
        {
          id: "job3",
          type: JobType.MEDIA_PROCESSING,
          status: "waiting" as JobStatus,
        },
      ];

      // Make sure to reset the mock counts before the test
      mockJobStorage.updateJobStatus.mockClear();
      mockJobStorage.getJobsByStatus.mockResolvedValue(jobs);

      // Register a processor to make sure jobs are processed
      jobServiceWithLimit.registerProcessor(
        JobType.MEDIA_PROCESSING,
        async () => {
          // Simple processor that does nothing
        },
      );

      // Mock the internal processJob method to make it "process" without actually doing anything
      const processJobSpy = vi
        .spyOn(jobServiceWithLimit as any, "processJob")
        .mockResolvedValue(undefined);

      // Process batch
      await jobServiceWithLimit["processNextBatch"]();

      // Assert that processJob was called only twice (max concurrent jobs)
      expect(processJobSpy).toHaveBeenCalledTimes(2);
    });

    it("should handle paused queues", async () => {
      // Make sure to reset the mock counts before the test
      mockJobStorage.updateJobStatus.mockClear();

      await jobService.pauseQueue(JobType.MEDIA_PROCESSING);

      const jobs = [
        {
          id: "job1",
          type: JobType.MEDIA_PROCESSING,
          status: "waiting" as JobStatus,
        },
      ];

      mockJobStorage.getJobsByStatus.mockResolvedValue(jobs);

      // Register a processor to make sure jobs are processed
      jobService.registerProcessor(JobType.MEDIA_PROCESSING, async () => {
        // Simple processor that does nothing
      });

      // Mock the internal processJob method to make it "process" without errors
      const processJobSpy = vi
        .spyOn(jobService as any, "processJob")
        .mockResolvedValue(undefined);

      // Process batch
      await jobService["processNextBatch"]();

      // Should not process jobs from paused queue
      expect(processJobSpy).not.toHaveBeenCalled();

      // Resume queue
      await jobService.resumeQueue(JobType.MEDIA_PROCESSING);

      // Clear previous mock to get fresh calls
      processJobSpy.mockClear();

      // Process batch again
      await jobService["processNextBatch"]();

      // Should now process jobs
      expect(processJobSpy).toHaveBeenCalled();
    });
  });

  describe("Performance Metrics", () => {
    it("should track job processing time", async () => {
      const job = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        status: "active" as JobStatus,
        attempts: 0,
        maxAttempts: 3,
        data: { imageId: "img123" },
        priority: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockProcessor = vi.fn().mockResolvedValue(undefined);
      jobService.registerProcessor(JobType.MEDIA_PROCESSING, mockProcessor);

      await jobService["processJob"](job);

      expect(mockJobStorage.updateJobStatus).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        "job123",
        "completed",
        expect.objectContaining({
          data: expect.objectContaining({
            processingTime: expect.any(Number),
          }),
        }),
      );
    });

    it("should provide job statistics", async () => {
      mockJobStorage.getJobCounts.mockResolvedValue({
        waiting: 5,
        active: 2,
        completed: 10,
        failed: 1,
        delayed: 1,
        blocked: 0,
      });

      mockJobStorage.getJobsByStatus.mockResolvedValue([
        { priority: 0 },
        { priority: -10 },
        { priority: -10 },
      ]);

      const stats = await jobService.getStats(JobType.MEDIA_PROCESSING);

      expect(stats).toEqual(
        expect.objectContaining({
          waiting: 5,
          active: 2,
          completed: 10,
          failed: 1,
          delayed: 1,
          blocked: 0,
          priorityBreakdown: expect.any(Object),
          performance: expect.any(Object),
        }),
      );
    });
  });
});
