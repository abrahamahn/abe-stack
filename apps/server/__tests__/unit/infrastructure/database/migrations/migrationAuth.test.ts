// Import from the module
import { describe, it, expect, beforeEach } from "vitest";

import {
  up,
  down,
  shorthands,
} from "@/server/infrastructure/database/migrations/migrationAuth";

// Mock MigrationBuilder
class MockMigrationBuilder {
  createdTables: string[] = [];
  droppedTables: string[] = [];
  createdExtensions: string[] = [];
  createdIndexes: string[] = [];
  createdConstraints: string[] = [];
  executedSql: string[] = [];

  createExtension(name: string, _options: Record<string, unknown>): void {
    this.createdExtensions.push(name);
  }

  createTable(
    name: string,
    _columns: Record<string, unknown>,
    _options?: Record<string, unknown>
  ): void {
    this.createdTables.push(name);
  }

  dropTable(name: string): void {
    this.droppedTables.push(name);
  }

  createIndex(
    tableName: string,
    columnName: string,
    _options?: Record<string, unknown>
  ): void {
    this.createdIndexes.push(`${tableName}.${columnName}`);
  }

  createConstraint(
    tableName: string,
    constraintName: string,
    _options: Record<string, unknown>
  ): void {
    this.createdConstraints.push(`${tableName}.${constraintName}`);
  }

  addConstraint(
    tableName: string,
    constraintName: string,
    _options: Record<string, unknown>
  ): void {
    this.createdConstraints.push(`${tableName}.${constraintName}`);
  }

  sql(query: string): void {
    this.executedSql.push(query);
  }

  func(name: string): string {
    return `FUNCTION:${name}()`;
  }
}

describe("migrationAuth", () => {
  let mockBuilder: MockMigrationBuilder;

  beforeEach(() => {
    mockBuilder = new MockMigrationBuilder();
  });

  describe("schema structure", () => {
    it("should have defined shorthands", () => {
      expect(shorthands).toBeUndefined();
    });
  });

  describe("up migration", () => {
    beforeEach(() => {
      up(mockBuilder as any);
    });

    it("should create uuid extension", () => {
      expect(mockBuilder.createdExtensions).toContain("uuid-ossp");
      expect(mockBuilder.createdExtensions.length).toBe(1);
    });

    it("should create all required tables with correct order", () => {
      const expectedTables = [
        "users",
        "roles",
        "permissions",
        "user_roles",
        "role_permissions",
        "tokens",
        "password_reset_tokens",
        "verification_tokens",
        "user_profiles",
        "user_preferences",
        "user_connections",
      ];

      expectedTables.forEach((table, index) => {
        expect(mockBuilder.createdTables[index]).toBe(table);
      });
      expect(mockBuilder.createdTables.length).toBe(expectedTables.length);
    });

    it("should create all required indexes", () => {
      const expectedIndexes = [
        "users.email",
        "users.username",
        "users.active",
        "users.remember_token",
        "users.password_reset_token",
        "users.email_token",
        "users.roles",
        "users.api_keys",
        "user_roles.user_id",
        "user_roles.role_id",
        "role_permissions.role_id",
        "role_permissions.permission_id",
        "tokens.token",
        "tokens.user_id",
        "tokens.type",
        "password_reset_tokens.token",
        "password_reset_tokens.user_id",
        "password_reset_tokens.status",
        "verification_tokens.token",
        "verification_tokens.user_id",
        "user_profiles.user_id",
        "user_preferences.user_id",
        "user_connections.user_id",
        "user_connections.target_user_id",
        "user_connections.type",
      ];

      expectedIndexes.forEach((index) => {
        expect(mockBuilder.createdIndexes).toContain(index);
      });
      expect(mockBuilder.createdIndexes.length).toBe(expectedIndexes.length);
    });

    it("should create all required constraints", () => {
      const expectedConstraints = [
        "users.chk_users_email_format",
        "permissions.permissions_resource_action_unique",
        "user_roles.user_roles_user_role_unique",
        "role_permissions.role_permissions_role_permission_unique",
        "user_connections.user_connections_unique",
      ];

      expectedConstraints.forEach((constraint) => {
        expect(mockBuilder.createdConstraints).toContain(constraint);
      });
      expect(mockBuilder.createdConstraints.length).toBe(
        expectedConstraints.length
      );
    });

    describe("default data insertion", () => {
      it("should insert default roles", () => {
        const sql = mockBuilder.executedSql[0];

        // Check default roles
        expect(sql).toContain(
          "INSERT INTO roles (name, description, is_system)"
        );
        expect(sql).toContain(
          "('admin', 'Administrator with full system access', true)"
        );
        expect(sql).toContain("('user', 'Regular application user', true)");
        expect(sql).toContain(
          "('moderator', 'User with moderation privileges', true)"
        );
      });

      it("should insert default permissions", () => {
        const sql = mockBuilder.executedSql[0];

        // Check core permissions
        const expectedPermissions = [
          "('Manage Users', 'user', 'manage', true)",
          "('Read Users', 'user', 'read', true)",
          "('Create Users', 'user', 'create', true)",
          "('Update Users', 'user', 'update', true)",
          "('Delete Users', 'user', 'delete', true)",
          "('Manage Roles', 'role', 'manage', true)",
          "('Read Roles', 'role', 'read', true)",
        ];

        expectedPermissions.forEach((permission) => {
          expect(sql).toContain(permission);
        });
      });

      it("should assign correct permissions to roles", () => {
        const sql = mockBuilder.executedSql[0];

        // Check admin role permissions
        expect(sql).toContain("SELECT id FROM roles WHERE name = 'admin'");
        expect(sql).toContain("SELECT id FROM roles WHERE name = 'user'");

        // Check user role basic permissions
        expect(sql).toContain("WHERE resource = 'user' AND action = 'read'");
      });
    });
  });

  describe("down migration", () => {
    beforeEach(() => {
      down(mockBuilder as any);
    });

    it("should drop all tables in correct dependency order", () => {
      const expectedTablesInOrder = [
        "user_connections",
        "user_preferences",
        "user_profiles",
        "verification_tokens",
        "password_reset_tokens",
        "tokens",
        "role_permissions",
        "user_roles",
        "permissions",
        "roles",
        "users",
      ];

      expectedTablesInOrder.forEach((table, index) => {
        expect(mockBuilder.droppedTables[index]).toBe(table);
      });
      expect(mockBuilder.droppedTables.length).toBe(
        expectedTablesInOrder.length
      );
    });

    it("should not drop the uuid-ossp extension", () => {
      expect(mockBuilder.executedSql).not.toContain("DROP EXTENSION uuid-ossp");
    });
  });
});
