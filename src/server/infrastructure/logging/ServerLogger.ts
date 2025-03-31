import path from "path";

import type { ILoggerService } from "./index";

// Service interfaces
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

// Database connection info interface
interface DBConnectionInfo {
  host?: string;
  port?: number;
  database?: string;
  user?: string;
}

/**
 * Utility class for logging server status and connection information
 */
export class ServerLogger {
  private logger: ILoggerService;

  constructor(logger: ILoggerService) {
    this.logger = logger;
    this.logger.debug("ServerLogger initialized");
  }

  /**
   * Helper method to normalize path for display purposes
   */
  private normalizePath(pathToNormalize: string): string {
    return pathToNormalize.replace(/\\/g, "/");
  }

  /**
   * Helper to create a table row for service status
   */
  private createRow(
    name: string,
    status: boolean,
    details: string = "",
  ): string {
    const statusText = status ? "✓ Active" : "✗ Inactive";
    const statusColor = status ? "\x1b[32m" : "\x1b[31m"; // Green or Red
    return `│ ${name.padEnd(20)} │ ${statusColor}${statusText.padEnd(12)}\x1b[0m │ ${details.padEnd(30)} │`;
  }

  /**
   * Display infrastructure services status
   */
  displayInfrastructureServices(services: {
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
  }): void {
    const {
      logger,
      databaseService,
      cacheService,
      storageService,
      jobService,
      errorHandler,
      validationService,
      wss,
      pubSubService,
      imageProcessor,
      mediaProcessor,
      streamProcessor,
      storageProvider,
      config,
    } = services;

    try {
      // Database connection details - try environment variables or DATABASE object
      // First try the DATABASE object
      const dbConnectionInfo =
        (config.get("DATABASE") as DBConnectionInfo) || {};

      // Fall back to direct environment variables or DB/database connection info
      // Look at process.env if config doesn't have the values
      let dbHost = dbConnectionInfo.host;
      if (!dbHost) {
        dbHost =
          (config.get("DB_HOST") as string) || process.env.DB_HOST || "unknown";
      }

      let dbPort = dbConnectionInfo.port;
      if (!dbPort) {
        dbPort =
          Number(config.get("DB_PORT")) || Number(process.env.DB_PORT) || 5555;
      }

      let dbName = dbConnectionInfo.database;
      if (!dbName) {
        dbName =
          (config.get("DB_NAME") as string) || process.env.DB_NAME || "unknown";
      }

      let dbUser = dbConnectionInfo.user;
      if (!dbUser) {
        dbUser =
          (config.get("DB_USER") as string) || process.env.DB_USER || "unknown";
      }

      // Table borders
      const tableBorder =
        "┌──────────────────────┬──────────────┬────────────────────────────────┐";
      const tableHeader =
        "│ Service              │ Status       │ Details                        │";
      const tableDivider =
        "├──────────────────────┼──────────────┼────────────────────────────────┤";
      const tableBottom =
        "└──────────────────────┴──────────────┴────────────────────────────────┘";

      // Infrastructure Services Table
      console.log("\n\x1b[1mINFRASTRUCTURE SERVICES\x1b[0m");
      console.log(tableBorder);
      console.log(tableHeader);
      console.log(tableDivider);

      // Add rows for infrastructure services
      console.log(this.createRow("Logging", !!logger));

      // Check database connection status
      const dbIsConnected = !!(
        databaseService &&
        databaseService.isConnected &&
        databaseService.isConnected()
      );

      // Show connection status with appropriate details
      console.log(
        this.createRow(
          "Database",
          dbIsConnected,
          dbIsConnected
            ? `${dbHost}:${dbPort} (${dbName})`
            : "Not connected - Check configuration",
        ),
      );

      // Only show detailed DB info if connected
      if (dbIsConnected) {
        console.log(this.createRow("  DB User", true, dbUser));
        console.log(
          this.createRow(
            "  DB Connections",
            true,
            `Active: ${(databaseService && databaseService.getStats && databaseService.getStats()?.activeCount) || 0}`,
          ),
        );
      }

      // Check cache service status
      const cacheIsActive = !!(
        cacheService &&
        (typeof cacheService.isConnected === "function"
          ? cacheService.isConnected()
          : true)
      );

      console.log(
        this.createRow(
          "Cache",
          cacheIsActive,
          cacheIsActive
            ? `Hits: ${(cacheService && cacheService.getStats && cacheService.getStats()?.hits) || 0}`
            : "Not available",
        ),
      );

      // Check storage service
      const storageIsActive = !!storageService;
      console.log(
        this.createRow(
          "Storage",
          storageIsActive,
          storageIsActive
            ? `Path: ${config.storagePath || "uploads"}`
            : "Not available",
        ),
      );

      console.log(this.createRow("Jobs", !!jobService));
      console.log(this.createRow("Error Handler", !!errorHandler));
      console.log(this.createRow("Validation", !!validationService));

      // WebSocket status check
      const wsActive = !!(wss && wss.clients);
      const wsConnectionCount = wsActive && wss.clients ? wss.clients.size : 0;
      console.log(
        this.createRow(
          "WebSocket",
          wsActive,
          wsActive ? `Connections: ${wsConnectionCount}` : "Not available",
        ),
      );

      console.log(this.createRow("PubSub", !!pubSubService));
      console.log(this.createRow("Image Processor", !!imageProcessor));
      console.log(this.createRow("Media Processor", !!mediaProcessor));
      console.log(this.createRow("Stream Processor", !!streamProcessor));
      console.log(this.createRow("Storage Provider", !!storageProvider));

      console.log(tableBottom);
      console.log("\n");
    } catch (error) {
      console.error("Error displaying infrastructure services:", error);
    }
  }

