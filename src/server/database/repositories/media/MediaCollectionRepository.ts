import { Logger } from "../../../services/dev/logger/LoggerService";
import { DatabaseConnectionManager } from "../../config";
import {
  CollectionPrivacy,
  CollectionType,
  MediaCollection,
  MediaCollectionAttributes,
} from "../../models/media/MediaCollection";
import { BaseRepository } from "../BaseRepository";

export class MediaCollectionError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "MediaCollectionError";
  }
}

export class MediaCollectionNotFoundError extends MediaCollectionError {
  constructor(id: string) {
    super(`Collection with ID ${id} not found`, "COLLECTION_NOT_FOUND");
  }
}

export class MediaCollectionValidationError extends MediaCollectionError {
  constructor(message: string) {
    super(message, "COLLECTION_VALIDATION_ERROR");
  }
}

export class MediaCollectionRepository extends BaseRepository<MediaCollection> {
  protected logger = new Logger("MediaCollectionRepository");
  protected tableName = "media_collections";
  protected columns = [
    "id",
    "user_id as userId",
    "title",
    "description",
    "type",
    "privacy",
    "cover_media_id as coverMediaId",
    "media_ids as mediaIds",
    "sort_order as sortOrder",
    "metadata",
    "is_official as isOfficial",
    "item_count as itemCount",
    "is_deleted as isDeleted",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor() {
    super();
  }

  /**
   * Creates a new media collection with validation
   */
  async create(
    data: Omit<
      MediaCollectionAttributes,
      "id" | "itemCount" | "createdAt" | "updatedAt"
    >,
  ): Promise<MediaCollection> {
    return this.withTransaction(async (_client) => {
      try {
        const collection = new MediaCollection(data);
        collection.validate();

        const result = await super.create(collection);
        return new MediaCollection(result);
      } catch (error) {
        if (error instanceof MediaCollectionError) {
          throw error;
        }
        this.logger.error("Error creating media collection", {
          data,
          error: error instanceof Error ? error.message : error,
        });
        throw new MediaCollectionError(
          "Failed to create collection",
          "CREATE_ERROR",
        );
      }
    });
  }

  /**
   * Updates an existing media collection with validation
   */
  async update(
    id: string,
    data: Partial<MediaCollectionAttributes>,
  ): Promise<MediaCollection | null> {
    return this.withTransaction(async (_client) => {
      try {
        const existing = await this.findById(id);
        if (!existing) {
          throw new MediaCollectionNotFoundError(id);
        }

        const collection = new MediaCollection({ ...existing, ...data });
        collection.validate();

        const result = await super.update(id, collection);
        if (!result) {
          throw new MediaCollectionNotFoundError(id);
        }
        return new MediaCollection(result);
      } catch (error) {
        if (error instanceof MediaCollectionError) {
          throw error;
        }
        this.logger.error("Error updating media collection", {
          id,
          data,
          error: error instanceof Error ? error.message : error,
        });
        throw new MediaCollectionError(
          "Failed to update collection",
          "UPDATE_ERROR",
        );
      }
    });
  }

  /**
   * Find collections by user ID with optional type filtering
   */
  async findByUserId(
    userId: string,
    limit = 20,
    offset = 0,
    type?: CollectionType,
    includeDeleted = false,
  ): Promise<MediaCollection[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1
      `;

      const params: unknown[] = [userId];

      if (!includeDeleted) {
        query += " AND is_deleted = FALSE";
      }

      if (type) {
        query += ` AND type = $${params.length + 1}`;
        params.push(type);
      }

      query += " ORDER BY created_at DESC";
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit.toString(), offset.toString());

      const { rows } = await DatabaseConnectionManager.getPool().query(
        query,
        params,
      );
      return rows.map(this.mapResultToModel);
    } catch (error) {
      this.logger.error("Error finding collections by user ID", {
        userId,
        type,
        error: error instanceof Error ? error.message : error,
      });
      throw new MediaCollectionError(
        "Failed to find collections by user ID",
        "QUERY_ERROR",
      );
    }
  }

  /**
   * Find collection by ID
   */
  async findById(id: string): Promise<MediaCollection | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE id = $1 AND is_deleted = FALSE
      `;

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        id,
      ]);
      if (rows.length === 0) return null;

