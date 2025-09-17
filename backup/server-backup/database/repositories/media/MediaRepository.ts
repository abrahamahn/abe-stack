import { injectable, inject } from "inversify";

import { IDatabaseServer } from "@/server/infrastructure";
import TYPES from "@/server/infrastructure/di/types";
import {
  MediaNotFoundError,
  MediaValidationError,
  MediaProcessingError,
  MediaFormatError,
  MediaOperationError,
} from "@/server/infrastructure/errors/domain/media/MediaError";
import { ILoggerService } from "@/server/infrastructure/logging";

import {
  Media,
  MediaAttributes,
  MediaFormat,
  MediaStatus,
  MediaType,
  MIME_TYPES,
} from "../../models/media/Media";
import { BaseRepository } from "../BaseRepository";

/**
 * Repository class for handling Media database operations.
 * This class is responsible for:
 * 1. All database operations related to media
 * 2. Converting between database and model formats
 * 3. Providing specific query methods for media
 * 4. NOT implementing business logic - that belongs in the Media model
 */
@injectable()
export class MediaRepository extends BaseRepository<Media> {
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

  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService,
    @inject(TYPES.DatabaseService) private databaseService: IDatabaseServer
  ) {
    super();
  }

  protected mapResultToModel(row: Record<string, unknown>): Media {
    if (!row) return null as unknown as Media;
    return new Media(this.processMediaData(row));
  }

  /**
   * Creates a new media item with validation
   * @param data The media data to create
   * @returns The created Media instance
   * @throws {MediaValidationError} If validation fails
   * @throws {MediaOperationError} If an error occurs during the operation
   */
  async create(
    data: Omit<MediaAttributes, "id" | "createdAt" | "updatedAt">
  ): Promise<Media> {
    try {
      const media = new Media(
        data as unknown as Partial<MediaAttributes> & {
          userId: string;
          type: MediaType;
        }
      );

      // Validate media data
      const validationErrors = media.validate();
      if (validationErrors.length > 0) {
        throw new MediaValidationError(validationErrors);
      }

      // Validate metadata
      const metadataErrors = media.validateMetadata();
      if (metadataErrors.length > 0) {
        throw new MediaValidationError(metadataErrors);
      }

      // Prepare data for insertion
      const columns = Object.keys(media).filter(
        (key) =>
          !["id", "createdAt", "updatedAt"].includes(key) &&
          media[key as keyof Media] !== undefined
      );

      const values = columns.map((key) => {
        const value = media[key as keyof Media];
        // Convert metadata to JSON string
        if (key === "metadata" && value) {
          return JSON.stringify(value);
        }
        return value;
      });

      const placeholders = columns.map((_, i) => `$${i + 1}`);
      const snakeCaseColumns = columns.map(this.toSnakeCase);

      const query = `
        INSERT INTO ${this.tableName} (${snakeCaseColumns.join(", ")})
        VALUES (${placeholders.join(", ")})
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, values);
      return this.mapResultToModel(result.rows[0] as Record<string, unknown>);
    } catch (error) {
      if (error instanceof MediaValidationError) {
        throw error;
      }
      this.logger.error("Error creating media", {
        data,
        error: error instanceof Error ? error.message : error,
      });
      throw new MediaOperationError("create", error);
    }
  }

  /**
   * Updates an existing media item with validation
   * @param id The media ID
   * @param data The data to update
   * @returns The updated Media instance
   * @throws {MediaNotFoundError} If media not found
   * @throws {MediaValidationError} If validation fails
   * @throws {MediaOperationError} If an error occurs during the operation
   */
  async update(id: string, data: Partial<MediaAttributes>): Promise<Media> {
    try {
      const existing = await this.findByIdOrThrow(id);

      // Create new media with updated data for validation
      const media = new Media({ ...existing, ...data });

      // Validate media data
      const validationErrors = media.validate();
      if (validationErrors.length > 0) {
        throw new MediaValidationError(validationErrors);
      }

      // Validate metadata
      const metadataErrors = media.validateMetadata();
      if (metadataErrors.length > 0) {
        throw new MediaValidationError(metadataErrors);
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
        // Handle metadata object
        if (key === "metadata" && value) {
          value = JSON.stringify(value);
        }
        values.push(value as any);
        return `${this.toSnakeCase(key)} = $${index + 2}`;
      });

      const query = `
        UPDATE ${this.tableName}
        SET ${setClauses.join(", ")},
            updated_at = NOW()
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, values);

      if (result.rows.length === 0) {
        throw new MediaNotFoundError(id);
      }

      return this.mapResultToModel(result.rows[0] as Record<string, unknown>);
    } catch (error) {
      if (
        error instanceof MediaNotFoundError ||
        error instanceof MediaValidationError
      ) {
        throw error;
      }
      this.logger.error("Error updating media", {
        id,
        data,
        error: error instanceof Error ? error.message : error,
      });
      throw new MediaOperationError("update", error);
    }
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
    status: MediaStatus
  ): Promise<Media> {
    try {
      // First check if media exists
      await this.findByIdOrThrow(id);

      const query = `
        UPDATE ${this.tableName}
        SET processing_status = $2,
            updated_at = NOW()
        WHERE id = $1
        RETURNING ${this.columns.join(", ")}
      `;

      const result = await this.executeQuery(query, [id, status]);

      if (result.rows.length === 0) {
        throw new MediaNotFoundError(id);
      }

      return this.mapResultToModel(result.rows[0] as Record<string, unknown>);
    } catch (error) {
      if (error instanceof MediaNotFoundError) {
        throw error;
      }

      this.logger.error("Error updating media processing status", {
        id,
        status,
        error: error instanceof Error ? error.message : error,
      });

      throw new MediaProcessingError(
        `Failed to update processing status to ${status}`,
        {
          mediaId: id,
          requestedStatus: status,
          originalError: error,
        }
      );
    }
  }

  /**
   * Find media items by user ID
   * @param userId The user ID
   * @param type Optional media type filter
   * @param limit Maximum number of items to return
   * @param offset Number of items to skip for pagination
   * @returns Array of media items
   * @throws {MediaOperationError} If an error occurs during the operation
   */
  async findByUserId(
    userId: string,
    type?: MediaType,
    limit: number = 20,
    offset: number = 0
  ): Promise<Media[]> {
    try {
      let query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE user_id = $1
      `;

      const params: unknown[] = [userId];

      if (type) {
        query += ` AND type = $${params.length + 1}`;
        params.push(type);
      }

      query += ` ORDER BY created_at DESC
                 LIMIT $${params.length + 1} 
                 OFFSET $${params.length + 2}`;

      params.push(limit, offset);

      const result = await this.executeQuery(query, params);

      return result.rows.map((row) =>
        this.mapResultToModel(row as Record<string, unknown>)
      );
    } catch (error) {
      this.logger.error("Error finding media by user ID", {
        userId,
        type,
        error: error instanceof Error ? error.message : error,
      });

      throw new MediaOperationError("findByUserId", error);
    }
  }

  /**
   * Find public media items
   * @param limit Maximum number of items to return
   * @param offset Number of items to skip for pagination
   * @returns Array of media items
   * @throws {MediaOperationError} If an error occurs during the operation
   */
  async findPublic(limit: number = 20, offset: number = 0): Promise<Media[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE is_public = true
        AND processing_status = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.executeQuery(query, [
        MediaStatus.COMPLETED,
        limit,
        offset,
      ]);

      return result.rows.map((row) =>
        this.mapResultToModel(row as Record<string, unknown>)
      );
    } catch (error) {
      this.logger.error("Error finding public media", {
        error: error instanceof Error ? error.message : error,
      });

      throw new MediaOperationError("findPublic", error);
    }
  }

  /**
   * Delete a media item
   * @param id The media ID
   * @returns True if deletion was successful
   * @throws {MediaNotFoundError} If media not found
   * @throws {MediaOperationError} If an error occurs during the operation
   */
  async delete(id: string): Promise<boolean> {
    try {
      // First verify the media exists
      await this.findByIdOrThrow(id);

      // Execute delete query
      const query = `DELETE FROM ${this.tableName} WHERE id = $1`;
      const result = await this.executeQuery(query, [id]);

      return result.rowCount > 0;
    } catch (error) {
      if (error instanceof MediaNotFoundError) {
        throw error;
      }

      this.logger.error("Error deleting media", {
        id,
        error: error instanceof Error ? error.message : error,
      });

      throw new MediaOperationError("delete", error);
    }
  }

  /**
   * Find a media item by ID
   * @param id The media ID
   * @returns The media item or null if not found
   * @throws {MediaOperationError} If an error occurs during the operation
   */
  async findById(id: string): Promise<Media | null> {
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

      return this.mapResultToModel(result.rows[0] as Record<string, unknown>);
    } catch (error) {
      this.logger.error("Error finding media by ID", {
        id,
        error: error instanceof Error ? error.message : error,
      });
      throw new MediaOperationError("findById", error);
    }
  }

  /**
   * Find a media item by ID or throw an error if not found
   * @param id The media ID
   * @returns The media item
   * @throws {MediaNotFoundError} If media not found
   * @throws {MediaOperationError} If an error occurs during the operation
   */
  async findByIdOrThrow(id: string): Promise<Media> {
    const media = await this.findById(id);
    if (!media) {
      throw new MediaNotFoundError(id);
    }
    return media;
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
    sortOrder = "DESC"
  ): Promise<Media[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE type = $1
        ORDER BY ${this.snakeCase(sortBy)} ${sortOrder === "ASC" ? "ASC" : "DESC"}
        LIMIT $2 OFFSET $3
      `;

      const { rows } = await this.databaseService.query(query, [
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

      const { rows } = await this.databaseService.query(query, [
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
    type?: MediaType
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

      const { rows } = await this.databaseService.query(query, params);
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

      const { rows } = await this.databaseService.query(query, [status, id]);
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

      const { rows } = await this.databaseService.query(query, [privacy, id]);
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
    offset = 0
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

      const { rows } = await this.databaseService.query(query, [
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
    offset = 0
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

      const { rows } = await this.databaseService.query(query, [
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

      const { rows } = await this.databaseService.query(query);
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
    data: unknown
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

  /**
   * Convert a camelCase string to snake_case
   * @param camelCase The camelCase string
   * @returns The string in snake_case
   */
  private toSnakeCase(camelCase: string): string {
    return camelCase.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  protected async executeQuery<T = any>(
    query: string,
    params: unknown[] = []
  ): Promise<{ rows: T[]; rowCount: number }> {
    try {
      const result = await this.databaseService.query<T>(query, params);
      return { rows: result.rows, rowCount: result.rowCount };
    } catch (error) {
      throw new MediaOperationError("executeQuery", error);
    }
  }
}

// Export a singleton instance
export const mediaRepository = new MediaRepository();
