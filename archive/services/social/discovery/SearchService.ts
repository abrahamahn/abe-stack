import {
  User,
  Group,
  Conversation,
  Message,
  Media,
  Comment,
  Hashtag,
  Post,
} from "@/server/database/models";
import {
  UserRepository,
  GroupRepository,
  HashtagRepository,
  PostRepository,
  CommentRepository,
  MessageRepository,
  ConversationRepository,
} from "@/server/database/repositories";
import { CacheService } from "@/server/infrastructure/cache";
import { PaginatedResult, PaginationOptions } from "@/server/shared/types";
import { BaseService } from "@/server/services/shared";
import { ValidationError } from "@/server/services/shared/errors/ServiceError";
import { MetricsService } from "@/server/services/shared/monitoring";

// Cache settings
const SEARCH_CACHE_TTL = 300; // 5 minutes
const SUGGESTIONS_CACHE_TTL = 3600; // 1 hour
const POPULAR_CACHE_TTL = 1800; // 30 minutes
const CACHE_KEY_PREFIX = "search:";

/**
 * Types for search functionality
 */
export enum EntityType {
  USER = "user",
  POST = "post",
  MEDIA = "media",
  CONVERSATION = "conversation",
  MESSAGE = "message",
  GROUP = "group",
  COMMENT = "comment",
  HASHTAG = "hashtag",
}

/**
 * Search filtering options
 */
export interface SearchFilters {
  entityTypes?: EntityType[];
  startDate?: Date;
  endDate?: Date;
  sortBy?: "relevance" | "date" | "popularity";
  userIds?: string[];
  tags?: string[];
  location?: {
    lat: number;
    lng: number;
    radius: number; // in km
  };
}

// Define repository-specific filter interfaces
interface BaseSearchFilters {
  startDate?: Date;
  endDate?: Date;
  sortBy?: "relevance" | "date" | "popularity";
}

interface ContentSearchFilters extends BaseSearchFilters {
  userIds?: string[];
  tags?: string[];
}

type UserSearchFilters = BaseSearchFilters;

interface MessageSearchFilters extends BaseSearchFilters {
  userIds?: string[];
}

/**
 * Context for search suggestions
 */
export interface SearchContext {
  userId: string;
  entityType?: EntityType;
  limit?: number;
}

/**
 * Search results interface
 */
export interface SearchResults {
  users: PaginatedResult<User>;
  posts: PaginatedResult<Post>;
  media: PaginatedResult<Media>;
  conversations: PaginatedResult<Conversation>;
  messages: PaginatedResult<Message>;
  groups: PaginatedResult<Group>;
  comments: PaginatedResult<Comment>;
  hashtags: PaginatedResult<Hashtag>;
}

/**
 * Search history entry
 */
export interface SearchHistoryEntry {
  id: string;
  userId: string;
  query: string;
  timestamp: Date;
  resultCount: number;
}

/**
 * Search history repository interface
 */
interface SearchHistoryRepository {
  findByUserIdAndPrefix(
    userId: string,
    prefix: string,
    limit: number
  ): Promise<SearchHistoryEntry[]>;
  findPopularByPrefix(
    prefix: string,
    limit: number
  ): Promise<SearchHistoryEntry[]>;
  findMostPopular(limit: number): Promise<SearchHistoryEntry[]>;
  save(entry: Omit<SearchHistoryEntry, "id">): Promise<void>;
}

// Define extended repositories with search methods
interface ExtendedUserRepository extends UserRepository {
  search(
    query: string,
    limit: number,
    offset: number,
    filters: UserSearchFilters
  ): Promise<PaginatedResult<User>>;
}

interface ExtendedPostRepository extends PostRepository {
  search(
    query: string,
    limit: number,
    offset: number,
    filters: ContentSearchFilters
  ): Promise<PaginatedResult<Post>>;
}

interface ExtendedMediaRepository {
  search(
    query: string,
    limit: number,
    offset: number,
    filters: ContentSearchFilters
  ): Promise<PaginatedResult<Media>>;
}

