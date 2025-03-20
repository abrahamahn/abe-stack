import { Logger } from "../../../services/dev/logger/LoggerService";
import { DatabaseConnectionManager } from "../../config";
import {
  Media,
  MediaAttributes,
  MediaFormat,
  MediaStatus,
  MediaType,
  MIME_TYPES,
} from "../../models/media/Media";
import { BaseRepository } from "../BaseRepository";

export class MediaError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "MediaError";
  }
}

export class MediaNotFoundError extends MediaError {
  constructor(id: string) {
    super(`Media with ID ${id} not found`, "MEDIA_NOT_FOUND");
  }
}

export class MediaValidationError extends MediaError {
  constructor(message: string) {
    super(message, "MEDIA_VALIDATION_ERROR");
  }
}

export class MediaProcessingError extends MediaError {
  constructor(message: string) {
    super(message, "MEDIA_PROCESSING_ERROR");
  }
}

export class MediaFormatError extends MediaError {
  constructor(message: string) {
    super(message, "MEDIA_FORMAT_ERROR");
  }
}

/**
 * Repository class for handling Media database operations.
 * This class is responsible for:
 * 1. All database operations related to media
 * 2. Converting between database and model formats
 * 3. Providing specific query methods for media
 * 4. NOT implementing business logic - that belongs in the Media model
 */
export class MediaRepository extends BaseRepository<Media> {
  protected logger = new Logger("MediaRepository");
  protected tableName = "media";
  protected columns = [
    "id",
    "user_id as userId",
    "type",
    "original_filename as originalFilename",
    "filename",
    "path",
    "mime_type as mimeType",
    "size",
    "width",
    "height",
    "duration",
    "thumbnail_path as thumbnailPath",
    "processing_status as processingStatus",
    "is_public as isPublic",
    "metadata",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  protected mapResultToModel(row: Record<string, unknown>): Media {
    if (!row) return null as unknown as Media;
    return new Media(this.processMediaData(row));
  }

  constructor() {
    super();
  }

  /**
   * Creates a new media item with validation
   * @param data The media data to create
   * @returns The created Media instance
   * @throws {MediaValidationError} If validation fails
   */
  async create(
    data: Omit<MediaAttributes, "id" | "createdAt" | "updatedAt">,
  ): Promise<Media> {
    return this.withTransaction(async (_client) => {
      try {
        const media = new Media(
          data as unknown as Partial<MediaAttributes> & {
            userId: string;
            type: MediaType;
          },
        );
        media.validate();
        media.validateMetadata();

        const result = await super.create(media);
        return new Media(result);
      } catch (error) {
        if (error instanceof MediaError) {
          throw error;
        }
        this.logger.error("Error creating media", {
          data,
          error: error instanceof Error ? error.message : error,
        });
        throw new MediaError("Failed to create media", "CREATE_ERROR");
      }
    });
  }

  /**
   * Updates an existing media item with validation
   * @param id The media ID
   * @param data The data to update
   * @returns The updated Media instance
   * @throws {MediaNotFoundError} If media not found
   * @throws {MediaValidationError} If validation fails
   */
  async update(
    id: string,
    data: Partial<MediaAttributes>,
  ): Promise<Media | null> {
    return this.withTransaction(async (_client) => {
      try {
        const existing = await this.findById(id);
        if (!existing) {
          throw new MediaNotFoundError(id);
        }

        const media = new Media({ ...existing, ...data });
        media.validate();
        media.validateMetadata();

        const result = await super.update(id, media);
        if (!result) {
          throw new MediaNotFoundError(id);
        }
        return new Media(result);
      } catch (error) {
        if (error instanceof MediaError) {
          throw error;
        }
        this.logger.error("Error updating media", {
          id,
          data,
          error: error instanceof Error ? error.message : error,
        });
        throw new MediaError("Failed to update media", "UPDATE_ERROR");
      }
    });
  }

  /**
   * Updates the processing status of a media item
   * @param id The media ID
   * @param status The new processing status
   * @returns The updated Media instance
   * @throws {MediaNotFoundError} If media not found
   * @throws {MediaProcessingError} If status update fails
   */
  async updateProcessingStatus(
    id: string,
    status: MediaStatus,
  ): Promise<Media | null> {
    return this.withTransaction(async (_client) => {
      try {
        const existing = await this.findById(id);
        if (!existing) {
          throw new MediaNotFoundError(id);
        }

        const result = await super.update(id, { processingStatus: status });
        if (!result) {
          throw new MediaNotFoundError(id);
        }
        return new Media(result);
      } catch (error) {
        if (error instanceof MediaError) {
          throw error;
        }
        this.logger.error("Error updating media processing status", {
          id,
          status,
          error: error instanceof Error ? error.message : error,
        });
        throw new MediaProcessingError("Failed to update processing status");
      }
    });
  }

  /**
   * Finds media by user ID with optional type filtering
   * @param userId The user ID
   * @param type Optional media type filter
   * @param limit Maximum number of results
   * @param offset Number of results to skip
   * @returns Array of Media instances
   */
  async findByUserId(
    userId: string,
    type?: MediaType,
    limit: number = 20,
    offset: number = 0,
  ): Promise<Media[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1
        ${type ? "AND type = $2" : ""}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const params = type ? [userId, type] : [userId];
      const result = await this.executeQuery<MediaAttributes>(query, params);
      return result.rows.map((row) => new Media(row));
    } catch (error) {
      this.logger.error("Error finding media by user ID", {
        userId,
        type,
        error: error instanceof Error ? error.message : error,
      });
      throw new MediaError("Failed to find media by user ID", "QUERY_ERROR");
    }
  }

