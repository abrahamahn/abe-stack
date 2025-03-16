// src/server/database/config.ts
import { EventEmitter } from 'events';

import { Pool, PoolClient } from 'pg';

import { Logger } from '../services/LoggerService';

import { env } from './environment';

const logger = new Logger('DatabaseConnectionManager');

export class DatabaseConnectionManager {
  private static instance: DatabaseConnectionManager;
  private static pool: Pool | null = null;
  private static connected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseConnectionManager {
    if (!DatabaseConnectionManager.instance) {
      DatabaseConnectionManager.instance = new DatabaseConnectionManager();
    }
    return DatabaseConnectionManager.instance;
  }

  static async initialize(): Promise<void> {
    try {
      this.pool = new Pool({
        host: env.DB_HOST,
        port: env.DB_PORT,
        database: env.DB_NAME,
        user: env.DB_USER,
        password: env.DB_PASSWORD
      });

      // Handle pool events
      (this.pool as unknown as EventEmitter).on('connect', (_client: PoolClient) => {
        logger.info('New client connected to database');
      });

      (this.pool as unknown as EventEmitter).on('error', (err: Error) => {
        logger.error('Unexpected error on idle client', err);
      });

      // Test the connection
      await this.pool.query('SELECT NOW()');
      this.connected = true;
      logger.info('Database connection initialized successfully');

      // Initialize tables
      await this.initializeTables();
    } catch (error) {
      this.connected = false;
      logger.error('Failed to initialize database connection', { error });
      throw error;
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
      throw new Error('Database connection not initialized');
    }
    return this.pool;
  }

  static isConnected(): boolean {
    return this.connected && this.pool !== null;
  }

  static async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.connected = false;
    }
  }

  // Helper function to get a client from the pool with error handling
  static async withClient<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getPool().connect();
    try {
      return await callback(client);
    } finally {
      client.release();
    }
  }

  // Transaction helper function
  static async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.withClient(async (client) => {
      try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  }

  static async reset(): Promise<void> {
    if (this.connected && this.pool instanceof Pool) {
      // Only allow reset in development
      if (env.NODE_ENV !== 'production') {
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
          logger.info('Database reset complete');
        } catch (error) {
          logger.error('Database reset failed:', { error });
          throw error;
        }
      } else {
        logger.warn('Database reset attempted in production mode - operation skipped');
      }
    }
  }
}