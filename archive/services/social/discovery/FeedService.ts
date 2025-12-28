import { Post, PostVisibility } from "@/server/database/models/social/Post";
import {
  UserRepository,
  FollowRepository,
  HashtagRepository,
  PostRepository,
} from "@/server/database/repositories";
import { CacheService } from "@/server/infrastructure/cache";
import { HashtagService } from "@/server/services/social";
import { BaseService, PaginationOptions } from "@/server/services/shared";
import {
  ResourceNotFoundError,
  ValidationError,
} from "@/server/services/shared/errors/ServiceError";
import { MetricsService } from "@/server/services/shared/monitoring";

// Constants for performance and caching
const HOME_FEED_CACHE_TTL = 300; // 5 minutes
const EXPLORE_FEED_CACHE_TTL = 900; // 15 minutes
const DEFAULT_FEED_LIMIT = 20;
const MAX_FEED_LIMIT = 100;
const CACHE_KEY_PREFIX = "feed:";

// Interfaces for repository methods
interface PostRepositoryMethods {
  findPostsByUsers(
    userIds: string[],
    limit: number,
    offset: number,
    options: PostQueryOptions
  ): Promise<Post[]>;
  findPostsByUser(
    userId: string,
    limit: number,
    offset: number,
    options: PostQueryOptions
  ): Promise<Post[]>;
  findPostsByHashtag(
    tag: string,
    limit: number,
    offset: number,
    options: PostQueryOptions
  ): Promise<Post[]>;
  findPostsByHashtags(
    tags: string[],
    limit: number,
    offset: number,
    options: PostQueryOptions
  ): Promise<Post[]>;
  findTrendingPosts(
    limit: number,
    offset: number,
    options: PostQueryOptions
  ): Promise<Post[]>;
  findBookmarkedPosts(
    userId: string,
    limit: number,
    offset: number,
    options: PostQueryOptions
  ): Promise<Post[]>;
}

interface FollowRepositoryMethods {
  getFollowing(userId: string): Promise<Array<{ followingId: string }>>;
  isFollowing(followerId: string, followingId: string): Promise<boolean>;
}

interface HashtagRepositoryMethods {
  findHashtagsByUserLikes(userId: string, limit: number): Promise<string[]>;
  findHashtagsFollowedByUser(userId: string): Promise<string[]>;
}

interface MetricsServiceMethods {
  recordMetric(
    name: string,
    value: number,
    tags?: Record<string, string>
  ): void;
}

interface CacheManagerMethods {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl: number): Promise<void>;
  deletePattern(pattern: string): Promise<void>;
}

interface PostQueryOptions {
  startDate?: Date;
  endDate?: Date;
  visibility?: PostVisibility;
  excludedPostIds?: string[];
  minEngagementScore?: number;
}

/**
 * Interface for feed filtering and pagination
 */
export interface FeedOptions extends PaginationOptions {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  contentTypes?: string[];
  excludedUserIds?: string[];
  excludedPostIds?: string[];
  minEngagementScore?: number;
}

/**
 * Interface for normalized feed options with all fields required
 */
interface NormalizedFeedOptions
  extends Omit<Required<FeedOptions>, "startDate" | "endDate"> {
  startDate?: Date;
  endDate?: Date;
}

/**
 * Interface for feed response with posts and pagination info
 */
export interface FeedResponse {
  posts: Post[];
  hasMore: boolean;
  nextOffset?: number;
  totalEstimate?: number;
}

/**
 * Types of feed that can be requested
 */
export enum FeedType {
  HOME = "home", // Personalized feed for user's home page
  PROFILE = "profile", // Posts from a specific user profile
  EXPLORE = "explore", // Discovery feed with trending/recommended content
  HASHTAG = "hashtag", // Posts with a specific hashtag
  SAVED = "saved", // User's saved/bookmarked posts
  FOLLOWING = "following", // Posts only from users being followed
}

/**
 * Interface for user's feed preferences
 */
