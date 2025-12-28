import { CacheService } from "@/server/infrastructure/cache";
import {
  Hashtag,
  HashtagCategory,
} from "@/server/database/models/social/Hashtag";
import { HashtagRepository } from "@/server/database/repositories/social/HashtagRepository";
import { PostRepository } from "@/server/database/repositories/social/PostRepository";
import { BaseService } from "@/server/services/shared";
import {
  ResourceNotFoundError,
  ValidationError,
} from "@/server/services/shared/errors/ServiceError";
import { MetricsService } from "@/server/services/shared/monitoring";

const CACHE_TTL = 3600; // 1 hour
const TRENDING_CACHE_TTL = 300; // 5 minutes
const ANALYTICS_CACHE_TTL = 86400; // 24 hours
const BATCH_SIZE = 100;
const MAX_HASHTAGS_PER_POST = 30;
const MIN_TAG_LENGTH = 2;
const MAX_TAG_LENGTH = 50;

export interface HashtagStats {
  usageCount: number;
  postsCount: number;
  uniqueUsers: number;
  category: HashtagCategory;
  avgEngagement: number;
  lastUsedAt: Date;
}

export interface TrendingHashtag extends HashtagStats {
  tag: string;
  momentum: number;
  normalizedScore: number;
  velocityScore: number;
  peakUsageTime: string;
}

export interface HashtagAnalytics {
  hourlyUsage: Map<number, number>;
  dailyUsage: Map<string, number>;
  topUsers: Array<{ userId: string; count: number }>;
  relatedTags: Array<{ tag: string; correlation: number }>;
  engagementRate: number;
}

/**
 * Service responsible for managing hashtags and trends.
 * Features:
 * 1. Hashtag creation and management
 * 2. Trending hashtag calculation
 * 3. Hashtag search and suggestions
 * 4. Usage statistics and analytics
 * 5. Batch operations
 * 6. Caching with different TTLs
 * 7. Performance metrics tracking
 */
export class HashtagService extends BaseService {
  constructor(
    private hashtagRepository: HashtagRepository,
    private postRepository: PostRepository,
    private metricsService: MetricsService,
    private cacheService: CacheService
  ) {
    super("HashtagService");
  }

  /**
   * Create or update a hashtag
   * @param tag - The hashtag text (without #)
   * @param category - Optional category for the hashtag
   */
  async createOrUpdateHashtag(
    tag: string,
    category?: HashtagCategory
  ): Promise<Hashtag> {
    const startTime = Date.now();
    try {
      // Validate tag
      if (!this.isValidTag(tag)) {
        throw new ValidationError("Invalid hashtag format");
      }

      const normalizedTag = this.normalizeTag(tag);
      let hashtag = await this.hashtagRepository.findByTag(normalizedTag);

      if (hashtag && category && category !== hashtag.category) {
        hashtag = await this.withTransaction(async () => {
          const updated = await this.hashtagRepository.update(hashtag!.id, {
            category,
            lastUsedAt: new Date(),
          });
          await this.invalidateHashtagCache(normalizedTag);
          return updated;
        });
      }

      if (hashtag) {
        return hashtag;
      }

      const result = await this.hashtagRepository.create(
        new Hashtag({
          tag,
          normalizedTag,
          category: category || HashtagCategory.GENERAL,
          usageCount: 0,
        })
      );

      this.metricsService.recordOperationDuration(
        "create_hashtag",
        Date.now() - startTime
      );
      return result;
    } catch (error) {
      this.metricsService.recordOperationError(
        "create_hashtag",
        (error as Error).name
      );
      throw error;
    }
  }

  /**
   * Extract and process hashtags from text
   * @param text - Text containing hashtags
   */
  async processHashtags(
    text: string,
    _postId: string,
    _userId: string
  ): Promise<Hashtag[]> {
    const startTime = Date.now();
    try {
      const tags = this.extractHashtags(text);
      if (tags.length === 0) {
        return [];
      }

      if (tags.length > MAX_HASHTAGS_PER_POST) {
        throw new ValidationError(
          `Maximum ${MAX_HASHTAGS_PER_POST} hashtags allowed per post`
        );
      }

      const hashtags = await this.withTransaction(async () => {
        const created = await Promise.all(
          tags.map((tag) => this.createOrUpdateHashtag(tag))
        );

        await Promise.all(
          created.map((h) => this.hashtagRepository.incrementUsage(h.id))
        );

        await this.updateTrendingScores(created.map((h) => h.normalizedTag));
        return created;
      });

      this.metricsService.recordLatency(
        "process_hashtags",
        Date.now() - startTime
      );
      return hashtags;
    } catch (error) {
      this.metricsService.incrementCounter("hashtag_processing_error");
      throw error;
    }
  }

