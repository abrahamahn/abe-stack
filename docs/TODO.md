# ABE Stack - Product Roadmap

> **Focus:** Ship products. The foundation is solid. Build features users pay for.

---

## Essential High-Impact Improvements (2025-2026)

**Here are the truly essential, high-impact improvements**  
(ones that give the most value for the least added complexity / maintenance cost in a modern monorepo boilerplate in 2025-2026)

### Top Priority (Do these first - they matter the most)

| Priority | Improvement                                                                                                                  | Why it's essential                                                               | Difficulty | Approx. effort            |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------- | ------------------------- |
| 1        | **Automate tsconfig project references**                                                                                     | Prevents the most painful and silent type errors in monorepos                    | ★★☆        | 1-2 days                  |
| 2        | **Zod schema + runtime validation for all environment variables**                                                            | Catches configuration mistakes extremely early (dev, CI, prod)                   | ★☆☆        | 4-8 hours                 |
| 3        | **Merge the most frequently triggering sync scripts** (mainly aliases + imports + barrels)                                   | Dramatically reduces watcher overhead and CPU usage during `pnpm dev`            | ★★☆        | 1-2 days                  |
| 4        | **Better documentation of "changed since X" / affected packages workflows**                                                  | Saves huge amounts of time for reviewers and new contributors in large monorepos | ★☆☆        | 2-4 hours                 |
| 5        | **Enforce domain-folder naming convention** across at least server and core packages (domain / application / infrastructure) | Makes architecture intention much clearer as the project grows                   | ★★☆        | 1 day + gradual migration |

### Very strong second tier (do when you have bandwidth)

- Add **integration/API tests** layer for the server (supertest/jest or vitest + actual DB or testcontainer)
  - closes the biggest testing gap in most full-stack monorepos
- Make **sync scripts configurable** (via small config file) instead of many hard-coded exclusions
  - future-proofs automation without much cost now
- **Dynamic/conditional Vite config** based on `mode` (dev vs build vs preview)
  - small but meaningful quality-of-life and performance improvement

### Things you can safely postpone / probably never need in most real projects

- Redis just for the sake of having advanced caching
- Full DDD folder structure in every single package/app
- Combining all 6 sync scripts into one mega-script
- Separate tsconfig just for vitest
- Auto-generating theme docs with typedoc/etc
- Pre-bundling shared deps in Vite optimizeDeps (modern Vite usually does fine)
- Matrix-parallelized CI (unless you have >40-50 min CI times already)

### Quick recommended order (realistic next 2-4 weeks)

1. Add proper env + config Zod validation + loading (huge safety net)
2. Automate tsconfig references generation (saves the most pain long-term)
3. Merge alias/import/barrel sync scripts + reduce watchers
4. Write good documentation/examples for useful turbo commands  
   (`--filter`, `--since`, `--graph`, `--dry`)
5. Gradually introduce consistent domain folder naming in server and core

These 5 things will give you ~80-85% of the architectural and DX value  
while keeping the boilerplate relatively simple and easy to maintain/evolve.

Everything else is nice-to-have polish that becomes valuable mainly when the team grows past 5-8 active developers or when the product becomes significantly more complex.

---

## Missing Unit Tests

- [x] `apps/server/src/app.ts` ✅ (app.test.ts created)
- [ ] `apps/server/src/infra/database/schema/users.ts`
- [x] `packages/core/src/contracts/native.ts` ✅ (covered by contracts.test.ts)

## Foundation Status ✅

Everything needed to build and scale to Series A is complete.

| Component | Status  | Notes                                       |
| --------- | ------- | ------------------------------------------- |
| Auth      | ✅ Done | JWT + refresh rotation + token families     |
| Security  | ✅ Done | Argon2id, rate limiting, audit logging      |
| Real-time | ✅ Done | WebSocket + Postgres PubSub                 |
| Email     | ✅ Done | Console + SMTP providers                    |
| Storage   | ✅ Done | Local + S3 providers                        |
| Database  | ✅ Done | Drizzle + transactions + optimistic locking |
| Config    | ✅ Done | Domain-split, type-safe                     |
| CI/CD     | ✅ Done | Parallel lint/test/build                    |

