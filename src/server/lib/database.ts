import { Pool, PoolClient } from 'pg';
import { env } from '../config/environment';
import { Logger } from '../services/LoggerService';
import { EventEmitter } from 'events';

const logger = new Logger('Database');

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      host: env.DB_HOST,
      port: Number(env.DB_PORT),
      database: env.DB_NAME,
      ssl: env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : undefined,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000 // Return an error after 2 seconds if connection could not be established
    });

    // Handle pool events using the pool as an EventEmitter
    (pool as unknown as EventEmitter).on('connect', (client: PoolClient) => {
      logger.info('New client connected to database');
    });

    (pool as unknown as EventEmitter).on('error', (err: Error) => {
      logger.error('Unexpected error on idle client', err);
    });
  }
  return pool;
}

export async function initializeDatabase(): Promise<boolean> {
  try {
    const pool = getPool();
    
    // Test database connection
    const client = await pool.connect();
    try {
      await client.query('SELECT NOW()');
      logger.info('Database connection established successfully.');
    } finally {
      client.release();
    }

    // Run migrations
    // Note: Migrations should be handled separately using a migration tool
    // like node-pg-migrate or a custom migration system

    return true;
  } catch (error) {
    logger.error('Unable to initialize database:', error);
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  try {
    if (pool) {
      await pool.end();
      logger.info('Database connection closed successfully.');
    }
  } catch (error) {
    logger.error('Error closing database connection:', error);
    throw error;
  }
}

// Helper function to get a client from the pool with error handling
export async function withClient<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await callback(client);
  } finally {
    client.release();
  }
}

// Transaction helper function
export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
} 