import {
  Media,
  MediaType,
  MediaPrivacy,
  MediaAttributes,
} from "@database/models/media/Media";
import { MediaRepository, UserRepository } from "@database/repositories";
import { BaseService, CacheManager } from "@services/shared";
import {
  ResourceNotFoundError,
  ValidationError,
} from "@services/shared/errors/ServiceError";
import { MetricsService } from "@services/shared/monitoring";
import { PaginatedResult, PaginationOptions } from "@shared/types";

// Constants for caching and file handling
const MEDIA_CACHE_TTL = 3600; // 1 hour
const CACHE_KEY_PREFIX = "media:";
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/wav",
];

export interface FileUpload {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

export interface MediaMetadata {
  title?: string;
  description?: string;
  type: MediaType;
  visibility: MediaPrivacy;
  tags?: string[];
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface MediaUpdateDTO extends Partial<MediaAttributes> {
  title?: string;
  description?: string;
  visibility?: MediaPrivacy;
  tags?: string[];
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface MediaQueryOptions extends PaginationOptions {
  type?: MediaType;
  visibility?: MediaPrivacy;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
}

/**
 * Service responsible for managing media uploads and retrieval.
 * Features:
 * 1. Media upload handling and validation
 * 2. Secure storage management
 * 3. Media metadata extraction and storage
 * 4. Access control and privacy
 * 5. Media relation to other entities
 * 6. Caching for frequently accessed media
 * 7. Performance metrics tracking
 */
export class MediaService extends BaseService {
  constructor(
    private mediaRepository: MediaRepository,
    private userRepository: UserRepository,
    private metricsService: MetricsService,
    private cacheManager: CacheManager,
  ) {
    super("MediaService");
  }

  /**
   * Upload a new media file
   *
   * @param userId - ID of the user uploading the media
   * @param file - File upload data
   * @param metadata - Media metadata
   * @returns Newly created media object
   * @throws ValidationError if file or metadata is invalid
   * @throws ResourceNotFoundError if user doesn't exist
   */
  async uploadMedia(
    userId: string,
    file: FileUpload,
    metadata: MediaMetadata,
  ): Promise<Media> {
    const startTime = Date.now();
    try {
      // Validate user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ResourceNotFoundError(`User with ID ${userId} not found`);
      }

      // Validate file
      this.validateFileUpload(file);

      // Process and store the file
      const mediaData = {
        userId,
        filename: this.generateUniqueFilename(file.originalname),
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        ...metadata,
      };

      // Create media record
      const media = await this.mediaRepository.create(mediaData);

      // Track metrics
      this.metricsService.recordOperationDuration("media_upload", 1);
      this.metricsService.recordOperationDuration(
        "media_upload_time",
        Date.now() - startTime,
      );

      return media;
    } catch (error) {
      this.logger.error("Error uploading media", {
        userId,
        filename: file.originalname,
        error: error instanceof Error ? error.message : String(error),
      });

      this.metricsService.recordOperationDuration("media_upload_error", 1);

      throw error;
    }
  }

  /**
   * Get media by ID
   *
   * @param mediaId - ID of the media to retrieve
   * @returns Media object if found, null otherwise
   */
  async getMedia(mediaId: string): Promise<Media | null> {
    try {
      // Try to get from cache
      const cacheKey = `${CACHE_KEY_PREFIX}${mediaId}`;
      const cachedMedia = await this.cacheManager.get<Media>(cacheKey);
      if (cachedMedia) {
        this.metricsService.recordOperationDuration("media_cache_hit", 1);
        return cachedMedia;
      }

      // Get from repository
      const media = await this.mediaRepository.findById(mediaId);
      if (!media) {
        return null;
      }

      // Cache the result
      await this.cacheManager.set(cacheKey, media, MEDIA_CACHE_TTL);

      return media;
    } catch (error) {
      this.logger.error("Error getting media", {
        mediaId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Update media metadata
   *
   * @param userId - ID of the user updating the media
   * @param mediaId - ID of the media to update
   * @param updates - Update data
   * @returns Updated media object
   * @throws ResourceNotFoundError if media not found
   * @throws ValidationError if updates are invalid
   */
  async updateMedia(
    userId: string,
    mediaId: string,
    updates: MediaUpdateDTO,
  ): Promise<Media> {
    try {
      // Get existing media
      const media = await this.mediaRepository.findById(mediaId);
      if (!media) {
        throw new ResourceNotFoundError(`Media with ID ${mediaId} not found`);
      }

      // Verify ownership
      if (media.userId !== userId) {
        throw new ValidationError(
          "You don't have permission to update this media",
        );
      }

      // Update media
      const updatedMedia = await this.mediaRepository.update(mediaId, updates);
      if (!updatedMedia) {
        throw new ResourceNotFoundError(
          `Failed to update media with ID ${mediaId}`,
        );
      }

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${mediaId}`;
      await this.cacheManager.delete(cacheKey);

      return updatedMedia;
    } catch (error) {
      this.logger.error("Error updating media", {
        userId,
        mediaId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Delete media
   *
   * @param userId - ID of the user deleting the media
   * @param mediaId - ID of the media to delete
   * @returns true if deleted, false otherwise
   */
  async deleteMedia(userId: string, mediaId: string): Promise<boolean> {
    try {
      // Get existing media
      const media = await this.mediaRepository.findById(mediaId);
      if (!media) {
        return false;
      }

      // Verify ownership
      if (media.userId !== userId) {
        throw new ValidationError(
          "You don't have permission to delete this media",
        );
      }

      // Delete media
      await this.mediaRepository.delete(mediaId);

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${mediaId}`;
      await this.cacheManager.delete(cacheKey);

      // Track metrics
      this.metricsService.recordOperationDuration("media_deletion", 1);

      return true;
    } catch (error) {
      this.logger.error("Error deleting media", {
        userId,
        mediaId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Get media items by user
   *
   * @param userId - ID of the user whose media to retrieve
   * @param options - Query options for filtering and pagination
   * @returns Paginated media results
   */
  async getMediaByUser(
    userId: string,
    options: MediaQueryOptions,
  ): Promise<PaginatedResult<Media>> {
    try {
      // Get media items
      const media = await this.mediaRepository.findByUserId(
        userId,
        options.type,
        options.limit,
        options.page ? (options.page - 1) * (options.limit || 20) : 0,
      );

      // Track metrics
      this.metricsService.recordOperationDuration("media_retrieval", 1);

      // Format as paginated result
      return {
        items: media,
        total: media.length,
        page: options.page || 1,
        limit: options.limit || 20,
        totalPages: Math.ceil(media.length / (options.limit || 20)),
      };
    } catch (error) {
      this.logger.error("Error getting user media", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  /**
   * Validate file upload
   *
   * @param file - File upload data to validate
   * @throws ValidationError if file is invalid
   */
  private validateFileUpload(file: FileUpload): void {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError(
        `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      );
    }

    // Check mime type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new ValidationError(`File type ${file.mimetype} is not allowed`);
    }

    // Check if file buffer exists and is not empty
    if (!file.buffer || file.buffer.length === 0) {
      throw new ValidationError("File content is empty");
    }
  }

  /**
   * Generate a unique filename for storage
   *
   * @param originalFilename - Original filename
   * @returns Unique filename
   */
  private generateUniqueFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = originalFilename.split(".").pop();
    return `${timestamp}-${random}.${extension}`;
  }
}
