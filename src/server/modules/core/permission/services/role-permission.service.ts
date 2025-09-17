import { UserRole } from "../auth/types";

/**
 * Type for permissions in the system
 */
export type Permission =
  | "user:read"
  | "user:write"
  | "user:delete"
  | "admin:read"
  | "admin:write"
  | "admin:delete"
  | "settings:read"
  | "settings:write"
  | "content:read"
  | "content:write"
  | "content:publish"
  | "content:delete"
  | string;

/**
 * Service for handling role-based permissions
 */
export class RolePermissionService {
  // Default role to permissions mapping
  private readonly rolePermissions: Record<string, Permission[]> = {
    [UserRole.USER]: ["user:read", "content:read", "settings:read"],
    [UserRole.MODERATOR]: [
      "user:read",
      "content:read",
      "content:write",
      "content:publish",
      "settings:read",
    ],
    [UserRole.ADMIN]: [
      "user:read",
      "user:write",
      "content:read",
      "content:write",
      "content:publish",
      "content:delete",
      "settings:read",
      "settings:write",
      "admin:read",
    ],
    [UserRole.SUPER_ADMIN]: [
      "user:read",
      "user:write",
      "user:delete",
      "content:read",
      "content:write",
      "content:publish",
      "content:delete",
      "settings:read",
      "settings:write",
      "admin:read",
      "admin:write",
      "admin:delete",
    ],
    [UserRole.API]: ["content:read", "content:write"],
  };

  /**
   * Get all permissions for a role
   */
  public getPermissionsForRole(role: string): Permission[] {
    return this.rolePermissions[role] || [];
  }

  /**
   * Check if a role has a specific permission
   */
  public roleHasPermission(role: string, permission: Permission): boolean {
    const permissions = this.getPermissionsForRole(role);
    return permissions.includes(permission);
  }

  /**
   * Check if a user has a specific permission based on their roles
   */
  public userHasPermission(
    userRoles: string[],
    permission: Permission
  ): boolean {
    // If user has no roles, they have no permissions
    if (!userRoles || userRoles.length === 0) {
      return false;
    }

    // Check each role
    for (const role of userRoles) {
      if (this.roleHasPermission(role, permission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Add permission to a role
   */
  public addPermissionToRole(role: string, permission: Permission): void {
    if (!this.rolePermissions[role]) {
      this.rolePermissions[role] = [];
    }

    if (!this.rolePermissions[role].includes(permission)) {
      this.rolePermissions[role].push(permission);
    }
  }

  /**
   * Remove permission from a role
   */
  public removePermissionFromRole(role: string, permission: Permission): void {
    if (!this.rolePermissions[role]) {
      return;
    }

    const index = this.rolePermissions[role].indexOf(permission);
    if (index !== -1) {
      this.rolePermissions[role].splice(index, 1);
    }
  }

  /**
   * Create a new role with permissions
   */
  public createRole(role: string, permissions: Permission[] = []): void {
    this.rolePermissions[role] = [...permissions];
  }

  /**
   * Get all roles in the system
   */
  public getAllRoles(): string[] {
    return Object.keys(this.rolePermissions);
  }

  /**
   * Get all permissions in the system
   */
  public getAllPermissions(): Permission[] {
    const allPermissions = new Set<Permission>();

    Object.values(this.rolePermissions).forEach((permissions) => {
      permissions.forEach((permission) => {
        allPermissions.add(permission);
      });
    });

    return Array.from(allPermissions);
  }
}
