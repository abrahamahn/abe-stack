// src/server/database/migrationManager.ts
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

import { Pool } from 'pg';

import { Logger } from '../services/LoggerService';

import { DatabaseConnectionManager } from './config';

export class MigrationManager {
  private logger: Logger;
  private pool: Pool;
  private migrationsPath = join(__dirname, 'migrations');

  constructor() {
    this.logger = new Logger('MigrationManager');
    this.pool = DatabaseConnectionManager.getPool();
  }

  /**
   * Create migrations table if it doesn't exist
   */
  async createMigrationsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      await this.pool.query(query);
    } catch (error) {
      this.logger.error('Failed to create migrations table', { error });
      throw error;
    }
  }

  /**
   * Get list of executed migrations
   */
  async getExecutedMigrations(): Promise<string[]> {
    const query = 'SELECT name FROM migrations ORDER BY id ASC';
    
    try {
      const result = await this.pool.query<{ name: string }>(query);
      return result.rows.map((row: { name: string }) => row.name);
    } catch (error) {
      this.logger.error('Failed to get executed migrations', { error });
      throw error;
    }
  }

  /**
   * Get list of pending migrations
   */
  private async getPendingMigrations(): Promise<string[]> {
    const files = await readdir(this.migrationsPath);
    const sqlFiles = files.filter(file => file.endsWith('.sql'));
    const executedMigrations = await this.getExecutedMigrations();
    
    return sqlFiles.filter(file => !executedMigrations.includes(file));
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(filename: string): Promise<void> {
    const filePath = join(this.migrationsPath, filename);
    const sql = await readFile(filePath, 'utf8');

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Execute the migration
      await client.query(sql);

      // Record the migration
      await client.query(
        'INSERT INTO migrations (name) VALUES ($1)',
        [filename]
      );

      await client.query('COMMIT');
      this.logger.info(`Executed migration: ${filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      this.logger.error(`Error executing migration ${filename}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<void> {
    await this.createMigrationsTable();
    const pendingMigrations = await this.getPendingMigrations();

    if (pendingMigrations.length === 0) {
      this.logger.info('No pending migrations');
      return;
    }

    this.logger.info(`Found ${pendingMigrations.length} pending migrations`);

    // Sort migrations by filename to ensure correct order
    pendingMigrations.sort();

    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }

    this.logger.info('All migrations completed successfully');
  }

  /**
   * Get migration status
   */
  async status(): Promise<{ executed: string[]; pending: string[] }> {
    await this.createMigrationsTable();
    const executed = await this.getExecutedMigrations();
    const pending = await this.getPendingMigrations();

    return { executed, pending };
  }

  async resetMigrations(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DROP TABLE IF EXISTS pgmigrations');
      await client.query('DROP TABLE IF EXISTS users, posts, comments, likes, follows CASCADE');
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async rollbackMigration(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query<{ name: string }>(
        'DELETE FROM migrations WHERE id = (SELECT MAX(id) FROM migrations) RETURNING name'
      );
      if (result.rows.length === 0) {
        this.logger.info('No migrations to roll back');
        await client.query('ROLLBACK');
        return;
      }
      const migrationName = result.rows[0].name;
      const downSql = await readFile(join(this.migrationsPath, `${migrationName}.down.sql`), 'utf8');
      await client.query(downSql);
      await client.query('COMMIT');
      this.logger.info(`Rolled back migration: ${migrationName}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new MigrationManager();