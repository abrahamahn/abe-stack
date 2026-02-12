# DRY Cross-Package Audit — Full Dependency DAG

> Goal: For each package, replace hardcoded code with imports from its dependencies.
> Approach: Reverse topological order (bottom-up) — guarantees zero rework, each pair checked exactly once.

Last updated: 2026-02-13

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
 │ server-engine│       │
 └─┬─────────┬──┘       │
   │         │          │
   ▼         ▼          ▼
┌─────────┐ ┌────────────┐
│websocket│ │    core    │◄── db + media + server-engine
└────┬────┘ └────────────┘
     │
     ▼
┌──────────┐
│ realtime │◄── db + websocket
└──────────┘
```

**Edges** (excluding shared):

- `server-engine` → db
- `websocket` → db, server-engine
- `core` → db, media, server-engine
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
                           └──── also depends on server-engine (⚠️ cross-boundary)
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
| **server-engine** | db                                           |
| **websocket**     | db, server-engine                            |
| **core**          | db, media, server-engine                     |
| **realtime**      | db, websocket                                |
| **apps/web**      | api, client-engine, react, ui                |
| **apps/desktop**  | api, client-engine, react, ui, server-engine |
| **apps/server**   | core, db, realtime, server-engine, websocket |

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

| Role | File |
| --- | --- |
| Contract definitions | `shared/src/domain/*/` (22 modules) |
| Constants (API_PREFIX, error codes) | `shared/src/core/constants.ts` |
| Client HTTP factory | `client/api/src/api/client.ts` |
| Server route handlers | `server/core/src/{module}/routes.ts` |
| Client config (base URL) | `apps/web/src/config.ts` |
| Server bootstrap | `apps/server/src/main.ts` |

**Boundary enforcement verified:** Zero cross-boundary imports exist (no server packages in client apps, no client packages in server app).

---

## Audit Scopes (5 total)

| #   | Scope                      | Status                                       | Checks |
| --- | -------------------------- | -------------------------------------------- | ------ |
| 1   | shared/_ vs shared/_       | **DONE**                                     | —      |
| 2   | shared/\* vs all consumers | **DONE**                                     | —      |
| 3   | server/_ vs server/_       | **DONE**                                     | 13     |
| 4   | client/_ vs client/_       | **DONE** (5/7 refactors complete, 2 deferred) | 6      |
| 5   | apps/_ vs deps + apps/_    | **TODO**                                     | 14     |
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
- All consumers now import hooks from `@abe-stack/react/hooks`, router from `@abe-stack/react/router`

**P2: react owned theme tokens** — **FIXED (R2)**

- Moved `contrast.ts` and `density.ts` to `shared/src/domain/theme/` (avoids cycle)
- React hooks (useContrast, useDensity) now import from `@abe-stack/shared`

**P3: engine→api re-exports (~100 items)** — **FIXED (F1)**

- Removed all pass-through re-exports from `engine/index.ts`
- Consumers import api items directly from `@abe-stack/api`

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

| #   | Task                                                       | Priority | Status   | Impact                                                                 |
| --- | ---------------------------------------------------------- | -------- | -------- | ---------------------------------------------------------------------- |
| R1  | Remove all re-exports from ui                              | HIGH     | **DONE** | Cleaner API surface; consumers import hooks/router from react directly |
| R2  | Move contrast.ts + density.ts to shared/domain/theme       | HIGH     | **DONE** | Theme tokens centralized in the shared package (avoids cycle)          |
| F1  | Remove engine→api re-exports (~100 items)                  | HIGH     | **DONE** | Engine only exports its own code; consumers import api directly        |
| F4  | Delete engine search re-export shims                       | MED      | **DONE** | serialization.ts (100% re-exports) deleted, query-builder cleaned      |
| F5  | Fix RealtimeContext raw fetch() with auth                  | MED      | **DONE** | Added getToken config; fetch calls now include Authorization header    |
| F3  | Split client-engine React hooks into react                 | LOW      | TODO     | Large refactor, deferred — document boundary for now                   |
| F2  | Migrate api domain hooks to useQuery/useMutation           | LOW      | TODO     | Depends on F3; api hooks use raw useState, should use engine's useQuery|

#### R1: Remove ui re-exports (DONE)

- Deleted `ui/src/hooks/index.ts` (100% re-exports)
- Removed hooks, router, provider re-exports from `ui/src/index.ts` and `ui/src/components/index.ts`
- Updated ~48 web files to import hooks from `@abe-stack/react/hooks`, router from `@abe-stack/react/router`

#### R2: Move theme tokens to shared (DONE)

Moved to `shared/src/domain/theme/` (not ui — to avoid cycle):

- `contrast.ts` — pure CSS variable maps
- `density.ts` — pure CSS variable generators

React hooks (useContrast, useDensity) now import from `@abe-stack/shared`.

#### F1: Remove engine→api re-exports (DONE)

- Removed ~100 pass-through re-exports from `engine/index.ts` (api client, errors, notifications, billing, OAuth)
- Updated 2 consumer source files to import from `@abe-stack/api` directly

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
   │ react, ui               │       │ server-engine, websocket  │
   └───┬──────────────┬──────┘       └────────────┬──────────────┘
       │              │                            │
       ▼              ▼                            ▼
   ┌───────┐    ┌──────────┐                 ┌──────────┐
   │  web  │    │ desktop  │─ ─ ─ ─ ─ ─ ─ ─▶│  server  │
   └───────┘    └──────────┘  also depends   └──────────┘
                   on server-engine
                   (⚠️ cross-boundary)
```

> Note: desktop's server-engine dependency is unusual for a client app — flagged for review.

| App              | Package dependencies                                 |
| ---------------- | ---------------------------------------------------- |
| **apps/web**     | api, client-engine, react, shared, ui                |
| **apps/desktop** | api, client-engine, react, shared, server-engine, ui |
| **apps/server**  | core, db, realtime, server-engine, shared, websocket |

### Phase 9: apps vs their direct package deps (vertical)

Does each app contain logic that should be pushed down into a package?

- [ ] `web` vs `shared` — app-level code that should use shared contracts/utilities?
- [ ] `web` vs `api` — duplicated API client wrappers? raw fetch() bypassing api client?
- [ ] `web` vs `client-engine` — duplicated cache/state logic?
- [ ] `web` vs `react` — duplicated hooks/context?
- [ ] `web` vs `ui` — duplicated components?
- [ ] `server` vs `shared` — server-level code that should use shared contracts?
- [ ] `server` vs `core` — duplicated business logic / route patterns?
- [ ] `server` vs `server-engine` — duplicated infra adapters?
- [ ] `desktop` vs `shared` — same concern as web vs shared
- [ ] `desktop` vs `api` — duplicated API client wrappers?
- [ ] `desktop` vs `ui` — duplicated components?

### Phase 10: apps laterals

Do multiple apps share logic that should be in a package?

- [ ] `web ↔ desktop` — **HIGH PRIORITY**: share 4 of 5 client deps (api, client-engine, react, ui). Very likely to have duplicated feature logic, auth flows, or UI patterns.
- [ ] `web ↔ server` — different stacks, low probability.
- [ ] `desktop ↔ server` — desktop has server-engine dep; check for duplicated server-side patterns.

> Note: desktop's server-engine dependency is unusual for a client app. Investigate whether this is intentional or a boundary violation.

| Phase     | Vertical | Lateral | Total  |
| --------- | -------- | ------- | ------ |
| 9         | 11       | 0       | **11** |
| 10        | 0        | 3       | **3**  |
| **Total** | **11**   | **3**   | **14** |

### Priority (by expected yield)

| Priority | Check                   | Reason                                                    |
| -------- | ----------------------- | --------------------------------------------------------- |
| HIGH     | web ↔ desktop           | near-identical client stacks, highest duplication risk    |
| HIGH     | server vs core          | server is thin orchestrator; leaked logic = DRY violation |
| HIGH     | web vs react            | web features may duplicate react hooks                    |
| HIGH     | web vs shared           | app may hardcode constants/types available in shared      |
| MED      | web vs ui               | web may have inline components that belong in ui          |
| MED      | web vs api              | web may have raw fetch calls bypassing api client         |
| MED      | server vs shared        | server may hardcode shared constants/schemas              |
| MED      | desktop vs api          | same concern as web vs api                                |
| MED      | server vs server-engine | server may duplicate infra adapter patterns               |
| LOW      | web vs client-engine    | engine is low-level, less likely duplicated in app code   |
| LOW      | desktop vs shared       | same concern as web vs shared                             |
| LOW      | desktop vs ui           | same concern as web vs ui                                 |
| LOW      | web ↔ server            | different stacks (HTTP boundary only)                     |
| LOW      | desktop ↔ server        | check server-engine boundary only                         |

---

## Grand Summary

| Scope | Description             | Checks | Status                                        |
| ----- | ----------------------- | ------ | --------------------------------------------- |
| 1     | shared internal         | —      | **DONE**                                      |
| 2     | shared vs consumers     | —      | **DONE**                                      |
| 3     | server/_ vs server/_    | 13     | **DONE**                                      |
| 4     | client/_ vs client/_    | 6      | **DONE** (5/7 refactors done, 2 deferred)     |
| 5     | apps/_ vs deps + apps/_ | 14     | TODO                                          |
| 6     | client-server boundary  | —      | **DONE** (documented, zero violations)         |
| **∑** |                         | **33** |                                               |

**Next**: Scope 5 — audit apps against their package dependencies and each other.

---

## Rules

- Process bottom-up: finalize lower layers before checking higher ones
- Extractions cascade downward naturally — no re-checking needed
- If lateral duplication found between siblings, extract to their lowest common ancestor
- Each package touched exactly once as a "consumer" being audited against its dependencies
- Cross-boundary imports (client ↔ server) are architecture violations, not DRY opportunities
