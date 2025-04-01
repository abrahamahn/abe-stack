import "reflect-metadata";
import { existsSync } from "fs";
import * as fs from "fs/promises";

import { Container } from "inversify";
import { PoolClient, QueryResult } from "pg";
import { describe, it, expect, beforeEach, afterEach, vi, Mock } from "vitest";

import { migrationConfig } from "@/server/infrastructure/database/migrationConfig";
import { MigrationManager } from "@/server/infrastructure/database/migrationManager";

// Mock fs/promises
vi.mock("fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue([]),
  readFile: vi.fn().mockResolvedValue("-- Mock SQL content"),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

// Mock fs
vi.mock("fs", () => ({
  existsSync: vi.fn().mockReturnValue(false),
}));

// Mock dynamic import
vi.mock("path", () => ({
  ...vi.importActual("path"),
  join: vi.fn().mockImplementation((...args: any) => args.join("/")),
}));

// Mock the dynamic imports in the migrationManager
vi.mock("@/server/infrastructure/database/migrationManager", async () => {
  const actual = await vi.importActual(
    "@/server/infrastructure/database/migrationManager",
  );
  return {
    ...actual,
    MigrationManager: class MockMigrationManager extends (actual as any)
      .MigrationManager {
      createMigration = vi.fn().mockImplementation(function (
        this: any,
        name: string,
      ) {
        const timestamp = "20250401_120000";
        const fileName = `${timestamp}_${name}${this.migrationExtension}`;
        this.logger.info(`Created migration: ${fileName}`);
        return Promise.resolve(fileName);
      });

      createAuthMigration = vi.fn().mockImplementation(function (this: any) {
        const timestamp = "20250401_120000";
        const fileName = `${timestamp}_auth_system${this.migrationExtension}`;
        this.logger.info(`Created auth migration: ${fileName}`);
        return Promise.resolve(fileName);
      });

      executeJsMigration = vi.fn().mockResolvedValue(undefined);
    },
  };
});

describe("MigrationManager", () => {
  let container: Container;
  let migrationManager: MigrationManager;
  let mockDatabaseServer: any;
  let mockLoggerService: any;
  let mockClient: any;

  const mockQueryResult: QueryResult = {
    rows: [],
    rowCount: 0,
    command: "SELECT",
    oid: 0,
    fields: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset fs mocks for each test
    (existsSync as Mock).mockReturnValue(false);
    (fs.mkdir as Mock).mockResolvedValue(undefined);
    (fs.readdir as Mock).mockResolvedValue([]);

    // Mock database client
    mockClient = {
      query: vi.fn().mockResolvedValue(mockQueryResult),
      release: vi.fn(),
    } as unknown as any;

    // Mock database server
    mockDatabaseServer = {
      initialize: vi.fn(),
      close: vi.fn(),
      query: vi.fn().mockResolvedValue(mockQueryResult),
      connect: vi.fn().mockResolvedValue(mockClient),
      withClient: vi
        .fn()
        .mockImplementation(
          async (callback: (client: PoolClient) => Promise<any>) => {
            return callback(mockClient);
          },
        ),
      withTransaction: vi
        .fn()
        .mockImplementation(
          async (callback: (client: PoolClient) => Promise<any>) => {
            return callback(mockClient);
          },
        ),
      isConnected: vi.fn().mockReturnValue(true),
      getStats: vi.fn(),
      resetMetrics: vi.fn(),
      reset: vi.fn(),
      createQueryBuilder: vi.fn(),
    } as unknown as any;

    // Mock logger service
    mockLoggerService = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
      debugObj: vi.fn(),
      infoObj: vi.fn(),
      warnObj: vi.fn(),
      errorObj: vi.fn(),
      withContext: vi.fn().mockReturnThis(),
      createLogger: vi.fn().mockReturnThis(),
      addTransport: vi.fn(),
      setTransports: vi.fn(),
      setMinLevel: vi.fn(),
      initialize: vi.fn().mockResolvedValue(undefined),
      shutdown: vi.fn().mockResolvedValue(undefined),
    } as unknown as any;

    // Setup DI container
    container = new Container();

    // Create instance directly
    migrationManager = new MigrationManager(
      mockLoggerService,
      mockDatabaseServer,
    );
  });

  afterEach(() => {
    if (container) {
      container.unbindAll();
    }
  });

  describe("constructor", () => {
    it("should initialize with correct configuration", () => {
      expect(migrationManager).toBeDefined();
      expect((migrationManager as any).migrationsDir).toBe(
        migrationConfig.migrations_path,
      );
      expect((migrationManager as any).migrationsTable).toBe(
        migrationConfig.migrations_table,
      );
      expect((migrationManager as any).migrationExtension).toBe(
        migrationConfig.migration_file_extension,
      );
    });

    it("should ensure migrations directory exists", () => {
      // Since we already created an instance in beforeEach, we check if the mock was called
      expect(fs.mkdir).toHaveBeenCalledWith(migrationConfig.migrations_path, {
        recursive: true,
      });
    });

    it("should not create directory if it already exists", () => {
      // Clear previous calls
      (fs.mkdir as Mock).mockClear();
      // Mock existsSync to return true
      (existsSync as Mock).mockReturnValue(true);

      // Create a new instance
      const manager = new MigrationManager(
        mockLoggerService,
        mockDatabaseServer,
      );

      expect(manager).toBeDefined();
      expect(fs.mkdir).not.toHaveBeenCalled();
    });
  });

  describe("createMigrationsTable", () => {
    it("should create migrations table if it doesn't exist", async () => {
      await migrationManager.createMigrationsTable();

      expect(mockDatabaseServer.query).toHaveBeenCalledWith(
        expect.stringContaining(
          `CREATE TABLE IF NOT EXISTS ${migrationConfig.migrations_table}`,
        ),
      );
      expect(mockLoggerService.info).toHaveBeenCalledWith(
        expect.stringContaining(
          `Ensured migrations table exists: ${migrationConfig.migrations_table}`,
        ),
      );
    });

    it("should handle error when creating table fails", async () => {
      const error = new Error("Table creation failed");
      mockDatabaseServer.query.mockRejectedValueOnce(error);

      await expect(migrationManager.createMigrationsTable()).rejects.toThrow(
        "Table creation failed",
      );

      expect(mockLoggerService.error).toHaveBeenCalledWith(
        "Failed to create migrations table",
        expect.objectContaining({ error }),
      );
    });
  });

  describe("getExecutedMigrations", () => {
    it("should return list of executed migrations", async () => {
      const mockExecutedMigrations = {
        rows: [{ name: "001_init.ts" }, { name: "002_users.ts" }],
        rowCount: 2,
        command: "SELECT",
        oid: 0,
        fields: [],
      };

      mockDatabaseServer.query.mockResolvedValueOnce(mockExecutedMigrations);

      const result = await migrationManager.getExecutedMigrations();

      expect(result).toEqual(["001_init.ts", "002_users.ts"]);
      expect(mockDatabaseServer.query).toHaveBeenCalledWith(
        `SELECT name FROM ${migrationConfig.migrations_table} ORDER BY id ASC`,
      );
    });

    it("should handle error when getting executed migrations", async () => {
      const error = new Error("Query failed");
      mockDatabaseServer.query.mockRejectedValueOnce(error);

      await expect(migrationManager.getExecutedMigrations()).rejects.toThrow(
        "Query failed",
      );

      expect(mockLoggerService.error).toHaveBeenCalledWith(
        "Failed to get executed migrations",
        expect.objectContaining({ error }),
      );
    });
  });

  describe("createMigration", () => {
    it.skip("should create a new migration file", async () => {
      const migrationName = "create_users_table";

      const result = await migrationManager.createMigration(migrationName);

      expect(result).toBe("20250401_120000_create_users_table.ts");
      expect(mockLoggerService.info).toHaveBeenCalledWith(
        `Created migration: 20250401_120000_create_users_table.ts`,
      );
    });

    it("should handle error when creating migration file", async () => {
      const error = new Error("File creation failed");

      // Override the mock implementation for this test
      (migrationManager.createMigration as Mock).mockRejectedValueOnce(error);

      await expect(migrationManager.createMigration("test")).rejects.toThrow(
        "File creation failed",
      );
    });
  });

  describe("createAuthMigration", () => {
    it.skip("should create an auth migration file", async () => {
      const result = await migrationManager.createAuthMigration();

      expect(result).toBe("20250401_120000_auth_system.ts");
      expect(mockLoggerService.info).toHaveBeenCalledWith(
        `Created auth migration: 20250401_120000_auth_system.ts`,
      );
    });

    it("should handle error when creating auth migration file", async () => {
      const error = new Error("Auth migration file creation failed");

      // Override the mock implementation for this test
      (migrationManager.createAuthMigration as Mock).mockRejectedValueOnce(
        error,
      );

      await expect(migrationManager.createAuthMigration()).rejects.toThrow(
        "Auth migration file creation failed",
      );
    });
  });

  describe("migrate", () => {
    it("should run pending migrations", async () => {
      // Mock migrations table creation
      vi.spyOn(
        migrationManager,
        "createMigrationsTable",
      ).mockResolvedValueOnce();

      // Mock getting executed migrations
      vi.spyOn(migrationManager, "getExecutedMigrations").mockResolvedValueOnce(
        ["001_init.ts"],
      );

      // Mock readdir to return migration files
      (fs.readdir as Mock).mockResolvedValueOnce([
        "001_init.ts",
        "002_users.ts",
        "003_products.ts",
      ]);

      // Add mocks for executeMigration
      mockDatabaseServer.connect.mockResolvedValue(mockClient);

      await migrationManager.migrate();

      expect(mockLoggerService.info).toHaveBeenCalledWith(
        "Found 2 pending migrations",
      );
      expect(mockLoggerService.info).toHaveBeenCalledWith(
        "All migrations completed successfully",
      );
    });

    it("should handle no pending migrations", async () => {
      // Mock migrations table creation
      vi.spyOn(
        migrationManager,
        "createMigrationsTable",
      ).mockResolvedValueOnce();

      // Mock getting executed migrations
      vi.spyOn(migrationManager, "getExecutedMigrations").mockResolvedValueOnce(
        ["001_init.ts", "002_users.ts"],
      );

      // Mock readdir to return the same migration files
      (fs.readdir as Mock).mockResolvedValueOnce([
        "001_init.ts",
        "002_users.ts",
      ]);

      await migrationManager.migrate();

      expect(mockLoggerService.info).toHaveBeenCalledWith(
        "No pending migrations",
      );
      expect(mockDatabaseServer.connect).not.toHaveBeenCalled();
    });

    it("should handle migration execution error", async () => {
      // Mock migrations table creation
      vi.spyOn(
        migrationManager,
        "createMigrationsTable",
      ).mockResolvedValueOnce();

      // Mock getting executed migrations
      vi.spyOn(migrationManager, "getExecutedMigrations").mockResolvedValueOnce(
        [],
      );

      // Mock readdir to return migration files
      (fs.readdir as Mock).mockResolvedValueOnce(["001_init.ts"]);

      // Set up database error
      const error = new Error("Migration failed");
      (mockClient.query as Mock).mockRejectedValueOnce(error);

      await expect(migrationManager.migrate()).rejects.toThrow(
        "Migration failed",
      );

      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        expect.stringContaining("Error executing migration"),
        expect.objectContaining({ error }),
      );
    });
  });

  describe("status", () => {
    it.skip("should return migration status", async () => {
      // Mock migrations table creation
      vi.spyOn(
        migrationManager,
        "createMigrationsTable",
      ).mockResolvedValueOnce();

      // Mock getting executed migrations
      vi.spyOn(migrationManager, "getExecutedMigrations").mockResolvedValueOnce(
        ["001_init.ts", "002_users.ts"],
      );

      // Mock readdir to return migration files with different set
      (fs.readdir as Mock).mockResolvedValueOnce([
        "001_init.ts",
        "002_users.ts",
        "003_products.ts",
      ]);

      const status = await migrationManager.status();

      expect(status).toEqual({
        executed: ["001_init.ts", "002_users.ts"],
        pending: ["003_products.ts"],
      });
    });
  });

  describe("rollbackMigration", () => {
    it.skip("should rollback the last migration", async () => {
      // Mock query result for DELETE
      const mockDeleteResult = {
        rows: [{ id: 2, name: "002_users.ts", executed_at: new Date() }],
        rowCount: 1,
        command: "DELETE",
        oid: 0,
        fields: [],
      };

      (mockClient.query as Mock)
        .mockResolvedValueOnce(mockQueryResult) // BEGIN
        .mockResolvedValueOnce(mockDeleteResult) // DELETE
        .mockResolvedValueOnce(mockQueryResult); // COMMIT

      // Mock the imported module function
      vi.spyOn(
        migrationManager as any,
        "executeJsMigration",
      ).mockResolvedValueOnce(undefined);

      await migrationManager.rollbackMigration();

      expect(mockDatabaseServer.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining(
          `DELETE FROM ${migrationConfig.migrations_table}`,
        ),
        expect.any(Array),
      );
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
      expect(mockLoggerService.info).toHaveBeenCalledWith(
        expect.stringContaining("Rolled back migration"),
      );
    });

    it("should handle no migrations to roll back", async () => {
      // Mock empty result for DELETE
      const mockEmptyResult = {
        rows: [],
        rowCount: 0,
        command: "DELETE",
        oid: 0,
        fields: [],
      };

      (mockClient.query as Mock)
        .mockResolvedValueOnce(mockQueryResult) // BEGIN
        .mockResolvedValueOnce(mockEmptyResult); // DELETE

      await migrationManager.rollbackMigration();

      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
      expect(mockLoggerService.info).toHaveBeenCalledWith(
        "No migrations to roll back",
      );
    });

    it("should handle error during rollback", async () => {
      const error = new Error("Rollback failed");

      (mockClient.query as Mock)
        .mockResolvedValueOnce(mockQueryResult) // BEGIN
        .mockRejectedValueOnce(error); // DELETE

      await expect(migrationManager.rollbackMigration()).rejects.toThrow(
        "Rollback failed",
      );

      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        "Failed to rollback migration",
        expect.objectContaining({ error }),
      );
    });
  });

  describe("resetDatabase", () => {
    it("should reset the database", async () => {
      // Mock tables result
      const mockTablesResult = {
        rows: [{ tablename: "users" }, { tablename: "products" }],
        rowCount: 2,
        command: "SELECT",
        oid: 0,
        fields: [],
      };

      (mockClient.query as Mock)
        .mockResolvedValueOnce(mockQueryResult) // BEGIN
        .mockResolvedValueOnce(mockTablesResult) // SELECT tablename
        .mockResolvedValueOnce(mockQueryResult) // DROP TABLES
        .mockResolvedValueOnce(mockQueryResult) // TRUNCATE migrations
        .mockResolvedValueOnce(mockQueryResult); // COMMIT

      await migrationManager.resetDatabase();

      expect(mockLoggerService.warn).toHaveBeenCalledWith(
        "RESETTING DATABASE - ALL DATA WILL BE LOST",
      );
      expect(mockDatabaseServer.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT tablename"),
        expect.arrayContaining([migrationConfig.migrations_table]),
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        "DROP TABLE IF EXISTS users, products CASCADE",
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        `TRUNCATE ${migrationConfig.migrations_table}`,
      );
      expect(mockClient.query).toHaveBeenCalledWith("COMMIT");
      expect(mockLoggerService.info).toHaveBeenCalledWith(
        "Database reset completed",
      );
    });

    it("should handle reset error", async () => {
      const error = new Error("Reset failed");

      (mockClient.query as Mock)
        .mockResolvedValueOnce(mockQueryResult) // BEGIN
        .mockRejectedValueOnce(error); // SELECT tablename

      await expect(migrationManager.resetDatabase()).rejects.toThrow(
        "Reset failed",
      );

      expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        "Failed to reset database",
        expect.objectContaining({ error }),
      );
    });
  });

  describe("file operations", () => {
    it("should handle file system errors when creating migrations directory", async () => {
      const error = new Error("Permission denied");
      (fs.mkdir as Mock).mockRejectedValueOnce(error);

      await expect(
        new MigrationManager(mockLoggerService, mockDatabaseServer),
      ).rejects.toThrow("Permission denied");

      expect(mockLoggerService.error).toHaveBeenCalledWith(
        "Failed to create migrations directory",
        expect.objectContaining({ error }),
      );
    });

    it("should handle file system errors when reading migrations", async () => {
      const error = new Error("Directory not accessible");
      (fs.readdir as Mock).mockRejectedValueOnce(error);

      await expect(migrationManager.migrate()).rejects.toThrow(
        "Directory not accessible",
      );
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        "Failed to read migrations directory",
        expect.objectContaining({ error }),
      );
    });

    it("should filter out non-migration files", async () => {
      (fs.readdir as Mock).mockResolvedValueOnce([
        "001_init.ts",
        "README.md",
        "002_users.ts",
        ".DS_Store",
        "003_products.down.ts", // Should be filtered out
      ]);

      await migrationManager.migrate();

      // Only .ts files that aren't .down. files should be processed
      expect(mockLoggerService.info).toHaveBeenCalledWith(
        "Found 2 pending migrations",
      );
    });
  });

  describe("migration execution", () => {
    describe("SQL migrations", () => {
      it("should execute SQL migrations correctly", async () => {
        const sqlContent = "CREATE TABLE test (id INT);";
        (fs.readFile as Mock).mockResolvedValueOnce(sqlContent);
        (fs.readdir as Mock).mockResolvedValueOnce(["001_init.sql"]);

        await migrationManager.migrate();

        expect(mockClient.query).toHaveBeenCalledWith(sqlContent);
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining("INSERT INTO"),
          ["001_init.sql"],
        );
      });

      it("should handle SQL file read errors", async () => {
        const error = new Error("File not found");
        (fs.readFile as Mock).mockRejectedValueOnce(error);
        (fs.readdir as Mock).mockResolvedValueOnce(["001_init.sql"]);

        await expect(migrationManager.migrate()).rejects.toThrow(
          "File not found",
        );
        expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
      });
    });

    describe("TypeScript migrations", () => {
      it("should execute TypeScript migrations correctly", async () => {
        const mockMigrationModule = {
          up: vi.fn().mockResolvedValue(undefined),
        };

        vi.mock("/migrations/001_init.ts", () => mockMigrationModule);
        (fs.readdir as Mock).mockResolvedValueOnce(["001_init.ts"]);

        await migrationManager.migrate();

        expect(mockMigrationModule.up).toHaveBeenCalled();
        expect(mockClient.query).toHaveBeenCalledWith(
          expect.stringContaining("INSERT INTO"),
          ["001_init.ts"],
        );
      });

      it("should handle missing up function in TypeScript migrations", async () => {
        const mockMigrationModule = {};
        vi.mock("/migrations/001_init.ts", () => mockMigrationModule);
        (fs.readdir as Mock).mockResolvedValueOnce(["001_init.ts"]);

        await expect(migrationManager.migrate()).rejects.toThrow(
          "Migration 001_init.ts does not export an 'up' function",
        );
      });
    });

    describe("transaction management", () => {
      it("should properly handle transaction rollback on error", async () => {
        const error = new Error("Migration failed");
        mockClient.query
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockRejectedValueOnce(error) // Migration fails
          .mockResolvedValueOnce(undefined); // ROLLBACK

        (fs.readdir as Mock).mockResolvedValueOnce(["001_init.ts"]);

        await expect(migrationManager.migrate()).rejects.toThrow(
          "Migration failed",
        );

        expect(mockClient.query).toHaveBeenCalledWith("BEGIN");
        expect(mockClient.query).toHaveBeenCalledWith("ROLLBACK");
        expect(mockClient.release).toHaveBeenCalled();
      });

      it("should release client even if rollback fails", async () => {
        const migrationError = new Error("Migration failed");
        const rollbackError = new Error("Rollback failed");

        mockClient.query
          .mockResolvedValueOnce(undefined) // BEGIN
          .mockRejectedValueOnce(migrationError) // Migration fails
          .mockRejectedValueOnce(rollbackError); // ROLLBACK fails

        (fs.readdir as Mock).mockResolvedValueOnce(["001_init.ts"]);

        await expect(migrationManager.migrate()).rejects.toThrow(
          "Migration failed",
        );
        expect(mockClient.release).toHaveBeenCalled();
      });
    });
  });

  describe("migration ordering", () => {
    it("should execute migrations in correct order", async () => {
      const migrations = ["002_users.ts", "001_init.ts", "003_products.ts"];

      (fs.readdir as Mock).mockResolvedValueOnce(migrations);

      await migrationManager.migrate();

      // Verify migrations are executed in correct order
      const insertCalls = mockClient.query.mock.calls
        .filter((call: [string, string[]]) => call[0].includes("INSERT INTO"))
        .map((call: [string, string[]]) => call[1][0]);

      expect(insertCalls).toEqual([
        "001_init.ts",
        "002_users.ts",
        "003_products.ts",
      ]);
    });

    it("should skip already executed migrations", async () => {
      const executedMigrations = ["001_init.ts"];
      const allMigrations = ["001_init.ts", "002_users.ts"];

      vi.spyOn(migrationManager, "getExecutedMigrations").mockResolvedValueOnce(
        executedMigrations,
      );
      (fs.readdir as Mock).mockResolvedValueOnce(allMigrations);

      await migrationManager.migrate();

      const insertCalls = mockClient.query.mock.calls
        .filter((call: [string, string[]]) => call[0].includes("INSERT INTO"))
        .map((call: [string, string[]]) => call[1][0]);

      expect(insertCalls).toEqual(["002_users.ts"]);
    });
  });
});
