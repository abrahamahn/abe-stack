## Refactoring TODO

### 1. ~~Audit TODO.md against completed refactoring work~~ ✅ DONE

Completed 2026-01-31. Audit found P0–P7 were already complete. Remaining work identified: re-export cleanup, capability interfaces, type unification.

### 2. ~~Identify and remove re-exports from `apps/` folder~~ ✅ DONE

Completed 2026-01-31. Removed all re-exports from:

- `config/index.ts` — stripped to local factory export only
- `logger/logger.ts` — removed 5 re-exported core functions
- `logger/types.ts` — deleted (consumers import directly from `@abe-stack/core/infrastructure/logger`)
- `logger/index.ts` — stripped to local Fastify-specific exports only
- Zero re-exports from external packages remain in `apps/server/src/`.

### 3. ~~Update all imports from re-exports with direct package imports~~ ✅ DONE

Completed 2026-01-31. Updated:

- `app.ts` — `AppConfig` from `@abe-stack/core`, `buildConnectionString` from `@abe-stack/db`, billing from `@abe-stack/billing`
- `server.ts` — `AppConfig` from `@abe-stack/core/config`
- `server.test.ts` — `AppConfig` from `@abe-stack/core/config`
- `test-utils.ts` — `AppConfig` from `@abe-stack/core/config`
- `logger/*.ts` — types from `@abe-stack/core/infrastructure/logger`

---

Here is the definitive **Architecture Manifesto** for your project. This summarizes every decision, pattern, and structural choice we have made to build a "Series A Ready" SaaS Engine.

### 1. The Core Philosophy

You are not building a simple boilerplate; you are building a **Modular Monolith (SaaS Engine)**.

- **Goal:** To sell a "Product Line" (Standard vs. Pro tiers).
- **Strategy:** Strict physical separation between "Technical Plumbing" and "Business Features."
- **Mental Model:**
- **Apps** are the Car (The finished product).
- **Modules** are the Engine (The valuable parts).
- **Infra** is the Chassis (The rigid base).

---

### 2. The Final Directory Structure

This is the "God Tree." It is flat, explicit, and separates concerns by domain.

```text
root/
├── .github/             # CI/CD Workflows
├── apps/                # DEPLOYABLES (The Composition Layer)
│   ├── server/          # API (Fastify) - The "Motherboard"
│   ├── web/             # Dashboard (Next.js)
│   ├── cli/             # Admin Tools - Proves logic is decoupled
│   ├── apps/docs/       # Documentation (Product Manual)
│   └── storybook/       # UI Workbench (Component isolation)
│
├── modules/             # BUSINESS DOMAINS (The Product)
│   ├── auth/            # Users, Sessions
│   ├── billing/         # Stripe, Invoices (Can be removed for Standard Tier)
│   └── media/           # Video Processing
│
├── infra/               # BACKEND PLATFORM (The Plumbing)
│   ├── db/              # Drizzle, Migrations, RLS
│   ├── http/            # Fastify Wrapper, Error Handling
│   ├── jobs/            # Queue Adapters (BullMQ)
│   ├── testing/         # Factories, Mocks
│   └── telemetry/       # OpenTelemetry, Logger
│
├── shared/              # UNIVERSAL KERNEL (Frontend Safe)
│   ├── core/            # Config, AppError, Constants
│   ├── contracts/       # Zod Schemas, API Types
│   ├── ui/              # React Design System
│   └── client/          # API Client (React Query)
│
├── ops/                 # CLOUD INFRASTRUCTURE
│   ├── docker/
│   └── terraform/
│
├── tools/               # DEVELOPER EXPERIENCE
│   └── generators/      # Scaffolding scripts
│
├── package.json
└── pnpm-workspace.yaml

```

---

### 3. The Rules of Engagement

#### The 4-Tier Architecture

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

Dependencies flow **DOWN** only. A Tier 3 package can import from Tier 2, but Tier 2 can **never** import from Tier 3.

#### The Golden Rule of Imports

```
apps/server  CAN import  infra/*, modules/*, shared/*, sdk/
infra/*      can NEVER import  apps/server
infra/A      CAN import  infra/B  (if B is lower tier)
```

**Violation test:** If you find yourself in `modules/auth` trying to import a type from `apps/server/src/types.ts`, move that type to `infra/contracts` immediately.

#### The "Motherboard & Components" Model

> **The Server is the "Motherboard." The Packages are the "Components."**

