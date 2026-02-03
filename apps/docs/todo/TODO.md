
## Completed: Config Consolidation (2026-02-03)

- [x] Add `./config` subpath export to `@abe-stack/backend-core`
- [x] Rewire ~60 files from `@abe-stack/shared/config` to `@abe-stack/backend-core/config`
- [x] Extract `isStrategyEnabled` and `getRefreshCookieOptions` to `modules/auth/src/utils/config-helpers.ts`
- [x] Delete scattered config duplicates (~30 files across 6 locations)
- [x] Fix `AppConfig`, `AuthConfig`, `BillingConfig`, `Argon2Config`, `StripeProviderConfig`, `PayPalProviderConfig` imports
- [x] Remove `packages/shared/src/config/` directory and `"./config"` export

### Discovered Debt (Config-Related)

- [ ] `modules/billing/src/factory.test.ts` — test fixtures missing `sandbox` on `PayPalProviderConfig`, `BillingPlansConfig` wrong shape, `BillingUrlsConfig` wrong shape
- [ ] `modules/billing/src/stripe-provider.test.ts` — test fixture missing `publishableKey` on `StripeProviderConfig`
- [ ] `@abe-stack/shared` barrel — `BillingService`, `NormalizedWebhookEvent`, and other billing domain types declared locally but not properly exported
- [ ] `apps/server/src/modules/auth/security/rateLimitPresets.ts` — imports `RateLimitConfig` from `@abe-stack/db` (should be from `@abe-stack/backend-core/config`)

---

## 0. packages/db: Remaining Debt

### Phase 4: Fix Legacy Module Imports

The functional repository refactor (Phases 1–5), post-refactor improvement loop, and Phase 2 repository expansion (16 new repos, 33 total keys, 615 tests) are complete. Phase 4 fixes broken imports in legacy/recovered modules.

- [ ] `packages/db/src/config/database.ts` — fix `@abe-stack/shared/config` import (now `@abe-stack/backend-core/config`)
- [ ] `packages/db/src/config/search.ts` — fix `@abe-stack/shared/config` import (now `@abe-stack/backend-core/config`)
- [ ] `packages/db/src/write/write-service.ts` — fix `@abe-stack/infra` imports
- [ ] `packages/db/src/write/postgres-store.ts` — fix circular `@abe-stack/db` import
- [ ] `packages/db/src/pubsub/postgres-pubsub.ts` — fix missing `./types` module
- [ ] `packages/db/src/repositories/*-legacy.ts` — fix stale schema type references (`UserInsert`, `UserUpdate`, `EmailVerificationTokenInsert`, etc.)

### Quality Debt (from improvement audit)

- [ ] Stale file path comments in ~48 legacy files (e.g., `// infra/src/db/...` instead of `// packages/db/src/...`)
- [ ] Billing repos have minimal JSDoc compared to new repos
- [ ] `isInTransaction` stub always returns `true` in transaction utilities

### packages/shared Barrel Export Debt

- [x] `packages/shared/src/index.ts` — converted to explicit named exports (2026-02-04)
- [x] `packages/shared/src/domain/index.ts` — converted 13 wildcards to explicit named exports (2026-02-04)
- [x] `packages/shared/src/contracts/index.ts` — converted billing wildcard to explicit exports (2026-02-04)
- [x] `packages/shared/src/utils/index.ts` — converted casing wildcard to explicit exports (2026-02-04)
- [ ] Restored files retain old path comments (e.g., `// core/src/infrastructure/...`) — need header updates

---

## 1. Restore Missing Code to `packages/shared/src/`

Code scattered across deleted directories (`core/src/`, `infra/contracts/src/`, `kernel/src/contracts/`) needs to be restored into `packages/shared/src/`. Files marked with `[verify]` may overlap with existing code and need deduplication.

### P0: Search Types & Operators (breaks `packages/db` imports)

Source: `core/src/infrastructure/search/`

- [ ] `errors.ts` + `errors.test.ts` → `packages/shared/src/utils/search/errors.ts`
- [ ] `operators.ts` + `operators.test.ts` → `packages/shared/src/utils/search/operators.ts`
- [ ] `query-builder.ts` + `query-builder.test.ts` → `packages/shared/src/utils/search/query-builder.ts`
- [ ] `schemas.ts` + `schemas.test.ts` → `packages/shared/src/utils/search/schemas.ts`
- [ ] `types.ts` → `packages/shared/src/utils/search/types.ts`
- [ ] `index.ts` → `packages/shared/src/utils/search/index.ts`

### P0: API Contracts (shared types for server + client)

