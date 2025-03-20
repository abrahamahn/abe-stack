import { BaseModel } from "../BaseModel";

/**
 * Interface defining the structure of a Role
 */
export interface RoleAttributes extends BaseModel {
  name: string;
  description: string | null;
  inheritsFrom: string | null;
  isSystem?: boolean;
}

/**
 * Role model representing a system role.
 * This class handles:
 * 1. Role data structure
 * 2. Role validation and equality checking
 * 3. Role state management
 * 4. NOT database operations - those belong in RoleRepository
 */
export class Role
  extends BaseModel
  implements Omit<RoleAttributes, keyof BaseModel>
{
  name: string;
  description: string | null;
  inheritsFrom: string | null;
  isSystem: boolean;

  constructor(data: Partial<RoleAttributes>) {
    super();
    this.name = data.name || "";
    this.description = data.description || null;
    this.inheritsFrom = data.inheritsFrom || null;
    this.isSystem = data.isSystem || false;
  }

  /**
   * Converts the role to a plain object
   */
  toJSON(): Omit<RoleAttributes, "generateId"> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      inheritsFrom: this.inheritsFrom,
      isSystem: this.isSystem,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Checks if this role is equal to another role
   * @param other The other role to compare with
   */
  equals(other: Role): boolean {
    return this.id === other.id || this.name === other.name;
  }

  /**
   * Validates the role data
   * @throws Error if validation fails
   */
  validate(): void {
    if (!this.name) {
      throw new Error("Role name is required");
    }

    if (this.name.length > 50) {
      throw new Error("Role name must be less than 50 characters");
    }

    if (this.description && this.description.length > 500) {
      throw new Error("Role description must be less than 500 characters");
    }
  }

  /**
   * Determines if this role is a system role (roles that cannot be modified)
   */
  isSystemRole(): boolean {
    return ["admin", "user", "moderator"].includes(this.name.toLowerCase());
  }

  /**
   * Creates an admin role
   */
  static createAdminRole(): Role {
    return new Role({
      name: "admin",
      description: "Administrator with full system access",
    });
  }

  /**
   * Creates a regular user role
   */
  static createUserRole(): Role {
    return new Role({
      name: "user",
      description: "Regular application user",
    });
  }
}
