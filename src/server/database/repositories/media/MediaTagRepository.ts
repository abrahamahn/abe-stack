import { DatabaseConnectionManager } from "@database/config";
import { MediaTag, MediaTagAttributes } from "@models/media/MediaTag";
import { BaseRepository } from "@repositories/BaseRepository";
import { Logger } from "@services/dev/logger/LoggerService";

export class MediaTagError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "MediaTagError";
  }
}

export class MediaTagNotFoundError extends MediaTagError {
  constructor(id: string) {
    super(`Tag with ID ${id} not found`, "TAG_NOT_FOUND");
  }
}

export class MediaTagValidationError extends MediaTagError {
  constructor(message: string) {
    super(message, "TAG_VALIDATION_ERROR");
  }
}

export class MediaTagRepository extends BaseRepository<MediaTag> {
  private static instance: MediaTagRepository;
  protected tableName = "media_tags";
  protected columns = [
    "id",
    "media_id as mediaId",
    "hashtag_id as hashtagId",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];
  protected logger = new Logger("MediaTagRepository");

  private constructor() {
    super();
  }

  public static getInstance(): MediaTagRepository {
    if (!MediaTagRepository.instance) {
      MediaTagRepository.instance = new MediaTagRepository();
    }
    return MediaTagRepository.instance;
  }

  protected mapResultToModel(row: Record<string, unknown>): MediaTag {
    if (!row) return null as unknown as MediaTag;
    return new MediaTag({
      id: row.id as string,
      mediaId: row.mediaId as string,
      hashtagId: row.hashtagId as string,
      createdAt: row.createdAt as Date,
      updatedAt: row.updatedAt as Date,
    });
  }

  /**
   * Creates a new media tag with validation
   */
  async create(data: {
    mediaId: string;
    hashtagId: string;
  }): Promise<MediaTag> {
    return this.withTransaction(async (_client) => {
      try {
        const tag = new MediaTag(data);
        tag.validate();

        const result = await super.create(tag);
        return new MediaTag(result);
      } catch (error) {
        if (error instanceof MediaTagError) {
          throw error;
        }
        this.logger.error("Error creating media tag", {
          data,
          error: error instanceof Error ? error.message : error,
        });
        throw new MediaTagError("Failed to create tag", "CREATE_ERROR");
      }
    });
  }

  /**
   * Updates an existing media tag with validation
   */
  async update(
    id: string,
    data: Partial<MediaTagAttributes>,
  ): Promise<MediaTag | null> {
    return this.withTransaction(async (_client) => {
      try {
        const existing = await this.findById(id);
        if (!existing) {
          throw new MediaTagNotFoundError(id);
        }

        // Create updated tag
        const tag = new MediaTag({ ...existing, ...data });
        tag.validate();

        const result = await super.update(id, tag);
        if (!result) {
          throw new MediaTagNotFoundError(id);
        }
        return new MediaTag(result);
      } catch (error) {
        if (error instanceof MediaTagError) {
          throw error;
        }
        this.logger.error("Error updating media tag", {
          id,
          data,
          error: error instanceof Error ? error.message : error,
        });
        throw new MediaTagError("Failed to update tag", "UPDATE_ERROR");
      }
    });
  }

