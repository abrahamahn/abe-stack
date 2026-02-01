# Refactor TODO (Architectural Plan)

This TODO is the working plan derived from `apps/docs/todo/refactor.md`, `apps/docs/todo/NOTE.md`, and the current repo tree. It focuses on boundary enforcement, duplication removal, and making apps thin composition layers for a premium SaaS boilerplate (solo founders → small teams, up to ~100k users).

## At-a-Glance Review (Premium SaaS Fit)

- **Core posture:** Strong architecture and modules exist; risk is **duplication + blurred ownership** more than missing features.
- **Not overengineered yet**, but **too many packages** and **duplicate sources of truth** create drag and confusion.
- **Essentials still missing (per NOTE):** multi-tenant orgs, entitlements, general audit log, data deletion workflow, subscription lifecycle completeness.
- **Refactor plan quality:** Good direction; needs clearer “phase order” and “definition of done” for each phase.

## Definition of Done (Global)

- **Boundary rules enforced** (lint fails on layer leaks).
- **Single source of truth** per feature/type/schema.
- **Apps are composition-only**, packages own logic.
- **Premium modules isolated** under `premium/`.
- **Docs align** with actual package layout.

## 0) Before “Next Package”: Rewrite Rules (Guardrails)

These are non-negotiable. Set them before any file-by-file refactor to prevent rework.

- **Dependency direction (enforce it):**
  - `apps/server` → `modules/*`, `infra/*`, `kernel/*`
  - `modules/*` → `infra/*`, `kernel/*`
  - `infra/*` → `kernel/*`
  - `kernel/*` → nothing (or only internal kernel)
- **One public entry per package:** `src/index.ts` is the only import target.
- **No app-level re-implementations:** if it’s shared, it lives in a package, period.
- **Tests first:** add 3–5 “golden path” tests per package for behavior you don’t want to change.
- **Import boundary enforcement:** keep a simple rule (eslint no-restricted-imports or boundaries) so layer leaks can’t creep back in.

## 1) Snapshot (Current Tree Reality)

Top-level folders: `apps/`, `modules/`, `infra/`, `kernel/`, `client/`, `tools/`, `ops/`.

Confirmed duplication/boundary smells (originally found; some now resolved):

- **API client duplicated** (resolved)
- **Hook duplicated** (`useResendCooldown`) (resolved)
- **ProtectedRoute duplicated** (resolved)
- **createFormHandler duplicated** (resolved)
- **Admin API split in app** (resolved)
- **Server vs kernel overlap**
  - `apps/server/src/logger/*` vs `kernel/src/infrastructure/logger/*`
  - `apps/server/src/health/*` vs `kernel/src/infrastructure/monitor/health.ts`
  - `apps/server/src/routes/*` vs `infra/src/http/router/*`
- **Kernel contains domain module**
  - `kernel/src/modules/notifications/*` (should not be in kernel)

Likely duplicate/misplaced areas to audit next (not exhaustive):

- **Server-owned logic in kernel or infra** (logger, health, router)
- **Frontend app wrappers around package utilities** (watch `apps/web/src/**` re-exports)
- **Schema/type duplication** between `infra/db` and `kernel/contracts`
- **Feature/UI duplication** between `apps/web/src/features/*` and `modules/*` (types should flow from modules/contracts)

## 2) Architectural Decisions (Confirm + Lock)