| Aspect           | `infra/*`, `modules/*`, `shared/*`, `sdk/` (Components) | `apps/server` (Motherboard)     |
| ---------------- | ------------------------------------------------------- | ------------------------------- |
| **Role**         | Defines **HOW** things work                             | Defines **WHAT** is running     |
| **Mental Model** | Engine, Transmission, Wheels                            | Mechanic who assembles the car  |
| **Logic**        | 100% of all business rules                              | 0% — only wiring                |
| **State**        | Stateless (classes/functions)                           | Stateful (instances/env vars)   |
| **Database**     | Definitions (schema/repo)                               | Connection (pool instance)      |
| **Config**       | Validation schemas (Zod)                                | Actual values (`process.env`)   |
| **Knowledge**    | Knows nothing about the App                             | Knows everything about Packages |

#### The Responsibility Boundary

**`infra/*`, `modules/*`, `shared/*`, `sdk/` — The Capabilities:**

- Business Logic: "How do we calculate a refund?" → `modules/billing`
- Data Access: "How do we query the users table?" → `infra/db`
- Route Handlers: "What happens when `POST /login` is called?" → `modules/auth`
- Internal Config: "I need a `STRIPE_KEY` to work."

**`apps/server` — The Composition:**

- Wiring: `app.register(authPlugin)`
- Configuration: "Here is the `STRIPE_KEY` from `process.env`."
- Lifecycle: "Start the server on port 3000."
- Dependency Injection: "Here is the Database instance you asked for."

#### The Three Litmus Tests

For every file you touch, ask:

1. **"Could I use this in a CLI script?"** — Can I import this without starting the Fastify server? Yes → Package. No → Package's HTTP Adapter.
2. **"Is this specific to THIS deployment?"** — Is this reusable for a different company using ABE Stack? Yes → Package. No → Keep in `apps/server`.
3. **"Does it define a Zod Schema?"** — Frontend needs it too → `infra/contracts`. Internal DB only → `infra/db`. It should **never** stay in `apps/server`.

#### The Route Definition Rule

> **Routes belong in the Package, not the App.**

`POST /login` is a fundamental feature of the Auth "Product." The Package exports a Fastify Plugin / Route Map (`registerAuthRoutes`). The Server simply calls `app.register(registerAuthRoutes)`.

#### The "Tri-State" Separation

- **`shared/`**: Code that runs everywhere (Browser + Server). **Never import `fs` or `db` here.**
- **`infra/`**: Code that runs on the Server (Node.js). Generic tech adapters.
- **`modules/`**: Code that represents Business Value.

#### The "Sheriff" (Enforcement)

We use `eslint-plugin-boundaries` to physically prevent:

- Frontend importing Backend code.
- `infra/db` importing `modules/auth` (Circular dependency).

---

### 4. Key Architectural Patterns

#### A. The "Tenant Firewall" (Multi-Tenancy)

- **Where:** `infra/db`
- **How:** We do not export a raw DB client. We export a factory `getDb(tenantId)` that automatically applies `WHERE tenant_id = X` to every query via Row Level Security (RLS) or Drizzle middleware.
- **Why:** Prevents data leaks at the foundation level.

#### B. The "Error Highway" (End-to-End Safety)

- **Shared:** Define `AppError` in `shared/core`.
- **Infra:** `infra/http` catches these errors and formats the API response.
- **Frontend:** `shared/sdk` catches the API response and re-throws typed errors for the UI.

#### C. The "Event Bus" (Decoupling)

- **Where:** `infra/events`
- **How:** `modules/auth` emits `user.created`. `modules/billing` listens to it.
- **Why:** Allows you to delete the Billing module without breaking the Auth module.

#### D. The "Fractal" Module Standard

Every module inside `modules/` follows the exact same internal structure:

- `domain/` (Pure logic)
- `infra/` (Adapters)
- `http/` (Routes)
- `jobs/` (Workers)

#### E. The "Context Composition" Pattern

Packages declare narrow capability interfaces instead of monolithic context types:

```typescript
// infra/contracts/src/context.ts — Capability interfaces
interface HasEmail { email: EmailService; templates: EmailTemplates; }
interface HasBilling { billing: BillingService; }
interface HasStorage { storage: StorageService; }
interface HasCookies { cookies: CookieManager; }

// modules/auth/src/types.ts — Compose what you need
type AuthContext = BaseContext & HasEmail & HasCookies & HasAuthConfig;

// apps/server/src/shared/types.ts — Implements all capabilities
type AppContext = BaseContext & HasEmail & HasBilling & HasStorage & HasCookies & ...;
```

