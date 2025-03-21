import { Logger } from "../../../services/dev/logger/LoggerService";
import { Like, LikeAttributes, LikeTargetType } from "../../models/social/Like";
import { BaseRepository } from "../BaseRepository";

/**
 * Custom error classes for like operations
 */
export class LikeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LikeError";
  }
}

export class LikeNotFoundError extends LikeError {
  constructor(id: string) {
    super(`Like with ID ${id} not found`);
    this.name = "LikeNotFoundError";
  }
}

export class LikeValidationError extends LikeError {
  constructor(message: string) {
    super(`Validation error: ${message}`);
    this.name = "LikeValidationError";
  }
}

/**
 * Repository for handling Like database operations
 */
export class LikeRepository extends BaseRepository<Like> {
  private static instance: LikeRepository;
  protected logger = new Logger("LikeRepository");
  protected tableName = "likes";
  protected columns = [
    "id",
    "user_id as userId",
    "target_id as targetId",
    "target_type as targetType",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    super();
  }

  /**
   * Get the singleton instance of LikeRepository
   */
  public static getInstance(): LikeRepository {
    if (!LikeRepository.instance) {
      LikeRepository.instance = new LikeRepository();
    }
    return LikeRepository.instance;
  }

  /**
   * Find a like by user ID, target ID, and target type
   */
  async findByUserAndTarget(
    userId: string,
    targetId: string,
    targetType: LikeTargetType,
  ): Promise<Like | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1 AND target_id = $2 AND target_type = $3
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        userId,
        targetId,
        targetType,
      ]);
      if (result.rows.length === 0) return null;

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      this.logger.error("Error finding like by user and target", error);
      throw new LikeError(
        `Failed to find like: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Check if a user has liked a target
   */
  async hasLiked(
    userId: string,
    targetId: string,
    targetType: LikeTargetType,
  ): Promise<boolean> {
    try {
      const like = await this.findByUserAndTarget(userId, targetId, targetType);
      return like !== null;
    } catch (error) {
      this.logger.error("Error checking if user has liked target", error);
      throw new LikeError(
        `Failed to check if user has liked target: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get all likes for a target
   */
  async getLikesForTarget(
    targetId: string,
    targetType: LikeTargetType,
    limit = 20,
    offset = 0,
  ): Promise<Like[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE target_id = $1 AND target_type = $2
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        targetId,
        targetType,
        limit,
        offset,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error getting likes for target", error);
      throw new LikeError(
        `Failed to get likes for target: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Count likes for a target
   */
  async countLikesForTarget(
    targetId: string,
    targetType: LikeTargetType,
  ): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE target_id = $1 AND target_type = $2
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        targetId,
        targetType,
      ]);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      this.logger.error("Error counting likes for target", error);
      throw new LikeError(
        `Failed to count likes for target: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get all likes by a user
   */
  async getLikesByUser(
    userId: string,
    targetType?: LikeTargetType,
    limit = 20,
    offset = 0,
  ): Promise<Like[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1
      `;

      const params: unknown[] = [userId];

      if (targetType) {
        query += ` AND target_type = $${params.length + 1}`;
        params.push(targetType);
      }

      query +=
        " ORDER BY created_at DESC LIMIT $" +
        (params.length + 1) +
        " OFFSET $" +
        (params.length + 2);
      params.push(limit, offset);

      const result = await this.executeQuery<Record<string, unknown>>(
        query,
        params,
      );
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error getting likes by user", error);
      throw new LikeError(
        `Failed to get likes by user: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Count likes by a user
   */
  async countLikesByUser(
    userId: string,
    targetType?: LikeTargetType,
  ): Promise<number> {
    try {
      let query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE user_id = $1
      `;

      const params: unknown[] = [userId];

      if (targetType) {
        query += ` AND target_type = $${params.length + 1}`;
        params.push(targetType);
      }

      const result = await this.executeQuery<{ count: string }>(query, params);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      this.logger.error("Error counting likes by user", error);
      throw new LikeError(
        `Failed to count likes by user: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Create a like
   */
  async create(
    data: Omit<LikeAttributes, "id" | "createdAt" | "updatedAt">,
  ): Promise<Like> {
    return this.withTransaction(async () => {
      try {
        // Check if this like already exists
        const existing = await this.findByUserAndTarget(
          String(data.userId),
          String(data.targetId),
          data.targetType as LikeTargetType,
        );

        if (existing) {
          return existing;
        }

        // Create a Like instance for validation
        const like = new Like({
          userId: String(data.userId),
          targetId: String(data.targetId),
          targetType: data.targetType as LikeTargetType,
        });

        // Validate the like
        like.validate();

        const query = `
          INSERT INTO ${this.tableName} (
            id, user_id, target_id, target_type, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6
          ) RETURNING ${this.columns.join(", ")}
        `;

        const values = [
          like.id,
          like.userId,
          like.targetId,
          like.targetType,
          like.createdAt,
          like.updatedAt,
        ];

        const result = await this.executeQuery<Record<string, unknown>>(
          query,
          values,
        );
        return this.mapResultToModel(result.rows[0]);
      } catch (error) {
        this.logger.error("Error creating like", error);
        throw new LikeError(
          `Failed to create like: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Find a like by ID
   */
  async findById(id: string): Promise<Like | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE id = $1
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        id,
      ]);
      if (result.rows.length === 0) return null;

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      this.logger.error("Error finding like by ID", error);
      throw new LikeError(
        `Failed to find like by ID: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delete a like
   */
  async delete(id: string): Promise<boolean> {
    return this.withTransaction(async () => {
      try {
        // First check if the like exists
        const like = await this.findById(id);
        if (!like) {
          throw new LikeNotFoundError(id);
        }

        const query = `
          DELETE FROM ${this.tableName}
          WHERE id = $1
          RETURNING id
        `;

        const result = await this.executeQuery<Record<string, unknown>>(query, [
          id,
        ]);
        return (result.rowCount ?? 0) > 0;
      } catch (error) {
        this.logger.error("Error deleting like", error);
        throw new LikeError(
          `Failed to delete like: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Delete a like by user and target
   */
  async unlike(
    userId: string,
    targetId: string,
    targetType: LikeTargetType,
  ): Promise<boolean> {
    try {
      const like = await this.findByUserAndTarget(userId, targetId, targetType);
      if (!like) return false;

      return this.delete(like.id);
    } catch (error) {
      this.logger.error("Error unliking target", error);
      throw new LikeError(
        `Failed to unlike target: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Toggle like status
   */
  async toggleLike(
    userId: string,
    targetId: string,
    targetType: LikeTargetType,
  ): Promise<{ liked: boolean; like?: Like }> {
    return this.withTransaction(async () => {
      try {
        const existingLike = await this.findByUserAndTarget(
          userId,
          targetId,
          targetType,
        );

        if (existingLike) {
          // Unlike if already liked
          await this.delete(existingLike.id);
          return { liked: false };
        } else {
          // Like if not already liked
          const like = await this.create({ userId, targetId, targetType });
          return { liked: true, like };
        }
      } catch (error) {
        this.logger.error("Error toggling like status", error);
        throw new LikeError(
          `Failed to toggle like status: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Get recent likes across all targets
   */
  async getRecentLikes(
    limit = 20,
    offset = 0,
    targetType?: LikeTargetType,
  ): Promise<Like[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
      `;

      const params: unknown[] = [];

      if (targetType) {
        query += ` WHERE target_type = $${params.length + 1}`;
        params.push(targetType);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await this.executeQuery<Record<string, unknown>>(
        query,
        params,
      );
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error getting recent likes", error);
      throw new LikeError(
        `Failed to get recent likes: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Map a database row to a Like model
   */
  protected mapResultToModel(row: unknown): Like {
    if (!row) return null as unknown as Like;

    const data = row as Record<string, unknown>;
    return new Like({
      id: String(data.id || ""),
      userId: String(data.userId || data.user_id || ""),
      targetId: String(data.targetId || data.target_id || ""),
      targetType: (data.targetType || data.target_type) as LikeTargetType,
    });
  }
}

// Export singleton instance
export const likeRepository = LikeRepository.getInstance();
