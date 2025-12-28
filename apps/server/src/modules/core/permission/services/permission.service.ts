import { inject, injectable } from "inversify";
import NodeCache from "node-cache";

import { Permission } from "./Permission";
import { PermissionRepository } from "./PermissionRepository";
import { RolePermissionRepository } from "./RolePermissionRepository";
import { RoleService } from "./RoleService";
import { TYPES } from "../../../infrastructure/di/types";
import { ILoggerService } from "../../../infrastructure/logging";
import { BaseService } from "../../base/baseService";

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
@injectable()
export class PermissionService extends BaseService {
  private cache: NodeCache;
  private validationRules: PermissionValidationRules;

  constructor(
    @inject(TYPES.LoggerService) loggerService: ILoggerService,
    @inject(TYPES.PermissionRepository)
    private readonly permissionRepository: PermissionRepository,
    @inject(TYPES.RolePermissionRepository)
    private readonly rolePermissionRepository: RolePermissionRepository,
    @inject(TYPES.RoleService) private readonly roleService: RoleService
  ) {
    super(loggerService);
    this.logger = loggerService.createLogger("PermissionService");
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
    this.validationRules = DEFAULT_VALIDATION_RULES;
  }

  /**
   * Create a new permission
   * @param data The permission data
   * @returns The created permission
   */
  async createPermission(data: Partial<Permission>): Promise<Permission> {
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

    const permission = await this.permissionRepository.findById(id);
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
      pattern.action
    );

    if (permission) {
      this.cache.set(cacheKey, permission);
      this.cache.set(`permission:${permission.id}`, permission);
    }

