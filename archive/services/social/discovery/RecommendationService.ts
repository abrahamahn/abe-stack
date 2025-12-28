import { User } from "@/server/database/models/auth/User";
import { Group } from "@/server/database/models/community/Group";
import { Media } from "@/server/database/models/media/Media";
import { Post } from "@/server/database/models/social/Post";
import { UserRepository } from "@/server/database/repositories/auth/UserRepository";
import { GroupRepository } from "@/server/database/repositories/community/GroupRepository";
import { MediaRepository } from "@/server/database/repositories/media/MediaRepository";
import { HashtagRepository } from "@/server/database/repositories/social/HashtagRepository";
import { PostRepository } from "@/server/database/repositories/social/PostRepository";
import { CacheService } from "@/server/infrastructure/cache";
import { PaginatedResult, PaginationOptions } from "@/server/shared/types";
import { BaseService } from "@/server/services/shared";
import { MetricsService } from "@/server/services/shared/monitoring";

// Define location interface to replace any
export interface GeoLocation {
  lat: number;
  lng: number;
  radius?: number;
}

// Define extended repositories with missing methods to fix TypeScript errors
interface ExtendedUserRepository extends UserRepository {
  findFollowing(userId: string): Promise<User[]>;
  findFollowersByUserIds(userIds: string[], limit: number): Promise<User[]>;
  findFollowingByUserIds(userIds: string[], limit: number): Promise<User[]>;
  findByInterests(interests: string[], limit: number): Promise<User[]>;
  findPopular(limit: number): Promise<User[]>;
  findTrending(
    startDate: Date,
    endDate: Date,
    location?: GeoLocation,
    limit?: number
  ): Promise<User[]>;
}

interface ExtendedPostRepository extends PostRepository {
  findByUserIds(userIds: string[], limit: number): Promise<Post[]>;
  findByTags(tags: string[], limit: number): Promise<Post[]>;
  findPopular(limit: number): Promise<Post[]>;
  findTrending(
    startDate: Date,
    endDate: Date,
    location?: GeoLocation,
    limit?: number
  ): Promise<Post[]>;
}

interface ExtendedMediaRepository extends MediaRepository {
  findTrending(
    startDate: Date,
    endDate: Date,
    location?: GeoLocation,
    limit?: number
  ): Promise<Media[]>;
}

interface ExtendedGroupRepository extends GroupRepository {
  findByMemberId(userId: string): Promise<Group[]>;
  findByTags(tags: string[], limit: number): Promise<Group[]>;
  findPopular(limit: number): Promise<Group[]>;
  findByMemberIds(userIds: string[], limit: number): Promise<Group[]>;
  findTrending(
    startDate: Date,
    endDate: Date,
    location?: GeoLocation,
    limit?: number
  ): Promise<Group[]>;
}

// Create Hashtag type
export interface Hashtag {
  id: string;
  name: string;
  tags?: string[];
  trendingScore?: number;
  createdAt: Date;
}

interface ExtendedHashtagRepository extends HashtagRepository {
  findTrendingByDate(startDate?: Date, endDate?: Date): Promise<Hashtag[]>;
}

// Cache settings
const RECOMMENDATION_CACHE_TTL = 600; // 10 minutes
const TRENDING_CACHE_TTL = 1800; // 30 minutes
const CACHE_KEY_PREFIX = "recommendation:";

/**
 * Content recommendation types
 */
export enum ContentType {
  POST = "post",
  MEDIA = "media",
  USER = "user",
  GROUP = "group",
  HASHTAG = "hashtag",
}

/**
 * Recommendation filtering options
 */
export interface RecommendationFilters {
  contentTypes?: ContentType[];
  excludeIds?: string[];
  includeTags?: string[];
  excludeTags?: string[];
  maxAge?: number; // in days
  onlyFollowing?: boolean;
  includeExplicit?: boolean;
}

/**
 * User recommendation options
 */
export interface UserRecommendationOptions extends PaginationOptions {
  excludeIds?: string[];
  includeFollowersOf?: string[];
  includeFollowingOf?: string[];
  includeInteractedWith?: boolean;
  includeCommonInterests?: boolean;
  includePopular?: boolean;
  maxResults?: number;
}

/**
 * Trending content options
 */
