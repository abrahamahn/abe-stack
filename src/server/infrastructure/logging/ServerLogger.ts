import path from "path";

import type { ILoggerService } from "./ILoggerService";

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

// Unified logging interface for better integration
interface LogEntry {
  level: "debug" | "info" | "warn" | "error" | "success";
  service: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

// Enhanced color palette for better visual organization
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[94m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
};

/**
 * Unified Server Logger for Infrastructure Status
 * Integrates with development environment logging and provides production-ready status displays
 *
 * This logger focuses on SERVER INFRASTRUCTURE STATUS - what services are running inside the server
 * It complements the development environment logger which handles ENVIRONMENT ORCHESTRATION
 */
export class ServerLogger {
  private logger: ILoggerService;
  private startTime: number;
  private isDevelopment: boolean;

  constructor(logger: ILoggerService) {
    this.logger = logger;
    this.startTime = Date.now();
    this.isDevelopment = process.env.NODE_ENV === "development";
    this.logger.debug("Unified ServerLogger initialized", {
      environment: process.env.NODE_ENV,
      isDevelopment: this.isDevelopment,
    });
  }

  /**
   * Unified logging method that integrates with both dev and production environments
   */
  private log(entry: LogEntry): void {
    const { level, service, message, data } = entry;

    // Use the injected logger service for consistent logging
    switch (level) {
      case "debug":
        this.logger.debug(`[${service}] ${message}`, data);
        break;
      case "info":
        this.logger.info(`[${service}] ${message}`, data);
        break;
      case "warn":
        this.logger.warn(`[${service}] ${message}`, data);
        break;
      case "error":
        this.logger.error(`[${service}] ${message}`, data);
        break;
      case "success":
        this.logger.info(`[${service}] ✅ ${message}`, data);
        break;
    }
  }

  /**
   * Helper method to normalize path for display purposes
   */
  private normalizePath(pathToNormalize: string): string {
    return pathToNormalize.replace(/\\/g, "/");
  }

  /**
   * Enhanced table row creation with better formatting
   */
  private createRow(
    name: string,
    status: boolean,
    details: string = "",
    icon: string = ""
  ): string {
    const statusText = status ? "✓ Active" : "✗ Inactive";
    const statusColor = status ? colors.green : colors.red;
    const nameWithIcon = icon ? `${icon} ${name}` : name;

    return `│ ${nameWithIcon.padEnd(22)} │ ${statusColor}${statusText.padEnd(12)}${colors.reset} │ ${details.padEnd(35)} │`;
  }

  /**
   * Enhanced section header with better visual separation
   */
  private printSectionHeader(title: string, subtitle?: string): void {
    const width = 75;
    const padding = Math.max(0, Math.floor((width - title.length) / 2));

    console.log("");
    console.log(colors.brightMagenta + "═".repeat(width) + colors.reset);
    console.log(
      colors.brightMagenta +
        " ".repeat(padding) +
        title +
        " ".repeat(width - padding - title.length) +
        colors.reset
    );

    if (subtitle) {
      const subtitlePadding = Math.max(
        0,
        Math.floor((width - subtitle.length) / 2)
      );
      console.log(
        colors.cyan +
          " ".repeat(subtitlePadding) +
          subtitle +
          " ".repeat(width - subtitlePadding - subtitle.length) +
          colors.reset
      );
    }

    console.log(colors.brightMagenta + "═".repeat(width) + colors.reset);
    console.log("");
  }