    return permission;
  }

  /**
   * Update an existing permission
   * @param id The permission ID
   * @param data The permission data to update
   * @returns The updated permission or null if not found
   */
  async updatePermission(
    id: string,
    data: Partial<Permission>
  ): Promise<Permission | null> {
    this.logger.debug("Updating permission", { id, data });

    const permission = await this.getPermissionById(id);
    if (!permission) {
      return null;
    }

    // If name is being updated, validate the new pattern
    if (data.name && data.name !== permission.name) {
      const pattern = this.parsePermissionPattern(data.name);
      this.validatePermissionPattern(pattern);

      // Check for name conflict
      const existingPermission = await this.getPermissionByName(data.name);
      if (existingPermission && existingPermission.id !== id) {
        throw new Error(`Permission '${data.name}' already exists`);
      }
    }

    await this.permissionRepository.update(id, data);

    const updatedPermission = await this.getPermissionById(id);
    if (updatedPermission) {
      this.invalidatePermissionCache(updatedPermission);
    }

    return updatedPermission;
  }

  /**
   * Delete a permission
   * @param id The permission ID
   * @returns True if deleted, false otherwise
   */
  async deletePermission(id: string): Promise<boolean> {
    this.logger.debug("Deleting permission", { id });

    const permission = await this.getPermissionById(id);
    if (!permission) {
      return false;
    }

    // Check if permission is used by any roles
    const rolePermissions =
      await this.rolePermissionRepository.findByPermissionId(id);

    if (rolePermissions.length > 0) {
      throw new Error(
        `Cannot delete permission '${permission.name}' as it is used by ${rolePermissions.length} roles`
      );
    }

    // Delete the permission
    const deleted = await this.permissionRepository.delete(id);
    if (deleted) {
      this.cache.del(`permission:${id}`);
      this.cache.del(`permission:name:${permission.name}`);
    }

    return deleted;
  }

  /**
   * Assign a permission to a role
   * @param roleId The role ID
   * @param permissionId The permission ID
   * @returns True if assigned, false otherwise
   */
  async assignPermissionToRole(
    roleId: string,
    permissionId: string
  ): Promise<boolean> {
    this.logger.debug("Assigning permission to role", {
      roleId,
      permissionId,
    });

    // Check if both role and permission exist
    const role = await this.roleService.getRoleById(roleId);
    if (!role) {
      throw new Error(`Role with ID '${roleId}' not found`);
    }

    const permission = await this.getPermissionById(permissionId);
    if (!permission) {
      throw new Error(`Permission with ID '${permissionId}' not found`);
    }

    // Check if already assigned
    const rolePermission =
      await this.rolePermissionRepository.findByRoleAndPermission(
        roleId,
        permissionId
      );

    if (rolePermission) {
      return true; // Already assigned
    }

    // Create the assignment
    return await this.rolePermissionRepository.create({
      roleId,
      permissionId,
    });
  }

  /**
   * Remove a permission from a role
   * @param roleId The role ID
   * @param permissionId The permission ID
   * @returns True if removed, false otherwise
   */
  async removePermissionFromRole(
    roleId: string,
    permissionId: string
  ): Promise<boolean> {
    this.logger.debug("Removing permission from role", {
      roleId,
      permissionId,
    });

    // Check if both role and permission exist
    const role = await this.roleService.getRoleById(roleId);
    if (!role) {
      throw new Error(`Role with ID '${roleId}' not found`);
    }

    const permission = await this.getPermissionById(permissionId);
    if (!permission) {
      throw new Error(`Permission with ID '${permissionId}' not found`);
    }

    // If system role and "*" permission, block removal
    if (role.isSystem && permission.name === "*") {
      throw new Error(
        `Cannot remove wildcard permission from system role '${role.name}'`
      );
    }

    // Delete the assignment
    return await this.rolePermissionRepository.deleteByRoleAndPermission(
      roleId,
      permissionId
    );
  }

  /**
   * Check if a user has a specific permission
   * @param userId The user ID
   * @param permissionName The permission name
   * @param context Additional context for permission checking
   * @returns True if the user has the permission, false otherwise
   */
  async checkUserPermission(
    userId: string,
    permissionName: string,
    context: PermissionContext = {}
  ): Promise<boolean> {
    this.logger.debug("Checking user permission", {
      userId,
      permissionName,
      context,
    });

    // Get all user roles with inheritance
    const userRoles = await this.roleService.getUserInheritedRoles(userId);

    if (userRoles.length === 0) {
      return false;
    }

    // Parse the target permission pattern
    const targetPattern = this.parsePermissionPattern(permissionName);

    // For each role, check their permissions
    for (const role of userRoles) {
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

    const permissions = await this.permissionRepository.findByRoleId(roleId);
    this.cache.set(cacheKey, permissions, 300); // 5 minutes

    return permissions;
  }

  /**
   * Get analytics about permissions in the system
   */
  async getPermissionAnalytics(): Promise<PermissionAnalytics> {
    this.logger.debug("Getting permission analytics");

    const permissions = await this.permissionRepository.findAll();
    const rolePermissions = await this.rolePermissionRepository.findAll();
    const roles = await this.roleService.getRoleAnalytics();

    // Count by resource and action
    const resourceCounter: Record<string, number> = {};
    const actionCounter: Record<string, number> = {};
    const wildcardCounter = {
      total: 0,
      byResource: {} as Record<string, number>,
    };

    // Count usage per permission
    const permissionUsage: Record<string, number> = {};
    rolePermissions.forEach((rp) => {
      permissionUsage[rp.permissionId] =
        (permissionUsage[rp.permissionId] || 0) + 1;
    });

    // Process each permission
    permissions.forEach((permission) => {
      const pattern = this.parsePermissionPattern(permission.name);

      // Count by resource
      resourceCounter[pattern.resource] =
        (resourceCounter[pattern.resource] || 0) + 1;

      // Count by action
      actionCounter[pattern.action] = (actionCounter[pattern.action] || 0) + 1;

      // Track wildcards
      if (pattern.isWildcard) {
        wildcardCounter.total++;

        if (pattern.resource !== "*") {
          wildcardCounter.byResource[pattern.resource] =
            (wildcardCounter.byResource[pattern.resource] || 0) + 1;
        }
      }
    });

    // Calculate most used and unused permissions
    const permissionPairs = Object.entries(permissionUsage)
      .map(([id, count]) => {
        const permission = permissions.find((p) => p.id === id);
        return {
          permission: permission ? permission.name : id,
          count,
        };
      })
      .sort((a, b) => b.count - a.count);

    const unusedPermissions = permissions
      .filter((p) => !permissionUsage[p.id])
      .map((p) => p.name);

    // Calculate density (percentage of possible role-permission pairs that are assigned)
    const totalPossibleAssignments = permissions.length * roles.totalRoles;
    const permissionDensity =
      totalPossibleAssignments > 0
        ? rolePermissions.length / totalPossibleAssignments
        : 0;

    return {
      totalPermissions: permissions.length,
      permissionsByResource: resourceCounter,
      permissionsByAction: actionCounter,
      mostUsedPermissions: permissionPairs.slice(0, 10),
      unusedPermissions,
      permissionDensity,
      averagePermissionsPerRole:
        roles.totalRoles > 0 ? rolePermissions.length / roles.totalRoles : 0,
      wildcardUsage: wildcardCounter,
    };
  }

  /**
   * Parse a permission name into its component parts
   * @param name The permission name
   * @returns Parsed permission pattern
   */
  private parsePermissionPattern(name: string): PermissionPattern {
    // Special case for wildcard
    if (name === "*") {
      return {
        resource: "*",
        action: "*",
        isWildcard: true,
      };
    }

    // Parse pattern like "resource.action.scope"
    const parts = name.split(".");
    const resource = parts[0];
    const action = parts.length > 1 ? parts[1] : "*";
    const scope = parts.length > 2 ? parts[2] : undefined;

    return {
      resource,
      action,
      scope,
      isWildcard: resource === "*" || action === "*",
    };
  }

  /**
   * Validate a permission pattern against configured rules
   * @param pattern The pattern to validate
   */
  private validatePermissionPattern(pattern: PermissionPattern): void {
    // Allow the global wildcard
    if (pattern.resource === "*" && pattern.action === "*") {
      return;
    }

    // Validate resource
    if (
      pattern.resource !== "*" &&
      !this.validationRules.allowedResources.includes(pattern.resource)
    ) {
      throw new Error(
        `Invalid resource '${pattern.resource}'. Allowed resources are: ${this.validationRules.allowedResources.join(
          ", "
        )}`
      );
    }

    // Validate action
    if (
      pattern.action !== "*" &&
      pattern.resource !== "*" &&
      (!this.validationRules.allowedActions[pattern.resource] ||
        !this.validationRules.allowedActions[pattern.resource].includes(
          pattern.action
        ))
    ) {
      throw new Error(
        `Invalid action '${pattern.action}' for resource '${pattern.resource}'. Allowed actions are: ${
          this.validationRules.allowedActions[pattern.resource]?.join(", ") ||
          "none"
        }`
      );
    }

    // Validate scope
    if (
      pattern.scope &&
      !this.validationRules.allowedScopes.includes(pattern.scope)
    ) {
      throw new Error(
        `Invalid scope '${pattern.scope}'. Allowed scopes are: ${this.validationRules.allowedScopes.join(
          ", "
        )}`
      );
    }
  }

  /**
   * Check if a permission pattern matches another pattern
   * @param pattern The permission pattern to check
   * @param target The target pattern to match against
   * @param context Additional context for permission checking
   * @returns True if the pattern matches the target
   */
  private matchPermissionPattern(
    pattern: PermissionPattern,
    target: PermissionPattern,
    context: PermissionContext
  ): boolean {
    // Wildcard permission matches everything
    if (pattern.resource === "*") {
      return true;
    }

    // Resource must match
    if (pattern.resource !== target.resource) {
      return false;
    }

    // Wildcard action matches any action for this resource
    if (pattern.action === "*") {
      return true;
    }

    // Action must match
    if (pattern.action !== target.action) {
      return false;
    }

    // If no scope in pattern, it applies to all scopes
    if (!pattern.scope) {
      return true;
    }

    // If scope in pattern but not in target, check context
    if (!target.scope) {
      // "self" scope requires userId in context matching targetId
      if (pattern.scope === "self") {
        return (
          context.userId !== undefined &&
          context.targetId !== undefined &&
          context.userId === context.targetId
        );
      }

      // Other scopes would need additional context checks
      // This is a simplified implementation
      return false;
    }

    // Both have scopes, they must match
    return pattern.scope === target.scope;
  }

  /**
   * Invalidate permission cache
   * @param permission The permission to invalidate
   */
  private invalidatePermissionCache(permission: Permission): void {
    this.cache.del(`permission:${permission.id}`);
    this.cache.del(`permission:name:${permission.name}`);

    // Also invalidate role permissions caches
    this.rolePermissionRepository
      .findByPermissionId(permission.id)
      .then((rolePermissions) => {
        rolePermissions.forEach((rp) => {
          this.cache.del(`role:${rp.roleId}:permissions`);
        });
      })
      .catch((error) => {
        this.logger.error("Failed to invalidate role permissions cache", {
          error,
        });
      });
  }
}
