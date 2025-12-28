import { CacheService } from "@/server/infrastructure/cache";

import { Media } from "@/server/database/models/media/Media";
import { MediaRepository } from "@/server/database/repositories/media/MediaRepository";
import { MediaTagRepository } from "@/server/database/repositories/media/MediaTagRepository";
import { HashtagRepository } from "@/server/database/repositories/social/HashtagRepository";
import { Logger, IServiceLogger } from "@/server/infrastructure/logging";
import { BaseService } from "@/server/services/shared/base/BaseService";
import {
  ResourceNotFoundError,
  ValidationError,
} from "@/server/services/shared/errors/ServiceError";
import { MetricsService } from "@/server/services/shared/monitoring";

// Constants
const TAG_CACHE_TTL = 3600; // 1 hour
const CACHE_KEY_PREFIX = "tag:";
const MAX_TAGS_PER_MEDIA = 20;
const MIN_TAG_LENGTH = 2;
const MAX_TAG_LENGTH = 50;

interface TagQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: "popularity" | "recent";
}

/**
 * Service responsible for managing media tags.
 * Features:
 * 1. Media tagging system
 * 2. Tag-based search
 * 3. Tag recommendations
 * 4. Tag trending and analytics
 * 5. Caching for frequently accessed tags
 */
export class MediaTagService extends BaseService {
  private static instance: MediaTagService;

  private constructor(
    private mediaRepository: MediaRepository,
    private hashtagRepository: HashtagRepository,
    private mediaTagRepository: MediaTagRepository,
    private cacheService: CacheService,
    private metricsService: MetricsService,
    protected logger: IServiceLogger
  ) {
    super("MediaTagService");
  }

  public static getInstance(): MediaTagService {
    if (!MediaTagService.instance) {
      MediaTagService.instance = new MediaTagService(
        new MediaRepository(),
        HashtagRepository.getInstance(),
        MediaTagRepository.getInstance(),
        CacheService.getInstance(),
        MetricsService.getInstance(),
        Logger.getInstance().createServiceLogger("MediaTagService")
      );
    }
    return MediaTagService.instance;
  }

