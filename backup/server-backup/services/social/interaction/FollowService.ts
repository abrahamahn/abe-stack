import { CacheService } from "@/server/infrastructure/cache";
import { EntityType } from "@/server/database/models/shared/EntityTypes";
import { Follow } from "@/server/database/models/social/Follow";
import {
  NotificationType,
  Notification,
} from "@/server/database/models/social/Notification";
import { UserRepository } from "@/server/database/repositories/auth/UserRepository";
import {
  FollowRepository,
  NotificationRepository,
} from "@/server/database/repositories/social";
import { BaseService } from "@/server/services/shared";
import {
  ResourceNotFoundError,
  ValidationError,
} from "@/server/services/shared/errors/ServiceError";
import { MetricsService } from "@/server/services/shared/monitoring";

const FOLLOW_RATE_LIMIT = 100; // Max follows per hour
const CACHE_TTL = 3600; // 1 hour
const BATCH_SIZE = 100;

export interface FollowStats {
  followersCount: number;
  followingCount: number;
  mutualFollowersCount: number;
  lastFollowedAt?: Date;
  lastFollowerAt?: Date;
}

export interface FollowFilters extends PaginationOptions {
  startDate?: Date;
  endDate?: Date;
  mutualOnly?: boolean;
  limit: number;
  offset: number;
}

/**
 * Service responsible for managing user follow relationships.
 * Features:
 * 1. Follow/unfollow users
 * 2. Get followers/following lists
 * 3. Check follow status
 * 4. Get follow statistics
 * 5. Batch operations for follow status
 * 6. Caching for frequently accessed data
 * 7. Performance metrics tracking
 */
export class FollowService extends BaseService {
  constructor(
    private followRepository: FollowRepository,
    private userRepository: UserRepository,
    private notificationRepository: NotificationRepository,
    private metricsService: MetricsService,
    private cacheService: CacheService
  ) {
    super("FollowService");
  }

  /**
   * Follow a user
   * @param followerId - ID of the user who wants to follow
   * @param targetUserId - ID of the user to be followed
   */
  async followUser(followerId: string, targetUserId: string): Promise<Follow> {
    const startTime = Date.now();
    try {
      // Check rate limit
      const hourlyFollowCount =
        await this.followRepository.countFollowsInTimeRange(
          followerId,
          new Date(Date.now() - 3600000)
        );

      if (hourlyFollowCount >= FOLLOW_RATE_LIMIT) {
        throw new ValidationError("Follow rate limit exceeded");
      }

      // Validate users exist
      const [follower, targetUser] = await Promise.all([
        this.userRepository.findById(followerId),
        this.userRepository.findById(targetUserId),
      ]);

      if (!follower || !targetUser) {
        throw new ResourceNotFoundError(
          "User",
          !follower ? followerId : targetUserId
        );
      }

      if (followerId === targetUserId) {
        throw new ValidationError("Users cannot follow themselves");
      }

      // Check if already following with transaction
      const result = await this.withTransaction(async () => {
        const existingFollow = await this.followRepository.findByUserIds(
          followerId,
          targetUserId
        );
        if (existingFollow) {
          return existingFollow;
        }

        const follow = await this.followRepository.create({
          followerId,
          followingId: targetUserId,
          createdAt: new Date(),
        });

        // Create notification
        const notification = new Notification({
          type: NotificationType.FOLLOW,
          userId: targetUserId,
          actorId: followerId,
          entityType: EntityType.USER,
          entityId: followerId,
          content: `${follower.username} started following you`,
          read: false,
          delivered: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {},
        });
        await this.notificationRepository.create(notification);

        await this.invalidateFollowCache(followerId, targetUserId);
        return follow;
      });

      this.metricsService.recordLatency("follow_user", Date.now() - startTime);
      this.metricsService.incrementCounter("follows_created");
      return result;
    } catch (error) {
      this.metricsService.incrementCounter("follow_creation_error");
      throw error;
    }
  }

  /**
   * Unfollow a user
   * @param followerId - ID of the user who wants to unfollow
   * @param targetUserId - ID of the user to be unfollowed
   */
  async unfollowUser(followerId: string, targetUserId: string): Promise<void> {
    const startTime = Date.now();
    try {
      const follow = await this.followRepository.findByUserIds(
        followerId,
        targetUserId
      );
      if (!follow) {
        return;
      }

      await this.withTransaction(async () => {
        await this.followRepository.delete(follow.id);
        await this.invalidateFollowCache(followerId, targetUserId);
      });

      this.metricsService.recordLatency(
        "unfollow_user",
        Date.now() - startTime
      );
      this.metricsService.incrementCounter("follows_deleted");
    } catch (error) {
      this.metricsService.incrementCounter("unfollow_error");
      throw error;
    }
  }

