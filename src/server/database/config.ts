// src/server/database/config.ts
import { Pool, PoolConfig } from 'pg';
import { EventEmitter } from 'events';
import { env } from '../config/environment';
import { Logger } from '../services/LoggerService';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export class DatabaseConnectionManager {
  private static pool: Pool | undefined;
  private static logger = new Logger('DatabaseConnectionManager');

  private constructor() {}

  public static getPool(config?: DatabaseConfig): Pool {
    if (!this.pool) {
      if (!config) {
        config = {
          host: env.DB_HOST,
          port: Number(env.DB_PORT),
          user: env.DB_USER,
          password: env.DB_PASSWORD,
          database: env.DB_NAME,
        };
      }

      const poolConfig: PoolConfig = {
        ...config,
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
        connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
        ssl: env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false
        } : undefined
      };

      try {
        this.pool = new Pool(poolConfig);

        // Log pool events
        (this.pool as unknown as EventEmitter).on('connect', () => {
          this.logger.debug('New client connected to the pool');
        });

        (this.pool as unknown as EventEmitter).on('error', (err: Error) => {
          this.logger.error('Unexpected error on idle client', err);
        });

      } catch (error) {
        this.logger.error('Database pool creation failed', error);
        throw error;
      }
    }
    return this.pool;
  }

  /**
   * Execute a SQL query with parameters
   * @param sql SQL query string
   * @param params Query parameters
   * @returns Query result
   */
  public static async query<T>(sql: string, params?: any[]): Promise<T> {
    const pool = this.getPool();
    try {
      const result = await pool.query(sql, params);
      return result.rows as T;
    } catch (error) {
      this.logger.error('Query execution failed', { sql, params, error });
      throw error;
    }
  }

  /**
   * Test the database connection
   */
  public static async testConnection(): Promise<boolean> {
    try {
      await this.query('SELECT NOW()');
      this.logger.info('Database connection established successfully.');
      return true;
    } catch (error) {
      this.logger.error('Unable to connect to the database:', error);
      return false;
    }
  }

  /**
   * Close all pool connections
   */
  public static async closeConnection(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = undefined;
    }
  }
}