  /**
   * Finds public media items
   * @param limit Maximum number of results
   * @param offset Number of results to skip
   * @returns Array of Media instances
   */
  async findPublic(limit: number = 20, offset: number = 0): Promise<Media[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE is_public = true
        AND processing_status = $1
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const result = await this.executeQuery<MediaAttributes>(query, [
        MediaStatus.COMPLETED,
      ]);
      return result.rows.map((row) => new Media(row));
    } catch (error) {
      this.logger.error("Error finding public media", {
        error: error instanceof Error ? error.message : error,
      });
      throw new MediaError("Failed to find public media", "QUERY_ERROR");
    }
  }

  /**
   * Deletes a media item and its associated files
   * @param id The media ID
   * @returns True if deletion was successful
   * @throws {MediaNotFoundError} If media not found
   */
  async delete(id: string): Promise<boolean> {
    return this.withTransaction(async (_client) => {
      try {
        const existing = await this.findById(id);
        if (!existing) {
          throw new MediaNotFoundError(id);
        }

        // Here you would typically also delete the actual files
        // This would be handled by a file service

        const result = await super.delete(id);
        return result;
      } catch (error) {
        if (error instanceof MediaError) {
          throw error;
        }
        this.logger.error("Error deleting media", {
          id,
          error: error instanceof Error ? error.message : error,
        });
        throw new MediaError("Failed to delete media", "DELETE_ERROR");
      }
    });
  }

  /**
   * Find a media item by ID
   * @param id The media ID
   * @returns The media item or null if not found
   */
  async findById(id: string): Promise<Media | null> {
    try {
      const result = await this.findOneByField("id", id);
      if (!result) return null;

      return new Media(this.processMediaData(result));
    } catch (error) {
      this.logger.error("Error finding media by ID", {
        error: error instanceof Error ? error.message : error,
        id,
      });
      throw error;
    }
  }

  /**
   * Find media by type
   * @param type The media type
   * @param limit Maximum number of items to return
   * @param offset Number of items to skip
   * @param sortBy Field to sort by
   * @param sortOrder Sort direction
   * @returns Array of media items
   */
  async findByType(
    type: MediaType,
    limit = 20,
    offset = 0,
    sortBy = "createdAt",
    sortOrder = "DESC",
  ): Promise<Media[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE type = $1
        ORDER BY ${this.snakeCase(sortBy)} ${sortOrder === "ASC" ? "ASC" : "DESC"}
        LIMIT $2 OFFSET $3
      `;

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        type,
        limit,
        offset,
      ]);
      return rows.map((row) => new Media(this.processMediaData(row)));
    } catch (error) {
      this.logger.error("Error finding media by type", {
        error: error instanceof Error ? error.message : error,
        type,
      });
      throw error;
    }
  }

  /**
   * Find media by status
   * @param status The status to filter by
   * @param limit Maximum number of items to return
   * @param offset Number of items to skip
   * @returns Array of media items
   */
  async findByStatus(status: string, limit = 20, offset = 0): Promise<Media[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE status = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        status,
        limit,
        offset,
      ]);
      return rows.map((row) => new Media(this.processMediaData(row)));
    } catch (error) {
      this.logger.error("Error finding media by status", {
        error: error instanceof Error ? error.message : error,
        status,
      });
      throw error;
    }
  }

  /**
   * Search media by title or description
   * @param searchTerm The search term
   * @param limit Maximum number of items to return
   * @param offset Number of items to skip
   * @param type Optional media type filter
   * @returns Array of media items
   */
  async search(
    searchTerm: string,
    limit = 20,
    offset = 0,
    type?: MediaType,
  ): Promise<Media[]> {
    try {
      const params = [`%${searchTerm}%`];

      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE (title ILIKE $1 OR description ILIKE $1)
      `;

      if (type) {
        query += ` AND type = $${params.length + 1}`;
        params.push(type);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit.toString(), offset.toString());

      const { rows } = await DatabaseConnectionManager.getPool().query(
        query,
        params,
      );
      return rows.map((row) => new Media(this.processMediaData(row)));
    } catch (error) {
      this.logger.error("Error searching media", {
        error: error instanceof Error ? error.message : error,
        searchTerm,
        type,
      });
      throw error;
    }
  }

  /**
   * Update media status
   * @param id The media ID
   * @param status The new status
   * @returns The updated media or null if not found
   */
  async updateStatus(id: string, status: string): Promise<Media | null> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING ${this.columns.join(", ")}
      `;

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        status,
        id,
      ]);
      if (rows.length === 0) return null;

      return new Media(this.processMediaData(rows[0]));
    } catch (error) {
      this.logger.error("Error updating media status", {
        error: error instanceof Error ? error.message : error,
        id,
        status,
      });
      throw error;
    }
  }

  /**
   * Update media privacy setting
   * @param id The media ID
   * @param privacy The new privacy setting
   * @returns The updated media or null if not found
   */
  async updatePrivacy(id: string, privacy: string): Promise<Media | null> {
    try {
      const query = `
        UPDATE ${this.tableName}
        SET privacy = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING ${this.columns.join(", ")}
      `;

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        privacy,
        id,
      ]);
      if (rows.length === 0) return null;

      return new Media(this.processMediaData(rows[0]));
    } catch (error) {
      this.logger.error("Error updating media privacy", {
        error: error instanceof Error ? error.message : error,
        id,
        privacy,
      });
      throw error;
    }
  }

  /**
   * Find media by format
   * @param format The media format
   * @param limit Maximum number of items to return
   * @param offset Number of items to skip
   * @returns Array of media items
   */
  async findByFormat(
    format: MediaFormat,
    limit = 20,
    offset = 0,
  ): Promise<Media[]> {
    try {
      const mimeType = MIME_TYPES[format];
      if (!mimeType) {
        throw new MediaFormatError(`Unsupported format: ${format}`);
      }

      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE mime_type = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        mimeType,
        limit,
        offset,
      ]);
      return rows.map((row) => new Media(this.processMediaData(row)));
    } catch (error) {
      this.logger.error("Error finding media by format", {
        error: error instanceof Error ? error.message : error,
        format,
      });
      throw error;
    }
  }

  /**
   * Find media by type and format
   * @param type The media type
   * @param format The media format
   * @param limit Maximum number of items to return
   * @param offset Number of items to skip
   * @returns Array of media items
   */
  async findByTypeAndFormat(
    type: MediaType,
    format: MediaFormat,
    limit = 20,
    offset = 0,
  ): Promise<Media[]> {
    try {
      const mimeType = MIME_TYPES[format];
      if (!mimeType) {
        throw new MediaFormatError(`Unsupported format: ${format}`);
      }

      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE type = $1 AND mime_type = $2
        ORDER BY created_at DESC
        LIMIT $3 OFFSET $4
      `;

      const { rows } = await DatabaseConnectionManager.getPool().query(query, [
        type,
        mimeType,
        limit,
        offset,
      ]);
      return rows.map((row) => new Media(this.processMediaData(row)));
    } catch (error) {
      this.logger.error("Error finding media by type and format", {
        error: error instanceof Error ? error.message : error,
        type,
        format,
      });
      throw error;
    }
  }

  /**
   * Get media statistics
   * @returns Object containing media statistics
   */
  async getMediaStatistics(): Promise<{
    total: number;
    byType: Record<MediaType, number>;
    byFormat: Record<MediaFormat, number>;
    byStatus: Record<MediaStatus, number>;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          json_object_agg(type, type_count) as by_type,
          json_object_agg(mime_type, format_count) as by_format,
          json_object_agg(processing_status, status_count) as by_status
        FROM (
          SELECT 
            type,
            COUNT(*) as type_count,
            mime_type,
            COUNT(*) as format_count,
            processing_status,
            COUNT(*) as status_count
          FROM ${this.tableName}
          GROUP BY type, mime_type, processing_status
        ) stats
      `;

      const { rows } = await DatabaseConnectionManager.getPool().query(query);
      const stats = rows[0] as {
        total: string;
        by_type: Record<MediaType, number>;
        by_format: Record<MediaFormat, number>;
        by_status: Record<MediaStatus, number>;
      };

      return {
        total: parseInt(stats.total, 10),
        byType: stats.by_type,
        byFormat: stats.by_format,
        byStatus: stats.by_status,
      };
    } catch (error) {
      this.logger.error("Error getting media statistics", {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Process database result for model instantiation
   * @param data The database data
   * @returns Processed data for model
   */
  private processMediaData(
    data: unknown,
  ): MediaAttributes & { userId: string; type: MediaType } {
    // Type assertion to work with the unknown data
    const record = data as Record<string, unknown>;

    // Parse metadata if it's a string
    if (record.metadata && typeof record.metadata === "string") {
      try {
        record.metadata = JSON.parse(record.metadata);
      } catch (error) {
        this.logger.warn("Error parsing media metadata", {
          error: error instanceof Error ? error.message : error,
          metadata: record.metadata,
        });
        record.metadata = {};
      }
    } else if (!record.metadata) {
      record.metadata = {};
    }

    // Parse tags if it's a string
    if (record.tags && typeof record.tags === "string") {
      try {
        record.tags = JSON.parse(record.tags);
      } catch (error) {
        this.logger.warn("Error parsing media tags", {
          error: error instanceof Error ? error.message : error,
          tags: record.tags,
        });
        record.tags = null;
      }
    }

    // Ensure type is a valid MediaType
    if (typeof record.type === "string") {
      record.type = record.type as MediaType;
    }

    // Validate MIME type
    if (
      record.mimeType &&
      !Object.values(MIME_TYPES).includes(record.mimeType as string)
    ) {
      this.logger.warn("Invalid MIME type detected", {
        mimeType: record.mimeType,
      });
    }

    return record as MediaAttributes & { userId: string; type: MediaType };
  }

  /**
   * Convert camelCase to snake_case
   * @param str The string to convert
   * @returns snake_case string
   */
  private snakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}

// Export a singleton instance
export const mediaRepository = new MediaRepository();
