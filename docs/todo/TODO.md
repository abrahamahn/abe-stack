# TODO (Execution Plan)

This file is the **factory-worker** plan: build the product via **vertical slices** (end-to-end) instead of “layers”.

Business-level feature tracking and progress live in `docs/CHECKLIST.md`.

Last updated: 2026-02-10

---

## How To Use This File

1. Pick the next slice from **Work Queue** (below).
2. Implement it using the **Vertical Slice Protocol**.
3. Check it off only when it meets **Definition of Done**.
4. If a task is “big”, split it into multiple slices instead of leaving it half-wired.

---

## Vertical Slice Protocol (Do Not Deviate)

For each feature slice:

1. Contract first
   - Add request/response schemas + types in `@abe-stack/shared` (domain contracts/schemas).
2. Service logic
   - Implement pure logic in `@abe-stack/core` handlers (no HTTP).
3. Unit tests (colocated)
   - Add/extend tests for handler behavior — colocated adjacent to the file under test.
4. Route wiring
   - Wire into Fastify in `@abe-stack/server` routes using `publicRoute` / `protectedRoute` / `adminProtectedRoute`.
5. Integration tests
   - Test the HTTP endpoint with real DB via Fastify inject — lives in `apps/server/src/__tests__/integration/`.
6. Client hook
   - Add `client/api` method + hook (`useQuery`/`useMutation`) with typed contracts.
7. UI wiring
   - Update `apps/web` pages/components to use the hook; handle loading/error/empty states.
8. E2E tests (Playwright)
   - Add Playwright test for the full user-facing flow — lives in `apps/web/e2e/`.

If any step is missing, the slice is not "done".

---

## Definition of Done (Per Slice)

- [ ] Contract: strict schema (no `any`), request/response typed, error cases documented
- [ ] Handler: unit tests cover success + expected failure modes (colocated, `*.test.ts`)
- [ ] Route: correct auth guard + validation + consistent status codes
- [ ] Integration test: HTTP endpoint tested via Fastify inject with real DB (`apps/server/src/__tests__/integration/`)
- [ ] Client: hook exposes typed data/errors; retries/timeouts sane
- [ ] UI: loading + error + empty + success states; accessible basic UX
- [ ] E2E test: Playwright test for the user-facing flow (`apps/web/e2e/`)
- [ ] Ops: logs/audit events where relevant; rate limit/captcha applied where relevant
- [ ] DB (if applicable): table/schema/repo/migration/seed sanity checks done (see below)

---

## DB Artifact Checklist (When Slice Touches The Database)

Before marking a DB-backed slice as done, verify these artifacts exist:

- [ ] Table exists in migrations: `src/server/db/migrations/*.sql`
- [ ] Table included in runtime validation list (when required for boot): `src/server/db/src/validation.ts` (`REQUIRED_TABLES`)
- [ ] Schema table constant exported: `src/server/db/src/schema/*` and re-exported via `src/server/db/src/schema/index.ts` (`*_TABLE`)
- [ ] Repository exists for reads/writes: `src/server/db/src/repositories/**`
- [ ] Dev bootstrap is not missing it: `src/tools/scripts/db/db-push.ts` (if you rely on `pnpm db:push` for local dev)
- [ ] Seed coverage is intentional:
  - If needed for dev/demo: ensure `src/tools/scripts/db/seed.ts` creates minimal rows
  - If not needed: explicitly leave unseeded (do not “seed everything”)
- [ ] Run `pnpm db:audit` after changes (and `pnpm db:audit:db` if you have a DB running)

---

## Work Queue (Ordered For Day 1 Launch)

> Sprint execution order: **Sprint 1 → Sprint 2 → Sprint 3 → Sprint 4**.
> Within each sprint, work top-to-bottom. Each sprint item references its CHECKLIST section.
> See sprint definitions below the Verification Queue.

---

## Verification Queue (Already Marked Complete In CHECKLIST.md)

Purpose: anything already marked `[x]` in `docs/CHECKLIST.md` still needs an explicit **end-to-end proof** (or it will silently rot).

Each verification item is a **vertical slice**, but the output is confidence, not new features:

- prove contracts compile
- prove DB artifacts exist (when applicable)
- prove routes are reachable and protected
- prove client hooks/UI wiring works
- prove tests cover the critical behaviors

### Auth Verification (CHECKLIST 1.1–1.11)

#### Verify Registration (1.1)

- [ ] Contract: shared request/response schemas compile
- [ ] DB: `users` has `canonical_email` and uniqueness enforced
- [ ] Server: `POST /api/auth/register` creates user; returns expected shape; no user enumeration leaks
- [ ] Server: password strength rules enforced (reject weak)
- [ ] Server: verification email attempt logged; graceful fallback if email send fails
- [ ] Client: register UI submits and shows success/failure states
- [ ] Tests: auth registration tests pass

#### Verify Email Verification (1.2)

- [ ] Contract: schemas compile
- [ ] Server: `POST /api/auth/verify-email` consumes token and marks verified
- [ ] Server: `POST /api/auth/resend-verification` invalidates old tokens and creates new
- [ ] Client: confirm email page flow works end-to-end
- [ ] Tests: email verification tests pass

#### Verify Login (1.3)

- [ ] Contract: schemas compile
- [ ] Server: `POST /api/auth/login` works for email and username identifier
- [ ] Server: unverified email rejected without revealing account existence
- [ ] Server: lockout + progressive delays work; failure reasons logged internally
- [ ] Server: refresh token family created; HttpOnly cookie set (Secure/SameSite)
- [ ] Client: login UI works; handles error states
- [ ] Tests: login handler/security tests pass

#### Verify Token Refresh (1.4)

- [ ] Server: `POST /api/auth/refresh` rotates; old token reuse is detected and handled
- [ ] Server: grace period/clock skew behavior matches config defaults
- [ ] Client: refresh path works during navigation (no infinite loops)
- [ ] Tests: refresh/token-family tests pass

#### Verify Logout + Logout-All (1.5)

- [ ] Server: `POST /api/auth/logout` clears cookie and revokes token
- [ ] Server: `POST /api/auth/logout-all` revokes all families
- [ ] Client: logout returns to logged-out state cleanly
- [ ] Tests: logout-related tests pass

#### Verify Password Reset (1.6)

- [ ] Server: `POST /api/auth/forgot-password` is anti-enumeration (generic success)
- [ ] Server: `POST /api/auth/reset-password` validates strength; updates atomically
- [ ] Server: reset invalidates old tokens/sessions as expected
- [ ] Client: reset-password UI flows work
- [ ] Tests: password reset tests pass

#### Verify Magic Link (1.7)

- [ ] Server: request endpoint rate limits per email + IP
- [ ] Server: verify endpoint logs in and can auto-create new user (if enabled)
- [ ] Server: set-password works for passwordless accounts
- [ ] Client: magic link request/verify UX works (dev-friendly)
- [ ] Tests: magic link tests pass

#### Verify OAuth2 (1.8)

- [ ] Server: authorization URL endpoint works (CSRF state included)
- [ ] Server: callback exchanges code and logs user in; can auto-create user
- [ ] Server: link/unlink provider works; list connections works
- [ ] Client: connected accounts UI reflects state
- [ ] Tests: OAuth tests pass (mock provider paths)

#### Verify Email Change (1.9)

- [ ] Server: `POST /api/auth/change-email` sends verification to new address
- [ ] Server: `POST /api/auth/change-email/confirm` updates email atomically
- [ ] Server: reversion link behavior (old email) does the safety actions (if enabled)
- [ ] Client: settings email change UI + confirm page work
- [ ] Tests: email change tests pass

#### Verify TOTP (1.10)

- [ ] Server: setup -> enable -> status -> disable endpoints work
- [ ] Server: login returns challenge when `totpEnabled` and verifies challenge token
- [ ] Server: backup codes: single-use enforced
- [ ] Client: settings 2FA UI works; login TOTP challenge step works
- [ ] Tests: TOTP handler tests pass

#### Verify Canonicalization (1.11)

- [ ] Server: `.trim()` + lowercase at ingress everywhere emails are accepted
- [ ] Server: Gmail dot-insensitivity and `+` stripping prevents duplicates
- [ ] DB: canonical uniqueness constraint actually blocks duplicates
- [ ] Tests: canonicalization tests pass

### Sessions Verification (CHECKLIST 2.1–2.5)

#### Verify Sessions API (2.3)

- [ ] Contract: session domain schemas compile
- [ ] Server: routes require auth
- [ ] Server: `GET /api/users/me/sessions` lists sessions and marks current
- [ ] Server: `DELETE /api/users/me/sessions/:id` prevents revoking current session
- [ ] Server: `POST /api/users/me/sessions/revoke-all` keeps current session only
- [ ] Server: `GET /api/users/me/sessions/count` matches list length
- [ ] Client/UI: settings sessions list fetches and renders states; revoke actions update UI
- [ ] Tests: sessions handler tests pass

#### Verify Session UA labeling (2.5)

- [ ] Server: login creates `user_sessions` record with parsed label fields populated
- [ ] UI: device label is human-readable (not raw UA string)
- [ ] Tests: UA parsing logic tests pass (or equivalent unit coverage)

### Module 1 Verification: Identity (Appendix A)

Goal: ensure the identity “skeleton” is truly present 1-to-1 (migrations + schema + repos + domain types), even if some HTTP/UI is not built yet.

- [ ] `users`
  - [ ] Migration: `src/server/db/migrations/0000_init.sql` creates table
  - [ ] Migration: `src/server/db/migrations/0009_auth_extensions.sql` adds TOTP columns to `users`
  - [ ] Migration: `src/server/db/migrations/0012_user_profile.sql` adds username + profile columns
  - [ ] Migration: `src/server/db/migrations/0017_user_profile_extended.sql` adds extended profile columns
  - [ ] Migration: `src/server/db/migrations/0018_email_canonicalization.sql` adds `canonical_email` + unique index
  - [ ] Schema: `src/server/db/src/schema/users.ts` exports `USERS_TABLE`
  - [ ] Repo: `src/server/db/src/repositories/users/**` exists and is used by core
  - [ ] Domain: `src/shared/src/domain/users/**` types/schemas compile
- [ ] `tenants`
  - [ ] Migration: `src/server/db/migrations/0001_tenant.sql` creates table
  - [ ] Schema: `src/server/db/src/schema/tenant.ts` exports `TENANTS_TABLE`
  - [ ] Repo: `src/server/db/src/repositories/tenant/**` exists
  - [ ] Domain: `src/shared/src/domain/tenant/**` types/schemas compile
- [ ] `memberships`
  - [ ] Migration: `src/server/db/migrations/0001_tenant.sql` creates table
  - [ ] Schema: `src/server/db/src/schema/tenant.ts` exports `MEMBERSHIPS_TABLE`
  - [ ] Repo: `src/server/db/src/repositories/tenant/**` (membership operations) exist
  - [ ] Domain: `src/shared/src/domain/membership/**` types/schemas compile
- [ ] `invitations`
  - [ ] Migration: `src/server/db/migrations/0001_tenant.sql` creates table
  - [ ] Schema: `src/server/db/src/schema/tenant.ts` exports `INVITATIONS_TABLE`
  - [ ] Repo: `src/server/db/src/repositories/tenant/**` (invitation operations) exist
  - [ ] Domain: `src/shared/src/domain/membership/**` types/schemas compile
- [ ] `user_sessions`
  - [ ] Migration: `src/server/db/migrations/0002_sessions.sql` creates table
  - [ ] Migration: `src/server/db/migrations/0019_user_sessions_device_fields.sql` adds `device_name` / `device_type`
  - [ ] Schema: `src/server/db/src/schema/sessions.ts` exports `USER_SESSIONS_TABLE`
  - [ ] Repo: `src/server/db/src/repositories/sessions/**` exists
  - [ ] Domain: `src/shared/src/domain/sessions/**` types/schemas compile

### Module 2 Verification: Auth & Security (Appendix A)

Goal: verify the auth/security persistence layer and repos match the promised flows.

- [ ] `refresh_tokens`
  - [ ] Migration: `src/server/db/migrations/0000_init.sql`
  - [ ] Schema: `src/server/db/src/schema/users.ts` exports `REFRESH_TOKENS_TABLE`
  - [ ] Repo: `src/server/db/src/repositories/auth/**` token methods exist
- [ ] `refresh_token_families`
  - [ ] Migration: `src/server/db/migrations/0000_init.sql`
  - [ ] Schema: `src/server/db/src/schema/auth.ts` exports `REFRESH_TOKEN_FAMILIES_TABLE`
  - [ ] Repo: `src/server/db/src/repositories/auth/**`
- [ ] `login_attempts`
  - [ ] Migration: `src/server/db/migrations/0000_init.sql`
  - [ ] Schema: `src/server/db/src/schema/auth.ts` exports `LOGIN_ATTEMPTS_TABLE`
  - [ ] Repo: `src/server/db/src/repositories/auth/**`
- [ ] `password_reset_tokens`
  - [ ] Migration: `src/server/db/migrations/0000_init.sql`
  - [ ] Schema: `src/server/db/src/schema/auth.ts` exports `PASSWORD_RESET_TOKENS_TABLE`
  - [ ] Repo: `src/server/db/src/repositories/auth/**`
- [ ] `email_verification_tokens`
  - [ ] Migration: `src/server/db/migrations/0000_init.sql`
  - [ ] Schema: `src/server/db/src/schema/auth.ts` exports `EMAIL_VERIFICATION_TOKENS_TABLE`
  - [ ] Repo: `src/server/db/src/repositories/auth/**`
- [ ] `security_events`
  - [ ] Migration: `src/server/db/migrations/0000_init.sql`
  - [ ] Schema: `src/server/db/src/schema/auth.ts` exports `SECURITY_EVENTS_TABLE`
  - [ ] Repo: `src/server/db/src/repositories/auth/**` (or security events repo) exists
- [ ] `magic_link_tokens`
  - [ ] Migration: `src/server/db/migrations/0002_sessions.sql`
  - [ ] Schema: `src/server/db/src/schema/magic-link.ts` exports `MAGIC_LINK_TOKENS_TABLE`
  - [ ] Repo: `src/server/db/src/repositories/magic-link/**` exists
- [ ] `oauth_connections`
  - [ ] Migration: `src/server/db/migrations/0002_sessions.sql`
  - [ ] Schema: `src/server/db/src/schema/oauth.ts` exports `OAUTH_CONNECTIONS_TABLE`
  - [ ] Repo: `src/server/db/src/repositories/oauth/**` exists
- [ ] `totp_backup_codes`
  - [ ] Migration: `src/server/db/migrations/0009_auth_extensions.sql`
  - [ ] Schema: `src/server/db/src/schema/auth.ts` exports `TOTP_BACKUP_CODES_TABLE`
  - [ ] Repo: `src/server/db/src/repositories/auth/**`
- [ ] `email_change_tokens`
  - [ ] Migration: `src/server/db/migrations/0009_auth_extensions.sql`
  - [ ] Schema: `src/server/db/src/schema/auth.ts` exports `EMAIL_CHANGE_TOKENS_TABLE`
  - [ ] Repo: `src/server/db/src/repositories/auth/**`
- [ ] `email_change_revert_tokens`
  - [ ] Migration: `src/server/db/migrations/0018_email_canonicalization.sql`
  - [ ] Schema: `src/server/db/src/schema/auth.ts` exports `EMAIL_CHANGE_REVERT_TOKENS_TABLE`
  - [ ] Repo: `src/server/db/src/repositories/auth/**`
- [ ] `api_keys` (DB layer complete; service/routes may still be pending)
  - [ ] Migration: `src/server/db/migrations/0010_api_keys.sql`
  - [ ] Schema: `src/server/db/src/schema/api-keys.ts` exports `API_KEYS_TABLE`
  - [ ] Repo: `src/server/db/src/repositories/api-keys/**` exists
  - [ ] Domain: `src/shared/src/domain/api-keys/**` types/schemas compile

### Infra-Complete Domains (Build-Time Integrity)

#### Verify Multi-Tenant Infra (4.1)

- [ ] DB artifacts: migrations + schema constants + repositories exist
- [ ] `pnpm db:audit` passes
- [ ] Tests: tenant/membership/invitation repo/schema tests pass

#### Verify RBAC Definitions (5.1)

- [ ] Shared permissions/policy engine compiles
- [ ] Tests: permission matrix tests (or equivalent) pass

#### Verify Realtime (Server) (6.9)

- [ ] Server boots with realtime routes registered
- [ ] Smoke: subscribe -> publish -> receive (manual or test harness)
- [ ] Tests: realtime handler/service tests pass

#### Verify WebSocket Transport (6.10)

- [ ] Tests: websocket lifecycle/stats tests pass
- [ ] Smoke: connect/disconnect/reconnect under dev server

#### Verify Media Processing (Server) (6.11)

- [ ] Tests: image/audio/video processor tests pass
- [ ] Verify no HTTP endpoints expected here (this is server-only module verification)

#### Verify Desktop Scaffold (12)

- [ ] Desktop dev starts and loads renderer
- [ ] Basic IPC handlers do not crash on startup

