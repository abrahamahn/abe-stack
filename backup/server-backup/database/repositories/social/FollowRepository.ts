import { BaseModelInterface } from "@/server/database/models/BaseModel";
import {
  Follow,
  FollowAttributes,
} from "@/server/database/models/social/Follow";
import {
  FollowErrors,
  FollowNotFoundError,
  FollowValidationError,
  FollowOperationError,
  FollowAlreadyExistsError,
  SelfFollowError,
  FollowRateLimitError,
} from "@/server/infrastructure/errors/domain/social/FollowError";

import { BaseRepository } from "../BaseRepository";

export interface FollowWithIndex extends Follow, BaseModelInterface {
  [key: string]: unknown;
}

/**
 * Interface for user data returned by mutual follower queries
 */
interface UserData {
  id: string;
  username: string;
  displayName: string;
  profileImage: string | null;
  [key: string]: unknown;
}

/**
 * Repository class for handling Follow database operations.
 * This class is responsible for:
 * 1. All database operations related to follows
 * 2. Converting between database and model formats
 * 3. Providing specific query methods for follow relationships
 * 4. Throwing domain-specific errors for error cases
 * 5. NOT implementing business logic - that belongs in the Follow model
 */
export class FollowRepository extends BaseRepository<Follow> {
  protected tableName = "follows";
  protected columns = [
    "id",
    "follower_id as followerId",
    "following_id as followingId",
    "status",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super("Follow");
  }

