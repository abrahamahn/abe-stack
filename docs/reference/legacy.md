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

| Utility                | Legacy Path                                                                    |
| ---------------------- | ------------------------------------------------------------------------------ |
| Rate limiting          | `src/server/infrastructure/middleware/rateLimitMiddleware.ts`                  |
| Validation             | `src/server/infrastructure/middleware/validationMiddleware.ts`                 |
| File utils             | `src/server/infrastructure/storage/FileUtils.ts`                               |
| File helpers           | `src/server/infrastructure/files/fileHelpers.ts`                               |
| Content types          | `src/server/infrastructure/storage/ContentTypes.ts`                            |
| Storage service        | `src/server/infrastructure/storage/StorageService.ts`                          |
| Cache service          | `src/server/infrastructure/cache/CacheService.ts`                              |
| Image processor        | `src/server/infrastructure/processor/ImageProcessor.ts`                        |
| Media processor        | `src/server/infrastructure/processor/MediaProcessor.ts`                        |
| Stream processor       | `src/server/infrastructure/processor/StreamProcessor.ts`                       |
| Search builder         | `src/server/infrastructure/search/SearchService.ts`                            |
| Email service          | `src/server/modules/core/email/services/email.service.ts`                      |
| Email templates        | `src/server/modules/core/email/services/email-template.service.ts`             |
| Email job              | `src/server/modules/core/email/processors/email-notification.job.processor.ts` |
| User prefs             | `src/server/modules/core/users/services/user-preference.service.ts`            |
| Geolocation            | `src/server/modules/core/geo/middleware/geo.middleware.ts`                     |
| Password utils         | `src/server/infrastructure/security/passwordUtils.ts`                          |
| Encryption             | `src/server/infrastructure/security/encryptionUtils.ts`                        |
| Token manager          | `src/server/infrastructure/security/TokenManager.ts`                           |
| Token blacklist        | `src/server/infrastructure/security/InMemoryTokenBlacklist.ts`                 |
| Token storage          | `src/server/infrastructure/security/InMemoryTokenStorage.ts`                   |
| Auth helpers           | `src/server/infrastructure/security/authHelpers.ts`                            |
| Cookie utils           | `src/server/infrastructure/security/cookieUtils.ts`                            |
| CORS config            | `src/server/infrastructure/security/corsConfig.ts`                             |
| CSRF utils             | `src/server/infrastructure/security/csrfUtils.ts`                              |
| Signature helpers      | `src/server/infrastructure/security/signatureHelpers.ts`                       |
| Security helpers       | `src/server/infrastructure/security/securityHelpers.ts`                        |
| Token utils            | `src/server/infrastructure/security/tokenUtils.ts`                             |
| Custom validators      | `src/server/shared/types/dataTypes.ts`                                         |
| WebSocket auth         | `src/server/infrastructure/security/WebSocketAuthService.ts`                   |
| Logging                | `src/server/infrastructure/logging/LoggerService.ts`                           |
| Date helpers           | `src/server/infrastructure/utils/dateHelpers.ts`                               |
| Random ID              | `src/server/infrastructure/utils/randomId.ts`                                  |
| Shallow equal          | `src/server/infrastructure/utils/shallowEqual.ts`                              |
| Fuzzy match            | `src/server/shared/utils/fuzzyMatch.ts`                                        |
| Route helpers          | `src/server/shared/helpers/routeHelpers.ts`                                    |
| Type helpers           | `src/server/shared/types/typeHelpers.ts`                                       |
| Deferred promise       | `src/server/infrastructure/promises/DeferredPromise.ts`                        |
| Batched queue          | `src/server/infrastructure/queue/BatchedQueue.ts`                              |
| Transaction service    | `src/server/infrastructure/database/TransactionService.ts`                     |
| Migration manager      | `src/server/infrastructure/database/migrationManager.ts`                       |
| WebSocket service      | `src/server/infrastructure/pubsub/WebSocketService.ts`                         |
| WebSocket types        | `src/server/infrastructure/pubsub/WebSocketTypes.ts`                           |
| Job service            | `src/server/infrastructure/jobs/JobService.ts`                                 |
| App lifecycle          | `src/server/infrastructure/lifecycle/ApplicationLifecycle.ts`                  |
| Server manager         | `src/server/infrastructure/server/ServerManager.ts`                            |
| Base model             | `src/server/modules/base/baseModel.ts`                                         |
| Base service           | `src/server/modules/base/baseService.ts`                                       |
| Base job processor     | `src/server/modules/base/baseJobProcessor.ts`                                  |
| Shared types           | `src/server/shared/types/types.ts`                                             |
| Format date            | `src/server/shared/date/formatDate.ts`                                         |
| Error classes          | `src/server/infrastructure/errors/`                                            |
| Error handler          | `src/server/infrastructure/errors/ErrorHandler.ts`                             |
| Job queue              | `src/server/infrastructure/jobs/JobQueue.ts`                                   |
| File job storage       | `src/server/infrastructure/jobs/FileJobStorage.ts`                             |
| Console transport      | `src/server/infrastructure/logging/ConsoleTransport.ts`                        |
| Server logger          | `src/server/infrastructure/logging/ServerLogger.ts`                            |
| Token storage          | `src/server/infrastructure/security/TokenStorageService.ts`                    |
| Token blacklist        | `src/server/infrastructure/security/TokenBlacklistService.ts`                  |
| CORS config            | `src/server/infrastructure/security/CorsConfigService.ts`                      |
| Secret providers       | `src/server/infrastructure/config/secrets/`                                    |
| Session module         | `src/server/modules/core/sessions/`                                            |
| Preferences middleware | `src/server/modules/core/preferences/PreferencesMiddleware.ts`                 |
| Auth DTOs              | `src/server/modules/core/auth/features/*/models/`                              |
| Reset service          | `src/server/modules/reset/ResetService.ts`                                     |
| Verification service   | `src/server/modules/core/auth/services/verification.service.ts`                |
| User profile service   | `src/server/modules/core/users/services/user-profile.service.ts`               |
| User onboarding job    | `src/server/modules/core/users/processors/user-onboarding.job.processor.ts`    |
| Auth helpers           | `src/server/modules/core/auth/helpers/auth.helpers.ts`                         |
| Token utils            | `src/server/modules/core/auth/features/token/token.utils.ts`                   |
| RBAC middleware        | `src/server/modules/core/auth/middleware/rbac.middleware.ts`                   |
| MFA service            | `src/server/modules/core/auth/features/mfa/providers/mfa.service.ts`           |
| Permission service     | `src/server/modules/core/permission/services/permission.service.ts`            |
| Role service           | `src/server/modules/core/permission/services/role.service.ts`                  |