### Account Management Verification (CHECKLIST 3)

#### Verify Username Auto-Generation (3.2)

- [ ] `core/auth/utils/username.ts` exists and exports username generation function
- [ ] Registration creates a username from email automatically
- [ ] Tests: username generation tests pass (edge cases: special chars, long emails, duplicates)

#### Verify Avatar Workflow — Existing Parts (3.3)

- [ ] Handler: `core/users/handlers/avatar.ts` exists and handles upload logic
- [ ] Client: `AvatarUpload.tsx` + `useAvatarUpload.ts` exist in `apps/web/src/features/settings/`
- [ ] Upload → validate → resize pipeline works (handler exists, verify full chain)
- [ ] Tests: avatar handler tests pass

#### Verify Profile — Existing Parts (3.4)

- [ ] Server: `GET /api/users/me` returns current user profile with expected fields
- [ ] Client: `ProfileForm.tsx` renders and submits (even if limited fields)
- [ ] Tests: profile endpoint tests pass

#### Verify Account Locking (3.6)

- [ ] Server: `POST /api/admin/users/:id/lock` blocks subsequent login
- [ ] Server: `POST /api/admin/users/:id/unlock` restores login ability
- [ ] Server: `isAccountLocked()` check runs on every login attempt
- [ ] Tests: lock/unlock behavior tests pass

### Tenant Scoping Utilities Verification (CHECKLIST 4.9)

- [ ] `WORKSPACE_ID_HEADER` / `WORKSPACE_ROLE_HEADER` constants exported from shared
- [ ] `getWorkspaceContext()` reads headers correctly
- [ ] `assertWorkspaceScope()` throws `WorkspaceScopeError` (or equivalent) when missing
- [ ] Tests: workspace context utilities compile and pass

### RBAC Existing Enforcement Verification (CHECKLIST 5.2–5.3)

#### Verify Backend Guards (5.2)

- [ ] `protectedRoute()` / `publicRoute()` helpers work (protected rejects 401, public allows)
- [ ] `createRequireRole()` checks JWT role field correctly
- [ ] `adminProtectedRoute()` rejects non-admin users with 403
- [ ] Permission checker (`server-engine/security/permissions/checker.ts`) evaluates batch permissions
- [ ] Tests: route guard tests pass, permission checker tests pass

#### Verify ProtectedRoute Component (5.3)

- [ ] `ProtectedRoute.tsx` renders children when authenticated
- [ ] `ProtectedRoute.tsx` redirects to login when unauthenticated
- [ ] Tests: ProtectedRoute tests pass (in `client/ui/layouts/layers/`)

### Module 3 Verification: Billing DB (Appendix A)

- [ ] `plans` — migration 0003, schema constant, repo CRUD
- [ ] `subscriptions` — migration 0003, schema constant, repo CRUD
- [ ] `customer_mappings` — migration 0003, schema constant, repo CRUD
- [ ] `invoices` — migration 0003, schema constant, repo CRUD
- [ ] `payment_methods` — migration 0003, schema constant, repo CRUD
- [ ] `billing_events` — migration 0003, schema constant, repo CRUD
- [ ] `pnpm db:audit` passes for billing tables

### Module 4-9 Verification: Supporting DB (Appendix A)

- [ ] `notifications` — migration 0004, schema, repo
- [ ] `push_subscriptions` — migration 0004, schema, repo
- [ ] `notification_preferences` — migration 0004, schema, repo
- [ ] `jobs` — migration 0005, schema, repo
- [ ] `audit_events` — migration 0005, schema, repo
- [ ] `webhooks` — migration 0005, schema, repo
- [ ] `webhook_deliveries` — migration 0005, schema, repo
- [ ] `feature_flags` — migration 0006, schema, repo
- [ ] `tenant_feature_overrides` — migration 0006, schema, repo
- [ ] `usage_metrics` — migration 0007, schema, repo
- [ ] `usage_snapshots` — migration 0007, schema, repo
- [ ] `legal_documents` — migration 0008, schema, repo
- [ ] `user_agreements` — migration 0008, schema, repo
- [ ] `consent_logs` — migration 0008, schema, repo
- [ ] `data_export_requests` — migration 0011, schema, repo
- [ ] `files` — migration 0013, schema, repo
- [ ] `email_templates` — migration 0014, schema, repo
- [ ] `email_log` — migration 0014, schema, repo
- [ ] `tenant_settings` — migration 0015, schema, repo
- [ ] `activities` — migration 0016, schema, repo
- [ ] `pnpm db:audit` passes for all supporting tables

### Supporting Modules Verification (CHECKLIST 6)

#### Verify API Keys DB Layer (6.1)

- [ ] `api_keys` table: key_hash, scopes, tenant_id, expires_at, revoked_at columns exist
- [ ] Repo: findByKeyHash, findByUserId, findByTenantId, create, revoke, updateLastUsedAt work
- [ ] Domain: `shared/domain/api-keys/**` types/schemas compile
- [ ] Tests: api-keys repo tests pass

#### Verify Billing Infrastructure (6.2)

- [ ] Admin plan CRUD: list, create, get, update, deactivate, sync-to-stripe endpoints reachable
- [ ] Billing routes conditionally registered on `config.billing.enabled`
- [ ] Webhook routes: Stripe + PayPal endpoints accept POST
- [ ] Provider factory: `billing/factory.ts` returns correct provider for Stripe/PayPal
- [ ] Entitlements domain logic: `billing.entitlements.ts` compiles and exports resolvers
- [ ] Client UI: BillingSettingsPage, PricingPage, CheckoutSuccessPage, CheckoutCancelPage render
- [ ] Client API: `billing/client.ts`, `admin.ts`, `hooks.ts` compile
- [ ] Tests: billing handler/provider tests pass

#### Verify Audit & Security Events (6.3)

- [ ] Security events table: 18+ event types with severity levels exist
- [ ] Event logging fires on: login, OAuth, lockout, TOTP (`core/auth/security/audit.ts`, `events.ts`)
- [ ] Admin API: `GET /api/admin/security/events`, `/events/:id`, `/metrics`, `/events/export` reachable
- [ ] General audit log: `audit_events` table + repo functional
- [ ] Admin UI: SecurityEventsPage, SecurityEventDetailPage, SecurityEventsTable, SecurityEventsFilters, SecurityMetricsCard, SecurityEventCard, ExportDialog render
- [ ] Hooks: useSecurityEvents, useSecurityMetrics, useSecurityEvent, useExportEvents compile
- [ ] Tests: security event tests pass

#### Verify Notifications Infrastructure (6.4)

- [ ] `notifications` table + routes wired and reachable
- [ ] `email_templates` + `email_log` tables + repos functional
- [ ] Mailer module: client abstraction, SMTP transport, console provider (dev), template renderer all work
- [ ] Notification service: `core/notifications/service.ts` + `handlers.ts` compile
- [ ] Push provider: FCM provider + factory pattern compiles
- [ ] Client API: `notifications/client.ts`, `hooks.ts` compile
- [ ] Tests: notification service/handler tests pass

#### Verify File Storage Infrastructure (6.5)

- [ ] `files` table + repository functional
- [ ] S3 storage provider (`server-engine/storage/providers/s3.ts`) compiles
- [ ] Local storage provider works for dev
- [ ] Presigned URL generation functional
- [ ] Tests: storage provider tests pass

#### Verify Activity Tracking DB (6.6)

- [ ] `activities` table + repository functional
- [ ] Domain logic compiles (even if partial)
- [ ] Tests: activity repo tests pass

#### Verify Feature Flags & Metering DB (6.7)

- [ ] `feature_flags` + `tenant_feature_overrides` tables + repos functional
- [ ] `usage_metrics` + `usage_snapshots` tables + repos functional
- [ ] Tests: feature flag / metering repo tests pass

#### Verify Compliance DB Layer (6.8)

- [ ] `legal_documents`, `user_agreements`, `consent_logs` tables + repos functional
- [ ] `data_export_requests` table + repo functional
- [ ] Deletion domain logic: `deletion.logic.ts` + `deletion.schemas.ts` compile
- [ ] Tests: compliance domain logic tests pass

#### Verify Realtime Client (6.9)

- [ ] Client: `RealtimeContext.tsx`, `SubscriptionCache.ts`, `WebsocketPubsubClient.ts` compile
- [ ] Realtime hooks compile and export correctly
- [ ] Tests: realtime client tests pass (if any exist)

### Admin & Support Verification (CHECKLIST 7)

#### Verify User Settings — Existing Parts (7.1)

- [ ] Profile: `ProfileForm.tsx`, `AvatarUpload.tsx` + hooks render and submit
- [ ] Security: `PasswordChangeForm.tsx` + `usePasswordChange.ts` render and submit
- [ ] Sessions: `SessionsList.tsx`, `SessionCard.tsx`, `useSessions.ts` render
- [ ] Connected accounts: `OAuthConnectionsList.tsx` renders
- [ ] Tests: settings component tests pass

#### Verify System Admin — Existing Parts (7.3)

- [ ] User list: `UserTable`, `UserFilters`, `UserListPage` render with data
- [ ] User detail: `UserDetailCard`, `UserDetailPage`, `UserActionsMenu` render
- [ ] Lock/unlock: admin can lock/unlock from UI, state reflects in list
- [ ] Security events: SecurityEventsPage, SecurityEventDetailPage, all 7 components render
- [ ] Job monitor: `JobsTable`, `JobDetailsPanel`, `JobStatusBadge`, `JobActionsMenu`, `QueueStatsCard` render
- [ ] Billing: `PlanManagementPage` renders with plan data
- [ ] Admin layout: `AdminLayout.tsx` wraps admin pages correctly
- [ ] Admin API: `adminApi.ts` methods compile and return typed responses
- [ ] Role badge: `RoleBadge.tsx` renders correct labels per role
- [ ] Tests: admin component/hook tests pass

#### Verify Soft Ban (7.5)

- [ ] `POST /api/admin/users/:id/lock` blocks login, preserves data
- [ ] `POST /api/admin/users/:id/unlock` restores access
- [ ] `isAccountLocked()` check fires during login flow
- [ ] Tests: lock/unlock handler tests pass

### Architecture & Infrastructure Verification (CHECKLIST 8)

#### Verify Backend Core Infrastructure

- [ ] Shared Zod schemas compile: `*.contracts.ts` across auth, billing, users, jobs, audit-log, admin
- [ ] Shared config module: env.schema, env.parsers, auth-helpers + config types all tested and passing
- [ ] Request/response validation at boundary works (Zod parse on ingress)
- [ ] Route maps: auth, billing, users, admin, realtime, notifications all registered on server boot
- [ ] Postgres: connection + pooling, SQL builder (conditions, CTE, select, insert, update, delete, window) functional
- [ ] All 20 migrations apply cleanly in sequence
- [ ] Seed scripts + bootstrap admin run without errors
- [ ] DB utilities: optimistic locking, transaction management, factory pattern, PubSub functional
- [ ] Tests: config, SQL builder, DB utility tests pass

#### Verify Server Engine Adapters

- [ ] Cache: config, factory, LRU, memory provider work; tests pass
- [ ] Mailer: client abstraction, SMTP transport, console provider, template renderer work
- [ ] Storage: S3 provider, local provider, presigned URLs, HTTP server work
- [ ] Queue + jobs: write service, client, memory store work; tests pass
- [ ] Search: SQL provider, factory, query builder work; tests pass
- [ ] Config loader: `env.loader.ts` works
- [ ] Logger: `logger.ts` outputs structured logs
- [ ] Routing: `routing.ts` registers Fastify routes with Zod + native validation

#### Verify Security Modules

- [ ] Rate limiting: token-bucket with role-based presets works; tests pass
- [ ] JWT: native HS256, timing-safe, secret rotation works; tests pass
- [ ] CSRF: token generation, signing, encryption works
- [ ] Argon2id: password hashing with auto-rehash works
- [ ] Permissions: types, batch checker, Fastify preHandler middleware work; tests pass
- [ ] CORS, security headers, Pino logging, correlation IDs all active on server boot

#### Verify Server App Middleware

- [ ] Cookie parsing, CSRF protection, correlation IDs, proxy validation, request info, security headers, static files, validation all registered
- [ ] Plugin registration (`http/plugins.ts`) runs without errors
- [ ] Server config factory produces valid config for all modules

#### Verify Job Idempotency

- [ ] Job idempotency keys prevent duplicate execution
- [ ] Retries + backoff work as configured
- [ ] Dead-letter queue captures failed jobs
- [ ] Tests: job idempotency tests pass

### Frontend Verification (CHECKLIST 8 Frontend)

#### Verify Core UI

- [ ] Shared component library renders: accessibility defaults (LiveRegion), theme system functional
- [ ] Sidebar + topbar layout renders without errors
- [ ] Error boundaries catch and display errors
- [ ] Global toasts appear and dismiss
- [ ] Custom router: BrowserRouter, MemoryRouter, Link, Route, Switch, hooks all work
- [ ] State management: createStore, toastStore, undoRedoStore functional
- [ ] Form utilities: useFormState, createFormHandler, Zod form resolver work
- [ ] UI hooks: useVirtualScroll, usePaginatedQuery, useSidePeek, useKeyboardShortcuts work
- [ ] Billing UI components: InvoiceRow, PaymentMethodCard, PlanCard, PricingTable, SubscriptionStatus render
- [ ] Tests: all client/ui and client/react tests pass

#### Verify Client Engine

- [ ] Query system: useQuery, useMutation, useInfiniteQuery, QueryCache, QueryCacheProvider work
- [ ] Record cache + loader cache functional
- [ ] Offline-first: TransactionQueue, mutationQueue (IndexedDB) functional
- [ ] Storage layer: RecordStorage, idb, queryPersister functional
- [ ] Search: client-side query-builder, serialization, hooks compile
- [ ] Undo/redo: UndoRedoStack functional
- [ ] Tests: all client/engine tests pass

#### Verify Client API

- [ ] Core API client: fetch wrapper, interceptors, auth headers work
- [ ] Billing API: client, admin, hooks compile and return typed responses
- [ ] Notifications API: client, hooks compile
- [ ] OAuth hooks compile
- [ ] Error handling: errors.ts maps API errors correctly
- [ ] Tests: client/api tests pass

#### Verify PWA Support

- [ ] Service worker (`public/sw.js`) registers without errors
- [ ] Web manifest (`public/manifest.json`) is valid
- [ ] Service worker registration utility works

#### Verify Web App Features

- [ ] `auth/` — Login, Register, ConfirmEmail, ForgotPassword, ResetPassword pages render and navigate
- [ ] `settings/` — SettingsPage, ProfileForm, PasswordChangeForm, AvatarUpload, SessionsList, SessionCard, OAuthConnectionsList render; tests pass
- [ ] `admin/` — UserListPage, UserDetailPage, PlanManagementPage, SecurityEventsPage, SecurityEventDetailPage render; 15 components + 12 hooks compile; tests pass
- [ ] `billing/` — BillingSettingsPage, PricingPage, CheckoutSuccessPage, CheckoutCancelPage render
- [ ] `dashboard/` — Dashboard page renders; test passes
- [ ] `home/` — HomePage, DocViewer, NavList, TopBar, BottomBar, MainLayout render; tests pass
- [ ] `ui-library/` — UILibraryPage, SidePeekUILibraryPage, ComponentList, PreviewArea, DocContent render; tests pass

### Operational Quality Verification (CHECKLIST 10)

- [ ] Health endpoints: `server-engine/system/health.ts` + `shared/utils/monitor/health.ts` exist and tests pass
- [ ] Request correlation IDs: `correlationId.ts` middleware attaches IDs to requests
- [ ] Verify correlation ID appears in log output

### Login Attempt Logging Verification (CHECKLIST 11.4)

- [ ] Login attempt logging (IP, user agent, success/fail) fires on every login
- [ ] Logged data is queryable from `login_attempts` table
- [ ] Tests: login attempt logging tests pass

### Infrastructure & CI/CD Verification (CHECKLIST 13)

#### Verify Containerization (13.1)

- [ ] `Dockerfile` builds production image successfully
- [ ] `Dockerfile.web` builds web production image successfully
- [ ] `docker-compose.dev.yml` starts all services (Postgres, Redis, etc.)
- [ ] `docker-compose.prod.yml` composition is valid
- [ ] `nginx.conf` and Caddy configs are syntactically valid

#### Verify Cloud Deployment (13.2)

- [ ] DigitalOcean Terraform: `terraform validate` passes
- [ ] GCP Terraform: `terraform validate` passes
- [ ] Provider abstraction: `main.tf`, `providers.tf`, `variables.tf` valid
- [ ] Deployment docs: all 9 guides in `docs/deploy/` are current and accurate

#### Verify CI Pipelines (13.3)

- [ ] `ci.yml` runs lint, type-check, test successfully
- [ ] `deploy.yml` workflow is valid
- [ ] `security.yml` scans run
- [ ] `audit.yml` dependency audit runs
- [ ] `rollback.yml` workflow is valid
- [ ] `infra-deploy.yml`, `infra-destroy.yml`, `infra-test.yml` workflows valid

#### Verify Dev Tooling (13.4)

