# ABE Stack Roadmap

> **Scope:** Features deferred beyond Series A, or requiring enterprise customers, dedicated platform engineers, or large teams (5+ engineers).

**Last Updated: January 20, 2026**

---

## When to Use This Roadmap

Add features here when you have:

- Enterprise customers requiring compliance (MFA, RBAC, Passkeys)
- Platform engineer to own observability
- Traffic that justifies load testing
- Large team needing DI container
- Ops team to write runbooks
- Collaborative editing requirements (CHET-Stack)

---

## Milestone 1: V5 Architecture Migration

Restructure from role-based (`apps/`, `packages/`) to layer-based (`frontend/`, `backend/`, `shared/`) architecture. See [Architecture](./dev/architecture.md) for details.

### Phase 1: Preparation

- [ ] Create new directory structure: `frontend/`, `backend/`, `shared/`
- [ ] Update path aliases in all tsconfig.json files
- [ ] Update Turborepo pipeline configuration
- [ ] Document migration strategy for each package

### Phase 2: Backend Migration

- [ ] Move `apps/server/` to `backend/server/`
- [ ] Move `apps/server/src/infra/database/` to `backend/db/`
- [ ] Move `apps/server/src/infra/storage/` to `backend/storage/`
- [ ] Update all import paths (e.g., `@db` → `backend/db`)
- [ ] Verify server builds and tests pass

### Phase 3: Frontend Migration

- [ ] Move `apps/web/` to `frontend/web/`
- [ ] Move `apps/desktop/` to `frontend/desktop/`
- [ ] Move `apps/mobile/` to `frontend/mobile/`
- [ ] Move `packages/ui/` to `frontend/ui/`
- [ ] Move `packages/sdk/` to `frontend/sdk/`
- [ ] Update all import paths
- [ ] Verify all frontend apps build and tests pass

### Phase 4: Shared Layer

- [ ] Move `packages/core/` to `shared/`
- [ ] Ensure contracts and types are accessible from both layers
- [ ] Update documentation paths and examples

### Phase 5: Cleanup

- [ ] Remove old `apps/` and `packages/` directories
- [ ] Update all documentation to reflect new structure
- [ ] Update CI/CD pipelines
- [ ] Update Docker configurations

---

## Milestone 2: CHET-Stack Real-Time Features

