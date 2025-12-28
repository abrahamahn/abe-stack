import { BaseModelInterface } from "@/server/database/models/BaseModel";
import {
  Post,
  PostAttributes,
  PostStatus,
  PostType,
  PostVisibility,
} from "@/server/database/models/social/Post";
import {
  PostErrors,
  PostNotFoundError,
  PostValidationError,
  PostOperationError,
  PostPermissionError,
  PostStatusError,
  PostVisibilityError,
} from "@/server/infrastructure/errors/domain/social/PostError";

import { BaseRepository } from "../BaseRepository";

export interface PostWithIndex extends Post, BaseModelInterface {
  [key: string]: unknown;
}

/**
 * Repository class for handling Post database operations
 *
 * Responsibilities:
 * 1. Handle all database operations (CRUD)
 * 2. Convert between database and model formats
 * 3. Manage database connections and transactions
 * 4. Throw domain-specific errors for error cases
 * 5. NOT implement business logic (that's the model's job)
 */
export class PostRepository extends BaseRepository<Post> {
  protected tableName = "posts";
  protected columns = [
    "id",
    "user_id as userId",
    "title",
    "content",
    "status",
    "visibility",
    "like_count as likeCount",
    "comment_count as commentCount",
    "share_count as shareCount",
    "view_count as viewCount",
    "is_edited as isEdited",
    "is_pinned as isPinned",
    "parent_id as parentId",
    "original_post_id as originalPostId",
    "scheduled_at as scheduledAt",
    "published_at as publishedAt",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super("Post");
  }

