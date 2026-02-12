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
                                    ⚠️ re-exports ~57 items from react
```

**Edges** (excluding shared):

- `client-engine` → api
- `react` → client-engine
- `ui` → react, client-engine

**Architectural issues** (see Scope 4 for details):

- ui re-exports hooks/router/providers from react (should be removed)
- react/theme/ has framework-agnostic CSS token generators (should be in ui or shared)
- client-engine has React hooks mixed with agnostic core (document boundary for now)

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

---

## Audit Scopes (5 total)

| #   | Scope                      | Status                                       | Checks |
| --- | -------------------------- | -------------------------------------------- | ------ |
| 1   | shared/_ vs shared/_       | **DONE**                                     | —      |
| 2   | shared/\* vs all consumers | **DONE**                                     | —      |
| 3   | server/_ vs server/_       | **DONE**                                     | 13     |
| 4   | client/_ vs client/_       | **DONE** (DRY clean; 3 arch refactors found) | 6      |
| 5   | apps/_ vs deps + apps/_    | **TODO**                                     | 11     |

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

## Scope 4: client/_ vs client/_ (DRY: DONE, Architecture: REFACTOR NEEDED)

### DRY Cross-Check Results (no code duplication found)

- [x] `client-engine` vs `api` — **CLEAN**
- [x] `react` vs `client-engine` — **CLEAN**
- [x] `react ↔ api` — **CLEAN**
- [x] `ui` vs `client-engine` — **CLEAN**
- [x] `ui` vs `react` — **CLEAN**
- [x] `ui ↔ api` — **CLEAN**

No duplicated code between packages. However, deep audit revealed **architectural misplacements** — code living in the wrong package.

---

### Architectural Audit

#### Current Package Ownership

```
┌─────────────────────────────────────────────────────────────────┐
│ api (framework-agnostic)                                        │
│   HTTP client, request factory, error types, billing/webhook    │
│   clients, OAuth helpers                                        │
├─────────────────────────────────────────────────────────────────┤
│ client-engine (HYBRID — 70% agnostic, 30% React)               │
│   AGNOSTIC: cache, storage, offline, undo, websocket client,   │
│             query cache, search query builder, serialization    │
│   REACT:    useQuery, useMutation, useInfiniteQuery,            │
│             useRecord, useRecords, useWrite, useUndoRedo,       │
│             RealtimeContext, QueryCacheProvider,                 │
│             useSearch, useDebounceSearch, useInfiniteSearch      │
├─────────────────────────────────────────────────────────────────┤
│ react (React-specific)                                          │
│   39 hooks, custom router, stores, context factories,           │
│   LiveRegion, createFormHandler                                 │
│   THEME: contrast.ts, density.ts (pure CSS var generators —    │
│          NO React deps, should be in ui)                        │
├─────────────────────────────────────────────────────────────────┤
│ ui (design system)                                              │
│   OWNS: 28 elements, 23 components, 16 layouts, theme tokens   │
│         (colors, spacing, typography, radius, motion),          │
│         ThemeProvider, CSS stylesheets, cn(), Markdown          │
│   RE-EXPORTS: ~57 items from react (hooks, router, providers)  │
└─────────────────────────────────────────────────────────────────┘
```

#### Problems Found

**P1: ui re-exports ~57 items from react (hooks, router, providers)**

- ui/hooks/index.ts is 100% re-exports from @abe-stack/react/hooks
- ui/index.ts re-exports all router exports from @abe-stack/react/router
- ui/index.ts re-exports provider factories from @abe-stack/react/providers
- Violates: consumers should import hooks from react, components from ui

**P2: react owns theme tokens that belong in ui**

- react/theme/contrast.ts — pure CSS variable maps (highContrastLightOverrides, etc.)
- react/theme/density.ts — pure CSS variable generators (getDensityCssVariables, etc.)
- These are framework-agnostic design token functions with zero React imports
- They belong in ui/theme/ alongside colors, spacing, typography, radius, motion
- The React hooks (useContrast, useDensity, useThemeMode) correctly stay in react

**P3: client-engine contains React hooks that blur the framework boundary**

- 7 of 23 source files are React-specific (.tsx, React imports)
- useQuery, useMutation, RealtimeContext, QueryCacheProvider etc.
- Package has `react` as peer dep, not direct dep
- These hooks should arguably live in react, wrapping engine's agnostic core
- However: this is a larger refactor with significant import churn

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

| #   | Task                                                       | Priority | Impact                                                                 |
| --- | ---------------------------------------------------------- | -------- | ---------------------------------------------------------------------- |
| R1  | Remove all re-exports from ui                              | HIGH     | Cleaner API surface; consumers import hooks/router from react directly |
| R2  | Move contrast.ts + density.ts from react/theme to ui/theme | HIGH     | Theme tokens centralized in the design system package                  |
| R3  | Split client-engine React hooks into react                 | LOW      | Large refactor, deferred — document boundary for now                   |

#### R1: Remove ui re-exports

Delete or gut these files:

- `ui/src/hooks/index.ts` — delete entirely (100% re-exports)
- `ui/src/index.ts` — remove all `@abe-stack/react/hooks`, `@abe-stack/react/router`, `@abe-stack/react/providers` re-exports
- Update all consumers (apps/web, apps/desktop) to import hooks/router from `@abe-stack/react` instead of `@abe-stack/ui`

#### R2: Move theme tokens to ui

Move from react:

- `react/src/theme/contrast.ts` → `ui/src/theme/contrast.ts`
- `react/src/theme/density.ts` → already exists in `ui/src/theme/density.ts` (react re-exports it)

Keep in react (React-specific hooks):

- `react/src/hooks/useContrast.ts` — imports contrast tokens from `@abe-stack/ui`
- `react/src/hooks/useDensity.ts` — imports density tokens from `@abe-stack/ui`
- `react/src/hooks/useThemeMode.ts` — stays as-is

This changes the dependency: react already depends on client-engine. After R2, react would also need ui for theme tokens — **creating a cycle** (ui depends on react, react depends on ui). Solutions:

- Extract theme tokens to shared (simplest, no cycle)
- Extract theme tokens to a new `@abe-stack/theme` package
- Keep contrast/density in react but have ui import them (current state — acceptable if we kill the re-exports via R1)

#### R3: Split client-engine React code (DEFERRED)

Would move to react:

- `engine/query/useQuery.ts`, `useInfiniteQuery.ts`, `useMutation.ts`
- `engine/query/QueryCacheProvider.tsx`
- `engine/realtime/RealtimeContext.tsx`, `hooks.tsx`
- `engine/search/hooks.ts`

Engine keeps: QueryCache, RecordCache, LoaderCache, WebsocketPubsubClient, SubscriptionCache, TransactionQueue, UndoRedoStack, RecordStorage, search query-builder/serialization.

Deferred because: 7 files + all their test files + all consumer import updates. Low urgency since the package boundary is documented and functional.

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

- [ ] `web` vs `api` — duplicated API client wrappers?
- [ ] `web` vs `client-engine` — duplicated cache/state logic?
- [ ] `web` vs `react` — duplicated hooks/context?
- [ ] `web` vs `ui` — duplicated components?
- [ ] `server` vs `core` — duplicated business logic / route patterns?
- [ ] `server` vs `server-engine` — duplicated infra adapters?
- [ ] `desktop` vs `api` — duplicated API client wrappers?
- [ ] `desktop` vs `ui` — duplicated components?

> Skip: apps vs shared (already audited in Scope 2), apps vs packages they don't directly import.

### Phase 10: apps laterals

Do multiple apps share logic that should be in a package?

- [ ] `web ↔ desktop` — **HIGH PRIORITY**: share 4 of 5 client deps (api, client-engine, react, ui). Very likely to have duplicated feature logic, auth flows, or UI patterns.
- [ ] `web ↔ server` — different stacks, low probability.
- [ ] `desktop ↔ server` — desktop has server-engine dep; check for duplicated server-side patterns.

> Note: desktop's server-engine dependency is unusual for a client app. Investigate whether this is intentional or a boundary violation.

| Phase     | Vertical | Lateral | Total  |
| --------- | -------- | ------- | ------ |
| 9         | 8        | 0       | **8**  |
| 10        | 0        | 3       | **3**  |
| **Total** | **8**    | **3**   | **11** |

> Phase 9 skips low-value checks (desktop vs client-engine, desktop vs react) — same stack as web, findings will mirror.

### Priority (by expected yield)

| Priority | Check                   | Reason                                                    |
| -------- | ----------------------- | --------------------------------------------------------- |
| HIGH     | web ↔ desktop           | near-identical client stacks, highest duplication risk    |
| HIGH     | server vs core          | server is thin orchestrator; leaked logic = DRY violation |
| HIGH     | web vs react            | web features may duplicate react hooks                    |
| MED      | web vs ui               | web may have inline components that belong in ui          |
| MED      | web vs api              | web may have raw fetch calls bypassing api client         |
| MED      | desktop vs api          | same concern as web vs api                                |
| MED      | server vs server-engine | server may duplicate infra adapter patterns               |
| LOW      | web vs client-engine    | engine is low-level, less likely duplicated in app code   |
| LOW      | desktop vs ui           | same concern as web vs ui                                 |
| LOW      | web ↔ server            | different stacks                                          |
| LOW      | desktop ↔ server        | check server-engine boundary only                         |

---

## Grand Summary

| Scope | Description             | Checks | Status                      |
| ----- | ----------------------- | ------ | --------------------------- |
| 1     | shared internal         | —      | **DONE**                    |
| 2     | shared vs consumers     | —      | **DONE**                    |
| 3     | server/_ vs server/_    | 13     | **DONE**                    |
| 4     | client/_ vs client/_    | 6      | **DONE** (3 arch refactors) |
| 5     | apps/_ vs deps + apps/_ | 11     | TODO                        |
| **∑** |                         | **30** |                             |

**Recommended execution order**: Scope 4 first (client packages are smaller, faster to audit), then Scope 5.

---

## Rules

- Process bottom-up: finalize lower layers before checking higher ones
- Extractions cascade downward naturally — no re-checking needed
- If lateral duplication found between siblings, extract to their lowest common ancestor
- Each package touched exactly once as a "consumer" being audited against its dependencies
- Cross-boundary imports (client ↔ server) are architecture violations, not DRY opportunities
