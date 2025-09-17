import { injectable, inject } from "inversify";

import { MediaTag } from "@/server/database/models/media/MediaTag";
import { IDatabaseServer } from "@/server/infrastructure/database";
import TYPES from "@/server/infrastructure/di/types";
import {
  MediaTagNotFoundError,
  MediaTagValidationError,
  MediaTagOperationError,
  MediaTagDuplicateError,
  MediaTagAssociationNotFoundError,
} from "@/server/infrastructure/errors/domain/media/MediaTagError";
import { ILoggerService } from "@/server/infrastructure/logging";

import { BaseRepository } from "../BaseRepository";

@injectable()
export class MediaTagRepository extends BaseRepository<MediaTag> {
  protected tableName = "media_tags";
  protected columns = [
    "id",
    "media_id as mediaId",
    "tag_id as tagId",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService,
    @inject(TYPES.DatabaseService) private databaseService: IDatabaseServer
  ) {
    super("MediaTag");
  }

  /**
   * Maps a database row to a MediaTag instance
   * @param row The database row
   * @returns A MediaTag instance
   */
  protected mapResultToModel(row: Record<string, unknown>): MediaTag {
    if (!row) return null as unknown as MediaTag;
    return new MediaTag({
      id: row.id as string,
      mediaId: row.mediaId as string,
      hashtagId: row.tagId as string,
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
    });
  }

  /**
   * Creates a new media tag with validation
   * @param data The tag data
   * @returns The created MediaTag
   * @throws {MediaTagValidationError} If validation fails
   * @throws {MediaTagOperationError} If operation fails
   */
  async create(data: { mediaId: string; tagId: string }): Promise<MediaTag> {
    try {
      const tag = new MediaTag({
        mediaId: data.mediaId,
        hashtagId: data.tagId,
      });

      // Validate media tag data
      const validationErrors = tag.validate();
      if (validationErrors.length > 0) {
        throw new MediaTagValidationError(validationErrors);
      }

      // Prepare data for insertion
      const columns = ["media_id", "tag_id"];
      const values = [tag.mediaId, tag.hashtagId];
      const placeholders = values.map((_, i) => `$${i + 1}`);

      const query = `
        INSERT INTO ${this.tableName} (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, values);
      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      if (error instanceof MediaTagValidationError) {
        throw error;
      }
      throw new MediaTagOperationError("create", error);
    }
  }

  /**
   * Updates an existing media tag with validation
   * @param id The tag ID
   * @param data Tag data to update
   * @returns The updated MediaTag
   * @throws {MediaTagNotFoundError} If tag not found
   * @throws {MediaTagValidationError} If validation fails
   * @throws {MediaTagOperationError} If operation fails
   */
  async update(id: string, data: Partial<MediaTag>): Promise<MediaTag> {
    try {
      // Check if tag exists
      const existing = await this.findById(id);
      if (!existing) {
        throw new MediaTagNotFoundError(id);
      }

      // Create updated tag
      const tag = new MediaTag({
        ...existing,
        ...data,
        mediaId: data.mediaId || existing.mediaId,
        hashtagId: data.hashtagId || existing.hashtagId,
      });

      // Validate tag
      const validationErrors = tag.validate();
      if (validationErrors.length > 0) {
        throw new MediaTagValidationError(validationErrors);
      }

      // Prepare update data
      const updateColumns = ["media_id", "tag_id"];
      const values = [tag.mediaId, tag.hashtagId, id];

      const query = `
        UPDATE ${this.tableName}
        SET media_id = $1, tag_id = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, values);

      if (result.rows.length === 0) {
        throw new MediaTagNotFoundError(id);
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      if (
        error instanceof MediaTagNotFoundError ||
        error instanceof MediaTagValidationError
      ) {
        throw error;
      }
      throw new MediaTagOperationError("update", error);
    }
  }