**Stop touching the foundation. Start building product.**

---

## Next Up: Core Product Features

These are the building blocks you'll need across multiple products.

### File Uploads & Media (Backend)

Required for: social media, music, fitness (photos), marketplace

- [ ] Presigned upload endpoint (filename + contentType)
- [ ] Storage key conventions (`uploads/{userId}/{uuid}/{filename}`)
- [ ] Upload size limits per user role
- [ ] **Signed file URLs** with expiration (from legacy `fileHelpers.ts`)
- [ ] **Content type detection** helpers (MIME mapping, category enum)
- [ ] **File utilities** with retry logic, streams, auto-mkdir
- [ ] **Image processing** pipeline (Sharp)
  - Resize with fit modes (cover, contain, fill, inside)
  - Format conversion (JPEG, PNG, WebP, AVIF)
  - Quality control and enhancement (brightness, saturation)
  - Thumbnail generation
  - EXIF data extraction
  - Sharpening filters
- [ ] **Media processor** for video/audio (for music/video apps)
  - Multi-format media processing
  - Video thumbnail generation
  - Audio waveform generation
- [ ] **Stream processor** for large file handling
- [ ] Audio file handling (for music apps)

### Pagination (Backend + Frontend)

Required for: feeds, search results, lists, marketplace

- [ ] Cursor-based pagination schema in @abe-stack/core (Backend)
- [ ] `usePaginatedQuery` hook for infinite scroll (Frontend)
- [ ] Standard pagination response shape (Backend)
- [ ] **PaginationOptions** type - `page`, `limit`, `sortBy`, `sortOrder` (Backend)
- [ ] **PaginatedResult<T>** generic type - `data`, `total`, `page`, `totalPages`, `hasNext`, `hasPrev` (Backend)

### WebSocket Client + Presence (Backend + Frontend)

Required for: messenger, social feeds, real-time notifications

- [ ] `packages/ws-client` with auto-reconnect (Frontend)
- [ ] Auth token refresh on reconnect (Frontend)
- [ ] Subscription deduplication (Frontend)
- [ ] React Query cache invalidation on events (Frontend)
- [ ] `SubscriptionCache` for ref-counted record subscriptions (Frontend)
- [ ] `LoaderCache` for Suspense-friendly, deduped loaders (Frontend)
- [ ] **Presence tracking** (online/offline/away status, last seen) (Backend)
- [ ] **Message acknowledgments** (delivery confirmation) (Backend)
- [ ] **Typing indicators** via WebSocket events (Backend + Frontend)

### Background Jobs (Backend)

Required for: AI processing, audio transcoding, email campaigns

- [ ] Job queue with pg-boss or BullMQ
- [ ] Job types: email, media-processing, ai-inference
- [ ] **Retry with exponential backoff**
- [ ] **Job dependencies** (job B waits for job A)
- [ ] **Job status tracking** with statistics
- [ ] Processor registration pattern
- [ ] **Email job processor** (async sending, dev override for testing)
- [ ] **Job infrastructure** (from legacy)
  - JobQueue class with queue management
  - FileJobStorage for persistence
  - IJobStorage interface for swappable storage

### Push Notifications (Backend + Frontend)

Required for: messenger, social, fitness reminders

- [ ] Web push (service worker) (Frontend)
- [ ] Mobile push setup (FCM/APNs) (Backend)
- [ ] Notification preferences per user (Backend)

### Cache Layer (Backend)

Required for: performance at scale

