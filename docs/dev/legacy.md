# Legacy Codebase Reference

> Reference guide for migrating utilities and components from `../../abe-stack-legacy`.
> Copy patterns when needed. Do not import directly.

---

## Migration Effort Estimates

| Feature                                     | Hours Saved   | Effort to Add  |
| ------------------------------------------- | ------------- | -------------- |
| Rate limit presets                          | 4-6h          | Drop-in        |
| Validation middleware                       | 2h/API        | Drop-in        |
| File utilities (full suite)                 | 6-8h          | Drop-in        |
| Content types                               | 2h            | Drop-in        |
| Signed URLs                                 | 3h            | Drop-in        |
| Cache + memoization                         | 6-8h          | Drop-in        |
| Image processing                            | 8-10h         | 1-2h config    |
| Media/stream processors                     | 6-8h          | 2-3h config    |
| Search builder                              | 6-8h          | 4-6h implement |
| User preferences                            | 4-6h          | 1-2h DB hook   |
| Email job processor                         | 4h            | 1h integrate   |
| Frontend hooks (8 hooks)                    | 8-10h         | Drop-in        |
| Frontend formatters                         | 2-3h          | Drop-in        |
| DOM utilities (focus, cookies)              | 3-4h          | Drop-in        |
| Style utilities                             | 2-3h          | Drop-in        |
| React contexts (4 contexts)                 | 8-12h         | 2-4h adapt     |
| Client services (5 services)                | 10-15h        | 3-5h adapt     |
| Security utils (full suite)                 | 10-14h        | Drop-in        |
| Token utils                                 | 3-4h          | Drop-in        |
| Custom Zod validators                       | 2-3h          | Drop-in        |
| Cookie utilities                            | 3-4h          | Drop-in        |
| Error classes                               | 4-6h          | Drop-in        |
| Database utils (transactions, batch)        | 6-8h          | 2-3h adapt     |
| Common utils (fuzzy, dates, etc.)           | 3-4h          | Drop-in        |
| Base classes (Model, Service, JobProcessor) | 6-8h          | 2-3h adapt     |
| Pagination types                            | 2-3h          | Drop-in        |
| ServerManager                               | 4-6h          | 2-3h adapt     |
| Session module                              | 6-8h          | 2-3h adapt     |
| Auth DTOs                                   | 4-6h          | 1-2h adapt     |
| Job queue infrastructure                    | 4-6h          | 1-2h adapt     |
| Token storage services                      | 4-6h          | 1-2h adapt     |
| Secret providers                            | 4-6h          | 1-2h adapt     |
| Test infrastructure                         | 8-12h         | 3-5h adapt     |
| Layout components                           | 3-4h          | 1-2h adapt     |
| UI components (8 components)                | 12-16h        | 4-6h adapt     |
| Auth components (5 components)              | 8-12h         | 3-5h adapt     |
| Social components (5 components)            | 10-15h        | 4-6h adapt     |
| Media components (4 components)             | 8-12h         | 3-5h adapt     |
| Email verification service                  | 4-6h          | 1-2h adapt     |
| User profile service                        | 6-8h          | 2-3h adapt     |
| User onboarding job                         | 3-4h          | 1-2h adapt     |
| **Total**                                   | **~240-310h** | ~60-85h work   |

---

## Backend Utilities

