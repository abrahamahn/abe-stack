import { Bookmark, EntityType } from "@/server/database/models/social/Bookmark";
import { CacheService } from "@/server/infrastructure/cache";
import {
  BookmarkRepository,
  PostRepository,
} from "@/server/database/repositories/social";
import { BaseService } from "@/server/services/shared";
import { ResourceNotFoundError } from "@/server/services/shared/errors/ServiceError";
import { MetricsService } from "@/server/services/shared/monitoring";
const CACHE_TTL = 3600; // 1 hour
const BATCH_SIZE = 100;

export class BookmarkService extends BaseService {
  constructor(
    private bookmarkRepository: BookmarkRepository,
    private postRepository: PostRepository,
    private metricsService: MetricsService,
    private cacheService: CacheService
  ) {
    super("BookmarkService");
  }

  async bookmarkPost(userId: string, postId: string): Promise<Bookmark> {
    const startTime = Date.now();
    try {
      const post = await this.postRepository.findById(postId);
      if (!post) {
        throw new ResourceNotFoundError("Post", postId);
      }

      const existingBookmark = await this.bookmarkRepository.findByUserAndPost(
        userId,
        postId
      );
      if (existingBookmark) {
        return existingBookmark;
      }

      const result = await this.withTransaction(async () => {
        const bookmark = await this.bookmarkRepository.create({
          userId,
          entityId: postId,
          entityType: EntityType.POST,
          collectionId: null,
          notes: null,
        });

        await this.postRepository.incrementBookmarkCount(postId);
        await this.invalidateBookmarkCache(userId, postId);

        return bookmark;
      });

      this.metricsService.recordLatency(
        "bookmark_post",
        Date.now() - startTime
      );
      this.metricsService.incrementCounter("bookmarks_created");
      return result;
    } catch (error) {
      this.metricsService.incrementCounter("bookmark_creation_error");
      throw error;
    }
  }

  async unbookmarkPost(userId: string, postId: string): Promise<void> {
    const startTime = Date.now();
    try {
      const bookmark = await this.bookmarkRepository.findByUserAndPost(
        userId,
        postId
      );
      if (!bookmark) {
        return;
      }

      await this.withTransaction(async () => {
        await this.bookmarkRepository.delete(bookmark.id);
        await this.postRepository.decrementBookmarkCount(postId);
        await this.invalidateBookmarkCache(userId, postId);
      });

      this.metricsService.recordLatency(
        "unbookmark_post",
        Date.now() - startTime
      );
      this.metricsService.incrementCounter("bookmarks_deleted");
    } catch (error) {
      this.metricsService.incrementCounter("bookmark_deletion_error");
      throw error;
    }
  }

  async getUserBookmarks(
    userId: string,
    options: PaginationOptions
  ): Promise<Bookmark[]> {
    const cacheKey = `user_bookmarks:${userId}:${JSON.stringify(options)}`;
    return this.withCache(
      cacheKey,
      async () => {
        return this.bookmarkRepository.findByUserId(userId, options);
      },
      CACHE_TTL
    );
  }

  async isPostBookmarked(userId: string, postId: string): Promise<boolean> {
    const cacheKey = `bookmark_status:${userId}:${postId}`;
    return this.withCache(
      cacheKey,
      async () => {
        const bookmark = await this.bookmarkRepository.findByUserAndPost(
          userId,
          postId
        );
        return !!bookmark;
      },
      CACHE_TTL
    );
  }

  async getBookmarkCount(postId: string): Promise<number> {
    const cacheKey = `bookmark_count:${postId}`;
    return this.withCache(
      cacheKey,
      async () => {
        return this.bookmarkRepository.countByPost(postId);
      },
      CACHE_TTL
    );
  }

  async batchGetBookmarkStatus(
    userId: string,
    postIds: string[]
  ): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();

    // Process in batches to avoid overloading the database
    for (let i = 0; i < postIds.length; i += BATCH_SIZE) {
      const batch = postIds.slice(i, i + BATCH_SIZE);
      const bookmarks = await this.bookmarkRepository.findByUserAndPosts(
        userId,
        batch
      );

      // Create a set of bookmarked post IDs for faster lookup
      const bookmarkedPostIds = new Set(
        bookmarks.map((bookmark) => bookmark.postId)
      );

      // Map results
      batch.forEach((postId) => {
        result.set(postId, bookmarkedPostIds.has(postId));
      });
    }

    return result;
  }

  async batchGetBookmarkCounts(
    postIds: string[]
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();

    // Process in batches
    for (let i = 0; i < postIds.length; i += BATCH_SIZE) {
      const batch = postIds.slice(i, i + BATCH_SIZE);
      const counts = await this.bookmarkRepository.countByPosts(batch);

      // Map results
      counts.forEach(({ postId, count }) => {
        result.set(postId, count);
      });
    }

    return result;
  }

  private async invalidateBookmarkCache(
    userId: string,
    postId: string
  ): Promise<void> {
    const keys = [
      `user_bookmarks:${userId}*`,
      `bookmark_status:${userId}:${postId}`,
      `bookmark_count:${postId}`,
    ];
    await Promise.all(keys.map((key) => this.cacheService.delete(key)));
  }
}
