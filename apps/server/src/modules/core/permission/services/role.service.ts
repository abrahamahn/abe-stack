import { inject, injectable } from "inversify";
import NodeCache from "node-cache";

import { Role } from "./Role";
import { RoleRepository } from "./RoleRepository";
import { UserRoleRepository } from "./UserRoleRepository";
import { TYPES } from "../../../infrastructure/di/types";
import { ILoggerService } from "../../../infrastructure/logging";
import { BaseService } from "../../base/baseService";

/**
 * Interface for role hierarchy
 */
interface RoleHierarchy {
  parentRole: string;
  childRoles: string[];
  level: number;
}

/**
 * Interface for role analytics
 */
interface RoleAnalytics {
  totalRoles: number;
  totalUsers: number;
  rolesDistribution: Record<string, number>;
  averageRolesPerUser: number;
  hierarchyDepth: number;
  mostUsedRoles: Array<{ role: string; count: number }>;
  leastUsedRoles: Array<{ role: string; count: number }>;
  roleHierarchy: Record<string, RoleHierarchy>;
}

/**
 * Interface for role template
 */
interface RoleTemplate {
  name: string;
  description: string;
  permissions: string[];
  inheritsFrom?: string;
  isSystem?: boolean;
}

/**
 * Default system roles
 */
const SYSTEM_ROLES: RoleTemplate[] = [
  {
    name: "admin",
    description: "System administrator with full access",
    permissions: ["*"],
    isSystem: true,
  },
  {
    name: "moderator",
    description: "Content moderator with elevated access",
    permissions: [
      "user.read",
      "user.update",
      "content.read",
      "content.update",
      "content.delete",
      "comment.read",
      "comment.update",
      "comment.delete",
    ],
    inheritsFrom: "user",
    isSystem: true,
  },
  {
    name: "user",
    description: "Standard user with basic access",
    permissions: [
      "user.read.self",
      "user.update.self",
      "content.read",
      "content.create",
      "content.update.self",
      "content.delete.self",
      "comment.create",
      "comment.read",
      "comment.update.self",
      "comment.delete.self",
    ],
    isSystem: true,
  },
  {
    name: "guest",
    description: "Guest user with limited access",
    permissions: ["content.read", "comment.read"],
    isSystem: true,
  },
];

/**
 * Service responsible for role management operations.
 * This service handles:
 * 1. Role CRUD operations
 * 2. Role assignment and removal
 * 3. Role hierarchy management
 * 4. Role inheritance
 * 5. Role analytics
 * 6. System role management
 */
@injectable()
export class RoleService extends BaseService {
  private cache: NodeCache;
  private roleHierarchy: Map<string, RoleHierarchy>;

  constructor(
    @inject(TYPES.LoggerService) loggerService: ILoggerService,
    @inject(TYPES.RoleRepository)
    private readonly roleRepository: RoleRepository,
    @inject(TYPES.UserRoleRepository)
    private readonly userRoleRepository: UserRoleRepository
  ) {
    super(loggerService);
    this.logger = loggerService.createLogger("RoleService");
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
    this.roleHierarchy = new Map();
  }

  /**
   * Initialize the role hierarchy
   */
  private async initializeRoleHierarchy(): Promise<void> {
    this.logger.debug("Initializing role hierarchy");

    const roles = await this.roleRepository.findAll();
    this.roleHierarchy.clear();

    // First pass: Create hierarchy entries
    roles.forEach((role) => {
      this.roleHierarchy.set(role.id, {
        parentRole: "",
        childRoles: [],
        level: 0,
      });
    });

    // Second pass: Build relationships and calculate levels
    roles.forEach((role) => {
      if (role.inheritsFrom) {
        const hierarchy = this.roleHierarchy.get(role.id);
        const parentHierarchy = this.roleHierarchy.get(role.inheritsFrom);

        if (hierarchy && parentHierarchy) {
          hierarchy.parentRole = role.inheritsFrom;
          hierarchy.level = parentHierarchy.level + 1;
          parentHierarchy.childRoles.push(role.id);
        }
      }
    });
  }