| Utility                | Legacy Path                                                                     |
| ---------------------- | ------------------------------------------------------------------------------- |
| Rate limiting          | `main/server/infrastructure/middleware/rateLimitMiddleware.ts`                  |
| Validation             | `main/server/infrastructure/middleware/validationMiddleware.ts`                 |
| File utils             | `main/server/infrastructure/storage/FileUtils.ts`                               |
| File helpers           | `main/server/infrastructure/files/fileHelpers.ts`                               |
| Content types          | `main/server/infrastructure/storage/ContentTypes.ts`                            |
| Storage service        | `main/server/infrastructure/storage/StorageService.ts`                          |
| Cache service          | `main/server/infrastructure/cache/CacheService.ts`                              |
| Image processor        | `main/server/infrastructure/processor/ImageProcessor.ts`                        |
| Media processor        | `main/server/infrastructure/processor/MediaProcessor.ts`                        |
| Stream processor       | `main/server/infrastructure/processor/StreamProcessor.ts`                       |
| Search builder         | `main/server/infrastructure/search/SearchService.ts`                            |
| Email service          | `main/server/modules/core/email/services/email.service.ts`                      |
| Email templates        | `main/server/modules/core/email/services/email-template.service.ts`             |
| Email job              | `main/server/modules/core/email/processors/email-notification.job.processor.ts` |
| User prefs             | `main/server/modules/core/users/services/user-preference.service.ts`            |
| Geolocation            | `main/server/modules/core/geo/middleware/geo.middleware.ts`                     |
| Password utils         | `main/server/infrastructure/security/passwordUtils.ts`                          |
| Encryption             | `main/server/infrastructure/security/encryptionUtils.ts`                        |
| Token manager          | `main/server/infrastructure/security/TokenManager.ts`                           |
| Token blacklist        | `main/server/infrastructure/security/InMemoryTokenBlacklist.ts`                 |
| Token storage          | `main/server/infrastructure/security/InMemoryTokenStorage.ts`                   |
| Auth helpers           | `main/server/infrastructure/security/authHelpers.ts`                            |
| Cookie utils           | `main/server/infrastructure/security/cookieUtils.ts`                            |
| CORS config            | `main/server/infrastructure/security/corsConfig.ts`                             |
| CSRF utils             | `main/server/infrastructure/security/csrfUtils.ts`                              |
| Signature helpers      | `main/server/infrastructure/security/signatureHelpers.ts`                       |
| Security helpers       | `main/server/infrastructure/security/securityHelpers.ts`                        |
| Token utils            | `main/server/infrastructure/security/tokenUtils.ts`                             |
| Custom validators      | `main/server/shared/types/dataTypes.ts`                                         |
| WebSocket auth         | `main/server/infrastructure/security/WebSocketAuthService.ts`                   |
| Logging                | `main/server/infrastructure/logging/LoggerService.ts`                           |
| Date helpers           | `main/server/infrastructure/utils/dateHelpers.ts`                               |
| Random ID              | `main/server/infrastructure/utils/randomId.ts`                                  |
| Shallow equal          | `main/server/infrastructure/utils/shallowEqual.ts`                              |
| Fuzzy match            | `main/server/shared/utils/fuzzyMatch.ts`                                        |
| Route helpers          | `main/server/shared/helpers/routeHelpers.ts`                                    |
| Type helpers           | `main/server/shared/types/typeHelpers.ts`                                       |
| Deferred promise       | `main/server/infrastructure/promises/DeferredPromise.ts`                        |
| Batched queue          | `main/server/infrastructure/queue/BatchedQueue.ts`                              |
| Transaction service    | `main/server/infrastructure/database/TransactionService.ts`                     |
| Migration manager      | `main/server/infrastructure/database/migrationManager.ts`                       |
| WebSocket service      | `main/server/infrastructure/pubsub/WebSocketService.ts`                         |
| WebSocket types        | `main/server/infrastructure/pubsub/WebSocketTypes.ts`                           |
| Job service            | `main/server/infrastructure/jobs/JobService.ts`                                 |
| App lifecycle          | `main/server/infrastructure/lifecycle/ApplicationLifecycle.ts`                  |
| Server manager         | `main/server/infrastructure/server/ServerManager.ts`                            |
| Base model             | `main/server/modules/base/baseModel.ts`                                         |
| Base service           | `main/server/modules/base/baseService.ts`                                       |
| Base job processor     | `main/server/modules/base/baseJobProcessor.ts`                                  |
| Shared types           | `main/server/shared/types/types.ts`                                             |
| Format date            | `main/server/shared/date/formatDate.ts`                                         |
| Error classes          | `main/server/infrastructure/errors/`                                            |
| Error handler          | `main/server/infrastructure/errors/ErrorHandler.ts`                             |
| Job queue              | `main/server/infrastructure/jobs/JobQueue.ts`                                   |
| File job storage       | `main/server/infrastructure/jobs/FileJobStorage.ts`                             |
| Console transport      | `main/server/infrastructure/logging/ConsoleTransport.ts`                        |
| Server logger          | `main/server/infrastructure/logging/ServerLogger.ts`                            |
| Token storage          | `main/server/infrastructure/security/TokenStorageService.ts`                    |
| Token blacklist        | `main/server/infrastructure/security/TokenBlacklistService.ts`                  |
| CORS config            | `main/server/infrastructure/security/CorsConfigService.ts`                      |
| Secret providers       | `main/server/infrastructure/config/secrets/`                                    |
| Session module         | `main/server/modules/core/sessions/`                                            |
| Preferences middleware | `main/server/modules/core/preferences/PreferencesMiddleware.ts`                 |
| Auth DTOs              | `main/server/modules/core/auth/features/*/models/`                              |
| Reset service          | `main/server/modules/reset/ResetService.ts`                                     |
| Verification service   | `main/server/modules/core/auth/services/verification.service.ts`                |
| User profile service   | `main/server/modules/core/users/services/user-profile.service.ts`               |
| User onboarding job    | `main/server/modules/core/users/processors/user-onboarding.job.processor.ts`    |
| Auth helpers           | `main/server/modules/core/auth/helpers/auth.helpers.ts`                         |
| Token utils            | `main/server/modules/core/auth/features/token/token.utils.ts`                   |
| RBAC middleware        | `main/server/modules/core/auth/middleware/rbac.middleware.ts`                   |
| MFA service            | `main/server/modules/core/auth/features/mfa/providers/mfa.service.ts`           |
| Permission service     | `main/server/modules/core/permission/services/permission.service.ts`            |
| Role service           | `main/server/modules/core/permission/services/role.service.ts`                  |