- [ ] Audit scripts: all 6 scripts run without errors
- [ ] DB tools: bootstrap-admin, db-push, migrate, seed run successfully; tests pass
- [ ] Dev automation: bootstrap, dev, run-tests, setup work
- [ ] Git hooks: pre-commit, pre-push execute correctly
- [ ] Sync tools: sync-css-theme, sync-file-headers, sync-ts-references run
- [ ] Path tools: barrel generation, alias management work
- [ ] Export tools: code export utilities work

#### Verify Engine Queue/Job System (Appendix C)

- [ ] `types.ts` — merged queue + write types compile
- [ ] `client.ts` (QueueServer) — tested and functional
- [ ] `writer.ts` (WriteService) — tested and functional
- [ ] `memory-store.ts` — in-memory store works for dev/test
- [ ] `index.ts` barrel — explicit named exports correct
- [ ] Tests: queue/job system tests pass

#### Verify Engine Search (Appendix C)

- [ ] `types.ts` — provider interfaces compile
- [ ] `query-builder.ts` — builds queries correctly
- [ ] `sql-provider.ts` — Postgres full-text search works; tests pass
- [ ] `factory.ts` — SearchProviderFactory singleton works; tests pass
- [ ] `index.ts` barrel — explicit named exports correct

---

The ordering mirrors `docs/CHECKLIST.md` priority actions. Sprints 1-3 cover **all** of CHECKLIST sections 1-13.

---

### Sprint 1: Ship Blockers + Auth/Session Completeness

> **Goal:** Close every Day 1 security gap. Nothing here is optional before launch.
> Covers: CHECKLIST 1 (gaps), 2 (all gaps), 11 (all).

#### 1.1 Session UI wiring (CHECKLIST 2.7)

- [ ] Slice: Wire `SessionsList` + `SessionCard` to settings page navigation (route + nav link)
- [ ] Slice: Revoke session button per device (calls `DELETE /api/users/me/sessions/:id`)
- [ ] Slice: "Log out all other devices" button (calls `POST /api/users/me/sessions/revoke-all`)
- [ ] Slice: Current session indicator (green dot / "This device" label)
- [ ] Slice: "New login from unknown device" notification banner

#### 1.2 Session security hardening (CHECKLIST 2.4)

- [ ] Slice: Session idle timeout enforcement (configurable TTL, server-side check on token refresh)
- [ ] Slice: Max concurrent sessions limit (configurable, evict oldest on overflow)

#### 1.3 Security intelligence (CHECKLIST 2.6)

> **Deferred to Sprint 3.23** — Security Intelligence & Device Detection is a supporting module
> that depends on auth infrastructure from Sprint 1.1–1.2. Detailed breakdown in Sprint 3.23
> covers: geo-IP lookup, trusted device tracking, token version invalidation, new-login alerts,
> device management UI.

#### 1.4 Turnstile / CAPTCHA on public forms (CHECKLIST 11.1)

- [ ] Slice: Server middleware — Turnstile/reCAPTCHA token verification, config-gated (`config.security.captcha.enabled`)
- [ ] Slice: Apply to `POST /auth/register`, `/login`, `/forgot-password`, invite accept
- [ ] Slice: Client invisible widget on public forms + error messaging
- [ ] Slice: Unit tests (verification happy path + fail closed)
- [ ] Slice: Integration tests (middleware rejects missing/invalid token)
- [ ] Slice: E2E test (register form submits with widget, rejected without)

#### 1.5 "Was this you?" security emails (CHECKLIST 11.2)

- [ ] Slice: Transactional email templates for: password changed, 2FA disabled, new API key, new device login
- [ ] Slice: Email change reversion — send "Revert" link to old email (A); clicking reverts to A, locks account, kills all sessions
- [ ] Slice: Integration tests (trigger event → email sent with correct template)
- [ ] Slice: E2E test (change password → receive security notification email)

#### 1.6 ToS version gating middleware (CHECKLIST 11.3)

- [ ] Slice: Fastify preHandler — `if (user.latest_tos_version < system.current_tos_version)` → block all API except `/auth/logout` + `/api/agreements`
- [ ] Slice: Return 403 `{ code: 'TOS_ACCEPTANCE_REQUIRED', currentVersion }`
- [ ] Slice: `POST /api/agreements/accept` — records acceptance, unblocks user
- [ ] Slice: Admin: publish new ToS version (updates `legal_documents` row)
- [ ] Slice: Client — intercept 403 → show "Accept New Terms" modal → accept → proceed
- [ ] Slice: Unit tests (middleware logic, version comparison)
- [ ] Slice: Integration tests (stale version blocked, acceptance unblocks)
- [ ] Slice: E2E test (new ToS published → user forced to accept → normal access)

#### 1.7 Granular login failure logging (CHECKLIST 11.4)

- [ ] Slice: Failure reason enum: `USER_NOT_FOUND`, `PASSWORD_MISMATCH`, `UNVERIFIED_EMAIL`, `ACCOUNT_LOCKED`, `TOTP_REQUIRED`, `TOTP_INVALID`, `CAPTCHA_FAILED`
- [ ] Slice: Store failure reason in `login_attempts` table (add column if needed)
- [ ] Slice: Admin filter login attempts by failure reason in security events UI
- [ ] Slice: Ensure HTTP responses remain generic 401 (anti-enumeration)
- [ ] Slice: Unit tests (reason assignment per branch)
- [ ] Slice: Integration tests (internal log contains reason, HTTP response generic)

#### 1.8 Auth UI gap (CHECKLIST 1.10)

- [ ] Slice: Show QR code during TOTP setup (in addition to manual secret entry)

---

### Sprint 2: Multi-Tenant + RBAC + Account Management

> **Goal:** Make the product usable for teams and self-service account operations.
> Covers: CHECKLIST 3 (all), 4 (all gaps), 5 (all gaps).

#### 2.1 Sudo mode (CHECKLIST 3.1)

- [ ] Slice: `POST /api/auth/sudo` — accepts password or TOTP code, returns sudo token (5 min TTL)
- [ ] Slice: Sudo middleware — Fastify preHandler validates sudo token for protected operations
- [ ] Slice: Wire to: email change, password change, 2FA enable/disable, account delete, API key create/revoke
- [ ] Slice: Client re-auth modal (password prompt or TOTP input)
- [ ] Slice: Security event logging for sudo elevation
- [ ] Slice: Unit + integration + E2E tests

#### 2.2 Username management (CHECKLIST 3.2)

- [ ] Slice: `PATCH /api/users/me/username` — uniqueness (case-insensitive), reserved blocklist
- [ ] Slice: Cooldown timer (1 change per 30 days) — `last_username_change` column or history table
- [ ] Slice: Client username edit field in profile settings
- [ ] Slice: Unit + integration + E2E tests

#### 2.3 Avatar workflow (CHECKLIST 3.3)

- [ ] Slice: `PUT /api/users/me/avatar` — multipart upload, validate → resize → store to S3
- [ ] Slice: `DELETE /api/users/me/avatar` — remove custom avatar
- [ ] Slice: Fallback chain: custom upload → Gravatar → generated initials
- [ ] Slice: CDN cache invalidation on change (ETag or versioned URL)
- [ ] Slice: Unit + integration + E2E tests

#### 2.4 Profile management (CHECKLIST 3.4)

- [ ] Slice: `PATCH /api/users/me` — update display name, bio, city, state, country
- [ ] Slice: Profile completeness indicator (% complete)
- [ ] Slice: Client full profile edit page in settings
- [ ] Slice: Unit + integration + E2E tests

#### 2.5 Phone / SMS 2FA (CHECKLIST 3.5)

> **Deferred to Sprint 3.24** — SMS 2FA is a supporting module that depends on auth
> infrastructure from Sprint 1 and 2FA patterns from Sprint 1.8 (TOTP). Detailed breakdown
> in Sprint 3.24 covers: SMS provider abstraction (Twilio + console), phone number management,
> SMS 2FA challenge flow, rate limiting, client UI.

#### 2.6 Account lifecycle — self-service API + UI (CHECKLIST 3.6)

> Background cron jobs and PII anonymization logic live in Sprint 3.16 (Data Hygiene).
> This slice covers the user-facing API endpoints and UI only.

- [ ] Slice: `POST /api/users/me/deactivate` — self-service pause (reversible)
- [ ] Slice: `POST /api/users/me/delete` — deletion request (requires sudo), sets `deleted_at`, sends confirmation email
- [ ] Slice: `POST /api/users/me/reactivate` — cancel pending deletion during grace period
- [ ] Slice: Client account danger zone in settings (deactivate / delete with confirmation)
- [ ] Slice: Unit + integration + E2E tests

#### 2.7 Tenant CRUD (CHECKLIST 4.2)

- [ ] Slice: `POST /api/tenants` — create workspace (transaction: tenant + owner membership)
- [ ] Slice: `GET /api/tenants` — list user's workspaces
- [ ] Slice: `GET /api/tenants/:id` — get workspace details
- [ ] Slice: `PATCH /api/tenants/:id` — update workspace (name, slug, logo)
- [ ] Slice: `DELETE /api/tenants/:id` — delete workspace (requires owner + sudo)
- [ ] Slice: Auto-create default workspace on registration (integration with auth register flow)
- [ ] Slice: Unit + integration + E2E tests

#### 2.8 Membership management (CHECKLIST 4.3)

- [ ] Slice: `GET /api/tenants/:id/members` — list members
- [ ] Slice: `POST /api/tenants/:id/members` — add member directly
- [ ] Slice: `PATCH /api/tenants/:id/members/:userId` — change role
- [ ] Slice: `DELETE /api/tenants/:id/members/:userId` — remove member
- [ ] Slice: Owner cannot be removed; minimum one owner per tenant
- [ ] Slice: Unit + integration + E2E tests

#### 2.9 Invitation flow (CHECKLIST 4.4 + 4.8)

- [ ] Slice: `POST /api/tenants/:id/invitations` — create invite + send email
- [ ] Slice: `POST /api/invitations/:token/accept` — accept invite → create membership
- [ ] Slice: `POST /api/tenants/:id/invitations/:id/resend` — resend invitation
- [ ] Slice: `DELETE /api/tenants/:id/invitations/:id` — revoke invitation
- [ ] Slice: `GET /api/tenants/:id/invitations` — list pending invitations
- [ ] Slice: `POST /api/tenants/:id/invitations/:id/regenerate` — new token + new expiry
- [ ] Slice: `expires_at` enforcement — reject expired invitations
- [ ] Slice: Auto-expire cron — mark expired as `expired` status
- [ ] Slice: Max pending invitations per tenant (configurable)
- [ ] Slice: Invitation reminder email — configurable N days before expiry (CHECKLIST 4.8)
- [ ] Slice: Invitation email template
- [ ] Slice: Client UI: invite member flow in workspace settings
- [ ] Slice: Unit + integration + E2E tests

#### 2.10 Orphan prevention & ownership (CHECKLIST 4.5)

- [ ] Slice: Block removal of last owner — reject DELETE if target is sole owner
- [ ] Slice: Block owner self-leave — reject if sole owner, must transfer first
- [ ] Slice: `POST /api/tenants/:id/transfer-ownership` — current owner designates new owner
- [ ] Slice: Cascade on user deletion — if sole owner, transfer to next admin or flag for support
- [ ] Slice: Domain logic in `shared/domain/membership/membership.logic.ts`
- [ ] Slice: Unit + integration tests

#### 2.11 Role hierarchy protection (CHECKLIST 4.6)

- [ ] Slice: `canAssignRole(actorRole, targetRole)` — enforce hierarchy matrix
- [ ] Slice: `canRemoveMember(actorRole, targetRole)` — prevent removing higher-ranked
- [ ] Slice: Enforce in membership PATCH/DELETE handlers
- [ ] Slice: Enforce in invitation create handler (cannot invite as higher role)
- [ ] Slice: Unit tests for every cell in the role matrix

#### 2.12 Domain restrictions (CHECKLIST 4.7)

- [ ] Slice: `allowed_email_domains` column on `tenants` table (string array)
- [ ] Slice: Validate invitation email domain against allowed domains
- [ ] Slice: Validate on membership creation
- [ ] Slice: Admin override: system admins bypass restrictions
- [ ] Slice: Client domain allowlist editor in workspace settings
- [ ] Slice: Unit + integration tests

#### 2.13 Tenant scoping middleware (CHECKLIST 4.9)

- [ ] Slice: Fastify middleware — extract tenant from `x-workspace-id` header, validate membership
- [ ] Slice: `tenant_id` auto-filtering on tenant-scoped queries
- [ ] Slice: Default tenant selection on login
- [ ] Slice: Tenant switcher UI component + header injection in client API
- [ ] Slice: Unit + integration + E2E tests

#### 2.14 RBAC backend enforcement (CHECKLIST 5.2)

- [ ] Slice: Per-operation permission enforcement in handlers
- [ ] Slice: Per-tenant role enforcement middleware (JWT auth + workspace membership)
- [ ] Slice: Resource ownership validation ("is this in the user's tenant?")
- [ ] Slice: Unit + integration tests

#### 2.15 RBAC frontend authorization (CHECKLIST 5.3)

- [ ] Slice: `<Can permission="...">` fine-grained gating component
- [ ] Slice: `usePermissions()` hook
- [ ] Slice: Route guard for admin pages (beyond basic auth)
- [ ] Slice: Conditional menu rendering by role
- [ ] Slice: Hide/disable actions by permission
- [ ] Slice: Unit + E2E tests

---

### Sprint 3: Supporting Modules + Admin + Operational Completeness

> **Goal:** Wire every remaining module, close admin gaps, and reach operational readiness.
> Covers: CHECKLIST 2.6 (security intel), 3.5 (SMS 2FA), 6 (all gaps), 7 (all gaps),
> 8 (gaps), 9, 10, 12 (gaps), 13 (gaps).
> Cross-references: BUSINESS.md Sections 1 (IAM gaps), 3 (Billing), 4 (Communication),
> 5 (System Ops), 6 (Compliance), 7 (Admin Console), 8 (Test Pipelines).
>
> **Execution rule:** Each slice follows Vertical Slice Protocol (contract → service → unit test →
> route → integration test → client hook → UI → E2E test). Infrastructure is horizontal,
> logic is vertical (see EXECUTION.md).
>
> **Note:** Infrastructure/devex slices (3.16, 3.18, 3.19, 3.20, 3.21) follow a reduced protocol
> appropriate to their nature (no client hooks or E2E for backend-only work).

---

#### 3.1 API Keys & Programmatic Access (CHECKLIST 6.1 | BUSINESS 1 IAM)

> **Existing:** `api_keys` table, repository with full CRUD, domain types/schemas.
> **Gap:** Zero HTTP endpoints, zero auth middleware, zero client UI.

**Contract + Service:**

- [ ] Contract: `shared/domain/api-keys/` — request/response schemas for create, list, revoke
- [ ] Service: `core/api-keys/service.ts` — create (hash key, store hash only), list (mask key), revoke
- [ ] Service: key generation — crypto-random, timing-safe comparison for auth
- [ ] Service: scope parsing + validation against allowed scope set

**Routes + Middleware:**

- [ ] Route: `POST /api/users/me/api-keys` — create key (requires sudo), returns plaintext key ONCE
- [ ] Route: `GET /api/users/me/api-keys` — list keys (hash not exposed, shows name + scopes + last used)
- [ ] Route: `DELETE /api/users/me/api-keys/:id` — revoke key (requires sudo)
- [ ] Middleware: `Authorization: Bearer <key>` — authenticate API key requests, timing-safe hash compare
- [ ] Middleware: scope enforcement — reject requests outside key's allowed scopes
- [ ] Security event: log `api_key_created`, `api_key_revoked` events

**Client + UI:**

- [ ] Client API: `client/api/src/api-keys/client.ts` + `hooks.ts` — CRUD hooks
- [ ] UI: API key management page in settings (create with name + scopes, copy-once, revoke)
- [ ] UI: scope selector component (checkbox list of available scopes)

**Tests:**

- [ ] Unit tests: key generation, scope validation, timing-safe compare, service logic
- [ ] Integration tests: create → use → revoke lifecycle, expired key rejection, scope enforcement
- [ ] E2E test: settings → create key → copy → use in API call → revoke → verify rejected

---

#### 3.2 Billing & Subscription Lifecycle (CHECKLIST 6.2 | BUSINESS 3)

> **Existing:** 6 billing tables, admin plan CRUD, Stripe/PayPal webhook routes + providers,
> entitlements domain logic, client UI pages (BillingSettings, Pricing, Checkout Success/Cancel).
> **Gap:** Subscription state machine not wired end-to-end, no checkout flow, no invoicing,
> no upgrade/downgrade, no usage enforcement.

**Subscription Lifecycle (BUSINESS 3.2 + 3.3):**

- [ ] Service: subscription state machine — `trialing` → `active` → `past_due` → `canceled`
- [ ] Service: webhook handlers update subscription state reliably (idempotent, out-of-order safe)
- [ ] Service: Stripe checkout session creation (subscription mode)
- [ ] Service: Stripe customer portal redirect (manage payment method, view invoices)
- [ ] Service: trial start/end transitions, trial expiry cron

