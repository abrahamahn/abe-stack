# DRY Cross-Package Audit — Full Dependency DAG

> Goal: For each package, replace hardcoded code with imports from its dependencies.
> Approach: Reverse topological order (bottom-up) — guarantees zero rework, each pair checked exactly once.

Last updated: 2026-02-13

---

## Phase 1 API Standardization Progress (2026-02-13)

### Completed

- Shared contracts expanded and aligned with live server routes across auth, users, billing, admin, notifications, webhooks, and api-keys.
- Runtime request validation wired at route boundaries for high-risk endpoints (auth flows, webauthn, oauth callback, notifications, api-keys, files, tenants, admin actions, consent, data export, legal publish, feature flags).
- Client runtime response validation rollout applied across `main/client/api` domains (auth core, billing, notifications, phone/devices, api-keys, webhooks).
- API governance audits implemented and standardized:
  - `pnpm audit:contract-sync`
  - `pnpm audit:api-sync`
  - `pnpm audit:api-governance`
  - strict variants with `--fail-on-drift`
- Route manifest/audits made self-contained (in-memory route registration fallback when `route-manifest.json` is absent).
- Contract drift resolved to zero on current snapshot:
  - `contract-only = 0`
  - `route-only = 0`

### In progress / Remaining

- Contract drift resolved:
  - `contract-only = 0`
  - `route-only = 0`
- Client coverage drift resolved:
  - `uncovered routes = 0`
  - `method mismatches = 0`
- Mutating route runtime schemas:
  - `114 / 114` schema-backed
  - Remaining exceptions: none
- Strict governance is enabled in `ci:verify` (`pnpm audit:api-governance:strict`).

---

## Full Monorepo Dependency DAG

Every package depends on `shared` (omitted from diagrams for clarity).

### Client Packages

```
         ┌─────┐
         │ api │                    framework-agnostic
         └──┬──┘                    (HTTP client, errors)
            │
            ▼
    ┌───────────────┐
    │ client-engine │               ⚠️ HYBRID: 70% agnostic, 30% React
    └──┬─────────┬──┘               (cache, storage, offline, undo,
       │         │                   realtime, query, search)
       ▼         │
    ┌───────┐    │                  React-specific
    │ react │    │ ···skip···       (39 hooks, router, stores,
    └──┬────┘    │                   context factories)
       │         │
       ▼         ▼
      ┌────┐◄····┘                  design system
      │ ui │                        (theme, elements, components,
      └────┘                         layouts, CSS)
```

**Edges** (excluding shared):

- `client-engine` → api
- `react` → client-engine
- `ui` → react, client-engine

**Remaining architectural issue** (see Scope 4 for details):

- client-engine has React hooks mixed with agnostic core (F3/R3 — deferred)

### Server Packages

```
    ┌────┐          ┌───────┐
    │ db │          │ media │
    └─┬──┘          └───┬───┘
      │                 │
      ▼                 │
 ┌──────────────┐       │
 │ server-system│       │
 └─┬─────────┬──┘       │
   │         │          │
   ▼         ▼          ▼
┌─────────┐ ┌────────────┐
│websocket│ │    core    │◄── db + media + server-system
└────┬────┘ └────────────┘
     │
     ▼
┌──────────┐
│ realtime │◄── db + websocket
└──────────┘
```

**Edges** (excluding shared):

- `server-system` → db
- `websocket` → db, server-system
- `core` → db, media, server-system
- `realtime` → db, websocket

### Apps (consumers)

```
              ┌──── CLIENT PKGS ────┐         ┌──── SERVER PKGS ────┐
              │ api, c-eng, react,  │         │ core, db, realtime, │
              │ ui                  │         │ s-eng, websocket    │
              └──┬──────────┬───────┘         └──────────┬──────────┘
                 │          │                            │
                 ▼          ▼                            ▼
              ┌─────┐  ┌─────────┐                ┌────────┐
              │ web │  │ desktop │                │ server │
              └─────┘  └─────────┘                └────────┘
                           │
                           └──── also depends on server-system (⚠️ cross-boundary)
```