- [x] Decide **package admission rule**: keep package if reusable across 2+ apps or replaceable subsystem.
- [x] Decide **optional/premium modules**: where to place realtime/media/offline/search (e.g. keep in `infra/` + `modules/` but mark optional, or create a `premium/` or `optional/` root). All optional features moved to `premium/`.
- [x] Decide **client consolidation**: merge `client/stores` into `client/react` (or rename `client/react` to `client/appkit`).
- [x] Confirm **infra consolidation**: merge infra packages into `@abe-stack/infra`, but move `websocket` + `media` into `premium/` packages.
- [x] Confirm **kernel consolidation**: merge `kernel/contracts` + `kernel/primitives` into a single `@abe-stack/kernel` package.
- [x] Confirm **client re-org**: merge `client/stores` into `client/react`.
- [x] Decide **API client ownership**: package exports initialized client/hook; apps must only consume it.
- [x] Decide **schema source-of-truth**: derive types from `infra/db` schemas (`zod`/`Drizzle`) and export from `kernel/contracts` (no duplicate shape definitions).
- [x] Decide **admin feature boundary**: `modules/admin` owns backend logic + shared types; `apps/web/features/admin` consumes those types only.

## 3) Enforce Boundaries (Strict Layering)

Goal: apps are composition only, packages own logic. Layer flow: `apps → modules → infra → kernel`, client can depend on kernel but not server/modules.

- [x] Add strict boundary rules (eslint-plugin-boundaries) in `eslint.config.ts`.
- [x] Add `boundaries/no-unknown` (or `boundaries/no-unknown-files`) once element coverage is confirmed.
- [x] Enforce **entry-point-only imports** (`src/index.ts` only) via lint rule or path restrictions (now that infra is unified).
- [x] Audit imports to ensure **no package imports from `apps/`**.
- [x] Remove all `@ts-ignore` / `@ts-expect-error` directives project-wide (eslint disables already removed).
- [x] Sweep for any remaining infra duplicates or path alias drift.

## 4) Dedupe: Make Packages the Source of Truth

### 4.1 Web app → Client package adoption

- [x] Replace `apps/web/src/api/client.ts` with `client/api/src/api/client.ts`.
- [x] Replace `apps/web/src/features/auth/hooks/useResendCooldown.ts` with `client/react` hook.
- [x] Replace `apps/web/src/features/auth/components/ProtectedRoute.tsx` with `client/ui` layout.
- [x] Replace `apps/web/src/features/auth/utils/createFormHandler.ts` with `client/ui` util.
- [x] Collapse `apps/web/src/features/admin/api/adminApi.ts` and `services/adminApi.ts` into a single source of truth (prefer `client/api` if reusable).

### 4.2 Remove/relocate duplicates (tests included)

- [x] Delete duplicate app files after swapping imports.
- [x] Move/merge duplicate tests into the package that becomes canonical.

### 4.3 Dedupe rules (add guards)

- [x] Enforce **API client single source**: remove any app-level re-instantiation; export initialized client/hook from `client/api`.
- [x] Enforce **schema single source**: no parallel interfaces in `kernel/contracts` when `infra/db` has canonical schemas.
- [x] Enforce **feature/module split**: UI feature uses types from `modules/*` (or `kernel/contracts`) only; no logic duplication.

### 4.4 Phase Order (to avoid rework)

1. Enforce lint boundaries + entry-point rules  
2. Consolidate duplicates + delete app wrappers  
3. Purify kernel + decide infra/server ownership  
4. Premium packaging moves  
5. Final validation

## 5) Make `apps/server` Thin (Composition Only)

- [x] Decide canonical logger: keep kernel logger and adapt server to it, or remove kernel logger and keep server-only (prefer kernel as the base).
- [x] Decide canonical health check: move server health to kernel monitor OR move kernel to infra/http (pick one).
- [x] Route ownership: routes should live in modules + infra/http. `apps/server` should only register routes and start Fastify.
- [x] Resolve logger/health/routes overlaps between `apps/server` and `kernel/infra`.

## 6) Kernel Purity

- [x] Move `kernel/src/modules/notifications/*` to:
  - `kernel/src/contracts/notifications/*` (shared schemas/types), and
  - `modules/notifications/src/errors.ts` (server-only errors).
- [x] Verify kernel contains only domain-agnostic primitives/contracts.

## 7) Optional Modules (Explicitly Optional)