- **Why:** Eliminates the 6+ independent `AppContext` variants across packages.
- **Benefit:** If a handler needs both auth and billing, the type is `BaseContext & HasEmail & HasBilling`.

---

### 5. The "SaaS Engine" Business Logic

#### Why `infra/` instead of `infra/`, `modules/`, `shared/`, `sdk/`?

- **`infra/`, `modules/`, `shared/`, `sdk/`** implies generic npm libraries.
- **`infra/`** correctly identifies it as Server-Side Infrastructure (Database, Queues, Storage).

#### Why `modules/` instead of `services/`?

- **`services/`** implies Microservices (Deployables).
- **`modules/`** implies Plug-and-Play Business Logic libraries. This aligns with your "Standard vs. Pro" sales strategy.

---

### 6. Current State & What Remains

**Already done:**

- Business modules (auth, billing, users, admin) fully migrated to packages.
- Route wiring rewritten with no re-exports. ~25,000 lines removed. 0 import violations.

**Completed (2026-01-31):**

| Category                                                     | Status                                                                            |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Generic HTTP middleware/pagination/utils → `@abe-stack/http` | ✅ Done                                                                           |
| Cache service → `@abe-stack/cache`                           | ✅ Done                                                                           |
| Orphaned test files (34 files)                               | ✅ Done (directory removed)                                                       |
| Router types → `@abe-stack/http`                             | ✅ Done                                                                           |
| Request utils → `@abe-stack/http`                            | ✅ Done                                                                           |
| Server module duplicates eliminated                          | ✅ Done                                                                           |
| Re-exports removed from apps/server                          | ✅ Done                                                                           |
| Capability interfaces added to contracts                     | ✅ Done (HasEmail, HasStorage, HasBilling, HasNotifications, HasPubSub, HasCache) |
| Type unification (RequestInfo, ReplyWithCookies)             | ✅ Done (server uses contracts types)                                             |

**Remaining (non-migration work):**

| Category                                     | Scope                                                |
| -------------------------------------------- | ---------------------------------------------------- |
| Update packages to use capability interfaces | Low priority — compose `BaseContext & HasEmail` etc. |
| Feature profiles documentation               | Medium priority — profiles.md + feature flags        |

| Metric                   | Before | Final    |
| ------------------------ | ------ | -------- |
| Server source files      | ~116   | ~30      |
| Lines removed            | —      | ~26,000+ |
| Import violations        | 0      | 0        |
| Business logic in server | Some   | Zero     |
| Re-exports from packages | 50+    | 0        |

---

### 7. Known Gaps (Audit Findings)

#### 7.1 ~~Orphaned Tests~~ ✅ RESOLVED

34 test files left behind in `apps/server/src/modules/` after module migrations (28 auth, 3 notifications, 3 realtime). Source files are gone; tests reference dead paths. Additionally, `__tests__/integration/test-utils.ts` (584 LOC, 19 exports) may reference migrated code.

- [x] Inventory orphaned tests: `modules/auth/` (28), `modules/notifications/` (3), `modules/realtime/` (3)
- [x] For each: check if equivalent tests exist in the target `@abe-stack/*` package
- [x] Delete duplicates, migrate unique coverage, update integration imports
- [x] Audit `test-utils.ts` — remove functions referencing deleted modules

#### 7.2 ~~Type System Duplication~~ ✅ RESOLVED

Each Tier 3 package independently redefines `AppContext` (auth, admin, billing, users, server). No composition pattern exists. `RequestWithCookies` / `ReplyWithCookies` duplicated in multiple packages.

- [x] Define narrow capability interfaces in `infra/contracts` (`HasEmail`, `HasBilling`, `HasStorage`, `HasCookies`)
- [x] Update each package to compose: `type AuthContext = BaseContext & HasEmail & HasCookies`
- [x] Unify `RequestWithCookies` / `ReplyWithCookies` into `infra/contracts`
- [x] Server's `AppContext` implements all capability interfaces

#### 7.3 ~~Router Type Divergence~~ ✅ RESOLVED

Server's router uses concrete `AppContext`; package's router uses generic `BaseContext` with dependency injection. Server hardcodes `createAuthGuard` import; package accepts `authGuardFactory` as a parameter. 18 package files use the generic types.

