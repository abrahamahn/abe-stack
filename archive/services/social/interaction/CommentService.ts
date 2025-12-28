import {
  ContentStatus,
  EntityType,
} from "@/server/database/models/shared/EntityTypes";
import { Comment } from "@/server/database/models/social/Comment";
import {
  NotificationType,
  Notification,
} from "@/server/database/models/social/Notification";
import {
  CommentRepository,
  NotificationRepository,
  PostRepository,
} from "@/server/database/repositories/social";
import {
  BaseService,
  ContentValidator,
  PostRateLimiter,
  PaginationOptions,
} from "@/server/services/shared";
import { CacheService } from "@/server/infrastructure/cache";
import {
  ResourceNotFoundError,
  UnauthorizedError,
} from "@/server/services/shared/errors/ServiceError";
import { MetricsService } from "@/server/services/shared/monitoring";

const CACHE_TTL = 3600; // 1 hour
const BATCH_SIZE = 50;

export interface CreateCommentData {
  content: string;
  parentId?: string;
}

export interface UpdateCommentData {
  content: string;
}

export interface CommentThread {
  comment: Comment;
  replies: Comment[];
  totalReplies: number;
}

export class CommentService extends BaseService {
  private cacheService: CacheService;

  constructor(
    private commentRepository: CommentRepository,
    private postRepository: PostRepository,
    private notificationRepository: NotificationRepository,
    private metricsService: MetricsService,
    private rateLimiter: PostRateLimiter,
    private contentValidator: ContentValidator
  ) {
    super("CommentService");
    this.cacheService = CacheService.getInstance();
  }

  async createComment(
    userId: string,
    postId: string,
    data: CreateCommentData
  ): Promise<Comment> {
    const startTime = Date.now();
    try {
      await this.rateLimiter.checkLimit(userId);
      await this.contentValidator.isValidText(data.content);

      const post = await this.postRepository.findById(postId);
      if (!post) {
        throw new ResourceNotFoundError("Post", postId);
      }

      if (data.parentId) {
        const parentComment = await this.commentRepository.findById(
          data.parentId
        );
        if (!parentComment || parentComment.postId !== postId) {
          throw new ResourceNotFoundError("Comment", data.parentId);
        }
      }

      const result = await this.withTransaction(async () => {
        const comment = await this.commentRepository.create({
          userId,
          postId,
          content: data.content,
          parentId: data.parentId || null,
          likesCount: 0,
          status: ContentStatus.PUBLISHED,
        });

        await this.postRepository.incrementCommentCount(postId);

        if (data.parentId) {
          await this.commentRepository.incrementReplyCount(data.parentId);
        }

        if (post.userId !== userId) {
          const notification = new Notification({
            userId: post.userId,
            type: NotificationType.COMMENT,
            actorId: userId,
            entityId: postId,
            entityType: EntityType.POST,
            content: data.content,
            metadata: { commentId: comment.id },
          });
          await this.notificationRepository.create(notification);
        }

        if (data.parentId) {
          const parentComment = await this.commentRepository.findById(
            data.parentId
          );
          if (parentComment && parentComment.userId !== userId) {
            const notification = new Notification({
              userId: parentComment.userId,
              type: NotificationType.COMMENT,
              actorId: userId,
              entityId: data.parentId,
              entityType: EntityType.COMMENT,
              content: data.content,
              metadata: { commentId: comment.id },
            });
            await this.notificationRepository.create(notification);
          }
        }

        await this.invalidateCommentCache(postId, data.parentId);
        return comment;
      });

      this.metricsService.recordLatency(
        "create_comment",
        Date.now() - startTime
      );
      this.metricsService.incrementCounter("comments_created");
      return result;
    } catch (error) {
      this.metricsService.incrementCounter("comment_creation_error");
      throw error;
    }
  }

  async updateComment(
    userId: string,
    commentId: string,
    data: UpdateCommentData
  ): Promise<Comment> {
    const startTime = Date.now();
    try {
      const comment = await this.commentRepository.findById(commentId);
      if (!comment) {
        throw new ResourceNotFoundError("Comment", commentId);
      }

      if (comment.userId !== userId) {
        throw new UnauthorizedError("Not authorized to update this comment");
      }

      await this.contentValidator.isValidText(data.content);

      const updatedComment = await this.commentRepository.update(commentId, {
        content: data.content,
      });

      if (!updatedComment) {
        throw new ResourceNotFoundError("Comment", commentId);
      }

      await this.invalidateCommentCache(
        comment.postId,
        comment.parentId || undefined
      );

      this.metricsService.recordLatency(
        "update_comment",
        Date.now() - startTime
      );
      this.metricsService.incrementCounter("comments_updated");
      return updatedComment;
    } catch (error) {
      this.metricsService.incrementCounter("comment_update_error");
      throw error;
    }
  }

