import { Pool } from 'pg';

import { Simplify } from '../../shared/typeHelpers';

import { Logger } from './LoggerService';

const logger = new Logger('Database');

// Simple in-memory database for fallback mode
class InMemoryDatabase {
  private data: Map<string, Record<string, unknown>[]> = new Map();
  
  query(text: string, params: unknown[] = []): Promise<{ rows: Record<string, unknown>[] }> {
    logger.debug('In-memory DB query:', { text, params });
    
    // Very basic query parser for development fallback
    if (text.toLowerCase().startsWith('select')) {
      const tableName = this.extractTableName(text);
      return Promise.resolve({ rows: this.data.get(tableName) || [] });
    } else if (text.toLowerCase().startsWith('insert')) {
      const tableName = this.extractTableName(text);
      if (!this.data.has(tableName)) {
        this.data.set(tableName, []);
      }
      
      // Create a mock record with an ID
      const mockRecord: Record<string, unknown> = {
        id: crypto.randomUUID(),
        ...this.createMockRecord(params)
      };
      
      const tableData = this.data.get(tableName);
      if (tableData) {
        tableData.push(mockRecord);
      }
      return Promise.resolve({ rows: [mockRecord] });
    } else if (text.toLowerCase().startsWith('update')) {
      // Extract table name but we don't need to use it for this mock implementation
      this.extractTableName(text);
      // For simplicity, just return success
      return Promise.resolve({ rows: [] });
    }
    
    // Default fallback
    return Promise.resolve({ rows: [] });
  }
  
  private extractTableName(query: string): string {
    // Very basic extraction - just for development
    const fromMatch = query.match(/from\s+([^\s,;]+)/i);
    const intoMatch = query.match(/into\s+([^\s,;(]+)/i);
    const updateMatch = query.match(/update\s+([^\s,;]+)/i);
    
    return (fromMatch?.[1] || intoMatch?.[1] || updateMatch?.[1] || 'unknown').replace(/['"]/g, '');
  }
  
  private createMockRecord(params: unknown[]): Record<string, unknown> {
    // Create a simple object with sequential keys
    return params.reduce<Record<string, unknown>>((obj, value, index) => {
      obj[`field${index}`] = value;
      return obj;
    }, {});
  }
}

export class Database {
  private pool: Pool | InMemoryDatabase | null = null;
  private connected = false;
  private inMemoryMode = false;

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
      logger.info('Continuing with in-memory database fallback mode...');
      
      // Set up in-memory database for development
      this.pool = new InMemoryDatabase();
      this.connected = true;
      this.inMemoryMode = true;
      
      return this;
    }
  }

  async reset() {
    if (this.inMemoryMode) {
      // Reset in-memory database
      this.pool = new InMemoryDatabase();
      logger.info('In-memory database reset complete.');
      return;
    }
    
    if (this.connected && this.pool instanceof Pool) {
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

  // Get the pool instance or in-memory database
  getPool() {
    return this.pool;
  }

  // Check if database is connected
  isConnected() {
    return this.connected;
  }

  // Check if using in-memory mode
  isInMemoryMode() {
    return this.inMemoryMode;
  }

  // Close the database connection
  async close() {
    if (this.pool instanceof Pool) {
      await this.pool.end();
      this.connected = false;
      logger.info('Database connection closed.');
    }
  }
}

export type DatabaseApi = Simplify<Database>;