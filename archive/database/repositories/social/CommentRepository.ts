import { BaseModelInterface } from "@/server/database/models/BaseModel";
import { ContentStatus } from "@/server/database/models/shared/EntityTypes";
import {
  Comment,
  CommentAttributes,
  CommentTargetType,
} from "@/server/database/models/social/Comment";
import {
  CommentErrors,
  CommentNotFoundError,
  CommentOperationError,
  CommentContentPolicyViolationError,
} from "@/server/infrastructure/errors/domain/social/CommentError";

import { BaseRepository } from "../BaseRepository";

export interface CommentWithIndex extends Comment, BaseModelInterface {
  [key: string]: unknown;
}

export class CommentRepository extends BaseRepository<Comment> {
  protected tableName = "comments";
  protected columns = [
    "id",
    "user_id as userId",
    "target_id as targetId",
    "target_type as targetType",
    "parent_id as parentId",
    "content",
    "status",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super("Comment");
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
    sortOrder = "DESC"
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

      const result = await this.executeQuery<Record<string, unknown>>(
        query,
        params
      );
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new CommentOperationError("findByTarget", error);
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
    sortOrder = "DESC"
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

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        commentId,
        limit,
        offset,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new CommentOperationError("findReplies", error);
    }
  }

  /**
   * Count comments for a target
   */
  async countByTarget(
    targetId: string,
    targetType: CommentTargetType,
    parentId: string | null = null
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
      throw new CommentOperationError("countByTarget", error);
    }
  }

  /**
   * Find comments by user
   */
  async findByUserId(
    userId: string,
    options: { limit: number; offset?: number }
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

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        userId,
        limit,
        offset,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new CommentOperationError("findByUserId", error);
    }
  }

  /**
   * Count comments by user
   */
  async countByUser(
    userId: string,
    targetType?: CommentTargetType
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
      throw new CommentOperationError("countByUser", error);
    }
  }

  /**
   * Create a new comment
   */
  async create(
    data: Omit<
      CommentAttributes,
      "id" | "likeCount" | "replyCount" | "createdAt" | "updatedAt"
    >
  ): Promise<Comment> {
    return this.withTransaction(async () => {
      try {
        // Create a Comment instance for validation
        const comment = new Comment({
          userId: data.userId,
          targetId: data.targetId,
          targetType: data.targetType,
          parentId: data.parentId,
          content: data.content,
          status: data.status || ContentStatus.ACTIVE,
        });

        // Check content length
        const MAX_CONTENT_LENGTH = 5000;
        if (data.content.length > MAX_CONTENT_LENGTH) {
          throw new CommentContentPolicyViolationError(
            data.content,
            `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`
          );
        }

        // Validate the comment
        const validationErrors = comment.validate();
        if (validationErrors && validationErrors.length > 0) {
          throw new CommentErrors.Validation(validationErrors);
        }

        const query = `
          INSERT INTO ${this.tableName} (
            id, user_id, target_id, target_type, parent_id, content, status, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9
          ) RETURNING ${this.columns.join(", ")}
        `;

        const values = [
          comment.id,
          comment.userId,
          comment.targetId,
          comment.targetType,
          comment.parentId,
          comment.content,
          comment.status,
          comment.createdAt,
          comment.updatedAt,
        ];

        const result = await this.executeQuery<Record<string, unknown>>(
          query,
          values
        );

        // If this is a reply, increment the parent's reply count
        if (comment.parentId) {
          await this.incrementReplyCount(comment.parentId);
        }

        return this.mapResultToModel(result.rows[0]);
      } catch (error) {
        // Re-throw domain errors
        if (
          error instanceof CommentErrors.Validation ||
          error instanceof CommentContentPolicyViolationError
        ) {
          throw error;
        }

        throw new CommentOperationError("create", error);
      }
    });
  }

  /**
   * Update a comment
   */
  async update(
    id: string,
    data: Partial<CommentAttributes>
  ): Promise<Comment | null> {
    return this.withTransaction(async () => {
      try {
        // Find the comment first
        const existingComment = await this.findById(id);
        if (!existingComment) {
          throw new CommentNotFoundError(id);
        }

        // Check content length if updating content
        const MAX_CONTENT_LENGTH = 5000;
        if (data.content && data.content.length > MAX_CONTENT_LENGTH) {
          throw new CommentContentPolicyViolationError(
            data.content,
            `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`
          );
        }

        // Only update allowed fields
        const allowedFields = ["content", "status"];
        const updateData: Record<string, unknown> = {};

        allowedFields.forEach((field) => {
          if (field in data) {
            updateData[this.snakeCase(field)] =
              data[field as keyof typeof data];
          }
        });

        // Add updated_at
        updateData.updated_at = new Date();

        if (Object.keys(updateData).length === 0) {
          return existingComment; // Nothing to update
        }

        // Build the update query
        const setClauses = Object.keys(updateData).map(
          (key, index) => `${key} = $${index + 2}`
        );

        const query = `
          UPDATE ${this.tableName}
          SET ${setClauses.join(", ")}
          WHERE id = $1
          RETURNING ${this.columns.join(", ")}
        `;

        const values = [id, ...Object.values(updateData)];
        const result = await this.executeQuery<Record<string, unknown>>(
          query,
          values
        );

        if (result.rows.length === 0) {
          return null;
        }

        return this.mapResultToModel(result.rows[0]);
      } catch (error) {
        // Re-throw domain errors
        if (
          error instanceof CommentNotFoundError ||
          error instanceof CommentContentPolicyViolationError
        ) {
          throw error;
        }

        throw new CommentOperationError("update", error);
      }
    });
  }

  /**
   * Delete a comment
   */
  async delete(id: string, userId?: string): Promise<boolean> {
    return this.withTransaction(async () => {
      try {
        // Check if comment exists
        const comment = await this.findById(id);
        if (!comment) {
          throw new CommentNotFoundError(id);
        }

        // If userId is provided, check ownership
        if (userId && comment.userId !== userId) {
          throw new CommentContentPolicyViolationError(
            "",
            `User ${userId} does not have permission to delete comment ${id}`
          );
        }

        // Get the parent ID before deleting (if it's a reply)
        const parentId = comment.parentId;

        const query = `
          DELETE FROM ${this.tableName}
          WHERE id = $1
          RETURNING id
        `;

        const result = await this.executeQuery<Record<string, unknown>>(query, [
          id,
        ]);

        // If this was a reply, decrement the parent's reply count
        if (parentId && result.rowCount && result.rowCount > 0) {
          await this.decrementReplyCount(parentId);
        }

        return (result.rowCount ?? 0) > 0;
      } catch (error) {
        // Re-throw domain errors
        if (
          error instanceof CommentNotFoundError ||
          error instanceof CommentContentPolicyViolationError
        ) {
          throw error;
        }

        throw new CommentOperationError("delete", error);
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

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        id,
      ]);
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      throw new CommentOperationError("incrementLikeCount", error);
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

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        id,
      ]);
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      throw new CommentOperationError("decrementLikeCount", error);
    }
  }

  /**
   * Increment reply count for a comment
   */
  async incrementReplyCount(commentId: string): Promise<void> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET reply_count = reply_count + 1, updated_at = NOW()
        WHERE id = $1
      `;

      await this.executeQuery<Record<string, unknown>>(query, [commentId]);
    } catch (error) {
      throw new CommentOperationError("incrementReplyCount", error);
    }
  }

  /**
   * Decrement reply count for a comment
   */
  async decrementReplyCount(commentId: string): Promise<void> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET reply_count = GREATEST(reply_count - 1, 0), updated_at = NOW()
        WHERE id = $1
      `;

      await this.executeQuery<Record<string, unknown>>(query, [commentId]);
    } catch (error) {
      throw new CommentOperationError("decrementReplyCount", error);
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

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        id,
      ]);
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      throw new CommentOperationError("findById", error);
    }
  }

  /**
   * Find a comment by ID or throw an error if not found
   */
  async findByIdOrThrow(id: string): Promise<Comment> {
    const comment = await this.findById(id);
    if (!comment) {
      throw new CommentNotFoundError(id);
    }
    return comment;
  }

  /**
   * Map database row to Comment model
   */
  protected mapResultToModel(row: Record<string, unknown>): Comment {
    return new Comment({
      id: String(row.id),
      userId: String(row.userId),
      targetId: String(row.targetId),
      targetType: row.targetType as CommentTargetType,
      parentId: row.parentId ? String(row.parentId) : null,
      content: String(row.content || ""),
      status: (row.status || ContentStatus.ACTIVE) as ContentStatus,
      likeCount:
        typeof row.likeCount === "number"
          ? row.likeCount
          : Number(row.like_count || 0),
      replyCount:
        typeof row.replyCount === "number"
          ? row.replyCount
          : Number(row.reply_count || 0),
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

  /**
   * Convert camelCase to snake_case
   */
  private snakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Find comments by post ID
   */
  async findByPostId(options: {
    postId: string;
    parentId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Comment[]> {
    try {
      const { postId, parentId = null, limit = 20, offset = 0 } = options;

      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE target_id = $1 AND target_type = 'post'
      `;

      const params: unknown[] = [postId];

      if (parentId === null) {
        query += " AND parent_id IS NULL";
      } else {
        query += ` AND parent_id = $${params.length + 1}`;
        params.push(parentId);
      }

      query += " ORDER BY created_at DESC";
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await this.executeQuery<Record<string, unknown>>(
        query,
        params
      );
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new CommentOperationError("findByPostId", error);
    }
  }

  /**
   * Count replies for a parent comment
   */
  async countRepliesByParentId(parentId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE parent_id = $1
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        parentId,
      ]);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      throw new CommentOperationError("countRepliesByParentId", error);
    }
  }
}

// Export singleton instance
export const commentRepository = new CommentRepository();
