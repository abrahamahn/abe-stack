# Database Module Documentation

## Overview

The database module is a structured system for managing application data with PostgreSQL. It follows a clean architecture approach with distinct layers for models, repositories, and database operations.

## Directory Structure

```
└── database
    ├── migrations        # Database schema evolution
    ├── models            # Data models and business logic
    │   ├── analytics     # Activity tracking models
    │   ├── auth          # Authentication and user models
    │   ├── community     # Group and membership models
    │   ├── discovery     # Search indexing models
    │   ├── media         # Media asset models
    │   ├── messaging     # Conversation and message models
    │   ├── moderation    # Content moderation models
    │   ├── shared        # Shared entity types
    │   └── social        # Social interaction models
    ├── repositories      # Data access layer
    │   ├── analytics     # Activity data access
    │   ├── auth          # User authentication operations
    │   ├── community     # Community management operations
    │   ├── discovery     # Search operations
    │   ├── media         # Media management operations
    │   ├── messaging     # Communication operations
    │   ├── moderation    # Content moderation operations
    │   └── social        # Social interaction operations
    ├── seeds             # Database seed data
    ├── transactions      # Transaction management
    └── utils             # Utility functions
```

## Core Components

### Base Model and Repository

The module follows a Domain-Driven Design approach with:

- `BaseModel`: Foundation class for all domain models with data validation and business logic
- `BaseRepository`: Generic class for database operations that handles CRUD operations with proper error handling

### Models

Models encapsulate business logic and data validation. All models extend the `BaseModel` class, providing:

- Data structure definition
- Business rules and constraints
- Type validation and error handling
- Domain-specific operations

### Repositories

Repositories handle all database interactions and abstract storage concerns from the business logic. Key characteristics:

- Each repository corresponds to a specific model
- Handle CRUD operations and custom queries
- Manage transactions for complex operations
- Convert between database records and domain models
- Handle database-specific error handling

All repositories extend the `BaseRepository` class, which provides common functionality:

```typescript
export class BaseRepository<T> {
  protected tableName: string;
  protected columns: string[];

  constructor(protected modelName: string) {}

  // Common database operations
  async executeQuery<R>(
    query: string,
    params: unknown[],
  ): Promise<QueryResult<R>> {
    // Implementation for executing database queries
  }

  // Transaction management
  async withTransaction<R>(
    callback: (client: PoolClient) => Promise<R>,
  ): Promise<R> {
    // Implementation for transaction handling
  }

  // Model mapping
  protected mapResultToModel(row: Record<string, unknown>): T {
    // Implementation for mapping database results to model instances
  }
}
```

## Key Modules

### Authentication & Users

**Models**:

- `User`: Core user authentication data
- `Role`, `Permission`: Role-based access control
- `Token`: Authentication tokens for various purposes
- `UserProfile`: User profile information
- `UserPreferences`: User settings and preferences

**Repositories**:

- `UserRepository`: User account management
- `RoleRepository`: Role management
- `PermissionRepository`: Permission management
- `TokenRepository`: Auth token management

### Social Interactions

**Models**:

- `Post`: Social media posts with content and metadata
- `Comment`: Post comments with threaded replies
- `Like`, `CommentLike`: Engagement actions
- `Follow`: User follow relationships
- `Bookmark`: Content saving mechanism
- `Hashtag`: Content tagging system

**Repositories**:

#### PostRepository

Responsible for managing social media posts with features for creating, retrieving, updating, and deleting posts.

