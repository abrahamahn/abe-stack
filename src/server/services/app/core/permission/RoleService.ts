import NodeCache from "node-cache";

import { Role, RoleAttributes } from "@models/auth";
import { RoleRepository, UserRoleRepository } from "@repositories/auth";
import { Logger } from "@services/dev/logger";

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
export class RoleService {
  private logger: Logger;
  private cache: NodeCache;
  private roleHierarchy: Map<string, RoleHierarchy>;

  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly userRoleRepository: UserRoleRepository,
  ) {
    this.logger = new Logger("RoleService");
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

    const role = await this.roleRepository.findByPk(id);
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
  async createRole(data: Partial<RoleAttributes>): Promise<Role> {
    this.logger.debug("Creating new role", { data });

    // Validate role name uniqueness
    const existingRole = await this.getRoleByName(data.name!);
    if (existingRole) {
      throw new Error(`Role with name '${data.name}' already exists`);
    }

    // Validate parent role if specified
    if (data.inheritsFrom) {
      const parentRole = await this.getRoleById(data.inheritsFrom);
      if (!parentRole) {
        throw new Error("Parent role not found");
      }
    }

    const role = await this.roleRepository.create(data);
    await this.initializeRoleHierarchy();
    this.invalidateRoleCache(role);

    return role;
  }

  /**
   * Update a role
   * @param id The role ID
   * @param data The role data to update
   * @returns The updated role or null if not found
   */
  async updateRole(
    id: string,
    data: Partial<RoleAttributes>,
  ): Promise<Role | null> {
    this.logger.debug("Updating role", { id, data });

    const role = await this.getRoleById(id);
    if (!role) {
      return null;
    }

    // Prevent modification of system roles
    if (role.isSystem) {
      throw new Error("System roles cannot be modified");
    }

    // Validate name uniqueness if changing name
    if (data.name && data.name !== role.name) {
      const existingRole = await this.getRoleByName(data.name);
      if (existingRole) {
        throw new Error(`Role with name '${data.name}' already exists`);
      }
    }

    // Validate parent role if changing inheritance
    if (data.inheritsFrom && data.inheritsFrom !== role.inheritsFrom) {
      const parentRole = await this.getRoleById(data.inheritsFrom);
      if (!parentRole) {
        throw new Error("Parent role not found");
      }
      // Prevent circular inheritance
      if (await this.isCircularInheritance(id, data.inheritsFrom)) {
        throw new Error("Circular role inheritance detected");
      }
    }

    const updatedRole = await this.roleRepository.update(id, data);
    if (updatedRole) {
      await this.initializeRoleHierarchy();
      this.invalidateRoleCache(updatedRole);
    }

    return updatedRole;
  }

  /**
   * Delete a role
   * @param id The role ID
   * @returns True if role was deleted
   */
  async deleteRole(id: string): Promise<boolean> {
    this.logger.debug("Deleting role", { id });

    const role = await this.getRoleById(id);
    if (!role) {
      return false;
    }

    // Prevent deletion of system roles
    if (role.isSystem) {
      throw new Error("System roles cannot be deleted");
    }

    // Check if role has child roles
    const hierarchy = this.roleHierarchy.get(id);
    if (hierarchy && hierarchy.childRoles.length > 0) {
      throw new Error("Cannot delete role with child roles");
    }

    const deleted = await this.roleRepository.delete(id);
    if (deleted) {
      await this.initializeRoleHierarchy();
      this.invalidateRoleCache(role);
    }

    return deleted;
  }

  /**
   * Assign a role to a user
   * @param userId The user ID
   * @param roleId The role ID
   * @returns True if role was assigned
   */
  async assignRoleToUser(userId: string, roleId: string): Promise<boolean> {
    this.logger.debug("Assigning role to user", { userId, roleId });

    const role = await this.getRoleById(roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    const result = await this.userRoleRepository.assignRole(userId, roleId);
    return !!result;
  }

  /**
   * Remove a role from a user
   * @param userId The user ID
   * @param roleId The role ID
   * @returns True if role was removed
   */
  async removeRoleFromUser(userId: string, roleId: string): Promise<boolean> {
    this.logger.debug("Removing role from user", { userId, roleId });

    const role = await this.getRoleById(roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    // Prevent removal of last role
    const userRoles = await this.userRoleRepository.findRolesForUser(userId);
    if (userRoles.length === 1 && userRoles[0].id === roleId) {
      throw new Error("Cannot remove the last role from a user");
    }

    return this.userRoleRepository.removeRole(userId, roleId);
  }

  /**
   * Get all roles assigned to a user
   * @param userId The user ID
   * @returns Array of roles
   */
  async getUserRoles(userId: string): Promise<Role[]> {
    this.logger.debug("Getting user roles", { userId });
    return this.userRoleRepository.findRolesForUser(userId);
  }

  /**
   * Get all inherited roles for a user
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
   * Initialize system roles
   */
  async initializeSystemRoles(): Promise<void> {
    this.logger.debug("Initializing system roles");

    for (const template of SYSTEM_ROLES) {
      const existingRole = await this.getRoleByName(template.name);
      if (!existingRole) {
        const roleData: Partial<RoleAttributes> = {
          name: template.name,
          description: template.description,
          isSystem: template.isSystem,
          inheritsFrom: template.inheritsFrom,
        };
        await this.createRole(roleData);
      }
    }

    await this.initializeRoleHierarchy();
  }

  /**
   * Get role analytics
   * @returns Role analytics data
   */
  async getRoleAnalytics(): Promise<RoleAnalytics> {
    this.logger.debug("Getting role analytics");

    const roles = await this.roleRepository.findAll();
    const userRoles = await this.userRoleRepository.findAll();
    const totalUsers = new Set(userRoles.map((ur) => ur.userId)).size;

    const rolesDistribution: Record<string, number> = {};
    roles.forEach((role) => {
      rolesDistribution[role.name] = userRoles.filter(
        (ur) => ur.roleId === role.id,
      ).length;
    });

    const sortedRoles = Object.entries(rolesDistribution)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalRoles: roles.length,
      totalUsers,
      rolesDistribution,
      averageRolesPerUser: userRoles.length / totalUsers,
      hierarchyDepth: Math.max(
        ...Array.from(this.roleHierarchy.values()).map((h) => h.level),
      ),
      mostUsedRoles: sortedRoles.slice(0, 5),
      leastUsedRoles: sortedRoles.slice(-5).reverse(),
      roleHierarchy: Object.fromEntries(this.roleHierarchy),
    };
  }

  /**
   * Check for circular inheritance
   * @param roleId The role ID
   * @param parentId The parent role ID
   * @returns True if circular inheritance is detected
   */
  private async isCircularInheritance(
    roleId: string,
    parentId: string,
  ): Promise<boolean> {
    const visited = new Set<string>();
    let currentId = parentId;

    while (currentId) {
      if (currentId === roleId) {
        return true;
      }
      if (visited.has(currentId)) {
        return false;
      }
      visited.add(currentId);

      const role = await this.getRoleById(currentId);
      currentId = role?.inheritsFrom || "";
    }

    return false;
  }

  /**
   * Add inherited roles recursively
   * @param role The role to process
   * @param inheritedRoles Set of inherited roles
   */
  private async addInheritedRoles(
    role: Role,
    inheritedRoles: Set<Role>,
  ): Promise<void> {
    if (role.inheritsFrom) {
      const parentRole = await this.getRoleById(role.inheritsFrom);
      if (parentRole && !inheritedRoles.has(parentRole)) {
        inheritedRoles.add(parentRole);
        await this.addInheritedRoles(parentRole, inheritedRoles);
      }
    }
  }

  /**
   * Invalidate role cache
   * @param role Role to invalidate cache for
   */
  private invalidateRoleCache(role: Role): void {
    this.cache.del(`role:${role.id}`);
    this.cache.del(`role:name:${role.name}`);
  }
}
