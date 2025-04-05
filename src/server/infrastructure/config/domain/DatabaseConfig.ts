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
      // Get core database configuration
      const host = this.configService.getString("DB_HOST", "localhost");
      const port = this.configService.getNumber("DB_PORT", 5432);
      const database = this.configService.getString("DB_NAME", "postgres");
      const user = this.configService.getString("DB_USER", "postgres");
      const password = this.configService.getString("DB_PASSWORD", "postgres");

      // Build connection string if not explicitly set
      const explicitConnectionString = this.configService.getString(
        "DATABASE_URL",
        "",
      );
      const connectionString =
        explicitConnectionString ||
        `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;

      // Connection pool settings
      const maxConnections = this.configService.getNumber(
        "DB_MAX_CONNECTIONS",
        10,
      );
      const idleTimeout = this.configService.getNumber(
        "DB_IDLE_TIMEOUT",
        10000,
      );
      const connectionTimeout = this.configService.getNumber(
        "DB_CONNECTION_TIMEOUT",
        30000,
      );
      const statementTimeout = this.configService.getNumber(
        "DB_STATEMENT_TIMEOUT",
        60000,
      );

      // SSL configuration - make it optional with a default value
      let ssl: SSLConfig | undefined = this.configService.getBoolean(
        "DB_SSL",
        false,
      );
      const sslEnabled = this.configService.getBoolean("DB_SSL_ENABLED", false);

      if (sslEnabled || ssl) {
        const rejectUnauthorized = this.configService.getBoolean(
          "DB_SSL_REJECT_UNAUTHORIZED",
          true,
        );
        ssl = { rejectUnauthorized };
      }

      // Performance monitoring
      const metricsMaxSamples = this.configService.getNumber(
        "DB_METRICS_MAX_SAMPLES",
        1000,
      );

      // Create the config object
      const config: DatabaseConfig = {
        connectionString,
        host,
        port,
        database,
        user,
        password,
        maxConnections,
        idleTimeout,
        connectionTimeout,
        statementTimeout,
        ssl,
        metricsMaxSamples,
      };

      // Validate and return the configuration
      this.validateRequiredFields(config);
      return config;
    } catch (error: unknown) {
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
      (field) =>
        config[field as keyof DatabaseConfig] === undefined ||
        config[field as keyof DatabaseConfig] === null ||
        config[field as keyof DatabaseConfig] === "",
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
