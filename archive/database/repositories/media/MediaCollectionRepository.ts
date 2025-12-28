import { injectable, inject } from "inversify";

import {
  CollectionPrivacy,
  CollectionType,
  MediaCollection,
  MediaCollectionAttributes,
} from "@/server/database/models/media/MediaCollection";
import TYPES from "@/server/infrastructure/di/types";
import {
  MediaCollectionError,
  MediaCollectionNotFoundError,
  MediaCollectionValidationError,
  MediaCollectionOperationError,
} from "@/server/infrastructure/errors/domain/media/MediaCollectionError";

import { BaseRepository } from "../BaseRepository";

import type { IDatabaseServer } from "@/server/infrastructure/database";
import type { ILoggerService } from "@/server/infrastructure/logging";

@injectable()
export class MediaCollectionRepository extends BaseRepository<MediaCollection> {
  protected tableName = "media_collections";
  protected columns = [
    "id",
    "title",
    "description",
    "owner_id as ownerId",
    "type",
    "status",
    "privacy",
    "media_count as mediaCount",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService,
    @inject(TYPES.DatabaseService) private databaseService: IDatabaseServer
  ) {
    super("MediaCollection");
  }

  /**
   * Creates a new media collection with validation
   * @param data The collection data to create
   * @returns The created MediaCollection instance
   * @throws {MediaCollectionValidationError} If validation fails
   * @throws {MediaCollectionOperationError} If an error occurs during the operation
   */
  async create(
    data: Omit<
      MediaCollectionAttributes,
      "id" | "itemCount" | "createdAt" | "updatedAt"
    >
  ): Promise<MediaCollection> {
    try {
      // Make sure userId, title, and type are available
      if (!data.userId || !data.title || !data.type) {
        const errors = [];
        if (!data.userId)
          errors.push({ field: "userId", message: "User ID is required" });
        if (!data.title)
          errors.push({ field: "title", message: "Title is required" });
        if (!data.type)
          errors.push({ field: "type", message: "Type is required" });
        throw new MediaCollectionValidationError(errors);
      }

      const collection = new MediaCollection(data as any);

      // Validate collection data
      const validationErrors = collection.validate();
      if (validationErrors.length > 0) {
        throw new MediaCollectionValidationError(validationErrors);
      }

      // Prepare data for insertion
      const collectionData = {
        id: collection.id,
        user_id: collection.userId,
        title: collection.title,
        description: collection.description,
        type: collection.type,
        privacy: collection.privacy,
        cover_media_id: collection.coverMediaId,
        media_ids: JSON.stringify(collection.mediaIds),
        sort_order: collection.sortOrder,
        metadata: collection.metadata
          ? JSON.stringify(collection.metadata)
          : null,
        is_official: collection.isOfficial,
        item_count: collection.itemCount,
        is_deleted: collection.isDeleted,
        created_at: collection.createdAt,
        updated_at: collection.updatedAt,
      };

      const columns = Object.keys(collectionData);
      const placeholders = columns.map((_, i) => `$${i + 1}`);
      const values = Object.values(collectionData);

      const query = `
        INSERT INTO ${this.tableName} (${columns.join(", ")})
        VALUES (${placeholders.join(", ")})
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, values);
      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      if (error instanceof MediaCollectionValidationError) {
        throw error;
      }

      throw new MediaCollectionOperationError("create", error);
    }
  }

  /**
   * Updates an existing media collection with validation
   * @param id The collection ID
   * @param data The data to update
   * @returns The updated MediaCollection instance
   * @throws {MediaCollectionNotFoundError} If collection not found
   * @throws {MediaCollectionValidationError} If validation fails
   * @throws {MediaCollectionOperationError} If an error occurs during the operation
   */
  async update(
    id: string,
    data: Partial<MediaCollectionAttributes>
  ): Promise<MediaCollection> {
    try {
      // First fetch the existing collection
      const existing = await this.findById(id);
      if (!existing) {
        throw new MediaCollectionNotFoundError(id);
      }

      // Create new collection with updated data for validation
      const collection = new MediaCollection({ ...existing, ...data });

      // Validate collection data
      const validationErrors = collection.validate();
      if (validationErrors.length > 0) {
        throw new MediaCollectionValidationError(validationErrors);
      }

      // Prepare update data
      const updateColumns = Object.keys(data).filter(
        (key) => data[key as keyof typeof data] !== undefined
      );

      if (updateColumns.length === 0) {
        return existing; // Nothing to update
      }

      const values = [id];
      const setClauses = updateColumns.map((key, index) => {
        let value = data[key as keyof typeof data];

        // Handle special cases for arrays and objects
        if (key === "mediaIds" && Array.isArray(value)) {
          value = JSON.stringify(value);
        } else if (key === "metadata" && value && typeof value === "object") {
          value = JSON.stringify(value);
        }

        values.push(value as any);
        return `${this.toSnakeCase(key)} = $${index + 2}`;
      });

      // Always update the updated_at timestamp
      setClauses.push(`updated_at = NOW()`);

      const query = `
        UPDATE ${this.tableName}
        SET ${setClauses.join(", ")}
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, values);

      if (result.rows.length === 0) {
        throw new MediaCollectionNotFoundError(id);
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      if (
        error instanceof MediaCollectionNotFoundError ||
        error instanceof MediaCollectionValidationError
      ) {
        throw error;
      }

      throw new MediaCollectionOperationError("update", error);
    }
  }

