import { Logger } from "../../../services/dev/logger/LoggerService";
import { BaseModelInterface } from "../../models/BaseModel";
import { Follow, FollowAttributes } from "../../models/social/Follow";
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
 * Custom error class for follow operations
 */
export class FollowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FollowError";
  }
}

/**
 * Repository class for handling Follow database operations.
 * This class is responsible for:
 * 1. All database operations related to follows
 * 2. Converting between database and model formats
 * 3. Providing specific query methods for follow relationships
 * 4. NOT implementing business logic - that belongs in the Follow model
 */
export class FollowRepository extends BaseRepository<FollowWithIndex> {
  private static instance: FollowRepository;
  protected logger = new Logger("FollowRepository");
  protected tableName = "follows";
  protected columns = [
    "id",
    "follower_id as followerId",
    "following_id as followingId",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  private constructor() {
    super();
  }

  /**
   * Get the singleton instance of FollowRepository
   */
  public static getInstance(): FollowRepository {
    if (!FollowRepository.instance) {
      FollowRepository.instance = new FollowRepository();
    }
    return FollowRepository.instance;
  }

  /**
   * Find a follow relationship by follower and following user IDs
   */
  async findByUserAndTarget(
    followerId: string,
    followingId: string,
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
      this.logger.error("Error finding follow by user and target", error);
      throw new FollowError(
        `Failed to find follow relationship: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Check if a user is following another user
   */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    try {
      const follow = await this.findByUserAndTarget(followerId, followingId);
      return follow !== null;
    } catch (error) {
      this.logger.error("Error checking follow status", error);
      throw new FollowError(
        `Failed to check follow status: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get all followers of a specific user
   */
  async getFollowersForUser(
    userId: string,
    limit = 20,
    offset = 0,
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
      this.logger.error("Error getting followers for user", error);
      throw new FollowError(
        `Failed to get followers: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get all users that a specific user is following
   */
  async getFollowingForUser(
    userId: string,
    limit = 20,
    offset = 0,
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
      this.logger.error("Error getting following for user", error);
      throw new FollowError(
        `Failed to get following: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Count followers for a user
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
      this.logger.error("Error counting followers", error);
      throw new FollowError(
        `Failed to count followers: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Count users that a specific user is following
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
      this.logger.error("Error counting following", error);
      throw new FollowError(
        `Failed to count following: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Create a new follow relationship
   */
  async create(
    data: Omit<FollowAttributes, "id" | "createdAt" | "updatedAt"> & {
      followerId: string;
      followingId: string;
    },
  ): Promise<Follow> {
    return this.withTransaction(async (client) => {
      try {
        // Create a new Follow instance for validation
        const follow = new Follow({
          ...data,
          id: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Validate follow
        const validationErrors = follow.validate();
        if (validationErrors.length > 0) {
          throw new FollowError(validationErrors.join(", "));
        }

        const query = `
          INSERT INTO ${this.tableName} (follower_id, following_id)
          VALUES ($1, $2)
          RETURNING ${this.columns.join(", ")}
        `;

        const { rows } = await client.query(query, [
          data.followerId,
          data.followingId,
        ]);

        // After creating the follow, increment the follower/following counts
        await client.query(
          `
          UPDATE users
          SET follower_count = CASE WHEN id = $1 THEN follower_count + 1 ELSE follower_count END,
              following_count = CASE WHEN id = $2 THEN following_count + 1 ELSE following_count END,
              updated_at = NOW()
          WHERE id IN ($1, $2)
        `,
          [data.followingId, data.followerId],
        );

        return this.mapResultToModel(rows[0]);
      } catch (error) {
        this.logger.error("Error creating follow", error);
        throw new FollowError(
          `Failed to create follow: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Delete a follow relationship by follower and following user IDs
   */
  async unfollow(followerId: string, followingId: string): Promise<boolean> {
    return this.withTransaction(async (client) => {
      try {
        const query = `
          DELETE FROM ${this.tableName}
          WHERE follower_id = $1 AND following_id = $2
          RETURNING id
        `;

        const { rowCount } = await client.query(query, [
          followerId,
          followingId,
        ]);
        return (rowCount ?? 0) > 0;
      } catch (error) {
        this.logger.error("Error unfollowing user", error);
        throw new FollowError(
          `Failed to unfollow user: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Toggle follow status: follow if not following, unfollow if following
   */
  async toggleFollow(
    followerId: string,
    followingId: string,
  ): Promise<boolean> {
    try {
      // Check if already following
      const isFollowing = await this.isFollowing(followerId, followingId);

      if (isFollowing) {
        // Unfollow if already following
        return await this.unfollow(followerId, followingId);
      } else {
        // Follow if not already following
        await this.create({ followerId, followingId });
        return true;
      }
    } catch (error) {
      this.logger.error("Error toggling follow status", error);
      throw new FollowError(
        `Failed to toggle follow status: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get recent followers of a user
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
      this.logger.error("Error getting recent followers", error);
      throw new FollowError(
        `Failed to get recent followers: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get users that a specific user recently followed
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
      this.logger.error("Error getting recent following", error);
      throw new FollowError(
        `Failed to get recent following: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find mutual followers between two users
   */
  async getMutualFollowers(
    userId: string,
    otherUserId: string,
    limit = 20,
    offset = 0,
  ): Promise<UserData[]> {
    try {
      const query = `
        SELECT u.id, u.username, u.display_name as "displayName", u.profile_image as "profileImage"
        FROM users u
        WHERE EXISTS (
          SELECT 1 FROM ${this.tableName} WHERE follower_id = u.id AND following_id = $1
        )
        AND EXISTS (
          SELECT 1 FROM ${this.tableName} WHERE follower_id = u.id AND following_id = $2
        )
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
      this.logger.error("Error finding mutual followers", error);
      throw new FollowError(
        `Failed to find mutual followers: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Count mutual followers between two users
   */
  async countMutualFollowers(
    userId: string,
    otherUserId: string,
  ): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM users u
        WHERE EXISTS (
          SELECT 1 FROM ${this.tableName} WHERE follower_id = u.id AND following_id = $1
        )
        AND EXISTS (
          SELECT 1 FROM ${this.tableName} WHERE follower_id = u.id AND following_id = $2
        )
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        userId,
        otherUserId,
      ]);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      this.logger.error("Error counting mutual followers", error);
      throw new FollowError(
        `Failed to count mutual followers: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Count follows in a time range
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
      this.logger.error("Error counting follows in time range", error);
      throw new FollowError(
        `Failed to count follows: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find follow by user IDs
   */
  async findByUserIds(
    followerId: string,
    followingId: string,
  ): Promise<Follow | null> {
    return this.findByUserAndTarget(followerId, followingId);
  }

  /**
   * Find followers for a user
   */
  async findFollowers(
    userId: string,
    options: { limit: number; offset?: number },
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
      const result = await this.executeQuery(query, [
        userId,
        String(limit),
        String(offset),
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding followers", error);
      throw new FollowError(
        `Failed to find followers: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find following for a user
   */
  async findFollowing(
    userId: string,
    options: { limit: number; offset?: number },
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
      const result = await this.executeQuery(query, [
        userId,
        String(limit),
        String(offset),
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding following", error);
      throw new FollowError(
        `Failed to find following: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find last follow for a user
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
      const result = await this.executeQuery(query, [userId]);
      return result.rows.length > 0
        ? this.mapResultToModel(result.rows[0])
        : null;
    } catch (error) {
      this.logger.error("Error finding last follow", error);
      throw new FollowError(
        `Failed to find last follow: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find last follower for a user
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
      const result = await this.executeQuery(query, [userId]);
      return result.rows.length > 0
        ? this.mapResultToModel(result.rows[0])
        : null;
    } catch (error) {
      this.logger.error("Error finding last follower", error);
      throw new FollowError(
        `Failed to find last follower: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find mutual followers between users
   */
  async findMutualFollowers(
    userId1: string,
    userId2: string,
    options: { limit: number; offset?: number },
  ): Promise<Follow[]> {
    try {
      const { limit, offset = 0 } = options;
      const query = `
        SELECT DISTINCT f1.*, u.username, u.display_name, u.profile_image
        FROM ${this.tableName} f1
        JOIN ${this.tableName} f2 ON f1.follower_id = f2.follower_id
        JOIN users u ON f1.follower_id = u.id
        WHERE f1.following_id = $1 AND f2.following_id = $2
        ORDER BY f1.created_at DESC
        LIMIT $3 OFFSET $4
      `;
      const result = await this.executeQuery(query, [
        userId1,
        userId2,
        String(limit),
        String(offset),
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding mutual followers", error);
      throw new FollowError(
        `Failed to find mutual followers: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find follows by user IDs batch
   */
  async findFollowsByUserIds(
    followerId: string,
    targetUserIds: string[],
  ): Promise<Follow[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE follower_id = $1 AND following_id = ANY($2)
      `;
      const result = await this.executeQuery(query, [
        followerId,
        targetUserIds,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding follows by user IDs", error);
      throw new FollowError(
        `Failed to find follows by user IDs: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Batch operations
   */
  async batchCountFollowers(userIds: string[]): Promise<Map<string, number>> {
    try {
      const query = `
        SELECT following_id, COUNT(*) as count
        FROM ${this.tableName}
        WHERE following_id = ANY($1)
        GROUP BY following_id
      `;
      const result = await this.executeQuery<{
        following_id: string;
        count: string;
      }>(query, [userIds]);
      const counts = new Map<string, number>();
      result.rows.forEach((row) =>
        counts.set(row.following_id, parseInt(row.count, 10)),
      );
      return counts;
    } catch (error) {
      this.logger.error("Error batch counting followers", error);
      throw new FollowError(
        `Failed to batch count followers: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async batchCountFollowing(userIds: string[]): Promise<Map<string, number>> {
    try {
      const query = `
        SELECT follower_id, COUNT(*) as count
        FROM ${this.tableName}
        WHERE follower_id = ANY($1)
        GROUP BY follower_id
      `;
      const result = await this.executeQuery<{
        follower_id: string;
        count: string;
      }>(query, [userIds]);
      const counts = new Map<string, number>();
      result.rows.forEach((row) =>
        counts.set(row.follower_id, parseInt(row.count, 10)),
      );
      return counts;
    } catch (error) {
      this.logger.error("Error batch counting following", error);
      throw new FollowError(
        `Failed to batch count following: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async batchCountMutualFollowers(
    userIds: string[],
  ): Promise<Map<string, number>> {
    try {
      const query = `
        SELECT f1.following_id, COUNT(DISTINCT f1.follower_id) as count
        FROM ${this.tableName} f1
        JOIN ${this.tableName} f2 ON f1.follower_id = f2.follower_id
        WHERE f1.following_id = ANY($1)
        GROUP BY f1.following_id
      `;
      const result = await this.executeQuery<{
        following_id: string;
        count: string;
      }>(query, [userIds]);
      const counts = new Map<string, number>();
      result.rows.forEach((row) =>
        counts.set(row.following_id, parseInt(row.count, 10)),
      );
      return counts;
    } catch (error) {
      this.logger.error("Error batch counting mutual followers", error);
      throw new FollowError(
        `Failed to batch count mutual followers: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async batchFindLastFollows(userIds: string[]): Promise<Map<string, Follow>> {
    try {
      const query = `
        SELECT DISTINCT ON (follower_id) ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE follower_id = ANY($1)
        ORDER BY follower_id, created_at DESC
      `;
      const result = await this.executeQuery(query, [userIds]);
      const lastFollows = new Map<string, Follow>();
      result.rows.forEach((row) => {
        const follow = this.mapResultToModel(row);
        lastFollows.set(follow.followerId, follow);
      });
      return lastFollows;
    } catch (error) {
      this.logger.error("Error batch finding last follows", error);
      throw new FollowError(
        `Failed to batch find last follows: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async batchFindLastFollowers(
    userIds: string[],
  ): Promise<Map<string, Follow>> {
    try {
      const query = `
        SELECT DISTINCT ON (following_id) ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE following_id = ANY($1)
        ORDER BY following_id, created_at DESC
      `;
      const result = await this.executeQuery(query, [userIds]);
      const lastFollowers = new Map<string, Follow>();
      result.rows.forEach((row) => {
        const follow = this.mapResultToModel(row);
        lastFollowers.set(follow.followingId, follow);
      });
      return lastFollowers;
    } catch (error) {
      this.logger.error("Error batch finding last followers", error);
      throw new FollowError(
        `Failed to batch find last followers: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Helper method to map DB result to Follow model
   */
  protected mapResultToModel(row: Record<string, unknown>): Follow {
    if (!row) return null as unknown as Follow;
    return new Follow({
      id: String(row.id || ""),
      followerId: String(row.followerId || row.follower_id || ""),
      followingId: String(row.followingId || row.following_id || ""),
      createdAt: new Date(String(row.createdAt || row.created_at)),
      updatedAt: new Date(String(row.updatedAt || row.updated_at)),
    });
  }
}

// Export singleton instance
export const followRepository = FollowRepository.getInstance();