```typescript
export class PostRepository extends BaseRepository<Post> {
  protected tableName = "posts";
  protected columns = [
    "id",
    "user_id as userId",
    "title",
    "content",
    "status",
    "visibility",
    "like_count as likeCount",
    "comment_count as commentCount",
    "share_count as shareCount",
    "view_count as viewCount",
    "is_edited as isEdited",
    "is_pinned as isPinned",
    "parent_id as parentId",
    "original_post_id as originalPostId",
    "scheduled_at as scheduledAt",
    "published_at as publishedAt",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  // Creates a new post with validation
  async create(
    data: Omit<PostAttributes, "id" | "createdAt" | "updatedAt">,
  ): Promise<Post> {
    // Implementation with validation and error handling
  }

  // Finds posts by user ID with pagination
  async findByUserId(
    userId: string,
    limit = 20,
    offset = 0,
    status?: PostStatus,
  ): Promise<{ posts: Post[]; count: number }> {
    // Implementation
  }

  // Updates post with permission checks
  async update(
    id: string,
    data: Partial<PostAttributes>,
    requestingUserId?: string,
  ): Promise<Post> {
    // Implementation with validation and permission checks
  }

  // Other methods: delete, permanentDelete, findByStatus, findScheduledPosts, etc.
}
```

#### CommentRepository

Manages comment functionality with support for threaded replies and engagement metrics.

```typescript
export class CommentRepository extends BaseRepository<Comment> {
  protected tableName = "comments";
  protected columns = [
    "id",
    "user_id as userId",
    "target_id as targetId",
    "target_type as targetType",
    "parent_id as parentId",
    "content",
    "status",
    "like_count as likeCount",
    "reply_count as replyCount",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  // Find comments for a specific target with sorting and pagination
  async findByTarget(
    targetId: string,
    targetType: CommentTargetType,
    parentId: string | null = null,
    limit = 20,
    offset = 0,
    sortBy = "createdAt",
    sortOrder = "DESC",
  ): Promise<Comment[]> {
    // Implementation with SQL injection prevention
  }

  // Find replies to a comment
  async findReplies(
    commentId: string,
    limit = 20,
    offset = 0,
    sortBy = "createdAt",
    sortOrder = "DESC",
  ): Promise<Comment[]> {
    // Implementation
  }

  // Create a new comment with validation
  async create(
    data: Omit<
      CommentAttributes,
      "id" | "likeCount" | "replyCount" | "createdAt" | "updatedAt"
    >,
  ): Promise<Comment> {
    // Implementation with content validation and parent update
  }

  // Other methods: update, delete, incrementLikeCount, decrementLikeCount, etc.
}
```

#### LikeRepository

Manages likes for various content types (posts, comments, etc.) with proper relationship handling.

```typescript
export class LikeRepository extends BaseRepository<Like> {
  protected tableName = "likes";
  protected columns = [
    "id",
    "user_id as userId",
    "target_id as targetId",
    "target_type as targetType",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  // Check if a user has liked a target
  async hasLiked(
    userId: string,
    targetId: string,
    targetType: LikeTargetType,
  ): Promise<boolean> {
    // Implementation
  }

  // Get all likes for a target with pagination
  async getLikesForTarget(
    targetId: string,
    targetType: LikeTargetType,
    limit = 20,
    offset = 0,
  ): Promise<Like[]> {
    // Implementation
  }

  // Toggle like status (like/unlike)
  async toggleLike(
    userId: string,
    targetId: string,
    targetType: LikeTargetType,
  ): Promise<{ liked: boolean; like?: Like }> {
    // Implementation with transaction support
  }

  // Other methods: create, delete, unlike, countLikesForTarget, etc.
}
```

#### FollowRepository

Manages follow relationships between users with rate limiting and mutual follower detection.

```typescript
export class FollowRepository extends BaseRepository<Follow> {
  protected tableName = "follows";
  protected columns = [
    "id",
    "follower_id as followerId",
    "following_id as followingId",
    "status",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  // Check if a user is following another user
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    // Implementation
  }

  // Create a new follow relationship with checks
  async create(
    data: Omit<FollowAttributes, "id" | "createdAt" | "updatedAt"> & {
      followerId: string;
      followingId: string;
    },
  ): Promise<Follow> {
    // Implementation with self-follow prevention and rate limiting
  }

  // Toggle follow status
  async toggleFollow(
    followerId: string,
    followingId: string,
  ): Promise<boolean> {
    // Implementation
  }

  // Get mutual followers between two users
  async getMutualFollowers(
    userId: string,
    otherUserId: string,
    limit = 20,
    offset = 0,
  ): Promise<UserData[]> {
    // Implementation with complex SQL join
  }

  // Other methods: unfollow, countFollowers, countFollowing, etc.
}
```

