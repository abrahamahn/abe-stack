import { Logger } from "../../../services/dev/logger/LoggerService";
import { BaseModelInterface } from "../../models/BaseModel";
import {
  Post,
  PostAttributes,
  PostStatus,
  PostType,
  PostVisibility,
} from "../../models/social/Post";
import { BaseRepository } from "../BaseRepository";

export interface PostWithIndex extends Post, BaseModelInterface {
  [key: string]: unknown;
}

/**
 * Error class for post-related errors
 */
export class PostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PostError";
  }
}

/**
 * Error class for post not found errors
 */
export class PostNotFoundError extends PostError {
  constructor(id: string) {
    super(`Post with ID ${id} not found`);
    this.name = "PostNotFoundError";
  }
}

/**
 * Error class for post validation errors
 */
export class PostValidationError extends PostError {
  constructor(message: string) {
    super(`Validation error: ${message}`);
    this.name = "PostValidationError";
  }
}

/**
 * Repository class for handling Post database operations
 *
 * Responsibilities:
 * 1. Handle all database operations (CRUD)
 * 2. Convert between database and model formats
 * 3. Manage database connections and transactions
 * 4. NOT implement business logic (that's the model's job)
 */
export class PostRepository extends BaseRepository<PostWithIndex> {
  private static instance: PostRepository;
  protected logger = new Logger("PostRepository");
  protected tableName = "posts";
  protected columns = [
    "id",
    "user_id",
    "content",
    "type",
    "status",
    "visibility",
    "location",
    "media_ids",
    "metadata",
    "like_count",
    "comment_count",
    "share_count",
    "view_count",
    "is_edited",
    "is_pinned",
    "parent_id",
    "original_post_id",
    "scheduled_at",
    "published_at",
    "created_at",
    "updated_at",
  ];

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    super();
  }

  /**
   * Get the singleton instance of PostRepository
   */
  public static getInstance(): PostRepository {
    if (!PostRepository.instance) {
      PostRepository.instance = new PostRepository();
    }
    return PostRepository.instance;
  }

  /**
   * Create a new post
   */
  async create(
    data: Omit<PostAttributes, "id" | "createdAt" | "updatedAt">,
  ): Promise<Post> {
    return this.withTransaction(async (client) => {
      try {
        const post = new Post({
          ...data,
          id: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        try {
          post.validate();
        } catch (error) {
          throw new PostValidationError(
            error instanceof Error ? error.message : String(error),
          );
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
        this.logger.error("Error creating post", error);
        throw new PostError(
          `Failed to create post: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Find post by ID
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
      this.logger.error("Error finding post by ID", error);
      throw new PostError(
        `Failed to find post: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find posts by user ID
   */
  async findByUserId(
    userId: string,
    limit = 20,
    offset = 0,
    status?: PostStatus,
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
      this.logger.error("Error finding posts by user ID", error);
      throw new PostError(
        `Failed to find posts: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Update post
   */
  async update(id: string, data: Partial<PostAttributes>): Promise<Post> {
    return this.withTransaction(async (client) => {
      try {
        const existingPost = await this.findById(id);
        if (!existingPost) {
          throw new PostNotFoundError(id);
        }

        const updatedPost = new Post({
          ...existingPost.getAttributes(),
          ...data,
          updatedAt: new Date(),
        });

        try {
          updatedPost.validate();
        } catch (error) {
          throw new PostValidationError(
            error instanceof Error ? error.message : String(error),
          );
        }

        const attrs = updatedPost.getAttributes();
        const updateData: Record<string, unknown> = {};
        Object.entries(attrs).forEach(([key, value]) => {
          if (key !== "id" && key !== "createdAt") {
            updateData[this.snakeCase(key)] = value;
          }
        });

        const setClause = Object.keys(updateData)
          .map((key, idx) => `${key} = $${idx + 2}`)
          .join(", ");

        const query = `
					UPDATE ${this.tableName}
					SET ${setClause}
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
        this.logger.error("Error updating post", error);
        throw new PostError(
          `Failed to update post: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Delete post
   */
  async delete(id: string): Promise<boolean> {
    try {
      const query = `
				DELETE FROM ${this.tableName}
				WHERE id = $1
				RETURNING id
			`;

      const result = await this.executeQuery(query, [id]);
      return result.rowCount > 0;
    } catch (error) {
      this.logger.error("Error deleting post", error);
      throw new PostError(
        `Failed to delete post: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find posts by status
   */
  async findByStatus(
    status: PostStatus,
    limit = 20,
    offset = 0,
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
      this.logger.error("Error finding posts by status", error);
      throw new PostError(
        `Failed to find posts: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find scheduled posts that are ready to be published
   */
  async findScheduledPosts(): Promise<Post[]> {
    try {
      const query = `
				SELECT ${this.columns.join(", ")}
				FROM ${this.tableName}
				WHERE status = $1
				AND scheduled_at <= NOW()
				ORDER BY scheduled_at ASC
			`;

      const result = await this.executeQuery(query, [PostStatus.DRAFT]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding scheduled posts", error);
      throw new PostError(
        `Failed to find scheduled posts: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Map database result to Post model
   */
  protected mapResultToModel(row: Record<string, unknown>): Post {
    if (!row) return null as unknown as Post;

    let metadata: Record<string, unknown> = {};
    if (row.metadata) {
      try {
        metadata =
          typeof row.metadata === "string"
            ? (JSON.parse(row.metadata) as Record<string, unknown>)
            : (row.metadata as Record<string, unknown>);
      } catch (error) {
        this.logger.warn("Error parsing post metadata", {
          error: error instanceof Error ? error.message : error,
          metadata: row.metadata,
        });
      }
    }

    return new Post({
      id: String(row.id || ""),
      userId: String(row.user_id || ""),
      content: String(row.content || ""),
      type: String(row.type || "") as PostType,
      status: String(row.status || "") as PostStatus,
      visibility: String(row.visibility || "") as PostVisibility,
      location: row.location
        ? {
            name: String((row.location as Record<string, unknown>).name || ""),
            latitude: Number(
              (row.location as Record<string, unknown>).latitude || 0,
            ),
            longitude: Number(
              (row.location as Record<string, unknown>).longitude || 0,
            ),
          }
        : null,
      mediaIds: Array.isArray(row.media_ids) ? row.media_ids : [],
      metadata,
      likeCount: Number(row.like_count || 0),
      commentCount: Number(row.comment_count || 0),
      shareCount: Number(row.share_count || 0),
      viewCount: Number(row.view_count || 0),
      isEdited: Boolean(row.is_edited),
      isPinned: Boolean(row.is_pinned),
      parentId: row.parent_id ? String(row.parent_id) : null,
      originalPostId: row.original_post_id
        ? String(row.original_post_id)
        : null,
      scheduledAt: row.scheduled_at ? new Date(String(row.scheduled_at)) : null,
      publishedAt: row.published_at ? new Date(String(row.published_at)) : null,
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
    });
  }

  /**
   * Convert camelCase to snake_case
   */
  private snakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  /**
   * Count posts by hashtag ID
   */
  async countByHashtag(hashtagId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(DISTINCT p.id)
        FROM ${this.tableName} p
        JOIN post_hashtags ph ON p.id = ph.post_id
        WHERE ph.hashtag_id = $1
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        hashtagId,
      ]);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      this.logger.error("Error counting posts by hashtag", error);
      throw new PostError(
        `Failed to count posts by hashtag: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Count unique users who used a hashtag
   */
  async countUniqueUsersByHashtag(hashtagId: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(DISTINCT p.user_id)
        FROM ${this.tableName} p
        JOIN post_hashtags ph ON p.id = ph.post_id
        WHERE ph.hashtag_id = $1
      `;

      const result = await this.executeQuery<{ count: string }>(query, [
        hashtagId,
      ]);
      return parseInt(result.rows[0]?.count || "0", 10);
    } catch (error) {
      this.logger.error("Error counting unique users by hashtag", error);
      throw new PostError(
        `Failed to count unique users by hashtag: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get total interactions for posts with a specific hashtag
   */
  async getHashtagInteractions(hashtagId: string): Promise<number> {
    try {
      const query = `
        SELECT SUM(p.like_count + p.comment_count + p.share_count) as interactions
        FROM ${this.tableName} p
        JOIN post_hashtags ph ON p.id = ph.post_id
        WHERE ph.hashtag_id = $1
      `;

      const result = await this.executeQuery<{ interactions: string }>(query, [
        hashtagId,
      ]);
      return parseInt(result.rows[0]?.interactions || "0", 10);
    } catch (error) {
      this.logger.error("Error getting hashtag interactions", error);
      throw new PostError(
        `Failed to get hashtag interactions: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Increment bookmark count for a post
   */
  async incrementBookmarkCount(postId: string): Promise<void> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET bookmark_count = bookmark_count + 1,
            updated_at = NOW()
        WHERE id = $1
      `;
      await this.executeQuery(query, [postId]);
    } catch (error) {
      this.logger.error("Error incrementing bookmark count", error);
      throw new PostError(
        `Failed to increment bookmark count: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Decrement bookmark count for a post
   */
  async decrementBookmarkCount(postId: string): Promise<void> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET bookmark_count = GREATEST(bookmark_count - 1, 0),
            updated_at = NOW()
        WHERE id = $1
      `;
      await this.executeQuery(query, [postId]);
    } catch (error) {
      this.logger.error("Error decrementing bookmark count", error);
      throw new PostError(
        `Failed to decrement bookmark count: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Increment comment count for a post
   */
  async incrementCommentCount(postId: string): Promise<void> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET comment_count = comment_count + 1,
            updated_at = NOW()
        WHERE id = $1
      `;
      await this.executeQuery(query, [postId]);
    } catch (error) {
      this.logger.error("Error incrementing comment count", error);
      throw new PostError(
        `Failed to increment comment count: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Decrement comment count for a post
   */
  async decrementCommentCount(postId: string): Promise<void> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET comment_count = GREATEST(comment_count - 1, 0),
            updated_at = NOW()
        WHERE id = $1
      `;
      await this.executeQuery(query, [postId]);
    } catch (error) {
      this.logger.error("Error decrementing comment count", error);
      throw new PostError(
        `Failed to decrement comment count: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Update like count for a post
   */
  async updateLikeCount(postId: string, change: number): Promise<void> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET like_count = GREATEST(like_count + $2, 0),
            updated_at = NOW()
        WHERE id = $1
      `;
      await this.executeQuery(query, [postId, change]);
    } catch (error) {
      this.logger.error("Error updating like count", error);
      throw new PostError(
        `Failed to update like count: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

// Export singleton instance
export const postRepository = PostRepository.getInstance();