**Invoicing (BUSINESS 3.4):**

- [ ] Route: `GET /api/billing/invoices` — list invoices for current user/tenant
- [ ] Route: `GET /api/billing/invoices/:id` — invoice detail
- [ ] Service: sync invoices from Stripe/PayPal webhook events
- [ ] UI: invoice list + detail view in billing settings

**Plan Changes (BUSINESS 3.5):**

- [ ] Route: `POST /api/billing/subscriptions/upgrade` — upgrade plan (immediate or scheduled)
- [ ] Route: `POST /api/billing/subscriptions/downgrade` — downgrade plan (at period end)
- [ ] Route: `POST /api/billing/subscriptions/cancel` — cancel (remains active until period end)
- [ ] Service: proration handling for mid-cycle changes
- [ ] UI: upgrade/downgrade flow with confirmation + proration preview

**Entitlements + Usage Limits (BUSINESS 3.6):**

- [ ] Service: `resolveEntitlements(subscription, role)` → returns feature flags + limits
- [ ] Service: `assertEntitled("feature_x")` — Fastify preHandler middleware
- [ ] Service: seat-based limit enforcement (max users per plan)
- [ ] Service: storage/resource limit enforcement
- [ ] UI: usage bar ("80% of storage used") in billing settings

**Dunning / Failed Payments:**

- [ ] Service: handle `past_due` state — retry logic, grace period
- [ ] Service: notify user on failed payment (email + in-app)
- [ ] Service: downgrade/suspend on prolonged payment failure

**Tests:**

- [ ] Unit: entitlements resolution, plan validation, webhook signature verification, state transitions
- [ ] Integration: plan CRUD, webhook processing → DB state, checkout session creation, entitlement enforcement
- [ ] E2E: view pricing → select plan → checkout → active subscription; upgrade/downgrade; view invoices; cancel

---

#### 3.3 Audit & Events Completeness (CHECKLIST 6.3 | BUSINESS 5.1)

> **Existing:** Security events table (18+ types), event logging on auth actions,
> admin API for list/detail/metrics/export, admin UI (7 components + hooks).
> **Gap:** No workspace-level audit viewer, no retention/cleanup.

**Workspace Audit Viewer:**

- [ ] Route: `GET /api/tenants/:id/audit-events` — tenant-scoped events (paginated, filtered)
- [ ] Service: filter by actor, action, target, date range within tenant scope
- [ ] UI: workspace admin audit log viewer (table + filters + date range picker)
- [ ] UI: audit event detail modal

**General Audit Integration:**

- [ ] Service: `audit.record({ actor, action, target, metadata })` — typed event helper
- [ ] Service: wire audit logging to: billing plan changes, role changes, project CRUD, settings changes
- [ ] Route: `GET /api/admin/audit-events` — system-wide audit log (admin only)

**Retention + Cleanup:**

- [ ] Config: audit log retention period (configurable, default 90 days)
- [ ] Cron: daily cleanup of audit events older than retention period (audit-specific; token/session crons in 3.18, PII crons in 3.16)
- [ ] Cron: archive to cold storage before deletion (optional, config-gated)

**Tests:**

- [ ] Unit: audit event creation (typed events), metrics aggregation, retention logic
- [ ] Integration: events written on actions, admin listing/filtering/export, tenant-scoped isolation
- [ ] E2E: admin → security events dashboard → filter → export; workspace admin → audit log

---

#### 3.4 Communication & Notifications (CHECKLIST 6.4 | BUSINESS 4)

> **Existing:** `notifications` table + routes, `email_templates` + `email_log` tables,
> mailer module (SMTP/console), notification service, push provider (FCM).
> **Gap:** No SMTP config docs, no email templates content, no push integration,
> no preference center, no in-app notification bell, no bounce/unsubscribe.

**Email Setup (BUSINESS 4.3):**

- [ ] Docs: SMTP configuration guide (dev: console provider, staging/prod: SMTP/SES)
- [ ] Service: verify SMTP config on server boot (optional health check)
- [ ] Templates: Welcome email — content + layout
- [ ] Templates: Email Verification — content + layout
- [ ] Templates: Password Reset — content + layout
- [ ] Templates: Workspace Invitation — content + layout
- [ ] Templates: Security Notification (password changed, new device, 2FA disabled) — content + layout

**In-App Notifications (BUSINESS 4.1):**

- [ ] Route: `GET /api/notifications` — list notifications (paginated, unread count)
- [ ] Route: `PATCH /api/notifications/:id/read` — mark as read
- [ ] Route: `POST /api/notifications/read-all` — mark all as read
- [ ] Route: `DELETE /api/notifications/:id` — delete notification
- [ ] Service: notification creation triggered by events (invite, payment, etc.)
- [ ] UI: notification bell icon in header with unread count badge
- [ ] UI: notification dropdown/panel with notification list
- [ ] UI: click notification → navigate to relevant page

**Push Notifications (BUSINESS 4.2):**

- [ ] Route: `POST /api/push/subscribe` — register push subscription (browser/device)
- [ ] Route: `DELETE /api/push/subscribe` — unregister
- [ ] Service: FCM provider integration — send push on notification creation
- [ ] Service: web push (VAPID) for browser notifications

**Notification Preferences (BUSINESS 4.4):**

- [ ] Route: `GET /api/users/me/notification-preferences` — get preferences
- [ ] Route: `PATCH /api/users/me/notification-preferences` — update preferences
- [ ] Service: per-notification-type channel toggles (email, push, in-app)
- [ ] UI: preference center in settings (toggle matrix: notification type x channel)

**Bounce + Unsubscribe:**

- [ ] Service: handle email bounces (soft/hard) — update delivery status
- [ ] Service: one-click unsubscribe header (RFC 8058)
- [ ] Route: `GET /api/email/unsubscribe/:token` — unsubscribe endpoint
- [ ] Service: respect unsubscribe preference in email sending pipeline

**Tests:**

- [ ] Unit: notification service (create, mark read, delete), template rendering, preference evaluation
- [ ] Integration: notification CRUD, email delivery (console provider), push lifecycle, preferences
- [ ] E2E: trigger action → bell shows alert → click → navigate; toggle preferences; transactional email

---

#### 3.5 File Storage Endpoints (CHECKLIST 6.5)

> **Existing:** `files` table + repo, S3 + local storage providers, media processing pipeline.
> **Gap:** No HTTP endpoints for file operations, avatar upload wiring unclear.

**Routes:**

- [ ] Route: `POST /api/files/upload` — multipart file upload (validate type + size → store → create `files` record)
- [ ] Route: `GET /api/files/:id` — file metadata + download URL (presigned if S3)
- [ ] Route: `DELETE /api/files/:id` — delete file (owner or admin only)
- [ ] Route: `GET /api/files/:id/download` — direct download (presigned redirect or stream)

**Avatar Pipeline Verification:**

- [ ] Verify: `PUT /api/users/me/avatar` → multipart → validate → resize → store to S3/local → update user record
- [ ] Verify: `DELETE /api/users/me/avatar` → remove file → update user record
- [ ] Verify: fallback chain — custom upload → Gravatar → generated initials

**Tests:**

- [ ] Unit: file type validation, size limits, presigned URL generation
- [ ] Integration: upload → store → retrieve → delete lifecycle; avatar upload pipeline
- [ ] E2E: upload file → see in list → download → delete

---

#### 3.6 Activity Tracking (CHECKLIST 6.6)

> **Existing:** `activities` table + repository, partial domain logic.
> **Gap:** No handler integration, no feed endpoint, no UI.

- [ ] Contract: `shared/domain/activities/` — activity event types, request/response schemas
- [ ] Service: `core/activities/service.ts` — log activity, query feed (filtered, paginated)
- [ ] Service: wire activity logging to key handlers (user CRUD, membership changes, billing events)
- [ ] Route: `GET /api/activities` — activity feed for current user (global)
- [ ] Route: `GET /api/tenants/:id/activities` — tenant-scoped activity feed
- [ ] UI: activity feed component (timeline view)
- [ ] UI: activity feed page or sidebar widget

**Tests:**

- [ ] Unit: activity creation, feed query logic, filtering
- [ ] Integration: trigger action → activity logged → feed endpoint returns it
- [ ] E2E: perform action → see it in activity feed

---

#### 3.7 Feature Flags & Usage Metering (CHECKLIST 6.7 | BUSINESS 5.4 + 5.5)

> **Existing:** `feature_flags` + `tenant_feature_overrides` tables + repos,
> `usage_metrics` + `usage_snapshots` tables + repos.
> **Gap:** No evaluation middleware, no admin UI, no metering integration.

**Feature Flags (BUSINESS 5.4):**

- [ ] Service: `evaluateFlag(flagKey, tenantId?)` — check flag value with tenant override
- [ ] Middleware: Fastify preHandler — gate routes/features behind flags
- [ ] Route: `GET /api/admin/feature-flags` — list all flags
- [ ] Route: `POST /api/admin/feature-flags` — create flag
- [ ] Route: `PATCH /api/admin/feature-flags/:id` — update flag (enable/disable, rollout %)
- [ ] Route: `DELETE /api/admin/feature-flags/:id` — delete flag
- [ ] Route: `PUT /api/admin/tenants/:id/feature-overrides/:flagId` — set tenant override
- [ ] UI: admin feature flag management page (list, create, toggle, rollout slider)
- [ ] UI: tenant-level override editor in workspace admin

**Usage Metering (BUSINESS 5.5):**

- [ ] Service: `recordUsage(metricKey, tenantId, delta)` — increment counter
- [ ] Service: `getUsage(metricKey, tenantId, period)` — query usage for billing period
- [ ] Service: snapshot cron — daily/hourly snapshots of usage counters
- [ ] Service: integrate with entitlements — `assertWithinLimit("storage", tenantId)`
- [ ] Route: `GET /api/tenants/:id/usage` — current usage summary
- [ ] UI: usage dashboard in workspace settings (bar charts per metric)

**Tests:**

- [ ] Unit: flag evaluation (global, tenant override, rollout %), usage recording + querying
- [ ] Integration: flag CRUD, tenant override, metering record → query → snapshot
- [ ] E2E: admin toggles flag → feature gated/ungated; usage bar updates after action

---

#### 3.8 Compliance & Data Privacy (CHECKLIST 6.8 | BUSINESS 6)

> **Existing:** `legal_documents`, `user_agreements`, `consent_logs` tables + repos,
> `data_export_requests` table + repo, deletion domain logic + schemas.
> **Gap:** No endpoints, no consent UI, no export workflow, no right-to-be-forgotten implementation.

**Terms of Service (BUSINESS 6.1):**

> ToS gating middleware is in Sprint 1.6. This covers the admin + consent recording side.

- [ ] Route: `GET /api/legal/current` — get current ToS + privacy policy versions
- [ ] Route: `POST /api/agreements/accept` — record user acceptance of current version
- [ ] Route: `GET /api/users/me/agreements` — list user's accepted agreements
- [ ] UI: ToS acceptance modal (triggered by 403 `TOS_ACCEPTANCE_REQUIRED`)
- [ ] Admin route: `POST /api/admin/legal/publish` — publish new ToS version

**Consent Management (BUSINESS 6.2):**

- [ ] Route: `GET /api/users/me/consent` — current consent preferences
- [ ] Route: `PATCH /api/users/me/consent` — update consent preferences (analytics, marketing)
- [ ] Service: consent versioning — track what was consented to and when
- [ ] UI: consent preferences in settings (toggles for analytics, marketing, functional cookies)
- [ ] UI: cookie consent banner on first visit (if applicable)

**Data Export — Right to Portability (BUSINESS 6.3):**

- [ ] Route: `POST /api/users/me/export` — request data export (requires sudo)
- [ ] Service: background job — aggregate user data from all tables (profile, activities, notifications, files, billing)
- [ ] Service: generate JSON/ZIP archive
- [ ] Service: email download link when ready (signed URL, 24h expiry)
- [ ] Route: `GET /api/users/me/export/:id/status` — check export status
- [ ] Route: `GET /api/users/me/export/:id/download` — download export (presigned)
- [ ] UI: data export request button in settings → status indicator → download link

**Account Deletion — Right to be Forgotten (BUSINESS 6.4):**

> Self-service deletion API is in Sprint 2.6. This covers the handlers/routes that feed into Sprint 3.16 crons.

- [ ] Service: deletion request handler — validate grace period, send confirmation email
- [ ] Service: reactivation handler — cancel pending deletion within grace period
- [ ] Route: confirm wiring of `POST /api/users/me/delete` → `POST /api/users/me/reactivate`
- [ ] UI: deletion request status indicator in settings (countdown to permanent deletion)

**Tests:**

- [ ] Unit: deletion logic (grace period, anonymization rules), export aggregation, consent versioning
- [ ] Integration: export request → job queued → archive generated; ToS gating + acceptance; consent CRUD
- [ ] E2E: request export → receive download; accept ToS modal; toggle consent preferences

---

#### 3.9 Realtime Client Completeness (CHECKLIST 6.9)

> **Existing:** Full server module tested + routes registered, client hooks + WebSocketPubSubClient.
> **Gap:** No reconnection, no offline queue integration.

- [ ] Client: automatic reconnection with exponential backoff on disconnect
- [ ] Client: offline queue — buffer outgoing messages during disconnect, flush on reconnect
- [ ] Client: missed-message recovery — request delta sync after reconnect
- [ ] Client: connection status indicator component (connected/reconnecting/offline)

**Tests:**

- [ ] Unit: reconnection logic, offline queue buffering, delta sync request
- [ ] Integration: WebSocket connect → auth → subscribe → receive published message
- [ ] E2E: two browser tabs → action in tab A → real-time update in tab B; disconnect → reconnect → sync

---

#### 3.10 Media HTTP Endpoints (CHECKLIST 6.11)

> **Existing:** Full media processing pipeline (image, audio, video) with tests,
> media queue with retry, file type detection + validation.
> **Gap:** No HTTP endpoints, no client integration.

**Routes:**

- [ ] Route: `POST /api/media/upload` — multipart upload → file type validation → queue processing job
- [ ] Route: `GET /api/media/:id` — media metadata + processed URLs (thumbnails, transcoded)
- [ ] Route: `DELETE /api/media/:id` — delete media + processed artifacts
- [ ] Route: `GET /api/media/:id/status` — processing job status (pending/processing/complete/failed)

**Client Integration:**

- [ ] Client API: `client/api/src/media/client.ts` + `hooks.ts` — upload, status polling, delete
- [ ] UI: upload component with drag-and-drop + progress indicator
- [ ] UI: processing status indicator (spinner → thumbnail preview)
- [ ] UI: media library/gallery component (grid of uploaded media)

**Tests:**

- [ ] Unit: upload validation, processing job creation, status transitions
- [ ] Integration: upload → queue → process → retrieve processed media; reject invalid types
- [ ] E2E: upload image → see processing → see thumbnail; upload invalid file → see error

---

#### 3.11 User Settings Completeness (CHECKLIST 7.1 | BUSINESS 1 IAM)

> **Existing:** ProfileForm, AvatarUpload, PasswordChangeForm, SessionsList,
> SessionCard, OAuthConnectionsList + hooks.
> **Gap:** No preferences page, no data controls, no API key management page,
> no TOTP management wiring.

**Preferences Page:**

- [ ] Route: `GET /api/users/me/preferences` — get user preferences
- [ ] Route: `PATCH /api/users/me/preferences` — update preferences
- [ ] Service: preferences schema — theme (light/dark/system), locale, timezone, date format
- [ ] UI: preferences settings page (theme selector, timezone picker, locale dropdown)
- [ ] UI: notification preferences section (link to notification preference center from 3.4)

**Data Controls Page:**

- [ ] UI: data export section — request export button, export history list (from 3.8)
- [ ] UI: account deletion section — danger zone with deactivate/delete buttons (from Sprint 2.6)
- [ ] UI: confirmation dialogs with countdown for destructive actions

**API Key Management:**

- [ ] UI: API keys section in settings — list keys, create new, revoke (from 3.1)
- [ ] UI: key creation dialog — name input, scope checkboxes, copy-once modal

**TOTP Management:**

- [ ] UI: wire existing TOTP management components to settings security tab
- [ ] UI: show QR code during TOTP setup (in addition to manual secret entry — CHECKLIST 1.10 gap)
- [ ] UI: backup codes display + regenerate flow

**Settings Navigation:**

- [ ] UI: settings page sidebar/tabs — Profile, Security, Sessions, Preferences, Notifications, Data, API Keys
- [ ] UI: ensure all sub-pages are routed and navigable

**Tests:**

- [ ] E2E: navigate through all settings tabs; save/load preferences; manage API keys; configure 2FA

---

#### 3.12 Workspace Admin (CHECKLIST 7.2 | BUSINESS 2 + 7)

> **Existing:** Sprint 2 builds tenant CRUD + memberships + invitations (backend).
> This sprint builds the workspace admin UI that consumes those APIs.

**Members + Invitations UI:**