---

## Frontend Utilities

| Utility               | Legacy Path                                     |
| --------------------- | ----------------------------------------------- |
| useAsync              | `main/client/hooks/useAsync.ts`                 |
| useOnline             | `main/client/hooks/useOnline.ts`                |
| useShortcut           | `main/client/hooks/useShortcut.ts`              |
| usePopper             | `main/client/hooks/usePopper.ts`                |
| useCounter            | `main/client/hooks/useCounter.ts`               |
| useRefCurrent         | `main/client/hooks/useRefCurrent.ts`            |
| useRefPrevious        | `main/client/hooks/useRefPrevious.ts`           |
| useSocialInteractions | `main/client/hooks/useSocialInteractions.ts`    |
| Formatters            | `main/client/helpers/formatters.ts`             |
| Cookie helpers        | `main/client/helpers/cookieHelpers.ts`          |
| Focus helpers         | `main/client/helpers/focusHelpers.ts`           |
| Merge events          | `main/client/helpers/mergeEvents.ts`            |
| Passthrough ref       | `main/client/helpers/passthroughRef.tsx`        |
| Style utils           | `main/client/utils/styleUtils.ts`               |
| Theme context         | `main/client/components/theme/ThemeContext.tsx` |
| Auth context          | `main/client/contexts/AuthContext.tsx`          |
| Social context        | `main/client/contexts/SocialContext.tsx`        |
| Client env            | `main/client/services/ClientEnvironment.tsx`    |
| Router service        | `main/client/services/Router.ts`                |
| API client            | `main/client/services/api.ts`                   |
| Social service        | `main/client/services/social.ts`                |
| Auth client           | `main/client/services/AuthClient.ts`            |
| WS PubSub client      | `main/client/services/WebsocketPubsubClient.ts` |
| Client config         | `main/client/services/ClientConfig.ts`          |
| Main layout           | `main/client/layouts/MainLayout.tsx`            |
| Page content          | `main/client/layouts/PageContent.tsx`           |
| Routes                | `main/client/routes.tsx`                        |
| Global styles         | `main/client/styles.ts`                         |
| Base test             | `main/client/test/base.test.ts`                 |
| Base e2e              | `main/client/test/base.e2e.ts`                  |

---

## Frontend Components

| Component         | Legacy Path                                  |
| ----------------- | -------------------------------------------- |
| FileUpload        | `main/client/components/ui/FileUpload.tsx`   |
| Throttle          | `main/client/components/ui/Throttle.tsx`     |
| OfflineBadge      | `main/client/components/ui/OfflineBadge.tsx` |
| ComboBox          | `main/client/components/ui/ComboBox.tsx`     |
| FuzzyString       | `main/client/components/ui/FuzzyString.tsx`  |
| ListBox           | `main/client/components/ui/ListBox.tsx`      |
| Popup             | `main/client/components/ui/Popup.tsx`        |
| DropdownMenu      | `main/client/components/ui/DropdownMenu.tsx` |
| ProtectedRoute    | `main/client/components/ProtectedRoute.tsx`  |
| Auth modals       | `main/client/components/auth/`               |
| Social components | `main/client/components/social/`             |
| Media components  | `main/client/components/media/`              |

