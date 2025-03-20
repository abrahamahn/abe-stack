# Database Repositories

This directory contains the database abstraction layer for the application. It provides a robust set of repository classes that handle all database operations and data transformations.

## Overview

The database layer follows the Repository pattern to separate data access logic from business logic. Each repository is responsible for:

1. Handling all database operations (CRUD)
2. Converting between database and model formats
3. Managing database connections and transactions
4. Providing domain-specific query methods

Business logic is kept separate in model classes, which repositories use to validate and transform data.

## Structure

The codebase is organized into the following structure:

```
database/
├── config/             # Database configuration and connection management
├── models/             # Data models for all entities
└── repositories/       # Repository classes for all data access
    ├── BaseRepository.ts           # Base repository with common functionality
    ├── analytics/                  # Analytics repositories
    ├── auth/                       # Authentication repositories
    ├── community/                  # Community repositories
    ├── discovery/                  # Discovery repositories
    ├── media/                      # Media repositories
    ├── messaging/                  # Messaging repositories
    ├── moderation/                 # Moderation repositories
    ├── social/                     # Social repositories
    └── index.ts                    # Main export file
```

## Base Repository

`BaseRepository` provides common database functionality for all repositories, including:

- CRUD operations
- Transaction management
- Data validation
- Error handling
- Query building and execution

All other repositories extend this base class to inherit these capabilities and add domain-specific methods.

## Repository Types

### Analytics
- `ActivityLogRepository`: Tracks user activities and events

### Auth
- `UserRepository`: User account management
- `RoleRepository`: Role management
- `PermissionRepository`: Permission management
- `TokenRepository`: Authentication token management
- `PasswordResetTokenRepository`: Password reset functionality
- `UserRoleRepository`: User-role relationship management
- `RolePermissionRepository`: Role-permission relationship management
- `UserPreferencesRepository`: User preferences storage

### Community
- `GroupRepository`: Group management
- `GroupMemberRepository`: Group membership management

### Discovery
- `SearchIndexRepository`: Search indexing and querying

### Media
- `MediaRepository`: Media file storage and management
- `MediaCollectionRepository`: Collections of media files
- `MediaTagRepository`: Tags for media items

### Messaging
- `ConversationRepository`: Conversation management
- `MessageRepository`: Message storage and retrieval

### Moderation
- `ContentReportRepository`: Content reporting functionality
- `ModerationActionRepository`: Moderation action tracking

### Social
- `PostRepository`: Post creation and management
- `CommentRepository`: Comment management
- `LikeRepository`: Like functionality
- `BookmarkRepository`: Bookmark functionality
- `CommentLikeRepository`: Comment like functionality
- `FollowRepository`: Follow relationships
- `HashtagRepository`: Hashtag management
- `NotificationRepository`: User notifications

## Usage

### Basic CRUD Operations

All repositories provide basic CRUD operations:

```typescript
// Create
const newUser = await userRepository.create({
  username: 'johndoe',
  email: 'john@example.com',
  // ... other user attributes
});

// Read
const user = await userRepository.findById('user-id');
const users = await userRepository.findAll({ username: 'john' });

// Update
const updatedUser = await userRepository.update('user-id', { email: 'new-email@example.com' });

// Delete
const success = await userRepository.delete('user-id');
```

### Advanced Query Methods

Each repository provides domain-specific query methods:

```typescript
// Find posts by a specific user
const { posts, count } = await postRepository.findByUserId('user-id', 10, 0);

// Get all comments for a post
const comments = await commentRepository.findByTarget('post-id', 'POST');

// Find followers of a user
const followers = await followRepository.getFollowersForUser('user-id');
```

### Transaction Support

Repositories support database transactions:

```typescript
// Using withTransaction method
await userRepository.withTransaction(async (client) => {
  const user = await userRepository.findById('user-id', client);
  await userRoleRepository.assignRole('user-id', 'role-id', client);
  return user;
});
```

## Error Handling

Repositories use custom error classes to provide clear error messages:

- `ValidationFailedError`: Data validation errors
- Domain-specific errors (e.g., `UserNotFoundError`, `PostNotFoundError`)
- Generic errors with detailed error messages

## Best Practices

1. **Keep repositories focused on data access**: Business logic should be in models, not repositories
2. **Validate data before database operations**: Use model validation methods
3. **Use transactions for multi-step operations**: Ensure data consistency
4. **Handle errors appropriately**: Catch and log database errors, then throw domain-specific errors
5. **Document repository methods**: Explain what each method does and its parameters
6. **Singleton pattern**: Use singleton instances for repositories to avoid multiple database connections

## Contributing

When adding a new repository:

1. Extend `BaseRepository` with appropriate type parameter
2. Implement required abstract methods
3. Add domain-specific query methods
4. Include proper error handling
5. Add the repository to the appropriate domain index file
6. Update the main index.ts export

## License
Abraham Joongwhan Ahn. All Rights Reserved.