Source: `infra/contracts/src/`

- [ ] `admin.ts` + `admin.test.ts` → `packages/shared/src/contracts/admin.ts`
- [ ] `api.ts` + `api.test.ts` → `packages/shared/src/contracts/api.ts`
- [ ] `auth.ts` + `auth.test.ts` → `packages/shared/src/contracts/auth.ts` `[verify]` vs `domain/auth/auth.contracts.ts`
- [ ] `billing/billing.ts` + `billing.test.ts` → `packages/shared/src/contracts/billing/billing.ts` `[verify]` vs `domain/billing/billing.contracts.ts`
- [ ] `billing/service.ts` + `billing/service.test.ts` → `packages/shared/src/contracts/billing/service.ts`
- [ ] `billing/index.ts` → `packages/shared/src/contracts/billing/index.ts`
- [ ] `common.ts` + `common.test.ts` → `packages/shared/src/contracts/common.ts`
- [ ] `context.ts` → `packages/shared/src/contracts/context.ts`
- [ ] `environment.ts` + `environment.test.ts` → `packages/shared/src/contracts/environment.ts`
- [ ] `jobs.ts` + `jobs.test.ts` → `packages/shared/src/contracts/jobs.ts`
- [ ] `native.ts` + `native.test.ts` → `packages/shared/src/contracts/native.ts`
- [ ] `oauth.ts` + `oauth.test.ts` → `packages/shared/src/contracts/oauth.ts`
- [ ] `pagination.ts` + `pagination.test.ts` → `packages/shared/src/contracts/pagination.ts` `[verify]` vs `utils/pagination.ts`
- [ ] `realtime.ts` + `realtime.test.ts` → `packages/shared/src/contracts/realtime.ts`
- [ ] `schema.ts` → `packages/shared/src/contracts/schema.ts`
- [ ] `security.ts` + `security.test.ts` → `packages/shared/src/contracts/security.ts`
- [ ] `types.ts` → `packages/shared/src/contracts/types.ts`
- [ ] `users.ts` + `users.test.ts` → `packages/shared/src/contracts/users.ts` `[verify]` vs `domain/users/users.contracts.ts`
- [ ] `index.ts` → `packages/shared/src/contracts/index.ts`

### P1: Kernel Contracts (workspace, entitlements, audit, deletion)

Source: `kernel/src/contracts/`

- [ ] `workspace.ts` → `packages/shared/src/contracts/workspace.ts`
- [ ] `entitlements.ts` → `packages/shared/src/contracts/entitlements.ts`
- [ ] `audit.ts` → `packages/shared/src/contracts/audit.ts`
- [ ] `deletion.ts` → `packages/shared/src/contracts/deletion.ts`
- [ ] `schema.test.ts` → `packages/shared/src/contracts/schema.test.ts`

### P1: Logger Types & Implementations

Source: `core/src/infrastructure/logger/`

- [ ] `base-logger.ts` + `base-logger.test.ts` → `packages/shared/src/utils/logger/base-logger.ts`
- [ ] `console.ts` + `console.test.ts` → `packages/shared/src/utils/logger/console.ts`
- [ ] `correlation.ts` + `correlation.test.ts` → `packages/shared/src/utils/logger/correlation.ts`
- [ ] `levels.ts` + `levels.test.ts` → `packages/shared/src/utils/logger/levels.ts`
- [ ] `types.ts` → `packages/shared/src/utils/logger/types.ts`
- [ ] `index.ts` → `packages/shared/src/utils/logger/index.ts`

### P1: Domain Module Errors

Source: `core/src/modules/`

- [ ] `auth/errors.ts` + `auth/errors.test.ts` → `packages/shared/src/domain/auth/auth.errors.ts` (AccountLockedError, EmailSendError, etc.)
- [ ] `auth/http-mapper.ts` + `auth/http-mapper.test.ts` → `packages/shared/src/domain/auth/auth.http-mapper.ts`
- [ ] `billing/errors.ts` + `billing/errors.test.ts` → `packages/shared/src/domain/billing/billing.errors.ts`
- [ ] `billing/index.ts` → merge into `packages/shared/src/domain/billing/index.ts`
- [ ] `notifications/errors.ts` + `notifications/errors.test.ts` → `packages/shared/src/domain/notifications/notifications.errors.ts`
- [ ] `notifications/types.ts` → `packages/shared/src/domain/notifications/notifications.types.ts`
- [ ] `notifications/schemas.ts` + `notifications/schemas.test.ts` → `packages/shared/src/domain/notifications/` `[verify]` vs existing `notifications.schemas.ts`

