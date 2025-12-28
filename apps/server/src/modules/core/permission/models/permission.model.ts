import { BaseModel, BaseModelInterface } from "@/server/modules/base";

/**
 * Permission resource type (e.g. user, post, comment)
 */
export type PermissionResource = string;

/**
 * Permission action (e.g. create, read, update, delete)
 */
export type PermissionAction = string;

/**
 * Permission interface
 */
export interface PermissionInterface extends BaseModelInterface {
  /** Resource the permission applies to */
  resource: PermissionResource;
  /** Action that can be performed on the resource */
  action: PermissionAction;
  /** Human-readable display name */
  displayName: string;
  /** Description of the permission */
  description?: string;
  /** Whether this is a system permission (cannot be deleted) */
  isSystem: boolean;
  /** Conditions that apply to this permission (JSON string) */
  conditions?: string;
}

/**
 * Permission model
 */
export class Permission extends BaseModel implements PermissionInterface {
  resource: PermissionResource;
  action: PermissionAction;
  displayName: string;
  description?: string;
  isSystem: boolean;
  conditions?: string;

  constructor(data: Partial<PermissionInterface> = {}) {
    super();
    this.id = data.id || this.generateId();
    this.resource = data.resource || "";
    this.action = data.action || "";
    this.displayName = data.displayName || `${this.action}:${this.resource}`;
    this.description = data.description;
    this.isSystem = data.isSystem || false;
    this.conditions = data.conditions;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  /**
   * Get the permission identifier (resource:action)
   */
  get identifier(): string {
    return `${this.resource}:${this.action}`;
  }

  /**
   * Validate the permission
   */
  validate(): Array<{ field: string; message: string; code?: string }> {
    const errors: Array<{ field: string; message: string; code?: string }> = [];

    if (!this.resource) {
      errors.push({
        field: "resource",
        message: "Resource is required",
        code: "REQUIRED_FIELD",
      });
    } else if (!/^[a-z0-9_-]+$/.test(this.resource)) {
      errors.push({
        field: "resource",
        message:
          "Resource can only contain lowercase letters, numbers, underscores, and hyphens",
        code: "INVALID_FORMAT",
      });
    }

    if (!this.action) {
      errors.push({
        field: "action",
        message: "Action is required",
        code: "REQUIRED_FIELD",
      });
    } else if (!/^[a-z0-9_-]+$/.test(this.action)) {
      errors.push({
        field: "action",
        message:
          "Action can only contain lowercase letters, numbers, underscores, and hyphens",
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
    return `Permission(${this.id}): ${this.identifier} - ${this.displayName}`;
  }

  /**
   * Create a JSON representation
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      resource: this.resource,
      action: this.action,
      displayName: this.displayName,
      description: this.description,
      isSystem: this.isSystem,
      conditions: this.conditions,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
