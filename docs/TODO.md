# ABE Stack - TODO

> **Scope:** Solo developer to small team (3-5 engineers), 50,000+ users, up to Series A.
> **Philosophy:** Ship products. The foundation is solid. Build features users pay for.

---

## Unused Code to Integrate

Code that exists but isn't used anywhere (only exported + tested). Integrate when implementing related tasks.

| Unused Code                            | Package         | Related Task                              | Notes                                                       |
| -------------------------------------- | --------------- | ----------------------------------------- | ----------------------------------------------------------- |
| `MutationQueue`, `createMutationQueue` | sdk/persistence | ROADMAP: Offline Support (Phase 3)        | Ready for offline mutation handling                         |
| `localStorageQueue`                    | sdk/persistence | ROADMAP: Offline Support (Phase 3)        | Fallback for browsers without IndexedDB                     |
| `useOnScreen`                          | ui/hooks        | UI Package: lazy load demo registry       | Intersection observer for lazy loading                      |
| `useCopyToClipboard`                   | ui/hooks        | Demo copy button (currently uses raw API) | Hook available but demo uses `navigator.clipboard` directly |
| `usePanelConfig`                       | ui/hooks        | ResizablePanel layouts                    | Panel configuration state management                        |

> **Note:** UI components like Accordion, Slider, RadioGroup, Popover, Pagination, Kbd, MenuItem, EnvironmentBadge are all **showcased in the demo catalog** - they're available and documented, just not yet used in production features.

---

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

## High-Priority Improvements

### Top Priority (Do these first)

| Priority | Improvement                                               | Why it's essential                                            | Difficulty | Status  |
| -------- | --------------------------------------------------------- | ------------------------------------------------------------- | ---------- | ------- |
| 1        | **Automate tsconfig project references**                  | Prevents the most painful and silent type errors in monorepos | ★★☆        | ✅ Done |
| 2        | **Zod schema + runtime validation for all env variables** | Catches configuration mistakes early (dev, CI, prod)          | ★☆☆        | Open    |
| 3        | **Reduce sync script overhead**                           | Reduces watcher overhead and CPU usage during `pnpm dev`      | ★★☆        | ✅ Done |
| 4        | **Document affected packages workflows**                  | Saves time for reviewers and new contributors                 | ★☆☆        | Open    |
| 5        | **Enforce domain-folder naming convention**               | Makes architecture intention clearer as project grows         | ★★☆        | Open    |

**Completed:**

- ✅ tsconfig references automated via `config/generators/tsconfig.gen.ts` (runs via `pnpm config:generate`)
- ✅ Removed `sync-import-aliases.ts` - reduced watchers from 6 to 5, simplifying the dev experience

### Quick Recommended Order

1. Add proper env + config Zod validation + loading
2. Write documentation for useful turbo commands (`--filter`, `--since`, `--graph`)
3. Gradually introduce consistent domain folder naming in server and core

