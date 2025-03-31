import fs from "fs";
import path from "path";

import { Container } from "inversify";
import request from "supertest";

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
      const infoSpy = jest.spyOn(logger, "info");

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
      const serverCloseSpy = jest.spyOn(server, "close");
      const wssCloseSpy = jest.spyOn(wss, "close");

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
      const infoSpy = jest.spyOn(logger, "info");

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
      const errorSpy = jest.spyOn(logger, "error");
      jest
        .spyOn(serverManager as any, "serverLogger")
        .mockImplementation(() => {
          throw new Error("Status display error");
        });

      serverManager.displayServerStatus();

      expect(errorSpy).toHaveBeenCalledWith(
        "Error during server status display",
        expect.any(Object),
      );
    });
  });
});
