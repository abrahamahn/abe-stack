import { Logger } from "../../../services/dev/logger/LoggerService";
import { DatabaseConnectionManager } from "../../config";
import { MediaTag, MediaTagAttributes } from "../../models/media/MediaTag";
import { BaseRepository } from "../BaseRepository";

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

export class MediaTagDuplicateError extends MediaTagError {
  constructor(slug: string) {
    super(`Tag with slug '${slug}' already exists`, "TAG_DUPLICATE");
  }
}

export class MediaTagRepository extends BaseRepository<MediaTag> {
  protected logger = new Logger("MediaTagRepository");
  protected tableName = "media_tags";
  protected columns = [
    "id",
    "name",
    "slug",
    "description",
    "category",
    "is_official as isOfficial",
    "usage_count as usageCount",
    "parent_tag_id as parentTagId",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  protected mapResultToModel(row: Record<string, unknown>): MediaTag {
    if (!row) return null as unknown as MediaTag;
    return new MediaTag(row as unknown as MediaTagAttributes);
  }

  constructor() {
    super();
  }

  /**
   * Creates a new media tag with validation
   */
  async create(
    data: Omit<MediaTagAttributes, "id" | "createdAt" | "updatedAt">,
  ): Promise<MediaTag> {
    return this.withTransaction(async (_client) => {
      try {
        const tag = new MediaTag(data);
        tag.validate();

        // Check if tag with same slug already exists
        const existingTag = await this.findBySlug(tag.slug);
        if (existingTag) {
          throw new MediaTagDuplicateError(tag.slug);
        }

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

        // If slug has changed, check for duplicates
        if (data.slug || data.name) {
          const existingWithSlug = await this.findBySlug(tag.slug);
          if (existingWithSlug && existingWithSlug.id !== id) {
            throw new MediaTagDuplicateError(tag.slug);
          }
        }

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
   * Find a tag by its slug
   */
  async findBySlug(slug: string): Promise<MediaTag | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE slug = $1
      `;

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        slug,
      ]);
      if (rows.length === 0) return null;

      return new MediaTag(rows[0]);
    } catch (error) {
      this.logger.error("Error finding tag by slug", {
        slug,
        error: error instanceof Error ? error.message : error,
      });
      throw new MediaTagError("Failed to find tag by slug", "QUERY_ERROR");
    }
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
   * Increment usage count for a tag
   */
  async incrementUsage(id: string, count = 1): Promise<MediaTag | null> {
    return this.withTransaction(async (_client) => {
      try {
        const existing = await this.findById(id);
        if (!existing) {
          throw new MediaTagNotFoundError(id);
        }

        const result = await super.update(id, {
          usageCount: existing.usageCount + count,
        });
        if (!result) {
          throw new MediaTagNotFoundError(id);
        }
        return new MediaTag(result);
      } catch (error) {
        if (error instanceof MediaTagError) {
          throw error;
        }
        this.logger.error("Error incrementing tag usage", {
          id,
          count,
          error: error instanceof Error ? error.message : error,
        });
        throw new MediaTagError(
          "Failed to increment tag usage",
          "UPDATE_ERROR",
        );
      }
    });
  }

  /**
   * Decrement usage count for a tag
   */
  async decrementUsage(id: string, count = 1): Promise<MediaTag | null> {
    return this.withTransaction(async (_client) => {
      try {
        const existing = await this.findById(id);
        if (!existing) {
          throw new MediaTagNotFoundError(id);
        }

        const result = await super.update(id, {
          usageCount: Math.max(0, existing.usageCount - count),
        });
        if (!result) {
          throw new MediaTagNotFoundError(id);
        }
        return new MediaTag(result);
      } catch (error) {
        if (error instanceof MediaTagError) {
          throw error;
        }
        this.logger.error("Error decrementing tag usage", {
          id,
          count,
          error: error instanceof Error ? error.message : error,
        });
        throw new MediaTagError(
          "Failed to decrement tag usage",
          "UPDATE_ERROR",
        );
      }
    });
  }

  /**
   * Find tags by parent tag ID
   */
  async findByParentTagId(parentTagId: string): Promise<MediaTag[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE parent_tag_id = $1
        ORDER BY name ASC
      `;

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        parentTagId,
      ]);
      return rows.map((row) => new MediaTag(row));
    } catch (error) {
      this.logger.error("Error finding tags by parent ID", {
        parentTagId,
        error: error instanceof Error ? error.message : error,
      });
      throw new MediaTagError(
        "Failed to find tags by parent ID",
        "QUERY_ERROR",
      );
    }
  }

  /**
   * Find tags related to the given tag ID (siblings and parents)
   */
  async findRelatedTags(tagId: string, limit = 10): Promise<MediaTag[]> {
    return this.withTransaction(async (_client) => {
      try {
        const tag = await this.findById(tagId);
        if (!tag) {
          throw new MediaTagNotFoundError(tagId);
        }

        // Find parent tag if this is a child tag
        let relatedTags: MediaTag[] = [];
        if (tag.parentTagId) {
          const parentTag = await this.findById(tag.parentTagId);
          if (parentTag) {
            relatedTags.push(parentTag);
          }
        }

        // Find sibling tags (tags with same parent or in same category)
        let query = "";
        const params: unknown[] = [];

        if (tag.parentTagId) {
          query = `
            SELECT ${this.columns.join(", ")}
            FROM ${this.tableName}
            WHERE parent_tag_id = $1 AND id != $2
            ORDER BY usage_count DESC
            LIMIT $3
          `;
          params.push(tag.parentTagId, tagId, limit.toString());
        } else if (tag.category) {
          query = `
            SELECT ${this.columns.join(", ")}
            FROM ${this.tableName}
            WHERE category = $1 AND id != $2
            ORDER BY usage_count DESC
            LIMIT $3
          `;
          params.push(tag.category, tagId, limit.toString());
        } else {
          // Find related by common usage patterns
          query = `
            SELECT t.*
            FROM ${this.tableName} t
            JOIN media_tag_mappings m1 ON t.id = m1.tag_id
            JOIN media_tag_mappings m2 ON m1.media_id = m2.media_id
            WHERE m2.tag_id = $1 AND t.id != $2
            GROUP BY t.id
            ORDER BY COUNT(*) DESC, t.usage_count DESC
            LIMIT $3
          `;
          params.push(tagId, tagId, limit.toString());
        }

        const { rows } = await DatabaseConnectionManager.getPool().query(
          query,
          params,
        );
        relatedTags = [...relatedTags, ...rows.map((row) => new MediaTag(row))];

        return relatedTags;
      } catch (error) {
        if (error instanceof MediaTagError) {
          throw error;
        }
        this.logger.error("Error finding related tags", {
          tagId,
          error: error instanceof Error ? error.message : error,
        });
        throw new MediaTagError("Failed to find related tags", "QUERY_ERROR");
      }
    });
  }

  /**
   * Set tag as official or unofficial
   */
  async setOfficial(id: string, isOfficial: boolean): Promise<MediaTag | null> {
    return this.withTransaction(async (_client) => {
      try {
        const existing = await this.findById(id);
        if (!existing) {
          throw new MediaTagNotFoundError(id);
        }

        const result = await super.update(id, { isOfficial });
        if (!result) {
          throw new MediaTagNotFoundError(id);
        }
        return new MediaTag(result);
      } catch (error) {
        if (error instanceof MediaTagError) {
          throw error;
        }
        this.logger.error("Error setting tag official status", {
          id,
          isOfficial,
          error: error instanceof Error ? error.message : error,
        });
        throw new MediaTagError(
          "Failed to set tag official status",
          "UPDATE_ERROR",
        );
      }
    });
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

  /**
   * Merge two tags (source into target), transferring all media associations
   */
  async mergeTags(
    sourceId: string,
    targetId: string,
  ): Promise<MediaTag | null> {
    return this.withTransaction(async (client) => {
      try {
        const sourceTag = await this.findById(sourceId);
        const targetTag = await this.findById(targetId);

        if (!sourceTag) {
          throw new MediaTagNotFoundError(sourceId);
        }
        if (!targetTag) {
          throw new MediaTagNotFoundError(targetId);
        }

        // Transfer media associations from source to target
        const transferQuery = `
          UPDATE media_tag_mappings
          SET tag_id = $1
          WHERE tag_id = $2 AND media_id NOT IN (
            SELECT media_id FROM media_tag_mappings WHERE tag_id = $1
          )
        `;
        await client.query(transferQuery, [targetId, sourceId]);

        // Add source tag usage count to target
        const updatedTarget = await this.update(targetId, {
          usageCount: targetTag.usageCount + sourceTag.usageCount,
        });

        // Delete the source tag
        const deleteQuery = `
          DELETE FROM ${this.tableName}
          WHERE id = $1
          RETURNING id
        `;
        await client.query(deleteQuery, [sourceId]);

        return updatedTarget;
      } catch (error) {
        if (error instanceof MediaTagError) {
          throw error;
        }
        this.logger.error("Error merging tags", {
          sourceId,
          targetId,
          error: error instanceof Error ? error.message : error,
        });
        throw new MediaTagError("Failed to merge tags", "UPDATE_ERROR");
      }
    });
  }
}

// Export a singleton instance
export const mediaTagRepository = new MediaTagRepository();
