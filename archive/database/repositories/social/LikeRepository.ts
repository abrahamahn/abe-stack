import { Like, LikeTargetType } from "@/server/database/models/social/Like";
import {
  LikeErrors,
  LikeNotFoundError,
  LikeOperationError,
} from "@/server/infrastructure/errors/domain/social/LikeError";

import { BaseRepository } from "../BaseRepository";

/**
 * Interface for like attributes
 */
export interface LikeAttributes {
  id?: string;
  userId: string;
  targetId: string;
  targetType: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Repository for handling Like database operations
 */
export class LikeRepository extends BaseRepository<Like> {
  protected tableName = "likes";
  protected columns = [
    "id",
    "user_id as userId",
    "target_id as targetId",
    "target_type as targetType",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super("Like");
  }

  /**
   * Find a like by user ID, target ID, and target type
   */
  async findByUserAndTarget(
    userId: string,
    targetId: string,
    targetType: LikeTargetType
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
      throw new LikeOperationError("findByUserAndTarget", error);
    }
  }

  /**
   * Check if a user has liked a target
   */
  async hasLiked(
    userId: string,
    targetId: string,
    targetType: LikeTargetType
  ): Promise<boolean> {
    try {
      const like = await this.findByUserAndTarget(userId, targetId, targetType);
      return like !== null;
    } catch (error) {
      throw new LikeOperationError("hasLiked", error);
    }
  }

  /**
   * Get all likes for a target
   */
  async getLikesForTarget(
    targetId: string,
    targetType: LikeTargetType,
    limit = 20,
    offset = 0
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
      throw new LikeOperationError("getLikesForTarget", error);
    }
  }

  /**
   * Count likes for a target
   */
  async countLikesForTarget(
    targetId: string,
    targetType: LikeTargetType
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
      throw new LikeOperationError("countLikesForTarget", error);
    }
  }

  /**
   * Get all likes by a user
   */
  async getLikesByUser(
    userId: string,
    targetType?: LikeTargetType,
    limit = 20,
    offset = 0
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
        params
      );
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new LikeOperationError("getLikesByUser", error);
    }
  }

  /**
   * Count likes by a user
   */
  async countLikesByUser(
    userId: string,
    targetType?: LikeTargetType
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
      throw new LikeOperationError("countLikesByUser", error);
    }
  }

  /**
   * Create a like
   */
  async create(
    data: Omit<LikeAttributes, "id" | "createdAt" | "updatedAt">
  ): Promise<Like> {
    return this.withTransaction(async () => {
      try {
        // Check if this like already exists
        const existing = await this.findByUserAndTarget(
          String(data.userId),
          String(data.targetId),
          data.targetType as LikeTargetType
        );

        if (existing) {
          throw new LikeErrors.AlreadyExists(
            String(data.userId),
            String(data.targetId),
            data.targetType
          );
        }

        // Create a Like instance for validation
        const like = new Like({
          userId: String(data.userId),
          targetId: String(data.targetId),
          targetType: data.targetType as LikeTargetType,
        });

        // Validate the like
        const validationErrors = like.validate();

        if (validationErrors.length > 0) {
          throw new LikeErrors.Validation(validationErrors);
        }

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
          values
        );
        return this.mapResultToModel(result.rows[0]);
      } catch (error) {
        // Re-throw if it's already one of our domain errors
        if (
          error instanceof LikeNotFoundError ||
          error instanceof LikeErrors.AlreadyExists ||
          error instanceof LikeErrors.Validation
        ) {
          throw error;
        }

        throw new LikeOperationError("create", error);
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
      throw new LikeOperationError("findById", error);
    }
  }

  /**
   * Find like by ID or throw error if not found
   */
  async findByIdOrThrow(id: string): Promise<Like> {
    const like = await this.findById(id);
    if (!like) {
      throw new LikeNotFoundError(id);
    }
    return like;
  }

  /**
   * Delete a like
   */
  async delete(id: string): Promise<boolean> {
    return this.withTransaction(async () => {
      try {
        // First check if the like exists
        await this.findByIdOrThrow(id);

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
        // Re-throw if it's already a domain error
        if (error instanceof LikeNotFoundError) {
          throw error;
        }

        throw new LikeOperationError("delete", error);
      }
    });
  }

  /**
   * Delete a like by user and target
   */
  async unlike(
    userId: string,
    targetId: string,
    targetType: LikeTargetType
  ): Promise<boolean> {
    try {
      const like = await this.findByUserAndTarget(userId, targetId, targetType);
      if (!like) return false;

      return this.delete(like.id);
    } catch (error) {
      throw new LikeOperationError("unlike", error);
    }
  }

  /**
   * Toggle like status
   */
  async toggleLike(
    userId: string,
    targetId: string,
    targetType: LikeTargetType
  ): Promise<{ liked: boolean; like?: Like }> {
    return this.withTransaction(async () => {
      try {
        const existingLike = await this.findByUserAndTarget(
          userId,
          targetId,
          targetType
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
        // Re-throw domain errors
        if (
          error instanceof LikeErrors.AlreadyExists ||
          error instanceof LikeErrors.Validation ||
          error instanceof LikeNotFoundError
        ) {
          throw error;
        }

        throw new LikeOperationError("toggleLike", error);
      }
    });
  }

  /**
   * Get recent likes across all targets
   */
  async getRecentLikes(
    limit = 20,
    offset = 0,
    targetType?: LikeTargetType
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

      query +=
        " ORDER BY created_at DESC LIMIT $" +
        (params.length + 1) +
        " OFFSET $" +
        (params.length + 2);
      params.push(limit, offset);

      const result = await this.executeQuery<Record<string, unknown>>(
        query,
        params
      );
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new LikeOperationError("getRecentLikes", error);
    }
  }

  /**
   * Map database row to Like model
   */
  protected mapResultToModel(row: Record<string, unknown>): Like {
    return new Like({
      id: String(row.id),
      userId: String(row.userId),
      targetId: String(row.targetId),
      targetType: row.targetType as LikeTargetType,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt
          : new Date(String(row.createdAt)),
      updatedAt:
        row.updatedAt instanceof Date
          ? row.updatedAt
          : new Date(String(row.updatedAt)),
    });
  }
}

// Export singleton instance
export const likeRepository = new LikeRepository();
