import { BaseModel } from "../BaseModel";

/**
 * Interface defining the structure of a UserRole
 * Represents the many-to-many relationship between users and roles
 */
export interface UserRoleAttributes extends BaseModel {
  userId: string;
  roleId: string;
}

/**
 * UserRole model representing the relationship between users and roles.
 * This class handles:
 * 1. User-role relationship data structure
 * 2. Validation of user-role assignments
 * 3. Business logic related to role assignments
 * 4. NOT database operations - those belong in UserRoleRepository
 */
export class UserRole
  extends BaseModel
  implements Omit<UserRoleAttributes, keyof BaseModel>
{
  userId: string;
  roleId: string;

  constructor(data: Partial<UserRoleAttributes>) {
    super();
    this.userId = data.userId || "";
    this.roleId = data.roleId || "";
  }

  /**
   * Converts the user role to a JSON object
   * @returns A plain object representation of the user role
   */
  toJSON(): Omit<UserRoleAttributes, "generateId"> {
    return {
      id: this.id,
      userId: this.userId,
      roleId: this.roleId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Validates the user role data
   * @throws Error if validation fails
   */
  validate(): void {
    if (!this.userId) {
      throw new Error("User ID is required");
    }
    if (!this.roleId) {
      throw new Error("Role ID is required");
    }
  }

  /**
   * Checks if this user role assignment is valid
   * @returns True if both user ID and role ID are present
   */
  isValid(): boolean {
    return Boolean(this.userId && this.roleId);
  }

  /**
   * Checks if this role assignment is for a specific user
   * @param userId The user ID to check against
   * @returns True if this role is assigned to the specified user
   */
  isForUser(userId: string): boolean {
    return this.userId === userId;
  }

  /**
   * Checks if this role assignment is for a specific role
   * @param roleId The role ID to check against
   * @returns True if this assignment is for the specified role
   */
  isForRole(roleId: string): boolean {
    return this.roleId === roleId;
  }
}
