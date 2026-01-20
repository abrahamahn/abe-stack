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

## High-Priority Improvements

## Core Product Features

Building blocks needed across multiple products.

### File Uploads & Media (Backend)

Required for: social media, music, fitness (photos), marketplace

- [x] Presigned upload endpoint (filename + contentType)
- [x] Storage key conventions (`uploads/{userId}/{uuid}/{filename}`)
- [x] Upload size limits per user role
- [x] Signed file URLs with expiration
- [x] Content type detection helpers (MIME mapping)
- [x] File utilities with retry logic, streams, auto-mkdir
- [x] **Image processing pipeline** (Sharp)
  - Resize with fit modes (cover, contain, fill, inside)
  - Format conversion (JPEG, PNG, WebP, AVIF)
  - Quality control and thumbnail generation
- [x] **Video processing pipeline** (FFmpeg)
  - Video format conversion (MP4, WebM, HLS)
  - Thumbnail extraction from videos
  - Video compression and optimization
  - Resolution scaling and aspect ratio handling
- [x] Audio file handling (for music apps)
  - Audio format conversion (MP3, AAC, WAV, OGG)
  - Audio compression and optimization
  - Metadata extraction (duration, bitrate, codec)
  - Audio waveform generation
  - Audio streaming support

> **Legacy:** See [File Utilities](./dev/legacy.md#file-utilities), [Backend Utilities](./dev/legacy.md#backend-utilities) → `FileUtils.ts`, `fileHelpers.ts`, `ContentTypes.ts`, `StorageService.ts`, `ImageProcessor.ts`; [UI Components](./dev/legacy.md#ui-components) → `FileUpload.tsx`

### Pagination (Backend + Frontend)

Required for: feeds, search results, lists, marketplace

- [x] Cursor-based pagination schema in @abe-stack/core
- [x] `usePaginatedQuery` hook for infinite scroll
- [x] Standard pagination response shape
- [x] **PaginationOptions** type - `page`, `limit`, `sortBy`, `sortOrder`
- [x] **PaginatedResult<T>** generic type - `data`, `total`, `page`, `hasNext`, `hasPrev`

> **Legacy:** See [Migration Effort Estimates](./dev/legacy.md#migration-effort-estimates) → Pagination types (2-3h, drop-in)

### WebSocket Client + Presence

Required for: messenger, social feeds, real-time notifications

- [x] `packages/ws-client` with auto-reconnect → `WebsocketPubsubClient` in `@abe-stack/sdk/pubsub`
- [x] Subscription deduplication → `SubscriptionCache` in `@abe-stack/sdk/subscriptions`
- [ ] Auth token refresh on reconnect (use `onConnect` callback)
- [ ] React Query cache invalidation on events
- [ ] **Presence tracking** (online/offline/away status, last seen)
- [ ] **Typing indicators** via WebSocket events

> **Implementation:** See `packages/sdk/src/pubsub/`, `packages/sdk/src/subscriptions/`
> **Legacy:** See [Backend Utilities](./dev/legacy.md#backend-utilities) → `WebSocketService.ts`, `WebSocketTypes.ts`

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

---

## Success Metrics

### Pre-Seed (Now)

### Seed

- [ ] First paying customers on at least one product
- [ ] <100ms P95 latency on critical paths
- [ ] Zero security incidents

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

_Last Updated: 2026-01-20_

_Philosophy: Foundation is done. Ship products. Copy utilities from legacy when needed._