  /**
   * Find tags by partial name match
   */
  async findByNameLike(
    name: string,
    limit = 20,
    offset = 0,
  ): Promise<MediaTag[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE name ILIKE $1
        ORDER BY usage_count DESC, name ASC
        LIMIT $2 OFFSET $3
      `;

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        `%${name}%`,
        limit.toString(),
        offset.toString(),
      ]);
      return rows.map((row) => new MediaTag(row));
    } catch (error) {
      this.logger.error("Error finding tags by name", {
        name,
        error: error instanceof Error ? error.message : error,
      });
      throw new MediaTagError("Failed to find tags by name", "QUERY_ERROR");
    }
  }

  /**
   * Find tags by category
   */
  async findByCategory(
    category: string,
    limit = 20,
    offset = 0,
  ): Promise<MediaTag[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE category = $1
        ORDER BY usage_count DESC, name ASC
        LIMIT $2 OFFSET $3
      `;

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        category,
        limit.toString(),
        offset.toString(),
      ]);
      return rows.map((row) => new MediaTag(row));
    } catch (error) {
      this.logger.error("Error finding tags by category", {
        category,
        error: error instanceof Error ? error.message : error,
      });
      throw new MediaTagError("Failed to find tags by category", "QUERY_ERROR");
    }
  }

  /**
   * Find trending tags (with usage count above threshold)
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

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        threshold.toString(),
        limit.toString(),
      ]);
      return rows.map((row) => new MediaTag(row));
    } catch (error) {
      this.logger.error("Error finding trending tags", {
        threshold,
        error: error instanceof Error ? error.message : error,
      });
      throw new MediaTagError("Failed to find trending tags", "QUERY_ERROR");
    }
  }

  /**
   * Get official tags
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

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        limit.toString(),
        offset.toString(),
      ]);
      return rows.map((row) => new MediaTag(row));
    } catch (error) {
      this.logger.error("Error finding official tags", {
        error: error instanceof Error ? error.message : error,
      });
      throw new MediaTagError("Failed to find official tags", "QUERY_ERROR");
    }
  }

  /**
   * Get tag statistics
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

      const { rows } = await DatabaseConnectionManager.getPool().query(query);
      const stats = rows[0] as {
        total: string;
        by_category: Record<string, number>;
        official_count: string;
        most_used: Array<{ id: string; name: string; usage_count: number }>;
      };

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
      this.logger.error("Error getting tag statistics", {
        error: error instanceof Error ? error.message : error,
      });
      throw new MediaTagError("Failed to get tag statistics", "QUERY_ERROR");
    }
  }

  async getMediaTags(mediaId: string): Promise<string[]> {
    try {
      const query = `
        SELECT h.tag
        FROM ${this.tableName} mt
        JOIN hashtags h ON mt.hashtag_id = h.id
        WHERE mt.media_id = $1
      `;

      const result = await this.executeQuery<{ tag: string }>(query, [mediaId]);
      return result.rows.map((row) => row.tag);
    } catch (error) {
      this.logger.error("Error getting media tags", error);
      throw new Error(
        `Failed to get media tags: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async addTagToMedia(mediaId: string, hashtagId: string): Promise<void> {
    try {
      const query = `
        INSERT INTO ${this.tableName} (media_id, hashtag_id)
        VALUES ($1, $2)
        ON CONFLICT (media_id, hashtag_id) DO NOTHING
      `;

      await this.executeQuery(query, [mediaId, hashtagId]);
    } catch (error) {
      this.logger.error("Error adding tag to media", error);
      throw new Error(
        `Failed to add tag to media: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async removeTagFromMedia(mediaId: string, hashtagId: string): Promise<void> {
    try {
      const query = `
        DELETE FROM ${this.tableName}
        WHERE media_id = $1 AND hashtag_id = $2
      `;

      await this.executeQuery(query, [mediaId, hashtagId]);
    } catch (error) {
      this.logger.error("Error removing tag from media", error);
      throw new Error(
        `Failed to remove tag from media: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getMediaByTag(
    tag: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<string[]> {
    try {
      const query = `
        SELECT mt.media_id
        FROM ${this.tableName} mt
        JOIN hashtags h ON mt.hashtag_id = h.id
        WHERE h.normalized_tag = LOWER($1)
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery<{ media_id: string }>(query, [
        tag,
        limit,
        offset,
      ]);
      return result.rows.map((row) => row.media_id);
    } catch (error) {
      this.logger.error("Error getting media by tag", error);
      throw new Error(
        `Failed to get media by tag: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async countMediaByTag(tag: string): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count
        FROM ${this.tableName} mt
        JOIN hashtags h ON mt.hashtag_id = h.id
        WHERE h.normalized_tag = LOWER($1)
      `;

      const result = await this.executeQuery<{ count: string }>(query, [tag]);
      return parseInt(result.rows[0].count, 10);
    } catch (error) {
      this.logger.error("Error counting media by tag", error);
      throw new Error(
        `Failed to count media by tag: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

// Export a singleton instance
export const mediaTagRepository = MediaTagRepository.getInstance();