- [ ] Tag optional infra/modules (realtime/websocket/media/offline/search) in docs and configs.
- [ ] Ensure optional modules are gated by config features and do not run by default.
- [x] Create `premium/` root and move `infra/websocket`, `infra/media`, and `client/engine` under it as separate packages.

## 8) Hygiene & Cleanups

- [x] Consolidate any `contracts/src/jobs` dual structure if still present.
- [x] Add missing test for `contracts/src/schema.ts` (if still missing).
- [x] Ensure `client` only depends on `kernel/contracts` or safe primitives.
- [x] Move common helpers (pagination, validation, optimistic lock) to `kernel/primitives` if not infra-specific.
- [x] Add workspace/tenant scoping guardrails (require workspaceId in repo functions).
- [x] Add entitlements resolver + `assertEntitled()` helper (single access gate).
- [x] Add subscription lifecycle state handling (trialing/active/past_due/canceled) tied to entitlements.
- [x] Add general audit log (not just security events).
- [x] Add data deletion workflow (soft delete + async hard delete + storage cleanup).

## 9) Package Consolidation Plan

### 9.1 Infra → `@abe-stack/infra` (exclude websocket/media)

- [x] Create `infra` root package with name `@abe-stack/infra`.
- [x] Merge infra packages into `@abe-stack/infra`: `cache` (done), `db` (done), `email` (done), `http` (done), `jobs` (done), `security` (done), `storage` (done).
- [x] Move `infra/websocket` → `premium/websocket` (keep package name `@abe-stack/websocket`).
- [x] Move `infra/media` → `premium/media` (keep package name `@abe-stack/media`).
- [x] Update root/workspace references, tsconfigs, and any imports to use `@abe-stack/infra` for consolidated modules.
- [x] Remove old infra package directories once imports/builds are clean.

### 9.2 Kernel → single package

- [x] Merge `kernel/contracts` + `kernel/primitives` into `kernel/` with package name `@abe-stack/kernel`.
- [x] Update import paths across repo to point at `@abe-stack/kernel` (no cross-package references).
- [x] Delete old sub-packages and update tsconfig references + lint config.

### 9.3 Client → consolidate + premium engine

- [x] Move `client/engine` → `premium/client/engine` (keep package name `@abe-stack/engine`).
- [x] Merge `client/stores` into `client/react` (single package, keep name `@abe-stack/react`).
- [x] Update imports and tests to use the consolidated client packages.


## 8.1 Essential Features Audit (Verify vs Add)

- [ ] Multi-tenant workspaces + membership roles + invites
  - [ ] Memberships (role per workspace)
  - [ ] Invites (email invite → accept)
  - [ ] Request context has `workspaceId` (scoping)
- [ ] Entitlements service + assert helper
  - [ ] `resolveEntitlements(subscription, role) -> { flags/limits }`
  - [ ] Helper: `assertEntitled("feature_x")`
  - [ ] Limit checks: basic counters (e.g., max projects, max seats)
- [ ] Subscription lifecycle states wired end-to-end
  - [ ] States: `trialing`/`active`/`past_due`/`canceled`
  - [ ] Webhook handling that updates state reliably
  - [ ] Access rules tied to state (via entitlements)
- [ ] General audit log (separate from security events)
  - [ ] `audit_log` table
  - [ ] `audit.record({ actor, action, target, metadata })`
  - [ ] Admin viewer (minimal)
- [ ] Data export + deletion workflows
  - [ ] Soft delete + background job for hard delete
  - [ ] Cascading cleanup rules (storage objects, sessions, tokens, etc.)
- [ ] Baseline observability (metrics + error reporting hooks)
- [ ] Idempotent webhooks + replay safety
  - [ ] Store event IDs, ignore duplicates
  - [ ] Safe handling for "out of order" events
- [ ] Tenant scoping is enforced everywhere
  - [ ] Every query scoped by `workspaceId` (repository helpers require it in signatures)
- [ ] Baseline security defaults
  - [ ] Secure cookies, CSRF strategy, sensible CORS, rate limit presets
  - [ ] One canonical request context + correlation id logging
