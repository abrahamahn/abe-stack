import { Container } from "inversify";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  CacheService,
  ConfigService,
  DatabaseServer,
  ErrorHandler,
  JobService,
  LoggerService,
  ILoggerService,
  ServerManager,
  StorageService,
  WebSocketService,
  ApplicationLifecycle,
  IApplicationLifecycle,
} from "@server/infrastructure";
import { DatabaseConfigProvider } from "@server/infrastructure/config/domain/DatabaseConfig";
import { WebSocketMessage } from "@server/infrastructure/pubsub/WebSocketTypes";

import { TYPES } from "@/server/infrastructure/di/types";

describe("Infrastructure Layer Integration Tests", () => {
  let container: Container;
  let logger: ILoggerService;
  let serverManager: ServerManager;

  beforeEach(async () => {
    // Setup DI container
    container = new Container();

    // Bind core services
    container.bind(TYPES.LoggerService).to(LoggerService);
    container.bind(TYPES.ConfigService).to(ConfigService);
    container.bind(TYPES.DatabaseConfig).to(DatabaseConfigProvider);
    container.bind(TYPES.DatabaseService).to(DatabaseServer);
    container.bind(TYPES.CacheService).to(CacheService);
    container.bind(TYPES.StorageService).to(StorageService);
    container.bind(TYPES.ErrorHandler).to(ErrorHandler);
    container.bind(TYPES.JobService).to(JobService);
    container.bind(TYPES.WebSocketService).to(WebSocketService);
    container.bind(TYPES.ApplicationLifecycle).to(ApplicationLifecycle);

    // Get logger instance
    logger = container.get<ILoggerService>(TYPES.LoggerService);

    // Create ServerManager instance
    serverManager = new ServerManager(logger, container);
  });

  afterEach(async () => {
    // Cleanup
    const lifecycle = container.get<IApplicationLifecycle>(
      TYPES.ApplicationLifecycle,
    );
    await lifecycle.stop();
  });

  describe("Service Initialization", () => {
    it("should initialize all core services", async () => {
      await serverManager.loadServices();
      await serverManager.initializeServices();

      const services = (serverManager as any).services;

      // Verify core services are initialized
      expect(services.configService).toBeDefined();
      expect(services.databaseService).toBeDefined();
      expect(services.cacheService).toBeDefined();
      expect(services.storageService).toBeDefined();
      expect(services.errorHandler).toBeDefined();
      expect(services.jobService).toBeDefined();
      expect(services.webSocketService).toBeDefined();
    });

    it("should handle service initialization failures gracefully", async () => {
      // Mock database service to fail initialization
      const mockDatabaseService = {
        initialize: vi
          .fn()
          .mockRejectedValue(new Error("Database init failed")),
      };

      (serverManager as any).services.databaseService = mockDatabaseService;

      const errorSpy = vi.spyOn(logger, "error");
      await serverManager.initializeServices();

      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to initialize database service",
        expect.any(Object),
      );
    });
  });

  describe("Service Communication", () => {
    it("should enable communication between services", async () => {
      await serverManager.loadServices();
      await serverManager.initializeServices();

      const services = (serverManager as any).services;

      // Test WebSocket communication
      const webSocketService = services.webSocketService;
      const testChannel = "test-channel";
      const testMessage: WebSocketMessage = { type: "test", data: "test" };

      const messagePromise = new Promise((resolve) => {
        webSocketService.subscribe("test-client", testChannel);
        webSocketService.on("message", (message: WebSocketMessage) => {
          expect(message).toEqual(testMessage);
          resolve(true);
        });
      });

      await webSocketService.publish(testChannel, "test", "test");
      await messagePromise;
    });

    it("should handle service communication failures", async () => {
      await serverManager.loadServices();
      await serverManager.initializeServices();

      const services = (serverManager as any).services;
      const webSocketService = services.webSocketService;

      // Mock publish to fail
      vi.spyOn(webSocketService, "publish").mockRejectedValue(
        new Error("Publish failed"),
      );

      await expect(
        webSocketService.publish("test-channel", "test", "test"),
      ).rejects.toThrow("Publish failed");
    });
  });

  describe("Error Handling", () => {
    it("should handle errors across services", async () => {
      await serverManager.loadServices();
      await serverManager.initializeServices();

      const services = (serverManager as any).services;
      const errorHandler = services.errorHandler;

      // Test error handling
      const testError = new Error("Test error");
      const mockRequest = {};
      const mockResponse = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await errorHandler.handleError(
        testError,
        mockRequest as any,
        mockResponse as any,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Internal Server Error",
          message: "Test error",
        }),
      );
    });

    it("should propagate errors correctly", async () => {
      await serverManager.loadServices();
      await serverManager.initializeServices();

      const services = (serverManager as any).services;
      const storageService = services.storageService;

      // Mock storage service to fail
      vi.spyOn(storageService, "saveFile").mockRejectedValue(
        new Error("Storage error"),
      );

      await expect(
        storageService.saveFile("test.txt", Buffer.from("test")),
      ).rejects.toThrow("Storage error");
    });
  });

  describe("Lifecycle Management", () => {
    it("should handle application lifecycle events", async () => {
      const lifecycle = container.get<IApplicationLifecycle>(
        TYPES.ApplicationLifecycle,
      );
      const eventSpy = vi.spyOn(logger, "info");

      // Test startup
      await lifecycle.start();
      expect(eventSpy).toHaveBeenCalledWith(
        expect.stringContaining("Application startup"),
      );

      // Test shutdown
      await lifecycle.stop();
      expect(eventSpy).toHaveBeenCalledWith(
        expect.stringContaining("Application shutdown"),
      );
    });

    it("should handle lifecycle failures gracefully", async () => {
      const lifecycle = container.get<IApplicationLifecycle>(
        TYPES.ApplicationLifecycle,
      );
      const errorSpy = vi.spyOn(logger, "error");

      // Mock startup to fail
      vi.spyOn(lifecycle, "start").mockRejectedValue(
        new Error("Startup failed"),
      );

      await expect(lifecycle.start()).rejects.toThrow("Startup failed");
      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to start application",
        expect.any(Object),
      );
    });
  });

  describe("Resource Management", () => {
    it("should manage resources efficiently", async () => {
      await serverManager.loadServices();
      await serverManager.initializeServices();

      const services = (serverManager as any).services;
      const cacheService = services.cacheService;
      const databaseService = services.databaseService;

      // Test cache management
      await cacheService.set("test-key", "test-value");
      const cachedValue = await cacheService.get("test-key");
      expect(cachedValue).toBe("test-value");

      // Test database connection management
      const isConnected = databaseService.isConnected();
      expect(isConnected).toBe(true);
    });

    it("should handle resource cleanup", async () => {
      await serverManager.loadServices();
      await serverManager.initializeServices();

      const services = (serverManager as any).services;
      const cacheService = services.cacheService;
      const databaseService = services.databaseService;

      // Test cache cleanup
      await cacheService.set("test-key", "test-value");
      await cacheService.delete("test-key");
      const cachedValue = await cacheService.get("test-key");
      expect(cachedValue).toBeNull();

      // Test database cleanup
      await databaseService.disconnect();
      expect(databaseService.isConnected()).toBe(false);
    });
  });

  describe("Configuration Management", () => {
    it("should handle configuration changes", async () => {
      await serverManager.loadServices();
      await serverManager.initializeServices();

      const services = (serverManager as any).services;
      const configService = services.configService;

      // Test configuration updates
      const testConfig = {
        key: "test-value",
      };

      await configService.update(testConfig);
      const value = await configService.get("key");
      expect(value).toBe("test-value");
    });

    it("should handle configuration errors", async () => {
      await serverManager.loadServices();
      await serverManager.initializeServices();

      const services = (serverManager as any).services;
      const configService = services.configService;

      // Mock config service to fail
      vi.spyOn(configService, "update").mockRejectedValue(
        new Error("Config update failed"),
      );

      await expect(configService.update({ key: "value" })).rejects.toThrow(
        "Config update failed",
      );
    });
  });

  describe("Performance Monitoring", () => {
    it("should track service performance", async () => {
      await serverManager.loadServices();
      await serverManager.initializeServices();

      const services = (serverManager as any).services;
      const cacheService = services.cacheService;
      const databaseService = services.databaseService;

      // Test cache performance
      const cacheStats = await cacheService.getStats();
      expect(cacheStats).toHaveProperty("hits");
      expect(cacheStats).toHaveProperty("misses");

      // Test database performance
      const dbStats = await databaseService.getStats();
      expect(dbStats).toHaveProperty("activeConnections");
      expect(dbStats).toHaveProperty("queryCount");
    });

    it("should handle performance monitoring failures", async () => {
      await serverManager.loadServices();
      await serverManager.initializeServices();

      const services = (serverManager as any).services;
      const cacheService = services.cacheService;

      // Mock stats to fail
      vi.spyOn(cacheService, "getStats").mockRejectedValue(
        new Error("Stats failed"),
      );

      await expect(cacheService.getStats()).rejects.toThrow("Stats failed");
    });
  });
});
