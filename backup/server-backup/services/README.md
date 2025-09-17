# Services Layer

The services layer contains business-focused components that implement application logic. This layer uses the infrastructure layer for technical capabilities but adds business rules, workflows, and domain-specific logic.

## Principles

1. The services layer should contain business logic and application-specific code
2. It should focus on "what" the application does, not "how" it does it
3. It should use interfaces provided by the infrastructure layer
4. It should be organized by business domain or feature

## Components

### ✅ Properly in Services

- **Business Domain Services**

  - `GeoService` - Provides business-focused geolocation capabilities
  - `SearchService` - Business-specific search service using search providers
  - `MessagingService` - Application-specific messaging service

- **Job Processors**

  - `MediaProcessingJobProcessor` - Processes media-related jobs
  - `EmailNotificationJobProcessor` - Handles email notification jobs
  - `UserOnboardingJobProcessor` - Manages user onboarding workflows

- **Job Orchestration**

  - `JobOrchestrationService` - Orchestrates job execution and retry logic
  - `JobProcessorRegistry` - Registry of job processors

- **Feature-specific Services**
  - User services
  - Email services
  - Media services
  - Search services
  - Social services
  - Analytics services

### ❌ Should NOT be in Services

- **Technical Infrastructure**
  - Logging mechanisms
  - Configuration systems
  - Cache providers
  - Database connections
  - Storage providers
  - WebSocket infrastructure

## Organization

The services layer is organized by business domain or feature:

- `/core` - Core application services
- `/user` - User-related services
- `/email` - Email services
- `/media` - Media processing services
- `/search` - Search functionality
- `/jobs` - Job orchestration
- `/analytics` - Analytics services
- `/social` - Social features
- `/shared` - Shared business logic

## Implementation Notes

When implementing services:

1. Use dependency injection to consume infrastructure components
2. Focus on business rules and domain logic
3. Create clear separation between services using interfaces
4. Use the infrastructure layer for technical capabilities
5. Keep business logic out of the infrastructure layer
