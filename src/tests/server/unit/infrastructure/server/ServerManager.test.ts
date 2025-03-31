import { createServer, Server } from "http";

import { Container } from "inversify";

import {
  ICacheService,
  IDatabaseServer,
  IErrorHandler,
  IJobService,
  ILoggerService,
  ServerManager,
  IStorageService,
  TYPES,
} from "@/server/infrastructure";

describe("ServerManager", () => {
  let serverManager: ServerManager;
  let mockLogger: jest.Mocked<ILoggerService>;
  let mockContainer: jest.Mocked<Container>;
  let mockErrorHandler: jest.Mocked<IErrorHandler>;
  let mockJobService: jest.Mocked<IJobService>;
  let mockCacheService: jest.Mocked<ICacheService>;
  let mockDatabaseService: jest.Mocked<IDatabaseServer>;
  let mockStorageService: jest.Mocked<IStorageService>;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;

    mockContainer = {
      get: jest.fn(),
      isBound: jest.fn(),
    } as any;

    mockErrorHandler = {
      handleError: jest.fn(),
    } as any;

    mockJobService = {
      initialize: jest.fn(),
    } as any;

    mockCacheService = {
      initialize: jest.fn(),
      isConnected: jest.fn(),
      getStats: jest.fn(),
    } as any;

    mockDatabaseService = {
      initialize: jest.fn(),
      isConnected: jest.fn(),
      getStats: jest.fn(),
    } as any;

    mockStorageService = {
      createDirectory: jest.fn(),
      listFiles: jest.fn(),
      saveFile: jest.fn(),
      getFile: jest.fn(),
      getFileStream: jest.fn(),
      getFileMetadata: jest.fn(),
      deleteFile: jest.fn(),
      fileExists: jest.fn(),
      getFileUrl: jest.fn(),
    } as any;

    serverManager = new ServerManager(mockLogger, mockContainer);
  });

  describe("loadServices", () => {
    it("should load core infrastructure services", async () => {
      mockContainer.get.mockImplementation((type) => {
        switch (type) {
          case TYPES.ConfigService:
            return { get: jest.fn() };
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
      // Add more specific middleware checks as needed
    });
  });

  describe("initializeServices", () => {
    it("should initialize all core services", async () => {
      mockContainer.get.mockImplementation((type) => {
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
    });
  });

  describe("findAvailablePort", () => {
    it("should find an available port", async () => {
      const port = await serverManager.findAvailablePort(3000);
      expect(port).toBeGreaterThanOrEqual(3000);
      expect(port).toBeLessThan(3010);
    });

    it("should throw error if no ports available", async () => {
      // Mock all ports as unavailable
      jest.spyOn({ createServer }, "createServer").mockImplementation(
        () =>
          ({
            on: jest.fn(),
            listen: jest.fn(),
            close: jest.fn(),
          }) as unknown as Server,
      );

      await expect(serverManager.findAvailablePort(3000)).rejects.toThrow(
        "Could not find an available port",
      );
    });
  });

  describe("startServer", () => {
    it("should start server on available port", async () => {
      const config = {
        port: 3000,
        host: "localhost",
        isProduction: false,
        storagePath: "/test/storage",
      };

      const port = await serverManager.startServer(config as any);
      expect(port).toBeGreaterThanOrEqual(3000);
      expect(port).toBeLessThan(3010);
    });
  });

  describe("setupGracefulShutdown", () => {
    it("should set up shutdown handlers", () => {
      const mockProcess = {
        on: jest.fn(),
      };
      jest.spyOn(process, "on").mockImplementation(mockProcess.on);

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
