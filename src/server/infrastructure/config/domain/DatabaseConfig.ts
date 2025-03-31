import { injectable, inject } from "inversify";

import { ConfigService, ConfigSchema } from "@/server/infrastructure/config";
import { TYPES } from "@/server/infrastructure/di/types";

/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  connectionString: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  maxConnections: number;
  idleTimeout: number;
  connectionTimeout: number;
  statementTimeout: number;
  ssl?: boolean | { rejectUnauthorized: boolean };
  metricsMaxSamples: number;
}

/**
 * Database configuration provider
 */
@injectable()
export class DatabaseConfigProvider {
  private config: DatabaseConfig;

  constructor(
    @inject(TYPES.ConfigService) private configService: ConfigService,
  ) {
    // Load config only
    this.config = this.loadConfig();
  }

  /**
   * Gets the database configuration
   *
   * @returns Database configuration
   */
  getConfig(): DatabaseConfig {
    // Validate configuration against schema
    this.configService.ensureValid(this.getConfigSchema());
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
        DB_HOST: {
          type: "string",
          required: true,
          default: "localhost",
          description: "Database host",
        },
        DB_PORT: {
          type: "number",
          required: true,
          default: 5432,
          min: 1,
          max: 65535,
          description: "Database port",
        },
        DB_NAME: {
          type: "string",
          required: true,
          default: "abe_stack",
          description: "Database name",
        },
        DB_USER: {
          type: "string",
          required: true,
          default: "postgres",
          description: "Database user",
        },
        DB_PASSWORD: {
          type: "string",
          required: true,
          default: "postgres",
          secret: true,
          description: "Database password",
        },
        DATABASE_URL: {
          type: "string",
          required: true,
          default: "postgresql://postgres:postgres@localhost:5432/abe_stack",
          pattern: /^postgresql:\/\/.+/,
          description: "PostgreSQL connection string",
        },
        DB_MAX_CONNECTIONS: {
          type: "number",
          required: false,
          default: 20,
          min: 1,
          description: "Maximum number of database connections",
        },
        DB_IDLE_TIMEOUT: {
          type: "number",
          required: false,
          default: 30000,
          min: 1000,
          description: "Connection idle timeout in milliseconds",
        },
        DB_CONNECTION_TIMEOUT: {
          type: "number",
          required: false,
          default: 5000,
          min: 100,
          description: "Connection timeout in milliseconds",
        },
        DB_STATEMENT_TIMEOUT: {
          type: "number",
          required: false,
          default: 30000,
          min: 100,
          description: "Statement timeout in milliseconds",
        },
        DB_SSL: {
          type: "boolean",
          required: false,
          default: false,
          description: "Enable SSL for database connection",
        },
        DB_METRICS_MAX_SAMPLES: {
          type: "number",
          required: false,
          default: 1000,
          min: 10,
          description: "Maximum number of metrics samples to keep",
        },
      },
    };
  }

  /**
   * Loads the database configuration from the config service
   *
   * @returns Database configuration
   */
  private loadConfig(): DatabaseConfig {
    // Load the configuration
    const config = {
      connectionString: this.configService.get(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/abe_stack",
      ) as string,
      host: this.configService.get("DB_HOST", "localhost") as string,
      port: this.configService.getNumber("DB_PORT", 5432) as number,
      database: this.configService.get("DB_NAME", "abe_stack") as string,
      user: this.configService.get("DB_USER", "postgres") as string,
      password: this.configService.get("DB_PASSWORD", "postgres") as string,
      maxConnections: this.configService.getNumber(
        "DB_MAX_CONNECTIONS",
        20,
      ) as number,
      idleTimeout: this.configService.getNumber(
        "DB_IDLE_TIMEOUT",
        30000,
      ) as number,
      connectionTimeout: this.configService.getNumber(
        "DB_CONNECTION_TIMEOUT",
        5000,
      ) as number,
      statementTimeout: this.configService.getNumber(
        "DB_STATEMENT_TIMEOUT",
        30000,
      ) as number,
      ssl: this.configService.getBoolean("DB_SSL", false),
      metricsMaxSamples: this.configService.getNumber(
        "DB_METRICS_MAX_SAMPLES",
        1000,
      ) as number,
    };

    // Validate required fields
    const requiredFields = [
      "connectionString",
      "host",
      "port",
      "database",
      "user",
      "password",
    ];

    const missingFields = requiredFields.filter(
      (field) => !config[field as keyof DatabaseConfig],
    );

    if (missingFields.length > 0) {
      throw new Error(
        `Missing required database configuration fields: ${missingFields.join(
          ", ",
        )}`,
      );
    }

    return config;
  }
}