  async deleteComment(userId: string, commentId: string): Promise<void> {
    const startTime = Date.now();
    try {
      const comment = await this.commentRepository.findById(commentId);
      if (!comment) {
        throw new ResourceNotFoundError("Comment", commentId);
      }

      if (comment.userId !== userId) {
        throw new UnauthorizedError("Not authorized to delete this comment");
      }

      await this.withTransaction(async () => {
        await this.commentRepository.delete(commentId);
        await this.postRepository.decrementCommentCount(comment.postId);

        if (comment.parentId) {
          await this.commentRepository.decrementReplyCount(comment.parentId);
        }

        // Remove notifications related to this comment
        await this.notificationRepository.deleteByEntityId(
          commentId,
          EntityType.COMMENT
        );
        await this.invalidateCommentCache(
          comment.postId,
          comment.parentId || undefined
        );
      });

      this.metricsService.recordLatency(
        "delete_comment",
        Date.now() - startTime
      );
      this.metricsService.incrementCounter("comments_deleted");
    } catch (error) {
      this.metricsService.incrementCounter("comment_deletion_error");
      throw error;
    }
  }

  async getPostComments(
    postId: string,
    options: PaginationOptions
  ): Promise<Comment[]> {
    const cacheKey = `post_comments:${postId}:${JSON.stringify(options)}`;
    return this.withCache(
      cacheKey,
      async () => {
        const post = await this.postRepository.findById(postId);
        if (!post) {
          throw new ResourceNotFoundError("Post", postId);
        }

        return this.commentRepository.findByPostId({
          postId,
          limit: options.limit,
          offset: options.offset || 0,
        });
      },
      CACHE_TTL
    );
  }

  async getCommentThread(commentId: string): Promise<CommentThread> {
    const cacheKey = `comment_thread:${commentId}`;
    return this.withCache(
      cacheKey,
      async () => {
        const comment = await this.commentRepository.findById(commentId);
        if (!comment) {
          throw new ResourceNotFoundError("Comment", commentId);
        }

        const [replies, totalReplies] = await Promise.all([
          this.commentRepository.findByPostId({
            postId: comment.postId,
            parentId: commentId,
            limit: 5,
            offset: 0,
          }),
          this.commentRepository.countRepliesByParentId(commentId),
        ]);

        return {
          comment,
          replies,
          totalReplies,
        };
      },
      CACHE_TTL
    );
  }

  async getCommentReplies(
    commentId: string,
    options: PaginationOptions
  ): Promise<Comment[]> {
    const cacheKey = `comment_replies:${commentId}:${JSON.stringify(options)}`;
    return this.withCache(
      cacheKey,
      async () => {
        const comment = await this.commentRepository.findById(commentId);
        if (!comment) {
          throw new ResourceNotFoundError("Comment", commentId);
        }

        return this.commentRepository.findByPostId({
          postId: comment.postId,
          parentId: commentId,
          limit: options.limit,
          offset: options.offset || 0,
        });
      },
      CACHE_TTL
    );
  }

  async getUserComments(
    userId: string,
    options: PaginationOptions
  ): Promise<Comment[]> {
    const cacheKey = `user_comments:${userId}:${JSON.stringify(options)}`;
    return this.withCache(
      cacheKey,
      async () => {
        return this.commentRepository.findByUserId(userId, {
          limit: options.limit ?? 20,
          offset: options.offset,
        });
      },
      CACHE_TTL
    );
  }

  async batchGetCommentThreads(
    commentIds: string[]
  ): Promise<Map<string, CommentThread>> {
    const result = new Map<string, CommentThread>();

    for (let i = 0; i < commentIds.length; i += BATCH_SIZE) {
      const batch = commentIds.slice(i, i + BATCH_SIZE);
      const comments = await Promise.all(
        batch.map((id) => this.commentRepository.findById(id))
      );

      const validComments = comments.filter(
        (comment): comment is Comment => comment !== null
      );

      const repliesPromises = validComments.map((comment) =>
        Promise.all([
          this.commentRepository.findByPostId({
            postId: comment.postId,
            parentId: comment.id,
            limit: 5,
            offset: 0,
          }),
          this.commentRepository.countRepliesByParentId(comment.id),
        ])
      );

      const repliesResults = await Promise.all(repliesPromises);

      validComments.forEach((comment, index) => {
        const [replies, totalReplies] = repliesResults[index];
        result.set(comment.id, {
          comment,
          replies,
          totalReplies,
        });
      });
    }

    return result;
  }

  private async invalidateCommentCache(
    postId: string,
    parentId?: string
  ): Promise<void> {
    const keys = [`post_comments:${postId}*`, `comment_count:${postId}`];

    if (parentId) {
      keys.push(`comment_thread:${parentId}`, `comment_replies:${parentId}*`);
    }

    await Promise.all(keys.map((key) => this.cacheService.delete(key)));
  }
}