| Package           | Workspace dependencies (excl. shared)        |
| ----------------- | -------------------------------------------- |
| **shared**        | (none — root)                                |
| **api**           | —                                            |
| **client-engine** | api                                          |
| **react**         | client-engine                                |
| **ui**            | client-engine, react                         |
| **db**            | —                                            |
| **media**         | —                                            |
| **server-system** | db                                           |
| **websocket**     | db, server-system                            |
| **core**          | db, media, server-system                     |
| **realtime**      | db, websocket                                |
| **apps/web**      | api, client-engine, react, ui                |
| **apps/desktop**  | api, client-engine, react, ui, server-system |
| **apps/server**   | core, db, realtime, server-system, websocket |

### Client-Server Boundary (HTTP)

Client and server have **zero compile-time imports** between them. They connect at runtime via HTTP, with `shared` as the single contract layer.

```
┌─────────────────────────────────────────────────────────────────┐
│                       COMPILE TIME                               │
│                                                                  │
│   CLIENT TREE                              SERVER TREE           │
│   ┌─────┐                                  ┌──────┐             │
│   │ web │                                  │server│             │
│   └──┬──┘                                  └──┬───┘             │
│      │                                        │                  │
│      ▼                                        ▼                  │
│   api, engine,                             core, db,             │
│   react, ui                                engine, realtime,     │
│      │                                     websocket, media      │
│      │                                        │                  │
│      └──────────────┐    ┌────────────────────┘                  │
│                     ▼    ▼                                       │
│                  ┌──────────┐                                    │
│                  │  shared  │  ← contract layer                  │
│                  │          │    (types, schemas, constants)      │
│                  └──────────┘                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        RUNTIME                                   │
│                                                                  │
│   client/api ──fetch()/WebSocket──▶ apps/server (Fastify)       │
│       │                                      │                   │
│       │   HTTP: /api/auth/login              │                   │
│       │   HTTP: /api/users/me                │                   │
│       │   WS:   /ws (pubsub)                 │                   │
│       │                                      │                   │
│       └──── both validate against ───────────┘                   │
│                shared/domain/* schemas                            │
└─────────────────────────────────────────────────────────────────┘
```

**How the contract works:**

1. `shared/domain/` defines 22 API contract modules (auth, users, billing, etc.) with Zod schemas for request/response types
2. `shared/core/constants.ts` defines `API_PREFIX = '/api'`, error codes, HTTP status codes, cookie names
3. `client/api` builds HTTP requests using shared types and `API_PREFIX`
4. `server/core` registers Fastify routes using the same shared schemas for validation
5. Both sides validate against identical Zod schemas — type safety across the wire

**Key files:**

| Role                                | File                                 |
| ----------------------------------- | ------------------------------------ |
| Contract definitions                | `shared/src/domain/*/` (22 modules)  |
| Constants (API_PREFIX, error codes) | `shared/src/core/constants.ts`       |
| Client HTTP factory                 | `client/api/src/api/client.ts`       |
| Server route handlers               | `server/core/src/{module}/routes.ts` |
| Client config (base URL)            | `apps/web/src/config.ts`             |
| Server bootstrap                    | `apps/server/src/main.ts`            |

**Boundary enforcement verified:** Zero cross-boundary imports exist (no server packages in client apps, no client packages in server app).

---

## Audit Scopes (5 total)

| #   | Scope                      | Status                                        | Checks |
| --- | -------------------------- | --------------------------------------------- | ------ |
| 1   | shared/_ vs shared/_       | **DONE**                                      | —      |
| 2   | shared/\* vs all consumers | **DONE**                                      | —      |
| 3   | server/_ vs server/_       | **DONE**                                      | 13     |
| 4   | client/_ vs client/_       | **DONE** (5/7 refactors complete, 2 deferred) | 6      |
| 5   | apps/_ vs deps + apps/_    | **TODO**                                      | 14     |
| 6   | client-server boundary     | **DONE** (documented, zero violations)        | —      |

> Cross-boundary (client ↔ server) verified clean — no imports exist.

---

## Scope 3: server/_ vs server/_ (DONE)

<details>
<summary>All 13 checks complete — expand for details</summary>

