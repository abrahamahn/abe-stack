import { injectable, inject } from "inversify";

import { ConfigService } from "@/server/infrastructure/config";
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
    this.config = this.loadConfig();
    // No validation needed here
  }

  /**
   * Gets the database configuration
   *
   * @returns Database configuration
   */
  public getConfig(): DatabaseConfig {
    // No validation needed here either
    return this.config;
  }

  /**
   * Loads the database configuration from the config service
   *
   * @returns Database configuration
   */
  private loadConfig(): DatabaseConfig {
    // Get values from environment or use defaults
    const host = this.configService.getString("DB_HOST", "localhost");
    const port = this.configService.getNumber("DB_PORT", 5432);
    const database = this.configService.getString("DB_NAME", "abe_stack");
    const user = this.configService.getString("DB_USER", "postgres");
    const password = this.configService.getString("DB_PASSWORD", "postgres");

    // Fall back to connection string if individual values are not set
    const connectionString = this.configService.getString(
      "DATABASE_URL",
      `postgresql://${user}:${password}@${host}:${port}/${database}`,
    );

    return {
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
      ssl: this.configService.getBoolean("DB_SSL", false),
      metricsMaxSamples: this.configService.getNumber(
        "DB_METRICS_MAX_SAMPLES",
        1000,
      ),
    };
  }
}
