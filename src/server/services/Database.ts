import { Pool } from 'pg';
import { Simplify } from '../../shared/typeHelpers';
import { Logger } from './LoggerService';

const logger = new Logger('Database');

export class Database {
  private pool: Pool | null = null;
  private connected = false;

  constructor(_dbPath: string) {
    // dbPath is ignored when using PostgreSQL
  }

  async initialize() {
    try {
      // Try to connect to PostgreSQL
      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'abe_stack',
        ssl: process.env.NODE_ENV === 'production' ? {
          rejectUnauthorized: false
        } : undefined,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
      });

      // Test the connection
      const client = await this.pool.connect();
      try {
        await client.query('SELECT NOW()');
        logger.info('PostgreSQL connection established successfully.');
        this.connected = true;
      } finally {
        client.release();
      }
      
      return this;
    } catch (error) {
      logger.error('Unable to connect to PostgreSQL:', error);
      logger.info('Continuing with fallback mode...');
      return this;
    }
  }

  async reset() {
    if (this.connected && this.pool) {
      // In development, we can reset tables
      if (process.env.NODE_ENV !== 'production') {
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
          logger.info('Database reset complete.');
        } catch (error) {
          logger.error('Database reset failed:', error);
        }
      } else {
        logger.warn('Database reset attempted in production mode - operation skipped.');
      }
    }
  }

  // Get the pool instance
  getPool() {
    return this.pool;
  }

  // Check if database is connected
  isConnected() {
    return this.connected;
  }

  // Close the database connection
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.connected = false;
      logger.info('Database connection closed.');
    }
  }
}

export type DatabaseApi = Simplify<Database>;