- [ ] Cache service interface (swap Redis/memory)
- [ ] **Memoization helper** with TTL and custom key generators
- [ ] Bulk operations (getMultiple, setMultiple)
- [ ] **Cache statistics** (hits, misses, size)
- [ ] Background cleanup (doesn't block requests)
- [ ] **Redis cache implementation** (from legacy)
  - RedisCacheService with full ICacheService interface
  - RedisClient wrapper with connection management
  - Startup hooks for cache initialization

### Search & Filtering (Backend)

Required for: marketplace, music discovery, fitness tracking

- [ ] **SearchQueryBuilder** with fluent API
- [ ] Filter operators (eq, gt, lt, in, range, contains)
- [ ] Sort direction support
- [ ] Pagination integration
- [ ] Provider abstraction (start simple, upgrade to Elasticsearch later)

---

## Authentication Enhancements (Series A Priority)

### Social/OAuth Providers (Backend)

Required for: reducing signup friction, user acquisition

- [ ] Google OAuth (`passport-google-oauth20`)
- [ ] GitHub OAuth (`passport-github`)
- [ ] Apple OAuth (`passport-apple`)
- [ ] OAuth connection management UI (Frontend)
- [ ] Account linking (multiple providers per account) (Backend)

### Magic Links (Backend)

Required for: passwordless auth option

- [ ] Magic link token generation
- [ ] `/api/auth/magic-link/request` endpoint
- [ ] `/api/auth/magic-link/verify` endpoint
- [ ] `magic_link_tokens` database table

---

## Product-Specific Features

### For Messenger / Social (Backend + Frontend)

- [ ] Read receipts (Backend)
- [ ] User presence (uses WebSocket presence above) (Backend)
- [ ] Message reactions (Backend + Frontend)
- [ ] Channel/room management (Backend)

### For Music Streaming / Marketplace (Backend)

- [ ] Audio streaming endpoint (range requests)
- [ ] Waveform generation (background job)
- [ ] Playlist CRUD
- [ ] **Payment integration** (Stripe checkout, subscriptions)
- [ ] Artist/creator payouts

### For AI Fitness Coach (Backend)

- [ ] AI inference queue (uses job queue above)
- [ ] Workout plan generation
- [ ] Progress photo analysis (uses image processing above)
- [ ] Calendar/scheduling integration

### For Calendar Aggregator (Backend)

- [ ] OAuth flows (Google, Outlook, Apple)
- [ ] Calendar sync jobs (uses job queue above)
- [ ] Conflict detection
- [ ] Unified calendar view (Frontend)

---

## Utilities & Helpers (from legacy - drop-in)

Zero-effort additions that save significant time.

### Request Handling (Backend)

- [ ] **Validation middleware** (body, query, params with Zod)
- [ ] **Rate limit presets** for auth endpoints (login, register, reset)
- [ ] Request ID middleware with correlation IDs
- [ ] **Structured logging** with hierarchical context
  - Child logger creation with context inheritance
  - Correlation IDs for request tracking
  - Log levels (DEBUG, INFO, WARN, ERROR)
  - Pretty-printing in dev, compact in production
  - **ConsoleTransport** - console output transport with formatting
  - **ServerLogger** - server-specific logger with request context

### Session Management (Backend)

- [ ] **Session module** (from legacy)
  - Session DTOs (session.dto.ts)
  - Session models (session.model.ts)
  - Session manager (orchestration layer for session lifecycle)
  - Session service with CRUD operations
  - Session controller for endpoints

### User Management (Backend)

- [ ] **User preferences system** (notifications, privacy settings)
- [ ] **Preferences middleware** - middleware for handling user preference headers/cookies
- [ ] **Email verification service**
  - `createVerificationToken()` - generate secure token with 24h expiry
  - `verifyEmail()` - verify and mark user verified
  - `regenerateVerificationToken()` - invalidate old, create new
- [ ] **User profile service**
  - Profile CRUD with custom fields
  - Display name generation (firstName + lastName fallback to email)
  - Timezone and language preferences
  - Avatar, bio, website, location, phone
- [ ] **User onboarding job processor**
  - Welcome email
  - Basic profile setup
  - Default group assignment
  - Admin notification
- [ ] Password reset flow (already have email service)

### Security Utilities (Backend)

- [ ] **CSRF utilities** (generate, validate tokens with HMAC signatures)
- [ ] **Encryption utilities** (AES-256-GCM with authentication, HMAC signatures)
- [ ] Signature generation for file URLs
- [ ] **Password strength validation** (configurable: length, uppercase, lowercase, numbers, special chars)
- [ ] Token blacklisting for immediate revocation
- [ ] **Token storage service** (from legacy)
  - TokenStorageService for token persistence
  - InMemoryTokenStorage implementation
  - TokenBlacklistService for revocation
  - InMemoryTokenBlacklist implementation
- [ ] **CORS config service** - CorsConfigService with dynamic origin handling
- [ ] **Input sanitization** - `sanitizeInput()` for XSS prevention, `sanitizeForDatabase()` for SQL injection prevention
- [ ] **Security headers middleware** - standard headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, etc.)
- [ ] **URL validation** - `validateSafeUrl()` with domain whitelist support
- [ ] **CSP builder** - `createCSP()` fluent API for Content Security Policy generation