export interface FeedPreferences {
  showReposts: boolean;
  preferredContentTypes: string[];
  preferredTopics: string[];
  hideContentFrom: string[]; // User IDs to hide
  sortOrder: "recent" | "popular";
  allowAiRecommendations: boolean;
  contentFilters: {
    sensitiveContent: boolean;
    controversialTopics: boolean;
    explicitLanguage: boolean;
  };
}

/**
 * Service responsible for generating personalized feeds and content discovery.
 *
 * The FeedService orchestrates various data sources to create different types
 * of feeds, applying personalization, filtering, and ranking algorithms.
 */
export class FeedService extends BaseService {
  constructor(
    private postRepository: PostRepository & PostRepositoryMethods,
    private userRepository: UserRepository,
    private followRepository: FollowRepository & FollowRepositoryMethods,
    private hashtagRepository: HashtagRepository & HashtagRepositoryMethods,
    private hashtagService: HashtagService,
    private metricsService: MetricsService & MetricsServiceMethods,
    private cacheService: CacheService & CacheManagerMethods
  ) {
    super("FeedService");
  }

  /**
   * Get a user's personalized home feed
   *
   * @param userId The ID of the user requesting the feed
   * @param options Options for filtering and pagination
   * @returns Feed response with posts and pagination info
   */
  async getHomeFeed(
    userId: string,
    options: FeedOptions = { limit: DEFAULT_FEED_LIMIT, offset: 0 }
  ): Promise<FeedResponse> {
    const startTime = Date.now();
    try {
      // Validate user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ResourceNotFoundError("User", userId);
      }

      // Validate and normalize options
      const normalizedOptions = this.normalizeOptions(options);

      // Try to get cached feed if no custom filters are applied
      const isCacheable = this.isFeedCacheable(normalizedOptions);
      const cacheKey = `${CACHE_KEY_PREFIX}home:${userId}:${normalizedOptions.offset}:${normalizedOptions.limit}`;

      if (isCacheable) {
        const cachedFeed = await this.cacheService.get<FeedResponse>(cacheKey);
        if (cachedFeed) {
          this.logger.debug("Returned cached home feed", { userId });
          this.metricsService.recordMetric("feed_cache_hit", 1, {
            type: "home",
          });
          return cachedFeed;
        }
      }

      // Get IDs of users the current user follows
      const following = await this.followRepository.getFollowing(userId);
      const followingIds = following.map((follow) => follow.followingId);

      // If user isn't following anyone yet, mix in some recommended posts
      let posts: Post[] = [];

      if (followingIds.length === 0) {
        this.logger.debug("User follows no one, getting recommended posts", {
          userId,
        });
        posts = await this.getRecommendedPosts(userId, normalizedOptions);
      } else {
        // Get posts from followed users and include user's own posts
        const relevantUserIds = [...followingIds, userId];

        posts = await this.postRepository.findPostsByUsers(
          relevantUserIds,
          normalizedOptions.limit,
          normalizedOptions.offset,
          {
            startDate: normalizedOptions.startDate,
            endDate: normalizedOptions.endDate,
            visibility: PostVisibility.PUBLIC, // Only show public posts
            excludedPostIds: normalizedOptions.excludedPostIds,
          }
        );

        // If we don't have enough posts, add some recommended ones
        if (posts.length < normalizedOptions.limit) {
          const recommendedPosts = await this.getRecommendedPosts(userId, {
            ...normalizedOptions,
            limit: normalizedOptions.limit - posts.length,
            excludedPostIds: [
              ...(normalizedOptions.excludedPostIds || []),
              ...posts.map((p) => p.id),
            ],
          });

          posts = [...posts, ...recommendedPosts];
        }
      }

      // Apply any additional filters
      posts = this.applyContentFilters(posts, normalizedOptions);

      // Create the feed response
      const feedResponse: FeedResponse = {
        posts,
        hasMore: posts.length >= normalizedOptions.limit,
        nextOffset: normalizedOptions.offset + posts.length,
        totalEstimate: followingIds.length * 5, // Rough estimate of total available posts
      };

      // Cache the results if cacheable
      if (isCacheable) {
        await this.cacheService.set(
          cacheKey,
          feedResponse,
          HOME_FEED_CACHE_TTL
        );
      }

      // Record metrics
      this.metricsService.recordMetric(
        "feed_generation_time",
        Date.now() - startTime,
        {
          type: "home",
          userId,
        }
      );
      this.metricsService.recordMetric("feed_post_count", posts.length, {
        type: "home",
        userId,
      });

      return feedResponse;
    } catch (error) {
      this.logger.error("Error getting home feed", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      this.metricsService.recordMetric("feed_error", 1, {
        type: "home",
        userId,
        error: error instanceof Error ? error.name : "Unknown",
      });

      throw error;
    }
  }

