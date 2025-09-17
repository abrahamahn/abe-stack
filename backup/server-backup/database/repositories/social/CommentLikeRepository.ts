import { CommentLike } from "@/server/database/models/social/CommentLike";

import { BaseRepository } from "../BaseRepository";

// Custom error class for comment like operations
export class CommentLikeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommentLikeError";
  }
}

export class CommentLikeNotFoundError extends CommentLikeError {
  constructor(id: string) {
    super(`Comment like with ID ${id} not found`);
    this.name = "CommentLikeNotFoundError";
  }
}

export class CommentLikeValidationError extends CommentLikeError {
  constructor(message: string) {
    super(`Validation error: ${message}`);
    this.name = "CommentLikeValidationError";
  }
}

export class CommentLikeRepository extends BaseRepository<CommentLike> {
  protected tableName = "comment_likes";
  protected columns = [
    "id",
    "user_id as userId",
    "comment_id as commentId",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super("CommentLike");
  }

  /**
   * Find a like by user ID and comment ID
   */
  async findByUserAndComment(
    userId: string,
    commentId: string
  ): Promise<CommentLike | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1 AND comment_id = $2
      `;

      const result = await this.executeQuery(query, [userId, commentId]);
      if (result.rows.length === 0) return null;

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      throw new CommentLikeError(
        `Failed to find comment like: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Create a new comment like
   */
  async create(
    data: Omit<CommentLike, "id" | "createdAt" | "updatedAt"> & {
      userId: string;
      commentId: string;
    }
  ): Promise<CommentLike> {
    return this.withTransaction(async (client) => {
      try {
        // Create a new CommentLike instance for validation
        const commentLike = new CommentLike({
          ...data,
          id: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Validate comment like
        const validationErrors = commentLike.validate();
        if (validationErrors.length > 0) {
          throw new CommentLikeValidationError(validationErrors.join(", "));
        }

        const query = `
          INSERT INTO ${this.tableName} (user_id, comment_id)
          VALUES ($1, $2)
          RETURNING ${this.columns.join(", ")}
        `;

        const { rows } = await client.query(query, [
          data.userId,
          data.commentId,
        ]);

        // After creating the like, increment the comment's like count
        await client.query(
          `
          UPDATE comments
          SET like_count = like_count + 1, updated_at = NOW()
          WHERE id = $1
        `,
          [data.commentId]
        );

        return this.mapResultToModel(rows[0]);
      } catch (error) {
        throw new CommentLikeError(
          `Failed to create comment like: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  /**
   * Delete a comment like by user and comment
   */
  async unlike(userId: string, commentId: string): Promise<boolean> {
    try {
      const like = await this.findByUserAndComment(userId, commentId);
      if (!like) return false;

      return this.delete(like.id);
    } catch (error) {
      throw new CommentLikeError(
        `Failed to unlike comment: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get all likes for a comment
   */
  async findByCommentId(commentId: string): Promise<CommentLike[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE comment_id = $1
      `;

      const result = await this.executeQuery(query, [commentId]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new CommentLikeError(
        `Failed to find likes by comment ID: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get all likes by a user
   */
  async findByUserId(userId: string): Promise<CommentLike[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1
      `;

      const result = await this.executeQuery(query, [userId]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new CommentLikeError(
        `Failed to find likes by user ID: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Check if a user has liked a comment
   */
  async hasLiked(userId: string, commentId: string): Promise<boolean> {
    try {
      const like = await this.findByUserAndComment(userId, commentId);
      return like !== null;
    } catch (error) {
      throw new CommentLikeError(
        `Failed to check if user has liked comment: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get all likes for a comment with pagination
   */
  async getLikesForComment(
    commentId: string,
    limit = 20,
    offset = 0
  ): Promise<CommentLike[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE comment_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery(query, [commentId, limit, offset]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new CommentLikeError(
        `Failed to get likes for comment: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Count likes for a comment
   */
  async countLikesForComment(commentId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE comment_id = $1
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        commentId,
      ]);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      throw new CommentLikeError(
        `Failed to count likes for comment: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get all comment likes by a user with pagination
   */
  async getLikesByUser(
    userId: string,
    limit = 20,
    offset = 0
  ): Promise<CommentLike[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery(query, [userId, limit, offset]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new CommentLikeError(
        `Failed to get likes by user: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Count comment likes by a user
   */
  async countLikesByUser(userId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE user_id = $1
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        userId,
      ]);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      throw new CommentLikeError(
        `Failed to count likes by user: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Delete a comment like and decrement the like count
   */
  async delete(id: string): Promise<boolean> {
    return this.withTransaction(async (client) => {
      try {
        const like = await this.findById(id);
        if (!like) return false;

        const query = `
          DELETE FROM ${this.tableName}
          WHERE id = $1
          RETURNING id
        `;

        const { rowCount } = await client.query(query, [id]);

        if ((rowCount ?? 0) > 0) {
          // Update comment like count
          const decrementQuery = `
            UPDATE comments
            SET like_count = GREATEST(0, like_count - 1), updated_at = NOW()
            WHERE id = $1
          `;

          await client.query(decrementQuery, [like.commentId]);
        }

        return (rowCount ?? 0) > 0;
      } catch (error) {
        throw new CommentLikeError(
          `Failed to delete comment like: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  /**
   * Toggle like status for a comment
   */
  async toggleLike(
    userId: string,
    commentId: string
  ): Promise<{ liked: boolean; like?: CommentLike }> {
    try {
      const existingLike = await this.findByUserAndComment(userId, commentId);

      if (existingLike) {
        // Unlike if already liked
        await this.delete(existingLike.id);
        return { liked: false };
      } else {
        // Like if not already liked
        const like = await this.create({ userId, commentId });
        return { liked: true, like };
      }
    } catch (error) {
      throw new CommentLikeError(
        `Failed to toggle like status: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Find a comment like by ID
   */
  async findById(id: string): Promise<CommentLike | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE id = $1
      `;

      const result = await this.executeQuery(query, [id]);
      if (result.rows.length === 0) return null;

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      throw new CommentLikeError(
        `Failed to find comment like by ID: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Helper method to map DB result to CommentLike model
   */
  protected mapResultToModel(row: Record<string, unknown>): CommentLike {
    if (!row) return null as unknown as CommentLike;
    return new CommentLike({
      id: String(row.id || ""),
      userId: String(row.userId || row.user_id || ""),
      commentId: String(row.commentId || row.comment_id || ""),
      createdAt: new Date(String(row.createdAt || row.created_at)),
      updatedAt: new Date(String(row.updatedAt || row.updated_at)),
    });
  }
}

// Export singleton instance
export const commentLikeRepository = new CommentLikeRepository();