---

## Frontend Utilities

| Utility               | Legacy Path                                    |
| --------------------- | ---------------------------------------------- |
| useAsync              | `src/client/hooks/useAsync.ts`                 |
| useOnline             | `src/client/hooks/useOnline.ts`                |
| useShortcut           | `src/client/hooks/useShortcut.ts`              |
| usePopper             | `src/client/hooks/usePopper.ts`                |
| useCounter            | `src/client/hooks/useCounter.ts`               |
| useRefCurrent         | `src/client/hooks/useRefCurrent.ts`            |
| useRefPrevious        | `src/client/hooks/useRefPrevious.ts`           |
| useSocialInteractions | `src/client/hooks/useSocialInteractions.ts`    |
| Formatters            | `src/client/helpers/formatters.ts`             |
| Cookie helpers        | `src/client/helpers/cookieHelpers.ts`          |
| Focus helpers         | `src/client/helpers/focusHelpers.ts`           |
| Merge events          | `src/client/helpers/mergeEvents.ts`            |
| Passthrough ref       | `src/client/helpers/passthroughRef.tsx`        |
| Style utils           | `src/client/utils/styleUtils.ts`               |
| Theme context         | `src/client/components/theme/ThemeContext.tsx` |
| Auth context          | `src/client/contexts/AuthContext.tsx`          |
| Social context        | `src/client/contexts/SocialContext.tsx`        |
| Client env            | `src/client/services/ClientEnvironment.tsx`    |
| Router service        | `src/client/services/Router.ts`                |
| API client            | `src/client/services/api.ts`                   |
| Social service        | `src/client/services/social.ts`                |
| Auth client           | `src/client/services/AuthClient.ts`            |
| WS PubSub client      | `src/client/services/WebsocketPubsubClient.ts` |
| Client config         | `src/client/services/ClientConfig.ts`          |
| Main layout           | `src/client/layouts/MainLayout.tsx`            |
| Page content          | `src/client/layouts/PageContent.tsx`           |
| Routes                | `src/client/routes.tsx`                        |
| Global styles         | `src/client/styles.ts`                         |
| Base test             | `src/client/test/base.test.ts`                 |
| Base e2e              | `src/client/test/base.e2e.ts`                  |

---

## Frontend Components

| Component         | Legacy Path                                 |
| ----------------- | ------------------------------------------- |
| FileUpload        | `src/client/components/ui/FileUpload.tsx`   |
| Throttle          | `src/client/components/ui/Throttle.tsx`     |
| OfflineBadge      | `src/client/components/ui/OfflineBadge.tsx` |
| ComboBox          | `src/client/components/ui/ComboBox.tsx`     |
| FuzzyString       | `src/client/components/ui/FuzzyString.tsx`  |
| ListBox           | `src/client/components/ui/ListBox.tsx`      |
| Popup             | `src/client/components/ui/Popup.tsx`        |
| DropdownMenu      | `src/client/components/ui/DropdownMenu.tsx` |
| ProtectedRoute    | `src/client/components/ProtectedRoute.tsx`  |
| Auth modals       | `src/client/components/auth/`               |
| Social components | `src/client/components/social/`             |
| Media components  | `src/client/components/media/`              |

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
