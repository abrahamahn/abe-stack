import "reflect-metadata";

import path from "path";

import { Request, Response, NextFunction } from "express";
import { Container } from "inversify";
import { Schema } from "joi";

import {
  ICacheService,
  CacheService,
  RedisCacheService,
  CacheConfigProvider,
  CacheProviderType,
} from "@/server/infrastructure/cache";
import {
  ConfigService,
  IConfigService,
  StorageConfigProvider,
  LoggingConfigService,
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
  ImageProcessor,
  MediaProcessor,
  StreamProcessor,
} from "@/server/infrastructure/processor";
import { IWebSocketService } from "@/server/infrastructure/pubsub";
import {
  SecurityMiddlewareService,
} from "@/server/infrastructure/security";
import { rateLimitMiddleware } from "@/server/infrastructure/security/rateLimitMiddleware";
import {
  TokenBlacklist,
} from "@/server/infrastructure/security/TokenBlacklistService";
import {
  TokenStorage,
} from "@/server/infrastructure/security/TokenStorageService";
import { validateRequest } from "@/server/infrastructure/security/validationMiddleware";
import { ServerManager } from "@/server/infrastructure/server";
import {
  IStorageProvider,
  LocalStorageProvider,
  StorageService,
  IStorageService,
} from "@/server/infrastructure/storage";

// Import security interfaces

// Import the SecurityMiddlewareService

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
  options: { cacheKey?: string } = {}
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

  // Register security services
  registerSecurityServices(container);

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
  container.bind<LoggingConfigService>(TYPES.LoggingConfig).to(LoggingConfigService);

  // Register email service
  try {
    // Import email service directly instead of using require
    const {
      EmailService,
    } = require("../../modules/core/email/services/email.service");

    // Create a factory function that provides better error handling
    container
      .bind(TYPES.EmailService)
      .toDynamicValue((context) => {
        try {
          const logger = context.container.get<ILoggerService>(
            TYPES.LoggerService
          );
          const databaseService = context.container.get<any>(
            TYPES.DatabaseService
          );

          console.log(
            "Creating EmailService instance with proper dependencies"
          );
          return new EmailService(logger, databaseService);
        } catch (err) {
          console.error("Failed to create EmailService instance:", err);
          // Return a stub implementation to prevent app from crashing
          return {
            initialized: true,
            providerType: "stub",
            isConnected: () => true,
            sendEmail: async () => ({
              success: false,
              error: "Email service not properly initialized",
            }),
          };
        }
      })
      .inSingletonScope();

    console.log("EmailService registered successfully");
  } catch (error) {
    console.error("Failed to register EmailService:", error);
  }

  // Register storage service
  container.bind<IStorageService>(TYPES.StorageService).to(StorageService);
  container
    .bind<StorageConfigProvider>(TYPES.StorageConfig)
    .to(StorageConfigProvider);
  container
    .bind<IStorageProvider>(TYPES.StorageProvider)
    .to(LocalStorageProvider);

  // Register cache configuration
  container
    .bind<CacheConfigProvider>(TYPES.CacheServiceConfig)
    .to(CacheConfigProvider);

  // Register cache service based on configuration
  container
    .bind<ICacheService>(TYPES.CacheService)
    .toDynamicValue((context) => {
      const cacheConfig = context.container.get<CacheConfigProvider>(
        TYPES.CacheServiceConfig
      );
      const config = cacheConfig.getConfig();
      const logger = context.container.get<ILoggerService>(TYPES.LoggerService);

      if (config.provider === CacheProviderType.REDIS) {
        const redisCache = new RedisCacheService(logger);
        return redisCache;
      } else {
        const memoryCache = new CacheService(logger);
        return memoryCache;
      }
    })
    .inSingletonScope();

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
        schema: Schema
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
        limiterKey: RateLimiterKeys
      ) => (req: Request, res: Response, next: NextFunction) => Promise<void>
    >(TYPES.RateLimitMiddleware)
    .toFunction(
      rateLimitMiddleware as (
        limiterKey: RateLimiterKeys
      ) => (req: Request, res: Response, next: NextFunction) => Promise<void>
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
  container.bind<IDatabaseServer>(TYPES.DatabaseServer).to(DatabaseServer);

  // Also bind DatabaseService to use the same implementation
  container.bind(TYPES.DatabaseService).to(DatabaseServer);

  // Register transaction service
  container
    .bind<TransactionService>(TYPES.TransactionService)
    .to(TransactionService);

  // Note: Verification services are now registered in the auth module
  // to avoid duplicate bindings and dependency conflicts
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
    basePath: path.join(process.cwd(), "project-data", "jobs"),
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

/**
 * Register security services with proper error handling and logging
 * @param container The DI container
 */
function registerSecurityServices(container: Container): void {
  try {
    // Import implementations here to avoid circular dependencies
    const securityModule = require("../security/index");
    const {
      InMemoryTokenStorage,
      InMemoryTokenBlacklist,
      TokenManager,
      CorsConfigService,
      WebSocketAuthService,
      CookieService,
    } = securityModule;

    // Create a dedicated security logger that inherits from main logger
    container
      .bind<ILoggerService>(TYPES.SecurityLogger)
      .toDynamicValue((context) => {
        const mainLogger = context.container.get<ILoggerService>(
          TYPES.LoggerService
        );
        return mainLogger.createLogger("security");
      });

    // Register token storage
    container
      .bind<TokenStorage>(TYPES.TokenStorage)
      .to(InMemoryTokenStorage)
      .inSingletonScope();

    // Register token blacklist
    container
      .bind<TokenBlacklist>(TYPES.TokenBlacklist)
      .to(InMemoryTokenBlacklist)
      .inSingletonScope();

    // Register token management service with error handling and logging
    container.bind(TYPES.TokenManager).to(TokenManager).inSingletonScope();

    // Register CORS configuration
    container.bind(TYPES.CorsConfig).to(CorsConfigService).inSingletonScope();

    // Register WebSocket authentication
    container
      .bind(TYPES.WsAuthentication)
      .to(WebSocketAuthService)
      .inSingletonScope();

    // Register cookie service
    container.bind(TYPES.CookieService).to(CookieService).inSingletonScope();

    // Register security middleware service
    container
      .bind(TYPES.SecurityMiddlewareService)
      .to(SecurityMiddlewareService)
      .inSingletonScope();

    // Register security audit logger
    container.bind(TYPES.SecurityAuditTrail).toDynamicValue((context) => {
      const securityLogger = context.container.get<ILoggerService>(
        TYPES.SecurityLogger
      );
      // This will be a specialized logger that adds extra security metadata to each log
      return securityLogger.withContext({
        component: "security-audit",
        auditTrail: true,
      });
    });
  } catch (error) {
    console.error("Failed to load security services:", error);

    // Register fallback implementations to prevent container from failing
    container
      .bind<ILoggerService>(TYPES.SecurityLogger)
      .toDynamicValue((context) => {
        const mainLogger = context.container.get<ILoggerService>(
          TYPES.LoggerService
        );
        return mainLogger.createLogger("security");
      });
  }
}

// Create and export a singleton container instance
export const container = createContainer({ cacheKey: "default" });

// Add testing utility methods
(container as any).setupCacheInstance = (instance: any) => {
  container.rebind(TYPES.CacheService).toConstantValue(instance);
};