### Token Utilities (Backend)

- [ ] **Token expiration constants** - DEFAULT_TOKEN_EXPIRATION for ACCESS, REFRESH, PASSWORD_RESET, EMAIL_VERIFICATION, MFA, etc.
- [ ] `createTokenId()` - generate unique token identifiers
- [ ] `generateSecureToken()` - crypto-secure token generation
- [ ] `extractTokenFromHeader()` - parse Bearer token from Authorization header
- [ ] `isTokenExpired()` - check token validity
- [ ] `hashToken()` - secure token hashing for storage

### Common Utilities (Backend)

- [ ] `randomId(seed?)` - UUID generation with optional deterministic seeding
- [ ] `shallowEqual(a, b)` - comparison utility with array/object support
- [ ] **Fuzzy matching** for search/autocomplete (`fuzzyMatch`, `fuzzyMatchScore`)
- [ ] **Route helpers** (parseRoute, formatRoute, matchRouteWithParams)
- [ ] **DeferredPromise** - external resolve/reject for async patterns (timeouts, queues)
- [ ] **ReactiveMap** - key-based subscriptions for cache updates
- [ ] **RecordMap helpers** (get/set/delete/iterate/assign)
- [ ] `sleep(ms)` - Promise-based delay helper
- [ ] **Date helpers** - time constants (SecondMs, MinuteMs, HourMs, DayMs), `formatDate()` with locale support
- [ ] **Type helpers** - `Simplify<T>`, `Assert<A, B>` for TypeScript utilities
- [ ] **Custom Zod validators**
  - `uuid` - strict UUID validation with regex pattern
  - `datetime` - comprehensive ISO 8601 datetime validation (handles all formats, timezones, special cases)

### File Utilities (Backend)

- [ ] `ensureDirectory()` - create directories recursively
- [ ] `fileExists()` - check file existence
- [ ] `getFileStats()` - get file metadata
- [ ] `readFile()` / `writeFile()` - buffer operations
- [ ] `deleteFile()` - delete with retry logic
- [ ] `listFiles()` - list with pattern matching
- [ ] `copyFile()` / `moveFile()` - file operations
- [ ] `createReadStream()` / `createWriteStream()` - stream creation
- [ ] `detectContentType()` - MIME type detection
- [ ] `normalizeFilename()` - sanitize filenames
- [ ] `deleteDirectory()` - recursive directory deletion

### Cookie Utilities (Backend)

- [ ] `CookieService` class with full cookie management
- [ ] `setAuthCookies()` / `getAuthTokenCookie()` / `clearAuthCookies()`
- [ ] `setSignedCookie()` / `getSignedCookie()` - signed cookies
- [ ] `setEncryptedCookie()` / `getEncryptedCookie()` - encrypted cookies
- [ ] `DEFAULT_COOKIE_OPTIONS` constant

### Error Classes (Backend)

- [ ] `AppError` base class with structured error handling
- [ ] `ServiceError` - service layer errors with HTTP status
- [ ] `TechnicalError` - internal technical errors
- [ ] `DatabaseError` - EntityNotFoundError, UniqueConstraintError, ForeignKeyConstraintError
- [ ] `ValidationError` - MissingRequiredFieldError, InvalidFieldValueError
- [ ] `NetworkError`, `ExternalServiceError`, `CacheError`
- [ ] `ErrorHandler` middleware for centralized error handling

