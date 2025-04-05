import http from "http";
import path from "path";

import express, {
  Express,
  Request,
  Response,
  NextFunction,
  RequestHandler,
} from "express";
import helmet from "helmet";
import { Container } from "inversify";
import { WebSocketServer } from "ws";

import { ICacheService } from "@/server/infrastructure/cache";
import { ConfigService } from "@/server/infrastructure/config";
import { IDatabaseServer } from "@/server/infrastructure/database";
import { TYPES } from "@/server/infrastructure/di";
import { IErrorHandler } from "@/server/infrastructure/errors";
import { IJobService } from "@/server/infrastructure/jobs";
import { ILoggerService } from "@/server/infrastructure/logging";
import { ServerLogger } from "@/server/infrastructure/logging/ServerLogger";
import { IStorageService } from "@/server/infrastructure/storage";

// Service interfaces used for type assertions
interface DatabaseService {
  isConnected?: () => boolean;
  getStats?: () => { activeCount?: number };
}

interface CacheService {
  isConnected?: () => boolean;
  getStats?: () => { hits?: number };
}

interface WebSocketService {
  clients?: { size: number };
}

interface ConfigObject {
  get: (key: string) => unknown;
  storagePath?: string;
}

/**
 * Server environment configuration
 */
export interface ServerConfig {
  port: number;
  host: string;
  isProduction: boolean;
  storagePath: string;
}

/**
 * ServerManager handles server initialization, port configuration, and connection setup
 */
export class ServerManager {
  private app: Express;
  private server: http.Server;
  private wss: WebSocketServer;
  private port: number;
  private logger: ILoggerService;
  private serverLogger: ServerLogger;
  private container: Container;
  private services: {
    configService: ConfigService | null;
    databaseService: IDatabaseServer | null;
    cacheService: ICacheService | null;
    storageService: IStorageService | null;
    errorHandler: IErrorHandler | null;
    jobService: IJobService | null;
    validationService: unknown;
    businessServices: Record<string, unknown>;
    infrastructureServices: Record<string, unknown>;
  };

  constructor(logger: ILoggerService, container: Container) {
    this.logger = logger;
    this.container = container;
    this.serverLogger = new ServerLogger(logger);
    this.app = express();
    this.server = http.createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.port = 0; // Will be set during initialization

    // Initialize empty services object
    this.services = {
      configService: null as ConfigService | null,
      databaseService: null as IDatabaseServer | null,
      cacheService: null as ICacheService | null,
      storageService: null as IStorageService | null,
      errorHandler: null as IErrorHandler | null,
      jobService: null as IJobService | null,
      validationService: null,
      businessServices: {},
      infrastructureServices: {},
    };
  }

