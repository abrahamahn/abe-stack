import "reflect-metadata";
import { Request, Response, NextFunction } from "express";
import { Container, injectable, inject } from "inversify";
import { Schema } from "joi";
import { describe, it, expect, beforeEach } from "vitest";

import { ICacheService } from "@/server/infrastructure/cache";
import { IConfigService } from "@/server/infrastructure/config";
import { IDatabaseServer } from "@/server/infrastructure/database";
import {
  createContainer,
  container,
} from "@/server/infrastructure/di/container";
import { TYPES } from "@/server/infrastructure/di/types";
import { IJobService } from "@/server/infrastructure/jobs";
import { ILoggerService } from "@/server/infrastructure/logging";
import { IWebSocketService } from "@/server/infrastructure/pubsub";

// Test interfaces and implementations
interface ITestService {
  getValue(): string;
}

@injectable()
class TestService implements ITestService {
  getValue(): string {
    return "test value";
  }
}

interface IConfigurableService {
  getConfig(): Record<string, unknown>;
}

@injectable()
class ConfigurableService implements IConfigurableService {
  constructor(@inject(TYPES.ConfigService) private configService: any) {}

  getConfig(): Record<string, unknown> {
    return this.configService.getConfig();
  }
}

describe("Container", () => {
  describe("Infrastructure Type Definitions", () => {
    it("should have type definitions for all infrastructure components", () => {
      // Core infrastructure services
      expect(TYPES.ConfigService).toBeDefined();
      expect(TYPES.LoggerService).toBeDefined();
      expect(TYPES.LoggingConfig).toBeDefined();
      expect(TYPES.StorageService).toBeDefined();
      expect(TYPES.StorageConfig).toBeDefined();
      expect(TYPES.StorageProvider).toBeDefined();
      expect(TYPES.CacheService).toBeDefined();
      expect(TYPES.ErrorHandler).toBeDefined();

      // Database services
      expect(TYPES.DatabaseConfig).toBeDefined();
      expect(TYPES.DatabaseService).toBeDefined();

      // Job system
      expect(TYPES.JobService).toBeDefined();
      expect(TYPES.JobStorage).toBeDefined();
      expect(TYPES.JobStorageConfig).toBeDefined();
      expect(TYPES.JobServiceConfig).toBeDefined();

      // Application lifecycle
      expect(TYPES.ApplicationLifecycle).toBeDefined();

      // Processor components
      expect(TYPES.ImageProcessor).toBeDefined();
      expect(TYPES.MediaProcessor).toBeDefined();
      expect(TYPES.StreamProcessor).toBeDefined();

      // Pubsub components
      expect(TYPES.WebSocketService).toBeDefined();

      // Server components
      expect(TYPES.ServerManager).toBeDefined();

      // Middleware components
      expect(TYPES.ValidationMiddleware).toBeDefined();
      expect(TYPES.RateLimitMiddleware).toBeDefined();
    });
  });

  describe("Container Factory", () => {
    it("should create new container when no cache key provided", () => {
      const container1 = createContainer();
      const container2 = createContainer();
      expect(container1).not.toBe(container2);
    });

    it("should reuse container with same cache key", () => {
      const container1 = createContainer({ cacheKey: "test" });
      const container2 = createContainer({ cacheKey: "test" });
      expect(container1).toBe(container2);
    });

    it("should create different containers for different cache keys", () => {
      const container1 = createContainer({ cacheKey: "test1" });
      const container2 = createContainer({ cacheKey: "test2" });
      expect(container1).not.toBe(container2);
    });
  });

  describe("Service Registration", () => {
    let testContainer: Container;

    beforeEach(() => {
      testContainer = createContainer();
    });

    it("should register and resolve configurable service", () => {
      testContainer
        .bind<IConfigurableService>("ConfigurableService")
        .to(ConfigurableService);
      const service = testContainer.get<IConfigurableService>(
        "ConfigurableService",
      );
      expect(service).toBeDefined();
      expect(service.getConfig).toBeDefined();
    });

    it("should register and resolve test service", () => {
      testContainer.bind<ITestService>("TestService").to(TestService);
      const service = testContainer.get<ITestService>("TestService");
      expect(service.getValue()).toBe("test value");
    });

    it("should register and resolve core services", () => {
      expect(() =>
        testContainer.get<IConfigService>(TYPES.ConfigService),
      ).not.toThrow();
      expect(() =>
        testContainer.get<ILoggerService>(TYPES.LoggerService),
      ).not.toThrow();
      expect(() =>
        testContainer.get<ICacheService>(TYPES.CacheService),
      ).not.toThrow();
      expect(() =>
        testContainer.get<IDatabaseServer>(TYPES.DatabaseService),
      ).not.toThrow();
    });

    it("should register services in singleton scope", () => {
      const logger1 = testContainer.get<ILoggerService>(TYPES.LoggerService);
      const logger2 = testContainer.get<ILoggerService>(TYPES.LoggerService);
      expect(logger1).toBe(logger2);
    });

    it("should register job system components", () => {
      const jobService = testContainer.get<IJobService>(TYPES.JobService);
      expect(jobService).toBeDefined();
      expect(() => testContainer.get(TYPES.JobStorageConfig)).not.toThrow();
      expect(() => testContainer.get(TYPES.JobServiceConfig)).not.toThrow();
    });
  });

  describe("Middleware Registration", () => {
    let testContainer: Container;

    beforeEach(() => {
      testContainer = createContainer();
    });

    it("should register validation middleware", () => {
      const validateRequest = testContainer.get<
        (
          schema: Schema,
        ) => (req: Request, res: Response, next: NextFunction) => void
      >(TYPES.ValidationMiddleware);
      expect(validateRequest).toBeDefined();
      expect(typeof validateRequest).toBe("function");
    });

    it("should register rate limit middleware", () => {
      const rateLimitMiddleware = testContainer.get<
        (
          limiterKey: string,
        ) => (req: Request, res: Response, next: NextFunction) => Promise<void>
      >(TYPES.RateLimitMiddleware);
      expect(rateLimitMiddleware).toBeDefined();
      expect(typeof rateLimitMiddleware).toBe("function");
    });
  });

  describe("Circular Dependency Handling", () => {
    let testContainer: Container;

    beforeEach(() => {
      testContainer = createContainer();
    });

    it("should handle WebSocketService circular dependency", () => {
      const webSocketService = testContainer.get<IWebSocketService>(
        TYPES.WebSocketService,
      );
      expect(webSocketService).toBeDefined();
    });

    it("should create WebSocketService with logger dependency", () => {
      const webSocketService = testContainer.get<IWebSocketService>(
        TYPES.WebSocketService,
      );
      expect(webSocketService).toBeDefined();
      // Verify logger was injected (implementation specific check)
      expect((webSocketService as any).logger).toBeDefined();
    });
  });

  describe("Default Container Instance", () => {
    it("should export a default container instance", () => {
      expect(container).toBeDefined();
      expect(container).toBeInstanceOf(Container);
    });

    it("should have the same instance for default cache key", () => {
      const defaultContainer = createContainer({ cacheKey: "default" });
      expect(container).toBe(defaultContainer);
    });
  });
});