  /**
   * Find collections by user ID with optional type filtering
   * @param userId The user ID to find collections for
   * @param limit Maximum number of items to return
   * @param offset Number of items to skip
   * @param type Optional collection type filter
   * @param includeDeleted Whether to include soft-deleted collections
   * @returns Array of MediaCollection instances
   * @throws {MediaCollectionOperationError} If an error occurs during the operation
   */
  async findByUserId(
    userId: string,
    limit = 20,
    offset = 0,
    type?: CollectionType,
    includeDeleted = false
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
      params.push(limit, offset);

      const result = await this.executeQuery(query, params);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new MediaCollectionOperationError("findByUserId", error);
    }
  }

  /**
   * Find collection by ID
   * @param id The collection ID
   * @returns The collection or null if not found
   * @throws {MediaCollectionOperationError} If an error occurs during the operation
   */
  async findById(id: string): Promise<MediaCollection | null> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE id = $1 AND is_deleted = FALSE
      `;

      const result = await this.executeQuery(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      throw new MediaCollectionOperationError("findById", error);
    }
  }

  /**
   * Find collection by ID and throw if not found
   * @param id The collection ID
   * @returns The collection
   * @throws {MediaCollectionNotFoundError} If collection not found
   * @throws {MediaCollectionOperationError} If an error occurs during the operation
   */
  async findByIdOrThrow(id: string): Promise<MediaCollection> {
    const collection = await this.findById(id);

    if (!collection) {
      throw new MediaCollectionNotFoundError(id);
    }

    return collection;
  }

  /**
   * Find public collections
   * @param limit Maximum number of items to return
   * @param offset Number of items to skip
   * @param type Optional collection type filter
   * @returns Array of public MediaCollection instances
   * @throws {MediaCollectionOperationError} If an error occurs during the operation
   */
  async findPublic(
    limit = 20,
    offset = 0,
    type?: CollectionType
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
      params.push(limit, offset);

      const result = await this.executeQuery(query, params);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new MediaCollectionOperationError("findPublic", error);
    }
  }

  /**
   * Find official collections
   * @param limit Maximum number of items to return
   * @param offset Number of items to skip
   * @param type Optional collection type filter
   * @returns Array of official MediaCollection instances
   * @throws {MediaCollectionOperationError} If an error occurs during the operation
   */
  async findOfficial(
    limit = 20,
    offset = 0,
    type?: CollectionType
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
      params.push(limit, offset);

      const result = await this.executeQuery(query, params);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new MediaCollectionOperationError("findOfficial", error);
    }
  }

  /**
   * Search collections by title or description
   * @param searchTerm The term to search for in title and description
   * @param limit Maximum number of items to return
   * @param offset Number of items to skip
   * @param type Optional collection type filter
   * @param userId Optional user ID to include their private collections
   * @returns Array of matching MediaCollection instances
   * @throws {MediaCollectionOperationError} If an error occurs during the operation
   */
  async search(
    searchTerm: string,
    limit = 20,
    offset = 0,
    type?: CollectionType,
    userId?: string
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
      params.push(limit, offset);

      const result = await this.executeQuery(query, params);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new MediaCollectionOperationError("search", error);
    }
  }

  /**
   * Find collections containing a specific media
   * @param mediaId The media ID to find collections for
   * @param limit Maximum number of items to return
   * @param offset Number of items to skip
   * @param userId Optional user ID to include their private collections
   * @returns Array of MediaCollection instances containing the media
   * @throws {MediaCollectionOperationError} If an error occurs during the operation
   */
  async findByMediaId(
    mediaId: string,
    limit = 20,
    offset = 0,
    userId?: string
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
      params.push(limit, offset);

      const result = await this.executeQuery(query, params);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new MediaCollectionOperationError("findByMediaId", error);
    }
  }

  /**
   * Update collection privacy
   * @param id The collection ID
   * @param privacy The new privacy setting
   * @returns The updated MediaCollection
   * @throws {MediaCollectionNotFoundError} If collection not found
   * @throws {MediaCollectionOperationError} If an error occurs during the operation
   */
  async updatePrivacy(
    id: string,
    privacy: CollectionPrivacy
  ): Promise<MediaCollection> {
    try {
      // Check if collection exists
      const existing = await this.findByIdOrThrow(id);

      // Use the update method which already has error handling
      return await this.update(id, { privacy });
    } catch (error) {
      if (error instanceof MediaCollectionNotFoundError) {
        throw error;
      }

      throw new MediaCollectionOperationError("updatePrivacy", error);
    }
  }

  /**
   * Add media to collection
   * @param id The collection ID
   * @param mediaId The media ID to add
   * @returns The updated MediaCollection
   * @throws {MediaCollectionNotFoundError} If collection not found
   * @throws {MediaCollectionDuplicateItemError} If media already exists in collection
   * @throws {MediaCollectionCapacityError} If collection is at maximum capacity
   * @throws {MediaCollectionOperationError} If an error occurs during the operation
   */
  async addMedia(id: string, mediaId: string): Promise<MediaCollection> {
    try {
      // Check if collection exists
      const existing = await this.findByIdOrThrow(id);

      try {
        // This will throw specific errors if media can't be added
        existing.addMedia(mediaId);
      } catch (error) {
        // Re-throw domain errors directly
        if (error instanceof MediaCollectionError) {
          throw error;
        }
        throw new MediaCollectionOperationError("addMedia", error);
      }

      // Update the collection with new media array and count
      return await this.update(id, {
        mediaIds: existing.mediaIds,
        itemCount: existing.itemCount,
      });
    } catch (error) {
      // Re-throw domain errors directly
      if (error instanceof MediaCollectionError) {
        throw error;
      }

      throw new MediaCollectionOperationError("addMedia", error);
    }
  }

  /**
   * Remove media from collection
   * @param id The collection ID
   * @param mediaId The media ID to remove
   * @returns The updated MediaCollection
   * @throws {MediaCollectionNotFoundError} If collection not found
   * @throws {MediaCollectionItemNotFoundError} If media not found in collection
   * @throws {MediaCollectionOperationError} If an error occurs during the operation
   */
  async removeMedia(id: string, mediaId: string): Promise<MediaCollection> {
    try {
      // Check if collection exists
      const existing = await this.findByIdOrThrow(id);

      try {
        // This will throw specific errors if media can't be removed
        existing.removeMedia(mediaId);
      } catch (error) {
        // Re-throw domain errors directly
        if (error instanceof MediaCollectionError) {
          throw error;
        }
        throw new MediaCollectionOperationError("removeMedia", error);
      }

      // Update the collection with new media array, count and possibly cover image
      return await this.update(id, {
        mediaIds: existing.mediaIds,
        itemCount: existing.itemCount,
        coverMediaId: existing.coverMediaId,
      });
    } catch (error) {
      // Re-throw domain errors directly
      if (error instanceof MediaCollectionError) {
        throw error;
      }

      throw new MediaCollectionOperationError("removeMedia", error);
    }
  }

  /**
   * Get collection statistics
   * @returns Statistics including total count, counts by type and privacy
   * @throws {MediaCollectionOperationError} If an error occurs during the operation
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

      const result = await this.executeQuery(query);
      const stats = result.rows[0] as {
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
      throw new MediaCollectionOperationError("getCollectionStatistics", error);
    }
  }

  /**
   * Mark collection as deleted (soft delete)
   * @param id The collection ID to mark as deleted
   * @returns True if the operation was successful
   * @throws {MediaCollectionNotFoundError} If collection not found
   * @throws {MediaCollectionOperationError} If an error occurs during the operation
   */
  async markAsDeleted(id: string): Promise<boolean> {
    try {
      // Check if collection exists first
      await this.findByIdOrThrow(id);

      // Update with isDeleted flag
      await this.update(id, { isDeleted: true });
      return true;
    } catch (error) {
      if (error instanceof MediaCollectionNotFoundError) {
        throw error;
      }

      throw new MediaCollectionOperationError("markAsDeleted", error);
    }
  }

  /**
   * Deletes a media collection by ID
   * @param id The collection ID to delete
   * @throws {MediaCollectionNotFoundError} If collection not found
   * @throws {MediaCollectionOperationError} If an error occurs during the operation
   */
  async delete(id: string): Promise<void> {
    try {
      // Check if collection exists
      const existing = await this.findById(id);
      if (!existing) {
        throw new MediaCollectionNotFoundError(id);
      }

      const query = `
        DELETE FROM ${this.tableName}
        WHERE id = $1
      `;

      const result = await this.executeQuery(query, [id]);

      if (result.rowCount === 0) {
        throw new MediaCollectionNotFoundError(id);
      }
    } catch (error) {
      if (error instanceof MediaCollectionNotFoundError) {
        throw error;
      }

      throw new MediaCollectionOperationError("delete", error);
    }
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
      throw new MediaCollectionOperationError("executeQuery", error);
    }
  }

  /**
   * Convert a camelCase string to snake_case
   * @param camelCase The camelCase string
   * @returns The string in snake_case
   */
  private toSnakeCase(camelCase: string): string {
    return camelCase.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}

// Export a singleton instance
export const mediaCollectionRepository = new MediaCollectionRepository();
