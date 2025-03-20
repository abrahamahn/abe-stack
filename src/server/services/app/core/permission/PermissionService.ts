import NodeCache from "node-cache";

import { Permission, PermissionAttributes } from "@models/auth";
import {
  PermissionRepository,
  RolePermissionRepository,
} from "@repositories/auth";
import { Logger } from "@services/dev/logger";

import { RoleService } from "./RoleService";

/**
 * Interface for permission pattern
 */
interface PermissionPattern {
  resource: string;
  action: string;
  scope?: string;
  isWildcard: boolean;
}

/**
 * Interface for permission validation rules
 */
interface PermissionValidationRules {
  allowedResources: string[];
  allowedActions: Record<string, string[]>;
  allowedScopes: string[];
}

/**
 * Interface for permission analytics
 */
interface PermissionAnalytics {
  totalPermissions: number;
  permissionsByResource: Record<string, number>;
  permissionsByAction: Record<string, number>;
  mostUsedPermissions: Array<{ permission: string; count: number }>;
  unusedPermissions: string[];
  permissionDensity: number;
  averagePermissionsPerRole: number;
  wildcardUsage: {
    total: number;
    byResource: Record<string, number>;
  };
}

/**
 * Interface for permission context
 */
interface PermissionContext {
  userId?: string;
  targetId?: string;
  [key: string]: unknown;
}

/**
 * Default permission validation rules
 */
const DEFAULT_VALIDATION_RULES: PermissionValidationRules = {
  allowedResources: [
    "user",
    "role",
    "permission",
    "content",
    "comment",
    "profile",
    "system",
  ],
  allowedActions: {
    user: ["create", "read", "update", "delete", "list", "search"],
    role: ["create", "read", "update", "delete", "list", "assign", "remove"],
    permission: [
      "create",
      "read",
      "update",
      "delete",
      "list",
      "assign",
      "remove",
    ],
    content: [
      "create",
      "read",
      "update",
      "delete",
      "list",
      "publish",
      "unpublish",
    ],
    comment: ["create", "read", "update", "delete", "list", "moderate"],
    profile: ["read", "update", "delete"],
    system: ["configure", "monitor", "backup", "restore"],
  },
  allowedScopes: ["self", "team", "organization", "all"],
};

/**
 * Service responsible for permission management operations.
 * This service handles:
 * 1. Permission CRUD operations
 * 2. Permission assignment to roles
 * 3. Permission checking and validation
 * 4. Permission pattern matching
 * 5. Permission inheritance
 * 6. Permission analytics
 */
export class PermissionService {
  private logger: Logger;
  private cache: NodeCache;
  private validationRules: PermissionValidationRules;

  constructor(
    private readonly permissionRepository: PermissionRepository,
    private readonly rolePermissionRepository: RolePermissionRepository,
    private readonly roleService: RoleService,
  ) {
    this.logger = new Logger("PermissionService");
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
    this.validationRules = DEFAULT_VALIDATION_RULES;
  }

  /**
   * Create a new permission
   * @param data The permission data
   * @returns The created permission
   */
  async createPermission(
    data: Partial<PermissionAttributes>,
  ): Promise<Permission> {
    this.logger.debug("Creating new permission", { data });

    // Parse and validate permission pattern
    const pattern = this.parsePermissionPattern(data.name!);
    this.validatePermissionPattern(pattern);

    // Check if permission already exists
    const existingPermission = await this.getPermissionByName(data.name!);
    if (existingPermission) {
      throw new Error(`Permission '${data.name}' already exists`);
    }

    const permission = await this.permissionRepository.create(data);
    this.invalidatePermissionCache(permission);

    return permission;
  }

  /**
   * Get a permission by ID with caching
   * @param id The permission ID
   * @returns The permission or null if not found
   */
  async getPermissionById(id: string): Promise<Permission | null> {
    this.logger.debug("Getting permission by ID", { id });

    const cacheKey = `permission:${id}`;
    const cachedPermission = this.cache.get<Permission>(cacheKey);
    if (cachedPermission) {
      return cachedPermission;
    }

    const permission = await this.permissionRepository.findByPk(id);
    if (permission) {
      this.cache.set(cacheKey, permission);
    }

    return permission;
  }

  /**
   * Get a permission by name with caching
   * @param name The permission name
   * @returns The permission or null if not found
   */
  async getPermissionByName(name: string): Promise<Permission | null> {
    this.logger.debug("Getting permission by name", { name });

    const cacheKey = `permission:name:${name}`;
    const cachedPermission = this.cache.get<Permission>(cacheKey);
    if (cachedPermission) {
      return cachedPermission;
    }

    const pattern = this.parsePermissionPattern(name);
    const permission = await this.permissionRepository.findByResourceAndAction(
      pattern.resource,
      pattern.action,
    );

    if (permission) {
      this.cache.set(cacheKey, permission);
      this.cache.set(`permission:${permission.id}`, permission);
    }

    return permission;
  }