- [ ] UI: members list page — table with role badges, last active, actions menu
- [ ] UI: invite member dialog — email input, role selector, send
- [ ] UI: pending invitations list — resend / revoke buttons
- [ ] UI: member detail — change role dropdown, remove member button
- [ ] UI: confirmation dialogs for destructive membership actions

**Role Management UI:**

- [ ] UI: role badges with color coding (owner/admin/member/viewer)
- [ ] UI: role change dropdown — only show assignable roles based on current user's role
- [ ] UI: permission gating — hide actions current user cannot perform (from Sprint 2.15)

**Workspace Settings:**

- [ ] UI: workspace settings page — edit name, slug, logo upload
- [ ] UI: workspace logo upload (reuse avatar upload pattern)
- [ ] UI: danger zone — delete workspace (requires owner + sudo)

**Workspace Billing:**

- [ ] UI: current plan display + upgrade/downgrade buttons (links to billing flow from 3.2)
- [ ] UI: invoice list for workspace (from 3.2)
- [ ] UI: "Manage Payment Method" button → Stripe customer portal redirect

**Workspace Audit Log:**

- [ ] UI: audit log viewer for workspace (from 3.3 — `GET /api/tenants/:id/audit-events`)
- [ ] UI: filterable table with actor, action, timestamp, detail link

**Workspace Feature Overrides:**

- [ ] UI: feature flag overrides list (from 3.7 — tenant override CRUD)
- [ ] UI: toggle overrides per flag for this workspace

**Domain Restrictions:**

- [ ] UI: allowed email domains editor (add/remove domains from allowlist)
- [ ] UI: domain validation feedback (reject invalid domain formats)

**Tests:**

- [ ] E2E: invite member → accept → appears in list; change role; remove member; edit workspace settings

---

#### 3.13 System Admin Completeness (CHECKLIST 7.3 | BUSINESS 7)

> **Existing:** User list/detail/lock, security events UI (7 components), job monitor,
> billing plan management, admin layout, admin API.
> **Gap:** No universal user search, no tenant management, no webhook monitor,
> no feature flag admin, no health dashboard.

**User Support (BUSINESS 7.1):**

- [ ] Route: `GET /api/admin/users/search` — search by email, name, UUID, stripe_customer_id (multi-field)
- [ ] UI: universal search bar in admin — searches across all user fields
- [ ] UI: search results with quick-action buttons (view detail, lock, impersonate)
- [ ] Service: fuzzy/partial matching for names, exact for UUID/email

**Tenant Management (BUSINESS 7.2):**

- [ ] Route: `GET /api/admin/tenants` — list all tenants (paginated, filtered)
- [ ] Route: `GET /api/admin/tenants/:id` — tenant detail (members, plan, usage)
- [ ] Route: `PATCH /api/admin/tenants/:id` — update tenant (name, plan override)
- [ ] Route: `POST /api/admin/tenants/:id/suspend` — suspend tenant (blocks all member access)
- [ ] Route: `POST /api/admin/tenants/:id/unsuspend` — restore tenant access
- [ ] UI: tenant list page with search + filters (plan, status, member count)
- [ ] UI: tenant detail page — members, plan, usage, billing, audit trail
- [ ] UI: plan override selector — assign specific plan to tenant

**Webhook Monitor + Replay:**

- [ ] Route: `GET /api/admin/webhooks` — list registered webhooks
- [ ] Route: `GET /api/admin/webhooks/:id/deliveries` — delivery history (success/fail/retry)
- [ ] Route: `POST /api/admin/webhooks/:id/deliveries/:deliveryId/replay` — replay failed delivery
- [ ] UI: webhook list with status indicators
- [ ] UI: delivery log with retry/replay buttons

**Feature Flag Admin:**

- [ ] UI: system-wide feature flag management page (from 3.7 admin routes)
- [ ] UI: create/edit flag dialog — name, description, enabled, rollout %
- [ ] UI: per-tenant override table

**System Health Dashboard (BUSINESS 7.3):**

- [ ] Route: `GET /api/admin/health` — aggregated system health (DB, cache, queue, storage)
- [ ] UI: health dashboard page — component status cards (green/yellow/red)
- [ ] UI: job queue stats widget (pending, processing, failed counts + charts)
- [ ] UI: recent error log widget (last N errors with stack traces)
- [ ] UI: active connections count (WebSocket, HTTP)

**Tests:**

- [ ] Unit: multi-field search, tenant suspension logic
- [ ] Integration: admin user CRUD, tenant CRUD, webhook replay, health endpoint
- [ ] E2E: admin searches user → views detail → locks; admin manages tenants; admin views health

---

#### 3.14 Impersonation / Shadow Login (CHECKLIST 7.4 | BUSINESS 7.1)

> **Existing:** Nothing. Entirely new feature.
> **Purpose:** Allow admin/support to see the app as a specific user for debugging.

**Contract + Service:**

- [ ] Contract: `shared/domain/admin/impersonation.schemas.ts` — request/response types
- [ ] Service: `core/admin/impersonation.ts` — generate scoped token, validate target user
- [ ] Service: impersonation token includes `impersonator_id`, `target_user_id`, short TTL (30 min)
- [ ] Service: safety guard — cannot impersonate other admins or system accounts
- [ ] Service: rate limit — max N impersonations per admin per hour (configurable)

**Routes:**

- [ ] Route: `POST /api/admin/impersonate/:userId` — start impersonation (admin only)
- [ ] Route: `POST /api/admin/impersonate/end` — end impersonation session

**Audit Trail:**

- [ ] Security event: `admin_impersonation_start` — logged with impersonator + target
- [ ] Security event: `admin_impersonation_end`
- [ ] Service: all actions during impersonation tagged with `impersonated_by` in audit log
- [ ] Service: impersonated requests carry both admin identity and target user identity

**Client + UI:**

- [ ] Client: impersonation state management (store impersonator context)
- [ ] UI: impersonation banner — "Viewing as user@example.com — End Session" (sticky, prominent)
- [ ] UI: end impersonation button → returns to admin view
- [ ] UI: visual indicator on all pages during impersonation (colored border or overlay)
- [ ] UI: admin user detail page — "Impersonate" button

**Tests:**

- [ ] Unit: token generation, safety guards, rate limiting, audit tagging
- [ ] Integration: start → perform actions → verify audit trail → end; admin-only enforcement
- [ ] E2E: admin impersonates user → sees user's dashboard → sees banner → ends session → returns to admin

---

#### 3.15 Soft Ban / Hard Ban (CHECKLIST 7.5)

> **Existing:** Soft ban (lock/unlock) exists with `isAccountLocked()` check.
> **Gap:** No lock reason, no timed locks, no notification emails, no hard ban.

**Soft Ban Enhancements:**

- [ ] DB: `lock_reason` column on `users` (or separate `account_locks` table)
- [ ] DB: `locked_until` column — nullable, null = permanent lock
- [ ] Route: `POST /api/admin/users/:id/lock` — add `reason` + optional `duration` params
- [ ] Service: timed auto-unlock — check `locked_until` on login; cron to clear expired locks
- [ ] Service: lock reason displayed to user on login attempt ("Your account has been suspended. Reason: ...")
- [ ] Service: notification email on lock/unlock (to user)
- [ ] UI: admin lock dialog — reason input + duration selector (permanent / 1h / 24h / 7d / 30d / custom)
- [ ] UI: user-facing lock message on login page

**Hard Ban:**

- [ ] Route: `POST /api/admin/users/:id/hard-ban` — schedule permanent deletion
- [ ] Service: admin confirmation required (re-enter password or 2FA via sudo)
- [ ] Service: immediate actions — revoke all sessions + tokens
- [ ] Service: cancel active subscriptions (via billing provider API)
- [ ] Service: remove from all tenant memberships (respecting orphan prevention from Sprint 2.10)
- [ ] Service: grace period before hard delete (configurable, default 7 days)
- [ ] Service: notification email — "Your account has been permanently suspended"
- [ ] Background job: anonymize PII after grace period (hash email, clear profile, preserve audit structure)
- [ ] UI: admin hard-ban dialog with confirmation + grace period display

**Tests:**

- [ ] Unit: lock reason storage, timed lock expiry, hard ban cascade rules
- [ ] Integration: lock → login blocked → unlock → login allowed; hard ban → sessions revoked → data scheduled for deletion
- [ ] E2E: admin locks user → user sees reason on login; admin hard-bans → cascading effects verified

---

#### 3.16 Data Hygiene — Background Jobs + Crons (CHECKLIST 9.1 + 9.2 | BUSINESS 6.4)

> Self-service deletion API + UI live in Sprint 2.6 (Account Lifecycle).
> This slice covers the background enforcement: crons, anonymization, and cleanup.

**Soft Delete Enforcement:**

- [ ] Service: soft-deleted users — block login (`isDeleted()` check alongside `isLocked()`)
- [ ] Service: hide soft-deleted users from search results and member lists
- [ ] Service: preserve audit trail — soft-deleted user's events remain queryable by admin

**PII Anonymization Cron (BUSINESS 6.4):**

- [ ] Cron (daily): find users where `deleted_at > 30 days` (configurable grace period)
- [ ] Service: anonymize PII — replace email with hash, clear first/last name, clear phone, clear bio
- [ ] Service: preserve audit log structure — replace actor names with "Deleted User (hash)"
- [ ] Service: foreign key safety — audit logs, invoices, activity history must not break
- [ ] Service: delete stored files (avatars, uploads) associated with anonymized users
- [ ] Service: log cleanup counts to metrics/audit (N users anonymized per run)

**Unverified User Cleanup (CHECKLIST 9.2):**

- [ ] Cron (daily): hard-delete users registered > 7 days ago with `email_verified_at = null`
- [ ] Service: exclude OAuth-only users (verified via provider, may have no email verification)
- [ ] Service: exclude users with active sessions (edge case: logged in but unverified)
- [ ] Service: log cleanup counts to metrics

**Tests:**

- [ ] Unit: anonymization rules, grace period calculation, foreign key safety checks
- [ ] Integration: soft-delete user → cron runs → PII anonymized → audit trail intact
- [ ] Integration: create unverified user → wait past threshold → cron deletes → user gone

> **Note:** Token/session cleanup crons (login-cleanup, magic-link-cleanup, push-cleanup, etc.)
> are consolidated in Sprint 3.18 (Backend Infrastructure). This slice owns only PII/data hygiene.

---

#### 3.17 Operational Quality (CHECKLIST 10 | BUSINESS 5)

> **Existing:** Health endpoints (tested), correlation IDs middleware.
> **Gap:** No Sentry, no metrics, no OpenAPI, no auth-protected docs.

**Health + Readiness:**

- [ ] Verify: `GET /health` — returns server health (up/degraded/down)
- [ ] Verify: `GET /ready` — returns readiness (DB connected, cache warm, queue running)
- [ ] Service: health check includes all subsystems (DB, cache, queue, storage, email)
- [ ] Verify: correlation ID appears in log output for all requests

**Error Reporting:**

- [ ] Service: Sentry integration — error capture with context (user, request, correlation ID)
- [ ] Service: config-gated: `config.observability.sentry.dsn`
- [ ] Service: breadcrumbs for request lifecycle (auth, DB, external calls)
- [ ] Client: Sentry browser SDK integration (error boundary → Sentry)

**Metrics:**

- [ ] Service: request count + latency metrics (per route, per status code)
- [ ] Service: job queue metrics (pending, processing, completed, failed per queue)
- [ ] Service: auth metrics (login attempts, success rate, lockouts per period)
- [ ] Route: `GET /api/admin/metrics` — metrics summary endpoint (admin only)
- [ ] Service: metrics export format (Prometheus-compatible or JSON)

**API Documentation:**

- [ ] Service: OpenAPI/Swagger spec generation from Zod schemas + route definitions
- [ ] Route: `GET /api/docs` — Swagger UI (dev only by default)
- [ ] Service: auth-protect docs endpoint in non-dev environments
- [ ] Service: auto-generate from existing route registrations

**Background Job Verification (BUSINESS 5.2):**

- [ ] Verify: job queue processes enqueued items end-to-end (enqueue → dequeue → process → success)
- [ ] Verify: failed jobs retry with exponential backoff, dead-letter after max retries
- [ ] Verify: admin job monitor reflects real job state (pending, processing, completed, failed)

**Tests:**

- [ ] Integration: health/ready endpoints return correct status; metrics endpoint returns data
- [ ] Integration: job queue lifecycle — enqueue → process → success callback; failure → retry → dead-letter

---

#### 3.18 Backend Infrastructure Gaps (CHECKLIST 8 Gaps + Appendix C)

> **Existing:** Job system complete (types, client, writer, memory store).
> **Gap:** No scheduled jobs, no IP allowlisting, no webhook signing,
> no generated API client, no module scaffold CLI.

**Scheduled Cleanup Jobs (Appendix C):**

- [ ] Job: `login-cleanup` — purge expired login attempts (daily)
- [ ] Job: `magic-link-cleanup` — purge expired magic link tokens (daily)
- [ ] Job: `oauth-refresh` — proactively renew expiring OAuth tokens (hourly)
- [ ] Job: `push-cleanup` — purge stale push subscriptions (weekly)
- [ ] Job: `session-cleanup` — purge stale/expired sessions (daily)
- [ ] Service: job registration on server boot (schedule via cron expressions)

**Security:**

- [ ] Middleware: IP allowlisting for admin routes (configurable allowlist in config)
- [ ] Middleware: IP blocklist/reputation hooks — per-route policy config (Appendix E.5)
- [ ] Service: request signing for webhook delivery (HMAC-SHA256 signature in headers)
- [ ] Service: webhook signature verification on receiving end (example implementation)
- [ ] Service: idempotent webhook receiving — store event IDs, ignore duplicates, safe out-of-order handling (Appendix D)
- [ ] Service: file upload scanning hooks — extensible middleware for malware/script detection (Appendix E.7)
- [ ] Docs: secret rotation guidelines — JWT secrets, API keys, OAuth client secrets, env patterns (Appendix E.7)

**Developer Experience:**

- [ ] Tool: generated API client package — auto-generate typed fetch client from route definitions
- [ ] Tool: module scaffold CLI — `pnpm scaffold:module <name>` → creates handler, service, route, test stubs
- [ ] Tool: `pnpm db:reset` — convenience command to drop + recreate + migrate + seed dev DB (Appendix E.6)

**Tests:**

- [ ] Unit: job scheduling, IP allowlist matching, webhook signature generation/verification
- [ ] Integration: scheduled jobs execute on schedule; IP allowlist blocks/allows correctly

---

#### 3.19 Desktop App Gaps (CHECKLIST 12)

> **Existing:** Electron main process, preload script, IPC handlers, React entry point.
> **Gap:** No auto-updater, no native menu, no deep link handling.

- [ ] Feature: auto-updater integration (electron-updater or similar)
- [ ] Feature: native menu bar (File, Edit, View, Window, Help)
- [ ] Feature: system tray icon + menu (minimize to tray, quick actions)
- [ ] Feature: deep link handling (`abe-stack://` protocol registration)
- [ ] Feature: deep link routing → navigate to specific page in renderer

**Tests:**

- [ ] Manual: auto-update flow (mock update server); deep link → correct page; tray actions work

---

#### 3.20 CI/CD Gaps (CHECKLIST 13.3)

> **Existing:** CI, deploy, security, audit, rollback, infra workflows all working.
> **Gap:** No staging environment, no PR preview deployments.

**Staging Environment:**

- [ ] Workflow: `staging.yml` — deploy to staging on merge to `staging` branch (or manually triggered)
- [ ] Infra: staging environment Terraform config (mirrors prod, smaller resources)
- [ ] Service: staging-specific env vars (separate DB, separate Stripe test keys)
- [ ] Docs: staging environment setup guide

**Preview Deployments:**

- [ ] Workflow: `preview.yml` — deploy PR branch to temporary preview environment
- [ ] Service: unique preview URL per PR (e.g., `pr-123.preview.abe-stack.dev`)
- [ ] Service: auto-cleanup preview environment on PR close/merge
- [ ] Workflow: comment preview URL on PR automatically

---

#### 3.21 Storybook (CHECKLIST 12)

> **Existing:** `src/apps/storybook/` directory exists but empty.
> **Gap:** No config, no stories.

- [ ] Config: Storybook setup — `main.ts`, `preview.ts`, Vite builder
- [ ] Config: theme integration — wrap stories in `ThemeProvider`
- [ ] Stories: elements — Button, Input, Text, Heading, Badge, Alert, Spinner, Checkbox, Switch
- [ ] Stories: components — Card, Dialog, Dropdown, Select, Tabs, Toast, Popover, FormField
- [ ] Stories: layouts — AuthLayout, Container, Modal, AppShell, ResizablePanel
- [ ] Stories: patterns — forms, navigation, data tables, loading states
- [ ] CI: Storybook build step in CI pipeline (validate stories compile)

---

#### 3.22 Frontend UX Polish (CHECKLIST 8 Frontend Gaps)

- [ ] Slice: command palette (Ctrl+K) — search pages, actions, settings (defer if not blocking launch)
- [ ] Verify: tenant switcher component renders correctly (built in Sprint 2.13; polish UX if needed)
- [ ] Slice: onboarding flow — create workspace → invite teammate → pick plan → first success moment (BUSINESS Appendix E.8)