  /**
   * Get a role by ID with caching
   * @param id The role ID
   * @returns The role or null if not found
   */
  async getRoleById(id: string): Promise<Role | null> {
    this.logger.debug("Getting role by ID", { id });

    const cacheKey = `role:${id}`;
    const cachedRole = this.cache.get<Role>(cacheKey);
    if (cachedRole) {
      return cachedRole;
    }

    const role = await this.roleRepository.findById(id);
    if (role) {
      this.cache.set(cacheKey, role);
    }

    return role;
  }

  /**
   * Get a role by name with caching
   * @param name The role name
   * @returns The role or null if not found
   */
  async getRoleByName(name: string): Promise<Role | null> {
    this.logger.debug("Getting role by name", { name });

    const cacheKey = `role:name:${name}`;
    const cachedRole = this.cache.get<Role>(cacheKey);
    if (cachedRole) {
      return cachedRole;
    }

    const role = await this.roleRepository.findByName(name);
    if (role) {
      this.cache.set(cacheKey, role);
      this.cache.set(`role:${role.id}`, role);
    }

    return role;
  }

  /**
   * Create a new role with inheritance
   * @param data The role data
   * @returns The created role
   */
  async createRole(data: Partial<Role>): Promise<Role> {
    this.logger.debug("Creating new role", { data });

    // Check if role with name already exists
    if (data.name) {
      const existingRole = await this.getRoleByName(data.name);
      if (existingRole) {
        throw new Error(`Role with name '${data.name}' already exists`);
      }
    }

    // Check for circular inheritance
    if (data.inheritsFrom) {
      const isCircular = await this.isCircularInheritance(
        "new-role",
        data.inheritsFrom
      );
      if (isCircular) {
        throw new Error("Circular role inheritance detected");
      }
    }

    const role = await this.roleRepository.create(data);
    await this.initializeRoleHierarchy();
    this.invalidateRoleCache(role);

    return role;
  }

  /**
   * Update an existing role
   * @param id The role ID
   * @param data The role data to update
   * @returns The updated role or null if not found
   */
  async updateRole(id: string, data: Partial<Role>): Promise<Role | null> {
    this.logger.debug("Updating role", { id, data });

    const role = await this.getRoleById(id);
    if (!role) {
      return null;
    }

    // Check for name conflict
    if (data.name && data.name !== role.name) {
      const existingRole = await this.getRoleByName(data.name);
      if (existingRole && existingRole.id !== id) {
        throw new Error(`Role with name '${data.name}' already exists`);
      }
    }

    // Check for circular inheritance
    if (data.inheritsFrom && data.inheritsFrom !== role.inheritsFrom) {
      const isCircular = await this.isCircularInheritance(
        id,
        data.inheritsFrom
      );
      if (isCircular) {
        throw new Error("Circular role inheritance detected");
      }
    }

    // Prevent updating system roles' critical properties
    if (role.isSystem) {
      // Clone data and remove protected properties
      const safeData = { ...data };
      delete safeData.name;
      delete safeData.isSystem;

      // Update role with safe data
      await this.roleRepository.update(id, safeData);
    } else {
      await this.roleRepository.update(id, data);
    }

    const updatedRole = await this.getRoleById(id);
    if (updatedRole) {
      this.invalidateRoleCache(updatedRole);
      await this.initializeRoleHierarchy();
    }

    return updatedRole;
  }

  /**
   * Delete a role
   * @param id The role ID
   * @returns True if deleted, false otherwise
   */
  async deleteRole(id: string): Promise<boolean> {
    this.logger.debug("Deleting role", { id });

    const role = await this.getRoleById(id);
    if (!role) {
      return false;
    }

    // Prevent deletion of system roles
    if (role.isSystem) {
      throw new Error(`Cannot delete system role '${role.name}'`);
    }

    // Check if other roles inherit from this role
    const hierarchy = this.roleHierarchy.get(id);
    if (hierarchy && hierarchy.childRoles.length > 0) {
      throw new Error(
        `Cannot delete role '${role.name}' as it is inherited by other roles`
      );
    }

    // Delete all user-role assignments
    await this.userRoleRepository.deleteByRoleId(id);

    // Delete the role
    const deleted = await this.roleRepository.delete(id);
    if (deleted) {
      this.cache.del(`role:${id}`);
      this.cache.del(`role:name:${role.name}`);
      await this.initializeRoleHierarchy();
    }

    return deleted;
  }

