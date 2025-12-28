import { BaseModel } from "../../base/baseModel";

/**
 * Interface for UserRole model
 */
export interface UserRoleInterface {
  /**
   * Unique identifier
   */
  id: string;

  /**
   * User ID
   */
  userId: string;

  /**
   * Role ID
   */
  roleId: string;

  /**
   * Creation timestamp
   */
  createdAt: Date;

  /**
   * Last update timestamp
   */
  updatedAt: Date;
}

/**
 * User role model representing the relationship between a user and a role
 */
export class UserRole extends BaseModel {
  /**
   * User ID
   */
  userId: string;

  /**
   * Role ID
   */
  roleId: string;

  /**
   * Constructor
   */
  constructor(data: Partial<UserRoleInterface> = {}) {
    super();
    this.id = data.id || this.generateId();
    this.userId = data.userId || "";
    this.roleId = data.roleId || "";
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Validate the model
   */
  validate(): Array<{ field: string; message: string; code?: string }> {
    const errors: Array<{ field: string; message: string; code?: string }> = [];

    if (!this.userId) {
      errors.push({
        field: "userId",
        message: "User ID is required",
        code: "REQUIRED",
      });
    }

    if (!this.roleId) {
      errors.push({
        field: "roleId",
        message: "Role ID is required",
        code: "REQUIRED",
      });
    }

    return errors;
  }

  /**
   * Convert model to string representation
   */
  toString(): string {
    return `UserRole(${this.id}): User ${this.userId} has role ${this.roleId}`;
  }
}
