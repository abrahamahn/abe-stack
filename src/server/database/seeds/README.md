# Seed Database

A comprehensive PostgreSQL database schema and seed data for a modern social media and multimedia streaming application. This boilerplate provides a solid foundation for building platforms that combine social networking features with robust multimedia content delivery.

## Overview

This project delivers a production-ready database layer that supports:

- Social networking functionality (profiles, connections, interactions)
- Multimedia content streaming and management
- Real-time messaging and notifications
- User-generated content with moderation
- Community features with groups and collections
- Advanced search and discovery

## Key Features

### Social Networking
- User profiles with customizable display settings
- Follow/follower relationships
- Activity feeds and timelines
- Likes, comments, and social interactions
- @mentions and hashtag functionality

### Multimedia Streaming
- Support for various media types (images, videos, audio)
- Media collections and playlists
- Processing status tracking for transcoding workflows
- Media metadata for recommendation engines
- Viewer/listener analytics

### Content Engagement
- Nested comments and discussions
- Bookmark and save functionality
- Content sharing and re-sharing
- Trending content algorithms

### Messaging & Real-time Features
- Direct messaging (1:1)
- Group conversations
- Read receipts and status tracking
- Media attachments in messages

### Community Features
- User-created groups and communities
- Role-based permissions within groups
- Community moderation tools
- Group content feeds

### Security & Moderation
- Role-based access control system
- Content reporting and moderation workflow
- User safety features
- Activity logging and audit trails

## Technical Architecture

### Database Schema

The database consists of 28 carefully designed tables organized into logical modules:

#### User Management
- `users` - Core user accounts and profile data
- `roles` & `permissions` - Granular access control
- `user_roles` & `role_permissions` - Role assignments
- `tokens` & `password_reset_tokens` - Authentication

#### Content & Media
- `posts` - User-generated content
- `media` - Uploaded multimedia files with metadata
- `media_collections` - Grouping and playlist functionality
- `media_tags` - Content categorization

#### Social Interaction
- `comments` & `comment_likes` - Discussion functionality
- `likes` - Content engagement
- `follows` - User connections
- `hashtags` - Content discovery

#### Community
- `groups` - Communities and interest groups
- `group_members` - Membership and roles

#### Communication
- `conversations` - Message threads
- `messages` - Individual communications

#### Moderation & Safety
- `content_reports` - User flagging system
- `moderation_actions` - Admin interventions
- `activity_logs` - Audit trail

#### Engagement
- `notifications` - User alerts
- `bookmarks` - Saved content
- `search_indices` - Fast content discovery

## Getting Started

### Prerequisites
- PostgreSQL 12+
- psql command-line tool

### Installation

1. Create a new PostgreSQL database:
   ```bash
   createdb social_streaming_platform
   ```

2. Configure database connection in `run_seed.sh`:
   ```bash
   DB_NAME="social_streaming_platform"
   DB_USER="your_username"
   DB_PASSWORD="your_password"
   DB_HOST="localhost"
   DB_PORT="5432"
   ```

3. Make scripts executable:
   ```bash
   chmod +x run_seed.sh clear_data.sh
   ```

4. Run the schema and seed data:
   ```bash
   ./run_seed.sh
   ```

### Sample Data

The seed scripts populate the database with realistic test data:

- 5 sample users with different roles
- Content posts with engagement metrics
- Media files including images and videos
- Conversations with message history
- User groups with memberships
- Content moderation examples

This sample data helps visualize the platform's functionality and provides a starting point for development.

## Development Workflow

### Database Reset

To clear all data while preserving the schema (useful during development):

```bash
./clear_data.sh
```

### Logs

When running the seed scripts, detailed logs are saved to the `logs/` directory for troubleshooting.

## Integration Points

### API Development
The schema is designed to support RESTful or GraphQL APIs with efficient query patterns for common social and streaming operations.

### Authentication
The token system supports various authentication methods including JWT, OAuth, and session-based authentication.

### Media Processing
The media tables support integration with media processing pipelines, CDNs, and streaming services.

## Extending the Platform

The boilerplate is designed to be extensible for various use cases:

- **Content Creators**: Add monetization tables for tips, subscriptions, or paid content
- **E-commerce**: Extend with product, order, and payment tables
- **Learning Platforms**: Add course, lesson, and progress tracking tables
- **Events**: Incorporate event scheduling and attendance tracking

## Performance Considerations

The schema includes:
- Strategic indices for common query patterns
- Denormalized counters for high-frequency metrics
- JSONB fields for flexible metadata storage
- UUID primary keys for distributed systems

## License

This database schema is provided as an open source reference implementation. You are free to use and modify it for both personal and commercial projects.

## Contributing

Contributions to improve the schema or add new features are welcome. Please submit pull requests or open issues for discussion.