  /**
   * Assign a role to a user
   * @param userId The user ID
   * @param roleId The role ID
   * @returns True if assigned, false otherwise
   */
  async assignRoleToUser(userId: string, roleId: string): Promise<boolean> {
    this.logger.debug("Assigning role to user", { userId, roleId });

    // Check if role exists
    const role = await this.getRoleById(roleId);
    if (!role) {
      throw new Error(`Role with ID '${roleId}' not found`);
    }

    // Check if user already has this role
    const userRole = await this.userRoleRepository.findByUserIdAndRoleId(
      userId,
      roleId
    );
    if (userRole) {
      return true; // Already assigned
    }

    return await this.userRoleRepository.create({ userId, roleId });
  }

  /**
   * Remove a role from a user
   * @param userId The user ID
   * @param roleId The role ID
   * @returns True if removed, false otherwise
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<boolean> {
    this.logger.debug("Removing role from user", { userId, roleId });

    // Check if role exists
    const role = await this.getRoleById(roleId);
    if (!role) {
      throw new Error(`Role with ID '${roleId}' not found`);
    }

    // Check if user has this role
    const userRole = await this.userRoleRepository.findByUserIdAndRoleId(
      userId,
      roleId
    );
    if (!userRole) {
      return true; // Already not assigned
    }

    // If this is a system role, check if it's the last system role
    if (role.isSystem) {
      const userRoles = await this.getUserRoles(userId);
      const systemRoles = userRoles.filter((r) => r.isSystem);
      if (systemRoles.length === 1 && systemRoles[0].id === roleId) {
        throw new Error("Cannot remove the last system role from user");
      }
    }

    return await this.userRoleRepository.deleteByUserIdAndRoleId(
      userId,
      roleId
    );
  }

  /**
   * Get all roles assigned to a user
   * @param userId The user ID
   * @returns Array of roles
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    this.logger.debug("Getting user roles", { userId });
    return await this.roleRepository.findByUserId(userId);
  }

  /**
   * Get all roles assigned to a user, including inherited roles
   * @param userId The user ID
   * @returns Array of roles including inherited roles
   */
  async getUserInheritedRoles(userId: string): Promise<Role[]> {
    this.logger.debug("Getting user inherited roles", { userId });

    const directRoles = await this.getUserRoles(userId);
    const inheritedRoles = new Set<Role>();

    for (const role of directRoles) {
      inheritedRoles.add(role);
      await this.addInheritedRoles(role, inheritedRoles);
    }

    return Array.from(inheritedRoles);
  }

  /**
   * Initialize system roles if they don't exist
   */
  async initializeSystemRoles(): Promise<void> {
    this.logger.debug("Initializing system roles");

    for (const template of SYSTEM_ROLES) {
      let role = await this.getRoleByName(template.name);

      if (!role) {
        this.logger.info(`Creating system role: ${template.name}`);

        // Create the role without inheritance first
        const roleData: Partial<Role> = {
          name: template.name,
          description: template.description,
          isSystem: true,
        };

        role = await this.roleRepository.create(roleData);
      }
    }

    // Second pass to set up inheritance after all roles exist
    for (const template of SYSTEM_ROLES) {
      if (template.inheritsFrom) {
        const role = await this.getRoleByName(template.name);
        const parentRole = await this.getRoleByName(template.inheritsFrom);

        if (role && parentRole && role.inheritsFrom !== parentRole.id) {
          await this.updateRole(role.id, { inheritsFrom: parentRole.id });
        }
      }
    }

    await this.initializeRoleHierarchy();
  }

