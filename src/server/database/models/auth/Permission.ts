import { BaseModel } from "../BaseModel";

/**
 * Interface defining the structure of a Permission
 */
export interface PermissionAttributes extends BaseModel {
  name: string;
  description: string | null;
  resource: string;
  action: string;
}

/**
 * Permission model representing a system permission.
 * This class handles:
 * 1. Permission data structure
 * 2. Permission validation and comparison
 * 3. Permission state management
 * 4. NOT database operations - those belong in PermissionRepository
 */
export class Permission
  extends BaseModel
  implements Omit<PermissionAttributes, keyof BaseModel>
{
  name: string;
  description: string | null;
  resource: string;
  action: string;

  constructor(data: Partial<PermissionAttributes>) {
    super();
    this.name = data.name || "";
    this.description = data.description || null;
    this.resource = data.resource || "";
    this.action = data.action || "";
  }

  /**
   * Converts the permission to a plain object
   */
  toJSON(): Omit<PermissionAttributes, "generateId"> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      resource: this.resource,
      action: this.action,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Checks if this permission matches another permission
   * @param other The permission to compare against
   */
  equals(other: Permission): boolean {
    return this.resource === other.resource && this.action === other.action;
  }

  /**
   * Checks if this permission matches a resource and action
   * @param resource The resource to check
   * @param action The action to check
   */
  matches(resource: string, action: string): boolean {
    return this.resource === resource && this.action === action;
  }

  /**
   * Creates a permission string in the format "resource:action"
   */
  toString(): string {
    return `${this.resource}:${this.action}`;
  }

  /**
   * Validates the permission data
   * @throws Error if the permission is invalid
   */
  validate(): void {
    if (!this.resource) {
      throw new Error("Resource is required");
    }
    if (!this.action) {
      throw new Error("Action is required");
    }
    if (this.name && this.name.length > 100) {
      throw new Error("Name must be less than 100 characters");
    }
    if (this.description && this.description.length > 500) {
      throw new Error("Description must be less than 500 characters");
    }
  }

  /**
   * Creates a new permission from a string in the format "resource:action"
   * @param permissionString The permission string to parse
   */
  static fromString(permissionString: string): Permission {
    const [resource, action] = permissionString.split(":");
    if (!resource || !action) {
      throw new Error(
        'Invalid permission string format. Expected "resource:action"',
      );
    }
    return new Permission({ resource, action });
  }
}