Add real-time collaboration, offline support, and optimistic updates. See [Architecture](./dev/architecture.md#future-real-time-features).

### Phase 1: Foundation

- [ ] Add `version` field to all syncable database tables
- [ ] Create `packages/realtime` with transaction types
- [x] Implement `RecordCache` (in-memory with version conflict resolution) → `@abe-stack/sdk/cache`
- [ ] Add `/api/realtime/write` endpoint
- [ ] Add `/api/realtime/getRecords` endpoint

> **Implementation:** `RecordCache` in `packages/sdk/src/cache/RecordCache.ts` (69 tests)
> **Partial progress:** WriteService (`apps/server/src/infra/write/`) provides transaction handling, version bumping, and auto-pubsub
> **Legacy:** See [Database Utilities](./dev/legacy.md#database-utilities) → `TransactionService.ts`, `BatchedQueue.ts`

### Phase 2: Real-Time Sync

- [x] Implement `WebSocketServer` (ws package) → `apps/server/src/infra/websocket/`
- [x] Implement `WebSocketPubSubClient` → `@abe-stack/sdk/pubsub` (20 tests)
- [ ] Create `RealtimeContext` and `RealtimeProvider`
- [x] Add subscription management (subscribe/unsubscribe by key) → `SubscriptionCache` (20 tests)
- [ ] Version-based update notifications

> **Implementation:** Client in `packages/sdk/src/pubsub/`, Server in `apps/server/src/infra/websocket/`

### Phase 3: Offline Support

- [x] Implement `RecordStorage` (IndexedDB wrapper) → `@abe-stack/sdk/cache` (31 tests)
- [x] Implement `TransactionQueue` for offline writes → `@abe-stack/sdk/offline` (26 tests)
- [x] Add stale-while-revalidate loaders → `LoaderCache` with TTL (57 tests)
- [ ] Service worker for asset caching
- [x] Conflict resolution (last-write-wins) → Built into RecordCache/RecordStorage

> **Implementation:** `packages/sdk/src/cache/RecordStorage.ts`, `packages/sdk/src/offline/TransactionQueue.ts`, `packages/sdk/src/cache/LoaderCache.ts`

### Phase 4: Undo/Redo

- [x] Implement `UndoRedoStack` → `@abe-stack/sdk/undo` (38 tests)
- [x] Operation inversion logic → Built into UndoRedoStack with grouping support
- [ ] Keyboard shortcuts (Cmd+Z / Cmd+Shift+Z)
- [ ] UI indicators for undo/redo availability (use `onStateChange` callback)

> **Implementation:** `packages/sdk/src/undo/UndoRedoStack.ts`
> **Legacy:** See [Frontend Hooks](./dev/legacy.md#frontend-hooks) → `useShortcut` hook

### Phase 5: Permissions

- [ ] Row-level read validation
- [ ] Row-level write validation
- [ ] Permission records loading
- [ ] Workspace/board/task permission patterns

> **Legacy:** See [Backend Utilities](./dev/legacy.md#backend-utilities) → `permission.service.ts`, `role.service.ts`, `rbac.middleware.ts`

### Phase 6: React Hooks

- [ ] `useRecord<T>(table, id)` - single record subscription
- [ ] `useRecords<T>(table, filters)` - collection subscription
- [ ] `useWrite()` - optimistic write with queue
- [ ] `useUndoRedo()` - undo/redo controls

> **Legacy:** See [Frontend Hooks](./dev/legacy.md#frontend-hooks) → `useAsync`, `useRefCurrent`, `useRefPrevious`

---

## Milestone 3: Security Phase 2

Enhanced authentication with Passport.js and additional security hardening.

### Phase 1: Security Hardening (COMPLETED)

- [x] Migrate password hashing from bcrypt to Argon2id
- [x] Implement rate limiting on auth endpoints
- [x] Add login attempt logging
- [x] Implement account lockout with progressive delays
- [x] Add password strength validation with zxcvbn
- [x] Implement refresh token rotation with reuse detection
- [x] Add CSRF protection (double-submit cookie pattern)

### Phase 2: Passport.js Integration

- [ ] Install and configure Passport.js with Fastify adapter
- [ ] Implement `passport-local` strategy
- [ ] Add session management with secure cookie store
- [ ] Create strategy enable/disable configuration
- [ ] Update auth routes to use Passport.js

> **Legacy:** See [Backend Utilities](./dev/legacy.md#backend-utilities) → `authHelpers.ts`, `cookieUtils.ts`, `csrfUtils.ts`; [Potential Migrations](./dev/legacy.md#session-management) → Session module

### Phase 3: Additional Auth Methods (Passport.js)

> Note: Basic Magic Links are in TODO.md. This phase adds Passport.js-based implementation for unified auth strategy management.

- [ ] Magic links (`passport-magic-link`) - Passport.js strategy
- [ ] Passkeys/WebAuthn (`passport-webauthn`)
- [ ] WebAuthn registration/authentication UI
- [ ] Passkey management UI (list, rename, delete)

> **Legacy:** See [Token Utilities](./dev/legacy.md#token-utilities) → `generateSecureToken()`, `hashToken()`; [Backend Utilities](./dev/legacy.md#backend-utilities) → `verification.service.ts`; [Security Utilities](./dev/legacy.md#security-utilities) → Encryption utilities

### Phase 4: Social/OAuth Providers (Passport.js)

> Note: Basic OAuth is in TODO.md. This phase migrates to Passport.js strategies for consistent session handling.

- [ ] Google OAuth (`passport-google-oauth20`) - Passport.js strategy
- [ ] GitHub OAuth (`passport-github`) - Passport.js strategy
- [ ] Apple OAuth (`passport-apple`) - Passport.js strategy
- [ ] OAuth connection management UI
- [ ] Account linking (multiple providers per account)

> **Legacy:** See [Auth DTOs](./dev/legacy.md#auth-dtos); [Backend Utilities](./dev/legacy.md#backend-utilities) → `TokenManager.ts`, `TokenStorageService.ts`

### Phase 5: Advanced Features

- [ ] TOTP 2FA (`passport-totp` + `speakeasy`)
- [ ] BFF proxy mode for maximum security
- [ ] Step-up authentication for sensitive operations
- [ ] Device/session management UI
- [ ] "Remember this device" functionality

> **Legacy:** See [Backend Utilities](./dev/legacy.md#backend-utilities) → `mfa.service.ts`, `InMemoryTokenBlacklist.ts`; [Potential Migrations](./dev/legacy.md#security-utilities) → Encryption utilities

### Database Schema Updates Required

- [x] `refresh_token_families` table (reuse detection) ✅
- [ ] `webauthn_credentials` table (passkeys)
- [ ] `magic_link_tokens` table
- [x] `login_attempts` table ✅
- [ ] `oauth_connections` table

---

## Product-Specific Features

These are specific to product types, not boilerplate infrastructure.

### For Messenger / Social

- [ ] Read receipts
- [ ] Message reactions
- [ ] Channel/room management
- [ ] Message acknowledgments (delivery confirmation)
- [x] `SubscriptionCache` for ref-counted record subscriptions → `@abe-stack/sdk/subscriptions`
- [x] `LoaderCache` for Suspense-friendly, deduped loaders → `@abe-stack/sdk/cache`

> **Implementation:** `packages/sdk/src/subscriptions/SubscriptionCache.ts`, `packages/sdk/src/cache/LoaderCache.ts`
> **Legacy:** See [Frontend Components](./dev/legacy.md#frontend-components) → Social components

### For Music Streaming / Marketplace

- [ ] Audio streaming endpoint (range requests)
- [ ] Waveform generation (background job)
- [ ] Playlist CRUD
- [ ] **Payment integration** (Stripe checkout, subscriptions)
- [ ] Artist/creator payouts
- [ ] **Media processor** for video/audio
  - Multi-format media processing
  - Video thumbnail generation
  - Audio waveform generation
- [ ] **Stream processor** for large file handling

> **Legacy:** See [Backend Utilities](./dev/legacy.md#backend-utilities) → `MediaProcessor.ts`, `StreamProcessor.ts`, `ImageProcessor.ts`; [Frontend Components](./dev/legacy.md#frontend-components) → Media components (`AudioPlayer`, `VideoPlayer`); [Frontend Formatters](./dev/legacy.md#frontend-formatters) → `formatDuration()`

### For AI Fitness Coach

- [ ] AI inference queue (uses job queue)
- [ ] Workout plan generation
- [ ] Progress photo analysis (uses image processing)
- [ ] Calendar/scheduling integration

> **Legacy:** See [Backend Utilities](./dev/legacy.md#backend-utilities) → `JobService.ts`, `baseJobProcessor.ts`, `ImageProcessor.ts`

### For Calendar Aggregator

- [ ] OAuth flows (Google, Outlook, Apple)
- [ ] Calendar sync jobs (uses job queue)
- [ ] Conflict detection
- [ ] Unified calendar view

> **Legacy:** See [Backend Utilities](./dev/legacy.md#backend-utilities) → `JobService.ts`, `JobQueue.ts`; [Potential Migrations](./dev/legacy.md#common-utilities) → Date helpers

---

## Infrastructure Improvements (Post-Series A)

Patterns that become valuable at scale or with large teams.

### Repository Layer (Optional)

Wrap Drizzle with repository pattern for testability.

- [ ] `BaseRepository<T>` with common CRUD operations
- [ ] Custom finder methods (`findByEmail`, `findByUsername`)
- [ ] Case conversion (camelCase ↔ snake_case) if needed
- [ ] Easier mocking in tests

> **Legacy:** See [Potential Migrations](./dev/legacy.md#repository-layer)

### Base Classes (DDD)

Abstract base classes for consistent patterns across modules.

- [ ] **BaseModel** - base interface with ID generation (UUID v4), validation
- [ ] **BaseService** - business logic orchestration with transaction helpers
- [ ] **BaseJobProcessor** - job queue processors with timing, error handling

> **Legacy:** See [Backend Utilities](./dev/legacy.md#backend-utilities) → `baseModel.ts`, `baseService.ts`, `baseJobProcessor.ts`

### Interface-First Services

For critical infrastructure, define interfaces.

- [ ] `IJobService` interface for job queue
- [ ] `ICacheService` interface for cache
- [ ] `IWebSocketService` interface for real-time
- [ ] Enables swapping implementations without code changes

> **Legacy:** See [Backend Utilities](./dev/legacy.md#backend-utilities) → `CacheService.ts`, `JobService.ts`, `WebSocketService.ts` (reference implementations)

### Error Handling Middleware

Better debugging in production.

- [ ] Request context logging (IP, method, path, user agent)
- [x] Error serialization with `.toJSON()` - AppError in `@abe-stack/core/errors`
- [x] Correlation IDs for tracing requests - `apps/server/src/infra/logger/`
- [ ] Conditional logging by severity (500+ vs client errors)

> **Implementation:** Errors in `packages/core/src/errors/`, Logging in `apps/server/src/infra/logger/`
> **Legacy:** See [Error Classes](./dev/legacy.md#error-classes); [Backend Utilities](./dev/legacy.md#backend-utilities) → `ErrorHandler.ts`, `LoggerService.ts`; [Potential Migrations](./dev/legacy.md#structured-logging)

### Advanced Architecture

- [ ] Autoindex API endpoints from filesystem (route registry generator)
- [x] Route registry pattern (`registerRouteMap` - DRY route registration from Chet-stack)
- [x] Modular server composition (QueueServer pattern from Chet-stack)
- [ ] API versioning and OpenAPI/typed client generation
- [ ] Generate fetch/React Query clients from ts-rest contract

> **Implementation:** `apps/server/src/infra/router/` (route registry), `apps/server/src/infra/queue/` (QueueServer)
> **Legacy:** See [Backend Utilities](./dev/legacy.md#backend-utilities) → `ServerManager.ts`, `ApplicationLifecycle.ts`

---

## Things You Can Safely Postpone

These are rarely needed in most real projects:

- [ ] Redis just for the sake of having advanced caching
- [ ] Full DDD folder structure in every single package/app
- [ ] Combining all 6 sync scripts into one mega-script
- [ ] Separate tsconfig just for vitest
- [ ] Auto-generating theme docs with typedoc/etc
- [ ] Pre-bundling shared deps in Vite optimizeDeps (modern Vite usually does fine)
- [ ] Matrix-parallelized CI (unless you have >40-50 min CI times already)

---

## Second Tier Improvements

Do when you have bandwidth:

- [ ] Add **integration/API tests** layer for the server (supertest/jest or vitest + actual DB or testcontainer)
- [ ] Make **sync scripts configurable** (via small config file) instead of many hard-coded exclusions
- [ ] **Dynamic/conditional Vite config** based on `mode` (dev vs build vs preview)
- [ ] Code consistency: standardize arrow functions with forwardRef in UI package

> **Legacy:** See [Potential Migrations](./dev/legacy.md#infrastructure) → Test infrastructure (mocks, TestFactory, ApiTestClient)

---

## Geolocation Features (If Needed)

- [ ] **Geolocation middleware** (IP-based location with consent)
- [ ] Location caching (24h TTL)
- [ ] GDPR consent handling

> **Legacy:** See [Backend Utilities](./dev/legacy.md#backend-utilities) → `geo.middleware.ts`

---

## Redis Implementation

When you need Redis (high traffic, distributed caching):

- [ ] **Redis cache implementation**
  - RedisCacheService with full ICacheService interface
  - RedisClient wrapper with connection management
  - Startup hooks for cache initialization

> **Legacy:** See [Backend Utilities](./dev/legacy.md#backend-utilities) → `RedisCacheService.ts`, `RedisClient.ts`

---

## Priority Matrix

| Priority     | Area         | Items                                   |
| ------------ | ------------ | --------------------------------------- |
| **Critical** | Security     | Passport.js integration, CSRF hardening |
| **High**     | Architecture | V5 migration preparation                |
| **High**     | Real-Time    | React hooks, RealtimeProvider           |
| **Medium**   | Backend      | API versioning                          |
| **Medium**   | Testing      | E2E tests, API integration tests        |
| **Low**      | UI           | Demo lazy loading, code standardization |

> **Recent additions (2026-01-20):** Full SDK client-side state management: `RecordCache`, `RecordStorage`, `LoaderCache`, `SubscriptionCache`, `TransactionQueue`, `UndoRedoStack`, `WebsocketPubsubClient` (261 tests total)

---

## Notes

- V5 migration should be done incrementally to avoid breaking changes
- CHET-Stack features can be implemented independently per phase
- Security Phase 2 builds on completed Phase 1 foundations
- All changes require passing format, lint, type-check, and test checks

---

## References

- **In-scope tasks:** See `docs/TODO.md`
- **Legacy migrations:** See `docs/dev/legacy.md`

---

_Last Updated: 2026-01-20_
