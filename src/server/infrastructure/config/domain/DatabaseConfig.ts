import { injectable, inject } from "inversify";

import { ConfigService, ConfigSchema } from "@/server/infrastructure/config";
import { TYPES } from "@/server/infrastructure/di/types";

/**
 * SSL configuration options
 */
export type SSLConfig = boolean | { rejectUnauthorized: boolean };

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
  ssl?: SSLConfig;
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
        DB_SSL_REJECT_UNAUTHORIZED: {
          type: "boolean",
          required: false,
          default: true,
          description:
            "Reject unauthorized SSL certificates (only applicable when DB_SSL is true)",
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
    try {
      // Get values from environment or use defaults
      const host = this.configService.get("DB_HOST", "localhost") as string;
      const port = this.configService.getNumber("DB_PORT", 5432);
      const database = this.configService.get("DB_NAME", "abe_stack") as string;
      const user = this.configService.get("DB_USER", "postgres") as string;
      const password = this.configService.get(
        "DB_PASSWORD",
        "postgres",
      ) as string;
      const sslEnabled = this.configService.getBoolean("DB_SSL", false);
      const sslRejectUnauthorized = this.configService.getBoolean(
        "DB_SSL_REJECT_UNAUTHORIZED",
        true,
      );

      // Prepare SSL configuration
      let ssl: SSLConfig = sslEnabled;
      if (sslEnabled && typeof sslEnabled === "boolean") {
        ssl = { rejectUnauthorized: sslRejectUnauthorized };
      }

      // Encode special characters in connection string components
      const encodedUser = encodeURIComponent(user);
      const encodedPassword = encodeURIComponent(password);

      // Construct the default connection string
      const defaultConnectionString = `postgresql://${encodedUser}:${encodedPassword}@${host}:${port}/${database}`;

      // Fall back to connection string if individual values are not set
      // Or build the connection string from components if not provided
      const connectionString = this.configService.get(
        "DATABASE_URL",
        defaultConnectionString,
      ) as string;

      // Validate the connection string format
      if (!connectionString || !connectionString.startsWith("postgresql://")) {
        throw new Error(
          `Invalid connection string format: ${connectionString}`,
        );
      }

      // Build the configuration object
      const config: DatabaseConfig = {
        connectionString,
        host,
        port,
        database,
        user,
        password,
        maxConnections: this.configService.getNumber("DB_MAX_CONNECTIONS", 20),
        idleTimeout: this.configService.getNumber("DB_IDLE_TIMEOUT", 30000),
        connectionTimeout: this.configService.getNumber(
          "DB_CONNECTION_TIMEOUT",
          5000,
        ),
        statementTimeout: this.configService.getNumber(
          "DB_STATEMENT_TIMEOUT",
          30000,
        ),
        ssl,
        metricsMaxSamples: this.configService.getNumber(
          "DB_METRICS_MAX_SAMPLES",
          1000,
        ),
      };

      // Validate required fields
      this.validateRequiredFields(config);

      return config;
    } catch (error) {
      // Add more context to the error message
      const errorMessage =
        error instanceof Error
          ? `Error loading database configuration: ${error.message}`
          : "Error loading database configuration";
      throw new Error(errorMessage);
    }
  }

  /**
   * Validates required fields in the database configuration
   *
   * @param config Database configuration to validate
   * @throws Error if any required fields are missing
   */
  private validateRequiredFields(config: DatabaseConfig): void {
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
  }
}
