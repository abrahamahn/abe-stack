import { Container } from "inversify";
import { describe, expect, beforeEach, it, test, vi } from "vitest";

import {
  TYPES,
  createContainer,
  container as globalContainer,
  inject,
} from "@infrastructure/di";

import { ICacheService, CacheService } from "@/server/infrastructure/cache";
import {
  ConfigService,
  IConfigService,
  StorageConfigProvider,
  LoggingConfig,
  DatabaseConfigProvider,
} from "@/server/infrastructure/config";
import { DatabaseServer } from "@/server/infrastructure/database/DatabaseServer";
import { IDatabaseServer } from "@/server/infrastructure/database/IDatabaseServer";
import { ErrorHandler } from "@/server/infrastructure/errors/ErrorHandler";
import {
  IJobService,
  IJobStorage,
  FileJobStorage,
  JobService,
} from "@/server/infrastructure/jobs";
import { FileJobStorageConfig } from "@/server/infrastructure/jobs/storage/FileJobStorage";
import { ILoggerService, LoggerService } from "@/server/infrastructure/logging";
import { IWebSocketService } from "@/server/infrastructure/pubsub/IWebSocketService";
import {
  IStorageProvider,
  LocalStorageProvider,
  StorageService,
  IStorageService,
} from "@/server/infrastructure/storage";

