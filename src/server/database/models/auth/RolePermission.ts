import { BaseModel } from "../BaseModel";

/**
 * Interface defining the structure of a RolePermission association
 * This is a join table between roles and permissions
 */
export interface RolePermissionAttributes extends BaseModel {
  roleId: string;
  permissionId: string;
}

/**
 * RolePermission model representing an association between a role and a permission.
 * This class handles:
 * 1. RolePermission data structure
 * 2. RolePermission validation
 * 3. NOT database operations - those belong in RolePermissionRepository
 */
export class RolePermission
  extends BaseModel
  implements Omit<RolePermissionAttributes, keyof BaseModel>
{
  roleId: string;
  permissionId: string;

  constructor(data: Partial<RolePermissionAttributes>) {
    super();
    this.roleId = data.roleId || "";
    this.permissionId = data.permissionId || "";
  }

  /**
   * Converts the role permission to a plain object
   */
  toJSON(): Omit<RolePermissionAttributes, "generateId"> {
    return {
      id: this.id,
      roleId: this.roleId,
      permissionId: this.permissionId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Validates the role permission data
   * @throws Error if validation fails
   */
  validate(): void {
    if (!this.roleId) {
      throw new Error("Role ID is required");
    }

    if (!this.permissionId) {
      throw new Error("Permission ID is required");
    }
  }

  /**
   * Checks if this role permission is equal to another role permission
   * @param other The role permission to compare with
   */
  equals(other: RolePermission): boolean {
    return (
      this.roleId === other.roleId && this.permissionId === other.permissionId
    );
  }
}