  /**
   * Update a permission
   * @param id The permission ID
   * @param data The permission data to update
   * @returns The updated permission or null if not found
   */
  async updatePermission(
    id: string,
    data: Partial<PermissionAttributes>,
  ): Promise<Permission | null> {
    this.logger.debug("Updating permission", { id, data });

    const permission = await this.getPermissionById(id);
    if (!permission) {
      return null;
    }

    // Validate new permission name if provided
    if (data.name) {
      const pattern = this.parsePermissionPattern(data.name);
      this.validatePermissionPattern(pattern);

      // Check if new name conflicts with existing permission
      const existingPermission = await this.getPermissionByName(data.name);
      if (existingPermission && existingPermission.id !== id) {
        throw new Error(`Permission '${data.name}' already exists`);
      }
    }

    const updatedPermission = await this.permissionRepository.update(id, data);
    if (updatedPermission) {
      this.invalidatePermissionCache(updatedPermission);
    }

    return updatedPermission;
  }

  /**
   * Delete a permission
   * @param id The permission ID
   * @returns True if permission was deleted
   */
  async deletePermission(id: string): Promise<boolean> {
    this.logger.debug("Deleting permission", { id });

    const permission = await this.getPermissionById(id);
    if (!permission) {
      return false;
    }

    const deleted = await this.permissionRepository.delete(id);
    if (deleted) {
      this.invalidatePermissionCache(permission);
    }

    return deleted;
  }

  /**
   * Assign a permission to a role
   * @param roleId The role ID
   * @param permissionId The permission ID
   * @returns True if permission was assigned
   */
  async assignPermissionToRole(
    roleId: string,
    permissionId: string,
  ): Promise<boolean> {
    this.logger.debug("Assigning permission to role", { roleId, permissionId });

    const [role, permission] = await Promise.all([
      this.roleService.getRoleById(roleId),
      this.getPermissionById(permissionId),
    ]);

    if (!role) {
      throw new Error("Role not found");
    }

    if (!permission) {
      throw new Error("Permission not found");
    }

    return this.rolePermissionRepository.assignPermission(roleId, permissionId);
  }

  /**
   * Remove a permission from a role
   * @param roleId The role ID
   * @param permissionId The permission ID
   * @returns True if permission was removed
   */
  async removePermissionFromRole(
    roleId: string,
    permissionId: string,
  ): Promise<boolean> {
    this.logger.debug("Removing permission from role", {
      roleId,
      permissionId,
    });

    const [role, permission] = await Promise.all([
      this.roleService.getRoleById(roleId),
      this.getPermissionById(permissionId),
    ]);

    if (!role) {
      throw new Error("Role not found");
    }

    if (!permission) {
      throw new Error("Permission not found");
    }

    return this.rolePermissionRepository.removePermission(roleId, permissionId);
  }

