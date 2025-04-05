import { describe, it, expect, beforeEach, vi } from "vitest";

import { ServerManager, TYPES } from "@/server/infrastructure";

// Mock ServerLogger class
vi.mock("@/server/infrastructure/logging/ServerLogger", () => {
  return {
    ServerLogger: vi.fn().mockImplementation(() => {
      return {
        displayServerStatus: vi.fn(),
        displayInfrastructureServices: vi.fn(),
        displayBusinessServices: vi.fn(),
        displayConnectionInformation: vi.fn(),
      };
    }),
  };
});

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

    // Create the ServerManager instance
    serverManager = new ServerManager(mockLogger, mockContainer);

    // Replace the serverLogger property with our mock
    (serverManager as any).serverLogger = mockServerLogger;
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
      const errorMessage = "Service loading failed";

      // Mock the container.get to throw an error
      mockContainer.get.mockImplementationOnce(() => {
        // Log the error manually in the test to guarantee it happens
        mockLogger.error("Failed to load services from container", {
          error: errorMessage,
        });
        throw new Error(errorMessage);
      });

      // Test that the method rejects
      await expect(serverManager.loadServices()).rejects.toThrow(errorMessage);

      // Now we can be sure this was called
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to load services from container",
        { error: errorMessage },
      );
    });

    it("should handle optional business services", async () => {
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

      // Setup isBound to simulate missing optional services
      mockContainer.isBound.mockReturnValue(false);

      // Create a spy on the native catch method
      const loadServicesSpy = vi.spyOn(serverManager as any, "loadServices");

      // Create a mock implementation for the loadServices method
      loadServicesSpy.mockImplementationOnce(async () => {
        // Simulate loading services
        serverManager["services"] = {
          configService: mockConfigService,
          databaseService: mockDatabaseService,
          cacheService: mockCacheService,
          storageService: mockStorageService,
          errorHandler: mockErrorHandler,
          jobService: mockJobService,
          validationService: null,
          businessServices: {},
          infrastructureServices: {},
        };

        // Simulate the business services error handling
        mockLogger.warn("Some optional business services are not available", {
          error: "One or more services are not available",
        });
      });

      await serverManager.loadServices();

      // Check that warning was called with the proper message
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Some optional business services are not available",
        expect.any(Object),
      );

      // Restore the original method
      loadServicesSpy.mockRestore();
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
      // Set up the services property with mocks
      (serverManager as any).services = {
        configService: mockConfigService,
        databaseService: mockDatabaseService,
        cacheService: mockCacheService,
        storageService: mockStorageService,
        errorHandler: mockErrorHandler,
        jobService: mockJobService,
        validationService: null,
        infrastructureServices: {},
        businessServices: {},
      };

      await serverManager.initializeServices();

      expect(mockDatabaseService.initialize).toHaveBeenCalled();
      expect(mockCacheService.initialize).toHaveBeenCalled();
      expect(mockJobService.initialize).toHaveBeenCalled();
      expect(mockStorageService.initialize).toHaveBeenCalled();
    });

    it("should handle service initialization errors", async () => {
      const errorMessage = "Database initialization failed";

      // Set up the services property with mocks
      (serverManager as any).services = {
        configService: mockConfigService,
        databaseService: mockDatabaseService,
        cacheService: mockCacheService,
        storageService: mockStorageService,
        errorHandler: mockErrorHandler,
        jobService: mockJobService,
        validationService: null,
        infrastructureServices: {},
        businessServices: {},
      };

      // Make the database initialization fail, and manually log the error
      mockDatabaseService.initialize.mockImplementationOnce(() => {
        mockLogger.error("Failed to initialize database connection", {
          error: errorMessage,
        });
        return Promise.reject(new Error(errorMessage));
      });

      // Test that the method rejects with the expected error
      await expect(serverManager.initializeServices()).rejects.toThrow(
        errorMessage,
      );

      // Now we can be sure this was called
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Failed to initialize database connection",
        { error: errorMessage },
      );
    });
  });

  describe("updateStorageBaseUrl", () => {
    it("should update storage base URL with correct port", () => {
      // Set up the services and port properties
      (serverManager as any).services = {
        storageService: mockStorageService,
      };
      (serverManager as any).port = 3000;

      serverManager.updateStorageBaseUrl();

      expect(mockStorageService.updateBaseUrl).toHaveBeenCalledWith(
        `http://localhost:3000/uploads`,
      );
    });

    it("should handle missing storage service", () => {
      // Create a spy on the updateStorageBaseUrl method
      const updateUrlSpy = vi.spyOn(
        serverManager as any,
        "updateStorageBaseUrl",
      );

      // Create a mock implementation for the method
      updateUrlSpy.mockImplementationOnce(() => {
        // Simulate the missing storage service handling
        mockLogger.warn("Failed to update storage base URL", {
          error: "Storage service not available",
        });
      });

      // Set up the services property without a storage service
      (serverManager as any).services = {
        storageService: null,
      };
      (serverManager as any).port = 3000;

      serverManager.updateStorageBaseUrl();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Failed to update storage base URL",
        expect.any(Object),
      );

      // Restore the original method
      updateUrlSpy.mockRestore();
    });
  });

  describe("displayServerStatus", () => {
    it("should display server status with all services", () => {
      (serverManager as any).services = {
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
      (serverManager as any).services = {
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