  /**
   * Get trending hashtags
   * @param timeframe - Timeframe in hours to consider for trending calculation
   * @param limit - Number of trending hashtags to return
   */
  async getTrendingHashtags(
    timeframe: number = 24,
    limit: number = 10
  ): Promise<TrendingHashtag[]> {
    const cacheKey = `trending_hashtags:${timeframe}:${limit}`;
    return this.withCache(
      cacheKey,
      async () => {
        const trending = await this.hashtagRepository.findTrending(
          timeframe,
          limit
        );

        // Enrich trending data with analytics
        const enrichedTrending = await Promise.all(
          trending.map(async (tag) => {
            const analytics = await this.getHashtagAnalytics(tag.tag);
            const stats = await this.getHashtagStats(tag.tag);
            return {
              ...tag,
              ...stats,
              peakUsageTime: this.findPeakUsageTime(analytics.hourlyUsage),
              velocityScore: this.calculateVelocityScore(analytics),
              momentum: 0,
              normalizedScore: 0,
            };
          })
        );

        return this.normalizeTrendingScores(enrichedTrending);
      },
      TRENDING_CACHE_TTL
    );
  }

  /**
   * Search hashtags by prefix
   * @param prefix - Hashtag prefix to search for
   * @param limit - Maximum number of results
   */
  async searchHashtags(prefix: string, limit: number = 10): Promise<Hashtag[]> {
    const cacheKey = `hashtag_search:${prefix}:${limit}`;
    return this.withCache(
      cacheKey,
      async () => {
        return this.hashtagRepository.searchByText(prefix, limit);
      },
      CACHE_TTL
    );
  }

  /**
   * Get hashtag statistics
   * @param tag - The hashtag to get statistics for
   */
  async getHashtagStats(tag: string): Promise<HashtagStats> {
    const cacheKey = `hashtag_stats:${tag}`;
    return this.withCache(
      cacheKey,
      async () => {
        const hashtag = await this.hashtagRepository.findByTag(tag);
        if (!hashtag) {
          throw new ResourceNotFoundError("Hashtag", tag);
        }

        const [postsCount, uniqueUsers] = await Promise.all([
          this.postRepository.countByHashtag(hashtag.id),
          this.postRepository.countUniqueUsersByHashtag(hashtag.id),
        ]);

        return {
          usageCount: hashtag.usageCount,
          postsCount,
          uniqueUsers,
          category: hashtag.category,
          avgEngagement: 0, // Placeholder for avgEngagement
          lastUsedAt: hashtag.lastUsedAt as Date,
        };
      },
      CACHE_TTL
    );
  }

  /**
   * Get related hashtags
   * @param tag - The hashtag to find related tags for
   * @param limit - Maximum number of related tags to return
   */
  async getRelatedHashtags(
    tag: string,
    limit: number = 10
  ): Promise<Hashtag[]> {
    const cacheKey = `related_hashtags:${tag}:${limit}`;
    return this.withCache(
      cacheKey,
      async () => {
        const hashtag = await this.hashtagRepository.findByTag(tag);
        if (!hashtag) {
          throw new ResourceNotFoundError("Hashtag", tag);
        }

        return this.hashtagRepository.findRelated(hashtag.id, limit);
      },
      CACHE_TTL
    );
  }

  /**
   * Batch get hashtag statistics
   * @param tags - Array of hashtags to get statistics for
   */
  async batchGetHashtagStats(
    tags: string[]
  ): Promise<Map<string, HashtagStats>> {
    const result = new Map<string, HashtagStats>();

    for (let i = 0; i < tags.length; i += BATCH_SIZE) {
      const batch = tags.slice(i, i + BATCH_SIZE);
      const stats = await this.hashtagRepository.getBatchStats(batch);

      stats.forEach((stat, tag) => {
        result.set(tag, stat);
      });
    }

    return result;
  }

  async getHashtagAnalytics(tag: string): Promise<HashtagAnalytics> {
    const cacheKey = `hashtag_analytics:${tag}`;
    return this.withCache(
      cacheKey,
      async () => {
        const hashtag = await this.hashtagRepository.findByTag(tag);
        if (!hashtag) {
          throw new ResourceNotFoundError("Hashtag", tag);
        }

        const [hourlyUsage, dailyUsage, topUsers, relatedTags, engagementRate] =
          await Promise.all([
            this.hashtagRepository.getHourlyUsage(hashtag.id),
            this.hashtagRepository.getDailyUsage(hashtag.id),
            this.hashtagRepository.getTopUsers(hashtag.id),
            this.hashtagRepository.getRelatedTags(hashtag.id),
            this.calculateEngagementRate(hashtag.id),
          ]);

        return {
          hourlyUsage,
          dailyUsage,
          topUsers,
          relatedTags,
          engagementRate,
        };
      },
      ANALYTICS_CACHE_TTL
    );
  }