  /**
   * Find a follow relationship by follower and following user IDs
   * @throws FollowOperationError if there's an error during the operation
   */
  async findByUserAndTarget(
    followerId: string,
    followingId: string
  ): Promise<Follow | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE follower_id = $1 AND following_id = $2
      `;

      const result = await this.executeQuery<FollowAttributes>(query, [
        followerId,
        followingId,
      ]);
      if (result.rows.length === 0) return null;

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      throw new FollowOperationError("findByUserAndTarget", error);
    }
  }

  /**
   * Check if a user is following another user
   * @throws FollowOperationError if there's an error during the operation
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const follow = await this.findByUserAndTarget(followerId, followingId);
      return follow !== null;
    } catch (error) {
      if (error instanceof FollowOperationError) {
        throw error;
      }
      throw new FollowOperationError("isFollowing", error);
    }
  }

  /**
   * Get all followers of a specific user
   * @throws FollowOperationError if there's an error during the operation
   */
  async getFollowersForUser(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<Follow[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE following_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery<FollowAttributes>(query, [
        userId,
        String(limit),
        String(offset),
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new FollowOperationError("getFollowersForUser", error);
    }
  }

  /**
   * Get all users that a specific user is following
   * @throws FollowOperationError if there's an error during the operation
   */
  async getFollowingForUser(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<Follow[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE follower_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery<FollowAttributes>(query, [
        userId,
        String(limit),
        String(offset),
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new FollowOperationError("getFollowingForUser", error);
    }
  }

  /**
   * Count followers for a user
   * @throws FollowOperationError if there's an error during the operation
   */
  async countFollowers(userId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE following_id = $1
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        userId,
      ]);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      throw new FollowOperationError("countFollowers", error);
    }
  }

  /**
   * Count users that a specific user is following
   * @throws FollowOperationError if there's an error during the operation
   */
  async countFollowing(userId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE follower_id = $1
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        userId,
      ]);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      throw new FollowOperationError("countFollowing", error);
    }
  }

  /**
   * Create a new follow relationship
   * @throws SelfFollowError if user tries to follow themselves
   * @throws FollowAlreadyExistsError if the follow relationship already exists
   * @throws FollowValidationError if follow data is invalid
   * @throws FollowRateLimitError if user has exceeded follow limits
   * @throws FollowOperationError if there's an error during the operation
   */
  async create(
    data: Omit<FollowAttributes, "id" | "createdAt" | "updatedAt"> & {
      followerId: string;
      followingId: string;
    }
  ): Promise<Follow> {
    try {
      // Check if user is trying to follow themselves
      if (data.followerId === data.followingId) {
        throw new SelfFollowError(data.followerId);
      }

      // Check if already following
      const existingFollow = await this.findByUserAndTarget(
        data.followerId,
        data.followingId
      );

      if (existingFollow) {
        throw new FollowAlreadyExistsError(data.followerId, data.followingId);
      }

      // Check for rate limiting
      await this.checkFollowRateLimit(data.followerId);

      // Create and validate Follow object
      const follow = new Follow({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const validationErrors = follow.validate();
      if (validationErrors && validationErrors.length > 0) {
        throw new FollowValidationError(validationErrors);
      }

      // Insert the follow
      const values = [
        follow.id,
        follow.followerId,
        follow.followingId,
        follow.createdAt,
        follow.updatedAt,
      ];

      const query = `
        INSERT INTO ${this.tableName} (
          id, follower_id, following_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery<FollowAttributes>(query, values);

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      // Re-throw domain errors
      if (
        error instanceof SelfFollowError ||
        error instanceof FollowAlreadyExistsError ||
        error instanceof FollowValidationError ||
        error instanceof FollowRateLimitError
      ) {
        throw error;
      }
      throw new FollowOperationError("create", error);
    }
  }

  /**
   * Check if a user has exceeded follow rate limits
   * @throws FollowRateLimitError if user has exceeded follow limits
   * @throws FollowOperationError if there's an error during the operation
   */
  private async checkFollowRateLimit(userId: string): Promise<void> {
    try {
      const hourlyLimit = 50; // Example: 50 follows per hour
      const since = new Date();
      since.setHours(since.getHours() - 1);

      const count = await this.countFollowsInTimeRange(userId, since);
      if (count >= hourlyLimit) {
        throw new FollowRateLimitError(userId, hourlyLimit, "hour");
      }
    } catch (error) {
      if (error instanceof FollowRateLimitError) {
        throw error;
      }
      throw new FollowOperationError("checkFollowRateLimit", error);
    }
  }

  /**
   * Unfollow a user
   * @throws FollowNotFoundError if the follow relationship doesn't exist
   * @throws FollowOperationError if there's an error during the operation
   */
  async unfollow(followerId: string, followingId: string): Promise<boolean> {
    try {
      // Check if the follow relationship exists
      const follow = await this.findByUserAndTarget(followerId, followingId);
      if (!follow) {
        throw new FollowNotFoundError(followerId, followingId);
      }

      // Delete the follow relationship
      const query = `
        DELETE FROM ${this.tableName}
        WHERE follower_id = $1 AND following_id = $2
      `;

      const result = await this.executeQuery(query, [followerId, followingId]);
      return result.rowCount > 0;
    } catch (error) {
      if (error instanceof FollowNotFoundError) {
        throw error;
      }
      throw new FollowOperationError("unfollow", error);
    }
  }

  /**
   * Toggle follow status (follow if not following, unfollow if following)
   * @throws FollowOperationError if there's an error during the operation
   */
  async toggleFollow(
    followerId: string,
    followingId: string
  ): Promise<boolean> {
    try {
      // Check if user is trying to follow themselves
      if (followerId === followingId) {
        throw new SelfFollowError(followerId);
      }

      const isAlreadyFollowing = await this.isFollowing(
        followerId,
        followingId
      );

      if (isAlreadyFollowing) {
        await this.unfollow(followerId, followingId);
        return false; // Now not following
      } else {
        await this.create({
          followerId,
          followingId,
        });
        return true; // Now following
      }
    } catch (error) {
      if (error instanceof SelfFollowError) {
        throw error;
      }
      throw new FollowOperationError("toggleFollow", error);
    }
  }

  /**
   * Get recent followers for a user
   * @throws FollowOperationError if there's an error during the operation
   */
  async getRecentFollowers(userId: string, limit = 10): Promise<Follow[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE following_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await this.executeQuery<FollowAttributes>(query, [
        userId,
        String(limit),
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new FollowOperationError("getRecentFollowers", error);
    }
  }

  /**
   * Get users that a specific user recently followed
   * @throws FollowOperationError if there's an error during the operation
   */
  async getRecentFollowing(userId: string, limit = 10): Promise<Follow[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE follower_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await this.executeQuery<FollowAttributes>(query, [
        userId,
        String(limit),
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new FollowOperationError("getRecentFollowing", error);
    }
  }

  /**
   * Get mutual followers between two users
   * @throws FollowOperationError if there's an error during the operation
   */
  async getMutualFollowers(
    userId: string,
    otherUserId: string,
    limit = 20,
    offset = 0
  ): Promise<UserData[]> {
    try {
      const query = `
        SELECT u.id, u.username, u.display_name as "displayName", u.profile_image as "profileImage"
        FROM users u
        JOIN follows f1 ON u.id = f1.follower_id
        JOIN follows f2 ON u.id = f2.follower_id
        WHERE f1.following_id = $1 AND f2.following_id = $2
        ORDER BY u.username
        LIMIT $3 OFFSET $4
      `;

      const result = await this.executeQuery<UserData>(query, [
        userId,
        otherUserId,
        String(limit),
        String(offset),
      ]);
      return result.rows;
    } catch (error) {
      throw new FollowOperationError("getMutualFollowers", error);
    }
  }

  /**
   * Count mutual followers between two users
   * @throws FollowOperationError if there's an error during the operation
   */
  async countMutualFollowers(
    userId: string,
    otherUserId: string
  ): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM (
          SELECT f1.follower_id
          FROM follows f1
          JOIN follows f2 ON f1.follower_id = f2.follower_id
          WHERE f1.following_id = $1 AND f2.following_id = $2
        ) mutual
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        userId,
        otherUserId,
      ]);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      throw new FollowOperationError("countMutualFollowers", error);
    }
  }

  /**
   * Count follows in a specific time range
   * @throws FollowOperationError if there's an error during the operation
   */
  async countFollowsInTimeRange(userId: string, since: Date): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE follower_id = $1 AND created_at >= $2
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        userId,
        since,
      ]);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      throw new FollowOperationError("countFollowsInTimeRange", error);
    }
  }

  /**
   * Find by user IDs
   * @throws FollowOperationError if there's an error during the operation
   */
  async findByUserIds(
    followerId: string,
    followingId: string
  ): Promise<Follow | null> {
    return this.findByUserAndTarget(followerId, followingId);
  }

  /**
   * Find followers with pagination
   * @throws FollowOperationError if there's an error during the operation
   */
  async findFollowers(
    userId: string,
    options: { limit: number; offset?: number }
  ): Promise<Follow[]> {
    try {
      const { limit, offset = 0 } = options;
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE following_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery<FollowAttributes>(query, [
        userId,
        String(limit),
        String(offset),
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new FollowOperationError("findFollowers", error);
    }
  }

  /**
   * Find following with pagination
   * @throws FollowOperationError if there's an error during the operation
   */
  async findFollowing(
    userId: string,
    options: { limit: number; offset?: number }
  ): Promise<Follow[]> {
    try {
      const { limit, offset = 0 } = options;
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE follower_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery<FollowAttributes>(query, [
        userId,
        String(limit),
        String(offset),
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new FollowOperationError("findFollowing", error);
    }
  }

  /**
   * Find last follow
   * @throws FollowOperationError if there's an error during the operation
   */
  async findLastFollow(userId: string): Promise<Follow | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE follower_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await this.executeQuery<FollowAttributes>(query, [userId]);
      if (result.rows.length === 0) return null;

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      throw new FollowOperationError("findLastFollow", error);
    }
  }

  /**
   * Find last follower
   * @throws FollowOperationError if there's an error during the operation
   */
  async findLastFollower(userId: string): Promise<Follow | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE following_id = $1
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await this.executeQuery<FollowAttributes>(query, [userId]);
      if (result.rows.length === 0) return null;

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      throw new FollowOperationError("findLastFollower", error);
    }
  }

  /**
   * Find mutual followers between two users with pagination
   * @throws FollowOperationError if there's an error during the operation
   */
  async findMutualFollowers(
    userId1: string,
    userId2: string,
    options: { limit: number; offset?: number }
  ): Promise<Follow[]> {
    try {
      const { limit, offset = 0 } = options;
      const query = `
        SELECT f1.${this.columns.join(", f1.")}
        FROM ${this.tableName} f1
        JOIN ${this.tableName} f2 ON f1.follower_id = f2.follower_id
        WHERE f1.following_id = $1 AND f2.following_id = $2
        ORDER BY f1.created_at DESC
        LIMIT $3 OFFSET $4
      `;

      const result = await this.executeQuery<FollowAttributes>(query, [
        userId1,
        userId2,
        String(limit),
        String(offset),
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new FollowOperationError("findMutualFollowers", error);
    }
  }

  /**
   * Find follows by user IDs in batch
   * @throws FollowOperationError if there's an error during the operation
   */
  async findFollowsByUserIds(
    followerId: string,
    targetUserIds: string[]
  ): Promise<Follow[]> {
    try {
      if (targetUserIds.length === 0) return [];

      const placeholders = targetUserIds.map((_, i) => `$${i + 2}`).join(", ");
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE follower_id = $1 AND following_id IN (${placeholders})
      `;

      const result = await this.executeQuery<FollowAttributes>(query, [
        followerId,
        ...targetUserIds,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new FollowOperationError("findFollowsByUserIds", error);
    }
  }

  /**
   * Batch count followers for multiple users
   * @throws FollowOperationError if there's an error during the operation
   */
  async batchCountFollowers(userIds: string[]): Promise<Map<string, number>> {
    try {
      if (userIds.length === 0) return new Map();

      const placeholders = userIds.map((_, i) => `$${i + 1}`).join(", ");
      const query = `
        SELECT following_id, COUNT(*) as count
        FROM ${this.tableName}
        WHERE following_id IN (${placeholders})
        GROUP BY following_id
      `;

      const result = await this.executeQuery<{
        following_id: string;
        count: string;
      }>(query, userIds);

      const counts = new Map<string, number>();
      userIds.forEach((id) => counts.set(id, 0)); // Initialize with zeros
      result.rows.forEach((row) => {
        counts.set(row.following_id, parseInt(row.count, 10));
      });

      return counts;
    } catch (error) {
      throw new FollowOperationError("batchCountFollowers", error);
    }
  }

  /**
   * Batch count following for multiple users
   * @throws FollowOperationError if there's an error during the operation
   */
  async batchCountFollowing(userIds: string[]): Promise<Map<string, number>> {
    try {
      if (userIds.length === 0) return new Map();

      const placeholders = userIds.map((_, i) => `$${i + 1}`).join(", ");
      const query = `
        SELECT follower_id, COUNT(*) as count
        FROM ${this.tableName}
        WHERE follower_id IN (${placeholders})
        GROUP BY follower_id
      `;

      const result = await this.executeQuery<{
        follower_id: string;
        count: string;
      }>(query, userIds);

      const counts = new Map<string, number>();
      userIds.forEach((id) => counts.set(id, 0)); // Initialize with zeros
      result.rows.forEach((row) => {
        counts.set(row.follower_id, parseInt(row.count, 10));
      });

      return counts;
    } catch (error) {
      throw new FollowOperationError("batchCountFollowing", error);
    }
  }

  /**
   * Maps database result to model instance
   */
  protected mapResultToModel(row: Record<string, unknown>): Follow {
    if (!row) return null as unknown as Follow;

    return new Follow({
      id: row.id as string,
      followerId: row.followerId as string,
      followingId: row.followingId as string,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt
          : new Date(row.createdAt as string),
      updatedAt:
        row.updatedAt instanceof Date
          ? row.updatedAt
          : new Date(row.updatedAt as string),
    });
  }
}

// Export singleton instance
export const followRepository = new FollowRepository();
