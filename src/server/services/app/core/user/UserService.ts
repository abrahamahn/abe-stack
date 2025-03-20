import NodeCache from "node-cache";

import { User, UserAttributes } from "@models/auth";
import { UserRepository } from "@repositories/auth";
import { Logger } from "@services/dev/logger";

/**
 * Interface for user search options
 */
interface UserSearchOptions {
  query?: string;
  role?: string;
  status?: "active" | "inactive" | "all";
  sortBy?: "username" | "createdAt" | "lastLogin";
  sortOrder?: "asc" | "desc";
}

/**
 * Interface for pagination options
 */
interface PaginationOptions {
  page: number;
  limit: number;
}

/**
 * Interface for paginated response
 */
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Interface for user statistics
 */
interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  usersByRole: Record<string, number>;
  averageProfileCompletion: number;
}

/**
 * Service responsible for user management operations.
 * This service handles:
 * 1. User CRUD operations
 * 2. User profile management
 * 3. User search and filtering
 * 4. User role management
 * 5. User statistics and analytics
 * 6. Batch operations
 */
export class UserService {
  private logger: Logger;
  private cache: NodeCache;

  constructor(private readonly userRepository: UserRepository) {
    this.logger = new Logger("UserService");
    this.cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
  }

  /**
   * Get a user by their ID with caching
   * @param id The user ID
   * @returns The user or null if not found
   */
  async getUserById(id: string): Promise<User | null> {
    this.logger.debug("Getting user by ID", { id });

    // Check cache first
    const cachedUser = this.cache.get<User>(this.getCacheKey("user", id));
    if (cachedUser) {
      this.logger.debug("User found in cache", { id });
      return cachedUser;
    }

    const user = await this.userRepository.findByPk(id);
    if (user) {
      this.cache.set(this.getCacheKey("user", id), user);
    }

    return user;
  }

  /**
   * Get a user by their email with caching
   * @param email The user's email
   * @returns The user or null if not found
   */
  async getUserByEmail(email: string): Promise<User | null> {
    this.logger.debug("Getting user by email", { email });

    const cachedUser = this.cache.get<User>(this.getCacheKey("email", email));
    if (cachedUser) {
      return cachedUser;
    }

    const user = await this.userRepository.findByEmail(email);
    if (user) {
      this.cache.set(this.getCacheKey("email", email), user);
      this.cache.set(this.getCacheKey("user", user.id), user);
    }

    return user;
  }

  /**
   * Get a user by their username with caching
   * @param username The username
   * @returns The user or null if not found
   */
  async getUserByUsername(username: string): Promise<User | null> {
    this.logger.debug("Getting user by username", { username });

    const cachedUser = this.cache.get<User>(
      this.getCacheKey("username", username),
    );
    if (cachedUser) {
      return cachedUser;
    }

    const user = await this.userRepository.findByUsername(username);
    if (user) {
      this.cache.set(this.getCacheKey("username", username), user);
      this.cache.set(this.getCacheKey("user", user.id), user);
    }

    return user;
  }

  /**
   * Get users with pagination and search options
   * @param options Search options
   * @param pagination Pagination options
   * @returns Paginated response of users
   */
  async getUsers(
    options: UserSearchOptions = {},
    pagination: PaginationOptions = { page: 1, limit: 10 },
  ): Promise<PaginatedResponse<User>> {
    this.logger.debug("Getting users with options", { options, pagination });

    const { query, role, status, sortBy, sortOrder } = options;
    const { page, limit } = pagination;

    // Get all users (in a real app, this would be a database query with proper filtering)
    let users = await this.userRepository.findAll();

    // Apply filters
    if (query) {
      const normalizedQuery = query.toLowerCase();
      users = users.filter((user) => {
        return (
          user.username.toLowerCase().includes(normalizedQuery) ||
          user.email.toLowerCase().includes(normalizedQuery) ||
          user.displayName?.toLowerCase().includes(normalizedQuery)
        );
      });
    }

    if (role) {
      users = users.filter((user) => user.role === role);
    }

    if (status && status !== "all") {
      users = users.filter((user) => {
        const isActive =
          user.lastLogin &&
          new Date(user.lastLogin as string) >
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return status === "active" ? isActive : !isActive;
      });
    }

    // Apply sorting
    if (sortBy) {
      users.sort((a, b) => {
        const aValue = a[sortBy] as string | number;
        const bValue = b[sortBy] as string | number;
        const order = sortOrder === "desc" ? -1 : 1;
        return aValue < bValue ? -1 * order : aValue > bValue ? 1 * order : 0;
      });
    }

    // Apply pagination
    const total = users.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedUsers = users.slice(startIndex, endIndex);

    return {
      items: paginatedUsers,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Update a user's profile with cache invalidation
   * @param id The user ID
   * @param data The profile data to update
   * @returns The updated user or null if not found
   */
  async updateProfile(
    id: string,
    data: Partial<UserAttributes>,
  ): Promise<User | null> {
    this.logger.debug("Updating user profile", { id, data });

    // Remove sensitive fields that shouldn't be updated directly
    const {
      password: _password,
      emailToken: _emailToken,
      emailTokenExpire: _emailTokenExpire,
      role: _role,
      ...updateData
    } = data;

    const user = await this.userRepository.findByPk(id);
    if (!user) {
      this.logger.warn("User not found for profile update", { id });
      return null;
    }

    const updatedUser = await this.userRepository.update(id, updateData);
    if (updatedUser) {
      this.invalidateUserCache(updatedUser);
    }

    return updatedUser;
  }

  /**
   * Update a user's password with cache invalidation
   * @param id The user ID
   * @param currentPassword The current password
   * @param newPassword The new password
   * @returns True if password was updated successfully
   * @throws Error if current password is invalid
   */
  async updatePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    this.logger.debug("Updating user password", { id });

    const user = await this.userRepository.findByPk(id);
    if (!user) {
      this.logger.warn("User not found for password update", { id });
      throw new Error("User not found");
    }

    // Verify current password
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      this.logger.warn("Invalid current password provided", { id });
      throw new Error("Invalid current password");
    }

    // Update password
    await user.updatePassword(newPassword);
    const updated = await this.userRepository.update(id, {
      password: user.password,
    });

    if (updated) {
      this.invalidateUserCache(user);
    }

    return !!updated;
  }

