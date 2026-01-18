# ABE Stack - TODO

> **Scope:** Solo developer to small team (3-5 engineers), 50,000+ users, up to Series A.
> **Philosophy:** Ship products. The foundation is solid. Build features users pay for.

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

| Priority | Improvement                                              | Why it's essential                                            | Difficulty |
| -------- | -------------------------------------------------------- | ------------------------------------------------------------- | ---------- |
| 1        | **Automate tsconfig project references**                 | Prevents the most painful and silent type errors in monorepos | ★★☆        |
| 2        | **Zod schema + runtime validation for all env variables**| Catches configuration mistakes early (dev, CI, prod)          | ★☆☆        |
| 3        | **Merge frequently triggering sync scripts**             | Reduces watcher overhead and CPU usage during `pnpm dev`      | ★★☆        |
| 4        | **Document affected packages workflows**                 | Saves time for reviewers and new contributors                 | ★☆☆        |
| 5        | **Enforce domain-folder naming convention**              | Makes architecture intention clearer as project grows         | ★★☆        |

### Quick Recommended Order

1. Add proper env + config Zod validation + loading
2. Automate tsconfig references generation
3. Merge alias/import/barrel sync scripts + reduce watchers
4. Write documentation for useful turbo commands (`--filter`, `--since`, `--graph`)
5. Gradually introduce consistent domain folder naming in server and core

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

### Background Jobs (Backend)

Required for: AI processing, audio transcoding, email campaigns

- [ ] Job queue with pg-boss or BullMQ
- [ ] Job types: email, media-processing, ai-inference
- [ ] Retry with exponential backoff
- [ ] Job status tracking with statistics
- [ ] Processor registration pattern

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

- [ ] Health checks and readiness endpoints (expand existing)
- [ ] Request ID middleware with correlation IDs
- [ ] Password reset flow (already have email service)

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

- [ ] Environment-based DI (entrypoints assemble env, no side-effects on import)

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

## References

- **Deferred features:** See `docs/ROADMAP.md`
- **Legacy migrations:** See `docs/dev/legacy.md`

---

_Last Updated: 2026-01-18_

_Philosophy: Foundation is done. Ship products. Copy utilities from legacy when needed._