  /**
   * Get followers of a user
   * @param userId - ID of the user
   * @param filters - Pagination options and filters
   */
  async getFollowers(
    userId: string,
    filters: FollowFilters = { limit: 20, offset: 0 }
  ): Promise<Follow[]> {
    const cacheKey = `followers:${userId}:${JSON.stringify(filters)}`;
    return this.withCache(
      cacheKey,
      async () => {
        const followers = await this.followRepository.findFollowers(userId, {
          limit: filters.limit,
          offset: filters.offset,
        });

        if (filters.mutualOnly) {
          const mutualFollowers = await Promise.all(
            followers.map(async (follow: Follow) => {
              const isMutual = await this.isFollowing(
                userId,
                follow.followerId
              );
              return isMutual ? follow : null;
            })
          );
          return mutualFollowers.filter((f): f is Follow => f !== null);
        }

        return followers;
      },
      CACHE_TTL
    );
  }

  /**
   * Get users that a user is following
   * @param userId - ID of the user
   * @param options - Pagination options
   */
  async getFollowing(
    userId: string,
    options: PaginationOptions
  ): Promise<Follow[]> {
    const cacheKey = `following:${userId}:${JSON.stringify(options)}`;
    return this.withCache(
      cacheKey,
      async () => {
        return this.followRepository.findFollowing(userId, {
          limit: options.limit ?? 20,
          offset: options.offset ?? 0,
        });
      },
      CACHE_TTL
    );
  }

  /**
   * Get follow statistics for a user
   * @param userId - ID of the user
   */
  async getFollowStats(userId: string): Promise<FollowStats> {
    const cacheKey = `follow_stats:${userId}`;
    return this.withCache(
      cacheKey,
      async () => {
        const [
          followersCount,
          followingCount,
          mutualFollowersCount,
          lastFollow,
          lastFollower,
        ] = await Promise.all([
          this.followRepository.countFollowers(userId),
          this.followRepository.countFollowing(userId),
          this.followRepository.countMutualFollowers(userId, userId),
          this.followRepository.findLastFollow(userId),
          this.followRepository.findLastFollower(userId),
        ]);

        return {
          followersCount,
          followingCount,
          mutualFollowersCount,
          lastFollowedAt: lastFollow?.createdAt,
          lastFollowerAt: lastFollower?.createdAt,
        };
      },
      CACHE_TTL
    );
  }

  /**
   * Check if one user follows another
   * @param followerId - ID of the potential follower
   * @param targetUserId - ID of the target user
   */
  async isFollowing(
    followerId: string,
    targetUserId: string
  ): Promise<boolean> {
    const cacheKey = `is_following:${followerId}:${targetUserId}`;
    return this.withCache(
      cacheKey,
      async () => {
        const follow = await this.followRepository.findByUserIds(
          followerId,
          targetUserId
        );
        return !!follow;
      },
      CACHE_TTL
    );
  }

  /**
   * Get mutual followers between two users
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @param options - Pagination options
   */
  async getMutualFollowers(
    userId1: string,
    userId2: string,
    options: PaginationOptions
  ): Promise<Follow[]> {
    const cacheKey = `mutual_followers:${userId1}:${userId2}:${JSON.stringify(options)}`;
    return this.withCache(
      cacheKey,
      async () => {
        return this.followRepository.findMutualFollowers(userId1, userId2, {
          limit: options.limit ?? 20,
          offset: options.offset ?? 0,
        });
      },
      CACHE_TTL
    );
  }