### Database Utilities (Backend)

- [ ] **TransactionService** with isolation levels
  - READ_UNCOMMITTED, READ_COMMITTED, REPEATABLE_READ, SERIALIZABLE
  - Multi-operation transactions
  - Read-only transactions
  - Batch query execution
  - Savepoint management
- [ ] **BatchedQueue** for efficient batch processing
  - Configurable parallelism
  - Task cancellation support
  - Performance metrics
  - Error callbacks

### Location Features (Backend) - if needed

- [ ] **Geolocation middleware** (IP-based location with consent)
- [ ] Location caching (24h TTL)
- [ ] GDPR consent handling

### Frontend Utilities

- [ ] **useAsync hook** (managed promise execution, race condition prevention)
- [ ] **useOnline hook** (offline detection for better UX)
- [ ] **useShortcut hook** (keyboard shortcuts with cross-browser support, Cmd/Ctrl/Alt/Shift)
- [ ] **usePopper hook** (lightweight positioning for dropdowns/tooltips/popovers)
- [ ] **useRefCurrent / useRefPrevious** (track current and previous values)
- [ ] **useSocialInteractions hook** (likes, shares, comments)
- [ ] Form state management helpers

### Frontend Formatters (Frontend)

- [ ] `formatDuration(seconds)` - MM:SS format for audio/video
- [ ] `formatFileSize(bytes)` - human-readable KB/MB/GB/TB
- [ ] `formatRelativeTime(date)` - "2 days ago", "in 3 hours"
- [ ] `formatNumber(num)` - comma formatting (1,234,567)

### DOM Utilities (Frontend)

- [ ] **Focus helpers** (keyboard navigation accessibility)
  - `nextFocusable(container)` / `prevFocusable(container)`
  - `isFocusable(element)` - check focusability
- [ ] **Cookie helpers** (parseCookies, deleteCookie, getCurrentUserId)
- [ ] **mergeEvents(...handlers)** - compose multiple event handlers

### Style Utilities (Frontend)

- [ ] `mergeStyles()` - merge multiple CSS style objects
- [ ] `conditionalStyle()` - apply styles based on boolean
- [ ] `classNames()` - conditional class name builder (like clsx)
- [ ] `createCSSVariables()` - generate CSS variable strings
- [ ] `injectGlobalCSSVariables()` - inject light/dark theme variables

### React Contexts (Frontend)

- [ ] **ThemeContext** - useTheme hook, ThemeProvider, system preference detection, localStorage persistence
- [ ] **ClientEnvironmentProvider** - centralized API, router, WebSocket config
- [ ] **AuthContext** - user state, login/logout/checkAuth, session persistence
- [ ] **SocialContext** - useSocial hook, feed management, post/user interaction state

### UI Components (Frontend)

- [ ] **FileUpload** - drag-drop file upload with:
  - `useFileUpload` hook for managing multiple uploads
  - `uploadFile()` XHR upload with progress callback
  - `FileUploadDropZone` styled drop zone component
  - `UploadPreview` component with image preview
  - `_renderPreview()` data URL generator for images
- [ ] **Throttle** component - delayed spinner to prevent flash on fast requests
  - Configurable `showDelay` and `showHold`
  - Holds previous children while waiting
- [ ] **OfflineBadge** - online/offline status indicator
- [ ] **ComboBox** - autocomplete dropdown
- [ ] **FuzzyString** - highlight fuzzy match results
- [ ] **ListBox** - selectable list component
- [ ] **Popup** - positioned popup with usePopper
- [ ] **DropdownMenu** - menu dropdown

### Auth Components (Frontend)

- [ ] **LoginModal** / **RegisterModal** - auth modals
- [ ] **VerificationModal** - email verification UI
- [ ] **ConfirmEmail** / **ResendVerification** - email verification flow
- [ ] **ProtectedRoute** - route guard component