  /**
   * Create a new post
   * @throws PostValidationError if post validation fails
   * @throws PostOperationError if there's an error during the operation
   */
  async create(
    data: Omit<PostAttributes, "id" | "createdAt" | "updatedAt">
  ): Promise<Post> {
    return this.withTransaction(async (client) => {
      try {
        const post = new Post({
          ...data,
          id: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // Validate the post
        const validationErrors = post.validate();
        if (validationErrors && validationErrors.length > 0) {
          throw new PostValidationError(validationErrors);
        }

        const attrs = post.getAttributes();
        const insertData: Record<string, unknown> = {};
        Object.entries(attrs).forEach(([key, value]) => {
          insertData[this.snakeCase(key)] = value;
        });

        const columns = Object.keys(insertData);
        const values = Object.values(insertData);
        const placeholders = values.map((_, idx) => `$${idx + 1}`);

        const query = `
          INSERT INTO ${this.tableName} (${columns.join(", ")})
          VALUES (${placeholders.join(", ")})
          RETURNING ${this.columns.join(", ")}
        `;

        const result = await client.query(query, values);
        return this.mapResultToModel(result.rows[0]);
      } catch (error) {
        if (error instanceof PostValidationError) {
          throw error;
        }
        throw new PostOperationError("create", error);
      }
    });
  }

  /**
   * Find post by ID
   * @throws PostOperationError if there's an error during the operation
   */
  async findById(id: string): Promise<Post | null> {
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
      throw new PostOperationError("findById", error);
    }
  }

  /**
   * Find post by ID or throw error if not found
   * @throws PostNotFoundError if post not found
   * @throws PostOperationError if there's an error during the operation
   */
  async findByIdOrThrow(id: string): Promise<Post> {
    const post = await this.findById(id);
    if (!post) {
      throw new PostNotFoundError(id);
    }
    return post;
  }

  /**
   * Find posts by user ID
   * @throws PostOperationError if there's an error during the operation
   */
  async findByUserId(
    userId: string,
    limit = 20,
    offset = 0,
    status?: PostStatus
  ): Promise<{ posts: Post[]; count: number }> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1
      `;

      const params: unknown[] = [userId];

      if (status) {
        query += ` AND status = $${params.length + 1}`;
        params.push(status);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const countQuery = `
        SELECT COUNT(*) FROM ${this.tableName}
        WHERE user_id = $1 ${status ? "AND status = $2" : ""}
      `;

      const [result, countResult] = await Promise.all([
        this.executeQuery(query, params),
        this.executeQuery(countQuery, status ? [userId, status] : [userId]),
      ]);

      return {
        posts: result.rows.map((row) => this.mapResultToModel(row)),
        count: parseInt(String(countResult.rows[0]?.count || "0"), 10),
      };
    } catch (error) {
      throw new PostOperationError("findByUserId", error);
    }
  }

  /**
   * Update post
   * @throws PostNotFoundError if post not found
   * @throws PostValidationError if post validation fails
   * @throws PostPermissionError if user does not own the post
   * @throws PostOperationError if there's an error during the operation
   */
  async update(
    id: string,
    data: Partial<PostAttributes>,
    requestingUserId?: string
  ): Promise<Post> {
    return this.withTransaction(async (client) => {
      try {
        const existingPost = await this.findByIdOrThrow(id);

        // Check if user has permission to update this post
        if (requestingUserId && existingPost.userId !== requestingUserId) {
          throw new PostPermissionError(id, requestingUserId, "update");
        }

        // Create updated post
        const updatedPost = new Post({
          ...existingPost,
          ...data,
          updatedAt: new Date(),
          // Mark as edited if content is changing
          isEdited:
            data.content !== undefined && data.content !== existingPost.content
              ? true
              : existingPost.isEdited,
        });

        // Validate the post
        const validationErrors = updatedPost.validate();
        if (validationErrors && validationErrors.length > 0) {
          throw new PostValidationError(validationErrors);
        }

        const attrs = updatedPost.getAttributes();
        const updateData: Record<string, unknown> = {};

        // Only include fields that have changed
        Object.entries(attrs).forEach(([key, value]) => {
          if (
            key !== "id" &&
            key !== "createdAt" &&
            (data[key as keyof typeof data] !== undefined ||
              key === "updatedAt" ||
              key === "isEdited")
          ) {
            updateData[this.snakeCase(key)] = value;
          }
        });

        const setClauses = Object.keys(updateData).map(
          (key, idx) => `${key} = $${idx + 2}`
        );

        const query = `
          UPDATE ${this.tableName}
          SET ${setClauses.join(", ")}
          WHERE id = $1
          RETURNING ${this.columns.join(", ")}
        `;

        const result = await client.query(query, [
          id,
          ...Object.values(updateData),
        ]);
        if (result.rows.length === 0) {
          throw new PostNotFoundError(id);
        }

        return this.mapResultToModel(result.rows[0]);
      } catch (error) {
        // Re-throw domain errors
        if (
          error instanceof PostNotFoundError ||
          error instanceof PostValidationError ||
          error instanceof PostPermissionError
        ) {
          throw error;
        }
        throw new PostOperationError("update", error);
      }
    });
  }

  /**
   * Delete post
   * @throws PostNotFoundError if post not found
   * @throws PostPermissionError if user does not own the post
   * @throws PostOperationError if there's an error during the operation
   */
  async delete(id: string, requestingUserId?: string): Promise<boolean> {
    try {
      // Check if post exists
      const existingPost = await this.findByIdOrThrow(id);

      // Check if user has permission to delete this post
      if (requestingUserId && existingPost.userId !== requestingUserId) {
        throw new PostPermissionError(id, requestingUserId, "delete");
      }

      // Soft delete by updating status
      await this.update(id, { status: PostStatus.DELETED });
      return true;
    } catch (error) {
      // Re-throw domain errors
      if (
        error instanceof PostNotFoundError ||
        error instanceof PostPermissionError
      ) {
        throw error;
      }
      throw new PostOperationError("delete", error);
    }
  }

  /**
   * Permanently delete post from database
   * @throws PostNotFoundError if post not found
   * @throws PostPermissionError if user does not own the post
   * @throws PostOperationError if there's an error during the operation
   */
  async permanentDelete(
    id: string,
    requestingUserId?: string
  ): Promise<boolean> {
    try {
      // Check if post exists
      const existingPost = await this.findByIdOrThrow(id);

      // Check if user has permission to delete this post
      if (requestingUserId && existingPost.userId !== requestingUserId) {
        throw new PostPermissionError(id, requestingUserId, "permanentDelete");
      }

      const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
      const result = await this.executeQuery(query, [id]);

      return result.rowCount > 0;
    } catch (error) {
      // Re-throw domain errors
      if (
        error instanceof PostNotFoundError ||
        error instanceof PostPermissionError
      ) {
        throw error;
      }
      throw new PostOperationError("permanentDelete", error);
    }
  }

  /**
   * Find posts by status
   * @throws PostOperationError if there's an error during the operation
   */
  async findByStatus(
    status: PostStatus,
    limit = 20,
    offset = 0
  ): Promise<{ posts: Post[]; count: number }> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE status = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) FROM ${this.tableName}
        WHERE status = $1
      `;

      const [result, countResult] = await Promise.all([
        this.executeQuery(query, [status, limit, offset]),
        this.executeQuery(countQuery, [status]),
      ]);

      return {
        posts: result.rows.map((row) => this.mapResultToModel(row)),
        count: parseInt(String(countResult.rows[0]?.count || "0"), 10),
      };
    } catch (error) {
      throw new PostOperationError("findByStatus", error);
    }
  }

  /**
   * Find scheduled posts
   * @throws PostOperationError if there's an error during the operation
   */
  async findScheduledPosts(): Promise<Post[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE status = $1 AND scheduled_at <= NOW()
        ORDER BY scheduled_at ASC
      `;

      const result = await this.executeQuery(query, [PostStatus.SCHEDULED]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new PostOperationError("findScheduledPosts", error);
    }
  }

  /**
   * Maps database result to model instance
   */
  protected mapResultToModel(row: Record<string, unknown>): Post {
    if (!row) return null as unknown as Post;

    // Convert snake_case fields to camelCase
    return new Post({
      id: row.id as string,
      userId: row.userId as string,
      title: row.title as string,
      type: (row.type || PostType.TEXT) as PostType,
      content: row.content as string,
      status: row.status as PostStatus,
      visibility: (row.visibility || PostVisibility.PUBLIC) as PostVisibility,
      location: row.location as any,
      mediaIds: Array.isArray(row.mediaIds) ? row.mediaIds : [],
      metadata: row.metadata as Record<string, unknown>,
      likeCount:
        typeof row.likeCount === "number"
          ? row.likeCount
          : parseInt(row.likeCount as string, 10) || 0,
      commentCount:
        typeof row.commentCount === "number"
          ? row.commentCount
          : parseInt(row.commentCount as string, 10) || 0,
      shareCount:
        typeof row.shareCount === "number"
          ? row.shareCount
          : parseInt(row.shareCount as string, 10) || 0,
      viewCount:
        typeof row.viewCount === "number"
          ? row.viewCount
          : parseInt(row.viewCount as string, 10) || 0,
      isEdited: row.isEdited as boolean,
      isPinned: row.isPinned as boolean,
      parentId: row.parentId as string | null,
      originalPostId: row.originalPostId as string | null,
      scheduledAt: row.scheduledAt ? new Date(row.scheduledAt as string) : null,
      publishedAt: row.publishedAt ? new Date(row.publishedAt as string) : null,
      createdAt: new Date(row.createdAt as string),
      updatedAt: new Date(row.updatedAt as string),
    });
  }

  /**
   * Convert camelCase to snake_case
   */
  private snakeCase(str: string): string {
    return str.replace(/([A-Z])/g, "_$1").toLowerCase();
  }

  /**
   * Count posts by hashtag
   * @throws PostOperationError if there's an error during the operation
   */
  async countByHashtag(hashtagId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(DISTINCT p.id) as count
        FROM ${this.tableName} p
        JOIN post_hashtags ph ON p.id = ph.post_id
        WHERE ph.hashtag_id = $1 AND p.status = $2
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        hashtagId,
        PostStatus.PUBLISHED,
      ]);

      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      throw new PostOperationError("countByHashtag", error);
    }
  }

  /**
   * Count unique users by hashtag
   * @throws PostOperationError if there's an error during the operation
   */
  async countUniqueUsersByHashtag(hashtagId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(DISTINCT p.user_id) as count
        FROM ${this.tableName} p
        JOIN post_hashtags ph ON p.id = ph.post_id
        WHERE ph.hashtag_id = $1 AND p.status = $2
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        hashtagId,
        PostStatus.PUBLISHED,
      ]);

      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      throw new PostOperationError("countUniqueUsersByHashtag", error);
    }
  }

  /**
   * Get hashtag interactions (posts + comments)
   * @throws PostOperationError if there's an error during the operation
   */
  async getHashtagInteractions(hashtagId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM (
          SELECT p.id
          FROM ${this.tableName} p
          JOIN post_hashtags ph ON p.id = ph.post_id
          WHERE ph.hashtag_id = $1 AND p.status = $2
          UNION
          SELECT c.id
          FROM comments c
          JOIN comment_hashtags ch ON c.id = ch.comment_id
          WHERE ch.hashtag_id = $1
        ) as interactions
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        hashtagId,
        PostStatus.PUBLISHED,
      ]);

      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      throw new PostOperationError("getHashtagInteractions", error);
    }
  }

  /**
   * Increment bookmark count for a post
   * @throws PostNotFoundError if post not found
   * @throws PostOperationError if there's an error during the operation
   */
  async incrementBookmarkCount(postId: string): Promise<void> {
    try {
      // Check if post exists
      await this.findByIdOrThrow(postId);

      const query = `
        UPDATE ${this.tableName}
        SET bookmark_count = bookmark_count + 1,
            updated_at = NOW()
        WHERE id = $1
      `;

      await this.executeQuery(query, [postId]);
    } catch (error) {
      if (error instanceof PostNotFoundError) {
        throw error;
      }
      throw new PostOperationError("incrementBookmarkCount", error);
    }
  }

  /**
   * Decrement bookmark count for a post
   * @throws PostNotFoundError if post not found
   * @throws PostOperationError if there's an error during the operation
   */
  async decrementBookmarkCount(postId: string): Promise<void> {
    try {
      // Check if post exists
      await this.findByIdOrThrow(postId);

      const query = `
        UPDATE ${this.tableName}
        SET bookmark_count = GREATEST(bookmark_count - 1, 0),
            updated_at = NOW()
        WHERE id = $1
      `;

      await this.executeQuery(query, [postId]);
    } catch (error) {
      if (error instanceof PostNotFoundError) {
        throw error;
      }
      throw new PostOperationError("decrementBookmarkCount", error);
    }
  }

  /**
   * Increment comment count for a post
   * @throws PostNotFoundError if post not found
   * @throws PostOperationError if there's an error during the operation
   */
  async incrementCommentCount(postId: string): Promise<void> {
    try {
      // Check if post exists
      await this.findByIdOrThrow(postId);

      const query = `
        UPDATE ${this.tableName}
        SET comment_count = comment_count + 1,
            updated_at = NOW()
        WHERE id = $1
      `;

      await this.executeQuery(query, [postId]);
    } catch (error) {
      if (error instanceof PostNotFoundError) {
        throw error;
      }
      throw new PostOperationError("incrementCommentCount", error);
    }
  }

  /**
   * Decrement comment count for a post
   * @throws PostNotFoundError if post not found
   * @throws PostOperationError if there's an error during the operation
   */
  async decrementCommentCount(postId: string): Promise<void> {
    try {
      // Check if post exists
      await this.findByIdOrThrow(postId);

      const query = `
        UPDATE ${this.tableName}
        SET comment_count = GREATEST(comment_count - 1, 0),
            updated_at = NOW()
        WHERE id = $1
      `;

      await this.executeQuery(query, [postId]);
    } catch (error) {
      if (error instanceof PostNotFoundError) {
        throw error;
      }
      throw new PostOperationError("decrementCommentCount", error);
    }
  }

  /**
   * Update like count for a post
   * @throws PostNotFoundError if post not found
   * @throws PostOperationError if there's an error during the operation
   */
  async updateLikeCount(postId: string, change: number): Promise<void> {
    try {
      // Check if post exists
      await this.findByIdOrThrow(postId);

      const query = `
        UPDATE ${this.tableName}
        SET like_count = GREATEST(like_count + $2, 0),
            updated_at = NOW()
        WHERE id = $1
      `;

      await this.executeQuery(query, [postId, change]);
    } catch (error) {
      if (error instanceof PostNotFoundError) {
        throw error;
      }
      throw new PostOperationError("updateLikeCount", error);
    }
  }
}

// Export singleton instance
export const postRepository = new PostRepository();