---

## Potential Migrations (Copy When Needed)

These items from legacy could be migrated when the feature is needed.

### Request Handling

- **Validation middleware** - body, query, params with Zod
- **Rate limit presets** - for auth endpoints (login, register, reset)
- Request ID middleware with correlation IDs

### Structured Logging

- Child logger creation with context inheritance
- Correlation IDs for request tracking
- Log levels (DEBUG, INFO, WARN, ERROR)
- Pretty-printing in dev, compact in production
- **ConsoleTransport** - console output transport with formatting
- **ServerLogger** - server-specific logger with request context

### Session Management

- Session DTOs (session.dto.ts)
- Session models (session.model.ts)
- Session manager (orchestration layer for session lifecycle)
- Session service with CRUD operations
- Session controller for endpoints

### User Management

- **User preferences system** - notifications, privacy settings
- **Preferences middleware** - handling user preference headers/cookies
- **Email verification service** - token generation, verification
- **User profile service** - Profile CRUD with custom fields
- **User onboarding job processor** - welcome email, setup, notifications

### Security Utilities

- **CSRF utilities** - generate, validate tokens with HMAC signatures
- **Encryption utilities** - AES-256-GCM with authentication
- **Password strength validation** - configurable requirements
- **Token storage service** - persistence, blacklisting
- **CORS config service** - dynamic origin handling
- **Input sanitization** - XSS and SQL injection prevention
- **Security headers middleware** - standard headers
- **URL validation** - domain whitelist support
- **CSP builder** - fluent API for Content Security Policy

### Token Utilities

- `createTokenId()` - generate unique token identifiers
- `generateSecureToken()` - crypto-secure token generation
- `extractTokenFromHeader()` - parse Bearer token
- `isTokenExpired()` - check token validity
- `hashToken()` - secure token hashing for storage

### Common Utilities

- `randomId(seed?)` - UUID generation with optional seeding
- `shallowEqual(a, b)` - comparison utility
- **Fuzzy matching** - for search/autocomplete
- **Route helpers** - parseRoute, formatRoute, matchRouteWithParams
- **DeferredPromise** - external resolve/reject for async patterns
- **ReactiveMap** - key-based subscriptions for cache updates
- `sleep(ms)` - Promise-based delay helper
- **Date helpers** - time constants, formatDate with locale support
- **Type helpers** - `Simplify<T>`, `Assert<A, B>`

### File Utilities

- `ensureDirectory()` - create directories recursively
- `fileExists()` - check file existence
- `getFileStats()` - get file metadata
- `readFile()` / `writeFile()` - buffer operations
- `deleteFile()` - delete with retry logic
- `listFiles()` - list with pattern matching
- `copyFile()` / `moveFile()` - file operations
- `createReadStream()` / `createWriteStream()` - stream creation
- `detectContentType()` - MIME type detection
- `normalizeFilename()` - sanitize filenames

### Cookie Utilities

- `CookieService` class with full cookie management
- `setAuthCookies()` / `getAuthTokenCookie()` / `clearAuthCookies()`
- `setSignedCookie()` / `getSignedCookie()` - signed cookies
- `setEncryptedCookie()` / `getEncryptedCookie()` - encrypted cookies

### Error Classes

- `AppError` base class with structured error handling
- `ServiceError` - service layer errors with HTTP status
- `TechnicalError` - internal technical errors
- `DatabaseError` - EntityNotFound, UniqueConstraint, ForeignKeyConstraint
- `ValidationError` - MissingRequiredField, InvalidFieldValue
- `NetworkError`, `ExternalServiceError`, `CacheError`
- `ErrorHandler` middleware for centralized error handling

### Database Utilities

- **TransactionService** with isolation levels
- **BatchedQueue** for efficient batch processing
- Configurable parallelism, task cancellation, metrics