### Phase 1: Layer 1 Leaves (db, media)

- [x] `db ↔ media` — **CLEAN**

### Phase 2: websocket, engine

- [x] `websocket` vs `db` — **CLEAN**
- [x] `engine` vs `db` — **CLEAN**
- [x] `websocket ↔ engine` — **CLEAN**

### Phase 3: core

- [x] `core` vs `db` — **FIXED**: exported table constants from db, replaced hardcoded names in 7 files
- [x] `core` vs `media` — **FIXED**: replaced naive MIME-to-ext with MIME_TO_EXT, Date.now() with generateFileId(), added sanitizeFilename()
- [x] `core ↔ engine` — **CLEAN**
- [x] `core ↔ websocket` — **CLEAN**

### Phase 4: realtime

- [x] `realtime` vs `db` — **CLEAN**
- [x] `realtime` vs `websocket` — **CLEAN**
- [x] `realtime ↔ engine` — **CLEAN**
- [x] `realtime ↔ core` — **CLEAN**
- [x] `realtime ↔ media` — **CLEAN**

| Phase     | Vertical | Lateral | Total  |
| --------- | -------- | ------- | ------ |
| 1         | 0        | 1       | **1**  |
| 2         | 2        | 1       | **3**  |
| 3         | 2        | 2       | **4**  |
| 4         | 2        | 3       | **5**  |
| **Total** | **6**    | **7**   | **13** |

</details>

---

## Scope 4: client/_ vs client/_ (DRY: DONE, Architecture: 5/7 REFACTORED)

### DRY Cross-Check Results (no code duplication found)

- [x] `client-engine` vs `api` — **CLEAN**
- [x] `react` vs `client-engine` — **CLEAN**
- [x] `react ↔ api` — **CLEAN**
- [x] `ui` vs `client-engine` — **CLEAN**
- [x] `ui` vs `react` — **CLEAN**
- [x] `ui ↔ api` — **CLEAN**

No duplicated code between packages. Deep audit revealed **architectural misplacements** — 5 of 7 now resolved.

---

### Architectural Audit

#### Current Package Ownership (after refactoring)

```
┌─────────────────────────────────────────────────────────────────┐
│ api (framework-agnostic)                                        │
│   HTTP client, request factory, error types, billing/webhook    │
│   clients, OAuth helpers, domain hooks (useState-based)         │
├─────────────────────────────────────────────────────────────────┤
│ client-engine (HYBRID — 80% agnostic, 20% React)               │
│   AGNOSTIC: cache, storage, offline, undo, websocket client,   │
│             query cache, search query builder                   │
│   REACT:    useQuery, useMutation, useInfiniteQuery,            │
│             useRecord, useRecords, useWrite, useUndoRedo,       │
│             RealtimeContext, QueryCacheProvider,                 │
│             useSearch, useDebounceSearch, useInfiniteSearch      │
│   ⚠️ React hooks should move to react (F3 — deferred)          │
├─────────────────────────────────────────────────────────────────┤
│ react (React-specific)                                          │
│   39 hooks, custom router, stores, context factories,           │
│   LiveRegion, createFormHandler                                 │
├─────────────────────────────────────────────────────────────────┤
│ ui (design system)                                              │
│   28 elements, 23 components, 16 layouts, theme tokens          │
│   (colors, spacing, typography, radius, motion),                │
│   ThemeProvider, CSS stylesheets, cn(), Markdown                │
└─────────────────────────────────────────────────────────────────┘
```

#### Problems Found and Status

**P1: ui re-exports ~57 items from react** — **FIXED (R1)**

- Deleted `ui/hooks/index.ts`, removed all hook/router/provider re-exports from ui barrels
- All consumers now import hooks from `@bslt/react/hooks`, router from `@bslt/react/router`

**P2: react owned theme tokens** — **FIXED (R2)**

- Moved `contrast.ts` and `density.ts` to `shared/src/domain/theme/` (avoids cycle)
- React hooks (useContrast, useDensity) now import from `@bslt/shared`

**P3: engine→api re-exports (~100 items)** — **FIXED (F1)**

