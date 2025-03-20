// src/config/database.ts
import { EventEmitter } from "events";

import { Pool, PoolClient } from "pg";

import { env } from "../config/environment";
import { Logger } from "../services/dev/logger/LoggerService";

const logger = new Logger("DatabaseConnectionManager");
const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5 seconds
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private static pool: Pool | null = null;
  private static connected: boolean = false;
  private static healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  private static async healthCheck(): Promise<void> {
    if (!this.pool) return;

    try {
      const startTime = Date.now();
      await this.pool.query("SELECT 1");
      const duration = Date.now() - startTime;

      if (duration > 1000) {
        // Log slow health checks (>1s)
        logger.warn(`Database health check took ${duration}ms`);
      } else {
        logger.info(`Database health check successful (${duration}ms)`);
      }
    } catch (error) {
      this.connected = false;
      logger.error("Database health check failed", { error });
      // Try to reconnect
      await this.initialize();
    }
  }

  static async initialize(): Promise<void> {
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        logger.info("Initializing database connection", {
          host: env.DB_HOST,
          port: env.DB_PORT,
          database: env.DB_NAME,
          user: env.DB_USER,
        });

        this.pool = new Pool({
          host: env.DB_HOST,
          port: env.DB_PORT,
          database: env.DB_NAME,
          user: env.DB_USER,
          password: env.DB_PASSWORD,
          // Add some connection pool settings
          max: 20, // Maximum number of clients
          idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
          connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
        });

        // Handle pool events
        (this.pool as unknown as EventEmitter).on(
          "connect",
          (_client: PoolClient) => {
            logger.info("New client connected to database pool");
          },
        );

        (this.pool as unknown as EventEmitter).on("error", (err: Error) => {
          logger.error("Unexpected error on idle client", { error: err });
        });

        (this.pool as unknown as EventEmitter).on(
          "remove",
          (_client: PoolClient) => {
            logger.info("Client removed from pool");
          },
        );

        // Test the connection
        const startTime = Date.now();
        const result = await this.pool.query("SELECT version()");
        const duration = Date.now() - startTime;

        this.connected = true;
        logger.info("Database connection successful", {
          duration: `${duration}ms`,
          version: result.rows[0].version,
          poolSize: (this.pool as Pool).totalCount,
          idleCount: (this.pool as Pool).idleCount,
        });

        // Start periodic health checks
        if (this.healthCheckInterval) {
          clearInterval(this.healthCheckInterval);
        }
        this.healthCheckInterval = setInterval(
          () => this.healthCheck(),
          HEALTH_CHECK_INTERVAL,
        );

        // Initialize tables
        await this.initializeTables();
        return;
      } catch (error) {
        retries++;
        logger.error(
          `Database connection attempt ${retries}/${MAX_RETRIES} failed`,
          {
            error,
            nextRetryIn: `${RETRY_INTERVAL / 1000} seconds`,
          },
        );

        if (retries === MAX_RETRIES) {
          throw new Error(
            `Failed to connect to database after ${MAX_RETRIES} attempts`,
          );
        }

        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
      }
    }
  }

  private static async initializeTables(): Promise<void> {
    // Create users table
    await this.pool?.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        display_name VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        bio TEXT,
        profile_image VARCHAR(255),
        banner_image VARCHAR(255),
        role VARCHAR(50) DEFAULT 'user',
        is_verified BOOLEAN DEFAULT FALSE,
        email_confirmed BOOLEAN DEFAULT FALSE,
        email_token VARCHAR(255),
        email_token_expire TIMESTAMP,
        last_email_sent TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add more table creation statements here as needed
  }

  static getPool(): Pool {
    if (!this.pool) {
      throw new Error("Database connection not initialized");
    }
    return this.pool;
  }

  static isConnected(): boolean {
    return this.connected && this.pool !== null;
  }

  static async close(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.pool) {
      logger.info("Closing database connection pool");
      await this.pool.end();
      this.pool = null;
      this.connected = false;
      logger.info("Database connection pool closed successfully");
    }
  }

  // Helper function to get a client from the pool with error handling
  static async withClient<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.getPool().connect();
    try {
      return await callback(client);
    } finally {
      client.release();
    }
  }

  // Transaction helper function
  static async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    return this.withClient(async (client) => {
      try {
        await client.query("BEGIN");
        const result = await callback(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    });
  }

  static async reset(): Promise<void> {
    if (this.connected && this.pool instanceof Pool) {
      // Only allow reset in development
      if (env.NODE_ENV !== "production") {
        try {
          // Drop all tables and recreate them using migrations
          await this.pool.query(`
            DO $$ DECLARE
              r RECORD;
            BEGIN
              FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = current_schema()) LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
              END LOOP;
            END $$;
          `);
          // Reinitialize tables
          await this.initializeTables();
          logger.info("Database reset complete");
        } catch (error) {
          logger.error("Database reset failed:", { error });
          throw error;
        }
      } else {
        logger.warn(
          "Database reset attempted in production mode - operation skipped",
        );
      }
    }
  }
}