### Frontend Hooks

- **useAsync** - managed promise execution, race condition prevention
- **useOnline** - offline detection for better UX
- **useShortcut** - keyboard shortcuts with cross-browser support
- **usePopper** - lightweight positioning for dropdowns/tooltips
- **useRefCurrent / useRefPrevious** - track current and previous values
- **useSocialInteractions** - likes, shares, comments

### Frontend Formatters

- `formatDuration(seconds)` - MM:SS format for audio/video
- `formatFileSize(bytes)` - human-readable KB/MB/GB/TB
- `formatRelativeTime(date)` - "2 days ago", "in 3 hours"
- `formatNumber(num)` - comma formatting (1,234,567)

### DOM Utilities

- **Focus helpers** - keyboard navigation accessibility
- **Cookie helpers** - parseCookies, deleteCookie, getCurrentUserId
- **mergeEvents(...handlers)** - compose multiple event handlers

### Style Utilities

- `mergeStyles()` - merge multiple CSS style objects
- `conditionalStyle()` - apply styles based on boolean
- `classNames()` - conditional class name builder (like clsx)
- `createCSSVariables()` - generate CSS variable strings
- `injectGlobalCSSVariables()` - inject light/dark theme variables

### React Contexts

- **ThemeContext** - useTheme hook, ThemeProvider, system preference detection
- **ClientEnvironmentProvider** - centralized API, router, WebSocket config
- **AuthContext** - user state, login/logout/checkAuth, session persistence
- **SocialContext** - useSocial hook, feed management, interaction state

### UI Components

- **FileUpload** - drag-drop with useFileUpload hook, progress, preview
- **Throttle** - delayed spinner to prevent flash on fast requests
- **OfflineBadge** - online/offline status indicator
- **ComboBox** - autocomplete dropdown
- **FuzzyString** - highlight fuzzy match results
- **ListBox** - selectable list component
- **Popup** - positioned popup with usePopper
- **DropdownMenu** - menu dropdown

### Auth Components

- **LoginModal** / **RegisterModal** - auth modals
- **VerificationModal** - email verification UI
- **ConfirmEmail** / **ResendVerification** - email verification flow
- **ProtectedRoute** - route guard component

### Auth DTOs

- email-verification.dto - email verification request/response
- login.dto - login request with validation
- register.dto - registration request with validation
- refresh-token.dto - token refresh request
- password-reset.dto - password reset request/response
- mfa.dto - MFA setup/verify request/response

### Social Components

- **SocialFeed** / **Feed** - social feed display
- **PostCard** - individual post component
- **CreatePost** / **CreatePostForm** - post creation
- **CommentSection** / **Comments** - comments display
- **UserProfile** / **UserProfileCard** - profile display

### Media Components

- **VideoPlayer** - video playback
- **AudioPlayer** - audio playback with controls
- **ImageGallery** / **MediaGallery** - media grid display
- **mediaUpload** - media upload handling

### Client Services

- **Router service** - useRouter, useRoute hooks, URL parsing
- **API client factory** - createApi(), apiRequest(), httpRequest()
- **Social service** - followUser, likePost, getFeed, createPost
- **WebSocket PubSub client** - real-time messaging, subscriptions
- **Client config** - environment-based configuration

### Layout Components

- **MainLayout** - main application layout wrapper
- **PageContent** - page content wrapper with consistent styling
- **Central routes.tsx** - route configuration pattern
- **Global styles.ts** - centralized style definitions

### Infrastructure

- **Secret providers** - EnvSecretProvider, FileSecretProvider, InMemorySecretProvider
- **ServerManager** - server init, port discovery, health/metrics endpoints
- **Test infrastructure** - Vitest config, mocks, test utilities

### Base Classes (DDD)

- **BaseModel** - base interface with ID generation, validation
- **BaseService** - business logic orchestration with transaction helpers
- **BaseJobProcessor** - job queue processors with timing, error handling

### Repository Layer

- `BaseRepository<T>` with common CRUD operations
- Custom finder methods (`findByEmail`, `findByUsername`)
- Case conversion (camelCase ↔ snake_case) if needed
- Easier mocking in tests

---

_Last Updated: 2026-01-18_

_Philosophy: Copy patterns when needed. Don't migrate everything upfront._