#### HashtagRepository

Manages hashtags with support for trending analysis, related tag discovery, and usage statistics.

```typescript
export class HashtagRepository extends BaseRepository<Hashtag> {
  protected tableName = "hashtags";
  protected columns = [
    "id",
    "tag",
    "normalized_tag as normalizedTag",
    "category",
    "usage_count as usageCount",
    "is_official as isOfficial",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  // Find or create a hashtag by tag text
  async findOrCreate(tag: string): Promise<Hashtag> {
    // Implementation with normalization and validation
  }

  // Find trending hashtags
  async findTrending(
    limit: number = 10,
    offset: number = 0,
  ): Promise<Hashtag[]> {
    // Implementation
  }

  // Search hashtags by partial text
  async searchByText(
    text: string,
    limit: number = 10,
    offset: number = 0,
  ): Promise<Hashtag[]> {
    // Implementation
  }

  // Find related hashtags based on co-occurrence
  async findRelated(hashtagId: string, limit: number = 10): Promise<Hashtag[]> {
    // Implementation with complex SQL join
  }

  // Get statistics for multiple hashtags in one query
  async getBatchStats(tags: string[]): Promise<Map<string, HashtagStats>> {
    // Implementation
  }

  // Other methods: incrementUsage, updateCategory, getHourlyUsage, etc.
}
```

#### NotificationRepository

Manages user notifications with delivery status tracking and preference management.

```typescript
export class NotificationRepository extends BaseRepository<Notification> {
  protected tableName = "notifications";
  protected columns = [
    "id",
    "user_id as userId",
    "actor_id as actorId",
    "type",
    "entity_id as entityId",
    "entity_type as entityType",
    "content",
    "metadata",
    "read",
    "delivered",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  // Create a new notification
  async create(notification: Notification): Promise<Notification> {
    // Implementation with validation
  }

  // Find notifications by user ID with filtering options
  async findByUserId(
    userId: string,
    options?: NotificationQueryOptions,
  ): Promise<Notification[]> {
    // Implementation with filtering for unread notifications
  }

  // Mark notifications as read
  async markAsRead(notificationIds: string[], userId: string): Promise<void> {
    // Implementation with ownership verification
  }

  // Get notification preferences for a user
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    // Implementation with default preferences
  }

  // Other methods: markAsDelivered, delete, updatePreferences, etc.
}
```

### Messaging

**Models**:

- `Conversation`: Direct and group conversations
- `Message`: Message content and metadata

**Repositories**:

```typescript
export class MessageRepository extends BaseRepository<Message> {
  protected tableName = "messages";
  protected columns = [
    "id",
    "conversation_id as conversationId",
    "sender_id as senderId",
    "content",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  // Implementation of message operations
}
```

### Media Management

**Models**:

- `Media`: Core media asset model
- `MediaCollection`: Grouping mechanism for media

**Repositories**:

- `MediaRepository`: Media asset operations
- `MediaCollectionRepository`: Collection management
- `MediaTagRepository`: Media tagging

### Community

**Models**:

- `Group`: Community groups
- `GroupMember`: Group membership and roles

**Repositories**:

- `GroupRepository`: Group management
- `GroupMemberRepository`: Membership operations

### Content Moderation

**Models**:

- `ContentReport`: User-submitted content reports
- `ModerationAction`: Actions taken by moderators

**Repositories**:

- `ContentReportRepository`: Report management
- `ModerationActionRepository`: Moderation action tracking

### Discovery and Search

**Models**:

