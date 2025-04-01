import { describe, it, expect, beforeEach, vi } from "vitest";

import { ServerManager, TYPES } from "@/server/infrastructure";

describe("ServerManager", () => {
  let serverManager: ServerManager;
  let mockLogger: any;
  let mockContainer: any;
  let mockErrorHandler: any;
  let mockJobService: any;
  let mockCacheService: any;
  let mockDatabaseService: any;
  let mockStorageService: any;
  let mockConfigService: any;
  let mockServerLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as any;

    mockConfigService = {
      get: vi.fn(),
      getString: vi.fn(),
      getNumber: vi.fn(),
    } as any;

    mockContainer = {
      get: vi.fn(),
      isBound: vi.fn(),
    } as any;

    mockErrorHandler = {
      handleError: vi.fn(),
    } as any;

    mockJobService = {
      initialize: vi.fn(),
    } as any;

    mockCacheService = {
      initialize: vi.fn(),
      isConnected: vi.fn(),
      getStats: vi.fn(),
    } as any;

    mockDatabaseService = {
      initialize: vi.fn(),
      isConnected: vi.fn(),
      getStats: vi.fn(),
    } as any;

    mockStorageService = {
      initialize: vi.fn(),
      updateBaseUrl: vi.fn(),
      createDirectory: vi.fn(),
      listFiles: vi.fn(),
      saveFile: vi.fn(),
      getFile: vi.fn(),
      getFileStream: vi.fn(),
      getFileMetadata: vi.fn(),
      deleteFile: vi.fn(),
      fileExists: vi.fn(),
      getFileUrl: vi.fn(),
    } as any;

    mockServerLogger = {
      displayServerStatus: vi.fn(),
    } as any;

    serverManager = new ServerManager(mockLogger, mockContainer);
  });

  describe("loadServices", () => {
    it("should load core infrastructure services", async () => {
      mockContainer.get.mockImplementation((type: any) => {
        switch (type) {
          case TYPES.ConfigService:
            return mockConfigService;
          case TYPES.DatabaseService:
            return mockDatabaseService;
          case TYPES.CacheService:
            return mockCacheService;
          case TYPES.StorageService:
            return mockStorageService;
          case TYPES.ErrorHandler:
            return mockErrorHandler;
          case TYPES.JobService:
            return mockJobService;
          default:
            return null;
        }
      });

      await serverManager.loadServices();

      expect(mockContainer.get).toHaveBeenCalledWith(TYPES.ConfigService);
      expect(mockContainer.get).toHaveBeenCalledWith(TYPES.DatabaseService);
      expect(mockContainer.get).toHaveBeenCalledWith(TYPES.CacheService);
      expect(mockContainer.get).toHaveBeenCalledWith(TYPES.StorageService);
      expect(mockContainer.get).toHaveBeenCalledWith(TYPES.ErrorHandler);
      expect(mockContainer.get).toHaveBeenCalledWith(TYPES.JobService);
    });

    it("should handle errors when loading services", async () => {
      mockContainer.get.mockImplementation(() => {
        throw new Error("Service loading failed");
      });

      await expect(serverManager.loadServices()).rejects.toThrow(
        "Service loading failed",
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it("should handle optional business services", async () => {
      mockContainer.get.mockImplementation((type: any) => {
        if (type === TYPES.ConfigService) return mockConfigService;
        if (type === TYPES.DatabaseService) return mockDatabaseService;
        if (type === TYPES.CacheService) return mockCacheService;
        if (type === TYPES.StorageService) return mockStorageService;
        if (type === TYPES.ErrorHandler) return mockErrorHandler;
        if (type === TYPES.JobService) return mockJobService;
        return null;
      });

      mockContainer.isBound.mockReturnValue(false);

      await serverManager.loadServices();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Some optional business services are not available",
        expect.any(Object),
      );
    });
  });

  describe("configureApp", () => {
    it("should configure Express app with middleware", () => {
      const config = {
        isProduction: true,
        storagePath: "/test/storage",
      };

      serverManager.configureApp(config as any);

      const app = serverManager.getApp();
      expect(app).toBeDefined();
    });

    it("should apply production settings when isProduction is true", () => {
      const config = {
        isProduction: true,
        storagePath: "/test/storage",
      };

      serverManager.configureApp(config as any);
      const app = serverManager.getApp();
      expect(app._router.stack).toContainEqual(
        expect.objectContaining({
          name: "helmetMiddleware",
        }),
      );
    });

    it("should configure static file serving", () => {
      const config = {
        isProduction: false,
        storagePath: "/test/storage",
      };

      serverManager.configureApp(config as any);
      const app = serverManager.getApp();
      expect(app._router.stack).toContainEqual(
        expect.objectContaining({
          name: "serveStatic",
        }),
      );
    });
  });

  describe("initializeServices", () => {
    it("should initialize all core services", async () => {
      mockContainer.get.mockImplementation((type: any) => {
        switch (type) {
          case TYPES.DatabaseService:
            return mockDatabaseService;
          case TYPES.CacheService:
            return mockCacheService;
          case TYPES.StorageService:
            return mockStorageService;
          case TYPES.JobService:
            return mockJobService;
          default:
            return null;
        }
      });

      await serverManager.initializeServices();

      expect(mockDatabaseService.initialize).toHaveBeenCalled();
      expect(mockCacheService.initialize).toHaveBeenCalled();
      expect(mockJobService.initialize).toHaveBeenCalled();
      expect(mockStorageService.initialize).toHaveBeenCalled();
    });

    it("should handle service initialization errors", async () => {
      mockContainer.get.mockImplementation((type: any) => {
        switch (type) {
          case TYPES.DatabaseService:
            return mockDatabaseService;
          case TYPES.CacheService:
            return mockCacheService;
          case TYPES.StorageService:
            return mockStorageService;
          case TYPES.JobService:
            return mockJobService;
          default:
            return null;
        }
      });

      mockDatabaseService.initialize.mockRejectedValue(
        new Error("Database initialization failed"),
      );

      await expect(serverManager.initializeServices()).rejects.toThrow(
        "Database initialization failed",
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("updateStorageBaseUrl", () => {
    it("should update storage base URL with correct port", () => {
      const port = 3000;
      serverManager["port"] = port;

      serverManager.updateStorageBaseUrl();

      expect(mockStorageService.updateBaseUrl).toHaveBeenCalledWith(
        `http://localhost:${port}/uploads`,
      );
    });

    it("should handle missing storage service", () => {
      serverManager["services"].storageService = null;
      serverManager["port"] = 3000;

      serverManager.updateStorageBaseUrl();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Failed to update storage base URL",
        expect.any(Object),
      );
    });
  });

  describe("displayServerStatus", () => {
    it("should display server status with all services", () => {
      serverManager["services"] = {
        configService: mockConfigService,
        databaseService: mockDatabaseService,
        cacheService: mockCacheService,
        storageService: mockStorageService,
        errorHandler: mockErrorHandler,
        jobService: mockJobService,
        validationService: null,
        infrastructureServices: {
          logger: mockLogger,
          databaseService: mockDatabaseService,
          cacheService: mockCacheService,
          storageService: mockStorageService,
          jobService: mockJobService,
          errorHandler: mockErrorHandler,
          wss: { clients: { size: 5 } },
        },
        businessServices: {},
      };

      serverManager.displayServerStatus();

      expect(mockServerLogger.displayServerStatus).toHaveBeenCalled();
    });

    it("should handle errors during status display", () => {
      serverManager["services"] = {
        configService: mockConfigService,
        databaseService: mockDatabaseService,
        cacheService: mockCacheService,
        storageService: mockStorageService,
        errorHandler: mockErrorHandler,
        jobService: mockJobService,
        validationService: null,
        infrastructureServices: {
          logger: mockLogger,
          databaseService: mockDatabaseService,
          cacheService: mockCacheService,
          storageService: mockStorageService,
          jobService: mockJobService,
          errorHandler: mockErrorHandler,
          wss: { clients: { size: 5 } },
        },
        businessServices: {},
      };

      mockServerLogger.displayServerStatus.mockImplementation(() => {
        throw new Error("Status display failed");
      });

      serverManager.displayServerStatus();

      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error during server status display",
        expect.any(Object),
      );
    });
  });

  describe("initialize", () => {
    it("should complete full initialization process", async () => {
      const config = {
        port: 3000,
        host: "localhost",
        isProduction: false,
        storagePath: "/test/storage",
      };

      mockContainer.get.mockImplementation((type: any) => {
        switch (type) {
          case TYPES.ConfigService:
            return mockConfigService;
          case TYPES.DatabaseService:
            return mockDatabaseService;
          case TYPES.CacheService:
            return mockCacheService;
          case TYPES.StorageService:
            return mockStorageService;
          case TYPES.ErrorHandler:
            return mockErrorHandler;
          case TYPES.JobService:
            return mockJobService;
          default:
            return null;
        }
      });

      await serverManager.initialize(config as any);

      expect(mockDatabaseService.initialize).toHaveBeenCalled();
      expect(mockCacheService.initialize).toHaveBeenCalled();
      expect(mockStorageService.initialize).toHaveBeenCalled();
      expect(mockJobService.initialize).toHaveBeenCalled();
      expect(mockStorageService.updateBaseUrl).toHaveBeenCalled();
    });

    it("should handle initialization errors", async () => {
      const config = {
        port: 3000,
        host: "localhost",
        isProduction: false,
        storagePath: "/test/storage",
      };

      mockContainer.get.mockImplementation(() => {
        throw new Error("Service loading failed");
      });

      await expect(serverManager.initialize(config as any)).rejects.toThrow(
        "Service loading failed",
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe("setupGracefulShutdown", () => {
    it("should set up shutdown handlers", () => {
      const mockProcess = {
        on: vi.fn(),
      };
      vi.spyOn(process, "on").mockImplementation(mockProcess.on);

      serverManager.setupGracefulShutdown();

      expect(mockProcess.on).toHaveBeenCalledWith(
        "SIGTERM",
        expect.any(Function),
      );
      expect(mockProcess.on).toHaveBeenCalledWith(
        "SIGINT",
        expect.any(Function),
      );
    });

    it("should close servers during shutdown", async () => {
      const mockServer = {
        close: vi.fn((callback) => callback()),
      };
      const mockWss = {
        close: vi.fn((callback) => callback()),
      };

      serverManager["server"] = mockServer as any;
      serverManager["wss"] = mockWss as any;

      vi.spyOn(process, "on").mockImplementation((signal, handler) => {
        if (signal === "SIGTERM") {
          handler();
        }
        return process;
      });

      serverManager.setupGracefulShutdown();

      expect(mockServer.close).toHaveBeenCalled();
      expect(mockWss.close).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith("HTTP server closed");
      expect(mockLogger.info).toHaveBeenCalledWith("WebSocket server closed");
    });
  });

  describe("getters", () => {
    it("should return Express app", () => {
      const app = serverManager.getApp();
      expect(app).toBeDefined();
    });

    it("should return HTTP server", () => {
      const server = serverManager.getServer();
      expect(server).toBeDefined();
    });

    it("should return WebSocket server", () => {
      const wss = serverManager.getWebSocketServer();
      expect(wss).toBeDefined();
    });
  });
});