- Removed all pass-through re-exports from `engine/index.ts`
- Consumers import api items directly from `@bslt/api`

**P4: engine search re-export shims** — **FIXED (F4)**

- Deleted `serialization.ts` (100% shared re-exports) and redundant test
- Cleaned `query-builder.ts` to only export `ClientSearchQueryBuilder`

**P5: RealtimeContext raw fetch() without auth** — **FIXED (F5)**

- Added `getToken` config, both fetch calls now include Authorization header

**P6: client-engine contains React hooks** — **DEFERRED (F3)**

- 7 of ~20 source files are React-specific
- Deferred: large refactor with consumer import churn

**P7: api hooks use raw useState instead of useQuery/useMutation** — **DEFERRED (F2)**

- Depends on F3 (useQuery must move to react first)

---

### ui Internal Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                    THEME CONTRACT                    │
│  colors · spacing · typography · radius · motion    │
│  density · contrast · ThemeProvider · CSS vars       │
│  (distributes tokens to all layers below)            │
└──────────┬──────────────────────────────┬────────────┘
           │                              │
           ▼                              ▼
┌─────────────────────┐      ┌────────────────────────┐
│      ELEMENTS       │      │        STYLES          │
│  (28 atomic blocks) │      │  theme.css             │
│                     │      │  elements.css           │
│  Button, Input,     │      │  components.css         │
│  Badge, Avatar,     │      │  layouts.css            │
│  Checkbox, Switch,  │      │  utilities.css          │
│  Table, Spinner,    │      └────────────────────────┘
│  Alert, Heading,    │
│  Text, ...          │
└──────────┬──────────┘
           │ elements used by components
           ▼
┌─────────────────────────────┐
│        COMPONENTS           │
│  (23 composed + 5 billing)  │
│                             │
│  Card, Dialog, Tabs,        │
│  Accordion, FormField,      │
│  Select, Dropdown, Radio,   │
│  Toast, Pagination, ...     │
│                             │
│  billing/                   │
│    PlanCard, PricingTable,  │
│    InvoiceList, ...         │
└──────────┬──────────────────┘
           │ elements + components used by layouts
           ▼
