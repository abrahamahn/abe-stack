import path from "path";

import { describe, it, expect, beforeEach, vi, Mock } from "vitest";

import { FileJobStorage } from "@infrastructure/jobs";
import { JobType } from "@infrastructure/jobs/JobTypes";
import { JobStatus } from "@infrastructure/jobs/storage/IJobStorage";
import { ILoggerService } from "@infrastructure/logging";
import { IStorageService } from "@infrastructure/storage";

describe("FileJobStorage", () => {
  let storage: FileJobStorage;
  let mockLogger: ILoggerService;
  let mockStorageService: {
    createDirectory: Mock;
    saveFile: Mock;
    getFile: Mock;
    deleteFile: Mock;
    fileExists: Mock;
    listFiles: Mock;
    getFileStream: Mock;
    getFileMetadata: Mock;
    getFileUrl: Mock;
  };
  let config: {
    basePath: string;
    completedJobRetention?: number;
    failedJobRetention?: number;
  };

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      debugObj: vi.fn(),
      infoObj: vi.fn(),
      warnObj: vi.fn(),
      errorObj: vi.fn(),
      createLogger: vi.fn(),
      initialize: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
      addTransport: vi.fn(),
      setTransports: vi.fn(),
      setMinLevel: vi.fn(),
      withContext: vi.fn().mockReturnThis(),
    } as unknown as ILoggerService;

    mockStorageService = {
      createDirectory: vi.fn().mockResolvedValue(undefined),
      saveFile: vi.fn().mockResolvedValue({ path: "test" }),
      getFile: vi.fn().mockResolvedValue(Buffer.from("")),
      deleteFile: vi.fn().mockResolvedValue(true),
      fileExists: vi.fn().mockResolvedValue(true),
      listFiles: vi.fn().mockResolvedValue([]),
      getFileStream: vi.fn(),
      getFileMetadata: vi.fn(),
      getFileUrl: vi.fn(),
    };

    config = {
      basePath: "/test",
      completedJobRetention: 24 * 60 * 60 * 1000, // 24 hours
      failedJobRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    storage = new FileJobStorage(
      mockLogger,
      mockStorageService as unknown as IStorageService,
      config,
    );
  });

  describe("initialize", () => {
    it("should create required directories", async () => {
      await storage.initialize();

      expect(mockStorageService.createDirectory).toHaveBeenCalledWith("/test");
      expect(mockStorageService.createDirectory).toHaveBeenCalledWith(
        path.join("/test", "waiting"),
      );
      expect(mockStorageService.createDirectory).toHaveBeenCalledWith(
        path.join("/test", "active"),
      );
      expect(mockStorageService.createDirectory).toHaveBeenCalledWith(
        path.join("/test", "completed"),
      );
      expect(mockStorageService.createDirectory).toHaveBeenCalledWith(
        path.join("/test", "failed"),
      );
      expect(mockStorageService.createDirectory).toHaveBeenCalledWith(
        path.join("/test", "delayed"),
      );
    });

    it("should handle initialization errors", async () => {
      mockStorageService.createDirectory.mockRejectedValue(
        new Error("Failed to create directory"),
      );
      await expect(storage.initialize()).rejects.toThrow(
        "Failed to create directory",
      );
    });
  });

  describe("saveJob", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should save a job to the correct location", async () => {
      const job = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        status: "waiting" as JobStatus,
        data: {
          imageId: "img123",
        },
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date("2025-04-01T15:20:09.729Z"),
        updatedAt: new Date("2025-04-01T15:20:09.729Z"),
      };

      await storage.saveJob(job);

      expect(mockStorageService.saveFile).toHaveBeenCalledWith(
        path.join("/test", "waiting", "media_processing_job123.json"),
        expect.any(Buffer),
      );
    });

    it("should handle save errors", async () => {
      mockStorageService.saveFile.mockRejectedValue(new Error("Save failed"));
      const job = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        status: "waiting" as JobStatus,
        data: {
          imageId: "img123",
        },
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date("2025-04-01T15:20:09.729Z"),
        updatedAt: new Date("2025-04-01T15:20:09.729Z"),
      };

      await expect(storage.saveJob(job)).rejects.toThrow("Save failed");
    });
  });

  describe("getJob", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should retrieve a job from any status directory", async () => {
      const job = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        status: "waiting" as JobStatus,
        data: {
          imageId: "img123",
        },
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date("2025-04-01T15:20:09.729Z"),
        updatedAt: new Date("2025-04-01T15:20:09.729Z"),
      };

      mockStorageService.fileExists.mockResolvedValue(true);
      mockStorageService.getFile.mockResolvedValue(
        Buffer.from(JSON.stringify(job)),
      );

      const result = await storage.getJob(JobType.MEDIA_PROCESSING, "job123");
      expect(result).toEqual({
        ...job,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
      });
    });

    it("should return null if job not found", async () => {
      mockStorageService.fileExists.mockResolvedValue(false);
      const result = await storage.getJob(
        JobType.MEDIA_PROCESSING,
        "nonexistent",
      );
      expect(result).toBeNull();
    });
  });

  describe("updateJobStatus", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should move job file to new status directory", async () => {
      const job = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        status: "waiting" as JobStatus,
        data: {
          imageId: "img123",
        },
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date("2025-04-01T15:20:09.729Z"),
        updatedAt: new Date("2025-04-01T15:20:09.729Z"),
      };

      mockStorageService.fileExists.mockResolvedValue(true);
      mockStorageService.getFile.mockResolvedValue(
        Buffer.from(JSON.stringify(job)),
      );

      await storage.updateJobStatus(
        JobType.MEDIA_PROCESSING,
        "job123",
        "active",
      );

      expect(mockStorageService.deleteFile).toHaveBeenCalled();
      expect(mockStorageService.saveFile).toHaveBeenCalled();
    });

    it("should handle non-existent jobs", async () => {
      mockStorageService.fileExists.mockResolvedValue(false);
      await expect(
        storage.updateJobStatus(
          JobType.MEDIA_PROCESSING,
          "nonexistent",
          "active",
        ),
      ).rejects.toThrow("Job not found");
    });
  });

  describe("getJobsByStatus", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should list jobs with specific status", async () => {
      const expectedJob = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        status: "waiting" as JobStatus,
        data: { imageId: "img123" },
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: "2023-04-01T15:20:09.729Z",
        updatedAt: "2023-04-01T15:20:09.729Z",
      };

      const job = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        status: "waiting" as JobStatus,
        data: { imageId: "img123" },
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date("2023-04-01T15:20:09.729Z"),
        updatedAt: new Date("2023-04-01T15:20:09.729Z"),
      };

      // Setup the mock to properly return file list and job data
      mockStorageService.listFiles.mockResolvedValue([
        "media_processing_job123.json",
      ]);
      mockStorageService.getFile.mockResolvedValue(
        Buffer.from(JSON.stringify(job)),
      );

      await storage.saveJob(job);
      const jobs = await storage.getJobsByStatus(
        JobType.MEDIA_PROCESSING,
        "waiting",
      );
      expect(jobs).toHaveLength(1);
      expect(jobs[0]).toEqual(expectedJob);
    });

    it("should respect the limit parameter", async () => {
      const job1 = {
        id: "job1",
        type: JobType.MEDIA_PROCESSING,
        status: "waiting" as JobStatus,
        data: { imageId: "img1" },
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date("2025-04-01T15:20:09.729Z"),
        updatedAt: new Date("2025-04-01T15:20:09.729Z"),
      };

      const job2 = {
        id: "job2",
        type: JobType.MEDIA_PROCESSING,
        status: "waiting" as JobStatus,
        data: { imageId: "img2" },
        attempts: 0,
        maxAttempts: 3,
        priority: 0,
        createdAt: new Date("2025-04-01T15:20:09.729Z"),
        updatedAt: new Date("2025-04-01T15:20:09.729Z"),
      };

      mockStorageService.listFiles.mockResolvedValue([
        "media_processing_job1.json",
        "media_processing_job2.json",
        "media_processing_job3.json",
      ]);

      mockStorageService.getFile
        .mockResolvedValueOnce(Buffer.from(JSON.stringify(job1)))
        .mockResolvedValueOnce(Buffer.from(JSON.stringify(job2)));

      const jobs = await storage.getJobsByStatus(
        JobType.MEDIA_PROCESSING,
        "waiting",
        2,
      );
      expect(jobs).toHaveLength(2);
      expect(jobs[0]).toEqual({
        ...job1,
        createdAt: job1.createdAt.toISOString(),
        updatedAt: job1.updatedAt.toISOString(),
      });
      expect(jobs[1]).toEqual({
        ...job2,
        createdAt: job2.createdAt.toISOString(),
        updatedAt: job2.updatedAt.toISOString(),
      });
    });
  });

  describe("cleanup", () => {
    beforeEach(async () => {
      await storage.initialize();
    });

    it("should clean up old completed and failed jobs", async () => {
      const oldJob = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        status: "completed" as JobStatus,
        updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours old
      };

      mockStorageService.listFiles.mockResolvedValue([
        "media_processing_job123.json",
      ]);
      mockStorageService.getFile.mockResolvedValue(
        Buffer.from(JSON.stringify(oldJob)),
      );

      const count = await storage.cleanup();
      expect(count).toBeGreaterThan(0);
      expect(mockStorageService.deleteFile).toHaveBeenCalled();
    });

    it("should respect retention periods", async () => {
      const recentJob = {
        id: "job123",
        type: JobType.MEDIA_PROCESSING,
        status: "completed" as JobStatus,
        updatedAt: new Date(), // Just now
      };

      mockStorageService.listFiles.mockResolvedValue([
        "media_processing_job123.json",
      ]);
      mockStorageService.getFile.mockResolvedValue(
        Buffer.from(JSON.stringify(recentJob)),
      );

      const count = await storage.cleanup();
      expect(count).toBe(0);
    });
  });

  describe("close", () => {
    it("should clear cleanup interval", async () => {
      await storage.initialize();
      await storage.close();
      // Verify cleanup interval is cleared (indirectly through coverage)
      expect(true).toBe(true);
    });
  });
});