### P1: Monitor / Health Check Types

Source: `core/src/infrastructure/monitor/`

- [ ] `health.ts` + `health.test.ts` → `packages/shared/src/utils/monitor/health.ts`
- [ ] `types.ts` → `packages/shared/src/utils/monitor/types.ts`
- [ ] `index.ts` → `packages/shared/src/utils/monitor/index.ts`

### P1: Infrastructure Errors (base error classes)

Source: `core/src/infrastructure/errors/`

- [ ] `base.ts` + `base.test.ts` → `[verify]` vs `packages/shared/src/core/errors.ts`
- [ ] `http.ts` + `http.test.ts` → `[verify]` vs `packages/shared/src/core/errors.ts`
- [ ] `response.ts` + `response.test.ts` → `packages/shared/src/core/` `[verify]`
- [ ] `validation-error.ts` + `validation-error.test.ts` → `[verify]` vs `packages/shared/src/core/errors.ts`
- [ ] `validation.ts` + `validation.test.ts` → `[verify]` vs `packages/shared/src/core/errors.ts`
- [ ] `index.ts` → merge exports if missing

### P2: Config System (env loading, schema, types)

Source: `core/src/config/` (also duplicated in `packages/backend-core/src/config/`)

- [ ] `env.loader.ts` + `env.loader.test.ts` → `packages/shared/src/config/env.loader.ts`
- [ ] `env.parsers.ts` + `env.parsers.test.ts` → `packages/shared/src/config/env.parsers.ts`
- [ ] `env.schema.ts` + `env.schema.test.ts` → `packages/shared/src/config/env.schema.ts`
- [ ] `index.ts` → `packages/shared/src/config/index.ts`
- [ ] `types/auth.ts` + `types/auth.test.ts` → `packages/shared/src/config/types/auth.ts`
- [ ] `types/index.ts` + `types/index.test.ts` → `packages/shared/src/config/types/index.ts`
- [ ] `types/infra.ts` + `types/infra.test.ts` → `packages/shared/src/config/types/infra.ts`
- [ ] `types/notification.ts` + `types/notification.test.ts` → `packages/shared/src/config/types/notification.ts`
- [ ] `types/services.ts` + `types/services.test.ts` → `packages/shared/src/config/types/services.ts`

### P2: Shared Utilities (constants, token, cookie, jwt)

Source: `core/src/shared/` and `core/src/infrastructure/`

- [ ] `shared/constants/time.ts` + `time.test.ts` → `packages/shared/src/utils/constants/time.ts`
- [ ] `shared/constants/http.ts` + `http.test.ts` → `[verify]` vs `packages/shared/src/utils/http.ts`
- [ ] `shared/constants/index.ts` → `packages/shared/src/utils/constants/index.ts`
- [ ] `shared/token.ts` + `token.test.ts` → `packages/shared/src/utils/token.ts`
- [ ] `shared/port.ts` + `port.test.ts` → `[verify]` vs `packages/shared/src/core/ports.ts`
- [ ] `shared/utils.ts` + `utils.test.ts` → `[verify]` vs existing utils
- [ ] `shared/async.ts` + `async.test.ts` → `[verify]` vs `packages/shared/src/utils/async/`
- [ ] `shared/storage.ts` + `storage.test.ts` → `[verify]` vs `packages/shared/src/utils/storage.ts`
- [ ] `infrastructure/http/cookie.ts` + `cookie.test.ts` → `packages/shared/src/utils/cookie.ts`
- [ ] `infrastructure/http/types.ts` → merge into `packages/shared/src/utils/http.ts`
- [ ] `infrastructure/crypto/jwt.ts` + `jwt.test.ts` → `packages/shared/src/utils/jwt.ts` `[verify]` vs `utils/crypto.ts`
- [ ] `infrastructure/crypto/index.ts` → merge into utils

### P2: Cache Types & Errors

Source: `core/src/infrastructure/cache/`

- [ ] `errors.ts` + `errors.test.ts` → `packages/shared/src/utils/cache/errors.ts`
- [ ] `types.ts` → `packages/shared/src/utils/cache/types.ts`
- [ ] `index.ts` → merge into `packages/shared/src/utils/cache/index.ts`

### P2: PubSub Types & Helpers (non-DB parts)

Source: `core/src/infrastructure/pubsub/`

- [ ] `helpers.ts` + `helpers.test.ts` → `packages/shared/src/utils/pubsub/helpers.ts`
- [ ] `subscription-manager.ts` + `subscription-manager.test.ts` → `packages/shared/src/utils/pubsub/subscription-manager.ts`
- [ ] `types.ts` → `packages/shared/src/utils/pubsub/types.ts`
- [ ] `index.ts` → `packages/shared/src/utils/pubsub/index.ts`