- [ ] Deployment sanity
  - [ ] migrations + seed + "bootstrap admin" is smooth
  - [ ] Env validation fails fast with good messages

---

## Notes

### Package Admission Rules
- Only create/keep a standalone package if it is used by **2+ separate applications** or is a **replaceable subsystem** with a clean boundary.

### Premium Module Strategy
- All optional, advanced, or paid-tier features (realtime, media, offline, search) must live under the `premium/` root to keep the core lightweight.

### API Client Ownership
- `@abe-stack/api` (or `@abe-stack/client-api`) is the single source of truth for the initialized API client and hooks.
- Applications must consume the exported client/hooks and avoid re-implementing API calling logic.

### Schema Source-of-Truth
- Database schemas (Drizzle/Zod) defined in `@abe-stack/infra` (db) are the source of truth.
- `@abe-stack/kernel` (contracts) re-exports these types to maintain a clean dependency flow without shape duplication.

### Admin Feature Boundary
- `modules/admin` owns all backend logic, routes, and services for administration.
- `apps/web/src/features/admin` is a UI-only layer that consumes the backend services via shared types.

- Apps should contain pages + wiring only. Reusable logic belongs to packages.
- If a type is needed by multiple layers, move it to `kernel/contracts`.
- Keep boundary rules strict; fix violations instead of suppressing.
- Avoid overengineering: only add new packages/features if they reduce complexity or remove duplication.

---

## SaaS Expectations (Appendix)

### 1) SaaS “core loops” people expect

- **Subscription lifecycle completeness**
  - Trials: trial start/end, “trialing → active” transitions
  - Seat-based billing support (minimum): quantity + proration handling rules
  - Plan changes: upgrade/downgrade scheduling, proration previews
  - Dunning / failed payment flow: retries, “past_due” states, user messaging
- **Entitlements**: single place that answers what a user/team can do right now  
  - Minimum: `entitlements` service resolving features from subscription + role

### 2) Multi-tenant & team support (big one)

- Organizations/Workspaces
- Memberships (roles per org)
- Invites (email invite accept flow)
- Role/permission model per org (not just global roles)
- Minimum: orgs table, memberships, invites, roles (owner/admin/member), per‑org scoping in DB + request context

### 3) Auditability & compliance-lite

- Audit log (general) separate from security events  
  e.g., “billing plan changed”, “user role changed”, “project deleted”
- Data export (GDPR-ish): export user/org data
- Data deletion: soft delete + retention windows, hard delete jobs
- Minimum: audit log table + `audit.record(event)` helper with typed events

### 4) Observability & operations

- Minimal metrics: request count/latency, job success/fail counts
- Tracing hook points or structured timing logs
- Error reporting integration (Sentry-like) as optional provider
- Operational dashboards (job monitor + security metrics already exist)
- Minimum: monitoring interface in kernel + infra/observability provider(s)

### 5) Rate limits, abuse, and platform safety

- Per-route presets (auth stricter than others)
- IP reputation / allowlist / blocklist hooks (optional)
- Feature gating for high-risk actions (export, delete, billing)
- Minimum: policy config per route/module

### 6) Developer experience features

- Local dev + preview environments
- docker-compose for db/cache/email dev
- One-command setup: `pnpm dev` starts server + web + workers
- Reset dev DB path
- CLI/scaffolding: create-module, migration scaffolding
- Env validation output (“you’re missing X vars”)
- Storybook/UI catalog (demo catalog already covers this)

### 7) Security essentials that might still be missing

- Session/device management (list sessions, revoke one/all)
- Password breach checks or strong policy hooks
- File upload validation + scanning hooks
- Secret rotation guidelines (docs + env patterns)

### 8) “SaaS product” surface area (UI)

- Onboarding flow
- Create workspace
- Invite teammate
- Pick plan
- First success moment (“project created”)
- Usage/limits UI (“you’re on free plan; 80% of X used”)