  /**
   * Add tags to a media item
   */
  async addTagsToMedia(
    userId: string,
    mediaId: string,
    tags: string[]
  ): Promise<void> {
    try {
      // Validate media exists and user has permission
      const media = await this.mediaRepository.findById(mediaId);
      if (!media) {
        throw new ResourceNotFoundError("Media", mediaId);
      }
      if (media.userId !== userId) {
        throw new ValidationError(
          "You don't have permission to add tags to this media"
        );
      }

      // Validate tags
      this.validateTags(tags);

      // Get existing tags
      const existingTags = await this.getMediaTags(mediaId);
      if (existingTags.length + tags.length > MAX_TAGS_PER_MEDIA) {
        throw new ValidationError(
          `Cannot exceed ${MAX_TAGS_PER_MEDIA} tags per media`
        );
      }

      // Process each tag
      for (const tag of tags) {
        // Find or create hashtag
        const hashtag = await this.hashtagRepository.findOrCreate(tag);

        // Add tag to media
        await this.mediaTagRepository.addTagToMedia(mediaId, hashtag.id);
      }

      // Invalidate cache
      await this.invalidateTagCaches(mediaId);

      // Track metrics
      this.metricsService.recordOperationDuration("tag_addition", tags.length);
    } catch (error) {
      this.logger.error("Error adding tags to media", {
        userId,
        mediaId,
        tags,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Remove tags from a media item
   */
  async removeTagsFromMedia(
    userId: string,
    mediaId: string,
    tags: string[]
  ): Promise<void> {
    try {
      // Validate media exists and user has permission
      const media = await this.mediaRepository.findById(mediaId);
      if (!media) {
        throw new ResourceNotFoundError("Media", mediaId);
      }
      if (media.userId !== userId) {
        throw new ValidationError(
          "You don't have permission to remove tags from this media"
        );
      }

      // Process each tag
      for (const tag of tags) {
        const hashtag = await this.hashtagRepository.findByTag(tag);
        if (hashtag) {
          await this.mediaTagRepository.removeTagFromMedia(mediaId, hashtag.id);
        }
      }

      // Invalidate cache
      await this.invalidateTagCaches(mediaId);

      // Track metrics
      this.metricsService.recordOperationDuration("tag_removal", tags.length);
    } catch (error) {
      this.logger.error("Error removing tags from media", {
        userId,
        mediaId,
        tags,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get tags for a media item
   */
  async getMediaTags(mediaId: string): Promise<string[]> {
    try {
      // Try to get from cache
      const cacheKey = `${CACHE_KEY_PREFIX}${mediaId}`;
      const cachedTags = await this.cacheService.get<string[]>(cacheKey);
      if (cachedTags) {
        return cachedTags;
      }

      // Get from repository
      const tags = await this.mediaTagRepository.getMediaTags(mediaId);

      // Cache the result
      await this.cacheService.set(cacheKey, tags, TAG_CACHE_TTL);

      return tags;
    } catch (error) {
      this.logger.error("Error getting media tags", {
        mediaId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Search media by tags
   */
  async searchMediaByTags(
    tags: string[],
    options: TagQueryOptions = {}
  ): Promise<Media[]> {
    try {
      const limit = options.limit || 20;
      const offset = options.offset || 0;

      // Get media IDs for the first tag
      const mediaIds = await this.mediaTagRepository.getMediaByTag(
        tags[0],
        limit,
        offset
      );

      // If there are more tags, filter by them
      let filteredMediaIds = mediaIds;
      for (let i = 1; i < tags.length; i++) {
        const tagMediaIds = await this.mediaTagRepository.getMediaByTag(
          tags[i],
          limit,
          offset
        );
        filteredMediaIds = filteredMediaIds.filter((id) =>
          tagMediaIds.includes(id)
        );
      }

      // Get media objects
      const media = await Promise.all(
        filteredMediaIds.map((id) => this.mediaRepository.findById(id))
      );

      // Track metrics
      this.metricsService.recordOperationDuration("tag_search", 1);

      return media.filter((m): m is Media => m !== null);
    } catch (error) {
      this.logger.error("Error searching media by tags", {
        tags,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get trending tags
   */
  async getTrendingTags(limit: number = 10): Promise<string[]> {
    try {
      const tags = await this.hashtagRepository.findTrending(limit);
      return tags.map((t): string => t.tag);
    } catch (error) {
      this.logger.error("Error getting trending tags", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Validate tags
   */
  private validateTags(tags: string[]): void {
    if (!Array.isArray(tags) || tags.length === 0) {
      throw new ValidationError("At least one tag is required");
    }

    const uniqueTags = new Set(tags);
    if (uniqueTags.size !== tags.length) {
      throw new ValidationError("Duplicate tags are not allowed");
    }

    for (const tag of tags) {
      if (typeof tag !== "string") {
        throw new ValidationError("All tags must be strings");
      }
      if (tag.length < MIN_TAG_LENGTH) {
        throw new ValidationError(
          `Tag must be at least ${MIN_TAG_LENGTH} characters long`
        );
      }
      if (tag.length > MAX_TAG_LENGTH) {
        throw new ValidationError(
          `Tag cannot exceed ${MAX_TAG_LENGTH} characters`
        );
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(tag)) {
        throw new ValidationError(
          "Tags can only contain letters, numbers, underscores, and hyphens"
        );
      }
    }
  }

  /**
   * Invalidate tag-related caches for a media item
   */
  private async invalidateTagCaches(mediaId: string): Promise<void> {
    const cacheKey = `${CACHE_KEY_PREFIX}${mediaId}`;
    await this.cacheService.delete(cacheKey);
  }
}

// Export a singleton instance
export const mediaTagService = MediaTagService.getInstance();