- `SearchIndex`: Content indexing for search

**Repositories**:

- `SearchIndexRepository`: Search operations

### Analytics

**Models**:

- `ActivityLog`: User activity tracking

**Repositories**:

- `ActivityLogRepository`: Analytics operations

## Database Migrations

The database schema is managed through migrations using `node-pg-migrate`.

The migration system provides:

- Version-controlled schema changes
- Forward and backward migrations
- Schema validation

Key components:

- `MigrationManager`: Executes migrations
- `migrationConfig`: Configuration for migration paths and templates

## Usage Examples

### Creating a User

```typescript
// Create a new user
const userData = {
  username: "johndoe",
  email: "john@example.com",
  password: "securePassword123",
};

try {
  const user = await userRepository.createWithHashedPassword(userData);
  console.log("User created:", user.id);
} catch (error) {
  if (error instanceof UserAlreadyExistsError) {
    console.error("User with this email already exists");
  } else if (error instanceof UsernameTakenError) {
    console.error("Username is already taken");
  } else if (error instanceof UserValidationError) {
    console.error("Invalid user data:", error.details);
  } else {
    console.error("Error creating user:", error);
  }
}
```

### Creating a Post

```typescript
// Create a new post
const postData = {
  userId: "user-uuid",
  type: PostType.TEXT,
  content: "Hello, world!",
  visibility: PostVisibility.PUBLIC,
  status: PostStatus.PUBLISHED,
};

try {
  const post = await postRepository.create(postData);
  console.log("Post created:", post.id);
} catch (error) {
  if (error instanceof PostValidationError) {
    console.error("Invalid post data:", error.details);
  } else if (error instanceof PostOperationError) {
    console.error("Error creating post:", error.message);
  } else {
    console.error("Unknown error:", error);
  }
}
```

### Finding Comments for a Post

```typescript
// Find comments for a post with pagination
const targetId = "post-uuid";
const options = {
  limit: 10,
  offset: 0,
  sortBy: "likeCount",
  sortOrder: "DESC",
};

try {
  // Get top-level comments
  const comments = await commentRepository.findByTarget(
    targetId,
    CommentTargetType.POST,
    null, // null parentId means top-level comments
    options.limit,
    options.offset,
    options.sortBy,
    options.sortOrder,
  );

  // Get comment count
  const count = await commentRepository.countByTarget(
    targetId,
    CommentTargetType.POST,
  );

  console.log(`Found ${count} comments, showing ${comments.length}`);
} catch (error) {
  console.error("Error fetching comments:", error);
}
```

### Implementing Social Interactions

```typescript
// Like a post
async function likePost(userId, postId) {
  try {
    // Use the toggleLike method from LikeRepository for atomic operation
    const { liked } = await likeRepository.toggleLike(
      userId,
      postId,
      LikeTargetType.POST,
    );

    // Update post like count
    await postRepository.updateLikeCount(postId, liked ? 1 : -1);

    return { success: true, liked };
  } catch (error) {
    if (error instanceof LikeErrors.AlreadyExists) {
      return { success: false, message: "Post already liked" };
    } else if (error instanceof LikeErrors.Validation) {
      return { success: false, message: "Invalid like data" };
    } else {
      throw new LikeOperationError("likePost", error);
    }
  }
}

// Follow a user
async function followUser(followerId, followingId) {
  try {
    // Check if user is trying to follow themselves
    if (followerId === followingId) {
      return { success: false, message: "Cannot follow yourself" };
    }

    // Use the toggleFollow method for atomic operation
    const isNowFollowing = await followRepository.toggleFollow(
      followerId,
      followingId,
    );

    return {
      success: true,
      following: isNowFollowing,
      message: isNowFollowing ? "Now following" : "Unfollowed",
    };
  } catch (error) {
    if (error instanceof SelfFollowError) {
      return { success: false, message: "Cannot follow yourself" };
    } else if (error instanceof FollowRateLimitError) {
      return { success: false, message: error.message };
    } else {
      throw new FollowOperationError("followUser", error);
    }
  }
}
```

