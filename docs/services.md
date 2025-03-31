# Services Layer Documentation

## Overview

The services layer is the core of the application's business logic, forming a crucial intermediate layer between the controllers (which handle HTTP requests) and the repositories (which interact with the database). This layer encapsulates complex business operations, orchestrates workflows across multiple data sources, implements business rules and validation, and provides a clean API for the application's controllers.

## Architecture

### Service Hierarchy

```
BaseService
├── AuthService
├── UserService
│   ├── UserProfileService
│   ├── UserPreferencesService
│   └── UserOnboardingJobProcessor
├── PermissionService
├── RoleService
├── MediaService
│   ├── MediaProcessingService
│   ├── MediaCollectionService
│   └── MediaTagService
├── SocialServices
│   ├── PostService
│   ├── CommentService
│   ├── LikeService
│   ├── FollowService
│   └── BookmarkService
└── ...
```

### Key Design Patterns

- **Repository Pattern**: Services use repositories for data access, abstracting database operations
- **Dependency Injection**: Services receive dependencies through constructor injection
- **Factory Pattern**: For creating complex objects or handling multiple implementations
- **Strategy Pattern**: For implementing different algorithms or business rules
- **Observer Pattern**: For event handling and notifications across services

## Core Services

### Authentication Services (services/core/auth/)

- **AuthService**: Handles user registration, login, and session management
- **TokenService**: Manages JWT token generation, verification, and refresh
- **PasswordService**: Handles password hashing, verification, and reset flows
- **MFAService**: Implements multi-factor authentication
- **RolePermissionService**: Manages role-based access control

Key features:

- Secure password handling with bcrypt
- JWT tokens with refresh capabilities
- Rate limiting for sensitive operations
- Multi-factor authentication using TOTP
- Session tracking and management

### User Services (services/core/user/)

- **UserService**: Core user management operations
- **UserProfileService**: Handles user profile data and visibility
- **UserPreferencesService**: Manages user settings and preferences
- **UserOnboardingJobProcessor**: Handles the user onboarding workflow

Key features:

- User CRUD operations
- Profile completeness tracking
- Customizable user preferences
- Multi-step onboarding process

### Geo Services (services/core/geo/)

- **GeoService**: Provides geolocation functionality
- **GeoMiddleware**: Express middleware for adding location data to requests

Key features:

- IP-based geolocation
- Distance calculations
- Location-based filtering
- Privacy controls for location data

## Social Services

### Community Services (services/social/community/)

- **GroupService**: Manages group creation and settings
- **GroupMemberService**: Handles group membership and permissions

Key features:

- Group CRUD operations
- Member management
- Role-based permissions within groups
- Group discovery and recommendations

### Discovery Services (services/social/discovery/)

- **FeedService**: Generates personalized content feeds
- **RecommendationService**: Provides personalized recommendations
- **SearchService**: Handles content and user search

Key features:

- Algorithmic feed generation
- Content personalization
- Interest-based recommendations
- Trending content identification

#### Example: Recommended Groups Implementation

```typescript
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
```

#### Example: SearchService Implementation

```typescript
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
      // ... other entity types
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

    // ... similar code for other entity types

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
```

### Interaction Services (services/social/interaction/)

- **LikeService**: Manages likes on various content types
- **CommentService**: Handles commenting functionality
- **FollowService**: Manages user follow relationships
- **BookmarkService**: Handles content saving/bookmarking

#### Example: FollowService Implementation

```typescript
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
```

### Media Services (services/media/)

- **MediaService**: Handles media upload, retrieval, and management
- **MediaProcessingService**: Processes uploaded media (resizing, optimization)
- **MediaCollectionService**: Manages collections of media items
- **MediaTagService**: Handles tagging and categorization of media

Key features:

- Secure file uploads
- Image and video processing
- Format conversion
- Content organization with collections
- Tag-based discovery

### Messaging Services (services/messaging/)

