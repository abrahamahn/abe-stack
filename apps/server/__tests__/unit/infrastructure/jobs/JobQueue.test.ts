import { describe, it, expect } from "vitest";

import { Job, JobResult } from "@/server/infrastructure/jobs/JobQueue";
import {
  JobType,
  JobPriority,
  JobOptions,
} from "@/server/infrastructure/jobs/JobTypes";

describe("JobQueue Interfaces", () => {
  describe("Job Interface", () => {
    it("should be able to create a job object with required properties", () => {
      // Arrange
      const jobData = {
        name: "Test Job",
        params: { key: "value" },
      };

      // Act
      const job: Job<typeof jobData> = {
        id: "job-123",
        type: JobType.EMAIL_NOTIFICATION,
        data: jobData,
        createdAt: new Date(),
        attempts: 0,
      };

      // Assert
      expect(job).toBeDefined();
      expect(job.id).toBe("job-123");
      expect(job.type).toBe(JobType.EMAIL_NOTIFICATION);
      expect(job.data).toEqual(jobData);
      expect(job.data.name).toBe("Test Job");
      expect(job.data.params.key).toBe("value");
      expect(job.createdAt).toBeInstanceOf(Date);
      expect(job.attempts).toBe(0);
    });

    it("should be able to create a job with options", () => {
      // Arrange
      const jobOptions: JobOptions = {
        priority: JobPriority.HIGH,
        attempts: 3,
        delay: 1000,
      };

      // Act
      const job: Job<{ action: string }> = {
        id: "job-456",
        type: JobType.REPORT_GENERATION,
        data: { action: "generate" },
        options: jobOptions,
        createdAt: new Date(),
        attempts: 0,
      };

      // Assert
      expect(job.options).toBeDefined();
      expect(job.options?.priority).toBe(JobPriority.HIGH);
      expect(job.options?.attempts).toBe(3);
      expect(job.options?.delay).toBe(1000);
    });

    it("should support different data types based on the generic", () => {
      // Test with string data
      const stringJob: Job<string> = {
        id: "job-string",
        type: JobType.PUSH_NOTIFICATION,
        data: "Simple string data",
        createdAt: new Date(),
        attempts: 0,
      };
      expect(typeof stringJob.data).toBe("string");

      // Test with number data
      const numberJob: Job<number> = {
        id: "job-number",
        type: JobType.CACHE_MAINTENANCE,
        data: 42,
        createdAt: new Date(),
        attempts: 0,
      };
      expect(typeof numberJob.data).toBe("number");

      // Test with complex object
      const complexJob: Job<{ users: string[]; message: string }> = {
        id: "job-complex",
        type: JobType.USER_ONBOARDING,
        data: {
          users: ["user1", "user2"],
          message: "Hello",
        },
        createdAt: new Date(),
        attempts: 0,
      };
      expect(Array.isArray(complexJob.data.users)).toBe(true);
      expect(complexJob.data.message).toBe("Hello");
    });
  });

  describe("JobResult Interface", () => {
    it("should be able to create a successful job result", () => {
      // Act
      const result: JobResult = {
        success: true,
        duration: 150,
        data: { completed: true },
      };

      // Assert
      expect(result.success).toBe(true);
      expect(result.duration).toBe(150);
      expect(result.data).toEqual({ completed: true });
      expect(result.error).toBeUndefined();
      expect(result.stack).toBeUndefined();
    });

    it("should be able to create a failed job result", () => {
      // Act
      const result: JobResult = {
        success: false,
        error: "Job processing failed",
        stack: "Error stack trace",
        duration: 75,
      };

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe("Job processing failed");
      expect(result.stack).toBe("Error stack trace");
      expect(result.duration).toBe(75);
      expect(result.data).toBeUndefined();
    });
  });
});