  /**
   * Batch check follow status for multiple users
   * @param followerId - ID of the potential follower
   * @param targetUserIds - IDs of users to check
   */
  async batchCheckFollowStatus(
    followerId: string,
    targetUserIds: string[]
  ): Promise<Map<string, boolean>> {
    const startTime = Date.now();
    try {
      const result = new Map<string, boolean>();
      const uniqueTargetIds = [...new Set(targetUserIds)];

      // Process in batches
      for (let i = 0; i < uniqueTargetIds.length; i += BATCH_SIZE) {
        const batch = uniqueTargetIds.slice(i, i + BATCH_SIZE);
        const follows = await this.followRepository.findFollowsByUserIds(
          followerId,
          batch
        );

        // Create a set of followed user IDs for quick lookup
        const followedIds = new Set(follows.map((f: Follow) => f.followingId));

        // Map results for this batch
        batch.forEach((targetId) => {
          result.set(targetId, followedIds.has(targetId));
        });
      }

      this.metricsService.recordLatency(
        "batch_check_follow_status",
        Date.now() - startTime
      );
      return result;
    } catch (error) {
      this.metricsService.incrementCounter("batch_check_follow_error");
      throw error;
    }
  }

  /**
   * Batch get follow statistics for multiple users
   * @param userIds - Array of user IDs to get stats for
   */
  async batchGetFollowStats(
    userIds: string[]
  ): Promise<Map<string, FollowStats>> {
    const startTime = Date.now();
    try {
      const result = new Map<string, FollowStats>();
      const uniqueUserIds = [...new Set(userIds)];

      // Process in batches
      for (let i = 0; i < uniqueUserIds.length; i += BATCH_SIZE) {
        const batch = uniqueUserIds.slice(i, i + BATCH_SIZE);

        // Get cached stats first
        const cachedStats = await Promise.all(
          batch.map(async (userId) => {
            const cacheKey = `follow_stats:${userId}`;
            return {
              userId,
              stats: await this.cacheService.get<FollowStats>(cacheKey),
            };
          })
        );

        // Filter out users that need stats calculated
        const uncachedUserIds = batch.filter(
          (userId) => !cachedStats.find((cs) => cs.userId === userId)?.stats
        );

        if (uncachedUserIds.length > 0) {
          // Get stats for uncached users
          const [
            followerCounts,
            followingCounts,
            mutualCounts,
            lastFollows,
            lastFollowers,
          ] = await Promise.all([
            this.followRepository.batchCountFollowers(uncachedUserIds),
            this.followRepository.batchCountFollowing(uncachedUserIds),
            this.followRepository.batchCountMutualFollowers(uncachedUserIds),
            this.followRepository.batchFindLastFollows(uncachedUserIds),
            this.followRepository.batchFindLastFollowers(uncachedUserIds),
          ]);

          // Calculate and cache stats for each uncached user
          await Promise.all(
            uncachedUserIds.map(async (userId) => {
              const stats: FollowStats = {
                followersCount: followerCounts.get(userId) || 0,
                followingCount: followingCounts.get(userId) || 0,
                mutualFollowersCount: mutualCounts.get(userId) || 0,
                lastFollowedAt: lastFollows.get(userId)?.createdAt,
                lastFollowerAt: lastFollowers.get(userId)?.createdAt,
              };

              const cacheKey = `follow_stats:${userId}`;
              await this.cacheService.set(cacheKey, stats, CACHE_TTL);
              result.set(userId, stats);
            })
          );
        }

        // Add cached stats to result
        cachedStats.forEach(({ userId, stats }) => {
          if (stats) {
            result.set(userId, stats);
          }
        });
      }

      this.metricsService.recordLatency(
        "batch_get_follow_stats",
        Date.now() - startTime
      );
      return result;
    } catch (error) {
      this.metricsService.incrementCounter("batch_get_follow_stats_error");
      throw error;
    }
  }

  /**
   * Invalidate follow-related cache entries
   * @param followerId - ID of the follower
   * @param targetUserId - ID of the target user
   */
  private async invalidateFollowCache(
    followerId: string,
    targetUserId: string
  ): Promise<void> {
    const keys = [
      `followers:${targetUserId}*`,
      `following:${followerId}*`,
      `follow_stats:${followerId}`,
      `follow_stats:${targetUserId}`,
      `is_following:${followerId}:${targetUserId}`,
      `mutual_followers:${followerId}:${targetUserId}*`,
      `mutual_followers:${targetUserId}:${followerId}*`,
      `follow_suggestions:${followerId}*`,
      `follow_suggestions:${targetUserId}*`,
    ];

    try {
      await Promise.all(keys.map((key) => this.cacheService.delete(key)));
    } catch (error) {
      this.metricsService.incrementCounter("cache_invalidation_error");
      // Log error but don't throw as cache invalidation shouldn't break the flow
      console.error("Failed to invalidate follow cache:", error);
    }
  }
}