  /**
   * Load all required services from the DI container
   */
  async loadServices(): Promise<void> {
    this.logger.info("Loading services from container");

    // Load core infrastructure services
    this.services.configService = this.container.get(TYPES.ConfigService);
    this.services.databaseService = this.container.get(TYPES.DatabaseService);
    this.services.cacheService = this.container.get(TYPES.CacheService);
    this.services.storageService = this.container.get(TYPES.StorageService);
    this.services.errorHandler = this.container.get(TYPES.ErrorHandler);
    this.services.jobService = this.container.get(TYPES.JobService);

    // Load optional validation service
    this.services.validationService = this.container.isBound(
      TYPES.ValidationService,
    )
      ? this.container.get(TYPES.ValidationService)
      : null;

    // Load business services
    const businessServices: Record<string, unknown> = {};

    try {
      businessServices.metricsService = this.container.isBound(
        TYPES.MetricsService,
      )
        ? this.container.get(TYPES.MetricsService)
        : null;

      businessServices.emailService = this.container.isBound(TYPES.EmailService)
        ? this.container.get(TYPES.EmailService)
        : null;

      businessServices.tokenService = this.container.isBound(TYPES.TokenService)
        ? this.container.get(TYPES.TokenService)
        : null;

      businessServices.encryptionService = this.container.isBound(
        TYPES.EncryptionService,
      )
        ? this.container.get(TYPES.EncryptionService)
        : null;

      businessServices.sessionService = this.container.isBound(
        TYPES.SessionService,
      )
        ? this.container.get(TYPES.SessionService)
        : null;

      businessServices.messagingService = this.container.isBound(
        TYPES.MessagingService,
      )
        ? this.container.get(TYPES.MessagingService)
        : null;
    } catch (err) {
      this.logger.warn("Some optional business services are not available", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    this.services.businessServices = businessServices;

    // Load additional infrastructure services
    const infrastructureServices: Record<string, unknown> = {
      logger: this.logger,
      databaseService: this.services.databaseService,
      cacheService: this.services.cacheService,
      storageService: this.services.storageService,
      jobService: this.services.jobService,
      errorHandler: this.services.errorHandler,
      validationService: this.services.validationService,
      wss: this.wss,
      config: this.services.configService,
    };

    try {
      infrastructureServices.pubSubService = this.container.isBound(
        TYPES["PubSubService" as keyof typeof TYPES] || Symbol("PubSubService"),
      )
        ? this.container.get(
            TYPES["PubSubService" as keyof typeof TYPES] ||
              Symbol("PubSubService"),
          )
        : null;
      if (infrastructureServices.pubSubService) {
        this.logger.info("PubSub service loaded");
        this.logger.info("PubSub service type:", {
          type: infrastructureServices.pubSubService.constructor.name,
        });
      } else {
        this.logger.warn("PubSub service not found in container");
      }

      infrastructureServices.imageProcessor = this.container.isBound(
        TYPES["ImageProcessor" as keyof typeof TYPES] ||
          Symbol("ImageProcessor"),
      )
        ? this.container.get(
            TYPES["ImageProcessor" as keyof typeof TYPES] ||
              Symbol("ImageProcessor"),
          )
        : null;
      if (infrastructureServices.imageProcessor) {
        this.logger.info("Image processor loaded");
        this.logger.info("Image processor type:", {
          type: infrastructureServices.imageProcessor.constructor.name,
        });
      } else {
        this.logger.warn("Image processor not found in container");
      }

      infrastructureServices.mediaProcessor = this.container.isBound(
        TYPES["MediaProcessor" as keyof typeof TYPES] ||
          Symbol("MediaProcessor"),
      )
        ? this.container.get(
            TYPES["MediaProcessor" as keyof typeof TYPES] ||
              Symbol("MediaProcessor"),
          )
        : null;
      if (infrastructureServices.mediaProcessor) {
        this.logger.info("Media processor loaded");
        this.logger.info("Media processor type:", {
          type: infrastructureServices.mediaProcessor.constructor.name,
        });
      } else {
        this.logger.warn("Media processor not found in container");
      }

      infrastructureServices.streamProcessor = this.container.isBound(
        TYPES["StreamProcessor" as keyof typeof TYPES] ||
          Symbol("StreamProcessor"),
      )
        ? this.container.get(
            TYPES["StreamProcessor" as keyof typeof TYPES] ||
              Symbol("StreamProcessor"),
          )
        : null;
      if (infrastructureServices.streamProcessor) {
        this.logger.info("Stream processor loaded");
        this.logger.info("Stream processor type:", {
          type: infrastructureServices.streamProcessor.constructor.name,
        });
      } else {
        this.logger.warn("Stream processor not found in container");
      }

      infrastructureServices.storageProvider = this.container.isBound(
        TYPES["StorageProvider" as keyof typeof TYPES] ||
          Symbol("StorageProvider"),
      )
        ? this.container.get(
            TYPES["StorageProvider" as keyof typeof TYPES] ||
              Symbol("StorageProvider"),
          )
        : null;
      if (infrastructureServices.storageProvider) {
        this.logger.info("Storage provider loaded");
        this.logger.info("Storage provider type:", {
          type: infrastructureServices.storageProvider.constructor.name,
        });
      } else {
        this.logger.warn("Storage provider not found in container");
      }
    } catch (err) {
      this.logger.warn(
        "Some additional infrastructure services are not available",
        {
          error: err instanceof Error ? err.message : String(err),
        },
      );
    }

    this.services.infrastructureServices = infrastructureServices;
  }

  /**
   * Configure the Express application with middleware and routes
   */
  configureApp(config: ServerConfig): void {
    const { isProduction, storagePath } = config;

    // Body parsing middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Apply production settings if needed
    if (isProduction) {
      // Basic server hardening settings including CORS
      this.app.use(
        helmet({
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", "data:"],
            },
          },
          // Force HTTPS in production
          hsts: {
            maxAge: 31536000, // 1 year in seconds
            includeSubDomains: true,
            preload: true,
          },
        }),
      );
    }

    // Try to configure cookie parser
    try {
      const cookieParserSymbol = Symbol.for("CookieParser");
      if (this.container.isBound(cookieParserSymbol)) {
        const cookieParser = this.container.get(cookieParserSymbol);
        if (typeof cookieParser === "function") {
          this.app.use(cookieParser as RequestHandler);
          this.logger.info("Cookie parser middleware configured");
        }
      }
    } catch (err) {
      this.logger.warn("Failed to configure cookie parser", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Try to configure CSRF protection
    try {
      const securityServiceSymbol = Symbol.for("SecurityService");
      if (this.container.isBound(securityServiceSymbol)) {
        const security = this.container.get(securityServiceSymbol);

        // Check if security service has CSRF middleware
        if (security && typeof security === "object") {
          const csrfToken = (security as any).csrfToken;
          const csrfProtection = (security as any).csrfProtection;

          if (
            typeof csrfToken === "function" &&
            typeof csrfProtection === "function"
          ) {
            // Get CSRF protection config from environment or use defaults
            const csrfSecret = this.services.configService?.getString(
              "CSRF_SECRET",
              "abe-stack-csrf-secret-key",
            );
            const csrfSecretBuffer = Buffer.from(
              csrfSecret || "abe-stack-csrf-secret-key",
            );

            // Generate CSRF tokens for all routes
            this.app.use(
              csrfToken({
                secretKey: csrfSecretBuffer,
                cookieName: "abe-csrf-token",
                headerName: "X-CSRF-Token",
                expiryMs: isProduction ? 3600000 : 86400000, // 1 hour in prod, 24 hours in dev
              }) as RequestHandler,
            );
            this.logger.info("CSRF token generation middleware configured");

            // Create a router for protected API routes
            const protectedRoutes = express.Router();
            protectedRoutes.use(
              csrfProtection({
                secretKey: csrfSecretBuffer,
                cookieName: "abe-csrf-token",
                headerName: "X-CSRF-Token",
                ignorePaths: [
                  "/api/webhook",
                  "/api/auth/login",
                  "/api/auth/logout",
                ],
              }) as RequestHandler,
            );

            // Mount protected router at /api
            this.app.use("/api", protectedRoutes);
            this.logger.info(
              "CSRF protection middleware configured for API routes",
            );
          }
        }
      }
    } catch (err) {
      this.logger.warn("Failed to configure CSRF protection", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Request logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on("finish", () => {
        const duration = Date.now() - start;
        const statusCode = res.statusCode;
        const level =
          statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

        this.logger[level](
          `${req.method} ${req.url} ${statusCode} ${duration}ms`,
          {
            method: req.method,
            url: req.url,
            status: statusCode,
            duration,
            ip: req.ip || req.socket.remoteAddress,
            userAgent: req.get("User-Agent") || "unknown",
          },
        );
      });
      next();
    });

    // Try to configure rate limiting
    try {
      const rateLimiterSymbol = Symbol.for("RateLimiter");
      if (isProduction && this.container.isBound(rateLimiterSymbol)) {
        const rateLimiter = this.container.get(rateLimiterSymbol);
        if (typeof rateLimiter === "function") {
          this.app.use(rateLimiter as RequestHandler);
          this.logger.info("Rate limiter middleware configured");
        }
      }
    } catch (err) {
      this.logger.warn("Failed to configure rate limiter", {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // Register file server for uploads
    const uploadsPath = path.resolve(storagePath);
    this.logger.info(`Serving static files from: ${uploadsPath}`);
    this.app.use("/uploads", express.static(uploadsPath));

    // Register error handling middleware
    this.app.use(
      (err: Error, req: Request, res: Response, _next: NextFunction) => {
        return this.services.errorHandler!.handleError(err, req, res);
      },
    );

    // 404 handler for all unmatched routes
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        error: "Not Found",
        message: `The requested resource at ${req.path} was not found`,
        path: req.path,
      });
    });
  }

  /**
   * Initialize all services
   */
  async initializeServices(): Promise<void> {
    this.logger.info("Initializing core infrastructure services");

    // Initialize database
    this.logger.info("Initializing database connection...");
    await this.services.databaseService!.initialize();
    this.logger.info("Database connection initialized successfully");

    // Log database configuration for debugging
    if (this.services.configService) {
      const dbHost = this.services.configService.getString(
        "DB_HOST",
        "localhost",
      );
      const dbPort = this.services.configService.getNumber("DB_PORT", 5432);
      const dbName = this.services.configService.getString(
        "DB_NAME",
        "abe_stack",
      );
      const dbUser = this.services.configService.getString(
        "DB_USER",
        "postgres",
      );

      this.logger.info("Database configuration for status display:", {
        host: dbHost,
        port: dbPort,
        database: dbName,
        user: dbUser,
      });
    }

    // Initialize cache
    this.logger.info("Initializing cache service...");
    await this.services.cacheService!.initialize();
    this.logger.info("Cache service initialized successfully");

    // Initialize storage
    this.logger.info("Initializing storage service...");
    await (
      this.services.storageService as unknown as { initialize(): Promise<void> }
    ).initialize();
    this.logger.info("Storage service initialized successfully");

    // Initialize jobs
    this.logger.info("Initializing job service...");
    await this.services.jobService!.initialize();
    this.logger.info("Job service initialized successfully");

    // Initialize optional services
    if (this.services.validationService) {
      this.logger.info("Initializing validation service...");
      await (
        this.services.validationService as unknown as {
          initialize(): Promise<void>;
        }
      ).initialize();
      this.logger.info("Validation service initialized successfully");
    }
  }

  /**
   * Find an available port to use
   */
  async findAvailablePort(preferredPort: number): Promise<number> {
    const isPortAvailable = (port: number): Promise<boolean> => {
      return new Promise((resolve) => {
        const tempServer = http.createServer();
        tempServer.once("error", () => {
          resolve(false);
        });
        tempServer.once("listening", () => {
          tempServer.close(() => resolve(true));
        });
        tempServer.listen(port);
      });
    };

    let port = preferredPort;
    let isAvailable = await isPortAvailable(port);

    // Try up to 10 ports after the preferred port
    while (!isAvailable && port < preferredPort + 10) {
      console.log(`Port ${port} is in use, trying ${port + 1}...`);
      port++;
      isAvailable = await isPortAvailable(port);
    }

    if (!isAvailable) {
      throw new Error(
        `Could not find an available port starting from ${preferredPort}`,
      );
    }

    console.log(`Found available port: ${port}`);
    return port;
  }

  /**
   * Start the server on the configured port
   */
  async startServer(config: ServerConfig): Promise<number> {
    try {
      // Find an available port
      this.port = await this.findAvailablePort(config.port);

      // Start listening
      return new Promise((resolve) => {
        this.server.listen(this.port, () => {
          this.logger.info(`Server listening on port ${this.port}`);
          resolve(this.port);
        });
      });
    } catch (error) {
      this.logger.error("Failed to start server", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update storage provider URL to match actual port
   */
  updateStorageBaseUrl(): void {
    try {
      const storageUrl = `http://localhost:${this.port}/uploads`;
      if (
        this.services.storageService &&
        typeof (
          this.services.storageService as unknown as {
            updateBaseUrl(url: string): void;
          }
        ).updateBaseUrl === "function"
      ) {
        (
          this.services.storageService as unknown as {
            updateBaseUrl(url: string): void;
          }
        ).updateBaseUrl(storageUrl);
      }
    } catch (err) {
      this.logger.warn("Failed to update storage base URL", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Display server status information
   */
  displayServerStatus(): void {
    try {
      this.serverLogger.displayServerStatus(
        this.port,
        this.services.configService as unknown as ConfigObject,
        this.services.infrastructureServices as unknown as {
          logger: ILoggerService;
          databaseService: DatabaseService;
          cacheService: CacheService;
          storageService: unknown;
          jobService: unknown;
          errorHandler: unknown;
          validationService: unknown;
          wss: WebSocketService;
          pubSubService: unknown;
          imageProcessor: unknown;
          mediaProcessor: unknown;
          streamProcessor: unknown;
          storageProvider: unknown;
          config: ConfigObject;
        },
        this.services.businessServices as Record<string, unknown>,
      );
    } catch (err) {
      this.logger.error("Error during server status display", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  /**
   * Initialize the server completely
   */
  async initialize(config: ServerConfig): Promise<void> {
    try {
      // 1. Load services from DI container
      await this.loadServices();

      // 2. Configure Express application
      this.configureApp(config);

      // 3. Initialize all services
      await this.initializeServices();

      // 4. Start the server
      await this.startServer(config);

      // 5. Update storage URL after port is known
      this.updateStorageBaseUrl();

      // 6. Display server status
      this.displayServerStatus();
    } catch (error) {
      this.logger.error("Failed to initialize server", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Set up graceful shutdown
   */
  setupGracefulShutdown(): void {
    const shutdown = async (signal: string): Promise<void> => {
      this.logger.info(`Received ${signal}. Starting graceful shutdown...`);

      // Close HTTP server first to stop accepting new connections
      this.server.close(() => {
        this.logger.info("HTTP server closed");
      });

      // Close WebSocket server
      this.wss.close(() => {
        this.logger.info("WebSocket server closed");
      });

      // Rest of your shutdown logic for each service...
      // For brevity, I've omitted the detailed shutdown code
    };

    // Register shutdown handlers
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }

  /**
   * Get the Express app instance
   */
  getApp(): Express {
    return this.app;
  }

  /**
   * Get the server instance
   */
  getServer(): http.Server {
    return this.server;
  }

  /**
   * Get the WebSocket server instance
   */
  getWebSocketServer(): WebSocketServer {
    return this.wss;
  }
}