  private normalizeTag(tag: string): string {
    // Remove # if present and convert to lowercase
    return tag.replace(/^#/, "").toLowerCase().trim();
  }

  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);

    if (!matches) {
      return [];
    }

    return [...new Set(matches.map((tag) => this.normalizeTag(tag)))];
  }

  private isValidTag(tag: string): boolean {
    const normalizedTag = this.normalizeTag(tag);
    return (
      normalizedTag.length >= MIN_TAG_LENGTH &&
      normalizedTag.length <= MAX_TAG_LENGTH &&
      /^[a-z0-9_]+$/i.test(normalizedTag)
    );
  }

  private async calculateEngagementRate(hashtagId: string): Promise<number> {
    const [posts, interactions] = await Promise.all([
      this.postRepository.countByHashtag(hashtagId),
      this.postRepository.getHashtagInteractions(hashtagId),
    ]);
    return posts > 0 ? interactions / posts : 0;
  }

  private findPeakUsageTime(hourlyUsage: Map<number, number>): string {
    let peakHour = 0;
    let peakCount = 0;

    hourlyUsage.forEach((count, hour) => {
      if (count > peakCount) {
        peakCount = count;
        peakHour = hour;
      }
    });

    return `${peakHour}:00`;
  }

  private calculateVelocityScore(analytics: HashtagAnalytics): number {
    const recentHours = Array.from(analytics.hourlyUsage.entries()).slice(-6); // Last 6 hours

    if (recentHours.length < 2) return 0;

    const velocities = recentHours.slice(1).map((current, index) => {
      const previous = recentHours[index];
      return (current[1] - previous[1]) / 1;
    });

    return velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
  }

  private async invalidateHashtagCache(tag: string): Promise<void> {
    const keys = [
      `hashtag:${tag}*`,
      `trending_hashtags:*`,
      `hashtag_analytics:${tag}`,
      `related_hashtags:${tag}*`,
    ];
    await Promise.all(keys.map((key) => this.cacheService.delete(key)));
  }

  /**
   * Update trending scores for hashtags
   * @param tags - Array of normalized tag names
   */
  private async updateTrendingScores(tags: string[]): Promise<void> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);
      const oneDayAgo = new Date(now.getTime() - 86400000);

      // Get usage counts for different time periods
      const [hourlyUsage, dailyUsage] = await Promise.all([
        this.hashtagRepository.getUsageCountsInTimeRange(tags, oneHourAgo, now),
        this.hashtagRepository.getUsageCountsInTimeRange(tags, oneDayAgo, now),
      ]);

      // Calculate momentum and update scores
      const updates = tags.map((tag) => {
        const hourlyCount = hourlyUsage.get(tag) || 0;
        const dailyCount = dailyUsage.get(tag) || 0;

        // Calculate momentum: weight recent activity more heavily
        const momentum = (hourlyCount * 24) / (dailyCount || 1);

        return this.hashtagRepository.updateTrendingScore(tag, {
          hourlyCount,
          dailyCount,
          momentum,
        });
      });

      await Promise.all(updates);
    } catch (error) {
      this.metricsService.incrementCounter("trending_score_update_error");
      console.error("Failed to update trending scores:", error);
    }
  }

  /**
   * Normalize trending scores for a list of trending hashtags
   * @param trending - Array of trending hashtags with raw scores
   */
  private normalizeTrendingScores(
    trending: TrendingHashtag[]
  ): TrendingHashtag[] {
    if (trending.length === 0) return trending;

    // Find maximum values for normalization
    const maxMomentum = Math.max(...trending.map((t) => t.momentum));
    const maxVelocity = Math.max(...trending.map((t) => t.velocityScore));
    const maxUsage = Math.max(...trending.map((t) => t.usageCount));

    // Normalize scores between 0 and 1
    return trending
      .map((tag) => {
        const normalizedMomentum =
          maxMomentum > 0 ? tag.momentum / maxMomentum : 0;
        const normalizedVelocity =
          maxVelocity > 0 ? tag.velocityScore / maxVelocity : 0;
        const normalizedUsage = maxUsage > 0 ? tag.usageCount / maxUsage : 0;

        // Calculate final trending score with weights
        const normalizedScore =
          normalizedMomentum * 0.4 + // Recent growth
          normalizedVelocity * 0.4 + // Rate of change
          normalizedUsage * 0.2; // Overall popularity

        return {
          ...tag,
          normalizedScore,
        };
      })
      .sort((a, b) => b.normalizedScore - a.normalizedScore);
  }
}
