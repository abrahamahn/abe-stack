import { Logger } from "../../../services/dev/logger/LoggerService";
import { Permission } from "../../models/auth/Permission";
import { Role } from "../../models/auth/Role";
import { RolePermission } from "../../models/auth/RolePermission";
import { BaseRepository } from "../BaseRepository";

/**
 * Repository class for handling RolePermission database operations.
 * This class is responsible for:
 * 1. All database operations related to role permissions
 * 2. Converting between database and model formats
 * 3. Providing specific query methods for role permissions
 * 4. NOT implementing business logic - that belongs in the RolePermission model
 */
export class RolePermissionRepository extends BaseRepository<RolePermission> {
  protected logger = new Logger("RolePermissionRepository");
  protected tableName = "role_permissions";
  protected columns = [
    "id",
    "role_id as roleId",
    "permission_id as permissionId",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super();
  }

  /**
   * Find role permissions by role ID
   */
  async findByRoleId(roleId: string): Promise<RolePermission[]> {
    const results = await this.findByField("role_id", roleId);
    return results.map((result) => new RolePermission(result));
  }

  /**
   * Find permissions for a role
   */
  async findPermissionsForRole(roleId: string): Promise<Permission[]> {
    const query = `
      SELECT p.id, p.name, p.description, p.resource, p.action, p.created_at as "createdAt", p.updated_at as "updatedAt"
      FROM permissions p
      JOIN ${this.tableName} rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.resource, p.action
    `;

    const results = await this.executeQuery<Record<string, unknown>>(query, [
      roleId,
    ]);
    return results.rows.map((row) => {
      return new Permission({
        id: row.id as string,
        name: row.name as string,
        description: row.description as string,
        resource: row.resource as string,
        action: row.action as string,
        createdAt: (row.createdAt || row.created_at) as Date,
        updatedAt: (row.updatedAt || row.updated_at) as Date,
      });
    });
  }

  /**
   * Find roles for a permission
   */
  async findRolesForPermission(permissionId: string): Promise<Role[]> {
    const query = `
      SELECT r.id, r.name, r.description, r.created_at as "createdAt", r.updated_at as "updatedAt"
      FROM roles r
      JOIN ${this.tableName} rp ON r.id = rp.role_id
      WHERE rp.permission_id = $1
      ORDER BY r.name
    `;

    const results = await this.executeQuery<Record<string, unknown>>(query, [
      permissionId,
    ]);
    return results.rows.map((row) => {
      return new Role({
        id: row.id as string,
        name: row.name as string,
        description: row.description as string,
        createdAt: (row.createdAt || row.created_at) as Date,
        updatedAt: (row.updatedAt || row.updated_at) as Date,
      });
    });
  }

  /**
   * Check if a role has a specific permission
   */
  async hasPermission(roleId: string, permissionId: string): Promise<boolean> {
    const query = `
      SELECT id
      FROM ${this.tableName}
      WHERE role_id = $1 AND permission_id = $2
      LIMIT 1
    `;

    const result = await this.executeQuery<{ id: string }>(query, [
      roleId,
      permissionId,
    ]);
    return result.rows.length > 0;
  }

  /**
   * Assign a permission to a role
   */
  async assignPermission(
    roleId: string,
    permissionId: string,
  ): Promise<boolean> {
    const rolePermission = await this.create({ roleId, permissionId });
    return !!rolePermission;
  }

  /**
   * Remove a permission from a role
   */
  async removePermission(
    roleId: string,
    permissionId: string,
  ): Promise<boolean> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE role_id = $1 AND permission_id = $2
      RETURNING id
    `;

    const result = await this.executeQuery<{ id: string }>(query, [
      roleId,
      permissionId,
    ]);
    return result.rowCount > 0;
  }

  /**
   * Remove all permissions from a role
   */
  async removeAllPermissions(roleId: string): Promise<number> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE role_id = $1
      RETURNING id
    `;

    const result = await this.executeQuery<{ id: string }>(query, [roleId]);
    return result.rowCount;
  }

  /**
   * Map database result to RolePermission model
   */
  protected mapResultToModel(row: Record<string, unknown>): RolePermission {
    if (!row) return null as unknown as RolePermission;

    return new RolePermission({
      id: row.id as string,
      roleId: (row.roleId || row.role_id) as string,
      permissionId: (row.permissionId || row.permission_id) as string,
      createdAt: (row.createdAt || row.created_at) as Date,
      updatedAt: (row.updatedAt || row.updated_at) as Date,
    });
  }
}