- [x] Align server to use the package's generic router (architecturally correct)
- [x] Keep `AppContext`-bound handler types in server as thin wrappers

#### 7.4 ~~Barrel Export Coupling~~ ✅ RESOLVED

`infrastructure/index.ts` re-exports local implementations instead of `@abe-stack/http`. `modules/routes.ts` imports `registerRouteMap` from `@/infrastructure/http/router` (local) instead of `@abe-stack/http`.

- [x] After migrations, update all server imports to use `@abe-stack/http` as canonical source
- [x] `infrastructure/index.ts` should only export server-specific adapters

#### 7.5 ~~Tier 3 Cross-Dependencies~~ ✅ RESOLVED

```
auth, billing, realtime, notifications, media  → No Tier 3 deps (base modules)
users                                          → depends on auth (mid-layer)
admin                                          → depends on auth + billing (orchestration)
```

- [x] Coupling is intentional (bundled product tiers): documented in `apps/docs/profiles.md`
- [x] Admin depends on auth+billing for subscription management — gracefully degrades when billing disabled

#### 7.6 ~~Cache Service API Incompatibility~~ ✅ RESOLVED

Server's `CacheService` (simple TTL) and package's `LRUCache` (memoization, tags, stampede prevention) have different APIs.

- [x] Map server's simple API to package's richer API
- [x] Update `IServiceContainer.cache` type to reference package type
- [x] Update `app.ts` to construct `LRUCache` instead of `CacheService`

#### 7.7 Search Provider Encapsulation — LOW

`ServerSearchProvider` in server infrastructure. No packages import search types directly. No immediate change needed.

- [ ] If search is ever used in packages: extract `SearchProvider` interface to `infra/contracts`, keep implementations in server

---

### 8. Migration Plan (Phased TODOs)

Build order: P0 → P1 → P2 → P3 → P5 → P4 → P6 → P7.

#### P0: ✅ Clean Up Orphaned Tests `LOW RISK`

- [x] Delete/relocate 34 orphaned test files (auth 28, notifications 3, realtime 3)
- [x] Audit `test-utils.ts` — remove references to deleted modules
- [x] Verify: `pnpm test`

#### P1: ✅ Cache Service → `@abe-stack/cache` `LOW RISK`

- [x] Compare `services/cache-service.ts` with `infra/cache` LRU implementation
- [x] Merge or replace — delete server's version
- [x] Update `app.ts` import and `shared/types.ts` type reference
- [x] Verify: `pnpm test --filter=@abe-stack/cache && pnpm test --filter=server`

#### P2: ✅ HTTP Middleware → `@abe-stack/http` `MEDIUM RISK`

Move 9 files (~800 LOC) from `infrastructure/http/middleware/`: security, validation, cookie, csrf, correlationId, requestInfo, proxyValidation, static, index.

- [x] Audit each file for hidden `AppContext` or server-specific imports
- [x] Move to `infra/http/src/middleware/`
- [x] Update `infra/http/src/index.ts` exports
- [x] Update `infrastructure/http/plugins.ts` to import from `@abe-stack/http`
- [x] Delete server's `infrastructure/http/middleware/` directory
- [x] Verify: `pnpm test --filter=@abe-stack/http && pnpm test --filter=server`

#### P3: ✅ Pagination → `@abe-stack/http` `LOW RISK` (depends on P2)

Move 4 files (~200 LOC): helpers, middleware, types, index.

- [x] Move to `infra/http/src/pagination/`
- [x] Update exports and server imports
- [x] Delete `infrastructure/http/pagination/`
- [x] Verify tests

#### P4: ✅ Router Types → `@abe-stack/http` `MEDIUM-HIGH RISK` (depends on P2, P3)

Split generic router logic from `AppContext`-bound handler types.

- [x] Move generic types (`ValidationSchema`, `RouteResult`, `HttpMethod`, `RouteMap`, `RouterOptions`) to `infra/http/src/router/types.ts`
- [x] Move generic helpers (`publicRoute`, `protectedRoute`, `createRouteMap`, `registerRouteMap`) to `infra/http/src/router/router.ts`
- [x] Keep `AppContext`-bound handler types in server as thin wrappers
- [x] Verify all 6+ package consumers still compile: `pnpm type-check && pnpm test`

#### P5: ✅ Request Utils → `@abe-stack/http` `LOW RISK` (depends on P2)

