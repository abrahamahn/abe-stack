import "reflect-metadata";

import path from "path";

import { Container } from "inversify";

import { ICacheService, CacheService } from "@/server/infrastructure/cache";
import {
  ConfigService,
  IConfigService,
  StorageConfigProvider,
} from "@/server/infrastructure/config";
import {
  DatabaseConfigProvider,
  DatabaseServer,
  IDatabaseServer,
} from "@/server/infrastructure/database";
import { TYPES } from "@/server/infrastructure/di/types";
import { ErrorHandler } from "@/server/infrastructure/errors";
import {
  IJobService,
  IJobStorage,
  FileJobStorage,
  FileJobStorageConfig,
  JobServiceConfig,
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

// Cache for container instances
const containerCache = new Map<string, Container>();

/**
 * Create and configure the DI container
 * @param options Optional configuration options
 * @returns The configured container
 */
export function createContainer(
  options: { cacheKey?: string } = {},
): Container {
  // Check cache if cacheKey is provided
  if (options.cacheKey && containerCache.has(options.cacheKey)) {
    return containerCache.get(options.cacheKey)!;
  }

  const container = new Container({ defaultScope: "Singleton" });

  // Register infrastructure services
  registerInfrastructureServices(container);

  // Register database services
  registerDatabaseServices(container);

  // Register job system
  registerJobSystem(container);

  // Cache the container if cacheKey is provided
  if (options.cacheKey) {
    containerCache.set(options.cacheKey, container);
  }

  return container;
}

/**
 * Register infrastructure layer services
 * @param container The DI container
 */
function registerInfrastructureServices(container: Container): void {
  // Register configuration service
  container.bind<IConfigService>(TYPES.ConfigService).to(ConfigService);

  // Register logging services
  container.bind<ILoggerService>(TYPES.LoggerService).to(LoggerService);
  container.bind<LoggingConfig>(TYPES.LoggingConfig).to(LoggingConfig);

  // Register storage service
  container.bind<IStorageService>(TYPES.StorageService).to(StorageService);
  container
    .bind<StorageConfigProvider>(TYPES.StorageConfig)
    .to(StorageConfigProvider);
  container
    .bind<IStorageProvider>(TYPES.StorageProvider)
    .to(LocalStorageProvider);

  // Register simplified cache service
  container.bind<ICacheService>(TYPES.CacheService).to(CacheService);

  // Register error handler
  container.bind<ErrorHandler>(TYPES.ErrorHandler).to(ErrorHandler);
}

/**
 * Register database layer services
 * @param container The DI container
 */
function registerDatabaseServices(container: Container): void {
  // Register database configuration provider
  container
    .bind<DatabaseConfigProvider>(TYPES.DatabaseConfig)
    .to(DatabaseConfigProvider);

  // Register database service
  container.bind<IDatabaseServer>(TYPES.DatabaseService).to(DatabaseServer);
}

/**
 * Register simplified job system
 * @param container The DI container
 */
function registerJobSystem(container: Container): void {
  // Job service and storage
  container.bind<IJobService>(TYPES.JobService).to(JobService);
  container.bind<IJobStorage>(TYPES.JobStorage).to(FileJobStorage);

  // Configuration for job storage
  container.bind<FileJobStorageConfig>(TYPES.JobStorageConfig).toConstantValue({
    basePath: path.join(process.cwd(), "data", "jobs"),
    completedJobRetention: 24 * 60 * 60 * 1000, // 24 hours
    failedJobRetention: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Configuration for job service
  container.bind<JobServiceConfig>(TYPES.JobServiceConfig).toConstantValue({
    maxConcurrentJobs: 10,
    pollingInterval: 1000, // 1 second
    defaultJobOptions: {
      priority: 0,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  });
}

// Create and export a singleton container instance
export const container = createContainer({ cacheKey: "default" });