export interface TrendingOptions extends PaginationOptions {
  timeframe?: "day" | "week" | "month";
  contentTypes?: ContentType[];
  location?: GeoLocation;
  excludeIds?: string[];
  excludeTags?: string[];
}

/**
 * Recommended content item
 */
export interface RecommendedItem {
  id: string;
  type: ContentType;
  score: number;
  createdAt: Date;
  metadata?: Record<string, unknown>;
  reasonCodes?: string[];
}

/**
 * Interface for user interaction data
 */
export interface UserInteraction {
  id: string;
  userId: string;
  targetId: string;
  type: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Interface for content interaction data
 */
export interface ContentInteraction {
  id: string;
  userId: string;
  contentId: string;
  contentType: string;
  type: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Interface for user profile data
 */
export interface UserProfile {
  userId: string;
  interests: string[];
  preferences: Record<string, unknown>;
  demographicData?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Repository interface for user interactions
 */
export interface UserInteractionRepository {
  findByUserId(userId: string, limit: number): Promise<UserInteraction[]>;
  findInteractedUsers(
    userId: string,
    interactionTypes: string[],
    limit?: number
  ): Promise<User[]>;
}

/**
 * Repository interface for content interactions
 */
export interface ContentInteractionRepository {
  findByUserId(userId: string, limit: number): Promise<ContentInteraction[]>;
  findByContentType(
    userId: string,
    contentType: string,
    limit: number
  ): Promise<ContentInteraction[]>;
}

/**
 * Repository interface for user profiles
 */
export interface UserProfileRepository {
  findByUserId(userId: string): Promise<UserProfile | null>;
}

/**
 * Service responsible for providing personalized recommendations across the platform.
 * Features:
 * 1. Content recommendations based on user behavior
 * 2. User recommendations for following
 * 3. Group and community recommendations
 * 4. Trending content detection
 * 5. Personalization algorithms
 */
export class RecommendationService extends BaseService {
  constructor(
    private userRepository: ExtendedUserRepository,
    private postRepository: ExtendedPostRepository,
    private mediaRepository: ExtendedMediaRepository,
    private groupRepository: ExtendedGroupRepository,
    private hashtagRepository: ExtendedHashtagRepository,
    private userInteractionRepository: UserInteractionRepository,
    private contentInteractionRepository: ContentInteractionRepository,
    private userProfileRepository: UserProfileRepository,
    private metricsService: MetricsService,
    private cacheService: CacheService
  ) {
    super("RecommendationService");
  }

