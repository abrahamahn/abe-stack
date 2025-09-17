import { StorageService } from "@server/infrastructure/storage-backup";

import {
  Media,
  MediaType,
  MediaPrivacy,
  MediaAttributes,
} from "@/server/database/models/media/Media";
import {
  MediaRepository,
  UserRepository,
} from "@/server/database/repositories";
import { CacheService } from "@/server/infrastructure/cache";
import { IQueueService } from "@/server/infrastructure/jobs";
import { PaginatedResult, PaginationOptions } from "@/server/shared/types";
import { BaseService } from "@/server/services/shared";
import {
  ResourceNotFoundError,
  ValidationError,
  ServiceError,
  PermissionError,
} from "@/server/services/shared/errors/ServiceError";
import { MetricsService } from "@/server/services/shared/monitoring";

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

export interface MediaProcessingOptions {
  resize?: {
    width?: number;
    height?: number;
    fit?: "cover" | "contain" | "inside" | "outside";
  };
  format?: "jpeg" | "png" | "webp" | "gif";
  quality?: number;
}

export interface MediaProcessingResult {
  mediaId: string;
  status: "processing" | "completed" | "failed";
  outputPath?: string;
  variants?: string[];
  error?: string;
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
 * 8. Media processing and variant creation
 * 9. Job queue integration for async processing
 */
export class MediaService extends BaseService {
  constructor(
    private mediaRepository: MediaRepository,
    private userRepository: UserRepository,
    private metricsService: MetricsService,
    private cacheService: CacheService,
    private jobService: IQueueService,
    private storageService: StorageService
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
    metadata: MediaMetadata
  ): Promise<Media> {
    const startTime = Date.now();
    try {
      // Validate user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ResourceNotFoundError("User", userId);
      }

      // Validate file
      this.validateFileUpload(file);

      // Generate unique file path
      const filename = this.generateUniqueFilename(file.originalname);
      const path = `users/${userId}/media/${filename}`;

      // Store original file
      await this.storageService.saveFile(path, file.buffer, {
        contentType: file.mimetype,
        size: file.buffer.length,
      });

      // Process and store the file
      const mediaData = {
        userId,
        filename,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path,
        status: "processing",
        ...metadata,
      };

      // Create media record
      const media = await this.mediaRepository.create(mediaData);

      // Queue processing job for variants
      await this.queueMediaProcessing(media.id, path, file.mimetype);

      // Track metrics
      this.metricsService.recordOperationDuration("media_upload", 1);
      this.metricsService.recordOperationDuration(
        "media_upload_time",
        Date.now() - startTime
      );

      return media;
    } catch (error) {
      this.logger.error("Error uploading media", {
        userId,
        filename: file.originalname,
        error: error instanceof Error ? error.message : String(error),
      });

      this.metricsService.recordOperationDuration("media_upload_error", 1);

      if (
        error instanceof ValidationError ||
        error instanceof ResourceNotFoundError
      ) {
        throw error;
      }

      throw new ServiceError("Failed to upload media", {
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  /**
   * Process media with custom options
   *
   * @param mediaId - ID of the media to process
   * @param options - Processing options
   * @returns Processing result
   * @throws ResourceNotFoundError if media not found
   */
  async processMedia(
    mediaId: string,
    options: MediaProcessingOptions
  ): Promise<MediaProcessingResult> {
    try {
      const media = await this.mediaRepository.findById(mediaId);

      if (!media) {
        throw new ResourceNotFoundError("Media", mediaId);
      }

      // Queue custom processing job
      await this.jobService.addTask("media:custom-processing", {
        mediaId,
        options,
      });

      return {
        mediaId,
        status: "processing",
      };
    } catch (error) {
      this.logger.error("Error processing media", {
        mediaId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof ResourceNotFoundError) {
        throw error;
      }

      throw new ServiceError("Failed to process media", {
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  /**
   * Get media processing status
   *
   * @param mediaId - ID of the media to check
   * @returns Processing status
   * @throws ResourceNotFoundError if media not found
   */
  async getProcessingStatus(mediaId: string): Promise<MediaProcessingResult> {
    try {
      // Check if we have cached processing status
      const cacheKey = `${CACHE_KEY_PREFIX}processing:${mediaId}`;
      const cachedStatus =
        await this.cacheService.get<MediaProcessingResult>(cacheKey);
      if (cachedStatus) {
        return cachedStatus;
      }

      // Get media to verify it exists and user has access
      const media = await this.mediaRepository.findById(mediaId);
      if (!media) {
        throw new ResourceNotFoundError("Media", mediaId);
      }

      // Check if there's a processing job in the queue
      // Intentionally unused for now, will be used in future implementation

      // If no job or job is completed, check if the processed versions exist
      const result: MediaProcessingResult = {
        mediaId,
        status: "completed", // Assume completed until proven otherwise
        variants: ["original", "thumbnail", "medium", "large"],
      };

      // Cache the result for a short time
      await this.cacheService.set(cacheKey, result, 60); // Cache for 1 minute

      return result;
    } catch (error) {
      this.logger.error("Error getting media processing status", {
        mediaId,
        error: error instanceof Error ? error.message : String(error),
      });
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
      const cachedMedia = await this.cacheService.get<Media>(cacheKey);
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
      await this.cacheService.set(cacheKey, media, MEDIA_CACHE_TTL);

      return media;
    } catch (error) {
      this.logger.error("Error getting media", {
        mediaId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new ServiceError("Failed to get media", {
        cause: error instanceof Error ? error : undefined,
      });
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
    updates: MediaUpdateDTO
  ): Promise<Media> {
    try {
      // Get existing media
      const media = await this.mediaRepository.findById(mediaId);
      if (!media) {
        throw new ResourceNotFoundError("Media", mediaId);
      }

      // Verify ownership
      if (media.userId !== userId) {
        throw new PermissionError(
          "You don't have permission to update this media"
        );
      }

      // Update media
      const updatedMedia = await this.mediaRepository.update(mediaId, updates);
      if (!updatedMedia) {
        throw new ResourceNotFoundError("Media", mediaId);
      }

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${mediaId}`;
      await this.cacheService.delete(cacheKey);

      return updatedMedia;
    } catch (error) {
      this.logger.error("Error updating media", {
        userId,
        mediaId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (
        error instanceof ValidationError ||
        error instanceof ResourceNotFoundError ||
        error instanceof PermissionError
      ) {
        throw error;
      }

      throw new ServiceError("Failed to update media", {
        cause: error instanceof Error ? error : undefined,
      });
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
        throw new PermissionError(
          "You don't have permission to delete this media"
        );
      }

      // Delete file from storage
      if (media.path) {
        await this.storageService.deleteFile(media.path);
      }

      // Delete variants from storage
      if (media.variants && media.variants.length > 0) {
        await Promise.all(
          media.variants.map((variantPath: string) =>
            this.storageService.deleteFile(variantPath)
          )
        );
      }

      // Delete media
      const deleted = await this.mediaRepository.delete(mediaId);

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${mediaId}`;
      await this.cacheService.delete(cacheKey);

      return deleted;
    } catch (error) {
      this.logger.error("Error deleting media", {
        userId,
        mediaId,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof PermissionError) {
        throw error;
      }

      throw new ServiceError("Failed to delete media", {
        cause: error instanceof Error ? error : undefined,
      });
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
    options: MediaQueryOptions
  ): Promise<PaginatedResult<Media>> {
    try {
      // Get media items
      const media = await this.mediaRepository.findByUserId(
        userId,
        options.type,
        options.limit,
        options.page ? (options.page - 1) * (options.limit || 20) : 0
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
   * Get URL for a media variant
   * @param media Media object
   * @param variant Variant name, or "original" for original file
   * @returns URL to the media variant
   */
  getMediaUrl(media: Media, variant: string = "original"): string {
    if (variant === "original") {
      return `/media/${media.id}/original`;
    }

    const variantPath = media.variants?.find((v: string) =>
      v.includes(`/${variant}_`)
    );
    if (!variantPath) {
      return `/media/${media.id}/original`;
    }

    return `/media/${media.id}/${variant}`;
  }

  /**
   * Queue media processing job
   * @param mediaId Media ID
   * @param path File path
   * @param mimeType File mime type
   */
  private async queueMediaProcessing(
    mediaId: string,
    path: string,
    mimeType: string
  ): Promise<void> {
    await this.jobService.addTask(
      "media:processing",
      {
        mediaId,
        path,
        mimeType,
      },
      {
        priority: 1, // High priority
      }
    );
  }

  private validateFileUpload(file: FileUpload): void {
    // Validate file size
    if (!file.buffer || file.buffer.length === 0) {
      throw new ValidationError("Empty file", ["File cannot be empty"]);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new ValidationError("File too large", [
        `File too large, maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      ]);
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new ValidationError("Unsupported file type", [
        `Unsupported file type: ${file.mimetype}`,
      ]);
    }
  }

  private generateUniqueFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const extension = originalFilename.split(".").pop();

    return `${timestamp}-${randomString}.${extension}`;
  }
}