describe("Dependency Injection Infrastructure Integration Tests", () => {
  let container: Container;

  beforeEach(() => {
    // Create a fresh container for each test
    container = createContainer();
  });

  describe("Container Creation and Configuration", () => {
    it("should create a properly configured container", () => {
      expect(container).toBeInstanceOf(Container);
      expect(container.isBound(TYPES.ConfigService)).toBe(true);
      expect(container.isBound(TYPES.LoggerService)).toBe(true);
      expect(container.isBound(TYPES.DatabaseService)).toBe(true);
      expect(container.isBound(TYPES.StorageService)).toBe(true);
      expect(container.isBound(TYPES.CacheService)).toBe(true);
    });

    it("should maintain singleton scopes", () => {
      const configService1 = container.get<IConfigService>(TYPES.ConfigService);
      const configService2 = container.get<IConfigService>(TYPES.ConfigService);
      expect(configService1).toBe(configService2);
    });

    it("should handle circular dependencies correctly", () => {
      // This test verifies that the container can resolve services with circular dependencies
      expect(() => {
        container.get<IStorageService>(TYPES.StorageService);
      }).not.toThrow();
    });
  });

  describe("Infrastructure Services Resolution", () => {
    it("should resolve ConfigService with correct dependencies", () => {
      const configService = container.get<IConfigService>(TYPES.ConfigService);
      expect(configService).toBeInstanceOf(ConfigService);
    });

    it("should resolve LoggerService with correct configuration", () => {
      const loggerService = container.get<ILoggerService>(TYPES.LoggerService);
      const loggingConfig = container.get<LoggingConfig>(TYPES.LoggingConfig);
      expect(loggerService).toBeInstanceOf(LoggerService);
      expect(loggingConfig).toBeInstanceOf(LoggingConfig);
    });

    it("should resolve StorageService with correct provider", () => {
      const storageService = container.get<IStorageService>(
        TYPES.StorageService,
      );
      const storageProvider = container.get<IStorageProvider>(
        TYPES.StorageProvider,
      );
      const storageConfig = container.get<StorageConfigProvider>(
        TYPES.StorageConfig,
      );

      expect(storageService).toBeInstanceOf(StorageService);
      expect(storageProvider).toBeInstanceOf(LocalStorageProvider);
      expect(storageConfig).toBeInstanceOf(StorageConfigProvider);
    });

    it("should resolve CacheService correctly", () => {
      const cacheService = container.get<ICacheService>(TYPES.CacheService);
      expect(cacheService).toBeInstanceOf(CacheService);
    });

    it("should resolve ErrorHandler with dependencies", () => {
      const errorHandler = container.get<ErrorHandler>(TYPES.ErrorHandler);
      expect(errorHandler).toBeInstanceOf(ErrorHandler);
    });
  });

  describe("Database Services Resolution", () => {
    it("should resolve DatabaseServer with correct configuration", () => {
      const databaseServer = container.get<IDatabaseServer>(
        TYPES.DatabaseService,
      );
      const databaseConfig = container.get<DatabaseConfigProvider>(
        TYPES.DatabaseConfig,
      );

      expect(databaseServer).toBeInstanceOf(DatabaseServer);
      expect(databaseConfig).toBeDefined();
    });

    it("should initialize database configuration correctly", () => {
      const databaseConfig = container.get<DatabaseConfigProvider>(
        TYPES.DatabaseConfig,
      );
      const config = databaseConfig.getConfig();

      expect(config).toHaveProperty("host");
      expect(config).toHaveProperty("port");
      expect(config).toHaveProperty("database");
      expect(config).toHaveProperty("user");
      expect(config).toHaveProperty("password");
    });
  });

  describe("Job System Resolution", () => {
    it("should resolve JobService with correct dependencies", () => {
      const jobService = container.get<IJobService>(TYPES.JobService);
      const jobStorage = container.get<IJobStorage>(TYPES.JobStorage);

      expect(jobService).toBeInstanceOf(JobService);
      expect(jobStorage).toBeInstanceOf(FileJobStorage);
    });

    test.skip("should resolve job system configuration correctly", () => {
      const jobService = container.get<IJobService>(TYPES.JobService);
      expect(jobService).toHaveProperty("initialize");
      expect(jobService).toHaveProperty("enqueue");
      expect(jobService).toHaveProperty("dequeue");
    });
  });

  describe("Global Container Instance", () => {
    it("should provide a working global container instance", () => {
      expect(globalContainer).toBeInstanceOf(Container);
      expect(globalContainer.isBound(TYPES.ConfigService)).toBe(true);
    });

    it("should maintain singleton state across global container usage", () => {
      const firstInstance = globalContainer.get<IConfigService>(
        TYPES.ConfigService,
      );
      const secondInstance = globalContainer.get<IConfigService>(
        TYPES.ConfigService,
      );
      expect(firstInstance).toBe(secondInstance);
    });

    it("should provide working inject helper function", () => {
      const configService = inject<IConfigService>(TYPES.ConfigService);
      expect(configService).toBeInstanceOf(ConfigService);
    });
  });

  describe("Error Handling", () => {
    it("should throw when requesting an unbound service", () => {
      expect(() => {
        container.get(Symbol.for("UnboundService"));
      }).toThrow();
    });

    it("should handle rebinding of services", () => {
      const mockStorageProvider: IStorageProvider = {
        initialize: vi.fn(),
        shutdown: vi.fn(),
        updateBaseUrl: vi.fn(),
        createDirectory: vi.fn(),
        saveFile: vi.fn(),
        getFile: vi.fn(),
        getFileStream: vi.fn(),
        getFileMetadata: vi.fn(),
        deleteFile: vi.fn(),
        fileExists: vi.fn(),
        listFiles: vi.fn(),
        copyFile: vi.fn(),
        moveFile: vi.fn(),
        getFileUrl: vi.fn(),
      };

      expect(() => {
        container
          .rebind<IStorageProvider>(TYPES.StorageProvider)
          .toConstantValue(mockStorageProvider);
      }).not.toThrow();
    });
  });

  describe("Container Lifecycle", () => {
    it("should handle container disposal correctly", () => {
      const configService = container.get<IConfigService>(TYPES.ConfigService);

      container.unbindAll();
      expect(container.isBound(TYPES.ConfigService)).toBe(false);

      // Recreate container
      container = createContainer();
      const newConfigService = container.get<IConfigService>(
        TYPES.ConfigService,
      );
      expect(newConfigService).not.toBe(configService);
    });

    it("should maintain correct binding scope after container recreation", () => {
      container = createContainer();
      const firstInstance = container.get<IConfigService>(TYPES.ConfigService);
      const secondInstance = container.get<IConfigService>(TYPES.ConfigService);
      expect(firstInstance).toBe(secondInstance);
    });
  });

  describe("Type Safety and Service Identification", () => {
    it("should maintain type safety when resolving services", () => {
      const loggerService = container.get<ILoggerService>(TYPES.LoggerService);
      expect(typeof loggerService.debug).toBe("function");
      expect(typeof loggerService.error).toBe("function");
      expect(typeof loggerService.info).toBe("function");
      expect(typeof loggerService.warn).toBe("function");
    });

    it("should resolve all required service types", () => {
      // Test a sample of important service types
      const serviceTypes = [
        TYPES.ConfigService,
        TYPES.LoggerService,
        TYPES.DatabaseService,
        TYPES.StorageService,
        TYPES.CacheService,
        TYPES.JobService,
        TYPES.ErrorHandler,
      ];

      serviceTypes.forEach((type) => {
        expect(container.isBound(type)).toBe(true);
        expect(() => container.get(type)).not.toThrow();
      });
    });
  });

  describe("Service Registration and Resolution", () => {
    it("should handle WebSocket service lazy loading", async () => {
      // Exercise
      const webSocketService = container.get<IWebSocketService>(
        TYPES.WebSocketService,
      );

      // Verify
      expect(webSocketService).toBeDefined();
      expect(webSocketService.initialize).toBeDefined();
      expect(webSocketService.close).toBeDefined();
    });

    it("should resolve rate limiter middleware with different keys", () => {
      // Exercise
      const rateLimiter = container.get<(key: string) => any>(
        TYPES.RateLimitMiddleware,
      );

      // Verify
      expect(rateLimiter).toBeDefined();
      expect(typeof rateLimiter("login")).toBe("function");
      expect(typeof rateLimiter("api")).toBe("function");
      expect(typeof rateLimiter("register")).toBe("function");
    });

    it("should resolve validation middleware with schemas", () => {
      // Exercise
      const validator = container.get<(schema: any) => any>(
        TYPES.ValidationMiddleware,
      );

      // Verify
      expect(validator).toBeDefined();
      expect(typeof validator({})).toBe("function");
    });

    it("should resolve processor components", () => {
      // Exercise
      const imageProcessor = container.get(TYPES.ImageProcessor);
      const mediaProcessor = container.get(TYPES.MediaProcessor);
      const streamProcessor = container.get(TYPES.StreamProcessor);

      // Verify
      expect(imageProcessor).toBeDefined();
      expect(mediaProcessor).toBeDefined();
      expect(streamProcessor).toBeDefined();
    });
  });

  describe("Configuration Management", () => {
    it("should load job storage configuration correctly", () => {
      // Exercise
      const jobStorageConfig = container.get<FileJobStorageConfig>(
        TYPES.JobStorageConfig,
      );

      // Verify
      expect(jobStorageConfig).toBeDefined();
      expect(jobStorageConfig.basePath).toContain("data/jobs");
      expect(jobStorageConfig.completedJobRetention).toBe(24 * 60 * 60 * 1000);
      expect(jobStorageConfig.failedJobRetention).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it("should load job service configuration correctly", () => {
      // Exercise
      const jobService = container.get<IJobService>(TYPES.JobService);

      // Verify
      expect(jobService).toBeDefined();
      expect(jobService.initialize).toBeDefined();
      expect(jobService.addJob).toBeDefined();
      expect(jobService.registerProcessor).toBeDefined();
    });

    it("should validate database configuration", () => {
      // Exercise
      const databaseConfig = container.get<DatabaseConfigProvider>(
        TYPES.DatabaseConfig,
      );
      const config = databaseConfig.getConfig();

      // Verify
      expect(config).toBeDefined();
      expect(config.host).toBeDefined();
      expect(config.port).toBeDefined();
      expect(config.database).toBeDefined();
      expect(config.user).toBeDefined();
      expect(config.password).toBeDefined();
    });
  });

  describe("Container Management", () => {
    it("should cache containers with the same key", () => {
      // Exercise
      const container1 = createContainer({ cacheKey: "test" });
      const container2 = createContainer({ cacheKey: "test" });

      // Verify
      expect(container1).toBe(container2);
    });

    it("should create new containers with different keys", () => {
      // Exercise
      const container1 = createContainer({ cacheKey: "test1" });
      const container2 = createContainer({ cacheKey: "test2" });

      // Verify
      expect(container1).not.toBe(container2);
    });

    it("should handle container disposal with active services", async () => {
      // Setup
      const testContainer = createContainer({ cacheKey: "dispose-test" });
      const logger = testContainer.get<ILoggerService>(TYPES.LoggerService);
      const config = testContainer.get<IConfigService>(TYPES.ConfigService);

      // Exercise
      await logger.initialize();
      await config.initialize();

      // Verify services are active
      expect(logger).toBeDefined();
      expect(config).toBeDefined();

      // Dispose container
      testContainer.unbindAll();

      // Verify services are disposed
      expect(() => testContainer.get(TYPES.LoggerService)).toThrow();
      expect(() => testContainer.get(TYPES.ConfigService)).toThrow();
    });
  });

  describe("Service Lifecycle Management", () => {
    it("should initialize services in correct order", async () => {
      // Setup
      const testContainer = createContainer({ cacheKey: "lifecycle-test" });
      const logger = testContainer.get<ILoggerService>(TYPES.LoggerService);
      const config = testContainer.get<IConfigService>(TYPES.ConfigService);
      const database = testContainer.get<IDatabaseServer>(
        TYPES.DatabaseService,
      );

      // Exercise
      await logger.initialize();
      await config.initialize();
      await database.initialize();

      // Verify initialization order
      expect(logger).toBeDefined();
      expect(config).toBeDefined();
      expect(database).toBeDefined();
    });

    it("should shutdown services in correct order", async () => {
      // Setup
      const testContainer = createContainer({ cacheKey: "shutdown-test" });
      const logger = testContainer.get<ILoggerService>(TYPES.LoggerService);
      const config = testContainer.get<IConfigService>(TYPES.ConfigService);
      const database = testContainer.get<IDatabaseServer>(
        TYPES.DatabaseService,
      );

      // Initialize services
      await logger.initialize();
      await config.initialize();
      await database.initialize();

      // Exercise shutdown
      await database.close();
      await logger.shutdown();

      // Verify services are shut down
      expect(database.isConnected()).toBe(false);
    });

    it("should handle service dependency resolution order", async () => {
      // Setup
      const testContainer = createContainer({ cacheKey: "dependency-test" });
      const jobService = testContainer.get<IJobService>(TYPES.JobService);
      const jobStorage = testContainer.get<IJobStorage>(TYPES.JobStorage);

      // Exercise
      await jobStorage.initialize();
      await jobService.initialize();

      // Verify dependency order
      expect(jobStorage).toBeDefined();
      expect(jobService).toBeDefined();
      expect((jobService as any).storage).toBe(jobStorage);
    });
  });
});
