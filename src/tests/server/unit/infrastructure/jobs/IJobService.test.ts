import { IJobService } from "@/server/infrastructure/jobs/IJobService";
import { JobType } from "@/server/infrastructure/jobs/JobTypes";
import { JobStatus } from "@/server/infrastructure/jobs/storage/IJobStorage";

describe("IJobService", () => {
  let mockJobService: jest.Mocked<IJobService>;

  beforeEach(() => {
    mockJobService = {
      initialize: jest.fn(),
      addJob: jest.fn(),
      registerProcessor: jest.fn(),
      pauseQueue: jest.fn(),
      resumeQueue: jest.fn(),
      getStats: jest.fn(),
      checkDependencies: jest.fn(),
      chainJob: jest.fn(),
      getJobStatus: jest.fn(),
      shutdown: jest.fn(),
    };
  });

  describe("addJob", () => {
    it("should create a new job", async () => {
      const jobId = "job123";
      mockJobService.addJob.mockResolvedValue(jobId);

      const result = await mockJobService.addJob(JobType.MEDIA_PROCESSING, {
        imageId: "img123",
      });
      expect(result).toEqual(jobId);
      expect(mockJobService.addJob).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
        { imageId: "img123" },
      );
    });
  });

  describe("getJobStatus", () => {
    it("should get a job status", async () => {
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

  describe("pauseQueue", () => {
    it("should pause a job queue", async () => {
      await mockJobService.pauseQueue(JobType.MEDIA_PROCESSING);
      expect(mockJobService.pauseQueue).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
      );
    });
  });

  describe("resumeQueue", () => {
    it("should resume a job queue", async () => {
      await mockJobService.resumeQueue(JobType.MEDIA_PROCESSING);
      expect(mockJobService.resumeQueue).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
      );
    });
  });

  describe("getStats", () => {
    it("should get job statistics", async () => {
      const stats = {
        waiting: 1,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        blocked: 0,
        priorityBreakdown: {},
      };

      mockJobService.getStats.mockResolvedValue(stats);
      const result = await mockJobService.getStats(JobType.MEDIA_PROCESSING);
      expect(result).toEqual(stats);
      expect(mockJobService.getStats).toHaveBeenCalledWith(
        JobType.MEDIA_PROCESSING,
      );
    });
  });
});
