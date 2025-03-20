import { Hashtag, HashtagCategory } from "@database/models/social/Hashtag";
import { BaseRepository } from "@database/repositories/BaseRepository";
import { HashtagStats } from "@services/app/social/hashtag/HashtagService";
import { Logger } from "@services/dev/logger/LoggerService";

/**
 * Custom error classes for hashtag operations
 */
export class HashtagError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HashtagError";
  }
}

export class HashtagNotFoundError extends HashtagError {
  constructor(identifier: string) {
    super(`Hashtag with identifier ${identifier} not found`);
    this.name = "HashtagNotFoundError";
  }
}

export class HashtagValidationError extends HashtagError {
  constructor(message: string) {
    super(`Validation error: ${message}`);
    this.name = "HashtagValidationError";
  }
}

/**
 * Repository for managing hashtag data
 */
export class HashtagRepository extends BaseRepository<Hashtag> {
  private static instance: HashtagRepository;
  protected tableName = "hashtags";
  protected columns = [
    "id",
    "tag",
    "normalized_tag as normalizedTag",
    "usage_count as usageCount",
    "category",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];
  protected logger = new Logger("HashtagRepository");

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    super();
  }

  /**
   * Get the singleton instance of HashtagRepository
   */
  public static getInstance(): HashtagRepository {
    if (!HashtagRepository.instance) {
      HashtagRepository.instance = new HashtagRepository();
    }
    return HashtagRepository.instance;
  }

  /**
   * Find a hashtag by its tag text
   */
  async findByTag(tag: string): Promise<Hashtag | null> {
    try {
      // Normalize the tag for consistent lookup
      const normalizedTag = this.normalizeTag(tag);

      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE normalized_tag = $1
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        normalizedTag,
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      this.logger.error("Error finding hashtag by tag", error);
      throw new HashtagError(
        `Failed to find hashtag by tag: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find or create a hashtag by its tag text
   */
  async findOrCreate(tag: string): Promise<Hashtag> {
    return this.withTransaction(async () => {
      try {
        const existingTag = await this.findByTag(tag);

        if (existingTag) {
          return existingTag;
        }

        // Create a new hashtag if it doesn't exist
        const normalizedTag = this.normalizeTag(tag);

        const cleanTag = tag.startsWith("#") ? tag.substring(1) : tag;

        const newHashtag = new Hashtag({
          tag: cleanTag,
          normalizedTag,
          usageCount: 1,
          category: HashtagCategory.GENERAL,
        });

        // Validate the hashtag
        newHashtag.validate();

        return await this.create(newHashtag);
      } catch (error) {
        this.logger.error("Error finding or creating hashtag", error);
        throw new HashtagError(
          `Failed to find or create hashtag: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Find trending hashtags
   */
  async findTrending(
    limit: number = 10,
    offset: number = 0,
  ): Promise<Hashtag[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        ORDER BY usage_count DESC
        LIMIT $1 OFFSET $2
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        limit,
        offset,
      ]);

      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding trending hashtags", error);
      throw new HashtagError(
        `Failed to find trending hashtags: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Find hashtags by category
   */
  async findByCategory(
    category: HashtagCategory,
    limit: number = 10,
    offset: number = 0,
  ): Promise<Hashtag[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE category = $1
        ORDER BY usage_count DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        category,
        limit,
        offset,
      ]);

      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding hashtags by category", error);
      throw new HashtagError(
        `Failed to find hashtags by category: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Search hashtags by partial tag text
   */
  async searchByText(
    text: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<Hashtag[]> {
    try {
      const searchText = `%${text.toLowerCase()}%`;

      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE normalized_tag LIKE $1
        ORDER BY usage_count DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        searchText,
        limit,
        offset,
      ]);

      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error searching hashtags by text", error);
      throw new HashtagError(
        `Failed to search hashtags by text: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Increment usage count for a hashtag
   */
  async incrementUsage(
    hashtagId: string,
    count: number = 1,
  ): Promise<Hashtag | null> {
    return this.withTransaction(async () => {
      try {
        // First check if the hashtag exists
        const hashtag = await this.findById(hashtagId);
        if (!hashtag) {
          throw new HashtagNotFoundError(hashtagId);
        }

        const query = `
          UPDATE ${this.tableName}
          SET usage_count = usage_count + $1,
              updated_at = NOW()
          WHERE id = $2
          RETURNING ${this.columns.join(", ")}
        `;

        const result = await this.executeQuery<Record<string, unknown>>(query, [
          count,
          hashtagId,
        ]);

        if (!result.rows.length) {
          return null;
        }

        return this.mapResultToModel(result.rows[0]);
      } catch (error) {
        this.logger.error("Error incrementing hashtag usage", error);
        throw new HashtagError(
          `Failed to increment hashtag usage: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Update hashtag category
   */
  async updateCategory(
    hashtagId: string,
    category: HashtagCategory,
  ): Promise<Hashtag | null> {
    return this.withTransaction(async () => {
      try {
        // First check if the hashtag exists
        const hashtag = await this.findById(hashtagId);
        if (!hashtag) {
          throw new HashtagNotFoundError(hashtagId);
        }

        const query = `
          UPDATE ${this.tableName}
          SET category = $1,
              updated_at = NOW()
          WHERE id = $2
          RETURNING ${this.columns.join(", ")}
        `;

        const result = await this.executeQuery<Record<string, unknown>>(query, [
          category,
          hashtagId,
        ]);

        if (!result.rows.length) {
          return null;
        }

        return this.mapResultToModel(result.rows[0]);
      } catch (error) {
        this.logger.error("Error updating hashtag category", error);
        throw new HashtagError(
          `Failed to update hashtag category: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Create a new hashtag
   */
  async create(hashtag: Hashtag): Promise<Hashtag> {
    return this.withTransaction(async () => {
      try {
        // Validate the hashtag
        hashtag.validate();

        const query = `
          INSERT INTO ${this.tableName} (
            id, tag, normalized_tag, usage_count, category, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7
          ) RETURNING ${this.columns.join(", ")}
        `;

        const values = [
          hashtag.id,
          hashtag.tag,
          hashtag.normalizedTag,
          hashtag.usageCount,
          hashtag.category,
          hashtag.createdAt,
          hashtag.updatedAt,
        ];

        const result = await this.executeQuery<Record<string, unknown>>(
          query,
          values,
        );

        return this.mapResultToModel(result.rows[0]);
      } catch (error) {
        this.logger.error("Error creating hashtag", error);
        throw new HashtagError(
          `Failed to create hashtag: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Find a hashtag by ID
   */
  async findById(id: string): Promise<Hashtag | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE id = $1
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        id,
      ]);

      if (!result.rows.length) {
        return null;
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      this.logger.error("Error finding hashtag by ID", error);
      throw new HashtagError(
        `Failed to find hashtag by ID: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Delete a hashtag
   */
  async delete(id: string): Promise<boolean> {
    return this.withTransaction(async () => {
      try {
        // First check if the hashtag exists
        const hashtag = await this.findById(id);
        if (!hashtag) {
          throw new HashtagNotFoundError(id);
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
        this.logger.error("Error deleting hashtag", error);
        throw new HashtagError(
          `Failed to delete hashtag: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    });
  }

  /**
   * Maps database rows to Hashtag instances safely
   */
  protected mapResultRows<R>(
    rows: unknown[],
    mapper: (row: Record<string, unknown>) => R,
  ): R[] {
    if (!rows || !Array.isArray(rows)) return [];
    return rows.map((row) => mapper(row as Record<string, unknown>));
  }

  /**
   * Gets a single result and maps it to a model safely
   */
  protected getSafeResult<R>(
    rows: unknown[],
    mapper: (row: Record<string, unknown>) => R,
  ): R | null {
    if (!rows || !Array.isArray(rows) || rows.length === 0) return null;
    return mapper(rows[0] as Record<string, unknown>);
  }

  /**
   * Maps a database row to a Hashtag model instance
   */
  protected mapResultToModel(row: Record<string, unknown>): Hashtag {
    if (!row) return null as unknown as Hashtag;

    return new Hashtag({
      id: String(row.id),
      tag: String(row.tag),
      normalizedTag: String(row.normalized_tag || row.normalizedTag || ""),
      category: String(row.category || "general") as HashtagCategory,
      usageCount: Number(row.usage_count || row.usageCount || 0),
      createdAt: new Date(String(row.created_at || row.createdAt)),
      updatedAt: new Date(String(row.updated_at || row.updatedAt)),
    });
  }

  /**
   * Helper method to normalize a tag for consistent lookups
   */
  private normalizeTag(tag: string): string {
    // Remove any # prefix if present
    const cleanTag = tag.startsWith("#") ? tag.substring(1) : tag;

    // Lowercase and trim any whitespace
    return cleanTag.toLowerCase().trim();
  }

  /**
   * Find related hashtags based on co-occurrence in posts
   */
  async findRelated(hashtagId: string, limit: number = 10): Promise<Hashtag[]> {
    try {
      const query = `
        SELECT h.*, COUNT(*) as correlation
        FROM ${this.tableName} h
        JOIN post_hashtags ph1 ON h.id = ph1.hashtag_id
        JOIN post_hashtags ph2 ON ph1.post_id = ph2.post_id
        WHERE ph2.hashtag_id = $1 AND h.id != $1
        GROUP BY h.id
        ORDER BY correlation DESC
        LIMIT $2
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        hashtagId,
        limit,
      ]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      this.logger.error("Error finding related hashtags", error);
      throw new HashtagError(
        `Failed to find related hashtags: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get statistics for multiple hashtags in one query
   */
  async getBatchStats(tags: string[]): Promise<Map<string, HashtagStats>> {
    try {
      const query = `
        SELECT h.*, 
          COUNT(DISTINCT ph.post_id) as posts_count,
          COUNT(DISTINCT p.user_id) as unique_users,
          MAX(ph.created_at) as last_used_at
        FROM ${this.tableName} h
        LEFT JOIN post_hashtags ph ON h.id = ph.hashtag_id
        LEFT JOIN posts p ON ph.post_id = p.id
        WHERE h.normalized_tag = ANY($1)
        GROUP BY h.id
      `;

      const result = await this.executeQuery<Record<string, unknown>>(query, [
        tags,
      ]);
      const statsMap = new Map<string, HashtagStats>();

      result.rows.forEach((row) => {
        statsMap.set(String(row.tag), {
          usageCount: Number(row.usage_count || 0),
          postsCount: Number(row.posts_count || 0),
          uniqueUsers: Number(row.unique_users || 0),
          category: String(row.category) as HashtagCategory,
          avgEngagement: 0, // Placeholder for avgEngagement
          lastUsedAt: row.last_used_at
            ? new Date(String(row.last_used_at))
            : new Date(),
        });
      });

      return statsMap;
    } catch (error) {
      this.logger.error("Error getting batch hashtag stats", error);
      throw new HashtagError(
        `Failed to get batch hashtag stats: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get hourly usage statistics for a hashtag
   */
  async getHourlyUsage(hashtagId: string): Promise<Map<number, number>> {
    try {
      const query = `
        SELECT EXTRACT(HOUR FROM ph.created_at) as hour, COUNT(*) as count
        FROM post_hashtags ph
        WHERE ph.hashtag_id = $1
        AND ph.created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY hour
        ORDER BY hour
      `;

      const result = await this.executeQuery<{ hour: string; count: string }>(
        query,
        [hashtagId],
      );
      const hourlyMap = new Map<number, number>();
      result.rows.forEach((row) => {
        hourlyMap.set(parseInt(row.hour), parseInt(row.count));
      });
      return hourlyMap;
    } catch (error) {
      this.logger.error("Error getting hourly usage", error);
      throw new HashtagError(
        `Failed to get hourly usage: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get daily usage statistics for a hashtag
   */
  async getDailyUsage(hashtagId: string): Promise<Map<string, number>> {
    try {
      const query = `
        SELECT DATE(ph.created_at) as date, COUNT(*) as count
        FROM post_hashtags ph
        WHERE ph.hashtag_id = $1
        AND ph.created_at >= NOW() - INTERVAL '30 days'
        GROUP BY date
        ORDER BY date
      `;

      const result = await this.executeQuery<{ date: string; count: string }>(
        query,
        [hashtagId],
      );
      const dailyMap = new Map<string, number>();
      result.rows.forEach((row) => {
        dailyMap.set(row.date, parseInt(row.count));
      });
      return dailyMap;
    } catch (error) {
      this.logger.error("Error getting daily usage", error);
      throw new HashtagError(
        `Failed to get daily usage: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get top users for a hashtag
   */
  async getTopUsers(
    hashtagId: string,
    limit: number = 10,
  ): Promise<Array<{ userId: string; count: number }>> {
    try {
      const query = `
        SELECT p.user_id, COUNT(*) as count
        FROM post_hashtags ph
        JOIN posts p ON ph.post_id = p.id
        WHERE ph.hashtag_id = $1
        GROUP BY p.user_id
        ORDER BY count DESC
        LIMIT $2
      `;

      const result = await this.executeQuery<{
        user_id: string;
        count: string;
      }>(query, [hashtagId, limit]);
      return result.rows.map((row) => ({
        userId: row.user_id,
        count: parseInt(row.count),
      }));
    } catch (error) {
      this.logger.error("Error getting top users", error);
      throw new HashtagError(
        `Failed to get top users: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get related tags with correlation scores
   */
  async getRelatedTags(
    hashtagId: string,
    limit: number = 10,
  ): Promise<Array<{ tag: string; correlation: number }>> {
    try {
      const query = `
        SELECT h.tag, COUNT(*) as correlation
        FROM post_hashtags ph1
        JOIN post_hashtags ph2 ON ph1.post_id = ph2.post_id
        JOIN hashtags h ON ph2.hashtag_id = h.id
        WHERE ph1.hashtag_id = $1 AND ph2.hashtag_id != $1
        GROUP BY h.tag
        ORDER BY correlation DESC
        LIMIT $2
      `;

      const result = await this.executeQuery<{
        tag: string;
        correlation: string;
      }>(query, [hashtagId, limit]);
      return result.rows.map((row) => ({
        tag: row.tag,
        correlation: parseInt(row.correlation),
      }));
    } catch (error) {
      this.logger.error("Error getting related tags", error);
      throw new HashtagError(
        `Failed to get related tags: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get usage counts for hashtags within a time range
   */
  async getUsageCountsInTimeRange(
    tags: string[],
    startTime: Date,
    endTime: Date,
  ): Promise<Map<string, number>> {
    try {
      const query = `
        SELECT h.normalized_tag, COUNT(*) as count
        FROM ${this.tableName} h
        JOIN post_hashtags ph ON h.id = ph.hashtag_id
        WHERE h.normalized_tag = ANY($1)
        AND ph.created_at BETWEEN $2 AND $3
        GROUP BY h.normalized_tag
      `;

      const result = await this.executeQuery<{
        normalized_tag: string;
        count: string;
      }>(query, [tags, startTime, endTime]);

      const usageMap = new Map<string, number>();
      result.rows.forEach((row) => {
        usageMap.set(row.normalized_tag, parseInt(row.count, 10));
      });
      return usageMap;
    } catch (error) {
      this.logger.error("Error getting usage counts in time range", error);
      throw new HashtagError(
        `Failed to get usage counts: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Update trending score and metrics for a hashtag
   */
  async updateTrendingScore(
    tag: string,
    metrics: { hourlyCount: number; dailyCount: number; momentum: number },
  ): Promise<void> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET trending_metrics = jsonb_set(
          COALESCE(trending_metrics, '{}'::jsonb),
          '{hourlyCount, dailyCount, momentum}',
          $2::jsonb
        ),
        updated_at = NOW()
        WHERE normalized_tag = $1
      `;

      await this.executeQuery(query, [tag, JSON.stringify(metrics)]);
    } catch (error) {
      this.logger.error("Error updating trending score", error);
      throw new HashtagError(
        `Failed to update trending score: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

// Export singleton instance
export const hashtagRepository = HashtagRepository.getInstance();