---

#### 3.23 Security Intelligence & Device Detection (CHECKLIST 2.6)

> **Existing:** Login handler already logs IP + user agent per session. `security_events` table exists.
> `isNewDevice` check exists in `handleLogin` (compares IP + UA against active sessions).
> **Gap:** No geo-IP lookup, no trusted device tracking, no "new login" banner in UI,
> no token version invalidation for compromised devices.

**Backend — Detection + Storage:**

- [ ] Service: geo-IP coarse lookup — resolve IP → country/region (use MaxMind GeoLite2 or IP-API fallback)
- [ ] Schema: `trusted_devices` table — `user_id`, `device_fingerprint` (IP + UA hash), `label`, `first_seen`, `last_seen`, `trusted_at`
- [ ] Repository: `trusted_devices` CRUD — create, findByUser, markTrusted, revoke
- [ ] Service: device fingerprint helper — deterministic hash of IP + UA (or subset)
- [ ] Service: `isNewDevice()` → check `trusted_devices`, not just active sessions
- [ ] Service: `flagSuspiciousLogin()` — create security event when login from new country/region
- [ ] Security event types: `new_device_login`, `suspicious_location`, `device_trusted`, `device_revoked`

**Backend — Token Version Invalidation:**

> Note: This is distinct from Sprint 1.2's "max concurrent sessions" (limit N active sessions).
> Token version invalidation forces ALL sessions to re-authenticate after security events.

- [ ] Schema: add `token_version` column to `users` table (integer, default 0)
- [ ] Service: increment `token_version` on password change, force logout, or admin action
- [ ] Middleware: JWT validation checks `token_version` matches DB — reject stale tokens
- [ ] Route: `POST /api/auth/invalidate-sessions` — increment version, revoke all refresh families

**Backend — Alerts:**

- [ ] Email template: "New login from {location}" alert (already partially wired in `sendNewLoginAlert`)
- [ ] Route: `GET /api/users/me/devices` — list trusted + recent devices
- [ ] Route: `POST /api/users/me/devices/:id/trust` — mark device as trusted
- [ ] Route: `DELETE /api/users/me/devices/:id` — revoke trusted device

**Client + UI:**

- [ ] Client API: `devices/client.ts` — list, trust, revoke hooks
- [ ] UI: Trusted Devices section in Settings → Sessions tab
- [ ] UI: "New device login" banner — shown when `isNewDevice` flag is set on auth response
- [ ] UI: Device list with location, last seen, trust/revoke actions

**Tests:**

- [ ] Unit tests: device fingerprint generation, geo-IP lookup mock, token version check
- [ ] Integration tests: new device detection → security event created, token invalidation flow
- [ ] E2E test: login → see new device banner → trust device → banner gone on next login

---

#### 3.24 Phone / SMS Two-Factor Authentication (CHECKLIST 3.5 | BUSINESS 1.9)

> **Existing:** TOTP 2FA is fully implemented. SMS provider skeleton in `server/engine/src/sms/`.
> Migration `0023_sms_verification.sql` exists but may need review.
> **Gap:** No SMS sending service, no phone number management, no SMS-based 2FA challenge flow.

**Backend — SMS Provider:**