- **ConversationService**: Manages messaging conversations
- **MessageService**: Handles individual message operations
- **UserPresenceService**: Tracks user online status and activity

Key features:

- Direct and group messaging
- Message status tracking (sent, delivered, read)
- Real-time presence information
- Typing indicators
- Message encryption

### Hashtag Services (services/social/hashtag/)

- **HashtagService**: Manages hashtags and hashtag trends

#### Example: HashtagService Implementation

```typescript
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
```

## Shared Components (services/shared/)

- **BaseService**: Base class with common service functionality
- **Error Handling**: Standardized error types and handling
- **Validation**: Input validation utilities
- **Cache Handling**: Abstraction for caching operations
- **Transaction Management**: Database transaction handling
- **Event Bus**: Inter-service communication mechanism
- **Security Utilities**: Rate limiting, profanity filtering

## Job Processing (services/jobs/)

- **BaseJobProcessor**: Abstract base for job processors
- **JobOrchestrationService**: Manages job queues and execution
- **Various Job Processors**: Handle specific background tasks

Key features:

- Asynchronous task processing
- Job prioritization
- Retry mechanisms
- Job status tracking
- Distributed execution

## Analytics Services (services/analytics/)

- **ActivityLogService**: Tracks user activities across the platform
- **InsightsService**: Provides analytics and reporting functionality

Key features:

- User activity tracking
- Content performance metrics
- User engagement analytics
- Custom report generation
- Trend analysis

## Error Handling

The services layer implements a comprehensive error handling strategy:

- **ResourceNotFoundError**: For when requested resources don't exist
- **ValidationError**: For input validation failures
- **UnauthorizedError**: For authentication issues
- **ForbiddenError**: For permission issues
- **ServiceError**: Base class for service-specific errors
- **ExternalServiceError**: For issues with external service integration

## Caching Strategy

Services implement a multi-level caching approach:

- **Memory Cache**: For high-frequency, short-lived data
- **Distributed Cache**: For longer-lived data shared across instances
- **Time-based Invalidation**: Automatic expiry of cached items
- **Event-based Invalidation**: Cache invalidation based on data changes

## Code Patterns and Best Practices

### Constructor Dependency Injection

```typescript
export class MediaService extends BaseService {
  constructor(
    private mediaRepository: MediaRepository,
    private userRepository: UserRepository,
    private metricsService: MetricsService,
    private cacheService: CacheService,
    private jobService: IQueueService,
    private storageService: StorageService,
  ) {
    super("MediaService");
  }
  // ...
}
```

### Transaction Handling

```typescript
async createWithTransaction(data: SomeData): Promise<Result> {
  return this.withTransaction(async () => {
    // Multiple database operations within a transaction
    const entity1 = await this.someRepository.create(data.part1);
    const entity2 = await this.otherRepository.create({
      ...data.part2,
      entity1Id: entity1.id
    });
    return { entity1, entity2 };
  });
}
```

### Validation

```typescript
private validateFileUpload(file: FileUpload): void {
  if (!file.buffer || file.buffer.length === 0) {
    throw new ValidationError("Empty file", ["File cannot be empty"]);
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError("File too large", [
      `File too large, maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
    ]);
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new ValidationError("Unsupported file type", [
      `Unsupported file type: ${file.mimetype}`,
    ]);
  }
}
```

### Caching

```typescript
async getUserById(id: string): Promise<User | null> {
  // Check cache first
  const cachedUser = this.cache.get<User>(this.getCacheKey("user", id));
  if (cachedUser) {
    return cachedUser;
  }

  // Query from database if not in cache
  const user = await this.userRepository.findById(id);
  if (user) {
    this.cache.set(this.getCacheKey("user", id), user);
  }

  return user;
}
```

### Error Handling

```typescript
try {
  // Operation that might fail
  const result = await this.someOperation();
  return result;
} catch (error) {
  this.logger.error("Operation failed", {
    error: error instanceof Error ? error.message : String(error),
    userId,
    additionalContext: "relevant information",
  });

  if (error instanceof ResourceNotFoundError) {
    throw error; // Rethrow specific errors
  }

  throw new ServiceError("Failed to perform operation", {
    cause: error instanceof Error ? error : undefined,
  });
}
```

### Service Communication

Services communicate with each other through:

- **Direct Method Calls**: For synchronous operations
- **Event Bus**: For asynchronous notifications and loose coupling
- **Job Queue**: For background tasks and delayed processing

### Testing Strategy

Services are designed for testability with:

- **Dependency Injection**: Makes mocking dependencies easy
- **Interface-Based Design**: Allows for test doubles
- **Clean Separation of Concerns**: Enables focused unit tests
- **Error Handling Patterns**: Makes testing error scenarios straightforward

### Logging

Services implement structured logging:

```typescript
this.logger.info("Creating a new user profile", {
  userId,
  displayName: data.displayName,
});

