import path from "path";

import { Container } from "inversify";
import { WebSocketServer } from "ws";

import {
  CacheService,
  ConfigService,
  DatabaseServer,
  ErrorHandler,
  JobService,
  JobType,
  TYPES,
  LoggerService,
  WebSocketService,
  StorageService,
  LocalStorageProvider,
  IApplicationLifecycle,
  DependencyOrder,
  ApplicationLifecycle,
  ServerManager,
} from "@server/infrastructure";

describe("Infrastructure Layer Integration Tests", () => {
  let container: Container;
  let server: ServerManager;
  let lifecycle: IApplicationLifecycle;
  let testDir: string;

  beforeEach(async () => {
    // Setup test directories
    testDir = path.join(__dirname, "test_infrastructure");

    // Setup DI container
    container = new Container();

    // Bind core services
    container.bind(TYPES.LoggerService).to(LoggerService);
    container.bind(TYPES.ConfigService).to(ConfigService);
    container.bind(TYPES.DatabaseService).to(DatabaseServer);
    container.bind(TYPES.CacheService).to(CacheService);
    container.bind(TYPES.StorageProvider).to(LocalStorageProvider);
    container.bind(TYPES.StorageService).to(StorageService);
    container.bind(TYPES.ErrorHandler).to(ErrorHandler);
    container.bind(TYPES.JobService).to(JobService);
    container.bind(TYPES.WebSocketService).to(WebSocketService);

    // Get core service instances
    server = new ServerManager(container.get(TYPES.LoggerService), container);
    container.bind(TYPES.ApplicationLifecycle).to(ApplicationLifecycle);
    lifecycle = container.get<IApplicationLifecycle>(
      TYPES.ApplicationLifecycle,
    );
  });

  afterEach(async () => {
    // Cleanup
    await server.getServer().close();
    if (lifecycle) {
      await lifecycle.stop();
    }
  });

  describe("Infrastructure Layer Initialization", () => {
    test.skip("should initialize all infrastructure services in correct order", async () => {
      const initOrder: string[] = [];

      // Create dependencies for core infrastructure
      const dependencies: DependencyOrder[] = [
        {
          name: "config",
          startup: async () => {
            const configService = container.get<ConfigService>(
              TYPES.ConfigService,
            );
            await configService.initialize();
            initOrder.push("config");
          },
          shutdown: async () => {
            // Config shutdown
          },
        },
        {
          name: "database",
          dependencies: ["config"],
          startup: async () => {
            const dbService = container.get<DatabaseServer>(
              TYPES.DatabaseService,
            );
            await dbService.initialize();
            initOrder.push("database");
          },
          shutdown: async () => {
            const dbService = container.get<DatabaseServer>(
              TYPES.DatabaseService,
            );
            await dbService.close();
          },
        },
        {
          name: "cache",
          dependencies: ["config"],
          startup: async () => {
            const cacheService = container.get<CacheService>(
              TYPES.CacheService,
            );
            await cacheService.initialize();
            initOrder.push("cache");
          },
          shutdown: async () => {
            const cacheService = container.get<CacheService>(
              TYPES.CacheService,
            );
            await cacheService.shutdown();
          },
        },
        {
          name: "storage",
          dependencies: ["config"],
          startup: async () => {
            const storageService = container.get<StorageService>(
              TYPES.StorageService,
            );
            await storageService.initialize();
            initOrder.push("storage");
          },
          shutdown: async () => {
            const storageService = container.get<StorageService>(
              TYPES.StorageService,
            );
            await storageService.shutdown();
          },
        },
        {
          name: "websocket",
          dependencies: ["config"],
          startup: async () => {
            const wsService = container.get<WebSocketService>(
              TYPES.WebSocketService,
            );
            wsService.initialize(server.getServer());
            initOrder.push("websocket");
          },
          shutdown: async () => {
            const wsService = container.get<WebSocketService>(
              TYPES.WebSocketService,
            );
            wsService.close();
          },
        },
        {
          name: "jobs",
          dependencies: ["database", "cache"],
          startup: async () => {
            const jobService = container.get<JobService>(TYPES.JobService);
            await jobService.initialize();
            initOrder.push("jobs");
          },
          shutdown: async () => {
            const jobService = container.get<JobService>(TYPES.JobService);
            await jobService.shutdown();
          },
        },
      ];

      // Register dependencies
      dependencies.forEach((dep) => {
        lifecycle.register(dep.name, dep.dependencies || [], {
          start: dep.startup,
          stop: dep.shutdown,
        });
      });

      // Initialize
      await lifecycle.start();

      // Verify initialization order
      expect(initOrder).toContain("config");
      expect(initOrder.indexOf("database")).toBeGreaterThan(
        initOrder.indexOf("config"),
      );
      expect(initOrder.indexOf("cache")).toBeGreaterThan(
        initOrder.indexOf("config"),
      );
      expect(initOrder.indexOf("jobs")).toBeGreaterThan(
        initOrder.indexOf("database"),
      );
      expect(initOrder.indexOf("jobs")).toBeGreaterThan(
        initOrder.indexOf("cache"),
      );
    });

    test.skip("should handle infrastructure service failures gracefully", async () => {
      // Mock a failing service
      const failingService = {
        initialize: jest.fn().mockRejectedValue(new Error("Service failed")),
        shutdown: jest.fn().mockResolvedValue(undefined),
      };
      container.rebind(TYPES.CacheService).toConstantValue(failingService);

      // Create dependency
      const failingDep: DependencyOrder = {
        name: "failing-cache",
        startup: async () => {
          const service = container.get<{
            initialize: () => Promise<void>;
            shutdown: () => Promise<void>;
          }>(TYPES.CacheService);
          await service.initialize();
        },
        shutdown: async () => {
          const service = container.get<{
            initialize: () => Promise<void>;
            shutdown: () => Promise<void>;
          }>(TYPES.CacheService);
          await service.shutdown();
        },
      };

      lifecycle.register(failingDep.name, failingDep.dependencies || [], {
        start: failingDep.startup,
        stop: failingDep.shutdown,
      });

      await expect(lifecycle.start()).rejects.toThrow("Service failed");
    });
  });

  describe("Infrastructure Service Integration", () => {
    test.skip("should handle database and cache interaction", async () => {
      const dbService = container.get<DatabaseServer>(TYPES.DatabaseService);
      const cacheService = container.get<CacheService>(TYPES.CacheService);

      await dbService.initialize();
      await cacheService.initialize();

      expect(dbService.isConnected()).toBe(true);
      await cacheService.set("test", "value");
      const value = await cacheService.get("test");
      expect(value).toBe("value");

      await dbService.close();
    });

    test.skip("should handle storage and websocket integration", async () => {
      const storageService = container.get<StorageService>(
        TYPES.StorageService,
      );
      const wsService = container.get<WebSocketService>(TYPES.WebSocketService);

      await storageService.initialize();
      wsService.initialize(server.getServer());

      const wss = server.getWebSocketServer();
      expect(wss).toBeInstanceOf(WebSocketServer);

      await storageService.shutdown();
      wsService.close();
    });

    test.skip("should handle job service integration", async () => {
      const jobService = container.get<JobService>(TYPES.JobService);
      await jobService.initialize();

      // Test job registration and processing
      const testJob = {
        type: JobType.MEDIA_PROCESSING,
        data: { test: true },
        handler: jest.fn(),
      };

      jobService.registerProcessor(testJob.type, testJob.handler);
      await jobService.addJob(testJob.type, testJob.data);

      // Allow time for job processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(testJob.handler).toHaveBeenCalledWith(testJob.data);

      await jobService.shutdown();
    });
  });

  describe("Server Integration", () => {
    test.skip("should start server with all services", async () => {
      await server.loadServices();
      await server.initializeServices();

      const config = {
        port: 0, // Let OS assign port
        host: "localhost",
        isProduction: false,
        storagePath: testDir,
      };

      await server.initialize(config);

      const address = server.getServer().address();
      const actualPort =
        typeof address === "object" ? address?.port : undefined;
      expect(actualPort).toBeGreaterThan(0);

      // Verify core services
      const services = server["services"]; // Access private field for testing
      expect(services.databaseService).toBeDefined();
      expect(services.cacheService).toBeDefined();
      expect(services.storageService).toBeDefined();
      expect(services.jobService).toBeDefined();
    });

    test.skip("should handle graceful shutdown", async () => {
      await server.loadServices();
      await server.initializeServices();

      const shutdownSpy = jest.spyOn(server.getServer(), "close");

      server.setupGracefulShutdown();
      process.emit("SIGTERM");

      // Allow time for shutdown
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(shutdownSpy).toHaveBeenCalled();
    });
  });
});