### Auth DTOs (Backend)

- [ ] **Auth data transfer objects** (from legacy)
  - email-verification.dto - email verification request/response
  - login.dto - login request with validation
  - register.dto - registration request with validation
  - refresh-token.dto - token refresh request
  - password-reset.dto - password reset request/response
  - mfa.dto - MFA setup/verify request/response

### Social Components (Frontend)

- [ ] **SocialFeed** / **Feed** - social feed display
- [ ] **PostCard** - individual post component
- [ ] **CreatePost** / **CreatePostForm** - post creation
- [ ] **CommentSection** / **Comments** - comments display
- [ ] **UserProfile** / **UserProfileCard** - profile display

### Media Components (Frontend)

- [ ] **VideoPlayer** - video playback
- [ ] **AudioPlayer** - audio playback with controls
- [ ] **ImageGallery** / **MediaGallery** - media grid display
- [ ] **mediaUpload** - media upload handling

### Client Services (Frontend)

- [ ] **Router service** - useRouter, useRoute hooks, URL parsing, history management
- [ ] **API client factory** - createApi(), apiRequest(), httpRequest(), error formatting
- [ ] **Social service** - followUser, unfollowUser, likePost, unlikePost, sharePost, getFeed, createPost
- [ ] **WebSocket PubSub client** - real-time messaging, connection management, subscriptions
- [ ] `passthroughRef()` - generic forwardRef wrapper with display name
- [ ] **Client config** - ClientConfig.ts for environment-based configuration

### Layout Components (Frontend)

- [ ] **MainLayout** - main application layout wrapper
- [ ] **PageContent** - page content wrapper with consistent styling
- [ ] **Central routes.tsx** - route configuration pattern
- [ ] **Global styles.ts** - centralized style definitions

---

## Architecture & Refactors

### Backend + Tooling

- [ ] Environment-based DI (entrypoints assemble env, no side-effects on import)
- [ ] Autoindex API endpoints from filesystem (route registry generator)
- [ ] Modular server composition (ApiServer/FileServer/QueueServer/PubSubServer)

---

## Infrastructure & Quality (Series A)

### Backend

- [ ] Email service abstraction (provider-agnostic with local stub)
- [ ] Input validation with Zod; consistent error envelope
- [ ] Health checks and readiness endpoints

### Frontend (Web)

- [ ] Error boundary + toasts for API errors
- [ ] Accessibility pass (focus management, keyboard resize handles)

### Infrastructure

- [ ] Dockerfile/docker-compose for server + Postgres + maildev
- [ ] Production Postgres settings (connection pooling, SSL)
- [ ] Secrets management documentation (env, Vault, SSM)
- [ ] **Secret providers** (from legacy)
  - SecretProvider interface
  - EnvSecretProvider (environment variables)
  - FileSecretProvider (file-based secrets)
  - InMemorySecretProvider (testing)
- [ ] Observability hooks (request logs, metrics, error reporting)
- [ ] Database backup/retention plan
- [ ] **ServerManager** class (from legacy)
  - Server initialization and configuration
  - Port discovery/availability checking
  - Health check endpoint (`/health`)
  - Metrics endpoint (`/metrics`)
  - Server status display with infrastructure stats

### Testing

- [ ] Integration tests for API routes (vitest + fastify inject)
- [ ] Playwright E2E for auth + layout resize persistence
- [ ] Unit tests for Argon2id hashing and bcrypt migration
- [ ] Security audit: OWASP testing guide compliance
- [ ] **Test infrastructure** (from legacy)
  - Test setup with Vitest configuration (timeouts, env vars, file system mocking)
  - Global test type declarations
  - Base test file patterns (base.test.ts, base.e2e.ts)
  - Mock implementations: MockDatabase, MockLogger, MockAuthService, MockHttpClient, MockCacheService, MockEventEmitter
  - Test utilities: TestFactory, RequestContext, TestServer, ApiTestClient

### Documentation