  /**
   * Find a tag by ID
   * @param id The tag ID
   * @returns The tag or null if not found
   * @throws {MediaTagOperationError} If operation fails
   */
  async findById(id: string): Promise<MediaTag | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE id = $1
      `;

      const result = await this.executeQuery(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      throw new MediaTagOperationError("findById", error);
    }
  }

  /**
   * Find a tag by ID or throw if not found
   * @param id The tag ID
   * @returns The found tag
   * @throws {MediaTagNotFoundError} If tag not found
   * @throws {MediaTagOperationError} If operation fails
   */
  async findByIdOrThrow(id: string): Promise<MediaTag> {
    const tag = await this.findById(id);
    if (!tag) {
      throw new MediaTagNotFoundError(id);
    }
    return tag;
  }

  /**
   * Find tags by partial name match
   * @param name The name to search for
   * @param limit Maximum number of tags to return
   * @param offset Number of tags to skip
   * @returns Array of matching tags
   * @throws {MediaTagOperationError} If operation fails
   */
  async findByNameLike(
    name: string,
    limit = 20,
    offset = 0
  ): Promise<MediaTag[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE name ILIKE $1
        ORDER BY usage_count DESC, name ASC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery(query, [
        `%${name}%`,
        limit,
        offset,
      ]);

      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new MediaTagOperationError("findByNameLike", error);
    }
  }

  /**
   * Find tags by category
   * @param category The category to search for
   * @param limit Maximum number of tags to return
   * @param offset Number of tags to skip
   * @returns Array of matching tags
   * @throws {MediaTagOperationError} If operation fails
   */
  async findByCategory(
    category: string,
    limit = 20,
    offset = 0
  ): Promise<MediaTag[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE category = $1
        ORDER BY usage_count DESC, name ASC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery(query, [category, limit, offset]);

      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new MediaTagOperationError("findByCategory", error);
    }
  }

  /**
   * Find trending tags (with usage count above threshold)
   * @param threshold Minimum usage count
   * @param limit Maximum number of tags to return
   * @returns Array of trending tags
   * @throws {MediaTagOperationError} If operation fails
   */
  async findTrending(threshold = 10, limit = 20): Promise<MediaTag[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE usage_count >= $1
        ORDER BY usage_count DESC, updated_at DESC
        LIMIT $2
      `;

