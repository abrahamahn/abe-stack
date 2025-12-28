import path from "path";

import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  migrationConfig,
  createMigrationTemplate,
  createAuthMigrationTemplate,
  MigrationConfig,
} from "@/server/infrastructure/config/domain/MigrationConfig";

describe("migrationConfig", () => {
  describe("configuration", () => {
    it("should export valid MigrationConfig object", () => {
      expect(migrationConfig).toBeDefined();
      expect(migrationConfig.migrations_path).toBeDefined();
      expect(migrationConfig.migrations_table).toBe("migrations");
      expect(migrationConfig.migration_file_extension).toBe(".ts");
    });

    it("should set migration_path to a valid directory", () => {
      expect(typeof migrationConfig.migrations_path).toBe("string");
      expect(migrationConfig.migrations_path).toContain("migrations");
      expect(path.isAbsolute(migrationConfig.migrations_path)).toBe(true);
    });

    it("should have all required MigrationConfig properties", () => {
      const config: MigrationConfig = migrationConfig;
      const requiredProps = [
        "migrations_path",
        "migrations_table",
        "migration_file_extension",
      ];
      requiredProps.forEach((prop) => {
        expect(config).toHaveProperty(prop);
      });
    });

    it("should use process.cwd() for migrations_path", () => {
      expect(migrationConfig.migrations_path).toContain(process.cwd());
    });
  });

  describe("createMigrationTemplate", () => {
    it("should generate a valid migration template", () => {
      const migrationName = "test_migration";
      const template = createMigrationTemplate(migrationName);

      // Check template structure
      expect(template).toContain(
        "import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate'"
      );
      expect(template).toContain(
        "export const shorthands: ColumnDefinitions | undefined = undefined"
      );
      expect(template).toContain(`// Migration: ${migrationName}`);
      expect(template).toContain(
        "export function up(pgm: MigrationBuilder): void {"
      );
      expect(template).toContain(
        "export function down(pgm: MigrationBuilder): void {"
      );
    });

    it("should include proper TypeScript types", () => {
      const template = createMigrationTemplate("test");
      expect(template).toContain("pgm: MigrationBuilder");
      expect(template).toContain(": void {");
      expect(template).toContain(": ColumnDefinitions");
    });

    it("should include helpful example code", () => {
      const template = createMigrationTemplate("test");
      expect(template).toContain("pgm.createTable");
      expect(template).toContain("type: 'varchar(1000)'");
      expect(template).toContain("notNull: true");
      expect(template).toContain("pgm.createIndex");
      expect(template).toContain("pgm.dropTable");
    });

    it("should include creation timestamp", () => {
      const mockDate = new Date("2025-04-01T12:00:00.000Z");
      const spy = vi.spyOn(global, "Date").mockImplementation(() => mockDate);

      const template = createMigrationTemplate("test");
      expect(template).toContain(`// Created: ${mockDate.toISOString()}`);

      spy.mockRestore();
    });
  });

  describe("createAuthMigrationTemplate", () => {
    let template: string;

    beforeEach(() => {
      template = createAuthMigrationTemplate();
    });

    it("should generate a valid auth migration template", () => {
      // Check template structure
      expect(template).toContain(
        "import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate'"
      );
      expect(template).toContain("// Migration: Auth System Tables");
    });

    it("should include all required auth tables", () => {
      const requiredTables = [
        "users",
        "roles",
        "permissions",
        "user_roles",
        "role_permissions",
        "tokens",
        "password_reset_tokens",
        "user_profiles",
        "user_preferences",
        "user_connections",
      ];

      requiredTables.forEach((table) => {
        expect(template).toContain(`pgm.createTable('${table}'`);
      });
    });

    it("should include proper column definitions", () => {
      // Check users table columns
      expect(template).toMatch(/id.*uuid.*primaryKey/);
      expect(template).toMatch(/username.*varchar\(100\).*notNull/);
      expect(template).toMatch(/email.*varchar\(255\).*notNull/);
      expect(template).toMatch(/created_at.*timestamp.*notNull/);

      // Check roles table columns
      expect(template).toMatch(/name.*varchar\(50\).*notNull/);
      expect(template).toMatch(/is_system.*boolean.*notNull/);

      // Check permissions table columns
      expect(template).toMatch(/resource.*varchar\(100\).*notNull/);
      expect(template).toMatch(/action.*varchar\(100\).*notNull/);
    });

    it("should include all required indexes", () => {
      const requiredIndexes = [
        "tokens.token",
        "tokens.user_id",
        "password_reset_tokens.token",
        "user_profiles.user_id",
        "user_preferences.user_id",
        "user_connections.user_id",
      ];

      requiredIndexes.forEach((index) => {
        const [table, column] = index.split(".");
        expect(template).toContain(`pgm.createIndex('${table}', '${column}'`);
      });
    });

    it("should include all required constraints", () => {
      expect(template).toContain("permissions_resource_action_unique");
      expect(template).toContain("user_roles_pkey");
      expect(template).toContain("role_permissions_pkey");
      expect(template).toContain("user_connections_unique");
    });

    it("should include proper default data", () => {
      // Check default roles
      expect(template).toContain(
        "'admin', 'Administrator with full system access'"
      );
      expect(template).toContain("'user', 'Regular application user'");
      expect(template).toContain(
        "'moderator', 'User with moderation privileges'"
      );

      // Check default permissions
      expect(template).toContain("'Manage Users', 'user', 'manage'");
      expect(template).toContain("'Read Users', 'user', 'read'");
      expect(template).toContain("'Create Users', 'user', 'create'");
    });

    it("should include proper down migration", () => {
      expect(template).toContain("export function down(pgm: MigrationBuilder)");

      const expectedDropOrder = [
        "user_connections",
        "user_preferences",
        "user_profiles",
        "password_reset_tokens",
        "tokens",
        "role_permissions",
        "user_roles",
        "permissions",
        "roles",
        "users",
      ];

      let lastIndex = -1;
      expectedDropOrder.forEach((table) => {
        const index = template.indexOf(`pgm.dropTable('${table}')`);
        expect(index).toBeGreaterThan(-1);
        expect(index).toBeGreaterThan(lastIndex);
        lastIndex = index;
      });
    });
  });
});
