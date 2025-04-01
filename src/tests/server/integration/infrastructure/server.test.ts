import fs from "fs";
import http from "http";
import path from "path";

import { Container } from "inversify";
import request from "supertest";
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
  ServerConfig,
  StorageService,
} from "@server/infrastructure";
import { DatabaseConfigProvider } from "@server/infrastructure/config/domain/DatabaseConfig";

import { TYPES } from "@/server/infrastructure/di/types";

describe("Server Infrastructure Integration Tests", () => {
  let container: Container;
  let serverManager: ServerManager;
  let logger: ILoggerService;
  let config: ServerConfig;
  let tempStoragePath: string;

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

    // Get logger instance
    logger = container.get<ILoggerService>(TYPES.LoggerService);

    // Create temporary storage path
    tempStoragePath = path.join(__dirname, "temp_storage");
    if (!fs.existsSync(tempStoragePath)) {
      fs.mkdirSync(tempStoragePath, { recursive: true });
    }

    // Setup server config
    config = {
      port: 0, // Let the system assign a random port
      host: "localhost",
      isProduction: false,
      storagePath: tempStoragePath,
    };

    // Create ServerManager instance
    serverManager = new ServerManager(logger, container);
  });

  afterEach(async () => {
    // Cleanup: Stop server and remove temp directory
    const server = serverManager.getServer();
    await new Promise<void>((resolve) => server.close(() => resolve()));

    if (fs.existsSync(tempStoragePath)) {
      fs.rmSync(tempStoragePath, { recursive: true, force: true });
    }
  });

  describe("Server Initialization", () => {
    it("should initialize server with all services", async () => {
      await serverManager.initialize(config);

      const app = serverManager.getApp();
      const server = serverManager.getServer();
      const wss = serverManager.getWebSocketServer();

      expect(app).toBeDefined();
      expect(server).toBeDefined();
      expect(server.listening).toBe(true);
      expect(wss).toBeDefined();
    });

    it("should find and use an available port", async () => {
      await serverManager.initialize(config);
      const server = serverManager.getServer();
      const address = server.address();

      expect(address).toBeDefined();
      if (typeof address === "object" && address !== null) {
        expect(address.port).toBeGreaterThan(0);
      }
    });

    it("should configure static file serving", async () => {
      await serverManager.initialize(config);
      const app = serverManager.getApp();

      // Create a test file in the storage directory
      const testFilePath = path.join(tempStoragePath, "test.txt");
      fs.writeFileSync(testFilePath, "test content");

      // Test file serving
      const response = await request(app).get("/uploads/test.txt");
      expect(response.status).toBe(200);
      expect(response.text).toBe("test content");
    });
  });

  describe("Service Management", () => {
    it("should load all required services", async () => {
      await serverManager.loadServices();

      // Access private services through any casting for testing
      const services = (serverManager as any).services;

      expect(services.configService).toBeDefined();
      expect(services.databaseService).toBeDefined();
      expect(services.cacheService).toBeDefined();
      expect(services.storageService).toBeDefined();
      expect(services.errorHandler).toBeDefined();
      expect(services.jobService).toBeDefined();
    });

    it("should initialize all core services", async () => {
      await serverManager.loadServices();
      await serverManager.initializeServices();

      const services = (serverManager as any).services;

      // Verify services are initialized
      expect(services.databaseService.isConnected()).toBe(true);
      expect(services.cacheService.isConnected()).toBe(true);
    });

    it("should handle optional service initialization", async () => {
      // Bind an optional service
      container.bind(TYPES.ValidationService).toConstantValue({
        initialize: async () => Promise.resolve(),
      });

      await serverManager.loadServices();
      await serverManager.initializeServices();

      const services = (serverManager as any).services;
      expect(services.validationService).toBeDefined();
    });
  });

  describe("Middleware and Error Handling", () => {
    it("should apply security middleware in production", async () => {
      const prodConfig = { ...config, isProduction: true };
      await serverManager.initialize(prodConfig);
      const app = serverManager.getApp();

      const response = await request(app).get("/");
      expect(response.headers).toHaveProperty("x-frame-options");
    });

    it("should handle errors through error handler", async () => {
      await serverManager.initialize(config);
      const app = serverManager.getApp();

      // Add a route that throws an error
      app.get("/error", () => {
        throw new Error("Test error");
      });

      const response = await request(app).get("/error");
      expect(response.status).toBe(500);
    });

    it("should log requests with duration", async () => {
      await serverManager.initialize(config);
      const app = serverManager.getApp();

      // Spy on logger
      const infoSpy = vi.spyOn(logger, "info");

      await request(app).get("/");

      expect(infoSpy).toHaveBeenCalled();
      const logCall = infoSpy.mock.calls.find(
        (call) => call[0].includes("GET") && call[0].includes("ms"),
      );
      expect(logCall).toBeDefined();
    });
  });

  describe("Graceful Shutdown", () => {
    it("should handle graceful shutdown", async () => {
      await serverManager.initialize(config);

      const server = serverManager.getServer();
      const wss = serverManager.getWebSocketServer();

      // Spy on close methods
      const serverCloseSpy = vi.spyOn(server, "close");
      const wssCloseSpy = vi.spyOn(wss, "close");

      // Setup shutdown handlers
      serverManager.setupGracefulShutdown();

      // Simulate SIGTERM
      process.emit("SIGTERM");

      // Wait for shutdown operations
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(serverCloseSpy).toHaveBeenCalled();
      expect(wssCloseSpy).toHaveBeenCalled();
    });
  });

  describe("Server Status", () => {
    it("should display server status information", async () => {
      await serverManager.initialize(config);

      // Spy on logger
      const infoSpy = vi.spyOn(logger, "info");

      serverManager.displayServerStatus();

      // Verify status display calls
      expect(infoSpy).toHaveBeenCalled();
      expect(
        infoSpy.mock.calls.some((call) => call[0].includes("Server Status")),
      ).toBe(true);
    });

    it("should handle errors during status display", async () => {
      await serverManager.initialize(config);

      // Force an error in status display
      const errorSpy = vi.spyOn(logger, "error");
      vi.spyOn(serverManager as any, "serverLogger").mockImplementation(() => {
        throw new Error("Status display error");
      });

      serverManager.displayServerStatus();

      expect(errorSpy).toHaveBeenCalledWith(
        "Error during server status display",
        expect.any(Object),
      );
    });
  });

  describe("Service Loading", () => {
    it("should load all optional business services when available", async () => {
      // Bind all optional business services
      container.bind(TYPES.MetricsService).toConstantValue({});
      container.bind(TYPES.EmailService).toConstantValue({});
      container.bind(TYPES.TokenService).toConstantValue({});
      container.bind(TYPES.EncryptionService).toConstantValue({});
      container.bind(TYPES.SessionService).toConstantValue({});
      container.bind(TYPES.MessagingService).toConstantValue({});

      await serverManager.loadServices();
      const services = (serverManager as any).services;

      expect(services.businessServices.metricsService).toBeDefined();
      expect(services.businessServices.emailService).toBeDefined();
      expect(services.businessServices.tokenService).toBeDefined();
      expect(services.businessServices.encryptionService).toBeDefined();
      expect(services.businessServices.sessionService).toBeDefined();
      expect(services.businessServices.messagingService).toBeDefined();
    });

    it("should load all infrastructure services when available", async () => {
      // Bind all infrastructure services
      container.bind(TYPES.MessageBus).toConstantValue({});
      container.bind(TYPES.ImageProcessor).toConstantValue({});
      container.bind(TYPES.MediaProcessor).toConstantValue({});
      container.bind(TYPES.StreamProcessor).toConstantValue({});
      container.bind(TYPES.StorageProvider).toConstantValue({});

      await serverManager.loadServices();
      const services = (serverManager as any).services;

      expect(services.infrastructureServices.messageBus).toBeDefined();
      expect(services.infrastructureServices.imageProcessor).toBeDefined();
      expect(services.infrastructureServices.mediaProcessor).toBeDefined();
      expect(services.infrastructureServices.streamProcessor).toBeDefined();
      expect(services.infrastructureServices.storageProvider).toBeDefined();
    });

    it("should handle missing optional business services gracefully", async () => {
      await serverManager.loadServices();
      const services = (serverManager as any).services;

      expect(services.businessServices.metricsService).toBeNull();
      expect(services.businessServices.emailService).toBeNull();
      expect(services.businessServices.tokenService).toBeNull();
    });

    it("should load infrastructure services when available", async () => {
      // Bind infrastructure services
      container.bind(TYPES.MessageBus).toConstantValue({});
      container.bind(TYPES.ImageProcessor).toConstantValue({});
      container.bind(TYPES.MediaProcessor).toConstantValue({});

      await serverManager.loadServices();
      const services = (serverManager as any).services;

      expect(services.infrastructureServices.messageBus).toBeDefined();
      expect(services.infrastructureServices.imageProcessor).toBeDefined();
      expect(services.infrastructureServices.mediaProcessor).toBeDefined();
    });

    it("should handle service loading errors gracefully", async () => {
      // Force a service loading error
      vi.spyOn(container, "get").mockImplementationOnce(() => {
        throw new Error("Service loading error");
      });

      await serverManager.loadServices();
      const services = (serverManager as any).services;

      expect(services.configService).toBeNull();
    });
  });

  describe("Port Management", () => {
    it("should find an available port when preferred port is taken", async () => {
      const preferredPort = 3000;
      const mockServer = {
        listen: vi
          .fn()
          .mockImplementationOnce(() => {
            throw new Error("Port in use");
          })
          .mockImplementationOnce(() => {}),
        close: vi.fn(),
      };

      vi.spyOn(http, "createServer").mockReturnValue(mockServer as any);

      const port = await serverManager.findAvailablePort(preferredPort);
      expect(port).toBeGreaterThan(preferredPort);
      expect(mockServer.listen).toHaveBeenCalledTimes(2);
    });

    it("should handle port availability check failures", async () => {
      const mockServer = {
        listen: vi.fn().mockImplementation(() => {
          throw new Error("Port check failed");
        }),
        close: vi.fn(),
      };

      vi.spyOn(http, "createServer").mockReturnValue(mockServer as any);

      await expect(serverManager.findAvailablePort(3000)).rejects.toThrow();
    });
  });

  describe("WebSocket Server", () => {
    it("should initialize WebSocket server with correct options", async () => {
      await serverManager.initialize(config);
      const wss = serverManager.getWebSocketServer();

      expect(wss).toBeDefined();
      expect(wss.options.server).toBeDefined();
    });

    it("should handle WebSocket client connections", async () => {
      await serverManager.initialize(config);
      const wss = serverManager.getWebSocketServer();

      const mockClient = {
        on: vi.fn(),
        send: vi.fn(),
      };

      wss.emit("connection", mockClient);
      expect(mockClient.on).toHaveBeenCalled();
    });

    it("should handle WebSocket errors", async () => {
      await serverManager.initialize(config);
      const wss = serverManager.getWebSocketServer();

      const errorSpy = vi.spyOn(logger, "error");
      wss.emit("error", new Error("WebSocket error"));

      expect(errorSpy).toHaveBeenCalledWith(
        "WebSocket server error",
        expect.any(Object),
      );
    });
  });

  describe("Storage Configuration", () => {
    it("should update storage base URL correctly", async () => {
      await serverManager.initialize(config);
      const storageService = (serverManager as any).services.storageService;

      const updateSpy = vi.spyOn(storageService, "updateBaseUrl");
      serverManager.updateStorageBaseUrl();

      expect(updateSpy).toHaveBeenCalledWith(config.storagePath);
    });

    it("should handle storage service errors", async () => {
      const mockStorageService = {
        updateBaseUrl: vi.fn().mockImplementation(() => {
          throw new Error("Storage update error");
        }),
      };

      (serverManager as any).services.storageService = mockStorageService;

      const errorSpy = vi.spyOn(logger, "error");
      serverManager.updateStorageBaseUrl();

      expect(errorSpy).toHaveBeenCalledWith(
        "Failed to update storage base URL",
        expect.any(Object),
      );
    });
  });

  describe("Error Handling", () => {
    it("should handle service initialization failures", async () => {
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

    it("should handle graceful shutdown failures", async () => {
      const mockServer = {
        close: vi.fn().mockImplementation((callback) => {
          callback(new Error("Shutdown failed"));
        }),
      };

      (serverManager as any).server = mockServer;

      const errorSpy = vi.spyOn(logger, "error");
      serverManager.setupGracefulShutdown();
      process.emit("SIGTERM");

      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(errorSpy).toHaveBeenCalledWith(
        "Error during server shutdown",
        expect.any(Object),
      );
    });

    it("should propagate errors during initialization", async () => {
      const mockConfigService = {
        get: vi.fn().mockImplementation(() => {
          throw new Error("Config error");
        }),
      };

      (serverManager as any).services.configService = mockConfigService;

      await expect(serverManager.initialize(config)).rejects.toThrow(
        "Config error",
      );
    });
  });

  describe("Middleware Configuration", () => {
    it("should configure security middleware in production", async () => {
      const prodConfig = { ...config, isProduction: true };
      await serverManager.initialize(prodConfig);
      const app = serverManager.getApp();

      const response = await request(app).get("/");
      expect(response.headers).toHaveProperty("x-frame-options");
      expect(response.headers).toHaveProperty("x-content-type-options");
      expect(response.headers).toHaveProperty("x-xss-protection");
    });

    it("should configure error handling middleware", async () => {
      await serverManager.initialize(config);
      const app = serverManager.getApp();

      // Add a route that throws an error
      app.get("/error", () => {
        throw new Error("Test error");
      });

      const response = await request(app).get("/error");
      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("message");
    });

    it("should configure request logging middleware", async () => {
      await serverManager.initialize(config);
      const app = serverManager.getApp();

      const infoSpy = vi.spyOn(logger, "info");
      await request(app).get("/");

      expect(infoSpy).toHaveBeenCalled();
      const logCall = infoSpy.mock.calls.find(
        (call) => call[0].includes("GET") && call[0].includes("ms"),
      );
      expect(logCall).toBeDefined();
    });
  });

  describe("Service Stats", () => {
    it("should display database connection status", async () => {
      const mockDatabaseService = {
        isConnected: vi.fn().mockReturnValue(true),
        getStats: vi.fn().mockReturnValue({ activeCount: 5 }),
      };

      (serverManager as any).services.databaseService = mockDatabaseService;
      await serverManager.initialize(config);

      const infoSpy = vi.spyOn(logger, "info");
      serverManager.displayServerStatus();

      expect(infoSpy).toHaveBeenCalled();
      expect(
        infoSpy.mock.calls.some((call) => call[0].includes("Database Status")),
      ).toBe(true);
    });

    it("should display cache service status", async () => {
      const mockCacheService = {
        isConnected: vi.fn().mockReturnValue(true),
        getStats: vi.fn().mockReturnValue({ hits: 100 }),
      };

      (serverManager as any).services.cacheService = mockCacheService;
      await serverManager.initialize(config);

      const infoSpy = vi.spyOn(logger, "info");
      serverManager.displayServerStatus();

      expect(infoSpy).toHaveBeenCalled();
      expect(
        infoSpy.mock.calls.some((call) => call[0].includes("Cache Status")),
      ).toBe(true);
    });

    it("should display WebSocket connection status", async () => {
      await serverManager.initialize(config);
      const wss = serverManager.getWebSocketServer();

      // Mock WebSocket clients
      (wss as any).clients = new Set([1, 2, 3]);

      const infoSpy = vi.spyOn(logger, "info");
      serverManager.displayServerStatus();

      expect(infoSpy).toHaveBeenCalled();
      expect(
        infoSpy.mock.calls.some((call) => call[0].includes("WebSocket Status")),
      ).toBe(true);
    });
  });
});