  /**
   * Get posts for a user profile feed
   *
   * @param profileUserId The ID of the user whose profile is being viewed
   * @param viewerId Optional ID of the user viewing the profile
   * @param options Options for filtering and pagination
   * @returns Feed response with posts and pagination info
   */
  async getProfileFeed(
    profileUserId: string,
    viewerId?: string,
    options: FeedOptions = { limit: DEFAULT_FEED_LIMIT, offset: 0 }
  ): Promise<FeedResponse> {
    const startTime = Date.now();
    try {
      // Validate profile user exists
      const profileUser = await this.userRepository.findById(profileUserId);
      if (!profileUser) {
        throw new ResourceNotFoundError("User", profileUserId);
      }

      // Normalize options
      const normalizedOptions = this.normalizeOptions(options);

      // Determine visibility level based on relationship between viewer and profile
      let visibilityLevel: PostVisibility = PostVisibility.PUBLIC;

      if (viewerId) {
        // If viewing own profile, show everything
        if (viewerId === profileUserId) {
          visibilityLevel = PostVisibility.PRIVATE;
        } else {
          // Check if viewer follows profile user
          const isFollowing = await this.followRepository.isFollowing(
            viewerId,
            profileUserId
          );
          if (isFollowing) {
            visibilityLevel = PostVisibility.FOLLOWERS;
          }
        }
      }

      // Get posts for profile
      const posts = await this.postRepository.findPostsByUser(
        profileUserId,
        normalizedOptions.limit,
        normalizedOptions.offset,
        {
          startDate: normalizedOptions.startDate,
          endDate: normalizedOptions.endDate,
          visibility: visibilityLevel,
          excludedPostIds: normalizedOptions.excludedPostIds,
        }
      );

      // Create feed response
      const feedResponse: FeedResponse = {
        posts,
        hasMore: posts.length >= normalizedOptions.limit,
        nextOffset: normalizedOptions.offset + posts.length,
      };

      // Record metrics
      this.metricsService.recordMetric(
        "feed_generation_time",
        Date.now() - startTime,
        {
          type: "profile",
          profileUserId,
          viewerId: viewerId || "anonymous",
        }
      );

      return feedResponse;
    } catch (error) {
      this.logger.error("Error getting profile feed", {
        profileUserId,
        viewerId,
        error: error instanceof Error ? error.message : String(error),
      });

      this.metricsService.recordMetric("feed_error", 1, {
        type: "profile",
        profileUserId,
        viewerId: viewerId || "anonymous",
        error: error instanceof Error ? error.name : "Unknown",
      });

      throw error;
    }
  }

