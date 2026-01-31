# ABE Stack: Code Refactoring & Restructuring Plan

> **Status:** Draft — Pending Review
> **Last updated:** January 2026
> **Derived from:** Gemini architecture conversations + codebase audit

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architectural Principles (from Gemini Conversations)](#2-architectural-principles)
3. [Current State Assessment](#3-current-state-assessment)
4. [File-by-File Classification](#4-file-by-file-classification)
5. [Migration Plan — Phased Approach](#5-migration-plan)
6. [Package Enhancement Details](#6-package-enhancement-details)
7. [Risk Assessment & Mitigations](#7-risk-assessment--mitigations)
8. [Success Criteria](#8-success-criteria)
9. [Appendix: Trinity Repository Strategy](#9-appendix-trinity-repository-strategy)

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

**Estimated scope:** 5 phases, ~20 files to migrate, ~46 files remaining in server after completion.

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

## 4. File-by-File Classification

### 4.1 Entry Points & Core — KEEP (5 files)

```
apps/server/src/
├── main.ts              → KEEP (entry point, lifecycle management)
├── app.ts               → KEEP (composition root, DI container)
├── server.ts            → KEEP (Fastify factory, plugin registration)
├── shared/types.ts      → KEEP (AppContext, IServiceContainer)
└── shared/index.ts      → KEEP (barrel export)
```

### 4.2 Config Layer — KEEP (18 files)

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

### 4.3 Modules — KEEP (5 files)

```
modules/
├── routes.ts            → KEEP (imports @abe-stack/* and registers routes)
├── index.ts             → KEEP (barrel export)
└── system/
    ├── routes.ts        → KEEP (health, status, module listing — deployment-specific)
    ├── handlers.ts      → KEEP (integrates all health checks)
    └── index.ts         → KEEP (barrel export)
```

### 4.4 HTTP Middleware — MIGRATE to `@abe-stack/http` (9 files)

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

### 4.5 HTTP Pagination — MIGRATE to `@abe-stack/http` (4 files)

```
infrastructure/http/pagination/
├── helpers.ts           → MIGRATE (cursor-based pagination utilities)
├── middleware.ts         → MIGRATE (pagination middleware)
├── types.ts             → MIGRATE (pagination types)
└── index.ts             → MIGRATE (barrel export)
```

### 4.6 HTTP Router — PARTIAL MIGRATE (3 files)

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

### 4.7 HTTP Plugins & Index — KEEP (2 files)

```
infrastructure/http/plugins.ts  → KEEP (app-specific middleware orchestration)
infrastructure/http/index.ts    → KEEP (will re-export from package + local)
```

### 4.8 Monitor — KEEP (6 files)

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

### 4.9 Messaging — KEEP (2 files)

```
infrastructure/messaging/websocket/
├── websocket.ts         → KEEP (CSRF + auth + subscription management)
└── index.ts             → KEEP
```

### 4.10 Search — KEEP (6 files)

```
infrastructure/search/
├── search-factory.ts    → KEEP (provider selection logic)
├── elasticsearch-provider.ts → KEEP
├── sql-provider.ts      → KEEP
├── types.ts             → KEEP
└── index.ts             → KEEP
```

### 4.11 Notifications — KEEP (4 files)

```
infrastructure/notifications/
├── notification-factory.ts → KEEP (FCM provider factory)
├── fcm-provider.ts      → KEEP
├── types.ts             → KEEP
└── index.ts             → KEEP
```

### 4.12 Services — MIGRATE (1 file)

```
services/
├── cache-service.ts     → MIGRATE to @abe-stack/cache (generic in-memory LRU)
└── index.ts             → KEEP (will re-export from package)
```

### 4.13 Utils — MIGRATE (1 file)

```
utils/
├── request-utils.ts     → MIGRATE to @abe-stack/http/utils (getPathParam, etc.)
└── index.ts             → KEEP (will re-export from package)
```

### 4.14 Types — KEEP (2 files)

```
types/
├── fastify.d.ts         → KEEP (Fastify augmentations, app-specific)
└── media-deps.d.ts      → KEEP (third-party stubs)
```

### 4.15 Scripts — KEEP (3 files)

```
scripts/
├── seed.ts              → KEEP (deployment-specific)
├── bootstrap-admin.ts   → KEEP (deployment-specific)
└── db-push.ts           → KEEP (deployment-specific)
```

---

## 5. Migration Plan

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

### Phase Summary

| Phase | Target Package | Files Moved | Lines | Risk | Dependencies |
|---|---|---|---|---|---|
| P1 | `@abe-stack/cache` | 1 | ~130 | Low | None |
| P2 | `@abe-stack/http` | 9 | ~800 | Medium | None |
| P3 | `@abe-stack/http` | 4 | ~200 | Low | P2 (same package) |
| P4 | `@abe-stack/http` | 2 (partial) | ~100 | Med-High | P2, P3 |
| P5 | `@abe-stack/http` | 1 | ~90 | Low | P2 |
| **Total** | | **~17** | **~1,320** | | |

**Post-migration server file count:** ~46 files (down from ~76)

---

## 6. Package Enhancement Details

### 6.1 `@abe-stack/http` — After Migration

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

### 6.2 `@abe-stack/cache` — After Migration

```
packages/cache/src/
├── providers/
│   ├── lru-cache.ts        (existing LRU implementation)
│   └── memory-cache.ts     ← NEW or MERGED (from server's cache-service.ts)
├── types.ts
└── index.ts
```

### 6.3 `apps/server` — After Migration

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

## 7. Risk Assessment & Mitigations

### 7.1 Breaking Package Consumers

**Risk:** Moving router types could break `@abe-stack/auth`, `@abe-stack/users`, etc.

**Mitigation:**
- Phase 4 (router) is intentionally last — it's the highest risk
- Use TypeScript generic type parameters so existing types remain compatible
- Consider a transition period with type aliases in the old location
- Run full type-check after every change: `pnpm type-check`

### 7.2 Middleware Runtime Behavior

**Risk:** Middleware import order or initialization could change subtly when moved to a package.

**Mitigation:**
- `plugins.ts` (which orchestrates middleware order) stays in the server
- Only the middleware _implementations_ move — the _composition_ stays
- Write integration tests for the middleware registration pipeline before migrating

### 7.3 Circular Dependencies

**Risk:** Moving code between packages could introduce circular dependencies.

**Mitigation:**
- All migrations flow downward (server → packages)
- No package-to-package moves in this plan
- Run `pnpm build` after each phase to catch circular imports

### 7.4 Test Coverage Gaps

**Risk:** Server middleware may not have dedicated tests; moving them to packages requires new tests.

**Mitigation:**
- Before each phase, audit test coverage for the files being moved
- Write package-level unit tests for each migrated module
- Run full test suite after each phase: `pnpm test`

---

## 8. Success Criteria

### 8.1 Quantitative

| Metric | Current | Target | Validation |
|---|---|---|---|
| Server source files | ~76 | ≤50 | `find apps/server/src -name '*.ts' ! -name '*.test.*' \| wc -l` |
| Import violations | 0 | 0 | `pnpm build` passes |
| Business logic in server | Minimal | Zero | Manual audit |
| `@abe-stack/http` exports | ~15 | ~35 | Package API surface |
| Test suite | Passing | Passing | `pnpm test` green |
| Type check | Passing | Passing | `pnpm type-check` green |

### 8.2 Qualitative

- [ ] Every file in `apps/server/src/` passes the "Could I use this in a CLI script?" test with "No" (it's server-specific) or is config/wiring
- [ ] `@abe-stack/http` is a self-contained, reusable HTTP framework package
- [ ] A new app (e.g., `apps/admin-api`) could be built using only `packages/*` imports with minimal boilerplate
- [ ] The architecture matches the "Motherboard & Components" mental model

### 8.3 Validation Checklist (Run After Each Phase)

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
```

---

## 9. Appendix: Trinity Repository Strategy

> This section preserves the original product architecture plan for the multi-repository distribution strategy.

### 9.1 The Three Repositories

| Repo | Visibility | Purpose |
|---|---|---|
| `abe-stack-marketing` | Public | Landing pages, SEO, conversion funnel (Vanilla Vite + TS) |
| `abe-stack-core` | Private | The actual product — ALL code (OSS + Standard + Pro + Max) |
| `abe-stack-lite` | Public | "Read-Only Mirror" of core minus Pro features |

### 9.2 How Tiers Enable Product Distribution

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

### 9.3 Sync Strategy

- **Stripper Script** (`scripts/build-oss.js`): Copies core, removes Pro folders, scrubs `// @feature-start: PRO` blocks
- **GitHub Action** (`sync-oss.yml`): Runs stripper on push to `main`, force-pushes to `abe-stack-lite`
- **Contribution Policy:** "Shadow Workflow" — PRs to lite are ported manually to core

### 9.4 Demo Mode

The same core repo deployed with `IS_DEMO_MODE=true` serves as the product demo. Critical mutations (DELETE, password changes) return `403` in demo mode.

---

## Changelog

| Date | Change |
|---|---|
| Jan 2026 | Initial draft — Gemini architecture conversations + full codebase audit |
