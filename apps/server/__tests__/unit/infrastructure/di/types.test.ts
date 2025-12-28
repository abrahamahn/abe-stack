import { describe, it, expect } from "vitest";

import { TYPES } from "@/server/infrastructure/di/types";

describe("DI Types", () => {
  describe("Infrastructure Layer", () => {
    it("should have core infrastructure service types", () => {
      expect(TYPES.ConfigService).toBeDefined();
      expect(TYPES.AppConfig).toBeDefined();
      expect(TYPES.DatabaseConfig).toBeDefined();
      expect(TYPES.ApiConfig).toBeDefined();
      expect(TYPES.LoggerService).toBeDefined();
      expect(TYPES.LegacyLogger).toBeDefined();
      expect(TYPES.LoggingConfig).toBeDefined();
      expect(TYPES.CacheService).toBeDefined();
      expect(TYPES.StorageService).toBeDefined();
      expect(TYPES.ErrorHandler).toBeDefined();
      expect(TYPES.ApplicationLifecycle).toBeDefined();
    });

    it("should have cache-related types", () => {
      expect(TYPES.CacheService).toBeDefined();
      expect(TYPES.CacheAdapter).toBeDefined();
      expect(TYPES.CacheServiceConfig).toBeDefined();
      expect(TYPES.CachePerformanceReporter).toBeDefined();
      expect(TYPES.CacheExample).toBeDefined();
    });

    it("should have job system types", () => {
      expect(TYPES.JobService).toBeDefined();
      expect(TYPES.PersistentJobQueue).toBeDefined();
      expect(TYPES.JobQueueManager).toBeDefined();
      expect(TYPES.JobStorage).toBeDefined();
      expect(TYPES.JobStorageConfig).toBeDefined();
      expect(TYPES.JobServiceConfig).toBeDefined();
      expect(TYPES.JobExample).toBeDefined();
      expect(TYPES.JobProcessor).toBeDefined();
      expect(TYPES.JobProcessorRegistry).toBeDefined();
      expect(TYPES.JobOrchestrationService).toBeDefined();
    });

    it("should have processor component types", () => {
      expect(TYPES.ImageProcessor).toBeDefined();
      expect(TYPES.StreamProcessor).toBeDefined();
      expect(TYPES.MediaProcessor).toBeDefined();
    });

    it("should have middleware component types", () => {
      expect(TYPES.ValidationMiddleware).toBeDefined();
      expect(TYPES.RateLimitMiddleware).toBeDefined();
      expect(TYPES.GeoMiddleware).toBeDefined();
    });
  });

  describe("Database Layer", () => {
    it("should have base repository type", () => {
      expect(TYPES.BaseRepository).toBeDefined();
    });

    it("should have auth repository types", () => {
      expect(TYPES.UserRepository).toBeDefined();
      expect(TYPES.UserRoleRepository).toBeDefined();
      expect(TYPES.UserPreferencesRepository).toBeDefined();
      expect(TYPES.RoleRepository).toBeDefined();
      expect(TYPES.RolePermissionRepository).toBeDefined();
      expect(TYPES.PermissionRepository).toBeDefined();
      expect(TYPES.TokenRepository).toBeDefined();
      expect(TYPES.PasswordResetTokenRepository).toBeDefined();
    });

    it("should have media repository types", () => {
      expect(TYPES.MediaRepository).toBeDefined();
      expect(TYPES.MediaCollectionRepository).toBeDefined();
      expect(TYPES.MediaTagRepository).toBeDefined();
      expect(TYPES.MediaCommentRepository).toBeDefined();
    });

    it("should have social repository types", () => {
      expect(TYPES.UserProfileRepository).toBeDefined();
      expect(TYPES.FollowRepository).toBeDefined();
      expect(TYPES.PostRepository).toBeDefined();
      expect(TYPES.CommentRepository).toBeDefined();
      expect(TYPES.LikeRepository).toBeDefined();
      expect(TYPES.NotificationRepository).toBeDefined();
    });

    it("should have messaging repository types", () => {
      expect(TYPES.ConversationRepository).toBeDefined();
      expect(TYPES.MessageRepository).toBeDefined();
    });

    it("should have moderation repository types", () => {
      expect(TYPES.ReportRepository).toBeDefined();
      expect(TYPES.ContentModerationRepository).toBeDefined();
      expect(TYPES.BlockRepository).toBeDefined();
    });

    it("should have analytics repository types", () => {
      expect(TYPES.UserAnalyticsRepository).toBeDefined();
      expect(TYPES.ContentAnalyticsRepository).toBeDefined();
      expect(TYPES.EngagementAnalyticsRepository).toBeDefined();
    });
  });

  describe("Service Layer", () => {
    it("should have core service types", () => {
      expect(TYPES.GeoService).toBeDefined();
      expect(TYPES.SearchService).toBeDefined();
      expect(TYPES.MessagingService).toBeDefined();
      expect(TYPES.TransactionService).toBeDefined();
      expect(TYPES.ValidationService).toBeDefined();
      expect(TYPES.EncryptionService).toBeDefined();
    });

    it("should have user service types", () => {
      expect(TYPES.UserService).toBeDefined();
      expect(TYPES.ProfileService).toBeDefined();
      expect(TYPES.AuthenticationService).toBeDefined();
      expect(TYPES.PermissionService).toBeDefined();
      expect(TYPES.RolePermissionService).toBeDefined();
    });

    it("should have social service types", () => {
      expect(TYPES.PostService).toBeDefined();
      expect(TYPES.CommentService).toBeDefined();
      expect(TYPES.LikeService).toBeDefined();
      expect(TYPES.FollowService).toBeDefined();
      expect(TYPES.NotificationService).toBeDefined();
      expect(TYPES.FeedService).toBeDefined();
    });

    it("should have media service types", () => {
      expect(TYPES.MediaService).toBeDefined();
      expect(TYPES.MediaProcessingService).toBeDefined();
    });

    it("should have messaging service types", () => {
      expect(TYPES.MessageService).toBeDefined();
      expect(TYPES.ChatService).toBeDefined();
    });

    it("should have moderation service types", () => {
      expect(TYPES.ModerationService).toBeDefined();
      expect(TYPES.ReportingService).toBeDefined();
      expect(TYPES.ContentFilterService).toBeDefined();
    });

    it("should have analytics service types", () => {
      expect(TYPES.AnalyticsService).toBeDefined();
      expect(TYPES.EngagementAnalyticsService).toBeDefined();
    });

    it("should have discovery service types", () => {
      expect(TYPES.RecommendationService).toBeDefined();
      expect(TYPES.TrendingService).toBeDefined();
    });

    it("should have utility service types", () => {
      expect(TYPES.MailService).toBeDefined();
      expect(TYPES.SmsService).toBeDefined();
      expect(TYPES.WebhookService).toBeDefined();
      expect(TYPES.PushNotificationService).toBeDefined();
      expect(TYPES.EmailTemplateService).toBeDefined();
      expect(TYPES.TemplateEngine).toBeDefined();
    });
  });

  describe("API Layer", () => {
    it("should have controller types", () => {
      expect(TYPES.AuthController).toBeDefined();
      expect(TYPES.SessionController).toBeDefined();
      expect(TYPES.UserController).toBeDefined();
      expect(TYPES.RolePermissionController).toBeDefined();
    });

    it("should have API infrastructure types", () => {
      expect(TYPES.RequestLogger).toBeDefined();
      expect(TYPES.SecurityAuditLogger).toBeDefined();
    });
  });

  describe("Symbol uniqueness", () => {
    it("should have unique symbols for all types", () => {
      const symbols = new Set();
      Object.values(TYPES).forEach((symbol) => {
        expect(symbols.has(symbol)).toBe(false);
        symbols.add(symbol);
      });
      expect(symbols.size).toBe(Object.keys(TYPES).length);
    });

    it("should use Symbol.for() for consistent symbol references", () => {
      // Test a few key symbols
      expect(TYPES.ConfigService).toBe(Symbol.for("ConfigService"));
      expect(TYPES.LoggerService).toBe(Symbol.for("LoggerService"));
      expect(TYPES.DatabaseService).toBe(Symbol.for("DatabaseService"));
    });
  });
});