## Error Handling

The module implements a comprehensive error handling strategy with domain-specific errors:

- Base error classes for each domain (e.g., `UserError`, `PostError`)
- Specific error types (e.g., `UserNotFoundError`, `PostValidationError`)
- Operation-specific errors (e.g., `UserOperationError`, `PostOperationError`)
- Validation errors with detailed field-specific information

Error hierarchy example from the codebase:

```
BaseError
└── DomainError
    ├── PostError
    │   ├── PostNotFoundError
    │   ├── PostValidationError
    │   ├── PostPermissionError
    │   ├── PostStatusError
    │   ├── PostVisibilityError
    │   └── PostOperationError
    ├── CommentError
    │   ├── CommentNotFoundError
    │   ├── CommentValidationError
    │   ├── CommentContentPolicyViolationError
    │   └── CommentOperationError
    ├── LikeError
    │   ├── LikeNotFoundError
    │   ├── LikeErrors.AlreadyExists
    │   ├── LikeErrors.Validation
    │   └── LikeOperationError
    ├── FollowError
    │   ├── FollowNotFoundError
    │   ├── FollowValidationError
    │   ├── FollowOperationError
    │   ├── FollowAlreadyExistsError
    │   ├── SelfFollowError
    │   └── FollowRateLimitError
    └── NotificationError
        ├── NotificationNotFoundError
        ├── NotificationUserMismatchError
        ├── NotificationAlreadyReadError
        └── NotificationOperationError
```

## Transaction Management

The module supports database transactions for operations that require atomicity. The `BaseRepository` provides a `withTransaction` method:

```typescript
// Example from FollowRepository
async create(data): Promise<Follow> {
  return this.withTransaction(async () => {
    try {
      // Check if user is trying to follow themselves
      if (data.followerId === data.followingId) {
        throw new SelfFollowError(data.followerId);
      }

      // Check if already following
      const existingFollow = await this.findByUserAndTarget(
        data.followerId,
        data.followingId
      );

      if (existingFollow) {
        throw new FollowAlreadyExistsError(data.followerId, data.followingId);
      }

      // Check for rate limiting
      await this.checkFollowRateLimit(data.followerId);

      // Create and validate Follow object
      const follow = new Follow({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Validate and insert record
      // ...

      return this.mapResultToModel(result.rows[0]);
    } catch (error) {
      // Handle and re-throw errors
      // ...
    }
  });
}
```

Complex operations example:

```typescript
// Example multi-step operation with transaction
const result = await postRepository.withTransaction(async (client) => {
  // Step 1: Create post
  const post = await postRepository.create(postData, client);

  // Step 2: Process hashtags
  const hashtags = extractHashtags(postData.content);
  for (const tag of hashtags) {
    const hashtag = await hashtagRepository.findOrCreate(tag, client);
    await postHashtagRepository.create(
      {
        postId: post.id,
        hashtagId: hashtag.id,
      },
      client,
    );
  }

  // Step 3: Process media attachments
  if (postData.mediaIds && postData.mediaIds.length > 0) {
    await mediaRepository.attachToEntity(
      postData.mediaIds,
      post.id,
      EntityType.POST,
      client,
    );
  }

  return post;
});
```

## SQL Injection Prevention

The repositories include built-in protection against SQL injection:

