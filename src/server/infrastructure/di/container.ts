import "reflect-metadata";

import path from "path";

import { Request, Response, NextFunction } from "express";
import { Container } from "inversify";
import { Schema } from "joi";

import { ICacheService, CacheService } from "@/server/infrastructure/cache";
import {
  ConfigService,
  IConfigService,
  StorageConfigProvider,
  LoggingConfig,
} from "@/server/infrastructure/config";
import {
  DatabaseConfigProvider,
  DatabaseServer,
  IDatabaseServer,
} from "@/server/infrastructure/database";
import { TransactionService } from "@/server/infrastructure/database/TransactionService";
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
  ApplicationLifecycle,
  IApplicationLifecycle,
} from "@/server/infrastructure/lifecycle";
import { ILoggerService, LoggerService } from "@/server/infrastructure/logging";
import {
  validateRequest,
  rateLimitMiddleware,
} from "@/server/infrastructure/middleware";
import {
  ImageProcessor,
  MediaProcessor,
  StreamProcessor,
} from "@/server/infrastructure/processor";
import { IWebSocketService } from "@/server/infrastructure/pubsub";
import { ServerManager } from "@/server/infrastructure/server";
import {
  IStorageProvider,
  LocalStorageProvider,
  StorageService,
  IStorageService,
} from "@/server/infrastructure/storage";

// Import IWebSocketService here but lazy-load the actual WebSocketService
// to avoid circular dependencies

// Cache for container instances
const containerCache = new Map<string, Container>();

// Create a factory to break circular dependency
class WebSocketServiceFactory {
  static createInstance(logger: ILoggerService): IWebSocketService {
    // Dynamic loading to avoid circular dependency
    const { WebSocketService } = require("../../pubsub/WebSocketService");
    return new WebSocketService(logger);
  }
}

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

  // Register application lifecycle
  container
    .bind<IApplicationLifecycle>(TYPES.ApplicationLifecycle)
    .to(ApplicationLifecycle);

  // Register processor components
  container.bind<ImageProcessor>(TYPES.ImageProcessor).to(ImageProcessor);
  container.bind<MediaProcessor>(TYPES.MediaProcessor).to(MediaProcessor);
  container.bind<StreamProcessor>(TYPES.StreamProcessor).to(StreamProcessor);

  // Register server components
  container.bind<ServerManager>(TYPES.ServerManager).to(ServerManager);

  // Register middleware components - using proper function signatures
  container
    .bind<
      (
        schema: Schema,
      ) => (req: Request, res: Response, next: NextFunction) => void
    >(TYPES.ValidationMiddleware)
    .toFunction(validateRequest);

  // Export the rateLimiters type for proper typing
  type RateLimiterKeys =
    | "login"
    | "register"
    | "passwordReset"
    | "tokenRefresh"
    | "emailVerification"
    | "mfaVerify"
    | "api";

  container
    .bind<
      (
        limiterKey: RateLimiterKeys,
      ) => (req: Request, res: Response, next: NextFunction) => Promise<void>
    >(TYPES.RateLimitMiddleware)
    .toFunction(
      rateLimitMiddleware as (
        limiterKey: RateLimiterKeys,
      ) => (req: Request, res: Response, next: NextFunction) => Promise<void>,
    );

  // Register WebSocketService lazily to avoid circular dependencies
  container
    .bind<IWebSocketService>(TYPES.WebSocketService)
    .toDynamicValue((context) => {
      const logger = context.container.get<ILoggerService>(TYPES.LoggerService);
      return WebSocketServiceFactory.createInstance(logger);
    });
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

  // Register transaction service
  container.bind(TYPES.TransactionService).to(TransactionService);
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