  /**
   * Check if a user has a specific permission
   * @param userId The user ID
   * @param permissionName The permission name to check
   * @param context Additional context for permission check
   * @returns True if user has the permission
   */
  async checkUserPermission(
    userId: string,
    permissionName: string,
    context: PermissionContext = {},
  ): Promise<boolean> {
    this.logger.debug("Checking user permission", {
      userId,
      permissionName,
      context,
    });

    const roles = await this.roleService.getUserInheritedRoles(userId);
    const targetPattern = this.parsePermissionPattern(permissionName);

    for (const role of roles) {
      const permissions = await this.getRolePermissions(role.id);

      for (const permission of permissions) {
        const permPattern = this.parsePermissionPattern(permission.name);

        if (this.matchPermissionPattern(permPattern, targetPattern, context)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get all permissions assigned to a role
   * @param roleId The role ID
   * @returns Array of permissions
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    this.logger.debug("Getting role permissions", { roleId });

    const cacheKey = `role:${roleId}:permissions`;
    const cachedPermissions = this.cache.get<Permission[]>(cacheKey);
    if (cachedPermissions) {
      return cachedPermissions;
    }

    const permissions =
      await this.rolePermissionRepository.findPermissionsForRole(roleId);
    this.cache.set(cacheKey, permissions);

    return permissions;
  }

  /**
   * Get permission analytics
   * @returns Permission analytics data
   */
  async getPermissionAnalytics(): Promise<PermissionAnalytics> {
    this.logger.debug("Getting permission analytics");

    const permissions = await this.permissionRepository.findAll();
    const rolePermissions = await this.rolePermissionRepository.findAll();
    const roles = await this.roleService.getRoleAnalytics();

    const permissionsByResource: Record<string, number> = {};
    const permissionsByAction: Record<string, number> = {};
    const wildcardsByResource: Record<string, number> = {};
    let totalWildcards = 0;

    permissions.forEach((permission) => {
      const pattern = this.parsePermissionPattern(permission.name);

      // Count by resource
      permissionsByResource[pattern.resource] =
        (permissionsByResource[pattern.resource] || 0) + 1;

      // Count by action
      permissionsByAction[pattern.action] =
        (permissionsByAction[pattern.action] || 0) + 1;

      // Count wildcards
      if (pattern.isWildcard) {
        totalWildcards++;
        wildcardsByResource[pattern.resource] =
          (wildcardsByResource[pattern.resource] || 0) + 1;
      }
    });

    // Calculate permission usage
    const permissionUsage = new Map<string, number>();
    rolePermissions.forEach((rp) => {
      const count = permissionUsage.get(rp.permissionId) || 0;
      permissionUsage.set(rp.permissionId, count + 1);
    });

    const sortedUsage = Array.from(permissionUsage.entries())
      .map(([permissionId, count]) => {
        const permission = permissions.find((p) => p.id === permissionId);
        return { permission: permission?.name || permissionId, count };
      })
      .sort((a, b) => b.count - a.count);

    const unusedPermissions = permissions
      .filter((p) => !permissionUsage.has(p.id))
      .map((p) => p.name);

    return {
      totalPermissions: permissions.length,
      permissionsByResource,
      permissionsByAction,
      mostUsedPermissions: sortedUsage.slice(0, 5),
      unusedPermissions,
      permissionDensity:
        rolePermissions.length / (permissions.length * roles.totalRoles),
      averagePermissionsPerRole: rolePermissions.length / roles.totalRoles,
      wildcardUsage: {
        total: totalWildcards,
        byResource: wildcardsByResource,
      },
    };
  }

  /**
   * Parse a permission pattern from a permission name
   * @param name The permission name
   * @returns The parsed permission pattern
   */
  private parsePermissionPattern(name: string): PermissionPattern {
    const parts = name.split(".");
    const isWildcard = parts.some((p) => p === "*");

    if (parts.length < 2) {
      throw new Error(
        "Invalid permission format. Expected: resource.action[.scope]",
      );
    }

    return {
      resource: parts[0],
      action: parts[1],
      scope: parts[2],
      isWildcard,
    };
  }

  /**
   * Validate a permission pattern
   * @param pattern The permission pattern to validate
   * @throws Error if pattern is invalid
   */
  private validatePermissionPattern(pattern: PermissionPattern): void {
    if (pattern.isWildcard) {
      return; // Skip validation for wildcard permissions
    }

    if (!this.validationRules.allowedResources.includes(pattern.resource)) {
      throw new Error(
        `Invalid resource '${pattern.resource}'. Allowed: ${this.validationRules.allowedResources.join(", ")}`,
      );
    }

    const allowedActions =
      this.validationRules.allowedActions[pattern.resource];
    if (!allowedActions?.includes(pattern.action)) {
      throw new Error(
        `Invalid action '${pattern.action}' for resource '${pattern.resource}'. Allowed: ${allowedActions?.join(", ")}`,
      );
    }

    if (
      pattern.scope &&
      !this.validationRules.allowedScopes.includes(pattern.scope)
    ) {
      throw new Error(
        `Invalid scope '${pattern.scope}'. Allowed: ${this.validationRules.allowedScopes.join(", ")}`,
      );
    }
  }

  /**
   * Match a permission pattern against a target pattern
   * @param pattern The permission pattern to check
   * @param target The target pattern to match against
   * @param context Additional context for matching
   * @returns True if patterns match
   */
  private matchPermissionPattern(
    pattern: PermissionPattern,
    target: PermissionPattern,
    context: PermissionContext,
  ): boolean {
    // Check resource match
    if (pattern.resource !== "*" && pattern.resource !== target.resource) {
      return false;
    }

    // Check action match
    if (pattern.action !== "*" && pattern.action !== target.action) {
      return false;
    }

    // Check scope match if present
    if (pattern.scope && target.scope && pattern.scope !== "*") {
      if (pattern.scope === "self" && context.userId !== context.targetId) {
        return false;
      }
      if (pattern.scope !== target.scope) {
        return false;
      }
    }

    return true;
  }

  /**
   * Invalidate permission cache
   * @param permission Permission to invalidate cache for
   */
  private invalidatePermissionCache(permission: Permission): void {
    this.cache.del(`permission:${permission.id}`);
    this.cache.del(`permission:name:${permission.name}`);

    // Invalidate role permissions cache for all roles
    this.cache.keys().forEach((key) => {
      if (key.startsWith("role:") && key.endsWith(":permissions")) {
        this.cache.del(key);
      }
    });
  }
}