      const result = await this.executeQuery(query, [threshold, limit]);

      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new MediaTagOperationError("findTrending", error);
    }
  }

  /**
   * Get official tags
   * @param limit Maximum number of tags to return
   * @param offset Number of tags to skip
   * @returns Array of official tags
   * @throws {MediaTagOperationError} If operation fails
   */
  async findOfficial(limit = 20, offset = 0): Promise<MediaTag[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE is_official = true
        ORDER BY name ASC
        LIMIT $1 OFFSET $2
      `;

      const result = await this.executeQuery(query, [limit, offset]);

      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new MediaTagOperationError("findOfficial", error);
    }
  }

  /**
   * Get tag statistics
   * @returns Object with tag statistics
   * @throws {MediaTagOperationError} If operation fails
   */
  async getTagStatistics(): Promise<{
    total: number;
    byCategory: Record<string, number>;
    officialCount: number;
    mostUsed: Array<{ id: string; name: string; usageCount: number }>;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          json_object_agg(category, category_count) as by_category,
          COUNT(*) FILTER (WHERE is_official = true) as official_count,
          json_agg(
            json_build_object(
              'id', id,
              'name', name,
              'usage_count', usage_count
            )
            ORDER BY usage_count DESC
            LIMIT 10
          ) as most_used
        FROM (
          SELECT 
            category,
            COUNT(*) as category_count
          FROM ${this.tableName}
          GROUP BY category
        ) stats
        CROSS JOIN ${this.tableName}
      `;

      const result = await this.executeQuery<{
        total: string;
        by_category: Record<string, number>;
        official_count: string;
        most_used: Array<{ id: string; name: string; usage_count: number }>;
      }>(query);

      const stats = result.rows[0];

      return {
        total: parseInt(stats.total, 10),
        byCategory: stats.by_category || {},
        officialCount: parseInt(stats.official_count, 10),
        mostUsed: (stats.most_used || []).map((tag) => ({
          id: tag.id,
          name: tag.name,
          usageCount: tag.usage_count,
        })),
      };
    } catch (error) {
      throw new MediaTagOperationError("getTagStatistics", error);
    }
  }

  /**
   * Get tags for a media item
   * @param mediaId Media ID
   * @returns Array of tag IDs
   * @throws {MediaTagOperationError} If operation fails
   */
  async getMediaTags(mediaId: string): Promise<string[]> {
    try {
      const query = `
        SELECT tag_id
        FROM ${this.tableName}
        WHERE media_id = $1
      `;

      const result = await this.executeQuery<{ tag_id: string }>(query, [
        mediaId,
      ]);

      return result.rows.map((row) => row.tag_id);
    } catch (error) {
      throw new MediaTagOperationError("getMediaTags", error);
    }
  }

  /**
   * Add a tag to a media item
   * @param mediaId Media ID
   * @param tagId Tag ID
   * @throws {MediaTagDuplicateError} If tag is already associated with the media
   * @throws {MediaTagOperationError} If operation fails
   */
  async addTagToMedia(mediaId: string, tagId: string): Promise<void> {
    try {
      const query = `
        INSERT INTO ${this.tableName} (media_id, tag_id)
        VALUES ($1, $2)
        ON CONFLICT (media_id, tag_id) DO NOTHING
        RETURNING id
      `;

      const result = await this.executeQuery<{ id: string }>(query, [
        mediaId,
        tagId,
      ]);

      if (result.rows.length === 0) {
        throw new MediaTagDuplicateError(tagId, mediaId);
      }
    } catch (error) {
      if (error instanceof MediaTagDuplicateError) {
        throw error;
      }
      throw new MediaTagOperationError("addTagToMedia", error);
    }
  }

  /**
   * Remove a tag from a media item
   * @param mediaId Media ID
   * @param tagId Tag ID
   * @throws {MediaTagAssociationNotFoundError} If tag is not associated with the media
   * @throws {MediaTagOperationError} If operation fails
   */
  async removeTagFromMedia(mediaId: string, tagId: string): Promise<void> {
    try {
      const query = `
        DELETE FROM ${this.tableName}
        WHERE media_id = $1 AND tag_id = $2
        RETURNING id
      `;

      const result = await this.executeQuery<{ id: string }>(query, [
        mediaId,
        tagId,
      ]);

      if (result.rowCount === 0) {
        throw new MediaTagAssociationNotFoundError(tagId, mediaId);
      }
    } catch (error) {
      if (error instanceof MediaTagAssociationNotFoundError) {
        throw error;
      }
      throw new MediaTagOperationError("removeTagFromMedia", error);
    }
  }

  /**
   * Get media items with a specific tag
   * @param tag Tag name or ID
   * @param limit Maximum number of media items to return
   * @param offset Number of media items to skip
   * @returns Array of media IDs
   * @throws {MediaTagOperationError} If operation fails
   */
  async getMediaByTag(
    tag: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<string[]> {
    try {
      // Query by tag ID or name
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          tag
        );

      const query = `
        SELECT media_id
        FROM ${this.tableName}
        WHERE ${isUUID ? "tag_id = $1" : "tag_name = $1"}
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery<{ media_id: string }>(query, [
        tag,
        limit,
        offset,
      ]);

      return result.rows.map((row) => row.media_id);
    } catch (error) {
      throw new MediaTagOperationError("getMediaByTag", error);
    }
  }

  /**
   * Count media items with a specific tag
   * @param tag Tag name or ID
   * @returns Number of media items with the tag
   * @throws {MediaTagOperationError} If operation fails
   */
  async countMediaByTag(tag: string): Promise<number> {
    try {
      // Query by tag ID or name
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          tag
        );

      const query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName}
        WHERE ${isUUID ? "tag_id = $1" : "tag_name = $1"}
      `;

      const result = await this.executeQuery<{ count: string }>(query, [tag]);

      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      throw new MediaTagOperationError("countMediaByTag", error);
    }
  }

  /**
   * Execute a SQL query
   * @param query The SQL query string
   * @param params The query parameters
   * @returns The query result
   */
  protected async executeQuery<T = any>(
    query: string,
    params: unknown[] = []
  ): Promise<{ rows: T[]; rowCount: number }> {
    try {
      const result = await this.databaseService.query<T>(query, params);
      return { rows: result.rows, rowCount: result.rowCount };
    } catch (error) {
      throw new MediaTagOperationError("executeQuery", error);
    }
  }
}

// Export a singleton instance
export const mediaTagRepository = new MediaTagRepository();
