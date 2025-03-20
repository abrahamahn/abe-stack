import { Logger } from "../../../services/dev/logger/LoggerService";
import { Permission, PermissionAttributes } from "../../models/auth/Permission";
import { BaseRepository } from "../BaseRepository";

/**
 * Repository class for handling Permission database operations.
 * This class is responsible for:
 * 1. All database operations related to permissions
 * 2. Converting between database and model formats
 * 3. Providing specific query methods for permissions
 * 4. NOT implementing business logic - that belongs in the Permission model
 */
export class PermissionRepository extends BaseRepository<Permission> {
  protected logger = new Logger("PermissionRepository");
  protected tableName = "permissions";
  protected columns = [
    "id",
    "name",
    "description",
    "resource",
    "action",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super();
  }

  /**
   * Find a permission by its primary key
   */
  async findByPk(id: string): Promise<Permission | null> {
    const result = await this.findOneByField("id", id);
    if (!result) return null;
    return new Permission(result as unknown as PermissionAttributes);
  }

  /**
   * Find all permissions
   */
  async findAll(): Promise<Permission[]> {
    const results = await this.findByField("id", null, {
      orderBy: "resource, action ASC",
    });
    return this.mapResultRows(
      results,
      (result) => new Permission(result as unknown as PermissionAttributes),
    );
  }

  /**
   * Find permissions by resource
   */
  async findByResource(resource: string): Promise<Permission[]> {
    const results = await this.findByField("resource", resource, {
      orderBy: "action ASC",
    });
    return this.mapResultRows(
      results,
      (result) => new Permission(result as unknown as PermissionAttributes),
    );
  }

  /**
   * Find a permission by resource and action
   */
  async findByResourceAndAction(
    resource: string,
    action: string,
  ): Promise<Permission | null> {
    const query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE resource = $1 AND action = $2
    `;

    const result = await this.executeQuery<PermissionAttributes>(query, [
      resource,
      action,
    ]);
    if (!result.rows.length) return null;

    return new Permission(result.rows[0] as unknown as PermissionAttributes);
  }

  /**
   * Create a new permission
   */
  async create(
    data: Omit<PermissionAttributes, "id" | "createdAt" | "updatedAt">,
  ): Promise<Permission> {
    const permission = new Permission(data);
    permission.validate();

    const result = await super.create(permission);
    return new Permission(result as unknown as PermissionAttributes);
  }

  /**
   * Update a permission
   */
  async update(
    id: string,
    data: Partial<PermissionAttributes>,
  ): Promise<Permission | null> {
    const permission = new Permission(data);
    permission.validate();

    const result = await super.update(id, permission);
    if (!result) return null;

    return new Permission(result as unknown as PermissionAttributes);
  }

  /**
   * Delete a permission
   */
  async delete(id: string): Promise<boolean> {
    return super.delete(id);
  }

  /**
   * Map database result to Permission model
   */
  protected mapResultToModel(row: Record<string, unknown>): Permission {
    if (!row) return null as unknown as Permission;

    return new Permission({
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      resource: row.resource as string,
      action: row.action as string,
      createdAt: (row.createdAt || row.created_at) as Date,
      updatedAt: (row.updatedAt || row.updated_at) as Date,
    });
  }
}
