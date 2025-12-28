# Social Media Platform Domain Models

This repository contains the domain models for a comprehensive social media platform. These models represent the core business entities and relationships that form the foundation of the application.

## Architecture Overview

The codebase follows a domain-driven design approach with a clear separation of concerns:

- **Domain Models**: Define the data structure, business rules, and validation logic
- **Repositories**: Handle database operations (not included in this codebase)
- **Business Logic**: Encapsulated within the domain models

The models follow the principle that they should:
1. Define the data structure and types
2. Implement business logic and validation rules
3. Provide methods for data transformation and manipulation
4. NOT handle database operations (that's the repository's job)

## Project Structure

The project is organized into modules based on domain concepts:

```
src/
├── BaseModel.ts         # Base model that all domain models extend
├── analytics/           # Analytics-related models
├── auth/                # Authentication and authorization models
├── community/           # Community and group-related models
├── discovery/           # Search and discovery models
├── media/               # Media-related models
├── messaging/           # Messaging and conversation models
├── moderation/          # Content moderation models
├── shared/              # Shared types and enums
└── social/              # Social interaction models
```

## Key Components

### Base Model

All domain models extend the `BaseModel` class, which provides:
- UUID generation
- Timestamp management (createdAt, updatedAt)
- Common interface for all models

### Auth Models

- **User**: Core user model with authentication methods
- **Role**: User roles with permissions
- **Permission**: Granular permissions for access control
- **Token**: JWT and other authentication tokens
- **PasswordResetToken**: Password reset functionality

### Social Models

- **Post**: Social media posts with various types and visibility levels
- **Comment**: Comments on posts and other content
- **Like**: User likes on various content types
- **Follow**: User follow relationships
- **Bookmark**: User bookmarks for content
- **Notification**: User notifications for various events
- **Hashtag**: Hashtags for content categorization

### Media Models

- **Media**: Images, videos, and audio files
- **MediaCollection**: Collections of media items
- **MediaTag**: Tags for media items

### Community Models

- **Group**: User groups with various visibility settings
- **GroupMember**: Group membership with roles

### Messaging Models

- **Conversation**: Direct and group conversations
- **Message**: Messages within conversations

### Moderation Models

- **ContentReport**: Reports of inappropriate content
- **ModerationAction**: Actions taken by moderators

### Discovery Models

- **SearchIndex**: Indexed content for search functionality

## Usage Examples

### Creating a User

```typescript
import { User, UserType } from './auth/User';

const user = new User({
  username: 'johndoe',
  email: 'john.doe@example.com',
  password: 'hashedpassword', // Should be hashed before creating user
  displayName: 'John Doe',
  type: UserType.STANDARD
});

// Validate user data
user.validate();

// Save user (would be handled by a repository)
// userRepository.save(user);
```

### Creating a Post

```typescript
import { Post, PostType, PostVisibility, PostStatus } from './social/Post';

const post = new Post({
  userId: 'user123',
  type: PostType.TEXT,
  content: 'Hello, world!',
  status: PostStatus.PUBLISHED,
  visibility: PostVisibility.PUBLIC,
  mediaIds: [],
  likeCount: 0,
  commentCount: C,
  shareCount: 0,
  viewCount: 0
});

// Validate post data
post.validate();

// Save post (would be handled by a repository)
// postRepository.save(post);
```

## Key Features

### Validation

All models include validation logic to ensure data integrity:

```typescript
// Example from User.ts
validate(): void {
  if (!this.username) {
    throw new Error("Username is required");
  }

  if (!this.email) {
    throw new Error("Email is required");
  }

  if (!this.isValidEmail(this.email)) {
    throw new Error("Invalid email format");
  }

  if (!this.password) {
    throw new Error("Password is required");
  }
}
```

### Type Safety

The codebase uses TypeScript interfaces to ensure type safety:

```typescript
export interface UserAttributes extends BaseModel {
  username: string;
  email: string;
  password: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  bio: string | null;
  profileImage: string | null;
  bannerImage: string | null;
  role: string;
  isVerified: boolean;
  emailConfirmed: boolean;
  emailToken: string | null;
  emailTokenExpire: Date | null;
  lastEmailSent: Date | null;
  type: UserType;
}
```

### Business Logic

Business logic is encapsulated within the models:

```typescript
// Example from User.ts
async comparePassword(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
}

async updatePassword(newPassword: string): Promise<void> {
  this.password = await bcrypt.hash(newPassword, 10);
  this.updatedAt = new Date();
}
```

## Extensibility

The architecture is designed to be extensible:

1. New features can be added by creating new domain models
2. Existing models can be extended with new fields and methods
3. The separation of concerns makes it easy to add new functionality without modifying existing code

## Development Guidelines

When extending this codebase, follow these guidelines:

1. Domain models should be responsible for:
   - Data structure definition
   - Business logic implementation
   - Data validation
   - State management

2. Domain models should NOT:
   - Directly access databases
   - Handle HTTP requests/responses
   - Implement presentation logic

3. Use TypeScript interfaces to define data structures
4. Implement validation logic in model classes
5. Follow the naming conventions established in the codebase

## License
Abraham Joongwhan Ahn. All Rights Reserved.