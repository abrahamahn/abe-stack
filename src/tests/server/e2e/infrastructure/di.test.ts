import { Container } from "inversify";

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
} from "@/server/infrastructure/config";
import { DatabaseConfigProvider } from "@/server/infrastructure/database/DatabaseConfigProvider";
import { DatabaseServer } from "@/server/infrastructure/database/DatabaseServer";
import { IDatabaseServer } from "@/server/infrastructure/database/IDatabaseServer";
import { ErrorHandler } from "@/server/infrastructure/errors/ErrorHandler";
import {
  IJobService,
  IJobStorage,
  FileJobStorage,
  JobService,
} from "@/server/infrastructure/jobs";
import {
  ILoggerService,
  LoggerService,
  LoggingConfig,
} from "@/server/infrastructure/logging";
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
      expect(databaseConfig).toBeInstanceOf(DatabaseConfigProvider);
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
        initialize: jest.fn(),
        shutdown: jest.fn(),
        updateBaseUrl: jest.fn(),
        createDirectory: jest.fn(),
        saveFile: jest.fn(),
        getFile: jest.fn(),
        getFileStream: jest.fn(),
        getFileMetadata: jest.fn(),
        deleteFile: jest.fn(),
        fileExists: jest.fn(),
        listFiles: jest.fn(),
        copyFile: jest.fn(),
        moveFile: jest.fn(),
        getFileUrl: jest.fn(),
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
});
