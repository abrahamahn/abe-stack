// src/database/migrations/migrationManager.ts
import { existsSync } from "fs";
import { mkdir, readdir, readFile } from "fs/promises";
import { join } from "path";

import { injectable, inject } from "inversify";

import type { DbClient, IDatabaseServer } from "@/server/infrastructure/database/IDatabaseServer";
import { TYPES } from "@/server/infrastructure/di/types";
import type { ILoggerService } from "@/server/infrastructure/logging";

import {
  createMigrationTemplate,
  createAuthMigrationTemplate,
  migrationConfig,
} from "./migrationConfig";

interface MigrationRecord {
  id: number;
  name: string;
  executed_at: Date;
}

@injectable()
export class MigrationManager {
  private readonly migrationsDir: string;
  private migrationsTable: string;
  private migrationExtension: string;

  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService,
    @inject(TYPES.DatabaseServer) private databaseService: IDatabaseServer,
  ) {
    this.migrationsDir = migrationConfig.migrations_path;
    this.migrationsTable = migrationConfig.migrations_table;
    this.migrationExtension = migrationConfig.migration_file_extension;

    this.ensureMigrationsDirectory();
  }

  /**
   * Ensure migrations directory exists
   */
  private async ensureMigrationsDirectory(): Promise<void> {
    if (!existsSync(this.migrationsDir)) {
      try {
        await mkdir(this.migrationsDir, { recursive: true });
        this.logger.info(`Created migrations directory: ${this.migrationsDir}`);
      } catch (error) {
        this.logger.error("Failed to create migrations directory", { error });
        throw error;
      }
    }
  }

  /**
   * Create migrations table if it doesn't exist
   */
  async createMigrationsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS ${this.migrationsTable} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    try {
      await this.databaseService.query(query);
      this.logger.info(
        `Ensured migrations table exists: ${this.migrationsTable}`,
      );
    } catch (error) {
      this.logger.error("Failed to create migrations table", { error });
      throw error;
    }
  }

  /**
   * Get list of executed migrations
   */
  async getExecutedMigrations(): Promise<string[]> {
    const query = `SELECT name FROM ${this.migrationsTable} ORDER BY id ASC`;

    try {
      const result = await this.databaseService.query<{ name: string }>(query);
      return result.rows.map((row: { name: string }) => row.name);
    } catch (error) {
      this.logger.error("Failed to get executed migrations", { error });
      throw error;
    }
  }

  /**
   * Create a new migration file
   */
  async createMigration(name: string): Promise<string> {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace("T", "_")
      .split(".")[0];
    const fileName = `${timestamp}_${name}${this.migrationExtension}`;
    const filePath = join(this.migrationsDir, fileName);

    const template = createMigrationTemplate(name);

    try {
      const { writeFile } = await import("fs/promises");
      await writeFile(filePath, template, "utf8");
      this.logger.info(`Created migration: ${fileName}`);
      return fileName;
    } catch (error) {
      this.logger.error("Failed to create migration file", { error });
      throw error;
    }
  }

  /**
   * Create a new auth migration file with all auth tables
   */
  async createAuthMigration(): Promise<string> {
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace("T", "_")
      .split(".")[0];
    const fileName = `${timestamp}_auth_system${this.migrationExtension}`;
    const filePath = join(this.migrationsDir, fileName);

    const template = createAuthMigrationTemplate();

    try {
      const { writeFile } = await import("fs/promises");
      await writeFile(filePath, template, "utf8");
      this.logger.info(`Created auth migration: ${fileName}`);
      return fileName;
    } catch (error) {
      this.logger.error("Failed to create auth migration file", { error });
      throw error;
    }
  }

  /**
   * Get list of all migration files
   */
  private async getMigrationFiles(): Promise<string[]> {
    try {
      const files = await readdir(this.migrationsDir);
      // Support both .sql and .ts/.js files based on config
      return files.filter(
        (file) =>
          (file.endsWith(".sql") || file.endsWith(this.migrationExtension)) &&
          !file.includes(".down."),
      );
    } catch (error) {
      this.logger.error("Failed to read migrations directory", { error });
      throw error;
    }
  }

  /**
   * Get list of pending migrations
   */
  private async getPendingMigrations(): Promise<string[]> {
    const files = await this.getMigrationFiles();
    const executedMigrations = await this.getExecutedMigrations();

    // Filter out migrations that have already been executed
    return files.filter((file) => !executedMigrations.includes(file));
  }

  /**
   * Execute a SQL migration
   */
  private async executeSqlMigration(
    client: DbClient,
    filename: string,
  ): Promise<void> {
    const filePath = join(this.migrationsDir, filename);
    const sql = await readFile(filePath, "utf8");

    // Execute the migration SQL
    await client.query(sql);
  }

  /**
   * Execute a TypeScript/JavaScript migration
   */
  private async executeJsMigration(
    _client: DbClient,
    filename: string,
  ): Promise<void> {
    // For TypeScript migrations we need to compile and run them
    try {
      // When using TypeScript, ensure ts-node is installed
      const migrationModule = await import(join(this.migrationsDir, filename));

      if (typeof migrationModule.up !== "function") {
        throw new Error(
          `Migration ${filename} does not export an 'up' function`,
        );
      }

      // Create a migration builder object
      const pgm = {
        createTable: async (
          tableName: string,
          _columns: unknown,
          _options?: unknown,
        ) => {
          this.logger.info(`Creating table ${tableName}`);
        },
        addColumn: async (tableName: string, columnName: string) => {
          this.logger.info(`Adding column ${columnName} to ${tableName}`);
        },
      };

      // Execute the migration
      await migrationModule.up(pgm);
    } catch (err) {
      this.logger.error(`Error executing JS/TS migration ${filename}:`, {
        error: err,
      });
      throw err;
    }
  }

  /**
   * Execute a single migration
   */
  private async executeMigration(filename: string): Promise<void> {
    const client = await this.databaseService.connect();

    try {
      await client.query("BEGIN");

      if (filename.endsWith(".sql")) {
        await this.executeSqlMigration(client, filename);
      } else if (filename.endsWith(".ts") || filename.endsWith(".js")) {
        await this.executeJsMigration(client, filename);
      } else {
        throw new Error(`Unsupported migration file type: ${filename}`);
      }

      // Record the migration
      await client.query(
        `INSERT INTO ${this.migrationsTable} (name) VALUES ($1)`,
        [filename],
      );

      await client.query("COMMIT");
      this.logger.info(`Executed migration: ${filename}`);
    } catch (err) {
      await client.query("ROLLBACK");
      this.logger.error(`Error executing migration ${filename}:`, {
        error: err,
      });
      throw err;
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
      this.logger.info("No pending migrations");
      return;
    }

    this.logger.info(`Found ${pendingMigrations.length} pending migrations`);

    // Sort migrations by filename to ensure correct order
    pendingMigrations.sort();

    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }

    this.logger.info("All migrations completed successfully");
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

  /**
   * Roll back last migration
   */
  async rollbackMigration(): Promise<void> {
    const client = await this.databaseService.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<MigrationRecord>(
        `DELETE FROM ${this.migrationsTable} WHERE id = (SELECT MAX(id) FROM ${this.migrationsTable}) RETURNING *`,
      );
      if (result.rows.length === 0) {
        this.logger.info("No migrations to roll back");
        await client.query("ROLLBACK");
        return;
      }

      const migration = result.rows[0];
      const { name: migrationName } = migration;

      if (migrationName.endsWith(".sql")) {
        // For SQL migrations, look for a corresponding down file
        const downFileName = migrationName.replace(".sql", ".down.sql");
        const downFilePath = join(this.migrationsDir, downFileName);

        try {
          const downSql = await readFile(downFilePath, "utf8");
          await client.query(downSql);
        } catch (error) {
          this.logger.error(`Rollback file not found: ${downFileName}`, {
            error,
          });
          throw new Error(`Rollback file not found: ${downFileName}`);
        }
      } else if (
        migrationName.endsWith(".ts") ||
        migrationName.endsWith(".js")
      ) {
        // For TypeScript/JavaScript migrations, call the down function
        try {
          const migrationModule = await import(
            join(this.migrationsDir, migrationName)
          );

          if (typeof migrationModule.down !== "function") {
            throw new Error(
              `Migration ${migrationName} does not export a 'down' function`,
            );
          }

          // Similar to up, you'd want a proper migration builder here
          const pgm = {
            dropTable: async (tableName: string, _options?: unknown) => {
              // Implementation would build and execute SQL
              this.logger.info(`Dropping table ${tableName}`);
            },
            dropColumn: async (tableName: string, _columnName: string) => {
              // Implementation would build and execute SQL
              this.logger.info(
                `Dropping column ${_columnName} from ${tableName}`,
              );
            },
            // ... other migration methods
          };

          await migrationModule.down(pgm);
        } catch (error) {
          this.logger.error(
            `Error running down migration for ${migrationName}:`,
            { error },
          );
          throw error;
        }
      }

      await client.query("COMMIT");
      this.logger.info(`Rolled back migration: ${migrationName}`);
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Failed to rollback migration", { error });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reset database (dangerous - use with caution!)
   */
  async resetDatabase(): Promise<void> {
    this.logger.warn("RESETTING DATABASE - ALL DATA WILL BE LOST");

    const client = await this.databaseService.connect();
    try {
      await client.query("BEGIN");

      // Get all tables except the migrations table
      const tablesResult = await client.query<{ tablename: string }>(
        `
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename != $1
      `,
        [this.migrationsTable],
      );

      // Drop all tables in reverse order of creation (to handle dependencies)
      if (tablesResult.rows.length > 0) {
        const tables = tablesResult.rows.map(
          (row: { tablename: string }) => row.tablename,
        );
        await client.query(`DROP TABLE IF EXISTS ${tables.join(", ")} CASCADE`);
      }

      // Clear migration records
      await client.query(`TRUNCATE ${this.migrationsTable}`);

      await client.query("COMMIT");
      this.logger.info("Database reset completed");
    } catch (error) {
      await client.query("ROLLBACK");
      this.logger.error("Failed to reset database", { error });
      throw error;
    } finally {
      client.release();
    }
  }
}