  /**
   * Get the explore feed for content discovery
   *
   * @param userId Optional ID of the user viewing the explore feed
   * @param options Options for filtering and pagination
   * @returns Feed response with posts and pagination info
   */
  async getExploreFeed(
    userId?: string,
    options: FeedOptions = { limit: DEFAULT_FEED_LIMIT, offset: 0 }
  ): Promise<FeedResponse> {
    const startTime = Date.now();
    try {
      // Normalize options
      const normalizedOptions = this.normalizeOptions(options);

      // Try to get cached feed for anonymous users or basic requests
      const isCacheable = !userId && this.isFeedCacheable(normalizedOptions);
      const cacheKey = `${CACHE_KEY_PREFIX}explore:${normalizedOptions.offset}:${normalizedOptions.limit}`;

      if (isCacheable) {
        const cachedFeed = await this.cacheService.get<FeedResponse>(cacheKey);
        if (cachedFeed) {
          this.logger.debug("Returned cached explore feed");
          this.metricsService.recordMetric("feed_cache_hit", 1, {
            type: "explore",
          });
          return cachedFeed;
        }
      }

      // Get trending posts
      const trendingPosts = await this.postRepository.findTrendingPosts(
        normalizedOptions.limit,
        normalizedOptions.offset,
        {
          startDate:
            normalizedOptions.startDate ||
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days by default
          endDate: normalizedOptions.endDate,
          excludedPostIds: normalizedOptions.excludedPostIds,
        }
      );

      // If we have a user ID, get user interests from their followed hashtags, liked posts, etc.
      let userInterests: string[] = [];
      if (userId) {
        userInterests = await this.getUserInterests(userId);
      }

      // Mix in some posts based on user interests if available
      let posts = trendingPosts;
      if (userId && userInterests.length > 0) {
        const interestPosts = await this.postRepository.findPostsByHashtags(
          userInterests,
          Math.floor(normalizedOptions.limit / 2),
          0,
          {
            excludedPostIds: [
              ...(normalizedOptions.excludedPostIds || []),
              ...trendingPosts.map((p) => p.id),
            ],
          }
        );

        // Intersperse interest-based posts with trending posts
        posts = this.interspersePosts(trendingPosts, interestPosts);

        // Ensure we don't exceed the limit
        if (posts.length > normalizedOptions.limit) {
          posts = posts.slice(0, normalizedOptions.limit);
        }
      }

      // Create feed response
      const feedResponse: FeedResponse = {
        posts,
        hasMore: posts.length >= normalizedOptions.limit,
        nextOffset: normalizedOptions.offset + posts.length,
      };

      // Cache the results if cacheable
      if (isCacheable) {
        await this.cacheService.set(
          cacheKey,
          feedResponse,
          EXPLORE_FEED_CACHE_TTL
        );
      }

      // Record metrics
      this.metricsService.recordMetric(
        "feed_generation_time",
        Date.now() - startTime,
        {
          type: "explore",
          userId: userId || "anonymous",
        }
      );

      return feedResponse;
    } catch (error) {
      this.logger.error("Error getting explore feed", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      this.metricsService.recordMetric("feed_error", 1, {
        type: "explore",
        userId: userId || "anonymous",
        error: error instanceof Error ? error.name : "Unknown",
      });

      throw error;
    }
  }

  /**
   * Get posts for a specific hashtag
   *
   * @param tag The hashtag to get posts for (without the # symbol)
   * @param userId Optional ID of the user viewing the hashtag feed
   * @param options Options for filtering and pagination
   * @returns Feed response with posts and pagination info
   */
  async getHashtagFeed(
    tag: string,
    userId?: string,
    options: FeedOptions = { limit: DEFAULT_FEED_LIMIT, offset: 0 }
  ): Promise<FeedResponse> {
    const startTime = Date.now();
    try {
      // Normalize the tag
      const normalizedTag = tag.toLowerCase().trim();
      if (!normalizedTag) {
        throw new ValidationError("Hashtag cannot be empty");
      }

      // Normalize options
      const normalizedOptions = this.normalizeOptions(options);

      // Get posts with the hashtag
      const posts = await this.postRepository.findPostsByHashtag(
        normalizedTag,
        normalizedOptions.limit,
        normalizedOptions.offset,
        {
          startDate: normalizedOptions.startDate,
          endDate: normalizedOptions.endDate,
          excludedPostIds: normalizedOptions.excludedPostIds,
        }
      );

      // Create feed response
      const feedResponse: FeedResponse = {
        posts,
        hasMore: posts.length >= normalizedOptions.limit,
        nextOffset: normalizedOptions.offset + posts.length,
      };

      // If the user is logged in, update hashtag stats to improve future recommendations
      if (userId) {
        this.hashtagService.createOrUpdateHashtag(normalizedTag).catch((err) =>
          this.logger.error("Error updating hashtag", {
            tag: normalizedTag,
            error: err,
          })
        );
      }

      // Record metrics
      this.metricsService.recordMetric(
        "feed_generation_time",
        Date.now() - startTime,
        {
          type: "hashtag",
          tag: normalizedTag,
          userId: userId || "anonymous",
        }
      );

      return feedResponse;
    } catch (error) {
      this.logger.error("Error getting hashtag feed", {
        tag,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      this.metricsService.recordMetric("feed_error", 1, {
        type: "hashtag",
        tag,
        userId: userId || "anonymous",
        error: error instanceof Error ? error.name : "Unknown",
      });

      throw error;
    }
  }

  /**
   * Get a feed of bookmarked posts for a user
   *
   * @param userId The ID of the user whose bookmarks to retrieve
   * @param options Options for filtering and pagination
   * @returns Feed response with posts and pagination info
   */
  async getSavedFeed(
    userId: string,
    options: FeedOptions = { limit: DEFAULT_FEED_LIMIT, offset: 0 }
  ): Promise<FeedResponse> {
    const startTime = Date.now();
    try {
      // Validate user exists
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new ResourceNotFoundError("User", userId);
      }

      // Normalize options
      const normalizedOptions = this.normalizeOptions(options);

      // Get user's bookmarked posts
      const posts = await this.postRepository.findBookmarkedPosts(
        userId,
        normalizedOptions.limit,
        normalizedOptions.offset,
        {
          startDate: normalizedOptions.startDate,
          endDate: normalizedOptions.endDate,
          excludedPostIds: normalizedOptions.excludedPostIds,
        }
      );

      // Create feed response
      const feedResponse: FeedResponse = {
        posts,
        hasMore: posts.length >= normalizedOptions.limit,
        nextOffset: normalizedOptions.offset + posts.length,
      };

      // Record metrics
      this.metricsService.recordMetric(
        "feed_generation_time",
        Date.now() - startTime,
        {
          type: "saved",
          userId,
        }
      );

      return feedResponse;
    } catch (error) {
      this.logger.error("Error getting saved feed", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      this.metricsService.recordMetric("feed_error", 1, {
        type: "saved",
        userId,
        error: error instanceof Error ? error.name : "Unknown",
      });

      throw error;
    }
  }

  /**
   * Get feed based on feed type and parameters
   *
   * @param type The type of feed to retrieve
   * @param userId Optional ID of the user requesting the feed
   * @param targetId Optional target ID (e.g., profile user ID or hashtag)
   * @param options Options for filtering and pagination
   * @returns Feed response with posts and pagination info
   */
  async getFeed(
    type: FeedType,
    userId?: string,
    targetId?: string,
    options: FeedOptions = { limit: DEFAULT_FEED_LIMIT, offset: 0 }
  ): Promise<FeedResponse> {
    switch (type) {
      case FeedType.HOME:
        if (!userId) {
          throw new ValidationError("User ID is required for home feed");
        }
        return this.getHomeFeed(userId, options);

      case FeedType.PROFILE:
        if (!targetId) {
          throw new ValidationError(
            "Target user ID is required for profile feed"
          );
        }
        return this.getProfileFeed(targetId, userId, options);

      case FeedType.EXPLORE:
        return this.getExploreFeed(userId, options);

      case FeedType.HASHTAG:
        if (!targetId) {
          throw new ValidationError("Hashtag is required for hashtag feed");
        }
        return this.getHashtagFeed(targetId, userId, options);

      case FeedType.SAVED:
        if (!userId) {
          throw new ValidationError("User ID is required for saved feed");
        }
        return this.getSavedFeed(userId, options);

      case FeedType.FOLLOWING:
        if (!userId) {
          throw new ValidationError("User ID is required for following feed");
        }
        // Use the home feed but with a filter to only show posts from followed users
        return this.getHomeFeed(userId, {
          ...options,
          excludedUserIds: [], // No excluded users for this feed type
        });

      default:
        throw new ValidationError(`Invalid feed type: ${type}`);
    }
  }

  /**
   * Get recommended posts for a user
   *
   * @param userId The ID of the user to get recommendations for
   * @param options Options for filtering and pagination
   * @returns Array of recommended posts
   */
  private async getRecommendedPosts(
    userId: string,
    options: FeedOptions
  ): Promise<Post[]> {
    // Get user interests (from likes, follows, etc.)
    const userInterests = await this.getUserInterests(userId);

    // If we have user interests, get some posts based on those
    if (userInterests.length > 0) {
      const interestPosts = await this.postRepository.findPostsByHashtags(
        userInterests,
        options.limit || DEFAULT_FEED_LIMIT / 2,
        0,
        {
          excludedPostIds: options.excludedPostIds,
          minEngagementScore: options.minEngagementScore || 0.5,
        }
      );

      // Also get some trending posts for variety
      const trendingPosts = await this.postRepository.findTrendingPosts(
        options.limit || DEFAULT_FEED_LIMIT / 2,
        0,
        {
          excludedPostIds: [
            ...(options.excludedPostIds || []),
            ...interestPosts.map((p) => p.id),
          ],
        }
      );

      // Combine and shuffle the posts
      return this.interspersePosts(interestPosts, trendingPosts);
    }

    // If no user interests, just return trending posts
    return this.postRepository.findTrendingPosts(
      options.limit || DEFAULT_FEED_LIMIT,
      options.offset || 0,
      {
        excludedPostIds: options.excludedPostIds,
      }
    );
  }

  /**
   * Get user interests based on their activity
   *
   * @param userId The ID of the user to get interests for
   * @returns Array of interests (usually hashtags)
   */
  private async getUserInterests(userId: string): Promise<string[]> {
    // This could involve multiple repositories and complex logic
    // For now, we'll implement a simplified version

    try {
      const [likedPostHashtags, followedHashtags] = await Promise.all([
        // Get hashtags from posts the user has liked
        this.hashtagRepository.findHashtagsByUserLikes(userId, 10),

        // Get hashtags the user explicitly follows
        this.hashtagRepository.findHashtagsFollowedByUser(userId),
      ]);

      // Combine and deduplicate hashtags
      const allTags = [...likedPostHashtags, ...followedHashtags];
      const uniqueTags = [...new Set(allTags.map((tag) => tag.toLowerCase()))];

      return uniqueTags;
    } catch (error) {
      this.logger.error("Error getting user interests", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return empty array on error
      return [];
    }
  }

  /**
   * Normalize feed options with defaults and validation
   *
   * @param options Raw feed options
   * @returns Normalized feed options
   */
  private normalizeOptions(options: FeedOptions): NormalizedFeedOptions {
    // Set defaults for pagination
    const limit = options.limit || DEFAULT_FEED_LIMIT;
    const offset = options.offset || 0;

    // Validate limit
    if (limit > MAX_FEED_LIMIT) {
      throw new ValidationError(`Feed limit cannot exceed ${MAX_FEED_LIMIT}`);
    }

    // Return normalized options
    return {
      limit,
      offset,
      page: options.page || 1,
      sortBy: options.sortBy || "createdAt",
      sortOrder: options.sortOrder || "desc",
      startDate: options.startDate,
      endDate: options.endDate,
      contentTypes: options.contentTypes || [],
      excludedUserIds: options.excludedUserIds || [],
      excludedPostIds: options.excludedPostIds || [],
      minEngagementScore: options.minEngagementScore || 0.5,
    };
  }

  /**
   * Check if feed can be cached based on options
   *
   * @param options Feed options
   * @returns Whether the feed can be cached
   */
  private isFeedCacheable(options: FeedOptions): boolean {
    // Cache if using default options without custom filters
    return (
      options.limit === DEFAULT_FEED_LIMIT &&
      !options.startDate &&
      !options.endDate &&
      !options.contentTypes &&
      !options.excludedUserIds &&
      !options.excludedPostIds &&
      !options.minEngagementScore
    );
  }

  /**
   * Apply content filters to posts
   *
   * @param posts Posts to filter
   * @param options Feed options with filters
   * @returns Filtered posts
   */
  private applyContentFilters(posts: Post[], options: FeedOptions): Post[] {
    // If no filters, return all posts
    if (
      !options.contentTypes &&
      !options.excludedUserIds &&
      !options.minEngagementScore
    ) {
      return posts;
    }

    return posts.filter((post) => {
      // Filter by content type if specified
      if (
        options.contentTypes &&
        options.contentTypes.length > 0 &&
        !options.contentTypes.includes(post.type)
      ) {
        return false;
      }

      // Filter out excluded users
      if (
        options.excludedUserIds &&
        options.excludedUserIds.includes(post.userId)
      ) {
        return false;
      }

      // Filter by engagement score if specified
      if (
        options.minEngagementScore &&
        this.calculateEngagementScore(post) < options.minEngagementScore
      ) {
        return false;
      }

      return true;
    });
  }

  /**
   * Calculate engagement score for a post
   *
   * @param post Post to calculate score for
   * @returns Engagement score between 0 and 1
   */
  private calculateEngagementScore(post: Post): number {
    const likes = post.likeCount || 0;
    const comments = post.commentCount || 0;
    const shares = post.shareCount || 0;
    const views = post.viewCount || 0;

    // Simple engagement formula
    if (views === 0) return 0;

    // Score based on like/view ratio, comment/view ratio, and share/view ratio
    const likeRatio = likes / views;
    const commentRatio = comments / views;
    const shareRatio = shares / views;

    // Weighted average (shares are worth more than comments, which are worth more than likes)
    const score = likeRatio * 0.3 + commentRatio * 0.4 + shareRatio * 0.7;

    // Normalize to 0-1 range (most posts will be under 0.2)
    return Math.min(score * 5, 1);
  }

  /**
   * Intersperse two arrays of posts for a mixed feed
   *
   * @param array1 First array of posts
   * @param array2 Second array of posts
   * @returns Combined and interspersed posts
   */
  private interspersePosts(array1: Post[], array2: Post[]): Post[] {
    const result: Post[] = [];
    const maxLength = Math.max(array1.length, array2.length);

    for (let i = 0; i < maxLength; i++) {
      if (i < array1.length) {
        result.push(array1[i]);
      }

      if (i < array2.length) {
        result.push(array2[i]);
      }
    }

    return result;
  }

  /**
   * Invalidate feed cache for a user
   *
   * @param userId The ID of the user whose feed cache to invalidate
   */
  async invalidateFeedCache(userId: string): Promise<void> {
    try {
      const cachePattern = `${CACHE_KEY_PREFIX}home:${userId}:*`;
      await this.cacheService.deletePattern(cachePattern);
      this.logger.debug("Invalidated feed cache", { userId });
    } catch (error) {
      this.logger.error("Error invalidating feed cache", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get feed preferences for a user
   *
   * @param userId The ID of the user to get preferences for
   * @returns User's feed preferences
   */
  async getFeedPreferences(userId: string): Promise<FeedPreferences> {
    try {
      // In a real implementation, this would get preferences from a database
      // For now, return default preferences

      return {
        showReposts: true,
        preferredContentTypes: [],
        preferredTopics: [],
        hideContentFrom: [],
        sortOrder: "recent",
        allowAiRecommendations: true,
        contentFilters: {
          sensitiveContent: false,
          controversialTopics: false,
          explicitLanguage: false,
        },
      };
    } catch (error) {
      this.logger.error("Error getting feed preferences", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return default preferences on error
      return {
        showReposts: true,
        preferredContentTypes: [],
        preferredTopics: [],
        hideContentFrom: [],
        sortOrder: "recent",
        allowAiRecommendations: true,
        contentFilters: {
          sensitiveContent: false,
          controversialTopics: false,
          explicitLanguage: false,
        },
      };
    }
  }

  /**
   * Update feed preferences for a user
   *
   * @param userId The ID of the user to update preferences for
   * @param preferences The new preferences
   */
  async updateFeedPreferences(
    userId: string,
    preferences: Partial<FeedPreferences>
  ): Promise<void> {
    try {
      // In a real implementation, this would update preferences in a database
      // For now, log the update
      this.logger.info("Updated feed preferences", { userId, preferences });

      // Invalidate any cached feeds for this user
      await this.invalidateFeedCache(userId);
    } catch (error) {
      this.logger.error("Error updating feed preferences", {
        userId,
        preferences,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }
}