- [x] Move `utils/request-utils.ts` (~90 LOC) to `infra/http/src/utils/`
- [x] Update exports and server imports
- [x] Verify tests

#### P6: ✅ Unify Type System `MEDIUM RISK` (depends on P4)

Establish Context Composition pattern (see Pattern E above).

- [x] Define capability interfaces in `infra/contracts/src/context.ts`
- [x] Update each package to compose context from capabilities
- [x] Unify `RequestWithCookies` / `ReplyWithCookies` into `infra/contracts`
- [x] Update server's `AppContext` to implement all capabilities
- [x] Migrate one package at a time; run `pnpm type-check` after each

#### P7: ✅ Server Import Cleanup `LOW RISK` (depends on P2–P5)

- [x] Update `modules/routes.ts` → import from `@abe-stack/http`
- [x] Update `infrastructure/http/plugins.ts` → import from `@abe-stack/http`
- [x] Slim `infrastructure/index.ts` to server-specific adapters only (monitor, search, notifications, messaging)
- [x] Remove empty directories
- [x] Verify: `pnpm build && pnpm type-check && pnpm test`

#### Phase Summary

| Phase | What                    | Files                 | Risk     | Depends On |
| ----- | ----------------------- | --------------------- | -------- | ---------- |
| P0    | Orphaned test cleanup   | ~34 deleted           | Low      | —          |
| P1    | Cache → package         | 1 migrated            | Low      | —          |
| P2    | Middleware → package    | 9 migrated (~800 LOC) | Medium   | —          |
| P3    | Pagination → package    | 4 migrated (~200 LOC) | Low      | P2         |
| P4    | Router types → package  | 2 partial (~100 LOC)  | Med-High | P2, P3     |
| P5    | Request utils → package | 1 migrated (~90 LOC)  | Low      | P2         |
| P6    | Type unification        | ~25 updated           | Medium   | P4         |
| P7    | Import cleanup          | ~10 updated           | Low      | P2–P5      |

---

### 9. Target State (Post-Migration)

#### `@abe-stack/http` — Enhanced

```text
infra/http/src/
├── middleware/              ← FROM server
│   ├── security.ts         (CORS, CSP, HSTS)
│   ├── validation.ts       (injection, XSS prevention)
│   ├── cookie.ts           (cookie parsing & signing)
│   ├── csrf.ts             (CSRF tokens)
│   ├── correlationId.ts    (request correlation ID)
│   ├── requestInfo.ts      (IP, user agent extraction)
│   ├── proxyValidation.ts  (CIDR matching, proxy chain)
│   ├── static.ts           (static file serving)
│   └── index.ts
├── pagination/             ← FROM server
│   ├── helpers.ts          (cursor-based pagination)
│   ├── middleware.ts
│   ├── types.ts
│   └── index.ts
├── router/                 ← ENHANCED (generic parts from server)
│   ├── router.ts           (publicRoute, protectedRoute, createRouteMap, registerRouteMap)
│   ├── types.ts            (ValidationSchema, RouteResult, RouteMap)
│   └── index.ts
├── utils/                  ← FROM server
│   ├── request-utils.ts    (getPathParam, getQueryParam)
│   └── index.ts
└── index.ts
```

#### `apps/server` — Slimmed (~46 files)

```text
apps/server/src/
├── main.ts                        (entry point)
├── app.ts                         (composition root)
├── server.ts                      (Fastify factory)
├── config/                        (18 files — env loading)
├── infrastructure/                (~18 files — app-specific adapters only)
│   ├── http/
│   │   ├── plugins.ts             (orchestration — imports from @abe-stack/http)
│   │   ├── router/                (AppContext-bound handler types only)
│   │   └── index.ts
│   ├── monitor/                   (6 files — health checks, logging)
│   ├── messaging/                 (2 files — WebSocket adapter)
│   ├── search/                    (6 files — SQL/ES providers)
│   └── notifications/             (4 files — FCM factory)
├── modules/                       (5 files — route wiring + system module)
├── shared/                        (2 files — AppContext, IServiceContainer)
├── services/                      (1 file — barrel, re-exports from package)
├── types/                         (2 files — Fastify augmentations)
└── utils/                         (1 file — barrel, re-exports from package)
```

---

### 10. Risk Mitigations