### P2: Module Registration

Source: `core/src/infrastructure/`

- [ ] `module-registration.ts` → `packages/shared/src/core/module-registration.ts`

### P3: Advanced Password Logic

Source: `core/src/modules/auth/`

- [ ] `password-patterns.ts` + `password-patterns.test.ts` → `[verify]` vs `packages/shared/src/utils/password.ts`
- [ ] `password-scoring.ts` + `password-scoring.test.ts` → `[verify]` vs `packages/shared/src/utils/password.ts`
- [ ] `password-strength.ts` + `password-strength.test.ts` → `[verify]` vs `packages/shared/src/utils/password.ts`
- [ ] `password.ts` + `password.test.ts` → `[verify]` vs `packages/shared/src/utils/password.ts`
- [ ] `index.ts` → merge into `packages/shared/src/domain/auth/index.ts`

### P3: Shared Pagination (cursor-based, separate from offset)

Source: `core/src/shared/pagination/`

- [ ] `cursor.ts` + `cursor.test.ts` → `[verify]` vs `packages/shared/src/utils/pagination.ts`
- [ ] `error.ts` + `error.test.ts` → `[verify]` vs `packages/shared/src/utils/pagination.ts`
- [ ] `helpers.ts` + `helpers.test.ts` → `[verify]` vs `packages/shared/src/utils/pagination.ts`
- [ ] `index.ts` → merge if needed

### P3: Integration Tests

Source: `core/src/__tests__/`

- [ ] `async-utilities.integration.test.ts` → `packages/shared/src/__tests__/`
- [ ] `auth-domain.integration.test.ts` → `packages/shared/src/__tests__/`
- [ ] `contracts.integration.test.ts` → `packages/shared/src/__tests__/`
- [ ] `domain-structure.test.ts` → `packages/shared/src/__tests__/`
- [ ] `errors.integration.test.ts` → `packages/shared/src/__tests__/`
- [ ] `jwt.integration.test.ts` → `packages/shared/src/__tests__/`
- [ ] `pagination.integration.test.ts` → `packages/shared/src/__tests__/`

---

## 2. Essential Features Audit (Verify vs Add)

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
- Database schemas (Zod) defined in `@abe-stack/db` are the source of truth.
- `@abe-stack/shared` (contracts) re-exports these types to maintain a clean dependency flow without shape duplication.

### Admin Feature Boundary
- `modules/admin` owns all backend logic, routes, and services for administration.
- `apps/web/src/features/admin` is a UI-only layer that consumes the backend services via shared types.

- Apps should contain pages + wiring only. Reusable logic belongs to packages.
- If a type is needed by multiple layers, move it to `packages/shared/src/contracts`.
- Keep boundary rules strict; fix violations instead of suppressing.
- Avoid overengineering: only add new packages/features if they reduce complexity or remove duplication.

---

## SaaS Expectations (Appendix)

### 1) SaaS "core loops" people expect

- **Subscription lifecycle completeness**
  - Trials: trial start/end, "trialing → active" transitions
  - Seat-based billing support (minimum): quantity + proration handling rules
  - Plan changes: upgrade/downgrade scheduling, proration previews
  - Dunning / failed payment flow: retries, "past_due" states, user messaging
- **Entitlements**: single place that answers what a user/team can do right now
  - Minimum: `entitlements` service resolving features from subscription + role

### 2) Multi-tenant & team support (big one)

- Organizations/Workspaces
- Memberships (roles per org)
- Invites (email invite accept flow)
- Role/permission model per org (not just global roles)
- Minimum: orgs table, memberships, invites, roles (owner/admin/member), per-org scoping in DB + request context

### 3) Auditability & compliance-lite

- Audit log (general) separate from security events
  e.g., "billing plan changed", "user role changed", "project deleted"
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
- Env validation output ("you're missing X vars")
- Storybook/UI catalog (UI library catalog at `/ui-library` already covers this)

### 7) Security essentials that might still be missing

- Session/device management (list sessions, revoke one/all)
- Password breach checks or strong policy hooks
- File upload validation + scanning hooks
- Secret rotation guidelines (docs + env patterns)

### 8) "SaaS product" surface area (UI)

- Onboarding flow
- Create workspace
- Invite teammate
- Pick plan
- First success moment ("project created")
- Usage/limits UI ("you're on free plan; 80% of X used")
