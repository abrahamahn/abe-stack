import { Logger } from "../../../services/dev/logger/LoggerService";
import { BaseModelInterface } from "../../models/BaseModel";
import { ContentStatus } from "../../models/shared/EntityTypes";
import {
  Comment,
  CommentAttributes,
  CommentTargetType,
} from "../../models/social/Comment";
import { BaseRepository } from "../BaseRepository";

export interface CommentWithIndex extends Comment, BaseModelInterface {
  [key: string]: unknown;
}

// Custom error class for comment operations
export class CommentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommentError";
  }
}

export class CommentNotFoundError extends CommentError {
  constructor(id: string) {
    super(`Comment with ID ${id} not found`);
    this.name = "CommentNotFoundError";
  }
}

export class CommentValidationError extends CommentError {
  constructor(message: string) {
    super(`Validation error: ${message}`);
    this.name = "CommentValidationError";
  }
}

export class CommentRepository extends BaseRepository<CommentWithIndex> {
  private static instance: CommentRepository;
  protected logger = new Logger("CommentRepository");
  protected tableName = "comments";
  protected columns = [
    "id",
    "user_id as userId",
    "target_id as targetId",
    "target_type as targetType",
    "parent_id as parentId",
    "content",
    "status",
    "like_count as likeCount",
    "reply_count as replyCount",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  private constructor() {
    super();
  }

  public static getInstance(): CommentRepository {
    if (!CommentRepository.instance) {
      CommentRepository.instance = new CommentRepository();
    }
    return CommentRepository.instance;
  }

  /**
   * Find comments for a specific target
   */
  async findByTarget(
    targetId: string,
    targetType: CommentTargetType,
    parentId: string | null = null,
    limit = 20,
    offset = 0,
    sortBy = "createdAt",
    sortOrder = "DESC",
  ): Promise<Comment[]> {
    try {
      // Validate and sanitize sort column to prevent SQL injection
      const validSortColumns = ["createdAt", "updatedAt", "likeCount"];
      const sortColumn = validSortColumns.includes(sortBy)
        ? this.snakeCase(sortBy)
        : "created_at";

      // Validate sort order
      const order = sortOrder === "ASC" ? "ASC" : "DESC";

      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE target_id = $1 AND target_type = $2
      `;

      const params = [targetId, targetType];

      if (parentId === null) {
        query += " AND parent_id IS NULL";
      } else {
        query += ` AND parent_id = $${params.length + 1}`;
        params.push(parentId);
      }

      query += ` ORDER BY ${sortColumn} ${order}`;
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(String(limit), String(offset));

      const result = await this.executeQuery(query, params);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding comments by target", error);
      throw new CommentError(
        `Failed to find comments by target: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find replies to a comment
   */
  async findReplies(
    commentId: string,
    limit = 20,
    offset = 0,
    sortBy = "createdAt",
    sortOrder = "DESC",
  ): Promise<Comment[]> {
    try {
      // Validate and sanitize sort column to prevent SQL injection
      const validSortColumns = ["createdAt", "updatedAt", "likeCount"];
      const sortColumn = validSortColumns.includes(sortBy)
        ? this.snakeCase(sortBy)
        : "created_at";

      // Validate sort order
      const order = sortOrder === "ASC" ? "ASC" : "DESC";

      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE parent_id = $1
        ORDER BY ${sortColumn} ${order}
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery(query, [commentId, limit, offset]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding replies", error);
      throw new CommentError(
        `Failed to find replies: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Count comments for a target
   */
  async countByTarget(
    targetId: string,
    targetType: CommentTargetType,
    parentId: string | null = null,
  ): Promise<number> {
    try {
      let query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE target_id = $1 AND target_type = $2
      `;

      const params = [targetId, targetType];

      if (parentId === null) {
        query += " AND parent_id IS NULL";
      } else {
        query += ` AND parent_id = $${params.length + 1}`;
        params.push(parentId);
      }

      const result = await this.executeQuery<{ count: string }>(query, params);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      this.logger.error("Error counting comments by target", error);
      throw new CommentError(
        `Failed to count comments by target: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find comments by user
   */
  async findByUserId(
    userId: string,
    options: { limit: number; offset?: number },
  ): Promise<Comment[]> {
    try {
      const { limit, offset = 0 } = options;
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
      this.logger.error("Error finding comments by user ID", error);
      throw new Error(
        `Failed to find comments by user ID: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Count comments by user
   */
  async countByUser(
    userId: string,
    targetType?: CommentTargetType,
  ): Promise<number> {
    try {
      let query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE user_id = $1
      `;

      const params = [userId];

      if (targetType) {
        query += ` AND target_type = $${params.length + 1}`;
        params.push(targetType);
      }

      const result = await this.executeQuery<{ count: string }>(query, params);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      this.logger.error("Error counting comments by user", error);
      throw new CommentError(
        `Failed to count comments by user: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Create a comment with validation
   */
  async create(
    data: Omit<
      CommentAttributes,
      "id" | "likeCount" | "replyCount" | "createdAt" | "updatedAt"
    >,
  ): Promise<Comment> {
    return this.withTransaction(async (client) => {
      try {
        // Create a new Comment instance for validation
        const comment = new Comment({
          ...data,
          id: "",
          likesCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Validate comment
        const validationErrors = comment.validate();
        if (validationErrors.length > 0) {
          throw new CommentValidationError(validationErrors.join(", "));
        }

        // Set default values
        const commentData = {
          ...data,
          likeCount: 0,
          replyCount: 0,
        };

        // Convert camelCase to snake_case for database columns
        const insertData: Record<string, unknown> = {};
        Object.entries(commentData).forEach(([key, value]) => {
          insertData[this.snakeCase(key)] = value;
        });

        const insertColumns = Object.keys(insertData);
        const placeholders = insertColumns.map((_, idx) => `$${idx + 1}`);
        const values = Object.values(insertData);

        const query = `
          INSERT INTO ${this.tableName} (${insertColumns.join(", ")}, created_at, updated_at)
          VALUES (${placeholders.join(", ")}, NOW(), NOW())
          RETURNING ${this.columns.join(", ")}
        `;

        const { rows } = await client.query(query, values);

        // If this is a reply, increment reply count on parent
        if (data.parentId) {
          await this.incrementReplyCount(data.parentId);
        }

        return this.mapResultToModel(rows[0]);
      } catch (error) {
        this.logger.error("Error creating comment", error);
        throw new CommentError(
          `Failed to create comment: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Update a comment
   */
  async update(
    id: string,
    data: Partial<CommentAttributes>,
  ): Promise<Comment | null> {
    return this.withTransaction(async (client) => {
      try {
        // First check if comment exists
        const existingComment = await this.findById(id);
        if (!existingComment) {
          throw new CommentNotFoundError(id);
        }

        // Create a merged comment for validation
        const updatedComment = new Comment({
          ...existingComment,
          ...data,
        });

        // Validate the updated comment
        const validationErrors = updatedComment.validate();
        if (validationErrors.length > 0) {
          throw new CommentValidationError(validationErrors.join(", "));
        }

        // Only update provided fields
        const updateData: Record<string, unknown> = {};
        Object.entries(data).forEach(([key, value]) => {
          updateData[this.snakeCase(key)] = value;
        });

        // Nothing to update
        if (Object.keys(updateData).length === 0) {
          return updatedComment;
        }

        // Set updated_at
        updateData.updated_at = new Date();

        const updateColumns = Object.keys(updateData);
        const setClause = updateColumns
          .map((col, idx) => `${col} = $${idx + 2}`)
          .join(", ");
        const values = [id, ...Object.values(updateData)];

        const query = `
          UPDATE ${this.tableName}
          SET ${setClause}
          WHERE id = $1
          RETURNING ${this.columns.join(", ")}
        `;

        const { rows } = await client.query(query, values);

        if (rows.length === 0) {
          return null;
        }

        return this.mapResultToModel(rows[0]);
      } catch (error) {
        this.logger.error("Error updating comment", error);
        throw new CommentError(
          `Failed to update comment: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Delete a comment
   */
  async delete(id: string): Promise<boolean> {
    return this.withTransaction(async (client) => {
      try {
        // First find the comment to check if it exists and get parentId
        const comment = await this.findById(id);
        if (!comment) {
          return false;
        }

        // Delete the comment
        const query = `
          DELETE FROM ${this.tableName}
          WHERE id = $1
          RETURNING id
        `;

        const { rowCount } = await client.query(query, [id]);

        // If this was a reply, decrement reply count on parent
        if (comment.parentId) {
          await this.decrementReplyCount(comment.parentId);
        }

        return (rowCount ?? 0) > 0;
      } catch (error) {
        this.logger.error("Error deleting comment", error);
        throw new CommentError(
          `Failed to delete comment: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Increment like count for a comment
   */
  async incrementLikeCount(id: string): Promise<Comment | null> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET like_count = like_count + 1, updated_at = NOW()
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, [id]);

      if (result.rowCount === 0) {
        return null;
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      this.logger.error("Error incrementing like count", error);
      throw new CommentError(
        `Failed to increment like count: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Decrement like count for a comment
   */
  async decrementLikeCount(id: string): Promise<Comment | null> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET like_count = GREATEST(like_count - 1, 0), updated_at = NOW()
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, [id]);

      if (result.rowCount === 0) {
        return null;
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      this.logger.error("Error decrementing like count", error);
      throw new CommentError(
        `Failed to decrement like count: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Increment reply count for a comment
   */
  async incrementReplyCount(commentId: string): Promise<void> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET reply_count = reply_count + 1
        WHERE id = $1
      `;
      await this.executeQuery(query, [commentId]);
    } catch (error) {
      this.logger.error("Error incrementing reply count", error);
      throw new Error(
        `Failed to increment reply count: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Decrement reply count for a comment
   */
  async decrementReplyCount(commentId: string): Promise<void> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET reply_count = GREATEST(reply_count - 1, 0)
        WHERE id = $1
      `;
      await this.executeQuery(query, [commentId]);
    } catch (error) {
      this.logger.error("Error decrementing reply count", error);
      throw new Error(
        `Failed to decrement reply count: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find a comment by ID
   */
  async findById(id: string): Promise<Comment | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE id = $1
      `;

      const result = await this.executeQuery(query, [id]);

      if (result.rowCount === 0) {
        return null;
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      this.logger.error("Error finding comment by ID", error);
      throw new CommentError(
        `Failed to find comment by ID: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Helper method to map DB result to Comment model
   */
  protected mapResultToModel(row: Record<string, unknown>): Comment {
    if (!row) return null as unknown as Comment;

    const rawStatus = String(row.status || "");
    const status = Object.values(ContentStatus).includes(
      rawStatus as ContentStatus,
    )
      ? (rawStatus as ContentStatus)
      : ContentStatus.DRAFT;

    return new Comment({
      id: String(row.id || ""),
      userId: String(row.userId || row.user_id || ""),
      postId: String(row.targetId || row.target_id || ""),
      parentId:
        row.parentId || row.parent_id
          ? String(row.parentId || row.parent_id)
          : null,
      content: String(row.content || ""),
      status,
      likesCount: Number(row.likeCount || row.like_count || 0),
      createdAt: new Date(String(row.createdAt || row.created_at)),
      updatedAt: new Date(String(row.updatedAt || row.updated_at)),
    });
  }

  /**
   * Convert camelCase string to snake_case
   */
  private snakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Find comments by post ID with optional parent ID filter
   */
  async findByPostId(options: {
    postId: string;
    parentId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Comment[]> {
    try {
      const { postId, parentId, limit = 20, offset = 0 } = options;
      const params = [postId];
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE post_id = $1
      `;

      if (parentId !== undefined) {
        query += ` AND parent_id ${parentId === null ? "IS NULL" : "= $2"}`;
        if (parentId !== null) {
          params.push(parentId);
        }
      }

      query += `
        ORDER BY created_at ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      params.push(String(limit), String(offset));

      const result = await this.executeQuery(query, params);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding comments by post ID", error);
      throw new Error(
        `Failed to find comments by post ID: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Count replies for a parent comment
   */
  async countRepliesByParentId(parentId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*)
        FROM ${this.tableName}
        WHERE parent_id = $1
      `;

      const result = await this.executeQuery(query, [parentId]);
      return parseInt(result.rows[0].count as string, 10);
    } catch (error) {
      this.logger.error("Error counting replies", error);
      throw new Error(
        `Failed to count replies: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

// Export singleton instance
export const commentRepository = CommentRepository.getInstance();