┌──────────────────────────────────────────┐
│              LAYOUTS                     │
│                                          │
│  containers/ (4)     layers/ (5)         │
│    AuthLayout          Modal             │
│    Container           Overlay           │
│    PageContainer       ProtectedRoute    │
│    StackedLayout       ScrollArea        │
│                        SidePeek          │
│  shells/ (7)                             │
│    AppShell, TopbarLayout,               │
│    LeftSidebarLayout, BottombarLayout,   │
│    ResizablePanel/Group/Separator        │
└──────────────────────────────────────────┘
```

**Hierarchy rule**: theme → elements → components → layouts (each layer may consume layers above it, never below).

---

### Refactoring Tasks

| #   | Task                                                 | Priority | Status   | Impact                                                                  |
| --- | ---------------------------------------------------- | -------- | -------- | ----------------------------------------------------------------------- |
| R1  | Remove all re-exports from ui                        | HIGH     | **DONE** | Cleaner API surface; consumers import hooks/router from react directly  |
| R2  | Move contrast.ts + density.ts to shared/domain/theme | HIGH     | **DONE** | Theme tokens centralized in the shared package (avoids cycle)           |
| F1  | Remove engine→api re-exports (~100 items)            | HIGH     | **DONE** | Engine only exports its own code; consumers import api directly         |
| F4  | Delete engine search re-export shims                 | MED      | **DONE** | serialization.ts (100% re-exports) deleted, query-builder cleaned       |
| F5  | Fix RealtimeContext raw fetch() with auth            | MED      | **DONE** | Added getToken config; fetch calls now include Authorization header     |
| F3  | Split client-engine React hooks into react           | LOW      | TODO     | Large refactor, deferred — document boundary for now                    |
| F2  | Migrate api domain hooks to useQuery/useMutation     | LOW      | TODO     | Depends on F3; api hooks use raw useState, should use engine's useQuery |

#### R1: Remove ui re-exports (DONE)

- Deleted `ui/src/hooks/index.ts` (100% re-exports)
- Removed hooks, router, provider re-exports from `ui/src/index.ts` and `ui/src/components/index.ts`
- Updated ~48 web files to import hooks from `@bslt/react/hooks`, router from `@bslt/react/router`

#### R2: Move theme tokens to shared (DONE)

Moved to `shared/src/domain/theme/` (not ui — to avoid cycle):

- `contrast.ts` — pure CSS variable maps
- `density.ts` — pure CSS variable generators

React hooks (useContrast, useDensity) now import from `@bslt/shared`.

#### F1: Remove engine→api re-exports (DONE)

- Removed ~100 pass-through re-exports from `engine/index.ts` (api client, errors, notifications, billing, OAuth)
- Updated 2 consumer source files to import from `@bslt/api` directly

#### F4: Delete engine search re-export shims (DONE)

- Deleted `engine/search/serialization.ts` (100% re-exports from shared)
- Cleaned `engine/search/query-builder.ts` to only export `ClientSearchQueryBuilder` (engine-specific code)
- Deleted redundant `serialization.test.ts`, updated `query-builder.test.ts` imports

#### F5: Fix RealtimeContext raw fetch() (DONE)

- Added `getToken?: () => Promise<string | null>` to `RealtimeProviderConfig`
- Both `fetch()` calls (submit transaction, rollback record fetch) now attach `Authorization: Bearer` header

#### F3: Split client-engine React code (DEFERRED)

Would move to react:

- `engine/query/useQuery.ts`, `useInfiniteQuery.ts`, `useMutation.ts`
- `engine/query/QueryCacheProvider.tsx`
- `engine/realtime/RealtimeContext.tsx`, `hooks.tsx`
- `engine/search/hooks.ts`

Engine keeps: QueryCache, RecordCache, LoaderCache, WebsocketPubsubClient, SubscriptionCache, TransactionQueue, UndoRedoStack, RecordStorage, search query-builder.

Deferred because: 7 files + all their test files + all consumer import updates. Low urgency since the package boundary is documented and functional.

#### F2: Migrate api domain hooks to useQuery/useMutation (DEFERRED)

Would move billing, devices, phone, notifications, api-keys, oauth, webhooks hooks from `client/api` to `client/react`, rewriting them to use engine's `useQuery`/`useMutation` instead of raw `useState`/`useCallback`.

Depends on F3 (useQuery/useMutation must be in react first).

---

## Scope 5: apps/\* vs dependencies + laterals

Uses the apps DAG from above. Recap:

```
   ┌──── CLIENT PKGS ────────┐       ┌───── SERVER PKGS ─────────┐
   │ api, client-engine,     │       │ core, db, realtime,       │
   │ react, ui               │       │ server-system, websocket  │
   └───┬──────────────┬──────┘       └────────────┬──────────────┘
       │              │                            │
       ▼              ▼                            ▼
   ┌───────┐    ┌──────────┐                 ┌──────────┐
   │  web  │    │ desktop  │─ ─ ─ ─ ─ ─ ─ ─▶│  server  │
   └───────┘    └──────────┘  also depends   └──────────┘
                   on server-system
                   (⚠️ cross-boundary)
