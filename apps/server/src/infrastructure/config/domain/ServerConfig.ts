import { injectable, inject } from "inversify";

import { ConfigService, ConfigSchema } from "@/server/infrastructure/config";
import { TYPES } from "@/server/infrastructure/di/types";

/**
 * Server configuration interface
 */
export interface ServerConfig {
  port: number;
  host: string;
  baseUrl: string;
  environment: string;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  cors: {
    origin: string;
    origins: string[];
  };
  storagePath: string;
  tempPath: string;
}

/**
 * Server configuration provider
 */
@injectable()
export class ServerConfigProvider {
  private config: ServerConfig;

  constructor(
    @inject(TYPES.ConfigService) private configService: ConfigService,
  ) {
    this.config = this.loadConfig();

    // Validate configuration
    this.configService.ensureValid(this.getConfigSchema());
  }

  /**
   * Gets the server configuration
   *
   * @returns Server configuration
   */
  getConfig(): ServerConfig {
    return this.config;
  }

  /**
   * Gets the configuration schema for validation
   *
   * @returns Configuration schema
   */
  getConfigSchema(): ConfigSchema {
    return {
      properties: {
        PORT: {
          type: "number",
          default: 3000,
          min: 1,
          max: 65535,
          description: "Server port",
        },
        HOST: {
          type: "string",
          default: "0.0.0.0",
          description: "Server host",
        },
        NODE_ENV: {
          type: "string",
          default: "development",
          enum: ["development", "test", "production"],
          description: "Node environment",
        },
        LOG_LEVEL: {
          type: "string",
          default: "info",
          enum: ["error", "warn", "info", "debug", "trace"],
          description: "Logging level",
        },
        REQUEST_TIMEOUT: {
          type: "number",
          default: 30000,
          min: 1000,
          description: "Request timeout in milliseconds",
        },
        MAX_REQUEST_SIZE: {
          type: "string",
          default: "10mb",
          description: "Maximum request body size",
        },
        COMPRESSION_ENABLED: {
          type: "boolean",
          default: true,
          description: "Whether to enable response compression",
        },
        COMPRESSION_LEVEL: {
          type: "number",
          default: 6,
          min: 0,
          max: 9,
          description: "Compression level (0-9)",
        },
        KEEP_ALIVE_TIMEOUT: {
          type: "number",
          default: 120000,
          min: 1000,
          description: "Keep-alive timeout in milliseconds",
        },
        MAX_CONNECTIONS: {
          type: "number",
          default: 1000,
          min: 1,
          description: "Maximum number of concurrent connections",
        },
      },
    };
  }

  /**
   * Loads the server configuration from the config service
   *
   * @returns Server configuration
   */
  private loadConfig(): ServerConfig {
    return {
      port: this.configService.getNumber("PORT", 3003) as number,
      host: this.configService.get("HOST", "localhost") as string,
      baseUrl: this.configService.get(
        "BASE_URL",
        "http://localhost:3003",
      ) as string,
      environment: this.configService.get("NODE_ENV", "development") as string,
      isDevelopment: this.configService.isDevelopment(),
      isProduction: this.configService.isProduction(),
      isTest: this.configService.isTest(),
      cors: {
        origin: this.configService.get("CORS_ORIGIN", "*") as string,
        origins: this.configService.getArray("CORS_ORIGINS"),
      },
      storagePath: this.configService.get("STORAGE_PATH", "") as string,
      tempPath: this.configService.get("TEMP_PATH", "") as string,
    };
  }
}