      return this.mapResultToModel(rows[0]);
    } catch (error) {
      this.logger.error("Error finding collection by ID", {
        id,
        error: error instanceof Error ? error.message : error,
      });
      throw new MediaCollectionError(
        "Failed to find collection by ID",
        "QUERY_ERROR",
      );
    }
  }

  /**
   * Find public collections
   */
  async findPublic(
    limit = 20,
    offset = 0,
    type?: CollectionType,
  ): Promise<MediaCollection[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE privacy = $1 AND is_deleted = FALSE
      `;

      const params: unknown[] = [CollectionPrivacy.PUBLIC];

      if (type) {
        query += ` AND type = $${params.length + 1}`;
        params.push(type);
      }

      query += " ORDER BY created_at DESC";
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit.toString(), offset.toString());

      const { rows } = await DatabaseConnectionManager.getPool().query(
        query,
        params,
      );
      return rows.map(this.mapResultToModel);
    } catch (error) {
      this.logger.error("Error finding public collections", {
        type,
        error: error instanceof Error ? error.message : error,
      });
      throw new MediaCollectionError(
        "Failed to find public collections",
        "QUERY_ERROR",
      );
    }
  }

  /**
   * Find official collections
   */
  async findOfficial(
    limit = 20,
    offset = 0,
    type?: CollectionType,
  ): Promise<MediaCollection[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE is_official = TRUE AND is_deleted = FALSE
      `;

      const params: unknown[] = [];

      if (type) {
        query += ` AND type = $${params.length + 1}`;
        params.push(type);
      }

      query += " ORDER BY created_at DESC";
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit.toString(), offset.toString());

      const { rows } = await DatabaseConnectionManager.getPool().query(
        query,
        params,
      );
      return rows.map(this.mapResultToModel);
    } catch (error) {
      this.logger.error("Error finding official collections", {
        type,
        error: error instanceof Error ? error.message : error,
      });
      throw new MediaCollectionError(
        "Failed to find official collections",
        "QUERY_ERROR",
      );
    }
  }

  /**
   * Search collections by title or description
   */
  async search(
    searchTerm: string,
    limit = 20,
    offset = 0,
    type?: CollectionType,
    userId?: string,
  ): Promise<MediaCollection[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE (title ILIKE $1 OR description ILIKE $1)
        AND is_deleted = FALSE
        AND (privacy = $2
      `;

      const params: unknown[] = [`%${searchTerm}%`, CollectionPrivacy.PUBLIC];

      if (userId) {
        query += ` OR (privacy = $${params.length + 1} AND user_id = $${params.length + 2})`;
        params.push(CollectionPrivacy.PRIVATE, userId);
      }

      query += ")";

      if (type) {
        query += ` AND type = $${params.length + 1}`;
        params.push(type);
      }

      query += " ORDER BY created_at DESC";
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit.toString(), offset.toString());

      const { rows } = await DatabaseConnectionManager.getPool().query(
        query,
        params,
      );
      return rows.map(this.mapResultToModel);
    } catch (error) {
      this.logger.error("Error searching collections", {
        searchTerm,
        type,
        userId,
        error: error instanceof Error ? error.message : error,
      });
      throw new MediaCollectionError(
        "Failed to search collections",
        "QUERY_ERROR",
      );
    }
  }

  /**
   * Find collections containing a specific media
   */
  async findByMediaId(
    mediaId: string,
    limit = 20,
    offset = 0,
    userId?: string,
  ): Promise<MediaCollection[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE media_ids ? $1
        AND is_deleted = FALSE
        AND (privacy = $2
      `;

      const params: unknown[] = [mediaId, CollectionPrivacy.PUBLIC];

      if (userId) {
        query += ` OR (privacy = $${params.length + 1} AND user_id = $${params.length + 2})`;
        params.push(CollectionPrivacy.PRIVATE, userId);
      }

      query += ")";
      query += " ORDER BY created_at DESC";
      query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit.toString(), offset.toString());

      const { rows } = await DatabaseConnectionManager.getPool().query(
        query,
        params,
      );
      return rows.map(this.mapResultToModel);
    } catch (error) {
      this.logger.error("Error finding collections by media ID", {
        mediaId,
        userId,
        error: error instanceof Error ? error.message : error,
      });
      throw new MediaCollectionError(
        "Failed to find collections by media ID",
        "QUERY_ERROR",
      );
    }
  }

  /**
   * Update collection privacy
   */
  async updatePrivacy(
    id: string,
    privacy: CollectionPrivacy,
  ): Promise<MediaCollection | null> {
    return this.withTransaction(async (_client) => {
      try {
        const existing = await this.findById(id);
        if (!existing) {
          throw new MediaCollectionNotFoundError(id);
        }

        const result = await super.update(id, { privacy });
        if (!result) {
          throw new MediaCollectionNotFoundError(id);
        }
        return new MediaCollection(result);
      } catch (error) {
        if (error instanceof MediaCollectionError) {
          throw error;
        }
        this.logger.error("Error updating collection privacy", {
          id,
          privacy,
          error: error instanceof Error ? error.message : error,
        });
        throw new MediaCollectionError(
          "Failed to update collection privacy",
          "UPDATE_ERROR",
        );
      }
    });
  }

  /**
   * Add media to collection
   */
  async addMedia(id: string, mediaId: string): Promise<MediaCollection | null> {
    return this.withTransaction(async (_client) => {
      try {
        const existing = await this.findById(id);
        if (!existing) {
          throw new MediaCollectionNotFoundError(id);
        }

        existing.addMedia(mediaId);

        const result = await super.update(id, {
          mediaIds: existing.mediaIds,
          itemCount: existing.itemCount,
        });

        if (!result) {
          throw new MediaCollectionNotFoundError(id);
        }
        return new MediaCollection(result);
      } catch (error) {
        if (error instanceof MediaCollectionError) {
          throw error;
        }
        this.logger.error("Error adding media to collection", {
          id,
          mediaId,
          error: error instanceof Error ? error.message : error,
        });
        throw new MediaCollectionError(
          "Failed to add media to collection",
          "UPDATE_ERROR",
        );
      }
    });
  }

  /**
   * Remove media from collection
   */
  async removeMedia(
    id: string,
    mediaId: string,
  ): Promise<MediaCollection | null> {
    return this.withTransaction(async (_client) => {
      try {
        const existing = await this.findById(id);
        if (!existing) {
          throw new MediaCollectionNotFoundError(id);
        }

        existing.removeMedia(mediaId);

        const result = await super.update(id, {
          mediaIds: existing.mediaIds,
          itemCount: existing.itemCount,
          coverMediaId: existing.coverMediaId,
        });

        if (!result) {
          throw new MediaCollectionNotFoundError(id);
        }
        return new MediaCollection(result);
      } catch (error) {
        if (error instanceof MediaCollectionError) {
          throw error;
        }
        this.logger.error("Error removing media from collection", {
          id,
          mediaId,
          error: error instanceof Error ? error.message : error,
        });
        throw new MediaCollectionError(
          "Failed to remove media from collection",
          "UPDATE_ERROR",
        );
      }
    });
  }

  /**
   * Get collection statistics
   */
  async getCollectionStatistics(): Promise<{
    total: number;
    byType: Record<CollectionType, number>;
    byPrivacy: Record<CollectionPrivacy, number>;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          json_object_agg(type, type_count) as by_type,
          json_object_agg(privacy, privacy_count) as by_privacy
        FROM (
          SELECT 
            type,
            COUNT(*) as type_count,
            privacy,
            COUNT(*) as privacy_count
          FROM ${this.tableName}
          WHERE is_deleted = FALSE
          GROUP BY type, privacy
        ) stats
      `;

      const { rows } = await DatabaseConnectionManager.getPool().query(query);
      const stats = rows[0] as {
        total: string;
        by_type: Record<CollectionType, number>;
        by_privacy: Record<CollectionPrivacy, number>;
      };

      return {
        total: parseInt(stats.total, 10),
        byType: stats.by_type || {},
        byPrivacy: stats.by_privacy || {},
      };
    } catch (error) {
      this.logger.error("Error getting collection statistics", {
        error: error instanceof Error ? error.message : error,
      });
      throw new MediaCollectionError(
        "Failed to get collection statistics",
        "QUERY_ERROR",
      );
    }
  }

  /**
   * Mark collection as deleted (soft delete)
   */
  async markAsDeleted(id: string): Promise<boolean> {
    return this.withTransaction(async (_client) => {
      try {
        const existing = await this.findById(id);
        if (!existing) {
          throw new MediaCollectionNotFoundError(id);
        }

        const result = await super.update(id, { isDeleted: true });
        return !!result;
      } catch (error) {
        if (error instanceof MediaCollectionError) {
          throw error;
        }
        this.logger.error("Error marking collection as deleted", {
          id,
          error: error instanceof Error ? error.message : error,
        });
        throw new MediaCollectionError(
          "Failed to mark collection as deleted",
          "UPDATE_ERROR",
        );
      }
    });
  }

  /**
   * Parse JSON array from database
   */
  private parseJsonArray(value: unknown): string[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      return JSON.parse(value as string);
    } catch (error) {
      this.logger.warn("Error parsing JSON array", {
        value,
        error: error instanceof Error ? error.message : error,
      });
      return [];
    }
  }

  protected mapResultToModel(row: Record<string, unknown>): MediaCollection {
    if (!row) return null as unknown as MediaCollection;
    return new MediaCollection({
      ...row,
      mediaIds: this.parseJsonArray(row.mediaIds),
    } as MediaCollectionAttributes);
  }
}

// Export a singleton instance
export const mediaCollectionRepository = new MediaCollectionRepository();