```

> Note: desktop's server-system dependency is unusual for a client app — flagged for review.

| App              | Package dependencies                                 |
| ---------------- | ---------------------------------------------------- |
| **apps/web**     | api, client-engine, react, shared, ui                |
| **apps/desktop** | api, client-engine, react, shared, server-system, ui |
| **apps/server**  | core, db, realtime, server-system, shared, websocket |

### Server DAG Baseline (2026-02-13)

- [x] Generated canonical server dependency DAG from code:
  - `docs/architecture/server-dependency-dag.md`
  - command: `pnpm audit:server-dag:write`
- [x] Confirmed package-layer direction:
  - top composition layer: `apps/server`
  - lower reusable domain layer: `server/core`
  - infra/data leaves: `server-system`, `db`, `media`, `websocket`, `realtime`, `shared`
- [x] Decision: do **not** collapse `server/core` into `apps/server`.
- [ ] Next refactor pass: move only app-runtime-specific code from `server/core` to `apps/server` where it cannot be reused outside app bootstrap/runtime wiring.

### Phase 9: apps vs their direct package deps (vertical)

Does each app contain logic that should be pushed down into a package?

- [x] `web` vs `shared` — **FIXED (2026-02-13)**  
       Evidence: `0` non-test files now read `localStorage('accessToken')` directly.  
       Action completed: replaced direct storage reads with `tokenStore.get()` calls from `@bslt/shared` across web hooks/components.
- [x] `web` → `api` — **FIXED (2026-02-13)**  
       Relationship: `apps/web` now routes HTTP concerns through `@bslt/api` clients/helpers.  
       Evidence: `0` non-test files in `apps/web/src` use raw `fetch()`; hook/app callsites migrated to package API methods.
      Follow-up completed: extracted shared CSRF/auth transport helper (`createCsrfRequestClient`) into `@bslt/api` and removed duplicated request boilerplate across web domain API modules (admin/settings/workspace/media/notifications/activities).
- [x] `web` vs `client-engine` — **CLEAN**  
       Evidence: no app-level cache/storage engine re-implementations found; only bootstrap `QueryCache` instantiation.  
       Follow-up completed (2026-02-13): removed duplicated query-persister payload types from `apps/web/src/app/App.tsx` by exporting and consuming `PersistedQuery`/`PersistedClient`/`Persister` from `@bslt/client-engine`.
- [x] `web` vs `react` — **CLEAN**  
       Evidence: heavy reuse (`82` non-test imports from `@bslt/react*`), no duplicate query/router/context infrastructure found in app code.  
       Follow-up completed (2026-02-13): extracted reusable pubsub connection-state subscription hook into `@bslt/react` (`usePubsubConnectionState`) and updated web realtime hook to consume it; migrated settings theme system-detection logic to shared `@bslt/react/hooks/useMediaQuery`; extracted raw localStorage subscription primitive (`useLocalStorageValue`) into `@bslt/react/hooks` and refactored web hooks/components (`useWorkspaceContext`, `CookieConsentBanner`, `GettingStartedChecklist`, `useDataExport`) to consume it.
- [x] `web` vs `ui` — **CLEAN (for now)**  
       Evidence: heavy reuse (`138` non-test imports from `@bslt/ui`); app components appear domain-specific rather than reusable design-system primitives.
      Follow-up completed (2026-02-13): extracted reusable presentation components from web into `@bslt/ui` and replaced app-local implementations with thin re-exports (`FeatureHint`, `SectionErrorBoundary`, `RoleBadge`, `JobStatusBadge`, `StatusBadge`, `getUserStatus`, `SessionCard`); moved profile completeness display rendering into shared UI component (`ProfileCompletenessCard`) while retaining web hook/data orchestration; introduced shared stat rendering primitive (`MetricValue`) for admin metric cards, extracted reusable settings device row renderer (`DeviceRowCard`), consolidated recurring card + heading shell markup via shared `TitledCardSection` (applied across admin metrics/queue/event detail panels), extracted shared labeled detail row rendering (`LabeledValueRow`) reused by admin event/job detail views, and standardized loading/error card handling via shared `CardAsyncState` (applied to queue stats, consent preferences, OAuth connections, and API keys sections).
- [x] `server` vs `shared`
- [x] `server` vs `core` — **REFACTORED (2026-02-13)**  
       Evidence: extracted canonical core module registry from app wiring into `@bslt/core` (`main/server/core/src/route-modules.ts`) and switched app route composition to consume it (`main/apps/server/src/routes/routeModules.ts`, `main/apps/server/src/routes/apiManifestRouteModules.ts`).  
       Boundary hardening: moved Fastify/raw-body billing webhook registration into app runtime layer (`main/apps/server/src/routes/billingWebhooks.ts`) and removed framework-specific webhook route registration from core (`main/server/core/src/billing/webhooks/routes.ts` deleted; core now exports webhook business handlers only).
- [ ] `server` vs `server-system`
- [x] Create `ServerManager` to wrap logic
  - [x] Standardize startup/shutdown signals
  - [x] Ensure correct configuration loading sequence
- [x] Refactor `apps/server/main.ts` to use `ServerManager`
- [x] `desktop` vs `shared` — **CLEAN**  
       Evidence: desktop uses shared types/utils in `4` non-test files (`NativeBridge`, duplicated API wrapper code found in app.
- [x] `desktop` vs `ui` — **CLEAN (N/A usage)**  
       Evidence: `0` non-test imports from `@bslt/ui` in current desktop code. No duplicated UI component implementations found in app.

#### Phase 9 follow-up backlog (from audit)

- [x] `web` token access consolidation: replace direct `localStorage('accessToken')` usage with unified token source (AuthService/tokenStore facade).
- [x] `web` raw fetch migration: moved web fetch-based call sites to `@bslt/api` clients/helpers.
- [ ] `desktop` dependency hygiene: verify whether unused `@bslt/api` and `@bslt/ui` dependencies should remain declared.

### Phase 10: apps laterals

Do multiple apps share logic that should be in a package?

- [ ] `web ↔ desktop` — **HIGH PRIORITY**: share 4 of 5 client deps (api, client-engine, react, ui). Very likely to have duplicated feature logic, auth flows, or UI patterns.
- [ ] `web ↔ server` — different stacks, low probability.
- [ ] `desktop ↔ server` — desktop has server-system dep; check for duplicated server-side patterns.

> Note: desktop's server-system dependency is unusual for a client app. Investigate whether this is intentional or a boundary violation.

| Phase     | Vertical | Lateral | Total  |
| --------- | -------- | ------- | ------ |
| 9         | 11       | 0       | **11** |
| 10        | 0        | 3       | **3**  |
| **Total** | **11**   | **3**   | **14** |

### Priority (by expected yield)

| Priority | Check                   | Reason                                                    |
| -------- | ----------------------- | --------------------------------------------------------- |
| HIGH     | web ↔ desktop          | near-identical client stacks, highest duplication risk    |
| HIGH     | server vs core          | server is thin orchestrator; leaked logic = DRY violation |
| HIGH     | web vs react            | web features may duplicate react hooks                    |
| HIGH     | web vs shared           | app may hardcode constants/types available in shared      |
| MED      | web vs ui               | web may have inline components that belong in ui          |
| MED      | web vs api              | web may have raw fetch calls bypassing api client         |
| MED      | server vs shared        | server may hardcode shared constants/schemas              |
| MED      | desktop vs api          | same concern as web vs api                                |
| MED      | server vs server-system | server may duplicate infra adapter patterns               |
| LOW      | web vs client-engine    | engine is low-level, less likely duplicated in app code   |
| LOW      | desktop vs shared       | same concern as web vs shared                             |
| LOW      | desktop vs ui           | same concern as web vs ui                                 |
| LOW      | web ↔ server           | different stacks (HTTP boundary only)                     |
| LOW      | desktop ↔ server       | check server-system boundary only                         |

---

## Grand Summary

| Scope | Description             | Checks | Status                                                     |
| ----- | ----------------------- | ------ | ---------------------------------------------------------- |
| 1     | shared internal         | —      | **DONE**                                                   |
| 2     | shared vs consumers     | —      | **DONE**                                                   |
| 3     | server/_ vs server/_    | 13     | **DONE**                                                   |
| 4     | client/_ vs client/_    | 6      | **DONE** (5/7 refactors done, 2 deferred)                  |
| 5     | apps/_ vs deps + apps/_ | 14     | **DONE** (14/14 verticals audited; Phase 10 laterals TODO) |
| 6     | client-server boundary  | —      | **DONE** (documented, zero violations)                     |
| **∑** |                         | **33** |                                                            |

**Next**: Phase 10 — audit app laterals (web ↔ desktop, web ↔ server, desktop ↔ server).

---

## Rules

- Process bottom-up: finalize lower layers before checking higher ones
- Extractions cascade downward naturally — no re-checking needed
- If lateral duplication found between siblings, extract to their lowest common ancestor
- Each package touched exactly once as a "consumer" being audited against its dependencies
- Cross-boundary imports (client ↔ server) are architecture violations, not DRY opportunities
