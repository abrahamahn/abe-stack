// src/server/database/config.ts
import { Pool } from 'pg';
import { envConfig } from '../config/environment';
import { Logger } from '../services/LoggerService';

export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private static pool: Pool | null = null;
  private static logger: Logger = new Logger('DatabaseConnectionManager');
  private static connected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  public static async initialize(): Promise<void> {
    try {
      this.pool = new Pool({
        host: envConfig.DB_HOST,
        port: envConfig.DB_PORT,
        user: envConfig.DB_USER,
        password: envConfig.DB_PASSWORD,
        database: envConfig.DB_NAME,
        ssl: {
          rejectUnauthorized: false
        }
      });

      // Test the connection
      await this.pool.query('SELECT NOW()');
      this.connected = true;
      this.logger.info('Database connection established');
    } catch (error) {
      this.connected = false;
      this.logger.error('Failed to initialize database connection', { error });
      throw error;
    }
  }

  public static getPool(): Pool {
    if (!this.pool) {
      throw new Error('Database connection not initialized');
    }
    return this.pool;
  }

  public static isConnected(): boolean {
    return this.connected && this.pool !== null;
  }

  public static async closePool(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.connected = false;
    }
  }
}