- **Breaking package consumers (P4):** Use generic type parameters so existing types remain compatible. Consider type aliases during transition.
- **Middleware runtime behavior (P2):** Only _implementations_ move; `plugins.ts` (composition/ordering) stays in server.
- **Circular dependencies:** All migrations flow downward (server → packages). No package-to-package moves.
- **Test coverage gaps:** Audit coverage before each phase. Write package-level unit tests for migrated modules.
- **Type unification (P6):** TypeScript structural typing keeps existing code working. Introduce capability interfaces additively.
- **Orphaned test cleanup (P0):** Compare with package tests before deleting. Migrate unique coverage.

---

### 11. Success Criteria

| Metric                    | Current                                | Target                  |
| ------------------------- | -------------------------------------- | ----------------------- |
| Server source files       | ~76 → ~30                              | ≤50 ✅                  |
| Orphaned test files       | 34 → 0                                 | 0 ✅                    |
| Import violations         | 0                                      | 0                       |
| `@abe-stack/http` exports | ~15 → ~35                              | ~35 ✅                  |
| AppContext variants       | 6+ independent → 1 base + capabilities | 1 base + composition ✅ |
| Business logic in server  | Minimal → Zero                         | Zero ✅                 |

**Qualitative:**

- [x] Every file in `apps/server/src/` is either config, wiring, or deployment-specific
- [x] `@abe-stack/http` is a self-contained, reusable HTTP framework package
- [x] A new app could be built using only `infra/*`, `modules/*`, `shared/*`, `sdk/` imports
- [x] Context types follow the composition pattern

**Validation (run after each phase):**

```bash
pnpm build            # No circular deps, no missing exports
pnpm type-check       # No broken imports
pnpm test             # No regressions
pnpm lint             # Import order, unused imports
# Packages never import apps:
grep -r "from.*apps/server" infra/ modules/ shared/ sdk/ --include="*.ts" | grep -v node_modules
```

---

### 12. Future Considerations

- **Module independence:** `admin` depends on `auth + billing`, `users` depends on `auth`. Fine for monorepo; revisit if module-level licensing is needed.
- **Contracts validation:** Custom lightweight validation (zero deps for frontend). Document decision; consider optional Zod for backend if complexity grows.
- **Test utilities package:** `test-utils.ts` (584 LOC). Extract to `@abe-stack/test-utils` when a second app needs integration tests.
- **SDK/UI growth:** Both at ~15-20 submodules. Monitor for discoverability issues.
- **Search abstraction:** Extract `SearchProvider` interface to `infra/contracts` if packages ever need direct search.
- **DB migrations:** Verify Drizzle migrations are versioned in `infra/db` and can be applied independently.

---

### 13. Appendix: Trinity Repository Strategy

#### The Three Repositories

| Repo                  | Visibility | Purpose                                                    |
| --------------------- | ---------- | ---------------------------------------------------------- |
| `abe-stack-marketing` | Public     | Landing pages, SEO, conversion funnel (Vanilla Vite + TS)  |
| `abe-stack-core`      | Private    | The actual product — ALL code (OSS + Standard + Pro + Max) |
| `abe-stack-lite`      | Public     | "Read-Only Mirror" of core minus Pro features              |

#### How Tiers Enable Distribution

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

Because modules are physically separate packages, creating license tiers is as simple as including or excluding directories.

#### Sync Strategy

- **Stripper Script** (`scripts/build-oss.js`): Copies core, removes Pro folders, scrubs `// @feature-start: PRO` blocks.
- **GitHub Action** (`sync-oss.yml`): Runs stripper on push to `main`, force-pushes to `abe-stack-lite`.
- **Demo Mode:** Same repo deployed with `IS_DEMO_MODE=true`. Critical mutations return `403`.

---

### 14. The Execution Plan (Build Order)

You must build from the bottom up:

1. **The Kernel (`shared/core`):** Define Config, Errors, and Logger interfaces.
2. **The Plumbing (`infra/http`):** Build the Server Factory and Error Handlers.
3. **The Proof (`apps/server`):** Wire up a "Hello World" to verify the stack.
4. **The Data (`infra/db`):** Set up Drizzle and the connection.
5. **The Feature (`modules/auth`):** Build your first real business logic.

**Final Verdict:** You are building a high-performance Ferrari. You have designed the chassis (`infra`), the engine (`modules`), and the body (`apps`). Now, go assemble the parts.

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

## ~~High Priority: Eliminate Server Module Duplicates (Phase 4)~~ ✅ DONE

