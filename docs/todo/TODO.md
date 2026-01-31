# ABE Stack: Code Refactoring & Restructuring Plan

> **Status:** Draft — Pending Review
> **Last updated:** January 2026
> **Derived from:** Gemini architecture conversations + codebase audit

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architectural Principles (from Gemini Conversations)](#2-architectural-principles)
3. [Current State Assessment](#3-current-state-assessment)
4. [Audit Findings — Gaps & Issues](#4-audit-findings)
5. [File-by-File Classification](#5-file-by-file-classification)
6. [Migration Plan — Phased Approach](#6-migration-plan)
7. [Package Enhancement Details](#7-package-enhancement-details)
8. [Risk Assessment & Mitigations](#8-risk-assessment--mitigations)
9. [Success Criteria](#9-success-criteria)
10. [Future Considerations](#10-future-considerations)
11. [Appendix: Trinity Repository Strategy](#11-appendix-trinity-repository-strategy)

---

## 1. Executive Summary

**Goal:** Complete the migration of `apps/server` from a ~76-file monolith to a ~30-file thin composition layer by moving all reusable infrastructure code into `packages/*`.

**What's already done:**
- Business modules (auth, billing, users, admin) fully migrated to packages
- Route wiring rewritten with no re-exports
- ~25,000 lines removed from server
- 0 import direction violations

**What remains:**
- ~1,320 lines of generic HTTP middleware, router helpers, pagination, cache, and utilities still live in `apps/server/infrastructure/` but have zero app-specific logic
- These should move to their respective packages (`@abe-stack/http`, `@abe-stack/cache`)
- 34 orphaned test files for already-migrated modules need cleanup
- Type system duplication across packages (AppContext redefined in 6+ packages) needs unification
- Router type divergence between server and `@abe-stack/http` needs alignment
- Tier 3 cross-dependencies (admin → auth + billing, users → auth) need documentation

**Estimated scope:** 7 phases (P0–P6), ~20 files to migrate, ~34 orphaned tests to clean up, ~46 source files remaining in server after completion.

---

## 2. Architectural Principles

These principles were established through architecture review conversations and form the foundation for all migration decisions.

### 2.1 The Golden Rule of Imports

This is the only hard technical rule.

```
apps/server  CAN import  packages/*
packages/*   can NEVER import  apps/server
packages/A   CAN import  packages/B  (if B is lower tier)
```

**Violation test:** If you find yourself in `packages/auth` trying to import a type from `apps/server/src/types.ts`, you have broken the architecture. Move that type to `packages/contracts` immediately.

### 2.2 The "Motherboard & Components" Model

> **The Server is the "Motherboard." The Packages are the "Components."**

| Aspect | `packages/*` (Components) | `apps/server` (Motherboard) |
|---|---|---|
| **Role** | Defines **HOW** things work | Defines **WHAT** is running |
| **Mental Model** | Engine, Transmission, Wheels | Mechanic who assembles the car |
| **Logic** | 100% of all business rules | 0% — only wiring |
| **State** | Stateless (classes/functions) | Stateful (instances/env vars) |
| **Database** | Definitions (schema/repo) | Connection (pool instance) |
| **Config** | Validation schemas (Zod) | Actual values (`process.env`) |
| **Knowledge** | Knows nothing about the App | Knows everything about Packages |

### 2.3 The Responsibility Boundary

#### `packages/*` — The Capabilities

**Contents:**
- **Business Logic:** "How do we calculate a refund?" → `packages/billing`
- **Data Access:** "How do we query the users table?" → `packages/db`
- **Route Handlers:** "What happens when `POST /login` is called?" → `packages/auth`
- **Internal Config:** "I need a `STRIPE_KEY` to work."

#### `apps/server` — The Composition

**Contents:**
- **Wiring:** `app.register(authPlugin)`
- **Configuration:** "Here is the `STRIPE_KEY` from `process.env`."
- **Lifecycle:** "Start the server on port 3000."
- **Dependency Injection:** "Here is the Database instance you asked for."

### 2.4 The Three Litmus Tests

For every file you touch, ask:

**Test 1: "Could I use this in a CLI script?"**
- Can I import this without starting the Fastify server?
- Yes → It belongs in a package
- No (it relies on `req.body`) → It belongs in the Package's HTTP Adapter

**Test 2: "Is this specific to THIS deployment?"**
- Is this logic reusable for a different company using ABE Stack?
- Yes → Package
- No (hardcoded for your specific setup) → Keep in `apps/server`

**Test 3: "Does it define a Zod Schema?"**
- Does the Frontend need this too? → `packages/contracts`
- Internal DB validation only? → `packages/db`
- It should **never** stay in `apps/server` because the Frontend can't reach it there

### 2.5 The Route Definition Rule

> **Routes belong in the Package, not the App.**

`POST /login` is a fundamental feature of the Auth "Product." If you sell the Auth module to a client, they expect that route to exist.

**Pattern:**
- Package exports a Fastify Plugin / Route Map (`registerAuthRoutes`)
- Server simply calls `app.register(registerAuthRoutes)`

### 2.6 The 4-Tier Architecture

```
Tier 4: Applications   (apps/server, apps/web, apps/desktop)
   ↓ imports from
Tier 3: Modules         (auth, billing, users, admin, realtime, notifications, media)
   ↓ imports from
Tier 2: Infrastructure  (db, http, storage, jobs, email, cache, security)
   ↓ imports from
Tier 1: Kernel          (core, contracts)
   ↓ no imports from above
```

Dependencies flow **DOWN** only. A package in Tier 3 can import from Tier 2, but Tier 2 can **never** import from Tier 3.

---

## 3. Current State Assessment

### 3.1 What's Already Correct

The server has already been substantially cleaned up. These files are in the right place:

| File/Directory | Why It Stays |
|---|---|
| `main.ts` (60 LOC) | Thin entry point — config, create, start, shutdown signals |
| `app.ts` (298 LOC) | Composition root — DI container, wires all services |
| `server.ts` (134 LOC) | Fastify factory with plugin registration |
| `config/` (18 files) | Environment loading — the server's core job |
| `modules/routes.ts` | Route wiring only — imports from `@abe-stack/*` |
| `modules/system/` | Deployment-specific: health, uptime, route listing |
| `shared/types.ts` | `AppContext`, `IServiceContainer` — server DI types |
| `types/fastify.d.ts` | Fastify type augmentations (app-specific) |
| `types/media-deps.d.ts` | Third-party module stubs |

### 3.2 What Needs to Move

These files contain **zero app-specific logic** and pass all three litmus tests for package migration:

| Directory | Files | Lines | Target Package |
|---|---|---|---|
| `infrastructure/http/middleware/` | 9 files | ~800 LOC | `@abe-stack/http` |
| `infrastructure/http/pagination/` | 4 files | ~200 LOC | `@abe-stack/http` |
| `infrastructure/http/router/` (generic parts) | ~2 files partial | ~100 LOC | `@abe-stack/http` |
| `services/cache-service.ts` | 1 file | ~130 LOC | `@abe-stack/cache` |
| `utils/request-utils.ts` | 1 file | ~90 LOC | `@abe-stack/http` |
| **Total** | **~17 files** | **~1,320 LOC** | |

### 3.3 What Stays (Grey Area Infrastructure)

These files integrate multiple services and are deployment-specific:

| Directory | Files | Why It Stays |
|---|---|---|
| `infrastructure/http/plugins.ts` | 1 | App-specific plugin orchestration — wires config into middleware |
| `infrastructure/monitor/` | 6 | Health checks aggregate all infrastructure components |
| `infrastructure/messaging/` | 2 | WebSocket adapter with module-level connection state |
| `infrastructure/search/` | 6 | SQL/Elasticsearch adapters — server-specific provider selection |
| `infrastructure/notifications/` | 4 | FCM provider factory — thin server-specific adapter |

### 3.4 Metrics

| Metric | Before Migration | After P0-P2 | After This Plan |
|---|---|---|---|
| Server source files | ~116 | ~76 | ~46 (estimated) |
| Lines removed | — | ~25,000 | ~26,320 |
| Import violations | 0 | 0 | 0 |
| Business logic in server | Some | Minimal | Zero |

---

## 4. Audit Findings — Gaps & Issues

A secondary audit uncovered these issues that the initial plan did not address. They are now incorporated into the migration phases below.

### 4.1 Orphaned Test Files (34 files) — HIGH PRIORITY

When business modules were migrated to packages, their **test files were left behind** in `apps/server/src/__tests__/` and `apps/server/src/modules/`:

| Directory | Orphaned Tests | Source Status |
|---|---|---|
| `modules/auth/` | 28 test files | **Zero source files** — all migrated to `@abe-stack/auth` |
| `modules/notifications/` | 3 test files | **Zero source files** — migrated to `@abe-stack/notifications` |
| `modules/realtime/` | 3 test files | **Zero source files** — migrated to `@abe-stack/realtime` |
| **Total** | **34 files** | |

Additionally, `__tests__/integration/test-utils.ts` is a 584-line monolithic test utility file (19 exported functions) that may reference migrated code paths.

**Action:** These orphaned tests must be either:
- Deleted (if equivalent tests exist in the target packages)
- Migrated to the target packages (if they provide unique coverage)
- Updated to import from `@abe-stack/*` (if they test integration patterns)

### 4.2 Type System Duplication — HIGH PRIORITY

Each Tier 3 package independently redefines its own `AppContext` variant instead of composing from a shared base:

| Package | Type Defined | Extends |
|---|---|---|
| `packages/contracts` | `BaseContext` | (root — `db`, `repos`, `log`) |
| `packages/auth` | `AppContext` | `BaseContext` + email, templates, config |
| `packages/admin` | `AdminAppContext` | `BaseContext` + narrowed repos, config |
| `packages/billing` | `BillingAppContext` | `BaseContext` + billing config |
| `packages/users` | `UserAppContext` | `BaseContext` + user config |
| `apps/server` | `AppContext` | Full superset (IServiceContainer) |

**Problem:** 21+ package files define or reference `AppContext` variants. The server's `AppContext` (in `shared/types.ts`) satisfies all of them structurally (duck typing), but:
- There's no single source of truth for "what a handler can depend on"
- If a handler needs both auth and admin capabilities, there's no clear composition pattern
- `RequestWithCookies` and `ReplyWithCookies` are redefined in multiple packages

**Action:** Establish a formal context composition pattern in `packages/contracts`:
- [ ] Define narrow capability interfaces (`HasEmail`, `HasBilling`, `HasStorage`, etc.)
- [ ] Packages compose what they need: `type AuthContext = BaseContext & HasEmail & HasCookies`
- [ ] Server's `AppContext` implements all capability interfaces
- [ ] Document the pattern so new packages follow it

### 4.3 Router Type Architecture Divergence — HIGH PRIORITY

The server and `@abe-stack/http` define **incompatible** router type systems:

**Server** (`infrastructure/http/router/types.ts`):
```typescript
type PublicHandler<TBody, TResult> = (
  ctx: AppContext,          // ← Concrete server type
  body: TBody,
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<RouteResult<TResult>>;
```

**Package** (`packages/http/src/router/types.ts`):
```typescript
type HandlerContext = BaseContext;  // ← Generic, framework-agnostic
type PublicHandler<TBody, TResult> = (
  ctx: HandlerContext,              // ← Generic BaseContext
  body: TBody,
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<RouteResult<TResult>>;
```

**Additional divergences:**
- Server's `RouterOptions` hardcodes `createAuthGuard` import from `@abe-stack/auth`
- Package's `RouterOptions` accepts `authGuardFactory` as a parameter (dependency injection)
- 18 package files currently use the generic router types

**Action:** The package version is architecturally correct (generic, injectable). Phase 4 must align the server to use the package's router, not the other way around.

### 4.4 Barrel Export Coupling — MEDIUM PRIORITY

`apps/server/src/infrastructure/index.ts` re-exports local implementations of router, pagination, and middleware instead of from `@abe-stack/http`. This means:
- `modules/routes.ts` imports `registerRouteMap` from `@/infrastructure/http/router` (local)
- It should import from `@abe-stack/http` (package)

**Action:** After migrating infrastructure code to packages, update all server imports to use `@abe-stack/http` as the canonical source. The local `infrastructure/index.ts` should only export server-specific adapters.

### 4.5 Tier 3 Cross-Dependencies — MEDIUM PRIORITY (Documentation)

Tier 3 packages have same-tier dependencies that create an implicit hierarchy:

```
Tier 3 (Module Layer):
├── auth          (no Tier 3 deps) ← Base module
├── billing       (no Tier 3 deps) ← Base module
├── realtime      (no Tier 3 deps) ← Base module
├── notifications (no Tier 3 deps) ← Base module
├── media         (no Tier 3 deps) ← Base module
├── users         → depends on auth              ← Mid-layer
└── admin         → depends on auth + billing    ← Orchestration layer
```

**Impact:** If individual modules should be independently publishable/licensable, `admin` cannot ship without `auth` and `billing`. `users` cannot ship without `auth`.

**Action:** Document whether this is intentional:
- [ ] If coupling is intentional (bundled product tiers): document the assumption
- [ ] If modules must be independent: extract admin orchestration to a separate concern

### 4.6 Cache Service API Incompatibility — LOW PRIORITY

The server's `CacheService` and `@abe-stack/cache`'s `LRUCache` have completely different APIs:

| Feature | Server's CacheService | Package's LRUCache |
|---|---|---|
| Get/Set | `get(key)`, `set(key, value, ttl)` | `get(key, options)`, `set(key, value, options)` |
| Memoization | No | Yes (with stampede prevention) |
| Tags | No | Yes (tag-based invalidation) |
| Eviction | TTL-based expiry | LRU eviction + callbacks |
| Stats | Basic (size, hits, misses) | Memory tracking |

**Action:** Phase 1 must reconcile these. The package version is strictly more capable. The migration path should:
- [ ] Map server's simple API to package's richer API
- [ ] Ensure `IServiceContainer.cache` type references the package type
- [ ] Update `app.ts` to construct `LRUCache` instead of `CacheService`

### 4.7 Search Provider Encapsulation — LOW PRIORITY

`ServerSearchProvider` is defined in server infrastructure and referenced by `IServiceContainer`. No packages currently import search types directly, but if they need search in the future:
- They can't import from server (violates Golden Rule)
- They'd need search interfaces in `packages/contracts`

**Action:** No immediate change needed, but if search is ever used in packages:
- [ ] Extract `SearchProvider` interface to `packages/contracts`
- [ ] Keep concrete implementations (SQL/Elasticsearch) in server

---

## 5. File-by-File Classification

### 5.1 Entry Points & Core — KEEP (5 files)

```
apps/server/src/
├── main.ts              → KEEP (entry point, lifecycle management)
├── app.ts               → KEEP (composition root, DI container)
├── server.ts            → KEEP (Fastify factory, plugin registration)
├── shared/types.ts      → KEEP (AppContext, IServiceContainer)
└── shared/index.ts      → KEEP (barrel export)
```

### 5.2 Config Layer — KEEP (18 files)

All config files are correctly placed. They load `process.env` values and validate them — this is the server's primary job.

```
config/
├── index.ts             → KEEP (master re-export)
├── factory.ts           → KEEP (env validation orchestrator)
├── auth/
│   ├── auth.ts          → KEEP (JWT secrets, lockout policies, OAuth)
│   ├── jwt.ts           → KEEP (JWT rotation config)
│   └── rate-limit.ts    → KEEP (rate limiting thresholds)
├── infra/
│   ├── database.ts      → KEEP (connection string builder, SSL validation)
│   ├── server.ts        → KEEP (host, port, CORS, proxy)
│   ├── cache.ts         → KEEP (cache provider config)
│   ├── storage.ts       → KEEP (S3/local path resolution)
│   ├── queue.ts         → KEEP (job queue settings)
│   └── package.ts       → KEEP (package manager config)
└── services/
    ├── email.ts         → KEEP (SMTP/console mode provider)
    ├── notifications.ts → KEEP (FCM/OneSignal provider detection)
    ├── billing.ts       → KEEP (Stripe/PayPal API keys, plan IDs)
    └── search.ts        → KEEP (Elasticsearch/SQL selection)
```

### 5.3 Modules — KEEP (5 files)

```
modules/
├── routes.ts            → KEEP (imports @abe-stack/* and registers routes)
├── index.ts             → KEEP (barrel export)
└── system/
    ├── routes.ts        → KEEP (health, status, module listing — deployment-specific)
    ├── handlers.ts      → KEEP (integrates all health checks)
    └── index.ts         → KEEP (barrel export)
```

### 5.4 HTTP Middleware — MIGRATE to `@abe-stack/http` (9 files)

These are all pure, generic utilities with zero app-specific logic:

```
infrastructure/http/middleware/
├── security.ts          → MIGRATE (CORS, CSP, HSTS, frame options)
├── validation.ts        → MIGRATE (SQL/NoSQL injection, XSS prevention)
├── cookie.ts            → MIGRATE (cookie parsing & signing)
├── csrf.ts              → MIGRATE (CSRF token validation)
├── correlationId.ts     → MIGRATE (request correlation ID generation)
├── requestInfo.ts       → MIGRATE (IP, user agent extraction)
├── proxyValidation.ts   → MIGRATE (CIDR matching, proxy chain validation)
├── static.ts            → MIGRATE (static file serving wrapper)
└── index.ts             → MIGRATE (barrel export)
```

**Litmus test results:**
- CLI usable? Yes — none depend on Fastify server being running
- Deployment-specific? No — generic HTTP middleware
- Has Zod schemas? No — pure functions

### 5.5 HTTP Pagination — MIGRATE to `@abe-stack/http` (4 files)

```
infrastructure/http/pagination/
├── helpers.ts           → MIGRATE (cursor-based pagination utilities)
├── middleware.ts         → MIGRATE (pagination middleware)
├── types.ts             → MIGRATE (pagination types)
└── index.ts             → MIGRATE (barrel export)
```

### 5.6 HTTP Router — PARTIAL MIGRATE (3 files)

```
infrastructure/http/router/
├── router.ts            → SPLIT — Generic helpers (publicRoute, protectedRoute,
│                           createRouteMap, registerRouteMap) → @abe-stack/http
│                           AppContext-specific overloads → KEEP in server
├── types.ts             → SPLIT — Generic types (ValidationSchema, RouteResult,
│                           HttpMethod, BaseRouteDefinition, RouteMap) → @abe-stack/http
│                           App-specific handler types → KEEP in server
└── index.ts             → KEEP (barrel export, re-export from package)
```

### 5.7 HTTP Plugins & Index — KEEP (2 files)

```
infrastructure/http/plugins.ts  → KEEP (app-specific middleware orchestration)
infrastructure/http/index.ts    → KEEP (will re-export from package + local)
```

### 5.8 Monitor — KEEP (6 files)

```
infrastructure/monitor/
├── health/
│   ├── health.ts        → KEEP (aggregates all infra health checks)
│   └── index.ts         → KEEP
└── logger/
    ├── logger.ts        → KEEP (request-scoped logger with correlation IDs)
    ├── types.ts         → KEEP (logger types)
    ├── middleware.ts     → KEEP (logging middleware)
    └── index.ts         → KEEP
```

### 5.9 Messaging — KEEP (2 files)

```
infrastructure/messaging/websocket/
├── websocket.ts         → KEEP (CSRF + auth + subscription management)
└── index.ts             → KEEP
```

### 5.10 Search — KEEP (6 files)

```
infrastructure/search/
├── search-factory.ts    → KEEP (provider selection logic)
├── elasticsearch-provider.ts → KEEP
├── sql-provider.ts      → KEEP
├── types.ts             → KEEP
└── index.ts             → KEEP
```

### 5.11 Notifications — KEEP (4 files)

```
infrastructure/notifications/
├── notification-factory.ts → KEEP (FCM provider factory)
├── fcm-provider.ts      → KEEP
├── types.ts             → KEEP
└── index.ts             → KEEP
```

### 5.12 Services — MIGRATE (1 file)

```
services/
├── cache-service.ts     → MIGRATE to @abe-stack/cache (generic in-memory LRU)
└── index.ts             → KEEP (will re-export from package)
```

### 5.13 Utils — MIGRATE (1 file)

```
utils/
├── request-utils.ts     → MIGRATE to @abe-stack/http/utils (getPathParam, etc.)
└── index.ts             → KEEP (will re-export from package)
```

### 5.14 Types — KEEP (2 files)

```
types/
├── fastify.d.ts         → KEEP (Fastify augmentations, app-specific)
└── media-deps.d.ts      → KEEP (third-party stubs)
```

### 5.15 Scripts — KEEP (3 files)

```
scripts/
├── seed.ts              → KEEP (deployment-specific)
├── bootstrap-admin.ts   → KEEP (deployment-specific)
└── db-push.ts           → KEEP (deployment-specific)
```

---

## 6. Migration Plan

### Phase 0: Clean Up Orphaned Tests (Low Risk)

**What:** Remove or relocate 34 orphaned test files left behind after module migrations.

**Context:** When auth, notifications, and realtime modules were migrated to packages, their test files remained in `apps/server/src/modules/`. These tests reference code paths that no longer exist in the server.

**Actions:**
- [ ] Inventory all test files under `apps/server/src/modules/auth/` (28 files)
- [ ] Inventory test files under `apps/server/src/modules/notifications/` (3 files)
- [ ] Inventory test files under `apps/server/src/modules/realtime/` (3 files)
- [ ] For each test file, check if equivalent tests exist in the target package
- [ ] Delete tests that duplicate package-level coverage
- [ ] Migrate tests with unique integration coverage to the target packages
- [ ] Audit `__tests__/integration/test-utils.ts` (584 LOC, 19 exports) — remove functions that reference deleted modules
- [ ] Run `pnpm test` to verify no test regressions

**Files removed:** ~34 test files + cleanup of test-utils.ts

**Risk:** Low — removing tests cannot break production code. Only risk is losing unique test coverage.

---

### Phase 1: Enhance `@abe-stack/cache` (Low Risk)

**What:** Move `services/cache-service.ts` into `packages/cache`.

**Current state:** `packages/cache` already has an LRU cache implementation. The server's `cache-service.ts` has a simpler TTL-based implementation.

**Actions:**
- [ ] Compare the two implementations — determine if package version already covers the use cases
- [ ] If yes: delete server's `cache-service.ts`, update `app.ts` to use `@abe-stack/cache`
- [ ] If no: merge features into `@abe-stack/cache`, then delete server's version
- [ ] Update `shared/types.ts` to reference package types for `IServiceContainer.cache`
- [ ] Run tests: `pnpm test --filter=@abe-stack/cache && pnpm test --filter=server`

**Files touched:**
- `packages/cache/src/` — Possibly enhanced
- `apps/server/src/services/cache-service.ts` — Deleted
- `apps/server/src/app.ts` — Updated import
- `apps/server/src/shared/types.ts` — Updated type reference

**Impact:** 1 file removed from server, ~130 lines.

---

### Phase 2: Migrate HTTP Middleware to `@abe-stack/http` (Medium Risk)

**What:** Move all 9 middleware files from `infrastructure/http/middleware/` into `packages/http/src/middleware/`.

**Current state:** `packages/http` already has a `middleware/` directory. These server middleware files are generic and have no `AppContext` dependency.

**Actions:**
- [ ] Audit each middleware file for any hidden `AppContext` or server-specific imports
- [ ] Move files to `packages/http/src/middleware/`
- [ ] Update `packages/http/src/index.ts` to export new middleware
- [ ] Update `apps/server/src/infrastructure/http/plugins.ts` to import from `@abe-stack/http`
- [ ] Update `apps/server/src/infrastructure/http/middleware/` — delete directory or replace with re-exports
- [ ] Ensure no other packages are affected (check dependents)
- [ ] Run tests: `pnpm test --filter=@abe-stack/http && pnpm test --filter=server`
- [ ] Run type-check: `pnpm type-check`

**Files moved:** 9 files (~800 lines)

**Risk:** Medium — middleware is used in the critical request path. Thorough testing required.

---

### Phase 3: Migrate Pagination to `@abe-stack/http` (Low Risk)

**What:** Move all 4 pagination files from `infrastructure/http/pagination/` into `packages/http/src/pagination/`.

**Actions:**
- [ ] Move files to `packages/http/src/pagination/`
- [ ] Update exports in `packages/http`
- [ ] Update server imports to use `@abe-stack/http`
- [ ] Delete `infrastructure/http/pagination/` directory
- [ ] Run tests

**Files moved:** 4 files (~200 lines)

**Risk:** Low — pagination is self-contained and well-typed.

---

### Phase 4: Extract Generic Router Types to `@abe-stack/http` (Medium-High Risk)

**What:** Move the generic parts of the router system (`publicRoute`, `protectedRoute`, `createRouteMap`, `registerRouteMap`, and generic type definitions) into `@abe-stack/http`.

**Current complexity:** The router files mix generic route-registration logic with `AppContext`-typed handler signatures. These need to be separated.

**Actions:**
- [ ] In `packages/http/src/router/`, create generic versions of route helpers that accept a type parameter for context
- [ ] Move generic types (`ValidationSchema`, `RouteResult`, `HttpMethod`, `BaseRouteDefinition`, `RouteMap`, `RouterOptions`) to `packages/http/src/router/types.ts`
- [ ] Keep `AppContext`-bound handler types (`PublicHandler<T>`, `ProtectedHandler<T>`) in server as thin wrappers
- [ ] Update all package consumers (`@abe-stack/auth`, `@abe-stack/users`, etc.) that import from `@abe-stack/http` — ensure they still work
- [ ] This phase MUST NOT break any existing package route definitions
- [ ] Run full test suite: `pnpm test`
- [ ] Run full type-check: `pnpm type-check`

**Files moved:** ~2 files partial (~100 lines)

**Risk:** Medium-High — router types are used across 6+ packages. Changes must be backward-compatible. Consider adding generic type parameters and keeping existing types as aliases during transition.

---

### Phase 5: Migrate Request Utils (Low Risk)

**What:** Move `utils/request-utils.ts` to `@abe-stack/http`.

**Actions:**
- [ ] Move to `packages/http/src/utils/request-utils.ts`
- [ ] Update exports in `packages/http`
- [ ] Update server imports
- [ ] Delete from server
- [ ] Run tests

**Files moved:** 1 file (~90 lines)

**Risk:** Low — pure utility functions with no side effects.

---

### Phase 6: Unify Type System & Context Composition (Medium Risk)

**What:** Establish a formal context composition pattern in `packages/contracts` to eliminate type duplication across packages.

**Current problem:** Each Tier 3 package independently redefines its own `AppContext` variant (see [Audit Finding 4.2](#42-type-system-duplication--high-priority)). This creates:
- No single source of truth for handler dependencies
- No composition pattern when a handler needs capabilities from multiple domains
- Duplicated `RequestWithCookies` / `ReplyWithCookies` definitions

**Actions:**
- [ ] Define narrow capability interfaces in `packages/contracts`:
  ```typescript
  // packages/contracts/src/context.ts
  interface HasEmail { email: EmailService; templates: EmailTemplates; }
  interface HasBilling { billing: BillingService; }
  interface HasStorage { storage: StorageService; }
  interface HasCookies { cookies: CookieManager; }
  // etc.
  ```
- [ ] Update each package to compose its context from capabilities:
  ```typescript
  // packages/auth/src/types.ts
  type AuthContext = BaseContext & HasEmail & HasCookies & HasAuthConfig;
  ```
- [ ] Update `apps/server/src/shared/types.ts` — `AppContext` implements all capabilities:
  ```typescript
  type AppContext = BaseContext & HasEmail & HasBilling & HasStorage & HasCookies & ...;
  ```
- [ ] Unify `RequestWithCookies` and `ReplyWithCookies` into `packages/contracts`
- [ ] Update all 21+ affected files across packages
- [ ] Run `pnpm type-check` and `pnpm test` after each package update

**Files touched:** ~25 files across contracts, auth, admin, billing, users, server
**Risk:** Medium — type changes propagate across the entire codebase. Use structural typing to maintain backward compatibility during transition.

---

### Phase 7: Update Server Imports & Barrel Exports (Low Risk)

**What:** After Phases 2–5 migrate code to packages, update all server imports to use `@abe-stack/http` as the canonical source instead of local `@/infrastructure/` paths.

**Actions:**
- [ ] Update `modules/routes.ts` to import `registerRouteMap` from `@abe-stack/http` instead of `@/infrastructure/http/router`
- [ ] Update `infrastructure/http/plugins.ts` to import middleware from `@abe-stack/http`
- [ ] Slim down `infrastructure/index.ts` to only export server-specific adapters (monitor, search, notifications, messaging)
- [ ] Remove empty directories left behind after file migrations
- [ ] Run `pnpm build && pnpm type-check && pnpm test`

**Risk:** Low — import path changes only; no logic changes.

---

### Phase Summary

| Phase | Description | Target | Files Affected | Risk | Dependencies |
|---|---|---|---|---|---|
| **P0** | Clean up orphaned tests | `apps/server` | ~34 deleted | Low | None |
| **P1** | Cache service → package | `@abe-stack/cache` | 1 migrated | Low | None |
| **P2** | HTTP middleware → package | `@abe-stack/http` | 9 migrated (~800 LOC) | Medium | None |
| **P3** | Pagination → package | `@abe-stack/http` | 4 migrated (~200 LOC) | Low | P2 |
| **P4** | Router types → package | `@abe-stack/http` | 2 partial (~100 LOC) | Med-High | P2, P3 |
| **P5** | Request utils → package | `@abe-stack/http` | 1 migrated (~90 LOC) | Low | P2 |
| **P6** | Type system unification | `@abe-stack/contracts` | ~25 updated | Medium | P4 |
| **P7** | Server import cleanup | `apps/server` | ~10 updated | Low | P2–P5 |

**Recommended execution order:**
1. P0 (cleanup) — can be done independently, immediately
2. P1 (cache) — independent, low risk
3. P2 → P3 → P5 (HTTP migrations) — sequential, same package
4. P4 (router) — after P2/P3, highest risk
5. P6 (types) — after P4, cross-cutting
6. P7 (import cleanup) — final sweep after all migrations

**Post-migration server file count:** ~46 source files (down from ~76), ~48 test files (down from ~82)

---

## 7. Package Enhancement Details

### 7.1 `@abe-stack/http` — After Migration

```
packages/http/src/
├── middleware/              ← NEW (from server)
│   ├── security.ts         (CORS, CSP, HSTS, frame options)
│   ├── validation.ts       (SQL/NoSQL injection, XSS prevention)
│   ├── cookie.ts           (cookie parsing & signing)
│   ├── csrf.ts             (CSRF token validation)
│   ├── correlationId.ts    (request correlation ID)
│   ├── requestInfo.ts      (IP, user agent extraction)
│   ├── proxyValidation.ts  (CIDR matching, proxy chain)
│   ├── static.ts           (static file serving)
│   └── index.ts
├── pagination/             ← NEW (from server)
│   ├── helpers.ts          (cursor-based pagination)
│   ├── middleware.ts        (pagination middleware)
│   ├── types.ts
│   └── index.ts
├── router/                 ← ENHANCED (generic parts from server)
│   ├── router.ts           (publicRoute, protectedRoute, createRouteMap, registerRouteMap)
│   ├── types.ts            (ValidationSchema, RouteResult, RouteMap, etc.)
│   └── index.ts
├── utils/                  ← NEW (from server)
│   ├── request-utils.ts    (getPathParam, getQueryParam, etc.)
│   └── index.ts
└── index.ts                (barrel export — all public API)
```

**New exports from `@abe-stack/http`:**
```typescript
// Middleware
export { applyCors, applySecurityHeaders } from './middleware/security';
export { validateInput, sanitizeInput } from './middleware/validation';
export { parseCookies, signCookie } from './middleware/cookie';
export { validateCsrf, generateCsrfToken } from './middleware/csrf';
export { correlationIdMiddleware } from './middleware/correlationId';
export { extractRequestInfo } from './middleware/requestInfo';
export { validateProxy, matchCidr } from './middleware/proxyValidation';
export { serveStatic } from './middleware/static';

// Pagination
export { buildCursorPagination } from './pagination/helpers';
export { paginationMiddleware } from './pagination/middleware';
export type { PaginationOptions, PaginatedResponse } from './pagination/types';

// Utils
export { getPathParam, getQueryParam, getValidatedPathParam } from './utils/request-utils';
```

### 7.2 `@abe-stack/cache` — After Migration

```
packages/cache/src/
├── providers/
│   ├── lru-cache.ts        (existing LRU implementation)
│   └── memory-cache.ts     ← NEW or MERGED (from server's cache-service.ts)
├── types.ts
└── index.ts
```

### 7.3 `apps/server` — After Migration

```
apps/server/src/                   (~46 files)
├── main.ts                        (entry point)
├── app.ts                         (composition root)
├── server.ts                      (Fastify factory)
├── config/                        (18 files — env loading)
│   ├── factory.ts
│   ├── auth/                      (3 files)
│   ├── infra/                     (6 files)
│   └── services/                  (4 files)
├── infrastructure/                (~18 files — app-specific adapters)
│   ├── http/
│   │   ├── plugins.ts             (middleware orchestration — imports from @abe-stack/http)
│   │   ├── router/                (AppContext-bound handler types only)
│   │   └── index.ts
│   ├── monitor/                   (6 files — health checks, logging)
│   ├── messaging/                 (2 files — WebSocket adapter)
│   ├── search/                    (6 files — SQL/ES providers)
│   └── notifications/             (4 files — FCM factory)
├── modules/                       (5 files — route wiring + system module)
├── shared/                        (2 files — AppContext, IServiceContainer)
├── services/                      (1 file — barrel, re-exports from package)
├── scripts/                       (3 files — seed, bootstrap, db-push)
├── types/                         (2 files — Fastify augmentations)
└── utils/                         (1 file — barrel, re-exports from package)
```

---

## 8. Risk Assessment & Mitigations

### 8.1 Breaking Package Consumers

**Risk:** Moving router types could break `@abe-stack/auth`, `@abe-stack/users`, etc.

**Mitigation:**
- Phase 4 (router) is intentionally last — it's the highest risk
- Use TypeScript generic type parameters so existing types remain compatible
- Consider a transition period with type aliases in the old location
- Run full type-check after every change: `pnpm type-check`

### 8.2 Middleware Runtime Behavior

**Risk:** Middleware import order or initialization could change subtly when moved to a package.

**Mitigation:**
- `plugins.ts` (which orchestrates middleware order) stays in the server
- Only the middleware _implementations_ move — the _composition_ stays
- Write integration tests for the middleware registration pipeline before migrating

### 8.3 Circular Dependencies

**Risk:** Moving code between packages could introduce circular dependencies.

**Mitigation:**
- All migrations flow downward (server → packages)
- No package-to-package moves in this plan
- Run `pnpm build` after each phase to catch circular imports

### 8.4 Test Coverage Gaps

**Risk:** Server middleware may not have dedicated tests; moving them to packages requires new tests.

**Mitigation:**
- Before each phase, audit test coverage for the files being moved
- Write package-level unit tests for each migrated module
- Run full test suite after each phase: `pnpm test`

### 8.5 Type System Unification (Phase 6)

**Risk:** Changing context type definitions could break handler signatures across 21+ files in 6 packages.

**Mitigation:**
- TypeScript's structural typing means existing code will continue to work as long as the shape matches
- Introduce capability interfaces (`HasEmail`, `HasBilling`, etc.) as additive — don't remove existing types initially
- Use intersection types for composition — existing `AppContext extends BaseContext` patterns remain valid
- Migrate one package at a time; run `pnpm type-check` after each
- If a package's types can't be easily migrated, leave it with a `// TODO: migrate to capability pattern` comment

### 8.6 Orphaned Test Cleanup (Phase 0)

**Risk:** Deleting test files could lose unique integration coverage not replicated in packages.

**Mitigation:**
- Before deleting any test file, check if the target package has equivalent tests
- For auth (28 test files): compare with `packages/auth/src/**/*.test.ts`
- For notifications (3 test files): compare with `packages/notifications/src/**/*.test.ts`
- For realtime (3 test files): compare with `packages/realtime/src/**/*.test.ts`
- Any test with unique coverage should be migrated to the package, not deleted

---

## 9. Success Criteria

### 9.1 Quantitative

| Metric | Current | Target | Validation |
|---|---|---|---|
| Server source files | ~76 | ≤50 | `find apps/server/src -name '*.ts' ! -name '*.test.*' \| wc -l` |
| Orphaned test files | 34 | 0 | `find apps/server/src/modules -name '*.test.*' \| wc -l` |
| Import violations | 0 | 0 | `pnpm build` passes |
| Business logic in server | Minimal | Zero | Manual audit |
| `@abe-stack/http` exports | ~15 | ~35 | Package API surface |
| AppContext variants | 6+ independent | 1 base + composition | Type audit |
| Test suite | Passing | Passing | `pnpm test` green |
| Type check | Passing | Passing | `pnpm type-check` green |

### 9.2 Qualitative

- [ ] Every file in `apps/server/src/` passes the "Could I use this in a CLI script?" test with "No" (it's server-specific) or is config/wiring
- [ ] `@abe-stack/http` is a self-contained, reusable HTTP framework package
- [ ] A new app (e.g., `apps/admin-api`) could be built using only `packages/*` imports with minimal boilerplate
- [ ] The architecture matches the "Motherboard & Components" mental model
- [ ] Context types follow a composition pattern (capabilities, not monolithic interfaces)
- [ ] No orphaned test files remain in the server

### 9.3 Validation Checklist (Run After Each Phase)

```bash
# 1. Build passes (no circular deps, no missing exports)
pnpm build

# 2. Types check (no broken imports)
pnpm type-check

# 3. Tests pass (no regressions)
pnpm test

# 4. Lint passes (import order, unused imports)
pnpm lint

# 5. No import violations (packages never import apps)
grep -r "from.*apps/server" packages/ --include="*.ts" | grep -v node_modules
# Should return 0 results

# 6. No orphaned test files (after P0)
find apps/server/src/modules -name "*.test.*" -not -path "*/system/*" | wc -l
# Should return 0
```

---

## 10. Future Considerations

These items are out of scope for the current refactoring plan but should be tracked for future work.

### 10.1 Tier 3 Module Independence

**Decision needed:** Should Tier 3 modules be independently publishable as npm packages?

- Currently `admin` depends on `auth` + `billing`, and `users` depends on `auth`
- This is fine for a monorepo but prevents independent distribution
- If the Standard/Pro licensing model (see [Appendix](#11-appendix-trinity-repository-strategy)) requires independent modules, this coupling must be addressed
- **Recommendation:** Document as intentional for now. Revisit when/if module-level licensing becomes a product requirement

### 10.2 Contracts Validation Strategy

The `packages/contracts` package uses a custom lightweight validation system instead of Zod:
- **Pro:** Zero runtime dependencies for frontend consumers
- **Con:** Non-standard, unfamiliar to new developers
- **Action:** Document the design decision in `packages/contracts/README.md`. Consider adding optional Zod schemas for backend-only validation if complexity grows

### 10.3 Test Utilities Package

`apps/server/src/__tests__/integration/test-utils.ts` is a 584-line file with 19 exports (mock factories, test server setup). If other apps (`apps/desktop`, future `apps/worker`) need similar test infrastructure:
- [ ] Extract to `@abe-stack/test-utils` (private package, `devDependencies` only)
- [ ] Include mock factories for db, cache, auth, storage
- **Recommendation:** Defer until a second app needs integration tests

### 10.4 SDK/UI Package Complexity

Both frontend packages have grown to ~15-20 submodules each:
- `packages/sdk`: api, billing, cache, notifications, oauth, offline, query, realtime, search, storage, undo, errors, hooks
- `packages/ui`: components, layouts, router, hooks, theme, types, utils, elements, providers

This isn't a violation, but monitor for:
- Component discoverability issues
- Feature creep across module boundaries
- Multiple teams needing to work on different UI areas

### 10.5 Search Provider Abstraction

If packages ever need to perform search queries directly (not via server handlers):
- [ ] Extract `SearchProvider` interface to `packages/contracts`
- [ ] Keep concrete implementations (SQL/Elasticsearch) in `apps/server`
- [ ] Provide search via dependency injection in handler context

### 10.6 Database Migration Strategy

Verify that Drizzle migrations are properly tracked:
- [ ] Are migrations versioned in `packages/db`?
- [ ] Can schema changes be applied independently of app deployment?
- [ ] Should there be a dedicated `migrations/` directory in `packages/db`?

---

## 11. Appendix: Trinity Repository Strategy

> This section preserves the original product architecture plan for the multi-repository distribution strategy.

### 11.1 The Three Repositories

| Repo | Visibility | Purpose |
|---|---|---|
| `abe-stack-marketing` | Public | Landing pages, SEO, conversion funnel (Vanilla Vite + TS) |
| `abe-stack-core` | Private | The actual product — ALL code (OSS + Standard + Pro + Max) |
| `abe-stack-lite` | Public | "Read-Only Mirror" of core minus Pro features |

### 11.2 How Tiers Enable Product Distribution

The 4-tier architecture directly enables the business model:

```
Standard License ($399):
  ├── Tier 1: core, contracts           ✅ Included
  ├── Tier 2: db, http, storage, jobs   ✅ Included
  ├── Tier 3: auth, users               ✅ Included
  └── Tier 3: billing, media, admin     ❌ Excluded

Pro License ($999):
  ├── Tier 1: core, contracts           ✅ Included
  ├── Tier 2: db, http, storage, jobs   ✅ Included
  └── Tier 3: ALL modules               ✅ Included
```

Because modules are physically separate packages, creating license tiers is as simple as including or excluding directories from the build.

### 11.3 Sync Strategy

- **Stripper Script** (`scripts/build-oss.js`): Copies core, removes Pro folders, scrubs `// @feature-start: PRO` blocks
- **GitHub Action** (`sync-oss.yml`): Runs stripper on push to `main`, force-pushes to `abe-stack-lite`
- **Contribution Policy:** "Shadow Workflow" — PRs to lite are ported manually to core

### 11.4 Demo Mode

The same core repo deployed with `IS_DEMO_MODE=true` serves as the product demo. Critical mutations (DELETE, password changes) return `403` in demo mode.

---

## Changelog

| Date | Change |
|---|---|
| Jan 2026 | Initial draft — Gemini architecture conversations + full codebase audit |
| Jan 2026 | Audit pass — Added P0 (orphaned tests), P6 (type unification), P7 (import cleanup), 7 audit findings, future considerations |

---
---

# ABE Stack - TODO

> **Scope:** Solo developer to small team (3-5 engineers), 50,000+ users, up to Series A.
> **Philosophy:** Ship products. The foundation is solid. Build features users pay for.
>
> **New guiding constraint:** Everything should support **(a)** developer velocity, **(b)** production readiness, **(c)** leanness/maintainability.
>
> **Distribution model:**
>
> - **Minimal Profile (default):** deployable core + auth + DB + basic UI + docs
> - **SaaS Profile (complete):** billing/subscriptions + quotas + customer portal ✅
> - **Admin Profile (complete):** command center, security viewer, job monitor ✅
> - **Advanced Profile (optional):** realtime/offline sync, push, search, desktop, heavy media

---

## High Priority: Eliminate Server Module Duplicates (Phase 4)

Five server modules have complete code duplicates in `packages/*`.
Now that `BaseContext` is defined and `AppContext` satisfies it (Phases 0-3),
the server adapter layer is unnecessary.

- [ ] Add `emailTemplates` to server `AppContext` / `IServiceContainer`
- [ ] Switch `modules/routes.ts` to import route maps from `@abe-stack/auth`, `@abe-stack/realtime`, `@abe-stack/notifications`
- [ ] Convert module barrel `index.ts` files to re-export from packages
- [ ] Delete ~40 duplicate source files (auth, users/service, realtime, notifications)
- [ ] Update ~37 test file imports to use `@abe-stack/*` packages
- [ ] Verify: `pnpm --filter @abe-stack/server type-check && test`

**Keep local:** admin (no package), billing (incompatible BillingRouteMap), system (server-specific), users handlers/routes (pagination adapter).

**Future:** Migrate test files to packages, align billing route map, switch to package router, rewire WebSocket.

---

## Medium Priority: User Settings (Remaining)

- [ ] 2FA setup UI (TOTP) + recovery codes
- [ ] Email change flow with verification

---

## Medium Priority: UI Package

### Code Quality (Frontend)

- [ ] Standardize arrow functions with forwardRef :contentReference[oaicite:11]{index=11}
- [ ] Consistent prop naming across components :contentReference[oaicite:12]{index=12}
- [ ] JSDoc comments on public APIs :contentReference[oaicite:13]{index=13}

---

## Medium Priority: Infrastructure


### Backend

- [ ] Production Postgres settings (connection pooling, SSL) :contentReference[oaicite:16]{index=16}
- [ ] Secrets management documentation :contentReference[oaicite:17]{index=17}
- [ ] Database backup/retention plan :contentReference[oaicite:18]{index=18}

### Testing

- [ ] Integration tests for API routes (vitest + fastify inject) :contentReference[oaicite:19]{index=19}
- [ ] Playwright E2E for auth flows :contentReference[oaicite:20]{index=20}
- [ ] Security audit: OWASP testing guide :contentReference[oaicite:21]{index=21}

### Documentation

- [x] Security decision documentation (why Argon2id params, grace periods, etc.) — see `docs/dev/security.md`
- [x] Quickstart guides per app (see `docs/quickstart/`)

- [ ] `docs/deploy/` folder (DO + GCP guides)
- [x] `docs/OPERATIONS.md` (migrations, backups, restore drills, incident basics)
- [ ] "Minimal Profile Quickstart" + "Full Profile Quickstart"
- [ ] "SaaS Profile Quickstart" + "Admin Profile Quickstart"

---

## Low Priority: Monitoring

- [ ] Prometheus metrics (login attempts, sessions, hash duration, lockouts) :contentReference[oaicite:26]{index=26}
- [ ] Query performance monitoring :contentReference[oaicite:27]{index=27}
- [ ] Batch user lookups optimization :contentReference[oaicite:28]{index=28}

- [ ] Minimal "Golden Signals" dashboard (latency, traffic, errors, saturation)
- [ ] Error budget alerting policy (simple thresholds)

---

## High Priority: Lean-Down / Strip Unnecessary Code (Without Losing Power)

**Goal:** keep your "everything stack", but ship as a **minimal default**.

### 1) Define the "Minimal Profile" explicitly

- [ ] Write `docs/profiles.md` defining:
  - **Minimal** includes: web + server + postgres, auth, core UI kit, basic logging, basic tests
  - **SaaS** includes: billing + subscriptions + portal + quotas
  - **Admin** includes: command center dashboards
  - **Advanced** includes: realtime/offline, push, search, cache desktop, heavy media
- [ ] Add `FEATURE_FLAGS.md` or `config/features.ts`:
  - `ENABLE_ADMIN`
  - `ENABLE_BILLING`
  - `ENABLE_REALTIME`
  - `ENABLE_OFFLINE_QUEUE`
  - `ENABLE_PUSH`
  - `ENABLE_SEARCH`
  - `ENABLE_CACHE`
  - `ENABLE_MEDIA_PIPELINE`
  - `ENABLE_DESKTOP`
  - `USE_RAW_SQL` - Toggle between drizzle-orm and raw SQL query builder for A/B testing
- [ ] Ensure disabling a feature removes runtime wiring (not just dead config)

---

## References

### WebSocket Enhancements (Backend + Frontend)

- [ ] Auth token refresh on reconnect (use `onConnect` callback) :contentReference[oaicite:39]{index=39}
- [ ] React Query cache invalidation on WebSocket events :contentReference[oaicite:40]{index=40}
- [ ] Presence tracking (online/offline/away, last seen) :contentReference[oaicite:41]{index=41}
- [ ] Typing indicators via WebSocket events :contentReference[oaicite:42]{index=42}

---

_Last Updated: 2026-01-31 (Merged product-architecture.md refactoring plan to top of TODO)_
