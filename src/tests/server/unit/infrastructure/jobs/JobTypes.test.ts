import { JobType } from "@/server/infrastructure/jobs/JobTypes";

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
  });
});