- [ ] Service: `sms/provider.ts` — interface `SmsProvider { send(to, body): Promise<void> }`
- [ ] Service: `sms/console-provider.ts` — dev provider that logs SMS to console
- [ ] Service: `sms/twilio-provider.ts` — Twilio integration (env: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`)
- [ ] Config: `auth.sms` config section — `provider`, `codeLength` (6), `codeExpirySeconds` (300), `maxAttempts` (3)
- [ ] Factory: `createSmsProvider(config)` — returns console or Twilio based on config

**Backend — Phone Number Management:**

- [ ] Schema: add `phone_number` + `phone_verified_at` columns to `users` table
- [ ] Route: `POST /api/users/me/phone` — set phone number, send verification code
- [ ] Route: `POST /api/users/me/phone/verify` — verify phone with code
- [ ] Route: `DELETE /api/users/me/phone` — remove phone number (requires sudo)
- [ ] Service: rate limit SMS sends per user (max 3/hour, 10/day)

**Backend — SMS 2FA Challenge:**

- [ ] Service: `sendSms2faCode(userId)` — generate code, store hash, send SMS
- [ ] Service: `verifySms2faCode(userId, code)` — timing-safe compare, mark used
- [ ] Schema: `sms_verification_codes` table — `user_id`, `code_hash`, `expires_at`, `attempts`, `used_at`
- [ ] Route: `POST /api/auth/sms/send` — send SMS 2FA code during login challenge
- [ ] Route: `POST /api/auth/sms/verify` — verify SMS code, complete login
- [ ] Integration: login handler — if user has SMS 2FA enabled (no TOTP), return SMS challenge

**Client + UI:**

- [ ] Client API: `sms/client.ts` — phone management + SMS 2FA hooks
- [ ] UI: Phone number management in Settings → Security tab
- [ ] UI: SMS 2FA setup flow — enter number → verify → enable as 2FA method
- [ ] UI: SMS 2FA login challenge screen — "Enter the code sent to +1\*\*\*1234"

**Tests:**

- [ ] Unit tests: SMS code generation, rate limiting, timing-safe verify, provider factory
- [ ] Integration tests: phone verification flow, SMS 2FA login challenge end-to-end
- [ ] E2E test: settings → add phone → verify → enable SMS 2FA → login with SMS code

---

#### 3.25 Webhook Delivery System (BUSINESS 5.3 | CHECKLIST Appendix D)

> **Existing:** `webhooks` table + `webhook_deliveries` table (DB complete). Webhook monitor +
> replay UI in Sprint 3.13. Request signing in Sprint 3.18.
> **Gap:** No webhook registration CRUD, no event subscription, no actual delivery service
> (send HTTP POST to registered URLs when events occur), no retry pipeline.

**Backend — Webhook Registration:**

- [ ] Route: `POST /api/webhooks` — register webhook endpoint (URL, secret, event types)
- [ ] Route: `GET /api/webhooks` — list registered webhooks for current tenant
- [ ] Route: `GET /api/webhooks/:id` — webhook detail with delivery stats
- [ ] Route: `PATCH /api/webhooks/:id` — update URL, events, enabled/disabled
- [ ] Route: `DELETE /api/webhooks/:id` — remove webhook registration
- [ ] Route: `POST /api/webhooks/:id/rotate-secret` — rotate shared secret (requires sudo)

**Backend — Event Subscription + Delivery:**

- [ ] Service: event type registry — define subscribable events (user.created, invoice.paid, etc.)
- [ ] Service: webhook dispatcher — on event, find matching subscriptions, enqueue delivery jobs
- [ ] Service: delivery worker — POST payload to URL with HMAC-SHA256 signature header
- [ ] Service: retry with exponential backoff (1m, 5m, 30m, 2h, 12h) — max 5 retries
- [ ] Service: dead-letter after max retries — mark webhook as failing, alert admin
- [ ] Service: delivery log — store request/response/status/timing per delivery attempt

**Client + UI:**

- [ ] Client API: `webhooks/client.ts` — CRUD hooks for webhook management
- [ ] UI: Webhook management page — create, list, edit, delete webhooks
- [ ] UI: Webhook detail — delivery log with success/failure indicators, replay button

**Tests:**

- [ ] Unit: signature generation, retry backoff calculation, event matching, payload serialization
- [ ] Integration: register webhook → trigger event → delivery queued → POST sent → logged
- [ ] Integration: endpoint failure → retry scheduled → eventual dead-letter
- [ ] E2E: admin → create webhook → trigger event → see delivery in log

---

#### Sprint 3 Cross-Reference Summary

> Maps Sprint 3 items to BUSINESS.md sections for completeness verification.

| BUSINESS.md Section       | Sprint 3 Items                                                                     | Coverage                                                               |
| ------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1. IAM (gaps)             | 3.1 API Keys, 3.11 Settings, 3.23 Security Intel, 3.24 SMS 2FA                     | Full                                                                   |
| 2. Team & Workspace (UI)  | 3.12 Workspace Admin                                                               | UI layer only (backend in Sprint 2)                                    |
| 3. Billing & Monetization | 3.2 Billing Lifecycle                                                              | Full (checkout, recurring, invoicing, upgrade/downgrade, usage limits) |
| 4. Communication          | 3.4 Notifications                                                                  | Full (in-app, push, email, preferences)                                |
| 5. System Operations      | 3.3 Audit, 3.6 Activity, 3.7 Flags+Metering, 3.17 Ops, 3.18 Backend, 3.25 Webhooks | Full (audit, jobs, webhook delivery, flags, metering, health)          |
| 6. Compliance & Legal     | 3.8 Compliance, 3.16 Data Hygiene                                                  | Full (ToS, consent, export, deletion)                                  |
| 7. Business Admin Console | 3.13 System Admin, 3.14 Impersonation, 3.15 Bans                                   | Full (user support, tenant mgmt, health)                               |
| 8. Test Pipelines         | Each item includes unit + integration + E2E                                        | Inline per slice; backfill in Sprint 4                                 |

---

## Slice Template (Copy/Paste)

Use this block when starting a slice. Keep it tight and check it in with the code.

```md
## Slice: <name>

- [ ] DB artifacts (if applicable):
  - [ ] migrations: <sql file(s)>
  - [ ] schema const: <schema file(s)>
  - [ ] repository: <repo file(s)>
  - [ ] seed: <seed touches it?> (yes/no)
- [ ] Contract: <shared file(s)>
- [ ] Handler: <core file(s)>
- [ ] Unit tests: <colocated test file(s)> (e.g., `handler.test.ts`)
- [ ] Route: <server route file(s)>
- [ ] Integration tests: `apps/server/src/__tests__/integration/<domain>.test.ts`
- [ ] Client: <client/api file(s)>
- [ ] UI: <apps/web file(s)>
- [ ] E2E tests: `apps/web/e2e/<flow>.spec.ts`
- [ ] Notes:
  - Risks:
  - Rollout / config gates:
```

---

### Sprint 4: Test Backfill + Quality Hardening

> **Goal:** Achieve comprehensive test coverage across all business domains, harden
> operational quality, and establish the E2E test pipeline.
> Covers: CHECKLIST 10 (operational quality gaps), 11 (operational blind spots verification),
> 14 (all 13 test pipelines), Appendix C (scheduled job tests), Appendix E.4 (observability).
> Cross-references: BUSINESS.md Section 8 (Test Pipelines 8.1–8.7).
>
> Sprints 1-3 include tests for **new** feature slices. Sprint 4 backfills tests on code
> already shipped without adequate coverage (e.g., Auth at ~40% unit, 0% integration/E2E).
>
> **Convention:** Unit tests colocated (`*.test.ts`). Integration tests in
> `apps/server/src/__tests__/integration/`. E2E tests in `apps/web/e2e/`.

---

#### 4.1 Test Infrastructure Setup (CHECKLIST 14 Preamble)

> **Existing:** Vitest configured for unit + integration, test-utils with MockDbClient,
> Fastify inject helpers, CI pipeline runs `pnpm test`.
> **Gap:** No Playwright setup, no E2E CI step, integration harness needs DB lifecycle.

**Playwright Setup:**

- [ ] Config: `playwright.config.ts` — base URL, browsers (chromium, firefox, webkit), timeouts
- [ ] Fixtures: `apps/web/e2e/fixtures/` — auth fixture (pre-logged-in user), clean DB fixture
- [ ] Fixtures: test user factory — create user + session + tokens for authenticated flows
- [ ] Fixtures: mock OAuth provider — intercept OAuth redirect for E2E OAuth tests
- [ ] Fixtures: mock email interceptor — capture transactional emails for verification tests
- [ ] Config: `globalSetup.ts` — start test server, seed DB, create test users
- [ ] Config: `globalTeardown.ts` — stop server, clean DB

**Integration Harness Improvements:**

- [ ] Harness: real test DB lifecycle — create/destroy test database per test suite (or per file)
- [ ] Harness: migration runner — apply all migrations to test DB before suite
- [ ] Harness: seed helpers — minimal seed data for each domain (users, tenants, subscriptions)
- [ ] Harness: Fastify inject factory — create configured app instance with test DB connection
- [ ] Harness: auth helpers — generate valid JWT tokens for test requests without full login flow
- [ ] Harness: tenant context helpers — set `X-Workspace-Id` header for tenant-scoped tests

**CI Pipeline:**

- [ ] Workflow: E2E test step in `ci.yml` — install Playwright browsers, run in headless mode
- [ ] Workflow: E2E artifact upload — screenshots + videos on failure
- [ ] Workflow: test coverage reporting — collect and report coverage metrics
- [ ] Workflow: parallel test execution — split test suites across CI workers

---

#### 4.2 Authentication Tests (CHECKLIST 14.1 | BUSINESS 8.1)

> **Existing:** ~40% unit coverage (some handler tests exist), basic integration tests
> for route existence and auth guards, E2E stubs for page rendering.
> **Gap:** Most handler edge cases untested, zero real DB integration, zero browser E2E.

**Unit Tests (colocated):**

- [ ] `register.test.ts` — validates input, rejects weak passwords, rejects duplicate emails, email canonicalization
- [ ] `login.test.ts` — correct credentials succeed, wrong password fails, unverified email rejected, locked account rejected, CAPTCHA enforcement
- [ ] `refresh.test.ts` — rotation works, reuse detection triggers family revocation, grace period honored, idle timeout enforcement
- [ ] `password.test.ts` — token creation, token validation, token expiry, password strength enforcement, breach check
- [ ] `magic-link/service.test.ts` — token creation, rate limiting logic, auto-create user logic, expiry
- [ ] `oauth/service.test.ts` — state generation, callback code exchange, link/unlink logic, provider validation
- [ ] `handlers/email-change.test.ts` — token creation, confirmation logic, reversion logic, old-email notification
- [ ] `totp.test.ts` — setup secret generation, code validation (time window), backup code single-use enforcement
- [ ] `utils/password.test.ts` — email canonicalization (trim, lowercase, Gmail dots, `+` alias stripping)
- [ ] `security/lockout.test.ts` — progressive delays, threshold enforcement, reset after success, IP-based vs user-based

**Integration Tests (`apps/server/src/__tests__/integration/auth.integration.test.ts`):**

- [ ] `POST /api/auth/register` → creates user in DB, sends verification email, returns expected shape
- [ ] `POST /api/auth/login` → returns tokens, sets HttpOnly cookie, creates session record
- [ ] `POST /api/auth/refresh` → rotates token, old token rejected on reuse
- [ ] `POST /api/auth/logout` → clears cookie, revokes token in DB
- [ ] `POST /api/auth/logout-all` → revokes all families except current
- [ ] `POST /api/auth/forgot-password` → creates token in DB, generic response (anti-enumeration)
- [ ] `POST /api/auth/reset-password` → updates password hash, invalidates old tokens
- [ ] `POST /api/auth/verify-email` → marks user verified, auto-login tokens returned
- [ ] `POST /api/auth/magic-link/request` → creates token, rate limited
- [ ] `POST /api/auth/magic-link/verify` → logs in user, creates new user if config allows
- [ ] `GET /api/auth/oauth/:provider` → returns valid authorization URL
- [ ] `GET /api/auth/oauth/:provider/callback` → exchanges code, creates/logs in user
- [ ] `POST /api/auth/change-email` + `/confirm` → full atomic email update flow
- [ ] `POST /api/auth/totp/setup` → `/enable` → `/disable` lifecycle against DB
- [ ] Protected routes reject unauthenticated requests with 401
- [ ] Anti-enumeration: all login failure types return identical 401 shape

**E2E Tests (`apps/web/e2e/auth.spec.ts`):**

- [ ] Register → receive verification email → verify → auto-login → see dashboard
- [ ] Login with email + password → see dashboard → logout → redirected to login
- [ ] Login with username → see dashboard
- [ ] Forgot password → reset password → login with new password
- [ ] Login attempt lockout after N failures → wait → retry succeeds
- [ ] Login with 2FA enabled → TOTP challenge → enter code → see dashboard
- [ ] OAuth login flow (mock provider) → see dashboard
- [ ] Magic link request → click link → see dashboard (if enabled)
- [ ] Email change → confirm via link → old email shows in notification
- [ ] Register with duplicate email → see error message
- [ ] Deep-link preservation: unauthenticated visit → login → redirected to original path

---

#### 4.3 Sessions & Device Security Tests (CHECKLIST 14.2 | BUSINESS 8.1)

> **Existing:** Route existence integration tests, basic auth guards tested.
> **Gap:** Zero handler unit tests, zero real DB integration, zero E2E.

**Unit Tests (colocated):**

- [ ] `listUserSessions()` — returns sessions, marks current session correctly
- [ ] `revokeSession()` — validates ownership, prevents revoking current session
- [ ] `revokeAllSessions()` — keeps current, revokes rest
- [ ] `getSessionCount()` — returns correct count
- [ ] UA parsing — Chrome/Firefox/Safari/Edge/mobile variants produce human-readable labels
- [ ] Idle timeout — expired idle sessions rejected on refresh
- [ ] Max concurrent sessions — oldest session evicted when limit exceeded
- [ ] New device detection — IP + user agent comparison against existing sessions

**Integration Tests (`apps/server/src/__tests__/integration/sessions.integration.test.ts`):**

- [ ] `GET /api/users/me/sessions` → returns session list with current marker
- [ ] `DELETE /api/users/me/sessions/:id` → revokes target session, rejects current session revocation
- [ ] `POST /api/users/me/sessions/revoke-all` → all sessions revoked except current
- [ ] `GET /api/users/me/sessions/count` → matches active session count
- [ ] Login creates `user_sessions` record with parsed UA fields
- [ ] Session record includes IP, user agent, device label

**E2E Tests (`apps/web/e2e/sessions.spec.ts`):**

- [ ] Login → navigate to settings → see active sessions list with "This device" indicator
- [ ] Login from two sessions → revoke one → verify revoked session is logged out
- [ ] "Log out all other devices" → only current session remains active
- [ ] Session shows human-readable device label (not raw UA string)

---

#### 4.4 Account Management Tests (CHECKLIST 14.3 | BUSINESS 8.1)

> **Existing:** Lifecycle handler tests (18 tests), lifecycle domain logic tests (17 tests),
> profile completeness handler tests, username handler stub.
> **Gap:** Avatar processing, profile update integration, sudo mode, E2E flows.

**Unit Tests (colocated):**

- [ ] Username validation — uniqueness (case-insensitive), reserved names, cooldown enforcement
- [ ] Avatar processing — validate file type (JPEG, PNG, WebP), reject invalid, resize dimensions
- [ ] Profile update — field validation, completeness percentage calculation
- [ ] Account deactivation — state transition, `deactivated_at` timestamp set
- [ ] Account deletion request — grace period calculation, orphan prevention (sole workspace owner)
- [ ] Account reactivation — cancel deactivation within grace period, reject after grace period expiry
- [ ] Sudo mode — token scoping, TTL enforcement, elevation for sensitive ops

**Integration Tests (`apps/server/src/__tests__/integration/account.integration.test.ts`):**

- [ ] `PATCH /api/users/me/username` → updates username, rejects duplicates, enforces cooldown
- [ ] `PUT /api/users/me/avatar` → processes and stores image, returns URL
- [ ] `DELETE /api/users/me/avatar` → removes avatar
- [ ] `PATCH /api/users/me` → updates profile fields (firstName, lastName, bio, etc.)
- [ ] `GET /api/users/me/profile/completeness` → returns percentage and missing fields
- [ ] `POST /api/users/me/deactivate` → sets `deactivated_at`, blocks subsequent API calls
- [ ] `POST /api/users/me/delete` → sets `deleted_at` + grace period end, blocks login after
- [ ] `POST /api/users/me/reactivate` → cancels pending deletion within grace period
- [ ] `POST /api/auth/sudo` → returns sudo token; subsequent sensitive ops require it
- [ ] Deactivated account → login attempt rejected
- [ ] Deleted account (past grace period) → login attempt rejected

**E2E Tests (`apps/web/e2e/account.spec.ts`):**

- [ ] Change username in settings → see updated username across the app
- [ ] Upload avatar → see avatar in profile and header
- [ ] Update profile fields → save → refresh → see persisted changes
- [ ] View profile completeness bar → fill missing fields → bar reaches 100%
- [ ] Delete account → confirm password → see logout; re-login attempt blocked
- [ ] Sudo mode: attempt sensitive action → prompted for password → re-auth → action succeeds

---

#### 4.5 Multi-Tenant / Workspace Tests (CHECKLIST 14.4 | BUSINESS 8.2)

> **Existing:** Domain logic for role hierarchy, membership schemas, tenant schemas.
> Membership logic tests (291 tests). Domain restriction logic + tests.
> **Gap:** Zero HTTP endpoint integration tests, zero E2E workspace flows.

**Unit Tests (colocated):**

- [ ] `canAssignRole()` — enforces role hierarchy (owner > admin > member > viewer)
- [ ] `canRemoveMember()` — prevents removing higher-ranked users
- [ ] Orphan prevention — block removal of last owner, require ownership transfer
- [ ] Invitation logic — domain restriction validation, expiry enforcement, token generation
- [ ] Tenant scoping — `assertWorkspaceScope()` throws when context missing
- [ ] Domain restriction — email domain matching, wildcard domains, invite-only enforcement
- [ ] Tenant settings — per-tenant config validation, defaults

**Integration Tests (`apps/server/src/__tests__/integration/tenant.integration.test.ts`):**

- [ ] `POST /api/tenants` → creates tenant + owner membership in transaction
- [ ] `GET /api/tenants` → returns only user's workspaces
- [ ] `GET /api/tenants/:id` → returns tenant details (member only)
- [ ] `PATCH /api/tenants/:id` → updates tenant settings (admin/owner only)
- [ ] `POST /api/tenants/:id/invitations` → creates invite, sends email
- [ ] `POST /api/invitations/:token/accept` → creates membership, consumes token
- [ ] `PATCH /api/tenants/:id/members/:userId` → changes role, enforces hierarchy
- [ ] `DELETE /api/tenants/:id/members/:userId` → removes member, blocks last owner removal
- [ ] Tenant-scoped queries only return data for the active workspace
- [ ] Expired invitation rejection with clear error
- [ ] Domain-restricted tenant rejects invites to non-matching email domains

**E2E Tests (`apps/web/e2e/tenants.spec.ts`):**

- [ ] Create workspace → see it in workspace list → switch to it
- [ ] Invite teammate by email → teammate accepts → appears in member list
- [ ] Change member role → member sees updated permissions
- [ ] Remove member → member loses access to workspace
- [ ] Tenant switcher: switch between workspaces → see different data in each
- [ ] Accept expired invitation → see error message

---

#### 4.6 RBAC & Authorization Tests (CHECKLIST 14.5 | BUSINESS 8.2)

> **Existing:** Permission checker (batch), middleware (Fastify preHandler), role-based presets.
> **Gap:** Zero end-to-end authorization flow tests, zero E2E role-gating tests.

**Unit Tests (colocated):**

- [ ] `canUser()` / `isOwner()` / `isAdmin()` — permission checks for all role combinations
- [ ] Policy engine — evaluation with multiple rules, deny overrides allow
- [ ] Route-level role check — correct roles pass, others rejected
- [ ] Permission batch checking — multiple permissions in one call
- [ ] Role hierarchy inheritance — admin inherits member permissions, owner inherits admin

**Integration Tests (`apps/server/src/__tests__/integration/rbac.integration.test.ts`):**

- [ ] Protected routes reject unauthenticated requests (401)
- [ ] Admin routes reject non-admin users (403)
- [ ] Per-tenant role enforcement — viewer cannot write, member cannot manage members
- [ ] Resource ownership validation — user A cannot access user B's resources
- [ ] System admin vs workspace admin distinction
- [ ] Role change takes effect immediately on next request

**E2E Tests (`apps/web/e2e/rbac.spec.ts`):**

- [ ] Admin user: can access admin dashboard, manage users
- [ ] Regular user: admin routes return 403 / redirect to dashboard
- [ ] Workspace viewer: cannot create/edit resources; sees read-only UI
- [ ] Workspace admin: can manage members but cannot transfer ownership

---

#### 4.7 Billing & Subscriptions Tests (CHECKLIST 14.6 | BUSINESS 8.3)

> **Existing:** 6 billing tables, admin plan CRUD, Stripe/PayPal webhook routes + providers,
> entitlements domain logic, client UI pages.
> **Gap:** Zero webhook processing integration tests, zero subscription lifecycle E2E.

**Unit Tests (colocated):**

- [ ] Entitlements resolver — `resolveEntitlements(subscription, role)` returns correct flags/limits
- [ ] Plan validation — required fields, price constraints, interval validation
- [ ] Webhook signature verification — Stripe + PayPal signature validation logic
- [ ] Subscription state transitions — `trialing` → `active` → `past_due` → `canceled`
- [ ] Proration calculation — mid-cycle upgrade/downgrade amount
- [ ] Seat-based limit enforcement — max users per plan tier
- [ ] Dunning logic — retry schedule, grace period, suspension threshold

**Integration Tests (`apps/server/src/__tests__/integration/billing.integration.test.ts`):**

- [ ] Admin: `POST /api/admin/billing/plans` → creates plan in DB
- [ ] Admin: `PATCH /api/admin/billing/plans/:id` → updates plan
- [ ] Stripe webhook → updates subscription state in DB (idempotent)
- [ ] PayPal webhook → updates subscription state in DB (idempotent)
- [ ] Duplicate webhook event ID → ignored (idempotency)
- [ ] Out-of-order webhook events → handled gracefully
- [ ] Checkout session creation → returns redirect URL
- [ ] Entitlement enforcement — free plan user blocked from premium features
- [ ] `GET /api/billing/invoices` → returns invoices for current tenant
- [ ] Subscription cancel → remains active until period end

**E2E Tests (`apps/web/e2e/billing.spec.ts`):**

- [ ] View pricing page → select plan → complete checkout → see active subscription
- [ ] Upgrade plan → see updated entitlements immediately
- [ ] Downgrade plan → see reduced entitlements at next billing cycle
- [ ] View billing settings → see current plan, invoices, payment method
- [ ] Cancel subscription → see confirmation → plan remains active until period end

---

#### 4.8 Notifications Tests (CHECKLIST 14.7 | BUSINESS 8.4)

> **Existing:** Notification tables + repos, push subscription table, preference table.
> Email templates table + console provider.
> **Gap:** Zero notification service tests, zero delivery pipeline tests, zero E2E.

**Unit Tests (colocated):**

- [ ] Notification service — create, mark read, mark all read, delete, count unread
- [ ] Push provider (FCM) — payload formatting, error handling, subscription validation
- [ ] Email template rendering — variable substitution, fallback values, HTML/text output
- [ ] Preference evaluation — channel enabled/disabled per notification type per user
- [ ] Notification routing — determine which channels to use based on event type + preferences

**Integration Tests (`apps/server/src/__tests__/integration/notifications.integration.test.ts`):**

- [ ] `POST /api/notifications` → creates notification in DB
- [ ] `GET /api/notifications` → returns paginated notifications for current user
- [ ] `PATCH /api/notifications/:id/read` → marks as read
- [ ] `POST /api/notifications/read-all` → marks all as read for current user
- [ ] `GET /api/notifications/unread-count` → returns correct count
- [ ] `GET /api/notifications/preferences` → returns current preference settings
- [ ] `PATCH /api/notifications/preferences` → updates channel preferences
- [ ] Email send — SMTP transport delivers (dev: console provider logs to stdout)
- [ ] Push subscription — register → send → receive (mock FCM endpoint)

**E2E Tests (`apps/web/e2e/notifications.spec.ts`):**

- [ ] Trigger action → notification appears in bell dropdown
- [ ] Click notification → navigates to relevant page
- [ ] Mark notification as read → visual indicator updates
- [ ] Notification preferences: toggle channel off → no longer receive that type
- [ ] Transactional email received (verify via test mailbox interceptor)

---

#### 4.9 Audit & Security Events Tests (CHECKLIST 14.8 | BUSINESS 8.5)

> **Existing:** Security events table + repository, security event creation on auth actions,
> admin security events page with filters/export, metrics aggregation.
> **Gap:** Zero integration tests for event creation pipeline, zero E2E for admin UI.

**Unit Tests (colocated):**

- [ ] Security event creation — all 18+ event types with correct severity classification
- [ ] Audit event creation — typed events with actor/action/target/metadata
- [ ] Event metrics aggregation — count by type, count by severity, time-series rollup
- [ ] Event filtering — by type, severity, user, date range, IP
- [ ] Export formatting — CSV and JSON output generation

**Integration Tests (`apps/server/src/__tests__/integration/audit.integration.test.ts`):**

- [ ] Security events written to DB on login/logout/lockout/OAuth/TOTP actions
- [ ] `GET /api/admin/security/events` → returns paginated events with filters
- [ ] `GET /api/admin/security/events/:id` → returns event detail with all metadata
- [ ] `GET /api/admin/security/metrics` → returns aggregated metrics
- [ ] `POST /api/admin/security/events/export` → returns CSV/JSON export
- [ ] Non-admin user → 403 on all admin security endpoints
- [ ] Event includes correct actor, IP, user agent, timestamp

**E2E Tests (`apps/web/e2e/audit.spec.ts`):**

- [ ] Admin: navigate to security events → see events list with filters
- [ ] Filter by event type → results update
- [ ] Click event → see detail view with all metadata
- [ ] Export events → file downloads successfully
- [ ] Trigger login failure → see new security event appear in list

---

#### 4.10 Compliance & Data Privacy Tests (CHECKLIST 14.9 | BUSINESS 8.6)

> **Existing:** Legal documents + user agreements tables, consent logs table,
> data export requests table, ToS gating middleware stub, account deletion with grace period.
> **Gap:** Zero integration tests for compliance workflows, zero E2E.

**Unit Tests (colocated):**

- [ ] Deletion logic — soft delete scheduling, grace period calculation, PII anonymization rules
- [ ] Data export — user data aggregation from all tables (users, sessions, activities, billing)
- [ ] Consent tracking — version comparison, acceptance recording, consent log creation
- [ ] ToS gating — version comparison logic, stale-version detection
- [ ] PII anonymization — field-level anonymization rules (email → hash, name → "Deleted User", etc.)

**Integration Tests (`apps/server/src/__tests__/integration/compliance.integration.test.ts`):**

- [ ] `POST /api/users/me/export` → creates data export request, background job queued
- [ ] `GET /api/users/me/export/:id` → returns export status (pending/ready/expired)
- [ ] `POST /api/users/me/delete` → sets `deleted_at`, blocks login after grace period
- [ ] ToS gating middleware — stale version → 403 with `TOS_ACCEPTANCE_REQUIRED`
- [ ] `POST /api/agreements/accept` → records acceptance, unblocks user
- [ ] `GET /api/agreements/current` → returns current ToS version
- [ ] Hard delete cron — anonymizes PII after grace period, preserves audit trail
- [ ] Consent log — records consent changes with timestamp + IP

**E2E Tests (`apps/web/e2e/compliance.spec.ts`):**

- [ ] Request data export → see "processing" status → receive download link
- [ ] Delete account → confirm → logged out → cannot log back in during grace period
- [ ] New ToS published → user forced to accept before continuing
- [ ] Accept ToS → normal access restored
- [ ] Consent preferences → toggle cookie consent → see updated state

---

#### 4.11 Realtime & WebSocket Tests (CHECKLIST 14.10)

> **Existing:** ~50% unit coverage — WebSocket server, PubSub, sync handler.
> **Gap:** Zero authenticated WebSocket integration tests, zero E2E cross-tab sync.

**Unit Tests (colocated):**

- [ ] Subscription handler — subscribe/unsubscribe to channels, channel validation
- [ ] Sync handler — delta sync logic, conflict resolution
- [ ] PubSub — message routing, channel filtering, wildcard channels
- [ ] Connection lifecycle — connect, heartbeat, disconnect, reconnect, stale connection cleanup
- [ ] Auth — WebSocket authentication handshake, token validation

**Integration Tests (`apps/server/src/__tests__/integration/realtime.integration.test.ts`):**

- [ ] WebSocket connect → authenticate → subscribe to channel → receive published message
- [ ] Unauthorized subscription attempt rejected with error
- [ ] Connection stats updated on connect/disconnect
- [ ] Multiple subscribers on same channel all receive message
- [ ] Workspace-scoped channel — only workspace members receive messages
- [ ] Heartbeat keeps connection alive; missed heartbeats trigger disconnect

**E2E Tests (`apps/web/e2e/realtime.spec.ts`):**

- [ ] Open two browser tabs → action in tab A → real-time update appears in tab B
- [ ] Disconnect network → reconnect → missed messages synced
- [ ] Subscribe to workspace-scoped channel → only see events for that workspace

---

#### 4.12 Media Processing Tests (CHECKLIST 14.11)

> **Existing:** ~60% unit coverage — image/audio/video processors, file storage (local + S3),
> security scanning, presigned URL generation.
> **Gap:** Zero upload integration tests, zero E2E upload flows.

**Unit Tests (colocated):**

- [ ] Image processor — resize, crop, format conversion (JPEG/PNG/WebP)
- [ ] Audio metadata extraction — duration, sample rate, channels, format detection
- [ ] Video processor — thumbnail generation, format conversion
- [ ] File type detection — correct MIME types for common formats, magic byte validation
- [ ] File validation — size limits, type restrictions, security scanning (no embedded scripts)
- [ ] Queue — job creation, retry logic, dead-letter handling
- [ ] Local storage provider — write, read, delete, directory creation
- [ ] Presigned URL generation — valid signature, expiry, content-type restrictions

**Integration Tests (`apps/server/src/__tests__/integration/media.integration.test.ts`):**

- [ ] Upload image → processed and stored (local provider for tests)
- [ ] Upload invalid file type → rejected with clear error
- [ ] Upload oversized file → rejected with size limit error
- [ ] Queue: job submitted → processed → result stored in DB
- [ ] Presigned URL — generate → use to upload → verify file stored
- [ ] `DELETE /api/files/:id` → removes file from storage + DB record

**E2E Tests (`apps/web/e2e/media.spec.ts`):**

- [ ] Upload avatar image → see processed/cropped version displayed
- [ ] Upload document → see it in file list → download it
- [ ] Drag-and-drop file upload → progress indicator → success confirmation
- [ ] Upload invalid file → see user-friendly error message

---

#### 4.13 API Keys & Programmatic Access Tests (CHECKLIST 14.12)

> **Existing:** `api_keys` table + repository with full CRUD.
> **Gap:** Zero service-layer tests, zero HTTP integration, zero E2E (pending Sprint 3.1).

**Unit Tests (colocated):**

- [ ] Key generation — crypto-random generation, hash storage (never store plaintext)
- [ ] Key authentication — timing-safe comparison, hash validation
- [ ] Scope parsing — valid scope strings, invalid scope rejection
- [ ] Scope enforcement — key with `read` scope cannot `write`
- [ ] Key revocation — immediate invalidation, revoked key check
- [ ] Key expiry — expired key rejected, expiry date validation

**Integration Tests (`apps/server/src/__tests__/integration/api-keys.integration.test.ts`):**

- [ ] Create API key → use it to authenticate a request → success
- [ ] Revoked key → 401 on subsequent requests
- [ ] Expired key → 401 on subsequent requests
- [ ] Scope enforcement — key with `read` scope cannot access `write` endpoints
- [ ] `GET /api/users/me/api-keys` → lists keys (hash not exposed, shows name + scopes + last used)
- [ ] `DELETE /api/users/me/api-keys/:id` → revokes key (requires sudo)
- [ ] Key creation requires sudo mode

**E2E Tests (`apps/web/e2e/api-keys.spec.ts`):**

- [ ] Settings → API keys → create key → copy value (shown once) → see it in list
- [ ] Revoke key → removed from list → API calls with that key fail
- [ ] Create key with limited scopes → verify scope labels displayed

---

#### 4.14 Admin & Support Tests (CHECKLIST 14.13 | BUSINESS 8.7)

> **Existing:** Admin user list + detail, security events dashboard, route manifest,
> queue stats, lock/unlock. Basic route existence tests.
> **Gap:** Zero impersonation tests, zero ban cascade tests, zero E2E admin flows.

**Unit Tests (colocated):**

- [ ] Impersonation token — scoped TTL, target user validation, admin-only gate
- [ ] Impersonation guard — cannot impersonate another admin (safety)
- [ ] User search — multi-field matching (email, name, UUID, stripe customer ID)
- [ ] Ban logic — soft ban (lock account), hard ban cascade (revoke sessions, cancel subs, schedule PII deletion)
- [ ] Route manifest — returns all registered routes with metadata

**Integration Tests (`apps/server/src/__tests__/integration/admin.integration.test.ts`):**

- [ ] `GET /api/admin/users` → returns paginated user list with filters
- [ ] `GET /api/admin/users/:id` → returns user detail
- [ ] `POST /api/admin/users/:id/lock` → locks account, login blocked
- [ ] `POST /api/admin/users/:id/unlock` → unlocks account, login allowed
- [ ] `POST /api/admin/impersonate/:userId` → returns scoped token + creates audit event
- [ ] Cannot impersonate another admin → 403
- [ ] Hard ban — revokes sessions, cancels subscriptions, schedules PII deletion
- [ ] Non-admin user → 403 on all admin endpoints
- [ ] `GET /api/admin/routes` → returns route manifest

**E2E Tests (`apps/web/e2e/admin.spec.ts`):**

- [ ] Admin: search for user → view detail → lock account → user cannot log in
- [ ] Admin: impersonate user → see banner "Viewing as ..." → end session → return to admin
- [ ] Admin: manage billing plans → create/edit/deactivate plan
- [ ] Admin: view security events dashboard → filter → export
- [ ] Admin: view route manifest → filter by module/method

---

#### 4.15 Operational Quality Tests (CHECKLIST 10 | Appendix E.4)

> **Existing:** Health endpoints wired, correlation IDs, OpenAPI/Swagger at `/api/docs`.
> **Gap:** Error reporting integration (Sentry), metrics collection, auth-protected docs.

**Health & Readiness:**

- [ ] Integration: `GET /health` → returns `200` with version + uptime
- [ ] Integration: `GET /health/live` → returns `200` (liveness probe)
- [ ] Integration: health check includes DB connectivity status
- [ ] Integration: health check includes queue system status
- [ ] E2E: health endpoint accessible from browser (no auth required)

**Correlation IDs:**

- [ ] Integration: request with `X-Correlation-Id` header → same ID appears in response header + logs
- [ ] Integration: request without correlation ID → server generates one, returns in response header
- [ ] Integration: correlation ID propagated to downstream service calls and queue jobs

**Error Reporting:**

- [ ] Service: Sentry integration provider (optional, config-gated)
- [ ] Service: unhandled error → captured with correlation ID + request context
- [ ] Service: breadcrumb trail — log key events leading to error
- [ ] Unit test: error formatting, PII scrubbing before send

**Metrics:**

- [ ] Service: metrics interface — request count/latency, job success/fail counts
- [ ] Service: Prometheus-compatible `/metrics` endpoint (config-gated)
- [ ] Integration: request → metrics counter incremented
- [ ] Integration: job processed → metrics counter incremented

**OpenAPI / Swagger:**

- [ ] Integration: `/api/docs` serves Swagger UI
- [ ] Integration: `/api/docs/json` returns valid OpenAPI 3.0 spec
- [ ] Security: `/api/docs` auth-protected in non-dev environments
- [ ] Validation: all annotated routes appear in generated spec

---

#### 4.16 Operational Blind Spot Verification (CHECKLIST 11)

> **Existing:** CAPTCHA integration (Turnstile), ToS gating stub, login failure logging (partial).
> **Gap:** Security notification emails, email change reversion, granular failure reasons.

**Anti-Abuse (11.1):**

- [ ] Integration: CAPTCHA-enabled config → public endpoints require valid token
- [ ] Integration: CAPTCHA-disabled config → public endpoints work without token
- [ ] Integration: invalid CAPTCHA token → 400 rejection
- [ ] Unit test: Turnstile server-side verification (success, failure, network error, timeout)

**Security Notifications (11.2):**

- [ ] Integration: password change → "Was this you?" email sent to user
- [ ] Integration: 2FA disabled → security notification email sent
- [ ] Integration: new device login → new device alert email sent
- [ ] Integration: email change A→B → "Revert" link sent to old email (A)
- [ ] Integration: clicking revert link → email reverted, account locked, sessions killed
- [ ] Integration: new API key generated → security notification email sent
- [ ] Unit test: email template rendering for each notification type

**ToS Gating (11.3):**

- [ ] Integration: stale ToS version → all API calls return 403 except logout + accept
- [ ] Integration: accept ToS → unblocked
- [ ] Integration: admin publishes new ToS version → users with old version blocked
- [ ] E2E: new ToS → modal appears → accept → normal access

**Login Failure Logging (11.4):**

- [ ] Integration: `USER_NOT_FOUND` failure → stored in `login_attempts` with reason
- [ ] Integration: `PASSWORD_MISMATCH` → stored with reason
- [ ] Integration: `UNVERIFIED_EMAIL` → stored with reason
- [ ] Integration: `ACCOUNT_LOCKED` → stored with reason
- [ ] Integration: `CAPTCHA_FAILED` → stored with reason
- [ ] Integration: `TOTP_REQUIRED` → stored with reason (successful password, awaiting 2FA)
- [ ] Integration: `TOTP_INVALID` → stored with reason (wrong 2FA code)
- [ ] Integration: admin can filter login attempts by failure reason
- [ ] Security: client receives identical 401 for all failure types (anti-enumeration)

---

#### 4.17 Scheduled Job Tests (CHECKLIST Appendix C)

> **Existing:** Queue system (QueueServer + WriteService), memory store for dev/test.
> **Gap:** Scheduled job implementations are stubs, zero tests.

- [ ] `login-cleanup.ts` — purge expired login attempts beyond retention window
- [ ] `magic-link-cleanup.ts` — purge expired magic link tokens
- [ ] `oauth-refresh.ts` — refresh expiring OAuth tokens before expiry
- [ ] `push-cleanup.ts` — purge stale push subscriptions (no heartbeat in X days)
- [ ] `hard-delete-cron.ts` — anonymize PII for accounts past deletion grace period
- [ ] `session-cleanup.ts` — purge expired/idle sessions
- [ ] Unit tests: each job's selection criteria, batch processing, error handling
- [ ] Integration tests: job enqueued → processed → DB state updated correctly
- [ ] E2E: admin job monitor page → see scheduled jobs, status, last run, next run

---

#### 4.18 Client Engine & Search Tests (CHECKLIST Appendix C)

> **Existing:** ~40% unit coverage for client engine (RecordStorage, sync).
> Search: SQL provider tested, query builder test missing.
> **Gap:** RecordStorage edge cases, search query builder tests.

**Client Engine:**

- [ ] RecordStorage — CRUD operations, conflict resolution, sync delta calculation
- [ ] Offline queue — operations queued while offline, replayed on reconnect
- [ ] Sync protocol — optimistic updates, server reconciliation, rollback on conflict

**Search:**

- [ ] `query-builder.ts` — query construction for all field types, pagination, sorting
- [ ] SQL provider — full-text search, fuzzy matching, result ranking
- [ ] Search factory — provider selection based on config

---

#### 4.19 Activity Tracking, Feature Flags & Usage Metering Tests (Sprint 3.6 + 3.7 Backfill)

> **Existing:** Activity tracking table + service (Sprint 3.6), Feature flags table + metering table (Sprint 3.7).
> **Gap:** Zero tests for activity CRUD, flag evaluation, metering aggregation.

**Activity Tracking:**

- [ ] Unit: activity event creation — typed events with actor/action/target/metadata
- [ ] Unit: activity feed query — pagination, filtering by actor/target/type, date range
- [ ] Integration: `POST /api/activities` → creates activity record in DB
- [ ] Integration: `GET /api/activities` → returns paginated activity feed with filters
- [ ] Integration: tenant-scoped activity isolation — tenant A cannot see tenant B's activities

**Feature Flags:**

- [ ] Unit: flag evaluation logic — enabled/disabled, percentage rollout, user targeting
- [ ] Unit: flag defaults — missing flag returns default value, no crash
- [ ] Integration: `GET /api/flags/:key` → returns flag value for current user/tenant
- [ ] Integration: admin CRUD — create/update/delete flags, toggle enabled state
- [ ] Integration: tenant-scoped flags — tenant-specific overrides vs global defaults

**Usage Metering:**

- [ ] Unit: meter increment logic — idempotency key, counter aggregation, period rollover
- [ ] Unit: usage limit enforcement — soft limit (warn) vs hard limit (block)
- [ ] Integration: API call → meter incremented → usage reflected in billing
- [ ] Integration: usage exceeds plan limit → appropriate response (429 or degraded)
- [ ] Integration: metering data feeds billing invoice line items

---

#### 4.20 Webhook Delivery System Tests (Sprint 3.18 Backfill)

> **Existing:** Webhook table + delivery log table, queue-based delivery (Sprint 3.18).
> **Gap:** Zero tests for webhook signature, delivery, retry, registration.

**Unit Tests:**

- [ ] Webhook signature generation — HMAC-SHA256 with shared secret, correct payload serialization
- [ ] Webhook signature verification — valid signature accepted, tampered payload rejected
- [ ] Retry logic — exponential backoff calculation, max retry count, dead-letter after exhaustion
- [ ] Event filtering — webhook subscription with event type filter, wildcard matching

**Integration Tests:**

- [ ] Register webhook endpoint → stored in DB with secret
- [ ] Event triggered → webhook queued → delivered to endpoint → delivery logged
- [ ] Endpoint returns 500 → retry scheduled with exponential backoff
- [ ] Endpoint returns 200 → delivery marked successful, no retry
- [ ] Max retries exceeded → webhook marked failed, admin notified
- [ ] `GET /api/webhooks/:id/deliveries` → delivery log with status/response/timing
- [ ] Webhook secret rotation → old deliveries still verifiable, new deliveries use new secret
- [ ] Tenant-scoped webhooks — tenant A's events don't trigger tenant B's webhooks

---

#### 4.21 Desktop App Tests (Sprint 3.19 Backfill)

> **Existing:** Electron app shell, IPC bridge, local storage adapter (Sprint 3.19).
> **Gap:** Zero tests for IPC handlers, auth flow, offline mode.

**Unit Tests:**

- [ ] IPC handler registration — all handlers registered with correct channel names
- [ ] Auth flow — token storage in secure keychain (keytar/safeStorage), token refresh on app resume
- [ ] Deep link handling — protocol handler parses `abe://` links correctly
- [ ] Auto-update — version check, download progress, install-on-quit logic
- [ ] Offline detection — network status change → queue operations, sync on reconnect

**Integration Tests (Electron test runner):**

- [ ] App launches → renders main window with correct preload script
- [ ] Login flow → tokens stored securely → subsequent launch auto-authenticates
- [ ] IPC: renderer requests data → main process fetches → result returned to renderer
- [ ] Offline → online transition → queued operations replayed successfully
- [ ] Menu items → correct IPC messages sent → expected actions performed

---

#### Sprint 4 Cross-Reference Summary

> Maps Sprint 4 items to CHECKLIST.md and BUSINESS.md sections for completeness verification.

| CHECKLIST Section            | BUSINESS.md | Sprint 4 Items                                         | Coverage                                  |
| ---------------------------- | ----------- | ------------------------------------------------------ | ----------------------------------------- |
| 10. Operational Quality      | E.4         | 4.15 Operational Quality Tests                         | Health, error reporting, metrics, OpenAPI |
| 11.1 Anti-Abuse              | —           | 4.16 Operational Blind Spot Verification               | CAPTCHA integration tests                 |
| 11.2 Security Notifications  | —           | 4.16 Operational Blind Spot Verification               | "Was this you?" + email reversion tests   |
| 11.3 ToS Gating              | —           | 4.16 Operational Blind Spot Verification               | Middleware + acceptance flow tests        |
| 11.4 Login Failure Logging   | —           | 4.16 Operational Blind Spot Verification               | Granular failure reason tests             |
| 14.1 Authentication          | 8.1         | 4.2 Authentication Tests                               | Full (unit + integration + E2E)           |
| 14.2 Sessions                | 8.1         | 4.3 Sessions Tests                                     | Full (unit + integration + E2E)           |
| 14.3 Account Management      | 8.1         | 4.4 Account Management Tests                           | Full (unit + integration + E2E)           |
| 14.4 Multi-Tenant            | 8.2         | 4.5 Multi-Tenant Tests                                 | Full (unit + integration + E2E)           |
| 14.5 RBAC                    | 8.2         | 4.6 RBAC Tests                                         | Full (unit + integration + E2E)           |
| 14.6 Billing                 | 8.3         | 4.7 Billing Tests                                      | Full (unit + integration + E2E)           |
| 14.7 Notifications           | 8.4         | 4.8 Notifications Tests                                | Full (unit + integration + E2E)           |
| 14.8 Audit & Security Events | 8.5         | 4.9 Audit Tests                                        | Full (unit + integration + E2E)           |
| 14.9 Compliance              | 8.6         | 4.10 Compliance Tests                                  | Full (unit + integration + E2E)           |
| 14.10 Realtime               | —           | 4.11 Realtime Tests                                    | Full (unit + integration + E2E)           |
| 14.11 Media                  | —           | 4.12 Media Tests                                       | Full (unit + integration + E2E)           |
| 14.12 API Keys               | —           | 4.13 API Keys Tests                                    | Full (unit + integration + E2E)           |
| 14.13 Admin Console          | 8.7         | 4.14 Admin Tests                                       | Full (unit + integration + E2E)           |
| Appendix C (Engine)          | —           | 4.17 Scheduled Jobs, 4.18 Client Engine + Search       | Scheduled jobs + missing query builder    |
| 6.6 Activity Tracking        | —           | 4.19 Activity Tracking, Feature Flags & Usage Metering | Sprint 3.6 backfill                       |
| 6.7 Feature Flags & Metering | —           | 4.19 Activity Tracking, Feature Flags & Usage Metering | Sprint 3.7 backfill                       |
| Appendix D (Webhooks)        | —           | 4.20 Webhook Delivery System Tests                     | Sprint 3.18 backfill                      |
| Appendix E (Desktop)         | —           | 4.21 Desktop App Tests                                 | Sprint 3.19 backfill                      |

---

## Notes / Guardrails

- Prefer **one slice fully done** over "80% of five slices".
- Don't add new packages to implement a slice unless it removes duplication across apps.
- If you touch auth/session/billing flows, add at least one test that asserts the failure mode you're most worried about.
- For file placement rules during execution, follow `docs/todo/EXECUTION.md` (Hybrid Hexagonal standard).