```typescript
// Example from CommentRepository.findByTarget
async findByTarget(
  targetId: string,
  targetType: CommentTargetType,
  parentId: string | null = null,
  limit = 20,
  offset = 0,
  sortBy = "createdAt",
  sortOrder = "DESC"
): Promise<Comment[]> {
  try {
    // Validate and sanitize sort column to prevent SQL injection
    const validSortColumns = ["createdAt", "updatedAt", "likeCount"];
    const sortColumn = validSortColumns.includes(sortBy)
      ? this.snakeCase(sortBy)
      : "created_at";

    // Validate sort order
    const order = sortOrder === "ASC" ? "ASC" : "DESC";

    // Use parameterized queries to prevent SQL injection
    let query = `
      SELECT ${this.columns.join(", ")}
      FROM ${this.tableName}
      WHERE target_id = $1 AND target_type = $2
    `;

    const params = [targetId, targetType];

    if (parentId === null) {
      query += " AND parent_id IS NULL";
    } else {
      query += ` AND parent_id = $${params.length + 1}`;
      params.push(parentId);
    }

    query += ` ORDER BY ${sortColumn} ${order}`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(String(limit), String(offset));

    const result = await this.executeQuery<Record<string, unknown>>(
      query,
      params
    );
    return result.rows.map((row) => this.mapResultToModel(row));
  } catch (error) {
    throw new CommentOperationError("findByTarget", error);
  }
}
```

## Best Practices

1. **Separation of Concerns**:

   - Models handle business logic and validation
   - Repositories handle database operations
   - Services handle application logic

2. **Error Handling**:

   - Use domain-specific errors
   - Provide detailed error messages
   - Handle errors at appropriate levels

3. **Validation**:

   - Validate data before storage
   - Use type validation
   - Enforce business rules at the model level

4. **Transactions**:

   - Use transactions for operations that modify multiple tables
   - Ensure atomicity for critical operations

5. **Query Optimization**:
   - Use indexes for frequently queried fields
   - Limit result sets with pagination
   - Use joins instead of multiple queries when appropriate

## Integration Points

The database module integrates with:

1. **API Layer**: Through service classes that use repositories
2. **Authentication System**: Via user and token repositories
3. **Business Logic Layer**: Through domain models
4. **Search System**: Via search index repository
5. **File Storage**: Integrated with media repositories

## Configuration

Database configuration should be set through environment variables:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=app_database
DB_USER=postgres
DB_PASSWORD=secure_password
DB_SSL=false
DB_POOL_SIZE=10
```

## Extending the System

To add a new entity to the system:

1. Create a model in the appropriate domain folder
2. Implement validation and business logic
3. Create a repository for database operations
4. Create migrations for schema changes
5. Register the new components in dependency injection

Example for a new "Product" entity:

```typescript
// 1. Create model
export class Product extends BaseModel {
  id: string;
  name: string;
  price: number;
  description: string;

  validate() {
    const errors = [];
    if (!this.name) errors.push({ field: "name", message: "Name is required" });
    if (this.price <= 0)
      errors.push({ field: "price", message: "Price must be positive" });
    return errors;
  }
}

// 2. Create repository
export class ProductRepository extends BaseRepository<Product> {
  protected tableName = "products";
  protected columns = [
    "id",
    "name",
    "price",
    "description",
    "created_at as createdAt",
    "updated_at as updatedAt",
  ];

  // Implement custom methods
  async findByPriceRange(min: number, max: number): Promise<Product[]> {
    try {
      const query = `
        SELECT ${this.columns.join(", ")}
        FROM ${this.tableName}
        WHERE price >= $1 AND price <= $2
        ORDER BY price ASC
      `;

      const result = await this.executeQuery(query, [min, max]);
      return result.rows.map((row) => this.mapResultToModel(row));
    } catch (error) {
      throw new ProductOperationError("findByPriceRange", error);
    }
  }
}
```

## Conclusion

The database module provides a robust foundation for data management with clean separation of concerns, comprehensive error handling, and flexible data access patterns. By following the established patterns when extending the system, you can maintain a consistent and maintainable codebase.

The implementation details from the actual repositories show how the system handles complex operations like:

- Pagination and sorting with SQL injection protection
- Transaction management for atomic operations
- Nested data relationships (comments, replies, follows, etc.)
- Rate limiting for social interactions
- Batch operations for performance optimization
- Proper error handling with domain-specific errors
- Data validation at multiple levels
