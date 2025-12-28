import { BaseModel, BaseModelInterface } from "@/server/modules/base";

/**
 * Role-Permission relationship interface
 */
export interface RolePermissionInterface extends BaseModelInterface {
  /** ID of the role */
  roleId: string;
  /** ID of the permission */
  permissionId: string;
  /** Additional conditions for this specific role-permission (JSON string) */
  conditions?: string;
}

/**
 * Role-Permission relationship model
 */
export class RolePermission
  extends BaseModel
  implements RolePermissionInterface
{
  roleId: string;
  permissionId: string;
  conditions?: string;

  constructor(data: Partial<RolePermissionInterface> = {}) {
    super();
    this.id = data.id || this.generateId();
    this.roleId = data.roleId || "";
    this.permissionId = data.permissionId || "";
    this.conditions = data.conditions;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Validate the role-permission relationship
   */
  validate(): Array<{ field: string; message: string; code?: string }> {
    const errors: Array<{ field: string; message: string; code?: string }> = [];

    if (!this.roleId) {
      errors.push({
        field: "roleId",
        message: "Role ID is required",
        code: "REQUIRED_FIELD",
      });
    }

    if (!this.permissionId) {
      errors.push({
        field: "permissionId",
        message: "Permission ID is required",
        code: "REQUIRED_FIELD",
      });
    }

    if (this.conditions) {
      try {
        JSON.parse(this.conditions);
      } catch (e) {
        errors.push({
          field: "conditions",
          message: "Conditions must be valid JSON",
          code: "INVALID_FORMAT",
        });
      }
    }

    return errors;
  }

  /**
   * Serialize conditions to JSON
   */
  getConditions(): Record<string, any> | null {
    if (!this.conditions) {
      return null;
    }

    try {
      return JSON.parse(this.conditions);
    } catch (e) {
      return null;
    }
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `RolePermission(${this.id}): Role ${this.roleId} - Permission ${this.permissionId}`;
  }

  /**
   * Create a JSON representation
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      roleId: this.roleId,
      permissionId: this.permissionId,
      conditions: this.conditions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