  /**
   * Display business services status
   */
  displayBusinessServices(services: {
    metricsService?: unknown;
    emailService?: unknown;
    tokenService?: unknown;
    encryptionService?: unknown;
    sessionService?: unknown;
    messagingService?: unknown;
  }): void {
    const {
      metricsService,
      emailService,
      tokenService,
      encryptionService,
      sessionService,
      messagingService,
    } = services;

    // Table borders
    const tableBorder =
      "┌──────────────────────┬──────────────┬────────────────────────────────┐";
    const tableHeader =
      "│ Service              │ Status       │ Details                        │";
    const tableDivider =
      "├──────────────────────┼──────────────┼────────────────────────────────┤";
    const tableBottom =
      "└──────────────────────┴──────────────┴────────────────────────────────┘";

    // Business Services Table
    console.log("\n\x1b[1mBUSINESS SERVICES\x1b[0m");
    console.log(tableBorder);
    console.log(tableHeader);
    console.log(tableDivider);

    // Add rows for business services
    console.log(this.createRow("Metrics", !!metricsService));
    console.log(this.createRow("Email", !!emailService));
    console.log(this.createRow("Token", !!tokenService));
    console.log(this.createRow("Encryption", !!encryptionService));
    console.log(this.createRow("Session", !!sessionService));
    console.log(this.createRow("Messaging", !!messagingService));

    console.log(tableBottom);
    console.log("\n");
  }

  /**
   * Display connection information
   */
  displayConnectionInformation(
    port: number,
    configService: ConfigObject,
    infrastructureServices?: {
      databaseService?: DatabaseService;
      storageService?: unknown;
    },
  ): void {
    try {
      // Get database connection info
      const dbConnectionInfo =
        (configService.get("DATABASE") as DBConnectionInfo) || {};

      // Fall back to direct environment variables
      let dbHost = dbConnectionInfo.host;
      if (!dbHost) {
        dbHost =
          (configService.get("DB_HOST") as string) ||
          process.env.DB_HOST ||
          "localhost";
      }

      let dbPort = dbConnectionInfo.port;
      if (!dbPort) {
        dbPort =
          Number(configService.get("DB_PORT")) ||
          Number(process.env.DB_PORT) ||
          5432;
      }

      // Get environment info dynamically with consistent path separators
      const configDir = path.relative(
        process.cwd(),
        path.resolve(path.join(__dirname, "../../infrastructure/config")),
      );
      const envPath = path.join(configDir, ".env");
      const envFile = `.env.${process.env.NODE_ENV || "development"}`;

      console.log("\n\n\x1b[36m=== SERVICE CONNECTION INFORMATION ===\x1b[0m");
      console.log("\n\x1b[1mPORT INFORMATION SUMMARY:\x1b[0m");

      // Check if database is actually connected
      const dbIsConnected = !!(
        infrastructureServices?.databaseService?.isConnected &&
        infrastructureServices.databaseService.isConnected()
      );

      // Show database status with connection indicator
      console.log(
        `Database (PostgreSQL): \x1b[${dbIsConnected ? "32" : "31"}mhttp://${dbHost}:${dbPort}\x1b[0m ${!dbIsConnected ? "\x1b[31m[NOT CONNECTED]\x1b[0m" : ""}`,
      );

      // Show backend server information
      console.log(`Backend (Express): \x1b[32mhttp://localhost:${port}\x1b[0m`);
      console.log(`API URL: \x1b[32mhttp://localhost:${port}/api\x1b[0m`);

      // Check if storage is available
      const storageAvailable = !!infrastructureServices?.storageService;
      console.log(
        `File Server (Local): \x1b[${storageAvailable ? "32" : "31"}mhttp://localhost:${port}/uploads\x1b[0m ${!storageAvailable ? "\x1b[31m[NOT AVAILABLE]\x1b[0m" : ""}`,
      );

      // Show environment information
      console.log(
        `Env Directory: \x1b[32m${this.normalizePath(envPath)}/${envFile}\x1b[0m`,
      );
      console.log("");
    } catch (error) {
      console.error("Error displaying connection information:", error);
    }
  }

  /**
   * Display all service status tables and connection information
   */
  displayServerStatus(
    port: number,
    configService: ConfigObject,
    infrastructureServices: {
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
    businessServices: {
      metricsService?: unknown;
      emailService?: unknown;
      tokenService?: unknown;
      encryptionService?: unknown;
      sessionService?: unknown;
      messagingService?: unknown;
    },
  ): void {
    console.log("\n\x1b[36m=== SERVICE STATUS TABLES ===\x1b[0m");
    console.log("\n");

    // Display infrastructure services
    this.displayInfrastructureServices(infrastructureServices);

    // Display business services
    this.displayBusinessServices(businessServices);

    // Display connection information
    this.displayConnectionInformation(
      port,
      configService,
      infrastructureServices,
    );
  }
}