- [ ] Update README with status badges once features land
- [ ] Quickstart guides per app (web/desktop/mobile)
- [ ] Release checklist (versioning, changelog, tagging)

### UI Package (Frontend)

- [ ] Accessibility: keyboard support for ResizablePanel (arrow keys)
- [ ] Performance: lazy load demo registry by category
- [ ] Code consistency: standardize arrow functions with forwardRef

---

## Infrastructure Improvements (from legacy)

Patterns from legacy that would help at Series A scale.

### Repository Layer (Backend) - Optional but Recommended

Wrap Drizzle with repository pattern for testability.

- [ ] `BaseRepository<T>` with common CRUD operations
- [ ] Custom finder methods (`findByEmail`, `findByUsername`)
- [ ] Case conversion (camelCase ↔ snake_case) if needed
- [ ] Easier mocking in tests

### Base Classes (Backend) - Domain-Driven Design

Abstract base classes for consistent patterns across modules.

- [ ] **BaseModel** - base interface for domain models with ID generation (UUID v4), validation, and string representation
- [ ] **BaseService** - base service class for business logic orchestration with transaction helpers and query wrappers
- [ ] **BaseJobProcessor** - abstract base for job queue processors with automatic timing, error handling, and result reporting

### Error Handling Middleware (Backend)

Better debugging in production.

- [ ] Request context logging (IP, method, path, user agent)
- [ ] Error serialization with `.toJSON()`
- [ ] **Correlation IDs** for tracing requests
- [ ] Conditional logging by severity (500+ vs client errors)

### Interface-First Services (Backend)

For critical infrastructure, define interfaces.

- [ ] `IJobService` interface for job queue
- [ ] `ICacheService` interface for cache
- [ ] `IWebSocketService` interface for real-time
- [ ] Enables swapping implementations without code changes

---

## Code Quality (When You Have Time)

Quick wins that improve maintainability.

### High Impact

- [ ] Fix barrel exports in `packages/ui/src/index.ts`
- [ ] Add request ID middleware
- [ ] Add infrastructure tests for critical paths

### Medium Impact

- [ ] Auth service context objects
- [ ] Catalog factory pattern (if keeping demo)

---

## Deferred to Post-Series A

See `docs/ROADMAP.md` for features to add when you have:

- Enterprise customers requiring compliance (MFA, RBAC, Passkeys)
- Platform engineer to own observability
- Traffic that justifies load testing
- Large team needing DI container
- Ops team to write runbooks
- Collaborative editing (CHET-Stack real-time features)

---

## Time Saved by Adopting Legacy Patterns

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
| Redis cache implementation                  | 6-8h          | 2-3h adapt     |
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

## Success Metrics

### Pre-Seed (Now)

- [x] Can ship any of the product ideas without infrastructure blockers
- [x] Auth won't embarrass you in security review
- [x] New hire can understand the codebase in a day

### Seed

- [ ] First paying customers on at least one product
- [ ] <100ms P95 latency on critical paths
- [ ] Zero security incidents
- [ ] Job queue processing reliably
- [ ] Email delivery working (verification, notifications)

### Series A

- [ ] Multi-product architecture working
- [ ] Team of 3-5 engineers productive
- [ ] 99.9% uptime
- [ ] Cache layer reducing DB load by 30%+
- [ ] Real-time features stable at scale
- [ ] Search/discovery features performant

---

## The Rule

**Before adding to this TODO, ask:**

1. Does a user need this to give me money?
2. Will this unblock a product feature?
3. Is this a security/legal requirement?

If no to all three, it goes in `docs/ROADMAP.md`.

---

## Legacy Reference (Copy When Needed)

### Backend Utilities

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
| Redis cache            | `src/server/infrastructure/cache/RedisCacheService.ts`                         |
| Redis client           | `src/server/infrastructure/cache/RedisClient.ts`                               |
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

### Frontend Utilities

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

### Frontend Components

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

_Last Updated: 2026-01-17_

_Philosophy: Foundation is done. Ship products. Copy utilities from legacy when needed._