try {
  // Operation
} catch (error) {
  this.logger.error("Failed to create user profile", {
    userId,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}
```

## Security Considerations

- **Input Validation**: All user inputs are validated
- **Authorization Checks**: Permission checks before operations
- **Rate Limiting**: Protection against abuse
- **Content Filtering**: Protection against inappropriate content
- **Data Access Controls**: Ensuring users only access authorized data

## Performance Optimizations

- **Caching**: Strategic caching of expensive operations
- **Batch Processing**: Handling multiple items in single operations
- **Pagination**: Handling large data sets efficiently
- **Background Processing**: Moving intensive operations to background jobs
- **Query Optimization**: Ensuring efficient data access patterns

## Moderation Services (services/social/moderation/)

- **ContentModerationService**: Core moderation functionality
- **ReportingService**: Handles user reports of content
- **AutoModerationService**: Automated content moderation
- **ModerationActionService**: Handles moderation actions and appeals

#### Example: AutoModerationService Implementation

```typescript
/**
 * Screen content through automated moderation
 * @param contentId ID of the content
 * @param contentType Type of the content
 * @param text Text to moderate
 * @param autoApply Whether to automatically apply moderation decisions
 */
async screenContent(
  contentId: string,
  contentType: EntityType,
  text: string,
  autoApply: boolean = false
): Promise<{
  decision: ModerationDecision;
  reason: ModerationReason | null;
  confidence: number;
  autoApplied: boolean;
}> {
  const startTime = Date.now();

  try {
    // Check cache first
    const cacheKey = `automod:${contentType}:${contentId}`;
    const cachedResult = await this.cacheService.get<{
      decision: ModerationDecision;
      reason: ModerationReason | null;
      confidence: number;
    }>(cacheKey);

    if (cachedResult) {
      this.logger.debug(
        `Using cached auto-moderation result for ${contentType}:${contentId}`
      );
      this.metricsService.incrementCounter("automod_cache_hit");
      return { ...cachedResult, autoApplied: false };
    }

    // Rule-based scanning
    const ruleResult = this.scanContentWithRules(text);

    // ML-based toxicity detection (simulated)
    const toxicityResult = await this.detectToxicity(text);

    // ML-based spam detection (simulated)
    const spamResult = await this.detectSpam(text);

    // Combine results
    let finalDecision = ModerationDecision.APPROVE;
    let finalReason: ModerationReason | null = null;
    let finalConfidence = 0;

    // Check rule results
    if (ruleResult.matched) {
      finalDecision =
        ruleResult.severity > this.autoDecisionThreshold
          ? ModerationDecision.REJECT
          : ModerationDecision.FLAG;
      finalReason = ruleResult.reason ?? null;
      finalConfidence = ruleResult.severity;
    }

    // Check toxicity results
    if (
      toxicityResult.score > this.toxicThreshold &&
      toxicityResult.score > finalConfidence
    ) {
      finalDecision =
        toxicityResult.score > this.autoDecisionThreshold
          ? ModerationDecision.REJECT
          : ModerationDecision.FLAG;
      finalReason = ModerationReason.INAPPROPRIATE;
      finalConfidence = toxicityResult.score;
    }

    // Check spam results
    if (
      spamResult.score > this.spamThreshold &&
      spamResult.score > finalConfidence
    ) {
      finalDecision =
        spamResult.score > this.autoDecisionThreshold
          ? ModerationDecision.REJECT
          : ModerationDecision.FLAG;
      finalReason = ModerationReason.SPAM;
      finalConfidence = spamResult.score;
    }

    // Cache the result
    const result = {
      decision: finalDecision,
      reason: finalReason,
      confidence: finalConfidence,
    };

    await this.cacheService.set(cacheKey, result, 60 * 60); // Cache for 1 hour

    // Apply the decision if auto-apply is enabled and we have a clear decision
    let autoApplied = false;
    if (
      autoApply &&
      finalDecision !== ModerationDecision.APPROVE &&
      finalConfidence > this.autoDecisionThreshold
    ) {
      await this.contentModerationService.applyModerationDecision(
        contentId,
        contentType,
        finalDecision,
        "system",
        `Auto-moderation confidence: ${finalConfidence.toFixed(2)}`
      );
      autoApplied = true;
      this.metricsService.incrementCounter("automod_auto_applied");
    }

    // Record metrics
    this.metricsService.recordLatency(
      "automod_screening",
      Date.now() - startTime
    );
    this.metricsService.incrementCounter(
      `automod_decision_${finalDecision.toLowerCase()}`
    );
    if (finalReason) {
      this.metricsService.incrementCounter(
        `automod_reason_${finalReason.toLowerCase()}`
      );
    }

    return {
      ...result,
      autoApplied,
    };
  } catch (error) {
    this.logger.error(
      `Error auto-moderating content ${contentType}:${contentId}:`,
      { error: error instanceof Error ? error.message : String(error) }
    );
    this.metricsService.incrementCounter("automod_error");
    throw error;
  }
}
```

## Notification Services (services/social/notification/)

- **NotificationService**: Manages notification creation and querying
- **NotificationDeliveryService**: Handles delivery across channels

#### Example: NotificationDeliveryService Implementation

```typescript
/**
 * Queue a notification for delivery
 * @param notification - The notification to deliver
 * @param channels - Delivery channels to use
 */
async queueNotificationDelivery(
  notification: Notification,
  channels: DeliveryChannel[] = [DeliveryChannel.IN_APP]
): Promise<void> {
  const startTime = Date.now();

  try {
    // Get user preferences
    const user = await this.userRepository.findById(notification.userId);
    if (!user) {
      throw new ResourceNotFoundError("User", notification.userId);
    }

    // Prepare delivery request
    const deliveryRequest: DeliveryRequest = {
      notificationId: notification.id,
      userId: notification.userId,
      channels: channels,
      payload: this.prepareNotificationPayload(notification),
      priority: this.getPriorityForNotificationType(notification.type),
      attempts: 0,
    };

    // Add to appropriate queues
    for (const channel of channels) {
      const queue = this.deliveryQueue.get(channel);
      if (queue) {
        // Check for throttling
        if (!this.isUserThrottled(notification.userId, channel)) {
          queue.push(deliveryRequest);
          this.updateThrottleStatus(notification.userId, channel);
        } else {
          this.logger.info(
            `Throttling ${channel} notification for user ${notification.userId}`
          );
          this.metricsService.incrementCounter("notifications_throttled");
        }
      }
    }

    this.metricsService.recordLatency(
      "queue_notification_delivery",
      Date.now() - startTime
    );
  } catch (error) {
    this.logger.error("Error queueing notification delivery:", {
      error: error instanceof Error ? error.message : String(error),
    });
    this.metricsService.incrementCounter("notification_delivery_queue_error");
    throw error;
  }
}
```
