import { injectable, inject } from "inversify";

import { UserRole } from "./UserRole";
import { IDatabaseServer } from "../../../infrastructure/database";
import { TYPES } from "../../../infrastructure/di/types";
import { ILoggerService } from "../../../infrastructure/logging";
import { BaseRepository } from "../../base/baseRepository";

/**
 * Repository for managing user roles
 */
@injectable()
export class UserRoleRepository extends BaseRepository<UserRole> {
  /**
   * The database table name
   */
  protected tableName: string = "user_roles";

  /**
   * The table columns
   */
  protected columns: string[] = [
    "id",
    "user_id",
    "role_id",
    "created_at",
    "updated_at",
  ];

  /**
   * Constructor
   */
  constructor(
    @inject(TYPES.LoggerService) logger: ILoggerService,
    @inject(TYPES.DatabaseService) databaseService: IDatabaseServer
  ) {
    super(logger, databaseService, "UserRole");
  }

  /**
   * Find all user roles by user ID
   */
  async findByUserId(userId: string): Promise<UserRole[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1
      `;

      const result = await this.executeQuery(query, [userId]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding roles for user", { userId, error });
      return [];
    }
  }

  /**
   * Find all user roles by role ID
   */
  async findByRoleId(roleId: string): Promise<UserRole[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE role_id = $1
      `;

      const result = await this.executeQuery(query, [roleId]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding users for role", { roleId, error });
      return [];
    }
  }

  /**
   * Find a user role by user ID and role ID
   */
  async findByUserAndRole(
    userId: string,
    roleId: string
  ): Promise<UserRole | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1 AND role_id = $2
        LIMIT 1
      `;

      const result = await this.executeQuery(query, [userId, roleId]);

      if (result.rowCount === 0) {
        return null;
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      this.logger.error("Error finding user role", { userId, roleId, error });
      return null;
    }
  }

  /**
   * Delete a user role by user ID and role ID
   */
  async deleteByUserAndRole(userId: string, roleId: string): Promise<boolean> {
    try {
      const query = `
        DELETE FROM ${this.tableName}
        WHERE user_id = $1 AND role_id = $2
        RETURNING id
      `;

      const result = await this.executeQuery(query, [userId, roleId]);
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error("Error deleting user role", { userId, roleId, error });
      return false;
    }
  }

  /**
   * Delete all roles for a user
   */
  async deleteAllForUser(userId: string): Promise<number> {
    try {
      const query = `
        DELETE FROM ${this.tableName}
        WHERE user_id = $1
        RETURNING id
      `;

      const result = await this.executeQuery(query, [userId]);
      return result.rowCount;
    } catch (error) {
      this.logger.error("Error deleting all roles for user", { userId, error });
      return 0;
    }
  }

  /**
   * Delete all user assignments for a role
   */
  async deleteAllForRole(roleId: string): Promise<number> {
    try {
      const query = `
        DELETE FROM ${this.tableName}
        WHERE role_id = $1
        RETURNING id
      `;

      const result = await this.executeQuery(query, [roleId]);
      return result.rowCount;
    } catch (error) {
      this.logger.error("Error deleting all users for role", { roleId, error });
      return 0;
    }
  }

  /**
   * Map database row to model
   */
  protected mapResultToModel(row: Record<string, unknown>): UserRole {
    return new UserRole({
      id: row.id as string,
      userId: row.user_id as string,
      roleId: row.role_id as string,
      createdAt: row.created_at
        ? new Date(row.created_at as string)
        : new Date(),
      updatedAt: row.updated_at
        ? new Date(row.updated_at as string)
        : new Date(),
    });
  }
}