interface ExtendedConversationRepository extends ConversationRepository {
  search(
    query: string,
    limit: number,
    offset: number,
    filters: MessageSearchFilters
  ): Promise<PaginatedResult<Conversation>>;
}

interface ExtendedMessageRepository extends MessageRepository {
  search(
    query: string,
    limit: number,
    offset: number,
    filters: MessageSearchFilters
  ): Promise<PaginatedResult<Message>>;
}

interface ExtendedGroupRepository extends GroupRepository {
  search(
    query: string,
    limit: number,
    offset: number,
    filters: ContentSearchFilters
  ): Promise<PaginatedResult<Group>>;
}

interface ExtendedCommentRepository extends CommentRepository {
  search(
    query: string,
    limit: number,
    offset: number,
    filters: MessageSearchFilters
  ): Promise<PaginatedResult<Comment>>;
}

interface ExtendedHashtagRepository extends HashtagRepository {
  search(
    query: string,
    limit: number,
    offset: number,
    filters: BaseSearchFilters
  ): Promise<PaginatedResult<Hashtag>>;
}

/**
 * Service responsible for search functionality across multiple entity types.
 * Features:
 * 1. Cross-entity search functionality
 * 2. Search relevance and ranking
 * 3. Search history and suggestions
 * 4. Real-time search capabilities
 * 5. Advanced filtering options
 */
export class SearchService extends BaseService {
  constructor(
    private userRepository: ExtendedUserRepository,
    private postRepository: ExtendedPostRepository,
    private mediaRepository: ExtendedMediaRepository,
    private conversationRepository: ExtendedConversationRepository,
    private messageRepository: ExtendedMessageRepository,
    private groupRepository: ExtendedGroupRepository,
    private commentRepository: ExtendedCommentRepository,
    private hashtagRepository: ExtendedHashtagRepository,
    private searchHistoryRepository: SearchHistoryRepository,
    private metricsService: MetricsService,
    private cacheService: CacheService
  ) {
    super("SearchService");
  }

