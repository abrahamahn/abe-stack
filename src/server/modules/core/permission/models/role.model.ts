import { BaseModel, BaseModelInterface } from "@/server/modules/base";

/**
 * Role interface
 */
export interface RoleInterface extends BaseModelInterface {
  /** Unique name of the role (e.g. admin, user, editor) */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Description of the role */
  description?: string;
  /** Whether this is a system role (cannot be deleted) */
  isSystem: boolean;
}

/**
 * Role model
 */
export class Role extends BaseModel implements RoleInterface {
  name: string;
  displayName: string;
  description?: string;
  isSystem: boolean;

  constructor(data: Partial<RoleInterface> = {}) {
    super();
    this.id = data.id || this.generateId();
    this.name = data.name || "";
    this.displayName = data.displayName || this.name;
    this.description = data.description;
    this.isSystem = data.isSystem || false;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Validate the role
   */
  validate(): Array<{ field: string; message: string; code?: string }> {
    const errors: Array<{ field: string; message: string; code?: string }> = [];

    if (!this.name) {
      errors.push({
        field: "name",
        message: "Role name is required",
        code: "REQUIRED_FIELD",
      });
    } else if (!/^[a-z0-9_-]+$/.test(this.name)) {
      errors.push({
        field: "name",
        message:
          "Role name can only contain lowercase letters, numbers, underscores, and hyphens",
        code: "INVALID_FORMAT",
      });
    }

    if (!this.displayName) {
      errors.push({
        field: "displayName",
        message: "Display name is required",
        code: "REQUIRED_FIELD",
      });
    }

    return errors;
  }

  /**
   * Convert to string representation
   */
  toString(): string {
    return `Role(${this.id}): ${this.name} - ${this.displayName}`;
  }

  /**
   * Create a JSON representation
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      description: this.description,
      isSystem: this.isSystem,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
