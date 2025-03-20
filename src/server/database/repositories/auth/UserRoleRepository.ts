import { Logger } from "../../../services/dev/logger/LoggerService";
import { Role, RoleAttributes } from "../../models/auth/Role";
import { UserAttributes } from "../../models/auth/User";
import { UserRole, UserRoleAttributes } from "../../models/auth/UserRole";
import { BaseRepository } from "../BaseRepository";

/**
 * Repository class for handling UserRole database operations.
 * This class is responsible for:
 * 1. All database operations related to user-role assignments
 * 2. Converting between database and model formats
 * 3. Providing specific query methods for user-role relationships
 * 4. NOT implementing business logic - that belongs in the UserRole model
 */
export class UserRoleRepository extends BaseRepository<UserRole> {
  protected logger = new Logger("UserRoleRepository");
  protected tableName = "user_roles";
  protected columns = [
    "id",
    "user_id as userId",
    "role_id as roleId",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super();
  }

  /**
   * Find user roles by user ID
   * @param userId The user ID to search for
   * @returns Array of UserRole instances
   */
  async findByUserId(userId: string): Promise<UserRole[]> {
    const results = await this.findByField("user_id", userId);
    return this.mapResultRows(
      results,
      (result) => new UserRole(result as unknown as UserRoleAttributes),
    );
  }

  /**
   * Find roles for a user
   * @param userId The user ID to search for
   * @returns Array of Role instances
   */
  async findRolesForUser(userId: string): Promise<Role[]> {
    const query = `
      SELECT r.id, r.name, r.description, r.created_at as "createdAt", r.updated_at as "updatedAt"
      FROM roles r
      JOIN ${this.tableName} ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY r.name
    `;

    const result = await this.executeQuery<Record<string, unknown>>(query, [
      userId,
    ]);
    return this.mapResultRows(
      result.rows,
      (row) => new Role(row as unknown as RoleAttributes),
    );
  }

  /**
   * Find users with a specific role
   * @param roleId The role ID to search for
   * @param limit Maximum number of users to return
   * @param offset Number of users to skip
   * @returns Array of UserAttributes
   */
  async findUsersWithRole(
    roleId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<UserAttributes[]> {
    const query = `
      SELECT u.id, u.username, u.email, u.display_name as "displayName", 
        u.first_name as "firstName", u.last_name as "lastName", 
        u.bio, u.profile_image as "profileImage", u.banner_image as "bannerImage",
        u.role, u.is_verified as "isVerified", u.email_confirmed as "emailConfirmed",
        u.created_at as "createdAt", u.updated_at as "updatedAt"
      FROM users u
      JOIN ${this.tableName} ur ON u.id = ur.user_id
      WHERE ur.role_id = $1
      ORDER BY u.username
      LIMIT $2 OFFSET $3
    `;

    const result = await this.executeQuery<Record<string, unknown>>(query, [
      roleId,
      limit,
      offset,
    ]);
    return result.rows as unknown as UserAttributes[];
  }

  /**
   * Check if a user has a specific role
   * @param userId The user ID to check
   * @param roleId The role ID to check
   * @returns True if the user has the role
   */
  async hasRole(userId: string, roleId: string): Promise<boolean> {
    const query = `
      SELECT id
      FROM ${this.tableName}
      WHERE user_id = $1 AND role_id = $2
      LIMIT 1
    `;

    const result = await this.executeQuery<{ id: string }>(query, [
      userId,
      roleId,
    ]);
    return result.rows.length > 0;
  }

  /**
   * Assign a role to a user
   * @param userId The user ID to assign the role to
   * @param roleId The role ID to assign
   * @returns The created UserRole instance
   */
  async assignRole(userId: string, roleId: string): Promise<UserRole> {
    // Create a new user role instance
    const userRole = new UserRole({ userId, roleId });
    userRole.validate();

    // Check if assignment already exists
    const existingRoleQuery = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE user_id = $1 AND role_id = $2
      LIMIT 1
    `;

    const existingResult = await this.executeQuery<UserRoleAttributes>(
      existingRoleQuery,
      [userId, roleId],
    );
    const existing =
      existingResult.rows.length > 0
        ? new UserRole(existingResult.rows[0])
        : null;

    if (existing) {
      return existing;
    }

    // Create new assignment
    const result = await super.create(userRole);
    return new UserRole(result as unknown as UserRoleAttributes);
  }

  /**
   * Remove a role from a user
   * @param userId The user ID to remove the role from
   * @param roleId The role ID to remove
   * @returns True if the role was removed
   */
  async removeRole(userId: string, roleId: string): Promise<boolean> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE user_id = $1 AND role_id = $2
      RETURNING id
    `;

    const result = await this.executeQuery<{ id: string }>(query, [
      userId,
      roleId,
    ]);
    return result.rows.length > 0;
  }

  /**
   * Remove all roles from a user
   * @param userId The user ID to remove all roles from
   * @returns Number of roles removed
   */
  async removeAllRoles(userId: string): Promise<number> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE user_id = $1
      RETURNING id
    `;

    const result = await this.executeQuery<{ id: string }>(query, [userId]);
    return result.rows.length;
  }

  /**
   * Map database result to UserRole model
   */
  protected mapResultToModel(row: Record<string, unknown>): UserRole {
    if (!row) return null as unknown as UserRole;

    return new UserRole({
      id: row.id as string,
      userId: (row.userId || row.user_id) as string,
      roleId: (row.roleId || row.role_id) as string,
      createdAt: (row.createdAt || row.created_at) as Date,
      updatedAt: (row.updatedAt || row.updated_at) as Date,
    });
  }
}

// Export a singleton instance
export const userRoleRepository = new UserRoleRepository();