> **Legacy:** See [Backend Utilities](./dev/legacy.md#backend-utilities) → `dataTypes.ts` (custom Zod validators)

---

## Missing Unit Tests

- [x] `apps/server/src/app.ts` ✅ (app.test.ts created)
- [ ] `apps/server/src/infra/database/schema/users.ts`
- [x] `packages/core/src/contracts/native.ts` ✅ (covered by contracts.test.ts)

---

## Core Product Features

Building blocks needed across multiple products.

### File Uploads & Media (Backend)

Required for: social media, music, fitness (photos), marketplace

- [ ] Presigned upload endpoint (filename + contentType)
- [ ] Storage key conventions (`uploads/{userId}/{uuid}/{filename}`)
- [ ] Upload size limits per user role
- [ ] Signed file URLs with expiration
- [ ] Content type detection helpers (MIME mapping)
- [ ] File utilities with retry logic, streams, auto-mkdir
- [ ] **Image processing pipeline** (Sharp)
  - Resize with fit modes (cover, contain, fill, inside)
  - Format conversion (JPEG, PNG, WebP, AVIF)
  - Quality control and thumbnail generation
- [ ] Audio file handling (for music apps)

> **Legacy:** See [File Utilities](./dev/legacy.md#file-utilities), [Backend Utilities](./dev/legacy.md#backend-utilities) → `FileUtils.ts`, `fileHelpers.ts`, `ContentTypes.ts`, `StorageService.ts`, `ImageProcessor.ts`; [UI Components](./dev/legacy.md#ui-components) → `FileUpload.tsx`

### Pagination (Backend + Frontend)

Required for: feeds, search results, lists, marketplace

- [ ] Cursor-based pagination schema in @abe-stack/core
- [ ] `usePaginatedQuery` hook for infinite scroll
- [ ] Standard pagination response shape
- [ ] **PaginationOptions** type - `page`, `limit`, `sortBy`, `sortOrder`
- [ ] **PaginatedResult<T>** generic type - `data`, `total`, `page`, `hasNext`, `hasPrev`

> **Legacy:** See [Migration Effort Estimates](./dev/legacy.md#migration-effort-estimates) → Pagination types (2-3h, drop-in)

### WebSocket Client + Presence

Required for: messenger, social feeds, real-time notifications

- [ ] `packages/ws-client` with auto-reconnect
- [ ] Auth token refresh on reconnect
- [ ] Subscription deduplication
- [ ] React Query cache invalidation on events
- [ ] **Presence tracking** (online/offline/away status, last seen)
- [ ] **Typing indicators** via WebSocket events

> **Legacy:** See [Backend Utilities](./dev/legacy.md#backend-utilities) → `WebSocketService.ts`, `WebSocketTypes.ts`, `WebSocketAuthService.ts`; [Frontend Utilities](./dev/legacy.md#frontend-utilities) → `WebsocketPubsubClient.ts`

### Background Jobs (Backend) ✅

Required for: AI processing, audio transcoding, email campaigns

- [x] Job queue with PostgreSQL persistence (QueueServer pattern from Chet-stack)
- [ ] Job types: email, media-processing, ai-inference
- [x] Retry with exponential backoff and jitter
- [x] Job status tracking (pending/processing/completed/failed)
- [x] Processor registration pattern (TaskHandlers)

> **Implementation:** `apps/server/src/infra/queue/` - QueueServer, PostgresQueueStore, MemoryQueueStore
> **Legacy:** See [Backend Utilities](./dev/legacy.md#backend-utilities) → `JobService.ts`, `JobQueue.ts`, `FileJobStorage.ts`, `baseJobProcessor.ts`, `email-notification.job.processor.ts`

### Push Notifications

Required for: messenger, social, fitness reminders

- [ ] Web push (service worker)
- [ ] Mobile push setup (FCM/APNs)
- [ ] Notification preferences per user

> **Legacy:** See [Potential Migrations](./dev/legacy.md#user-management) → User preferences system

### Cache Layer (Backend)

Required for: performance at scale

- [ ] Cache service interface (swap Redis/memory)
- [ ] Memoization helper with TTL and custom key generators
- [ ] Bulk operations (getMultiple, setMultiple)
- [ ] Cache statistics (hits, misses, size)
- [ ] Background cleanup (doesn't block requests)

> **Legacy:** See [Backend Utilities](./dev/legacy.md#backend-utilities) → `CacheService.ts`, `RedisCacheService.ts`, `RedisClient.ts`

### Search & Filtering (Backend)

Required for: marketplace, music discovery, fitness tracking

- [ ] **SearchQueryBuilder** with fluent API
- [ ] Filter operators (eq, gt, lt, in, range, contains)
- [ ] Sort direction support
- [ ] Pagination integration
- [ ] Provider abstraction (start simple, upgrade to Elasticsearch later)

> **Legacy:** See [Backend Utilities](./dev/legacy.md#backend-utilities) → `SearchService.ts`; [Common Utilities](./dev/legacy.md#common-utilities) → Fuzzy matching

---

## Authentication Enhancements

### Social/OAuth Providers

Required for: reducing signup friction, user acquisition

- [ ] Google OAuth (direct integration)
- [ ] GitHub OAuth (direct integration)
- [ ] Apple OAuth (direct integration)
- [ ] OAuth connection management UI
- [ ] Account linking (multiple providers per account)

> **Legacy:** See [Backend Utilities](./dev/legacy.md#backend-utilities) → `authHelpers.ts`, `TokenManager.ts`; [Auth DTOs](./dev/legacy.md#auth-dtos); [Auth Components](./dev/legacy.md#auth-components) → `ProtectedRoute.tsx`, Auth modals

### Magic Links

Required for: passwordless auth option

- [ ] Magic link token generation
- [ ] `/api/auth/magic-link/request` endpoint
- [ ] `/api/auth/magic-link/verify` endpoint
- [ ] `magic_link_tokens` database table

> **Legacy:** See [Token Utilities](./dev/legacy.md#token-utilities) → `generateSecureToken()`, `hashToken()`, `isTokenExpired()`; [Backend Utilities](./dev/legacy.md#backend-utilities) → `verification.service.ts`, `email-template.service.ts`

---

## Infrastructure & Quality

### Backend

- [x] Health checks and readiness endpoints (expand existing) - `/health/detailed`, `/health/ready`, `/health/live`, `/health/routes`
- [x] Request ID middleware with correlation IDs - `apps/server/src/infra/logger/`
- [x] Password reset flow - `requestPasswordReset()` and `resetPassword()` in `apps/server/src/modules/auth/service.ts`

> **Implementation:** Health checks in `apps/server/src/app.ts`, Logging in `apps/server/src/infra/logger/`
> **Legacy:** See [Backend Utilities](./dev/legacy.md#backend-utilities) → `ServerManager.ts` (health/metrics), `LoggerService.ts` (correlation IDs), `ResetService.ts` (password reset); [Auth DTOs](./dev/legacy.md#auth-dtos) → `password-reset.dto`; [Potential Migrations](./dev/legacy.md#structured-logging)

### Frontend (Web)

- [ ] Error boundary + toasts for API errors
- [ ] Accessibility pass (focus management, keyboard resize handles)

> **Legacy:** See [Error Classes](./dev/legacy.md#error-classes); [UI Components](./dev/legacy.md#ui-components) → `Throttle.tsx` (loading states); [DOM Utilities](./dev/legacy.md#dom-utilities) → Focus helpers; [Frontend Hooks](./dev/legacy.md#frontend-hooks) → `usePopper`; [Frontend Formatters](./dev/legacy.md#frontend-formatters)

### Infrastructure

- [ ] Production Postgres settings (connection pooling, SSL)
- [ ] Secrets management documentation (env, Vault, SSM)
- [ ] Observability hooks (request logs, metrics, error reporting)
- [ ] Database backup/retention plan

> **Legacy:** See [Potential Migrations](./dev/legacy.md#infrastructure) → Secret providers (EnvSecretProvider, FileSecretProvider)

### Testing

- [ ] Integration tests for API routes (vitest + fastify inject)
- [ ] Playwright E2E for auth + layout resize persistence
- [ ] Security audit: OWASP testing guide compliance

> **Legacy:** See [Potential Migrations](./dev/legacy.md#infrastructure) → Test infrastructure (mocks, test utilities, TestFactory)

### Documentation

- [ ] Update README with status badges once features land
- [ ] Quickstart guides per app (web/desktop/mobile)
- [ ] Release checklist (versioning, changelog, tagging)

### UI Package

- [ ] Accessibility: keyboard support for ResizablePanel (arrow keys)
- [ ] Performance: lazy load demo registry by category

---

## Code Quality

### High Impact

- [ ] Fix barrel exports in `packages/ui/src/index.ts`
- [ ] Add infrastructure tests for critical paths

> **Legacy:** See [Structured Logging](./dev/legacy.md#structured-logging) → Correlation IDs, request tracking

### Medium Impact

- [ ] Auth service context objects
- [ ] Catalog factory pattern (if keeping demo)

---

## Architecture

- [x] Environment-based DI (entrypoints assemble env, no side-effects on import)
  - Server: AppContext pattern in `apps/server/src/app.ts`
  - Web: ClientEnvironment pattern in `apps/web/src/main.tsx` and `apps/web/src/app/App.tsx`
  - All services created at module level, assembled into environment, passed as props
  - No side-effects on import (Chet-stack pattern)

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
- [x] Job queue processing reliably (QueueServer implemented)
- [x] Email delivery working (verification, password reset, notifications) - Console + SMTP providers in `apps/server/src/infra/email/`

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

## References

- **Deferred features:** See `docs/ROADMAP.md`
- **Legacy migrations:** See `docs/dev/legacy.md`

---

_Last Updated: 2026-01-19_

_Philosophy: Foundation is done. Ship products. Copy utilities from legacy when needed._
