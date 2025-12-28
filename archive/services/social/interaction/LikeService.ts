import { EntityType } from "@/server/database/models/shared/EntityTypes";
import { Like, LikeTargetType } from "@/server/database/models/social/Like";
import {
  Notification,
  NotificationType,
} from "@/server/database/models/social/Notification";
import { CacheService } from "@/server/infrastructure/cache";
import {
  LikeRepository,
  CommentRepository,
  NotificationRepository,
  PostRepository,
} from "@/server/database/repositories/social";
import {
  BaseService,
  PostRateLimiter,
  PaginationOptions,
} from "@/server/services/shared";
import { ResourceNotFoundError } from "@/server/services/shared/errors/ServiceError";
import { MetricsService } from "@/server/services/shared/monitoring";

const CACHE_TTL = 3600; // 1 hour
const BATCH_SIZE = 100;

export class LikeService extends BaseService {
  private cacheService: CacheService;

  constructor(
    private likeRepository: LikeRepository,
    private postRepository: PostRepository,
    private commentRepository: CommentRepository,
    private notificationRepository: NotificationRepository,
    private metricsService: MetricsService,
    private rateLimiter: PostRateLimiter
  ) {
    super("LikeService");
    this.cacheService = CacheService.getInstance();
  }

  async likePost(userId: string, postId: string): Promise<Like> {
    const startTime = Date.now();
    try {
      await this.rateLimiter.checkLimit(userId);

      const post = await this.postRepository.findById(postId);
      if (!post) {
        throw new ResourceNotFoundError("Post", postId);
      }

      const existingLike = await this.likeRepository.findByUserAndTarget(
        userId,
        postId,
        LikeTargetType.POST
      );
      if (existingLike) {
        return existingLike;
      }

      const result = await this.withTransaction(async () => {
        const like = await this.likeRepository.create({
          userId,
          targetId: postId,
          targetType: LikeTargetType.POST,
        });

        await this.postRepository.updateLikeCount(postId, 1);

        if (post.userId !== userId) {
          const notification = new Notification({
            userId: post.userId,
            type: NotificationType.LIKE,
            entityType: EntityType.POST,
            entityId: postId,
            actorId: userId,
            content: `liked your post`,
            metadata: {},
            read: false,
            delivered: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await this.notificationRepository.create(notification);
        }

        await this.invalidatePostLikeCache(postId);
        return like;
      });

      this.metricsService.recordLatency("like_post", Date.now() - startTime);
      this.metricsService.incrementCounter("post_likes");
      return result;
    } catch (error) {
      this.metricsService.incrementCounter("post_likes_error");
      throw error;
    }
  }

  async unlikePost(userId: string, postId: string): Promise<void> {
    const startTime = Date.now();
    try {
      const like = await this.likeRepository.findByUserAndTarget(
        userId,
        postId,
        LikeTargetType.POST
      );
      if (!like) {
        return;
      }

      const post = await this.postRepository.findById(postId);
      if (!post) {
        return;
      }

      await this.withTransaction(async () => {
        await this.likeRepository.delete(like.id);
        await this.postRepository.updateLikeCount(postId, -1);
        await this.notificationRepository.deleteMany([postId], post.userId);
        await this.invalidatePostLikeCache(postId);
      });

      this.metricsService.recordLatency("unlike_post", Date.now() - startTime);
      this.metricsService.incrementCounter("unlike_post");
    } catch (error) {
      this.metricsService.incrementCounter("unlike_post_error");
      throw error;
    }
  }

  async likeComment(userId: string, commentId: string): Promise<Like> {
    const startTime = Date.now();
    try {
      await this.rateLimiter.checkLimit(userId);

      const comment = await this.commentRepository.findById(commentId);
      if (!comment) {
        throw new ResourceNotFoundError("Comment", commentId);
      }

      const existingLike = await this.likeRepository.findByUserAndTarget(
        userId,
        commentId,
        LikeTargetType.COMMENT
      );
      if (existingLike) {
        return existingLike;
      }

      const result = await this.withTransaction(async () => {
        const like = await this.likeRepository.create({
          userId,
          targetId: commentId,
          targetType: LikeTargetType.COMMENT,
        });

        await this.commentRepository.incrementLikeCount(commentId);

        if (comment.userId !== userId) {
          const notification = new Notification({
            userId: comment.userId,
            type: NotificationType.LIKE,
            entityType: EntityType.COMMENT,
            entityId: commentId,
            actorId: userId,
            content: `liked your comment`,
            metadata: {},
            read: false,
            delivered: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          await this.notificationRepository.create(notification);
        }

        await this.invalidatePostLikeCache(commentId);
        return like;
      });

      this.metricsService.recordLatency("like_comment", Date.now() - startTime);
      this.metricsService.incrementCounter("comment_likes");
      return result;
    } catch (error) {
      this.metricsService.incrementCounter("comment_likes_error");
      throw error;
    }
  }

  async unlikeComment(userId: string, commentId: string): Promise<void> {
    const startTime = Date.now();
    try {
      const like = await this.likeRepository.findByUserAndTarget(
        userId,
        commentId,
        LikeTargetType.COMMENT
      );
      if (!like) {
        return;
      }

      const comment = await this.commentRepository.findById(commentId);
      if (!comment) {
        return;
      }

      await this.withTransaction(async () => {
        await this.likeRepository.delete(like.id);
        await this.commentRepository.decrementLikeCount(commentId);
        await this.notificationRepository.deleteMany(
          [commentId],
          comment.userId
        );
        await this.invalidatePostLikeCache(commentId);
      });

      this.metricsService.recordLatency(
        "unlike_comment",
        Date.now() - startTime
      );
      this.metricsService.incrementCounter("unlike_comment");
    } catch (error) {
      this.metricsService.incrementCounter("unlike_comment_error");
      throw error;
    }
  }

  async getUserLikes(
    userId: string,
    targetType?: LikeTargetType,
    options: PaginationOptions = { limit: 20, offset: 0 }
  ): Promise<Like[]> {
    const cacheKey = `user_likes:${userId}:${targetType || "all"}`;
    return this.withCache(
      cacheKey,
      async () => {
        return this.likeRepository.getLikesByUser(
          userId,
          targetType,
          options.limit,
          options.offset
        );
      },
      CACHE_TTL
    );
  }

  async getLikesByTarget(
    targetId: string,
    targetType: LikeTargetType,
    options: PaginationOptions = { limit: 20, offset: 0 }
  ): Promise<Like[]> {
    const cacheKey = `target_likes:${targetType}:${targetId}`;
    return this.withCache(
      cacheKey,
      async () => {
        return this.likeRepository.getLikesForTarget(
          targetId,
          targetType,
          options.limit,
          options.offset
        );
      },
      CACHE_TTL
    );
  }

  async batchGetLikeStatus(
    userId: string,
    postIds: string[]
  ): Promise<Map<string, boolean>> {
    const result = new Map<string, boolean>();

    // Process in batches to avoid overloading the database
    for (let i = 0; i < postIds.length; i += BATCH_SIZE) {
      const batch = postIds.slice(i, i + BATCH_SIZE);
      const likes = await Promise.all(
        batch.map((postId) =>
          this.likeRepository.findByUserAndTarget(
            userId,
            postId,
            LikeTargetType.POST
          )
        )
      );

      // Create a set of liked post IDs for faster lookup
      const likedPostIds = new Set(
        likes
          .filter((like): like is Like => like !== null)
          .map((like) => like.targetId)
      );

      // Map results
      batch.forEach((postId) => {
        result.set(postId, likedPostIds.has(postId));
      });
    }

    return result;
  }

  private async invalidatePostLikeCache(targetId: string): Promise<void> {
    const keys = [
      `user_likes:*`,
      `target_likes:*:${targetId}`,
      `like_count:${targetId}`,
    ];

    await Promise.all(keys.map((key) => this.cacheService.delete(key)));
  }
}