  /**
   * Perform a search across multiple entity types
   *
   * @param query - Search query string
   * @param filters - Filters to apply to the search
   * @param options - Pagination options
   * @returns Search results for different entity types
   */
  async search(
    query: string,
    filters: SearchFilters = {},
    options: PaginationOptions = { page: 1, limit: 20 }
  ): Promise<SearchResults> {
    try {
      if (!query || query.trim().length === 0) {
        throw new ValidationError("Search query cannot be empty");
      }

      // Normalize query
      const normalizedQuery = query.trim().toLowerCase();

      // Generate cache key based on query and filters
      const cacheKey = `${CACHE_KEY_PREFIX}${this.generateCacheKey(normalizedQuery, filters, options)}`;

      // Try to get from cache
      const cachedResults =
        await this.cacheService.get<SearchResults>(cacheKey);
      if (cachedResults) {
        return cachedResults;
      }

      // Determine which entity types to search
      const entityTypes = filters.entityTypes || Object.values(EntityType);

      // Initialize empty results
      const results: SearchResults = {
        users: {
          items: [],
          total: 0,
          page: options.page || 1,
          limit: options.limit || 20,
          totalPages: 0,
        },
        posts: {
          items: [],
          total: 0,
          page: options.page || 1,
          limit: options.limit || 20,
          totalPages: 0,
        },
        media: {
          items: [],
          total: 0,
          page: options.page || 1,
          limit: options.limit || 20,
          totalPages: 0,
        },
        conversations: {
          items: [],
          total: 0,
          page: options.page || 1,
          limit: options.limit || 20,
          totalPages: 0,
        },
        messages: {
          items: [],
          total: 0,
          page: options.page || 1,
          limit: options.limit || 20,
          totalPages: 0,
        },
        groups: {
          items: [],
          total: 0,
          page: options.page || 1,
          limit: options.limit || 20,
          totalPages: 0,
        },
        comments: {
          items: [],
          total: 0,
          page: options.page || 1,
          limit: options.limit || 20,
          totalPages: 0,
        },
        hashtags: {
          items: [],
          total: 0,
          page: options.page || 1,
          limit: options.limit || 20,
          totalPages: 0,
        },
      };

      // Search each entity type in parallel
      const searchPromises: Promise<void>[] = [];

      if (entityTypes.includes(EntityType.USER)) {
        searchPromises.push(
          this.searchUsers(normalizedQuery, filters, options).then((result) => {
            results.users = result;
          })
        );
      }

      if (entityTypes.includes(EntityType.POST)) {
        searchPromises.push(
          this.searchPosts(normalizedQuery, filters, options).then((result) => {
            results.posts = result;
          })
        );
      }

      if (entityTypes.includes(EntityType.MEDIA)) {
        searchPromises.push(
          this.searchMedia(normalizedQuery, filters, options).then((result) => {
            results.media = result;
          })
        );
      }

      if (entityTypes.includes(EntityType.CONVERSATION)) {
        searchPromises.push(
          this.searchConversations(normalizedQuery, filters, options).then(
            (result) => {
              results.conversations = result;
            }
          )
        );
      }

      if (entityTypes.includes(EntityType.MESSAGE)) {
        searchPromises.push(
          this.searchMessages(normalizedQuery, filters, options).then(
            (result) => {
              results.messages = result;
            }
          )
        );
      }

      if (entityTypes.includes(EntityType.GROUP)) {
        searchPromises.push(
          this.searchGroups(normalizedQuery, filters, options).then(
            (result) => {
              results.groups = result;
            }
          )
        );
      }

      if (entityTypes.includes(EntityType.COMMENT)) {
        searchPromises.push(
          this.searchComments(normalizedQuery, filters, options).then(
            (result) => {
              results.comments = result;
            }
          )
        );
      }

      if (entityTypes.includes(EntityType.HASHTAG)) {
        searchPromises.push(
          this.searchHashtags(normalizedQuery, filters, options).then(
            (result) => {
              results.hashtags = result;
            }
          )
        );
      }

      // Wait for all searches to complete
      await Promise.all(searchPromises);

      // Cache the results
      await this.cacheService.set(cacheKey, results, SEARCH_CACHE_TTL);

      // Track metrics
      this.metricsService.recordOperationDuration("search_execution", 1);

      return results;
    } catch (error) {
      this.logger.error("Error performing search", {
        query,
        filters,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get search suggestions based on prefix
   *
   * @param prefix - Text prefix to generate suggestions for
   * @param context - Context for suggestions
   * @returns Array of search suggestions
   */
  async getSearchSuggestions(
    prefix: string,
    context: SearchContext
  ): Promise<string[]> {
    try {
      if (!prefix || prefix.trim().length === 0) {
        return [];
      }

      // Normalize prefix
      const normalizedPrefix = prefix.trim().toLowerCase();

      // Generate cache key
      const cacheKey = `${CACHE_KEY_PREFIX}suggestions:${normalizedPrefix}:${context.userId}:${context.entityType || "all"}`;

      // Try to get from cache
      const cachedSuggestions = await this.cacheService.get<string[]>(cacheKey);
      if (cachedSuggestions) {
        return cachedSuggestions;
      }

      // Get user's search history
      const userHistory =
        await this.searchHistoryRepository.findByUserIdAndPrefix(
          context.userId,
          normalizedPrefix,
          context.limit || 5
        );

      // Get popular searches with this prefix
      const popularSearches =
        await this.searchHistoryRepository.findPopularByPrefix(
          normalizedPrefix,
          context.limit || 5
        );

      // Combine and deduplicate
      const suggestions = Array.from(
        new Set([
          ...userHistory.map((h: SearchHistoryEntry) => h.query),
          ...popularSearches.map((p: SearchHistoryEntry) => p.query),
        ])
      );

      // Limit results
      const limitedSuggestions = suggestions.slice(0, context.limit || 10);

      // Cache the results
      await this.cacheService.set(
        cacheKey,
        limitedSuggestions,
        SUGGESTIONS_CACHE_TTL
      );

      return limitedSuggestions;
    } catch (error) {
      this.logger.error("Error getting search suggestions", {
        prefix,
        context,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Save a search query to user's search history
   *
   * @param userId - ID of the user performing the search
   * @param query - Search query to save
   * @param resultCount - Number of results returned
   */
  async saveSearchQuery(
    userId: string,
    query: string,
    resultCount: number = 0
  ): Promise<void> {
    try {
      if (!query || query.trim().length === 0) {
        return;
      }

      // Normalize query
      const normalizedQuery = query.trim().toLowerCase();

      // Save to history
      await this.searchHistoryRepository.save({
        userId,
        query: normalizedQuery,
        timestamp: new Date(),
        resultCount,
      });

      // Invalidate cache for this user's suggestions
      // Using a more targeted approach instead of pattern invalidation
      const suggestionCacheKey = `${CACHE_KEY_PREFIX}suggestions:${normalizedQuery}:${userId}`;
      await this.cacheService.delete(suggestionCacheKey);

      // Also invalidate popular searches
      const popularCacheKey = `${CACHE_KEY_PREFIX}popular:10`;
      await this.cacheService.delete(popularCacheKey);
    } catch (error) {
      this.logger.error("Error saving search query", {
        userId,
        query,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't rethrow - this is a non-critical operation
    }
  }

  /**
   * Get popular search queries
   *
   * @param limit - Number of popular searches to retrieve
   * @returns Array of popular search queries
   */
  async getPopularSearches(limit: number = 10): Promise<string[]> {
    try {
      // Generate cache key
      const cacheKey = `${CACHE_KEY_PREFIX}popular:${limit}`;

      // Try to get from cache
      const cachedPopular = await this.cacheService.get<string[]>(cacheKey);
      if (cachedPopular) {
        return cachedPopular;
      }

      // Get popular searches from repository
      const popularSearches =
        await this.searchHistoryRepository.findMostPopular(limit);

      // Extract just the queries
      const queries = popularSearches.map((s: SearchHistoryEntry) => s.query);

      // Cache the results
      await this.cacheService.set(cacheKey, queries, POPULAR_CACHE_TTL);

      return queries;
    } catch (error) {
      this.logger.error("Error getting popular searches", {
        limit,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Generate a cache key for a search query and filters
   *
   * @param query - Search query
   * @param filters - Search filters
   * @param options - Pagination options
   * @returns Cache key string
   */
  private generateCacheKey(
    query: string,
    filters: SearchFilters,
    options: PaginationOptions
  ): string {
    // Create a simplified representation of filters for the cache key
    const filterKey = JSON.stringify({
      types: filters.entityTypes || "all",
      start: filters.startDate?.toISOString() || "none",
      end: filters.endDate?.toISOString() || "none",
      sort: filters.sortBy || "relevance",
      users: filters.userIds?.join(",") || "none",
      tags: filters.tags?.join(",") || "none",
      location: filters.location
        ? `${filters.location.lat},${filters.location.lng},${filters.location.radius}`
        : "none",
    });

    return `${query}:${filterKey}:${options.page || 1}:${options.limit || 20}`;
  }

  /**
   * Search users
   */
  private async searchUsers(
    query: string,
    filters: SearchFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<User>> {
    try {
      return await this.userRepository.search(
        query,
        options.limit || 20,
        options.page ? (options.page - 1) * (options.limit || 20) : 0,
        {
          startDate: filters.startDate,
          endDate: filters.endDate,
          sortBy: filters.sortBy,
        }
      );
    } catch (error) {
      this.logger.error("Error searching users", { query, error });
      return {
        items: [],
        total: 0,
        page: options.page || 1,
        limit: options.limit || 20,
        totalPages: 0,
      };
    }
  }

  /**
   * Search posts
   */
  private async searchPosts(
    query: string,
    filters: SearchFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Post>> {
    try {
      return await this.postRepository.search(
        query,
        options.limit || 20,
        options.page ? (options.page - 1) * (options.limit || 20) : 0,
        {
          startDate: filters.startDate,
          endDate: filters.endDate,
          sortBy: filters.sortBy,
          userIds: filters.userIds,
          tags: filters.tags,
        }
      );
    } catch (error) {
      this.logger.error("Error searching posts", { query, error });
      return {
        items: [],
        total: 0,
        page: options.page || 1,
        limit: options.limit || 20,
        totalPages: 0,
      };
    }
  }

  /**
   * Search media
   */
  private async searchMedia(
    query: string,
    filters: SearchFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Media>> {
    try {
      return await this.mediaRepository.search(
        query,
        options.limit || 20,
        options.page ? (options.page - 1) * (options.limit || 20) : 0,
        {
          startDate: filters.startDate,
          endDate: filters.endDate,
          sortBy: filters.sortBy,
          userIds: filters.userIds,
          tags: filters.tags,
        }
      );
    } catch (error) {
      this.logger.error("Error searching media", { query, error });
      return {
        items: [],
        total: 0,
        page: options.page || 1,
        limit: options.limit || 20,
        totalPages: 0,
      };
    }
  }

  /**
   * Search conversations
   */
  private async searchConversations(
    query: string,
    filters: SearchFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Conversation>> {
    try {
      return await this.conversationRepository.search(
        query,
        options.limit || 20,
        options.page ? (options.page - 1) * (options.limit || 20) : 0,
        {
          startDate: filters.startDate,
          endDate: filters.endDate,
          sortBy: filters.sortBy,
          userIds: filters.userIds,
        }
      );
    } catch (error) {
      this.logger.error("Error searching conversations", { query, error });
      return {
        items: [],
        total: 0,
        page: options.page || 1,
        limit: options.limit || 20,
        totalPages: 0,
      };
    }
  }

  /**
   * Search messages
   */
  private async searchMessages(
    query: string,
    filters: SearchFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Message>> {
    try {
      return await this.messageRepository.search(
        query,
        options.limit || 20,
        options.page ? (options.page - 1) * (options.limit || 20) : 0,
        {
          startDate: filters.startDate,
          endDate: filters.endDate,
          sortBy: filters.sortBy,
          userIds: filters.userIds,
        }
      );
    } catch (error) {
      this.logger.error("Error searching messages", { query, error });
      return {
        items: [],
        total: 0,
        page: options.page || 1,
        limit: options.limit || 20,
        totalPages: 0,
      };
    }
  }

  /**
   * Search groups
   */
  private async searchGroups(
    query: string,
    filters: SearchFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Group>> {
    try {
      return await this.groupRepository.search(
        query,
        options.limit || 20,
        options.page ? (options.page - 1) * (options.limit || 20) : 0,
        {
          startDate: filters.startDate,
          endDate: filters.endDate,
          sortBy: filters.sortBy,
          userIds: filters.userIds,
          tags: filters.tags,
        }
      );
    } catch (error) {
      this.logger.error("Error searching groups", { query, error });
      return {
        items: [],
        total: 0,
        page: options.page || 1,
        limit: options.limit || 20,
        totalPages: 0,
      };
    }
  }

  /**
   * Search comments
   */
  private async searchComments(
    query: string,
    filters: SearchFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Comment>> {
    try {
      return await this.commentRepository.search(
        query,
        options.limit || 20,
        options.page ? (options.page - 1) * (options.limit || 20) : 0,
        {
          startDate: filters.startDate,
          endDate: filters.endDate,
          sortBy: filters.sortBy,
          userIds: filters.userIds,
        }
      );
    } catch (error) {
      this.logger.error("Error searching comments", { query, error });
      return {
        items: [],
        total: 0,
        page: options.page || 1,
        limit: options.limit || 20,
        totalPages: 0,
      };
    }
  }

  /**
   * Search hashtags
   */
  private async searchHashtags(
    query: string,
    filters: SearchFilters,
    options: PaginationOptions
  ): Promise<PaginatedResult<Hashtag>> {
    try {
      return await this.hashtagRepository.search(
        query,
        options.limit || 20,
        options.page ? (options.page - 1) * (options.limit || 20) : 0,
        {
          startDate: filters.startDate,
          endDate: filters.endDate,
          sortBy: filters.sortBy,
        }
      );
    } catch (error) {
      this.logger.error("Error searching hashtags", { query, error });
      return {
        items: [],
        total: 0,
        page: options.page || 1,
        limit: options.limit || 20,
        totalPages: 0,
      };
    }
  }
}
