import { describe, it, expect, beforeEach, vi } from "vitest";

import { JobType } from "@/server/infrastructure/jobs/JobTypes";
import { JobData } from "@/server/infrastructure/jobs/storage/IJobStorage";

describe("IJobStorage", () => {
  let mockJobStorage: any;

  beforeEach(() => {
    mockJobStorage = {
      initialize: vi.fn(),
      saveJob: vi.fn(),
      getJob: vi.fn(),
      updateJobStatus: vi.fn(),
      getJobsByStatus: vi.fn(),
      getJobsByStatusPrioritized: vi.fn(),
      checkDependencies: vi.fn(),
      findDependentJobs: vi.fn(),
      deleteJob: vi.fn(),
      getJobCounts: vi.fn(),
      cleanup: vi.fn(),
      close: vi.fn(),
    };
  });

  describe("saveJob", () => {
    it("should save a job", async () => {
      const job: JobData = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        status: "waiting",
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        data: { imageId: "img123" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await mockJobStorage.saveJob(job);
      expect(mockJobStorage.saveJob).toHaveBeenCalledWith(job);
    });
  });

  describe("getJob", () => {
    it("should get a job by id", async () => {
      const job: JobData = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        status: "waiting" as const,
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        data: { imageId: "img123" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockJobStorage.getJob.mockResolvedValue(job);
      const result = await mockJobStorage.getJob(
        JobType.MEDIA_PROCESSING,
        "job123",
      );
      expect(result).toEqual(job);
      expect(mockJobStorage.getJob).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        "job123",
      );
    });
  });

  describe("updateJobStatus", () => {
    it("should update a job status", async () => {
      await mockJobStorage.updateJobStatus(
        JobType.MEDIA_PROCESSING,
        "job123",
        "active",
      );
      expect(mockJobStorage.updateJobStatus).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        "job123",
        "active",
      );
    });
  });

  describe("deleteJob", () => {
    it("should delete a job", async () => {
      await mockJobStorage.deleteJob(JobType.MEDIA_PROCESSING, "job123");
      expect(mockJobStorage.deleteJob).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        "job123",
      );
    });
  });

  describe("getJobsByStatus", () => {
    it("should get jobs by status", async () => {
      const jobs: JobData[] = [
        {
          id: "job123",
          type: JobType.MEDIA_PROCESSING,
          status: "waiting",
          priority: 0,
          attempts: 0,
          maxAttempts: 3,
          data: { imageId: "img123" },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockJobStorage.getJobsByStatus.mockResolvedValue(jobs);
      const result = await mockJobStorage.getJobsByStatus(
        JobType.MEDIA_PROCESSING,
        "waiting",
      );
      expect(result).toEqual(jobs);
      expect(mockJobStorage.getJobsByStatus).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        "waiting",
      );
    });
  });

  describe("cleanup", () => {
    it("should cleanup old jobs", async () => {
      const date = new Date();
      await mockJobStorage.cleanup(JobType.MEDIA_PROCESSING, date);
      expect(mockJobStorage.cleanup).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        date,
      );
    });
  });
});