  /**
   * Get analytics about roles in the system
   */
  async getRoleAnalytics(): Promise<RoleAnalytics> {
    this.logger.debug("Getting role analytics");

    const roles = await this.roleRepository.findAll();
    const userRoles = await this.userRoleRepository.findAll();

    // Count users per role
    const roleCounts: Record<string, number> = {};
    userRoles.forEach((ur) => {
      roleCounts[ur.roleId] = (roleCounts[ur.roleId] || 0) + 1;
    });

    // Get unique user count
    const uniqueUsers = new Set(userRoles.map((ur) => ur.userId));

    // Calculate most/least used roles
    const rolePairs = Object.entries(roleCounts)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);

    // Build hierarchy map
    const hierarchyMap: Record<string, RoleHierarchy> = {};
    this.roleHierarchy.forEach((hierarchy, roleId) => {
      const role = roles.find((r) => r.id === roleId);
      if (role) {
        hierarchyMap[role.name] = {
          parentRole: hierarchy.parentRole
            ? roles.find((r) => r.id === hierarchy.parentRole)?.name || ""
            : "",
          childRoles: hierarchy.childRoles
            .map((childId) => roles.find((r) => r.id === childId)?.name || "")
            .filter(Boolean),
          level: hierarchy.level,
        };
      }
    });

    // Calculate hierarchy depth
    const maxLevel = Math.max(
      ...Array.from(this.roleHierarchy.values()).map((h) => h.level),
      0
    );

    return {
      totalRoles: roles.length,
      totalUsers: uniqueUsers.size,
      rolesDistribution: Object.fromEntries(
        roles.map((r) => [r.name, roleCounts[r.id] || 0])
      ),
      averageRolesPerUser: uniqueUsers.size
        ? userRoles.length / uniqueUsers.size
        : 0,
      hierarchyDepth: maxLevel,
      mostUsedRoles: rolePairs.slice(0, 5).map((p) => ({
        role: roles.find((r) => r.id === p.role)?.name || p.role,
        count: p.count,
      })),
      leastUsedRoles: rolePairs
        .reverse()
        .slice(0, 5)
        .map((p) => ({
          role: roles.find((r) => r.id === p.role)?.name || p.role,
          count: p.count,
        })),
      roleHierarchy: hierarchyMap,
    };
  }

  /**
   * Check for circular inheritance
   * @param roleId The role ID being checked
   * @param parentId The potential parent role ID
   * @returns True if circular inheritance detected
   */
  private async isCircularInheritance(
    roleId: string,
    parentId: string
  ): Promise<boolean> {
    this.logger.debug("Checking for circular inheritance", {
      roleId,
      parentId,
    });

    // If they're the same, it's circular
    if (roleId === parentId) {
      return true;
    }

    const parentRole = await this.getRoleById(parentId);
    if (!parentRole) {
      return false;
    }

    // If parent has no inheritance, it's safe
    if (!parentRole.inheritsFrom) {
      return false;
    }

    // Check if the parent's parent is the original role
    if (parentRole.inheritsFrom === roleId) {
      return true;
    }

    // Recursively check the parent's parent
    return this.isCircularInheritance(roleId, parentRole.inheritsFrom);
  }

  /**
   * Recursively add inherited roles
   * @param role The role to check for inheritance
   * @param inheritedRoles Set of inherited roles to populate
   */
  private async addInheritedRoles(
    role: Role,
    inheritedRoles: Set<Role>
  ): Promise<void> {
    if (!role.inheritsFrom) {
      return;
    }

    const parentRole = await this.getRoleById(role.inheritsFrom);
    if (
      parentRole &&
      !Array.from(inheritedRoles).some((r) => r.id === parentRole.id)
    ) {
      inheritedRoles.add(parentRole);
      await this.addInheritedRoles(parentRole, inheritedRoles);
    }
  }

  /**
   * Invalidate role cache
   * @param role The role to invalidate
   */
  private invalidateRoleCache(role: Role): void {
    this.cache.del(`role:${role.id}`);
    this.cache.del(`role:name:${role.name}`);
  }
}