Five server modules have complete code duplicates in `infra/*`, `modules/*`, `shared/*`, `sdk/`.
Now that `BaseContext` is defined and `AppContext` satisfies it (Phases 0-3),
the server adapter layer is unnecessary.

- [x] Add `emailTemplates` to server `AppContext` / `IServiceContainer`
- [x] Switch `modules/routes.ts` to import route maps from `@abe-stack/auth`, `@abe-stack/realtime`, `@abe-stack/notifications`
- [x] Convert module barrel `index.ts` files to re-export from packages
- [x] Delete ~40 duplicate source files (auth, users/service, realtime, notifications)
- [x] Update ~37 test file imports to use `@abe-stack/*` packages
- [x] Verify: `pnpm --filter @abe-stack/server type-check && test`

**Keep local:** admin (no package), billing (incompatible BillingRouteMap), system (server-specific), users handlers/routes (pagination adapter).

**Future:** Migrate test files to packages, align billing route map, switch to package router, rewire WebSocket.

---

## Medium Priority: User Settings (Remaining)

- [ ] 2FA setup UI (TOTP) + recovery codes
- [ ] Email change flow with verification

---

## Medium Priority: UI Package

### Code Quality (Frontend)

- [ ] Standardize arrow functions with forwardRef
- [ ] Consistent prop naming across components
- [ ] JSDoc comments on public APIs

---

## Medium Priority: Infrastructure

### Backend

- [x] Production Postgres settings (connection pooling, SSL) — see `apps/docs/deploy/production-postgres.md`
- [x] Secrets management documentation — see `apps/docs/deploy/secrets-checklist.md`
- [x] Database backup/retention plan — see `apps/docs/OPERATIONS.md` (Section 2: Backups)

### Testing

- [ ] Integration tests for API routes (vitest + fastify inject)
- [ ] Playwright E2E for auth flows
- [ ] Security audit: OWASP testing guide

### Documentation

- [x] Security decision documentation (why Argon2id params, grace periods, etc.) — see `apps/docs/dev/security.md`
- [x] Quickstart guides per app (see `apps/docs/quickstart/`)

- [x] `apps/docs/deploy/` folder (DO + GCP guides) — paths fixed to match actual `infra/` structure
- [x] `apps/docs/OPERATIONS.md` (migrations, backups, restore drills, incident basics)
- [x] "Minimal Profile Quickstart" + "Full Profile Quickstart" — see `apps/docs/quickstart/profiles.md`
- [x] "SaaS Profile Quickstart" + "Admin Profile Quickstart" — see `apps/docs/quickstart/profiles.md`

---

## Low Priority: Monitoring

- [ ] Prometheus metrics (login attempts, sessions, hash duration, lockouts)
- [ ] Query performance monitoring
- [ ] Batch user lookups optimization

- [ ] Minimal "Golden Signals" dashboard (latency, traffic, errors, saturation)
- [ ] Error budget alerting policy (simple thresholds)

---

## ~~High Priority: Lean-Down / Strip Unnecessary Code~~ ✅ DONE

**Goal:** keep your "everything stack", but ship as a **minimal default**.

### 1) ~~Define the "Minimal Profile" explicitly~~ ✅ DONE

- [x] Write `apps/docs/profiles.md` defining Minimal, SaaS, Admin, Advanced profiles
- [x] Add `FeatureFlags` type to `shared/core/src/config/types/index.ts`
- [x] Add `FeaturesEnvSchema` to `shared/core/src/config/env.schema.ts` (`ENABLE_ADMIN`, `ENABLE_REALTIME`)
- [x] Wire feature flags in config factory (`apps/server/src/config/factory.ts`)
- [x] Gate admin routes behind `features.admin` flag
- [x] Gate realtime WebSocket behind `features.realtime` flag
- [x] Gate billing routes behind existing `billing.enabled` flag
- [x] Ensure disabling a feature removes runtime wiring (routes not registered, WebSocket not started)

---

## References

### WebSocket Enhancements (Backend + Frontend)

- [ ] Auth token refresh on reconnect (use `onConnect` callback)
- [ ] React Query cache invalidation on WebSocket events
- [ ] Presence tracking (online/offline/away, last seen)
- [ ] Typing indicators via WebSocket events

---

_Last Updated: 2026-01-31 (Profile quickstart guides, production Postgres docs, infrastructure docs. All migration phases P0–P7 complete.)_