  /**
   * Get comprehensive infrastructure status as structured data
   * This can be consumed by external monitoring systems or the dev environment logger
   */
  getInfrastructureStatus(services: {
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
  }): Record<string, unknown> {
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

    const dbConnectionInfo = this.extractDatabaseInfo(config);
    const dbIsConnected = this.checkDatabaseConnection(databaseService);
    const cacheIsActive = this.checkCacheService(cacheService);
    const wsActive = !!(wss && typeof wss.clients === "object");

    return {
      infrastructure: {
        logging: { active: !!logger, service: "System logging" },
        database: {
          connected: dbIsConnected,
          details: dbConnectionInfo,
          activeConnections: databaseService?.getStats?.()?.activeCount || 0,
        },
        cache: {
          active: cacheIsActive,
          hits: cacheService?.getStats?.()?.hits || 0,
        },
        storage: {
          active: !!storageService,
          path: config.storagePath || "uploads",
        },
        websocket: {
          active: wsActive,
          clients: wss?.clients?.size || 0,
        },
        services: {
          jobService: { active: !!jobService },
          errorHandler: { active: !!errorHandler },
          validation: { active: !!validationService },
          pubSub: { active: !!pubSubService },
          imageProcessor: { active: !!imageProcessor },
          mediaProcessor: { active: !!mediaProcessor },
          streamProcessor: { active: !!streamProcessor },
          storageProvider: { active: !!storageProvider },
        },
      },
      server: {
        uptime: ((Date.now() - this.startTime) / 1000).toFixed(1) + "s",
        startTime: new Date(this.startTime).toISOString(),
        environment: process.env.NODE_ENV || "development",
        pid: process.pid,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Enhanced infrastructure services display with better organization
   * Now focuses purely on visual display while logging structured data
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
    try {
      // Get structured status data
      const statusData = this.getInfrastructureStatus(services);

      // Log structured data for integration with dev environment
      this.log({
        level: "info",
        service: "INFRASTRUCTURE",
        message: "Infrastructure services status check completed",
        data: statusData,
      });

      // Only show visual display in development or when explicitly requested
      if (!this.isDevelopment && !process.env.SHOW_SERVER_STATUS) {
        return;
      }

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

      // Enhanced database connection details extraction
      const dbConnectionInfo = this.extractDatabaseInfo(config);

      // Enhanced table formatting
      const tableWidth = 75;
      const border = "┌" + "─".repeat(tableWidth - 2) + "┐";
      const separator = "├" + "─".repeat(tableWidth - 2) + "┤";
      const bottom = "└" + "─".repeat(tableWidth - 2) + "┘";

      this.printSectionHeader(
        "Infrastructure Services",
        "Core system components status"
      );

      console.log(border);
      console.log(
        `│${colors.bright} Service${" ".repeat(16)} │ Status       │ Details${" ".repeat(29)} │${colors.reset}`
      );
      console.log(separator);

      // Core Infrastructure Services
      console.log(
        this.createRow(
          "Logging Service",
          !!logger,
          "System logging active",
          "📝"
        )
      );

      // Enhanced database status checking
      const dbIsConnected = this.checkDatabaseConnection(databaseService);
      const dbDetails = dbIsConnected
        ? `${dbConnectionInfo.host}:${dbConnectionInfo.port} (${dbConnectionInfo.database})`
        : "Connection failed - Check configuration";

      console.log(this.createRow("Database", dbIsConnected, dbDetails, "🗄️"));

      // Show detailed DB info if connected
      if (dbIsConnected) {
        const activeConnections =
          databaseService?.getStats?.()?.activeCount || 0;
        console.log(
          this.createRow("  └─ User", true, dbConnectionInfo.user, "👤")
        );
        console.log(
          this.createRow(
            "  └─ Connections",
            true,
            `Active: ${activeConnections}`,
            "🔗"
          )
        );
      }

      // Enhanced cache service status
      const cacheIsActive = this.checkCacheService(cacheService);
      const cacheDetails = cacheIsActive
        ? `Hits: ${cacheService?.getStats?.()?.hits || 0}`
        : "Not available";

      console.log(
        this.createRow("Cache Service", cacheIsActive, cacheDetails, "⚡")
      );

      // Storage service with enhanced details
      const storageIsActive = !!storageService;
      const storageDetails = storageIsActive
        ? `Path: ${this.normalizePath(config.storagePath || "uploads")}`
        : "Not configured";

      console.log(
        this.createRow("Storage Service", storageIsActive, storageDetails, "💾")
      );

      // Job service
      const jobIsActive = !!jobService;
      console.log(
        this.createRow(
          "Job Service",
          jobIsActive,
          jobIsActive ? "Queue processing active" : "Not available",
          "⚙️"
        )
      );

      // Error handler
      const errorHandlerActive = !!errorHandler;
      console.log(
        this.createRow(
          "Error Handler",
          errorHandlerActive,
          errorHandlerActive ? "Global error handling" : "Not configured",
          "🚨"
        )
      );

      // Validation service
      const validationActive = !!validationService;
      console.log(
        this.createRow(
          "Validation",
          validationActive,
          validationActive ? "Input validation active" : "Not available",
          "✅"
        )
      );

      // WebSocket service with client count
      const wsActive = !!(wss && typeof wss.clients === "object");
      const wsDetails = wsActive
        ? `Connected clients: ${wss.clients?.size || 0}`
        : "Not available";

      console.log(this.createRow("WebSocket", wsActive, wsDetails, "🔌"));

      // Additional services
      console.log(
        this.createRow(
          "PubSub Service",
          !!pubSubService,
          pubSubService ? "Message broadcasting" : "Not available",
          "📡"
        )
      );
      console.log(
        this.createRow(
          "Image Processor",
          !!imageProcessor,
          imageProcessor ? "Image processing ready" : "Not available",
          "🖼️"
        )
      );
      console.log(
        this.createRow(
          "Media Processor",
          !!mediaProcessor,
          mediaProcessor ? "Media processing ready" : "Not available",
          "🎬"
        )
      );
      console.log(
        this.createRow(
          "Stream Processor",
          !!streamProcessor,
          streamProcessor ? "Stream processing ready" : "Not available",
          "🌊"
        )
      );
      console.log(
        this.createRow(
          "Storage Provider",
          !!storageProvider,
          storageProvider ? "File storage ready" : "Not available",
          "☁️"
        )
      );

      console.log(bottom);
      console.log("");
    } catch (error) {
      this.log({
        level: "error",
        service: "INFRASTRUCTURE",
        message: "Error displaying infrastructure services",
        data: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  /**
   * Extract database connection information with fallbacks
   */
  private extractDatabaseInfo(config: ConfigObject): DBConnectionInfo {
    const dbConnectionInfo = (config.get("DATABASE") as DBConnectionInfo) || {};

    return {
      host:
        dbConnectionInfo.host ||
        (config.get("DB_HOST") as string) ||
        process.env.DB_HOST ||
        "localhost",
      port:
        dbConnectionInfo.port ||
        Number(config.get("DB_PORT")) ||
        Number(process.env.DB_PORT) ||
        5432,
      database:
        dbConnectionInfo.database ||
        (config.get("DB_NAME") as string) ||
        process.env.DB_NAME ||
        "abe_stack",
      user:
        dbConnectionInfo.user ||
        (config.get("DB_USER") as string) ||
        process.env.DB_USER ||
        "postgres",
    };
  }

  /**
   * Enhanced database connection checking
   */
  private checkDatabaseConnection(databaseService: DatabaseService): boolean {
    return !!(
      databaseService &&
      databaseService.isConnected &&
      databaseService.isConnected()
    );
  }

  /**
   * Enhanced cache service checking
   */
  private checkCacheService(cacheService: CacheService): boolean {
    return !!(
      cacheService &&
      (typeof cacheService.isConnected === "function"
        ? cacheService.isConnected()
        : true)
    );
  }

  /**
   * Enhanced business services display
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

    // Log structured data
    this.log({
      level: "info",
      service: "BUSINESS",
      message: "Business services status check completed",
      data: {
        services: {
          metrics: { active: !!metricsService },
          email: { active: !!emailService },
          token: { active: !!tokenService },
          encryption: { active: !!encryptionService },
          session: { active: !!sessionService },
          messaging: { active: !!messagingService },
        },
        timestamp: new Date().toISOString(),
      },
    });

    // Only show visual display in development or when explicitly requested
    if (!this.isDevelopment && !process.env.SHOW_SERVER_STATUS) {
      return;
    }

    this.printSectionHeader(
      "Business Services",
      "Application-specific services"
    );

    const tableWidth = 75;
    const border = "┌" + "─".repeat(tableWidth - 2) + "┐";
    const separator = "├" + "─".repeat(tableWidth - 2) + "┤";
    const bottom = "└" + "─".repeat(tableWidth - 2) + "┘";

    console.log(border);
    console.log(
      `│${colors.bright} Service${" ".repeat(16)} │ Status       │ Details${" ".repeat(29)} │${colors.reset}`
    );
    console.log(separator);

    console.log(
      this.createRow(
        "Metrics Service",
        !!metricsService,
        metricsService ? "Performance monitoring" : "Not available",
        "📊"
      )
    );
    console.log(
      this.createRow(
        "Email Service",
        !!emailService,
        emailService ? "Email notifications ready" : "Not configured",
        "📧"
      )
    );
    console.log(
      this.createRow(
        "Token Service",
        !!tokenService,
        tokenService ? "JWT token management" : "Not available",
        "🔑"
      )
    );
    console.log(
      this.createRow(
        "Encryption",
        !!encryptionService,
        encryptionService ? "Data encryption ready" : "Not available",
        "🔒"
      )
    );
    console.log(
      this.createRow(
        "Session Service",
        !!sessionService,
        sessionService ? "User session management" : "Not available",
        "👥"
      )
    );
    console.log(
      this.createRow(
        "Messaging",
        !!messagingService,
        messagingService ? "Real-time messaging" : "Not available",
        "💬"
      )
    );

    console.log(bottom);
    console.log("");
  }

  /**
   * Enhanced connection information display
   */
  displayConnectionInformation(
    port: number,
    configService: ConfigObject,
    infrastructureServices?: {
      databaseService?: DatabaseService;
      storageService?: unknown;
    }
  ): void {
    try {
      const isProduction = process.env.NODE_ENV === "production";
      const host = (configService.get("HOST") as string) || "localhost";
      const protocol = isProduction ? "https" : "http";
      const baseUrl = `${protocol}://${host}:${port}`;

      const endpoints = [
        { name: "Main Application", url: baseUrl },
        { name: "API Base", url: `${baseUrl}/api` },
        { name: "API Documentation", url: `${baseUrl}/api/docs` },
        { name: "Health Check", url: `${baseUrl}/health` },
        { name: "Metrics", url: `${baseUrl}/metrics` },
      ];

      const storagePath =
        configService.storagePath ||
        (configService.get("STORAGE_PATH") as string) ||
        "uploads";

      // Log structured connection info
      this.log({
        level: "info",
        service: "CONNECTION",
        message: "Server connection information updated",
        data: {
          server: {
            host,
            port,
            baseUrl,
            environment: process.env.NODE_ENV || "development",
            protocol,
          },
          endpoints: endpoints.map((e) => ({
            name: e.name,
            url: e.url,
          })),
          storage: {
            path: storagePath,
            url: `${baseUrl}/uploads`,
          },
          timestamp: new Date().toISOString(),
        },
      });

      // Only show visual display in development or when explicitly requested
      if (!this.isDevelopment && !process.env.SHOW_SERVER_STATUS) {
        return;
      }

      this.printSectionHeader(
        "Connection Information",
        "Access points and endpoints"
      );

      // Enhanced connection info table
      const tableWidth = 75;
      const border = "┌" + "─".repeat(tableWidth - 2) + "┐";
      const separator = "├" + "─".repeat(tableWidth - 2) + "┤";
      const bottom = "└" + "─".repeat(tableWidth - 2) + "┘";

      console.log(border);
      console.log(
        `│${colors.bright} Endpoint${" ".repeat(15)} │ URL${" ".repeat(45)} │${colors.reset}`
      );
      console.log(separator);

      const displayEndpoints = [
        { name: "🌐 Main Application", url: baseUrl },
        { name: "🔌 API Base", url: `${baseUrl}/api` },
        { name: "📚 API Documentation", url: `${baseUrl}/api/docs` },
        { name: "❤️ Health Check", url: `${baseUrl}/health` },
        { name: "📊 Metrics", url: `${baseUrl}/metrics` },
      ];

      displayEndpoints.forEach(({ name, url }) => {
        console.log(
          `│ ${name.padEnd(22)} │ ${colors.cyan}${url.padEnd(47)}${colors.reset} │`
        );
      });

      console.log(bottom);
      console.log("");

      // Database connection info if available
      if (infrastructureServices?.databaseService) {
        const dbInfo = this.extractDatabaseInfo(configService);
        const dbConnected = this.checkDatabaseConnection(
          infrastructureServices.databaseService
        );

        if (dbConnected) {
          console.log(
            `${colors.brightCyan}🗄️  Database Connection:${colors.reset}`
          );
          console.log(
            `   Host: ${colors.yellow}${dbInfo.host}:${dbInfo.port}${colors.reset}`
          );
          console.log(
            `   Database: ${colors.yellow}${dbInfo.database}${colors.reset}`
          );
          console.log(`   User: ${colors.yellow}${dbInfo.user}${colors.reset}`);
          console.log("");
        }
      }

      // Storage information
      console.log(
        `${colors.brightGreen}💾 Storage Configuration:${colors.reset}`
      );
      console.log(
        `   Path: ${colors.yellow}${this.normalizePath(path.resolve(storagePath))}${colors.reset}`
      );
      console.log(`   URL: ${colors.yellow}${baseUrl}/uploads${colors.reset}`);
      console.log("");
    } catch (error) {
      this.log({
        level: "error",
        service: "CONNECTION",
        message: "Error displaying connection information",
        data: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  /**
   * Enhanced comprehensive server status display
   * This is the main entry point that coordinates all status displays
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
    }
  ): void {
    try {
      const uptime = ((Date.now() - this.startTime) / 1000).toFixed(1);

      // Log comprehensive status for integration with dev environment
      this.log({
        level: "success",
        service: "SERVER",
        message: "Server status display completed",
        data: {
          server: {
            port,
            uptime: `${uptime}s`,
            startTime: new Date(this.startTime).toISOString(),
            status: "operational",
          },
          servicesCount: {
            infrastructure: Object.keys(infrastructureServices).length,
            business: Object.keys(businessServices).length,
          },
          timestamp: new Date().toISOString(),
        },
      });

      // Only show visual display in development or when explicitly requested
      if (!this.isDevelopment && !process.env.SHOW_SERVER_STATUS) {
        return;
      }

      // Main server status header
      this.printSectionHeader(
        "🚀 ABE Stack Server Status",
        `Server running for ${uptime}s on port ${port}`
      );

      // Display all service categories
      this.displayInfrastructureServices(infrastructureServices);
      this.displayBusinessServices(businessServices);
      this.displayConnectionInformation(
        port,
        configService,
        infrastructureServices
      );

      // Final status summary
      console.log(
        `${colors.brightGreen}✅ Server is ready and all services are operational!${colors.reset}`
      );
      console.log(
        `${colors.gray}   Started at: ${new Date(this.startTime).toISOString()}${colors.reset}`
      );
      console.log(`${colors.gray}   Uptime: ${uptime} seconds${colors.reset}`);
      console.log("");
    } catch (error) {
      this.log({
        level: "error",
        service: "SERVER",
        message: "Error during comprehensive server status display",
        data: { error: error instanceof Error ? error.message : String(error) },
      });
    }
  }
}
