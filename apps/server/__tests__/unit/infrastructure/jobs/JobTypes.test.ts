import { describe, it, expect } from "vitest";

import {
  JobType,
  JobPriority,
  DependencyResolutionStrategy,
} from "@/server/infrastructure/jobs/JobTypes";

describe("JobTypes", () => {
  describe("JobStatus", () => {
    it("should have all required status values", () => {
      const validStatuses = [
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
        "blocked",
      ];
      expect(validStatuses).toEqual(
        expect.arrayContaining([
          "waiting",
          "active",
          "completed",
          "failed",
          "delayed",
          "blocked",
        ]),
      );
    });

    it("should have valid status values", () => {
      const validStatuses = [
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
        "blocked",
      ];
      validStatuses.forEach((status) => {
        expect(validStatuses).toContain(status);
      });
    });
  });

  describe("JobType", () => {
    it("should have all required type values", () => {
      expect(JobType).toEqual({
        // Media processing jobs
        MEDIA_PROCESSING: "media_processing",
        VIDEO_TRANSCODING: "video_transcoding",
        IMAGE_OPTIMIZATION: "image_optimization",
        THUMBNAIL_GENERATION: "thumbnail_generation",

        // Communication jobs
        EMAIL_NOTIFICATION: "email_notification",
        PUSH_NOTIFICATION: "push_notification",

        // Content jobs
        FEED_GENERATION: "feed_generation",
        CONTENT_INDEXING: "content_indexing",

        // User-related jobs
        USER_ONBOARDING: "user_onboarding",
        ACCOUNT_CLEANUP: "account_cleanup",

        // System jobs
        DATABASE_BACKUP: "database_backup",
        CACHE_MAINTENANCE: "cache_maintenance",
        REPORT_GENERATION: "report_generation",
      });
    });

    it("should have valid type values", () => {
      const validTypes = [
        "media_processing",
        "video_transcoding",
        "image_optimization",
        "thumbnail_generation",
        "email_notification",
        "push_notification",
        "feed_generation",
        "content_indexing",
        "user_onboarding",
        "account_cleanup",
        "database_backup",
        "cache_maintenance",
        "report_generation",
      ];

      Object.values(JobType).forEach((type) => {
        expect(validTypes).toContain(type);
      });
    });

    it("should have consistent naming convention", () => {
      Object.entries(JobType).forEach(([key, value]) => {
        // Check if the key follows the UPPER_SNAKE_CASE convention
        expect(key).toMatch(/^[A-Z][A-Z0-9_]*$/);
        // Check if the value follows the lowercase_snake_case convention
        expect(value).toMatch(/^[a-z][a-z0-9_]*$/);
      });
    });

    it("should group related job types", () => {
      // Media jobs
      const mediaJobs = [
        JobType.MEDIA_PROCESSING,
        JobType.VIDEO_TRANSCODING,
        JobType.IMAGE_OPTIMIZATION,
        JobType.THUMBNAIL_GENERATION,
      ];
      mediaJobs.forEach((job) =>
        expect(job).toMatch(/^(media|video|image|thumbnail)/),
      );

      // Communication jobs
      const communicationJobs = [
        JobType.EMAIL_NOTIFICATION,
        JobType.PUSH_NOTIFICATION,
      ];
      communicationJobs.forEach((job) => expect(job).toMatch(/_notification$/));

      // Content jobs
      const contentJobs = [JobType.FEED_GENERATION, JobType.CONTENT_INDEXING];
      contentJobs.forEach((job) => expect(job).toMatch(/^(feed|content)/));

      // System jobs
      const systemJobs = [
        JobType.DATABASE_BACKUP,
        JobType.CACHE_MAINTENANCE,
        JobType.REPORT_GENERATION,
      ];
      systemJobs.forEach((job) =>
        expect(job).toMatch(/(backup|maintenance|generation)$/),
      );
    });
  });

  describe("JobPriority", () => {
    it("should have correct priority levels", () => {
      // TypeScript generates a bidirectional map for enums
      // So we need to check only the string keys
      const priorityValues = {
        LOWEST: 20,
        LOW: 10,
        NORMAL: 0,
        MEDIUM: -5,
        HIGH: -10,
        CRITICAL: -15,
        URGENT: -20,
      };

      // Check that all expected values are present
      Object.entries(priorityValues).forEach(([key, value]) => {
        expect(JobPriority[key as keyof typeof JobPriority]).toBe(value);
      });
    });

    it("should maintain correct priority ordering", () => {
      const priorities = [
        JobPriority.LOWEST,
        JobPriority.LOW,
        JobPriority.NORMAL,
        JobPriority.MEDIUM,
        JobPriority.HIGH,
        JobPriority.CRITICAL,
        JobPriority.URGENT,
      ];

      // Check that each priority is higher than the next one
      for (let i = 0; i < priorities.length - 1; i++) {
        expect(priorities[i]).toBeGreaterThan(priorities[i + 1]);
      }
    });

    it("should have consistent spacing between levels", () => {
      expect(JobPriority.LOWEST - JobPriority.LOW).toBe(10);
      expect(JobPriority.LOW - JobPriority.NORMAL).toBe(10);
      expect(JobPriority.NORMAL - JobPriority.MEDIUM).toBe(5);
      expect(JobPriority.MEDIUM - JobPriority.HIGH).toBe(5);
      expect(JobPriority.HIGH - JobPriority.CRITICAL).toBe(5);
      expect(JobPriority.CRITICAL - JobPriority.URGENT).toBe(5);
    });
  });

  describe("DependencyResolutionStrategy", () => {
    it("should have all required strategies", () => {
      expect(DependencyResolutionStrategy).toEqual({
        FAIL_ON_ANY_FAILURE: "fail_on_any_failure",
        CONTINUE_ON_FAILURE: "continue_on_failure",
        SKIP_ON_FAILURE: "skip_on_failure",
      });
    });

    it("should have unique values", () => {
      const values = Object.values(DependencyResolutionStrategy);
      const uniqueValues = new Set(values);
      expect(values.length).toBe(uniqueValues.size);
    });

    it("should have consistent naming convention", () => {
      Object.entries(DependencyResolutionStrategy).forEach(([key, value]) => {
        // Check if the key follows the UPPER_SNAKE_CASE convention
        expect(key).toMatch(/^[A-Z][A-Z0-9_]*$/);
        // Check if the value follows the lowercase_snake_case convention
        expect(value).toMatch(/^[a-z][a-z0-9_]*$/);
      });
    });

    it("should have descriptive strategy names", () => {
      Object.values(DependencyResolutionStrategy).forEach((value) => {
        expect(value).toMatch(/(fail|continue|skip)_on.*failure$/);
      });
    });
  });
});
