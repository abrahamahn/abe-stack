import {
  MediaCollection as Collection,
  CollectionPrivacy,
  CollectionType,
} from "@/server/database/models/media/MediaCollection";
import {
  MediaRepository,
  MediaCollectionRepository as CollectionRepository,
  UserRepository,
} from "@/server/database/repositories";
import { CacheService } from "@/server/infrastructure/cache";
import { PaginatedResult, PaginationOptions } from "@/server/shared/types";
import { BaseService } from "@/server/services/shared";
import {
  ResourceNotFoundError,
  ValidationError,
} from "@/server/services/shared/errors/ServiceError";
import { MetricsService } from "@/server/services/shared/monitoring";

// Constants
const COLLECTION_CACHE_TTL = 3600; // 1 hour
const CACHE_KEY_PREFIX = "collection:";

export interface CollectionCreateDTO {
  name: string;
  description?: string;
  privacy: CollectionPrivacy;
  coverMediaId?: string;
  tags?: string[];
}

export interface CollectionUpdateDTO {
  name?: string;
  description?: string;
  privacy?: CollectionPrivacy;
  coverMediaId?: string;
  tags?: string[];
}

export interface CollectionQueryOptions extends PaginationOptions {
  privacy?: CollectionPrivacy;
  tags?: string[];
  includeShared?: boolean;
}

/**
 * Service responsible for managing media collections.
 * Features:
 * 1. Collection CRUD operations
 * 2. Collection sharing and permissions
 * 3. Media organization within collections
 * 4. Collection recommendations
 * 5. Caching for frequently accessed collections
 */
export class MediaCollectionService extends BaseService {
  constructor(
    private collectionRepository: CollectionRepository,
    private mediaRepository: MediaRepository,
    private userRepository: UserRepository,
    private metricsService: MetricsService,
    private cacheService: CacheService
  ) {
    super("MediaCollectionService");
  }

