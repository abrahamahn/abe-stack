import { Logger } from "../../../services/dev/logger/LoggerService";
import { Role, RoleAttributes } from "../../models/auth/Role";
import { BaseRepository } from "../BaseRepository";

/**
 * Repository class for handling Role database operations.
 * This class is responsible for:
 * 1. All database operations related to roles
 * 2. Converting between database and model formats
 * 3. Providing specific query methods for roles
 * 4. NOT implementing business logic - that belongs in the Role model
 */
export class RoleRepository extends BaseRepository<Role> {
  protected logger = new Logger("RoleRepository");
  protected tableName = "roles";
  protected columns = [
    "id",
    "name",
    "description",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super();
  }

  /**
   * Find a role by its primary key
   */
  async findByPk(id: string): Promise<Role | null> {
    const result = await this.findOneByField("id", id);
    if (!result) return null;
    return new Role(result as unknown as RoleAttributes);
  }

  /**
   * Find all roles
   */
  async findAll(): Promise<Role[]> {
    const results = await this.findByField("id", null, { orderBy: "name ASC" });
    return this.mapResultRows(
      results,
      (result) => new Role(result as unknown as RoleAttributes),
    );
  }

  /**
   * Find a role by name
   */
  async findByName(name: string): Promise<Role | null> {
    const result = await this.findOneByField("name", name);
    if (!result) return null;
    return new Role(result as unknown as RoleAttributes);
  }

  /**
   * Create a new role
   */
  async create(
    data: Omit<RoleAttributes, "id" | "createdAt" | "updatedAt">,
  ): Promise<Role> {
    const role = new Role(data);
    role.validate();

    const result = await super.create(role);
    return new Role(result as unknown as RoleAttributes);
  }

  /**
   * Update a role
   */
  async update(
    id: string,
    data: Partial<RoleAttributes>,
  ): Promise<Role | null> {
    const role = new Role(data);
    role.validate();

    // Prevent updating system roles
    const existingRole = await this.findByPk(id);
    if (existingRole && existingRole.isSystemRole()) {
      throw new Error(`Cannot modify system role: ${existingRole.name}`);
    }

    const result = await super.update(id, role);
    if (!result) return null;

    return new Role(result as unknown as RoleAttributes);
  }

  /**
   * Delete a role
   */
  async delete(id: string): Promise<boolean> {
    // Prevent deleting system roles
    const existingRole = await this.findByPk(id);
    if (existingRole && existingRole.isSystemRole()) {
      throw new Error(`Cannot delete system role: ${existingRole.name}`);
    }

    return super.delete(id);
  }

  /**
   * Map database result to Role model
   */
  protected mapResultToModel(row: Record<string, unknown>): Role {
    if (!row) return null as unknown as Role;

    return new Role({
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      createdAt: (row.createdAt || row.created_at) as Date,
      updatedAt: (row.updatedAt || row.updated_at) as Date,
    });
  }
}