  /**
   * Delete a user account with cache invalidation
   * @param id The user ID
   * @returns True if user was deleted successfully
   */
  async deleteUser(id: string): Promise<boolean> {
    this.logger.debug("Deleting user", { id });

    const user = await this.userRepository.findByPk(id);
    if (!user) {
      this.logger.warn("User not found for deletion", { id });
      return false;
    }

    const deleted = await this.userRepository.delete(id);
    if (deleted) {
      this.invalidateUserCache(user);
    }

    return deleted;
  }

  /**
   * Update a user's role with cache invalidation
   * @param id The user ID
   * @param newRole The new role to assign
   * @returns The updated user or null if not found
   */
  async updateRole(id: string, newRole: string): Promise<User | null> {
    this.logger.debug("Updating user role", { id, newRole });

    const user = await this.userRepository.findByPk(id);
    if (!user) {
      this.logger.warn("User not found for role update", { id });
      return null;
    }

    const updatedUser = await this.userRepository.update(id, { role: newRole });
    if (updatedUser) {
      this.invalidateUserCache(updatedUser);
    }

    return updatedUser;
  }

  /**
   * Batch update users
   * @param updates Array of user updates
   * @returns Array of updated users
   */
  async batchUpdateUsers(
    updates: Array<{ id: string; data: Partial<UserAttributes> }>,
  ): Promise<Array<User | null>> {
    this.logger.debug("Batch updating users", { count: updates.length });

    const results = await Promise.all(
      updates.map(async ({ id, data }) => {
        try {
          return await this.updateProfile(id, data);
        } catch (error) {
          this.logger.error("Error updating user", { id, error });
          return null;
        }
      }),
    );

    return results;
  }

  /**
   * Batch delete users
   * @param ids Array of user IDs to delete
   * @returns Array of deletion results
   */
  async batchDeleteUsers(ids: string[]): Promise<Array<boolean>> {
    this.logger.debug("Batch deleting users", { count: ids.length });

    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          return await this.deleteUser(id);
        } catch (error) {
          this.logger.error("Error deleting user", { id, error });
          return false;
        }
      }),
    );

    return results;
  }

  /**
   * Get user statistics
   * @returns User statistics
   */
  async getUserStatistics(): Promise<UserStatistics> {
    this.logger.debug("Getting user statistics");

    const users = await this.userRepository.findAll();
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      today.getDate(),
    );

    const usersByRole: Record<string, number> = {};
    let totalProfileFields = 0;
    let completedProfileFields = 0;

    users.forEach((user) => {
      // Count users by role
      usersByRole[user.role] = (usersByRole[user.role] || 0) + 1;

      // Calculate profile completion
      const profileFields = [
        "displayName",
        "firstName",
        "lastName",
        "bio",
        "profileImage",
      ];
      totalProfileFields += profileFields.length;
      completedProfileFields += profileFields.filter(
        (field) => user[field],
      ).length;
    });

    return {
      totalUsers: users.length,
      activeUsers: users.filter(
        (user) =>
          user.lastLogin && new Date(user.lastLogin as string) > monthAgo,
      ).length,
      newUsersToday: users.filter((user) => user.createdAt >= today).length,
      newUsersThisWeek: users.filter((user) => user.createdAt >= weekAgo)
        .length,
      newUsersThisMonth: users.filter((user) => user.createdAt >= monthAgo)
        .length,
      usersByRole,
      averageProfileCompletion:
        (completedProfileFields / totalProfileFields) * 100,
    };
  }

  /**
   * Generate cache key
   * @param type Cache key type
   * @param value Cache key value
   * @returns Cache key
   */
  private getCacheKey(type: string, value: string): string {
    return `user:${type}:${value}`;
  }

  /**
   * Invalidate user cache
   * @param user User to invalidate cache for
   */
  private invalidateUserCache(user: User): void {
    this.cache.del(this.getCacheKey("user", user.id));
    this.cache.del(this.getCacheKey("email", user.email));
    this.cache.del(this.getCacheKey("username", user.username));
  }
}