  /**
   * Create a new collection
   *
   * @param userId - ID of the user creating the collection
   * @param data - Collection creation data
   * @returns Newly created collection
   */
  async createCollection(
    userId: string,
    data: CollectionCreateDTO
  ): Promise<Collection> {
    try {
      // Validate user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ResourceNotFoundError("User", userId);
      }

      // Validate cover media if provided
      if (data.coverMediaId) {
        const coverMedia = await this.mediaRepository.findById(
          data.coverMediaId
        );
        if (!coverMedia) {
          throw new ValidationError(
            `Cover media with ID ${data.coverMediaId} not found`
          );
        }
        if (coverMedia.userId !== userId) {
          throw new ValidationError(
            "You don't have permission to use this media as cover"
          );
        }
      }

      // Create collection
      const collection = await this.collectionRepository.create({
        ...data,
        userId,
        title: data.name,
        description: data.description || null,
        coverMediaId: data.coverMediaId || null,
        type: CollectionType.GALLERY,
        mediaIds: [],
      });

      // Track metrics
      this.metricsService.recordOperationDuration("collection_creation", 1);

      return collection;
    } catch (error) {
      this.logger.error("Error creating collection", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get collection by ID
   *
   * @param collectionId - ID of the collection to retrieve
   * @param userId - ID of the user requesting the collection
   * @returns Collection if found and accessible, null otherwise
   */
  async getCollection(
    collectionId: string,
    userId: string
  ): Promise<Collection | null> {
    try {
      // Try to get from cache
      const cacheKey = `${CACHE_KEY_PREFIX}${collectionId}`;
      const cachedCollection =
        await this.cacheService.get<Collection>(cacheKey);
      if (cachedCollection) {
        // Verify access
        if (this.canAccessCollection(cachedCollection, userId)) {
          this.metricsService.recordOperationDuration(
            "collection_cache_hit",
            1
          );
          return cachedCollection;
        }
        return null;
      }

      // Get from repository
      const collection = await this.collectionRepository.findById(collectionId);
      if (!collection || !this.canAccessCollection(collection, userId)) {
        return null;
      }

      // Cache the result
      await this.cacheService.set(cacheKey, collection, COLLECTION_CACHE_TTL);

      return collection;
    } catch (error) {
      this.logger.error("Error getting collection", {
        collectionId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update collection
   *
   * @param userId - ID of the user updating the collection
   * @param collectionId - ID of the collection to update
   * @param updates - Update data
   * @returns Updated collection
   */
  async updateCollection(
    userId: string,
    collectionId: string,
    updates: CollectionUpdateDTO
  ): Promise<Collection> {
    try {
      // Get existing collection
      const collection = await this.collectionRepository.findById(collectionId);
      if (!collection) {
        throw new ResourceNotFoundError("Collection", collectionId);
      }

      // Verify ownership
      if (collection.userId !== userId) {
        throw new ValidationError(
          "You don't have permission to update this collection"
        );
      }

      // Validate cover media if being updated
      if (updates.coverMediaId) {
        const coverMedia = await this.mediaRepository.findById(
          updates.coverMediaId
        );
        if (!coverMedia) {
          throw new ValidationError(
            `Cover media with ID ${updates.coverMediaId} not found`
          );
        }
        if (coverMedia.userId !== userId) {
          throw new ValidationError(
            "You don't have permission to use this media as cover"
          );
        }
      }

      // Update collection
      const updatedCollection = await this.collectionRepository.update(
        collectionId,
        {
          ...updates,
          updatedAt: new Date(),
        }
      );

      if (!updatedCollection) {
        throw new ResourceNotFoundError("Collection", collectionId);
      }

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${collectionId}`;
      await this.cacheService.delete(cacheKey);

      return updatedCollection;
    } catch (error) {
      this.logger.error("Error updating collection", {
        userId,
        collectionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete collection
   *
   * @param userId - ID of the user deleting the collection
   * @param collectionId - ID of the collection to delete
   * @returns true if deleted, false otherwise
   */
  async deleteCollection(
    userId: string,
    collectionId: string
  ): Promise<boolean> {
    try {
      // Get existing collection
      const collection = await this.collectionRepository.findById(collectionId);
      if (!collection) {
        return false;
      }

      // Verify ownership
      if (collection.userId !== userId) {
        throw new ValidationError(
          "You don't have permission to delete this collection"
        );
      }

      // Delete collection
      await this.collectionRepository.delete(collectionId);

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${collectionId}`;
      await this.cacheService.delete(cacheKey);

      // Track metrics
      this.metricsService.recordOperationDuration("collection_deletion", 1);

      return true;
    } catch (error) {
      this.logger.error("Error deleting collection", {
        userId,
        collectionId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Add media to collection
   *
   * @param userId - ID of the user adding media
   * @param collectionId - ID of the collection
   * @param mediaId - ID of the media to add
   */
  async addMediaToCollection(
    userId: string,
    collectionId: string,
    mediaId: string
  ): Promise<void> {
    try {
      // Get collection and media
      const [collection, media] = await Promise.all([
        this.collectionRepository.findById(collectionId),
        this.mediaRepository.findById(mediaId),
      ]);

      if (!collection) {
        throw new ResourceNotFoundError("Collection", collectionId);
      }
      if (!media) {
        throw new ResourceNotFoundError("Media", mediaId);
      }

      // Verify permissions
      if (collection.userId !== userId) {
        throw new ValidationError(
          "You don't have permission to modify this collection"
        );
      }

      // Add media to collection
      await this.collectionRepository.addMedia(collectionId, mediaId);

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${collectionId}`;
      await this.cacheService.delete(cacheKey);

      // Track metrics
      this.metricsService.recordOperationDuration(
        "collection_media_addition",
        1
      );
    } catch (error) {
      this.logger.error("Error adding media to collection", {
        userId,
        collectionId,
        mediaId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Remove media from collection
   *
   * @param userId - ID of the user removing media
   * @param collectionId - ID of the collection
   * @param mediaId - ID of the media to remove
   */
  async removeMediaFromCollection(
    userId: string,
    collectionId: string,
    mediaId: string
  ): Promise<void> {
    try {
      // Get collection
      const collection = await this.collectionRepository.findById(collectionId);
      if (!collection) {
        throw new ResourceNotFoundError("Collection", collectionId);
      }

      // Verify permissions
      if (collection.userId !== userId) {
        throw new ValidationError(
          "You don't have permission to modify this collection"
        );
      }

      // Remove media from collection
      await this.collectionRepository.removeMedia(collectionId, mediaId);

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${collectionId}`;
      await this.cacheService.delete(cacheKey);

      // Track metrics
      this.metricsService.recordOperationDuration(
        "collection_media_removal",
        1
      );
    } catch (error) {
      this.logger.error("Error removing media from collection", {
        userId,
        collectionId,
        mediaId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get user's collections
   *
   * @param userId - ID of the user
   * @param options - Query options
   * @returns Paginated collection results
   */
  async getUserCollections(
    userId: string,
    options: CollectionQueryOptions
  ): Promise<PaginatedResult<Collection>> {
    try {
      const collections = await this.collectionRepository.findByUserId(
        userId,
        options.limit || 20,
        options.page ? (options.page - 1) * (options.limit || 20) : 0,
        CollectionType.GALLERY
      );

      // Track metrics
      this.metricsService.recordOperationDuration("collection_retrieval", 1);

      return {
        items: collections,
        total: collections.length,
        page: options.page || 1,
        limit: options.limit || 20,
        totalPages: Math.ceil(collections.length / (options.limit || 20)),
      };
    } catch (error) {
      this.logger.error("Error getting user collections", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Share collection with users
   *
   * @param userId - ID of the collection owner
   * @param collectionId - ID of the collection to share
   * @param targetUserIds - IDs of users to share with
   */
  async shareCollection(
    userId: string,
    collectionId: string,
    targetUserIds: string[]
  ): Promise<void> {
    try {
      // Get collection
      const collection = await this.collectionRepository.findById(collectionId);
      if (!collection) {
        throw new ResourceNotFoundError("Collection", collectionId);
      }

      // Verify ownership
      if (collection.userId !== userId) {
        throw new ValidationError(
          "You don't have permission to share this collection"
        );
      }

      // Verify target users exist
      const users = await Promise.all(
        targetUserIds.map((id) => this.userRepository.findById(id))
      );
      if (users.some((user) => !user)) {
        throw new ValidationError("One or more target users not found");
      }

      // Update collection with shared users
      await this.collectionRepository.update(collectionId, {
        metadata: {
          ...collection.metadata,
          sharedWith: targetUserIds,
        },
      });

      // Track metrics
      this.metricsService.recordOperationDuration("collection_share", 1);

      // Invalidate cache
      const cacheKey = `${CACHE_KEY_PREFIX}${collectionId}`;
      await this.cacheService.delete(cacheKey);
    } catch (error) {
      this.logger.error("Error sharing collection", {
        userId,
        collectionId,
        targetUserIds,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if a user can access a collection
   *
   * @param collection - Collection to check
   * @param userId - ID of the user
   * @returns Whether the user can access the collection
   */
  private canAccessCollection(collection: Collection, userId: string): boolean {
    return (
      collection.privacy === CollectionPrivacy.PUBLIC ||
      collection.userId === userId ||
      ((collection.metadata?.sharedWith as string[]) || []).includes(userId)
    );
  }
}