  /**
   * Get personalized content recommendations for a user
   *
   * @param userId - ID of the user to get recommendations for
   * @param filters - Filters to apply to recommendations
   * @param options - Pagination options
   * @returns Array of recommended content items
   */
  async getPersonalizedRecommendations(
    userId: string,
    filters: RecommendationFilters = {},
    options: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<PaginatedResult<RecommendedItem>> {
    try {
      // Generate cache key
      const cacheKey = `${CACHE_KEY_PREFIX}personalized:${userId}:${this.generateCacheKey(filters, options)}`;

      // Try to get from cache
      const cachedResults =
        await this.cacheService.get<PaginatedResult<RecommendedItem>>(cacheKey);
      if (cachedResults) {
        return cachedResults;
      }

      // Get user's interactions for personalization
      const userInteractions =
        await this.userInteractionRepository.findByUserId(userId, 100);

      // Get content interactions (likes, comments, etc.)
      const contentInteractions =
        await this.contentInteractionRepository.findByUserId(userId, 200);

      // Get user's profile data for interests
      const userProfile = await this.userProfileRepository.findByUserId(userId);

      // Determine which content types to recommend
      const contentTypes = filters.contentTypes || Object.values(ContentType);

      // Initialize results array
      let recommendations: RecommendedItem[] = [];

      // Collect recommendations from different sources
      if (contentTypes.includes(ContentType.POST)) {
        const postRecommendations = await this.getPostRecommendations(
          userId,
          userInteractions,
          contentInteractions,
          userProfile
        );
        recommendations = [...recommendations, ...postRecommendations];
      }

      if (contentTypes.includes(ContentType.MEDIA)) {
        const mediaRecommendations = await this.getMediaRecommendations(
          userId,
          userInteractions,
          contentInteractions,
          userProfile
        );
        recommendations = [...recommendations, ...mediaRecommendations];
      }

      if (contentTypes.includes(ContentType.USER)) {
        const userRecommendations = await this.getUserRecommendations(
          userId,
          userInteractions,
          contentInteractions,
          userProfile
        );
        recommendations = [...recommendations, ...userRecommendations];
      }

      if (contentTypes.includes(ContentType.GROUP)) {
        const groupRecommendations = await this.getGroupRecommendations(
          userId,
          userInteractions,
          contentInteractions,
          userProfile
        );
        recommendations = [...recommendations, ...groupRecommendations];
      }

      if (contentTypes.includes(ContentType.HASHTAG)) {
        const hashtagRecommendations = await this.getHashtagRecommendations(
          userId,
          contentInteractions,
          userProfile
        );
        recommendations = [...recommendations, ...hashtagRecommendations];
      }

      // Apply filters
      let filteredRecommendations = recommendations;

      if (filters.excludeIds && filters.excludeIds.length > 0) {
        filteredRecommendations = filteredRecommendations.filter(
          (item) => !filters.excludeIds?.includes(item.id)
        );
      }

      if (filters.includeTags && filters.includeTags.length > 0) {
        filteredRecommendations = filteredRecommendations.filter((item) => {
          const tags = (item.metadata?.tags as string[]) || [];
          return filters.includeTags?.some((tag) => tags.includes(tag));
        });
      }

      if (filters.excludeTags && filters.excludeTags.length > 0) {
        filteredRecommendations = filteredRecommendations.filter((item) => {
          const tags = (item.metadata?.tags as string[]) || [];
          return !filters.excludeTags?.some((tag) => tags.includes(tag));
        });
      }

      if (filters.maxAge) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - filters.maxAge);
        filteredRecommendations = filteredRecommendations.filter(
          (item) => item.createdAt >= cutoffDate
        );
      }

      if (filters.onlyFollowing === true) {
        const followingIds = userInteractions
          .filter((interaction) => interaction.type === "follow")
          .map((interaction) => interaction.targetId);

        filteredRecommendations = filteredRecommendations.filter((item) => {
          if (item.type === ContentType.USER) {
            return followingIds.includes(item.id);
          } else {
            return followingIds.includes(item.metadata?.creatorId as string);
          }
        });
      }

      if (filters.includeExplicit === false) {
        filteredRecommendations = filteredRecommendations.filter(
          (item) => !item.metadata?.isExplicit
        );
      }

      // Sort by score (highest first)
      filteredRecommendations.sort((a, b) => b.score - a.score);

      // Apply pagination
      const total = filteredRecommendations.length;
      const startIndex =
        (options.page ? options.page - 1 : 0) * (options.limit || 20);
      const paginatedItems = filteredRecommendations.slice(
        startIndex,
        startIndex + (options.limit || 20)
      );

      const result = {
        items: paginatedItems,
        total,
        page: options.page || 1,
        limit: options.limit || 20,
        totalPages: Math.ceil(total / (options.limit || 20)),
      };

      // Cache the results
      await this.cacheService.set(cacheKey, result, RECOMMENDATION_CACHE_TTL);

      // Track metrics
      this.metricsService.recordOperationDuration(
        "recommendation_generation",
        1
      );

      return result;
    } catch (error) {
      this.logger.error("Error getting personalized recommendations", {
        userId,
        filters,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get recommended users to follow
   *
   * @param userId - ID of the user to get recommendations for
   * @param options - User recommendation options
   * @returns Array of recommended users
   */
  async getRecommendedUsers(
    userId: string,
    options: UserRecommendationOptions = {}
  ): Promise<PaginatedResult<User>> {
    try {
      // Generate cache key
      const cacheKey = `${CACHE_KEY_PREFIX}users:${userId}:${JSON.stringify(options)}`;

      // Try to get from cache
      const cachedResults =
        await this.cacheService.get<PaginatedResult<User>>(cacheKey);
      if (cachedResults) {
        return cachedResults;
      }

      // Get current user's following list to exclude them
      const following = await this.userRepository.findFollowing(userId);
      const followingIds = following.map((user) => user.id);

      // Create a set of excluded IDs
      const excludeIds = new Set([
        userId, // exclude self
        ...followingIds, // exclude already following
        ...(options.excludeIds || []), // exclude specified IDs
      ]);

      // Collect users from different recommendation sources
      let recommendedUsers: User[] = [];
      const userScores = new Map<string, number>();

      // 1. Followers of users the current user follows (2nd degree connections)
      if (options.includeFollowersOf?.length) {
        const secondDegreeUsers =
          await this.userRepository.findFollowersByUserIds(
            options.includeFollowersOf,
            50
          );

        for (const user of secondDegreeUsers) {
          if (!excludeIds.has(user.id)) {
            recommendedUsers.push(user);
            userScores.set(user.id, (userScores.get(user.id) || 0) + 2);
          }
        }
      }

      // 2. Users that followers of the current user are following
      if (options.includeFollowingOf?.length) {
        const secondDegreeUsers =
          await this.userRepository.findFollowingByUserIds(
            options.includeFollowingOf,
            50
          );

        for (const user of secondDegreeUsers) {
          if (!excludeIds.has(user.id)) {
            if (!recommendedUsers.some((u) => u.id === user.id)) {
              recommendedUsers.push(user);
            }
            userScores.set(user.id, (userScores.get(user.id) || 0) + 1.5);
          }
        }
      }

      // 3. Users the current user has interacted with but doesn't follow
      if (options.includeInteractedWith) {
        const interactedUsers =
          await this.userInteractionRepository.findInteractedUsers(
            userId,
            ["like", "comment", "share", "mention"],
            30
          );

        for (const user of interactedUsers) {
          if (!excludeIds.has(user.id)) {
            if (!recommendedUsers.some((u) => u.id === user.id)) {
              recommendedUsers.push(user);
            }
            userScores.set(user.id, (userScores.get(user.id) || 0) + 3);
          }
        }
      }

      // 4. Users with common interests
      if (options.includeCommonInterests) {
        const userProfile =
          await this.userProfileRepository.findByUserId(userId);
        const interests = userProfile?.interests || [];

        if (interests.length > 0) {
          const usersWithCommonInterests =
            await this.userRepository.findByInterests(interests, 50);

          for (const user of usersWithCommonInterests) {
            if (!excludeIds.has(user.id)) {
              if (!recommendedUsers.some((u) => u.id === user.id)) {
                recommendedUsers.push(user);
              }
              userScores.set(user.id, (userScores.get(user.id) || 0) + 2);
            }
          }
        }
      }

      // 5. Popular users
      if (options.includePopular) {
        const popularUsers = await this.userRepository.findPopular(30);

        for (const user of popularUsers) {
          if (!excludeIds.has(user.id)) {
            if (!recommendedUsers.some((u) => u.id === user.id)) {
              recommendedUsers.push(user);
            }
            userScores.set(user.id, (userScores.get(user.id) || 0) + 1);
          }
        }
      }

      // Sort by score
      recommendedUsers.sort((a, b) => {
        const scoreA = userScores.get(a.id) || 0;
        const scoreB = userScores.get(b.id) || 0;
        return scoreB - scoreA;
      });

      // Limit results
      const maxResults = options.maxResults || 100;
      if (recommendedUsers.length > maxResults) {
        recommendedUsers = recommendedUsers.slice(0, maxResults);
      }

      // Apply pagination
      const total = recommendedUsers.length;
      const page = options.page || 1;
      const limit = options.limit || 20;
      const startIndex = (page - 1) * limit;
      const paginatedItems = recommendedUsers.slice(
        startIndex,
        startIndex + limit
      );

      const result = {
        items: paginatedItems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };

      // Cache the results
      await this.cacheService.set(cacheKey, result, RECOMMENDATION_CACHE_TTL);

      return result;
    } catch (error) {
      this.logger.error("Error getting recommended users", {
        userId,
        options,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get trending content
   *
   * @param options - Trending options
   * @returns Array of trending content items
   */
  async getTrendingContent(
    options: TrendingOptions = {}
  ): Promise<PaginatedResult<RecommendedItem>> {
    try {
      // Generate cache key
      const cacheKey = `${CACHE_KEY_PREFIX}trending:${JSON.stringify(options)}`;

      // Try to get from cache
      const cachedResults =
        await this.cacheService.get<PaginatedResult<RecommendedItem>>(cacheKey);
      if (cachedResults) {
        return cachedResults;
      }

      // Determine time range for trending content
      const endDate = new Date();
      const startDate = new Date();
      switch (options.timeframe) {
        case "day":
          startDate.setDate(startDate.getDate() - 1);
          break;
        case "week":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "month":
        default:
          startDate.setMonth(startDate.getMonth() - 1);
          break;
      }

      // Determine which content types to include
      const contentTypes = options.contentTypes || Object.values(ContentType);

      // Initialize results array
      let trendingItems: RecommendedItem[] = [];

      // Get trending content for each type
      if (contentTypes.includes(ContentType.POST)) {
        const trendingPosts = await this.postRepository.findTrending(
          startDate,
          endDate,
          options.location,
          50
        );
        trendingItems = [
          ...trendingItems,
          ...trendingPosts.map((post) => ({
            id: post.id,
            type: ContentType.POST,
            score:
              typeof post.trendingScore === "number" ? post.trendingScore : 1,
            createdAt: post.createdAt,
            metadata: {
              creatorId: post.userId,
              title: post.title,
              tags: post.tags,
            },
            reasonCodes: ["trending"],
          })),
        ];
      }

      if (contentTypes.includes(ContentType.MEDIA)) {
        const trendingMedia = await this.mediaRepository.findTrending(
          startDate,
          endDate,
          options.location,
          50
        );
        trendingItems = [
          ...trendingItems,
          ...trendingMedia.map((media) => ({
            id: media.id,
            type: ContentType.MEDIA,
            score:
              typeof media.trendingScore === "number" ? media.trendingScore : 1,
            createdAt: media.createdAt,
            metadata: {
              creatorId: media.userId,
              title: media.title,
              tags: media.tags,
            },
            reasonCodes: ["trending"],
          })),
        ];
      }

      if (contentTypes.includes(ContentType.USER)) {
        const trendingUsers = await this.userRepository.findTrending(
          startDate,
          endDate,
          options.location,
          30
        );
        trendingItems = [
          ...trendingItems,
          ...trendingUsers.map((user) => ({
            id: user.id,
            type: ContentType.USER,
            score:
              typeof user.trendingScore === "number" ? user.trendingScore : 1,
            createdAt: user.createdAt,
            metadata: {
              creatorId: user.id,
              name: user.name,
              tags: user.tags,
            },
            reasonCodes: ["trending"],
          })),
        ];
      }

      if (contentTypes.includes(ContentType.GROUP)) {
        const trendingGroups = await this.groupRepository.findTrending(
          startDate,
          endDate,
          options.location,
          30
        );
        trendingItems = [
          ...trendingItems,
          ...trendingGroups.map((group) => ({
            id: group.id,
            type: ContentType.GROUP,
            score:
              typeof group.trendingScore === "number" ? group.trendingScore : 1,
            createdAt: group.createdAt,
            metadata: {
              creatorId: group.userId,
              name: group.name,
              tags: group.tags,
            },
            reasonCodes: ["trending"],
          })),
        ];
      }

      if (contentTypes.includes(ContentType.HASHTAG)) {
        const trendingHashtags =
          await this.hashtagRepository.findTrendingByDate(startDate, endDate);
        trendingItems = [
          ...trendingItems,
          ...trendingHashtags.map((hashtag) => ({
            id: hashtag.id,
            type: ContentType.HASHTAG,
            score:
              typeof hashtag.trendingScore === "number"
                ? hashtag.trendingScore
                : 1,
            createdAt: hashtag.createdAt,
            metadata: {
              name: hashtag.name,
              tags: hashtag.tags,
            },
            reasonCodes: ["trending"],
          })),
        ];
      }

      // Apply filters
      if (options.excludeIds && options.excludeIds.length > 0) {
        trendingItems = trendingItems.filter(
          (item) => !options.excludeIds?.includes(item.id)
        );
      }

      if (options.excludeTags && options.excludeTags.length > 0) {
        trendingItems = trendingItems.filter((item) => {
          const tags = (item.metadata?.tags as string[]) || [];
          return !options.excludeTags?.some((tag) => tags.includes(tag));
        });
      }

      // Sort by trending score (highest first)
      trendingItems.sort((a, b) => b.score - a.score);

      // Apply pagination
      const total = trendingItems.length;
      const page = options.page || 1;
      const limit = options.limit || 20;
      const startIndex = (page - 1) * limit;
      const paginatedItems = trendingItems.slice(
        startIndex,
        startIndex + limit
      );

      const result = {
        items: paginatedItems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };

      // Cache the results
      await this.cacheService.set(cacheKey, result, TRENDING_CACHE_TTL);

      // Track metrics
      this.metricsService.recordOperationDuration("trending_calculation", 1);

      return result;
    } catch (error) {
      this.logger.error("Error getting trending content", {
        options,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get recommended groups for a user
   *
   * @param userId - ID of the user to get recommendations for
   * @param options - Pagination options
   * @returns Array of recommended groups
   */
  async getRecommendedGroups(
    userId: string,
    options: PaginationOptions = {}
  ): Promise<PaginatedResult<Group>> {
    try {
      // Generate cache key
      const cacheKey = `${CACHE_KEY_PREFIX}groups:${userId}:${JSON.stringify(options)}`;

      // Try to get from cache
      const cachedResults =
        await this.cacheService.get<PaginatedResult<Group>>(cacheKey);
      if (cachedResults) {
        return cachedResults;
      }

      // Get user's existing groups to exclude them
      const userGroups = await this.groupRepository.findByMemberId(userId);
      const userGroupIds = userGroups.map((group) => group.id);

      // Get user's profile for interests
      const userProfile = await this.userProfileRepository.findByUserId(userId);
      const interests = userProfile?.interests || [];

      // Get user's following list
      const following = await this.userRepository.findFollowing(userId);
      const followingIds = following.map((user) => user.id);

      // Get groups from different sources with scoring
      const groupScores = new Map<string, number>();
      const recommendedGroups: Group[] = [];

      // 1. Groups based on user interests
      if (interests.length > 0) {
        const interestGroups = await this.groupRepository.findByTags(
          interests,
          30
        );

        for (const group of interestGroups) {
          if (!userGroupIds.includes(group.id)) {
            recommendedGroups.push(group);
            groupScores.set(group.id, (groupScores.get(group.id) || 0) + 3);
          }
        }
      }

      // 2. Popular groups
      const popularGroups = await this.groupRepository.findPopular(30);

      for (const group of popularGroups) {
        if (!userGroupIds.includes(group.id)) {
          if (!recommendedGroups.some((g) => g.id === group.id)) {
            recommendedGroups.push(group);
          }
          groupScores.set(group.id, (groupScores.get(group.id) || 0) + 1);
        }
      }

      // 3. Groups joined by users the current user follows
      if (followingIds.length > 0) {
        const followingGroups = await this.groupRepository.findByMemberIds(
          followingIds,
          30
        );

        for (const group of followingGroups) {
          if (!userGroupIds.includes(group.id)) {
            if (!recommendedGroups.some((g) => g.id === group.id)) {
              recommendedGroups.push(group);
            }
            groupScores.set(group.id, (groupScores.get(group.id) || 0) + 2);
          }
        }
      }

      // Sort by score
      recommendedGroups.sort((a, b) => {
        const scoreA = groupScores.get(a.id) || 0;
        const scoreB = groupScores.get(b.id) || 0;
        return scoreB - scoreA;
      });

      // Apply pagination
      const total = recommendedGroups.length;
      const page = options.page || 1;
      const limit = options.limit || 20;
      const startIndex = (page - 1) * limit;
      const paginatedItems = recommendedGroups.slice(
        startIndex,
        startIndex + limit
      );

      const result = {
        items: paginatedItems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };

      // Cache the results
      await this.cacheService.set(cacheKey, result, RECOMMENDATION_CACHE_TTL);

      return result;
    } catch (error) {
      this.logger.error("Error getting recommended groups", {
        userId,
        options,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate a cache key for recommendations
   *
   * @param filters - Recommendation filters
   * @param options - Pagination options
   * @returns Cache key string
   */
  private generateCacheKey(
    filters: RecommendationFilters,
    options: PaginationOptions
  ): string {
    return JSON.stringify({
      filters,
      page: options.page || 1,
      limit: options.limit || 20,
    });
  }

  /**
   * Get post recommendations for a user
   */
  private async getPostRecommendations(
    userId: string,
    userInteractions: UserInteraction[],
    _contentInteractions: ContentInteraction[],
    userProfile: UserProfile | null
  ): Promise<RecommendedItem[]> {
    try {
      // Get user's interests
      const interests = userProfile?.interests || [];

      // Get users the current user is following
      const followingInteractions = userInteractions.filter(
        (interaction) => interaction.type === "follow"
      );
      const followingIds = followingInteractions.map(
        (interaction) => interaction.targetId
      );

      // Get recommendations from different sources
      let recommendedPosts: RecommendedItem[] = [];

      // 1. Recent posts from followed users
      const followedUsersPosts = await this.postRepository.findByUserIds(
        followingIds,
        30
      );

      recommendedPosts = [
        ...recommendedPosts,
        ...followedUsersPosts.map((post) => ({
          id: post.id,
          type: ContentType.POST,
          score: 5,
          createdAt: post.createdAt,
          metadata: {
            creatorId: post.userId,
            title: post.title || "",
            tags: post.tags || [],
            isExplicit: post.isExplicit || false,
            interactionCount: post.interactionCount || 0,
          },
          reasonCodes: ["followed_user"],
        })),
      ];

      // 2. Posts with user's interests
      if (interests.length > 0) {
        const interestPosts = await this.postRepository.findByTags(
          interests,
          30
        );

        // Don't add duplicates
        const existingIds = new Set(recommendedPosts.map((post) => post.id));
        const newInterestPosts = interestPosts.filter(
          (post) => !existingIds.has(post.id)
        );

        recommendedPosts = [
          ...recommendedPosts,
          ...newInterestPosts.map((post) => ({
            id: post.id,
            type: ContentType.POST,
            score: 4,
            createdAt: post.createdAt,
            metadata: {
              creatorId: post.userId,
              title: post.title,
              tags: post.tags,
              isExplicit: post.isExplicit,
              interactionCount: post.interactionCount,
            },
            reasonCodes: ["interest_match"],
          })),
        ];
      }

      // 3. Popular posts
      const popularPosts = await this.postRepository.findPopular(20);

      // Don't add duplicates
      const existingIds = new Set(recommendedPosts.map((post) => post.id));
      const newPopularPosts = popularPosts.filter(
        (post) => !existingIds.has(post.id)
      );

      recommendedPosts = [
        ...recommendedPosts,
        ...newPopularPosts.map((post) => ({
          id: post.id,
          type: ContentType.POST,
          score: 3,
          createdAt: post.createdAt,
          metadata: {
            creatorId: post.userId,
            title: post.title,
            tags: post.tags,
            isExplicit: post.isExplicit,
            interactionCount: post.interactionCount,
          },
          reasonCodes: ["popular"],
        })),
      ];

      return recommendedPosts;
    } catch (error) {
      this.logger.error("Error getting post recommendations", {
        userId,
        error,
      });
      return [];
    }
  }

  /**
   * Get media recommendations for a user
   */
  private async getMediaRecommendations(
    userId: string,
    _userInteractions: UserInteraction[],
    _contentInteractions: ContentInteraction[],
    _userProfile: UserProfile | null
  ): Promise<RecommendedItem[]> {
    try {
      // Implementation similar to post recommendations but for media
      return [];
    } catch (error) {
      this.logger.error("Error getting media recommendations", {
        userId,
        error,
      });
      return [];
    }
  }

  /**
   * Get user recommendations for a user
   */
  private async getUserRecommendations(
    userId: string,
    _userInteractions: UserInteraction[],
    _contentInteractions: ContentInteraction[],
    _userProfile: UserProfile | null
  ): Promise<RecommendedItem[]> {
    try {
      // Implementation similar to post recommendations but for users
      return [];
    } catch (error) {
      this.logger.error("Error getting user recommendations", {
        userId,
        error,
      });
      return [];
    }
  }

  /**
   * Get group recommendations for a user
   */
  private async getGroupRecommendations(
    userId: string,
    _userInteractions: UserInteraction[],
    _contentInteractions: ContentInteraction[],
    _userProfile: UserProfile | null
  ): Promise<RecommendedItem[]> {
    try {
      // Implementation similar to post recommendations but for groups
      return [];
    } catch (error) {
      this.logger.error("Error getting group recommendations", {
        userId,
        error,
      });
      return [];
    }
  }

  /**
   * Get hashtag recommendations for a user
   */
  private async getHashtagRecommendations(
    userId: string,
    _contentInteractions: ContentInteraction[],
    _userProfile: UserProfile | null
  ): Promise<RecommendedItem[]> {
    try {
      // Implementation similar to post recommendations but for hashtags
      return [];
    } catch (error) {
      this.logger.error("Error getting hashtag recommendations", {
        userId,
        error,
      });
      return [];
    }
  }
}
