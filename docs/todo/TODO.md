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

- [ ] Slice: New device / new IP detection — compare login against known sessions
- [ ] Slice: Suspicious login email alert — send email on unrecognized device/IP
- [ ] Slice: Security event `new_device_login` with device fingerprint
- [ ] Slice: Token version invalidation — `token_version` column on `users`, bump on password change / 2FA toggle / forced logout, JWT includes version
- [ ] Slice: Trusted device tracking — user marks device as trusted, skip 2FA for N days
- [ ] Slice: (Optional) Geo-IP coarse lookup — country-level check for impossible travel detection

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

- [ ] Slice: `POST /api/auth/phone/add` → send SMS verification code
- [ ] Slice: `POST /api/auth/phone/verify` → verify code, store phone
- [ ] Slice: `DELETE /api/auth/phone` → remove phone 2FA
- [ ] Slice: SMS 2FA as fallback when TOTP unavailable
- [ ] Slice: Rate limiting on SMS sends (cost control)
- [ ] Slice: Phone number table/column + SMS provider abstraction
- [ ] Slice: (Optional) Phone login via SMS OTP — separate flow from 2FA (CHECKLIST 3.5)
- [ ] Slice: Client phone input + verification in security settings
- [ ] Slice: Unit + integration + E2E tests

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
> Covers: CHECKLIST 6 (all gaps), 7 (all gaps), 8 (gaps), 9, 10, 12 (gaps), 13 (gaps).

#### 3.1 API keys & programmatic access (CHECKLIST 6.1)

- [ ] Slice: HTTP endpoints — create, list, revoke (requires sudo)
- [ ] Slice: `Authorization: Bearer <key>` authentication middleware
- [ ] Slice: Scope enforcement on requests
- [ ] Slice: Client UI — key management (create with name + scopes, copy once, revoke)
- [ ] Slice: Unit + integration + E2E tests

#### 3.2 Billing lifecycle (CHECKLIST 6.2)

- [ ] Slice: Subscription lifecycle states end-to-end (trialing → active → past_due → canceled)
- [ ] Slice: Stripe checkout session creation + customer portal redirect
- [ ] Slice: Entitlements service integration — `assertEntitled("feature_x")` helper
- [ ] Slice: Usage / seat metering
- [ ] Slice: Unit + integration + E2E tests

#### 3.3 Audit & events completeness (CHECKLIST 6.3)

- [ ] Slice: Workspace-level audit viewer (tenant-scoped events)
- [ ] Slice: Audit log retention policy / cleanup cron
- [ ] Slice: Unit + integration tests

#### 3.4 Notifications & email (CHECKLIST 6.4)

- [ ] Slice: SMTP configuration docs + dev/prod sanity check
- [ ] Slice: Transactional email templates (Welcome, Verify, Reset, Invite) — content for existing template system
- [ ] Slice: Push subscription service integration
- [ ] Slice: Preference center UI
- [ ] Slice: In-app notification bell / dropdown
- [ ] Slice: Email bounce + unsubscribe handling
- [ ] Slice: Unit + integration + E2E tests

#### 3.5 File storage endpoints (CHECKLIST 6.5)

- [ ] Slice: File upload/download/delete HTTP endpoints
- [ ] Slice: Wire avatar upload handler to routes (verify full pipeline)
- [ ] Slice: Unit + integration tests

#### 3.6 Activity tracking (CHECKLIST 6.6)

- [ ] Slice: Activity logging integration with handlers
- [ ] Slice: Activity feed endpoint (`GET /api/activities`)
- [ ] Slice: Activity feed UI component
- [ ] Slice: Unit + integration tests

#### 3.7 Feature flags & usage metering (CHECKLIST 6.7)

- [ ] Slice: Feature flag evaluation middleware
- [ ] Slice: Admin UI for flag management
- [ ] Slice: Metering counters / hooks
- [ ] Slice: Unit + integration tests

#### 3.8 Compliance & data privacy (CHECKLIST 6.8)

- [ ] Slice: Data export endpoint (GDPR) — `POST /api/users/me/export`
- [ ] Slice: Data deletion workflow — soft delete + hard delete handlers/routes
- [ ] Slice: Consent tracking UI
- [ ] Slice: Right to be forgotten implementation
- [ ] Slice: Unit + integration + E2E tests

#### 3.9 Realtime client completeness (CHECKLIST 6.9)

- [ ] Slice: Client-side reconnection + offline queue integration
- [ ] Slice: E2E test: subscribe → publish → receive

#### 3.10 Media HTTP endpoints (CHECKLIST 6.11)

- [ ] Slice: HTTP endpoints for media upload/download/processing
- [ ] Slice: Client integration (upload component → media processing pipeline)
- [ ] Slice: Unit + integration + E2E tests

#### 3.11 User settings completeness (CHECKLIST 7.1)

- [ ] Slice: Preferences page (theme, locale/timezone, notifications)
- [ ] Slice: Data controls page (export / delete with grace period)
- [ ] Slice: API key management page
- [ ] Slice: Wire TOTP management UI to settings
- [ ] Slice: E2E tests (settings navigation, save/load preferences)

#### 3.12 Workspace admin (CHECKLIST 7.2)

- [ ] Slice: Members list + invite / resend / revoke UI
- [ ] Slice: Role management + permission gating UI
- [ ] Slice: Workspace settings page (name / logo / slug / defaults)
- [ ] Slice: Billing page (plan + invoices + portal redirect)
- [ ] Slice: Audit log viewer
- [ ] Slice: Tenant-level feature flag overrides UI
- [ ] Slice: Domain restrictions editor (allowed email domains)
- [ ] Slice: E2E tests (workspace admin workflows)

#### 3.13 System admin completeness (CHECKLIST 7.3)

- [ ] Slice: User search by "everything" (email, name, UUID, stripe_customer_id)
- [ ] Slice: Tenant search + suspend + plan override
- [ ] Slice: Webhook monitor + replay UI (domain logic + DB tables exist)
- [ ] Slice: Feature flag management UI
- [ ] Slice: System health dashboard
- [ ] Slice: E2E tests (admin workflows)

#### 3.14 Impersonation (CHECKLIST 7.4)

- [ ] Slice: `POST /api/admin/impersonate/:userId` — scoped token (30 min TTL) with audit events
- [ ] Slice: Cannot impersonate other admins (safety guard)
- [ ] Slice: All impersonated actions tagged in audit log with `impersonated_by`
- [ ] Slice: Rate limit: max N impersonations per admin per hour
- [ ] Slice: Web UI banner ("Viewing as user@example.com — End Session") + exit impersonation
- [ ] Slice: Unit + integration + E2E tests

#### 3.15 Soft ban / hard ban (CHECKLIST 7.5)

- [ ] Slice: Lock reason stored and displayed to user
- [ ] Slice: Configurable lock duration (permanent or timed auto-unlock)
- [ ] Slice: Notification email on lock/unlock
- [ ] Slice: `POST /api/admin/users/:id/hard-ban` — schedules data deletion with grace period (7 days)
- [ ] Slice: Hard ban cascade — revoke sessions + tokens, cancel subscriptions, remove from memberships (respecting orphan prevention)
- [ ] Slice: Background job: anonymize PII after grace period
- [ ] Slice: Admin confirmation required (re-enter password or 2FA)
- [ ] Slice: Unit + integration + E2E tests

#### 3.16 Data hygiene — background jobs + crons (CHECKLIST 9.1 + 9.2)

> Self-service deletion API + UI live in Sprint 2.6 (Account Lifecycle).
> This slice covers the background enforcement: crons, anonymization, and cleanup.

- [ ] Slice: Soft-deleted users enforcement: block login, hide from search, preserve audit trail
- [ ] Slice: Cron (daily): permanently wipe PII where `deleted_at > 30 days` (grace period)
- [ ] Slice: Hard delete: anonymize PII with hashed placeholders, preserve audit log structure
- [ ] Slice: Foreign key safety: audit logs, invoices, activity must not break on hard delete
- [ ] Slice: Unverified user cleanup cron (> 7 days unverified, exclude OAuth-only)
- [ ] Slice: Log cleanup counts to metrics/audit
- [ ] Slice: Unit + integration tests

#### 3.17 Operational quality (CHECKLIST 10)

- [ ] Slice: Wire health endpoints to `/health` + `/ready` routes (verify existing)
- [ ] Slice: Error reporting integration (Sentry)
- [ ] Slice: Metrics (request count/latency, job success/fail)
- [ ] Slice: OpenAPI / Swagger generation
- [ ] Slice: Auth-protected docs in non-dev envs
- [ ] Slice: Integration tests (health/ready endpoints)

#### 3.18 Backend infra gaps (CHECKLIST 8)

- [ ] Slice: Scheduled cleanup jobs — expired tokens, stale sessions, stale push subscriptions
- [ ] Slice: Scheduled OAuth token refresh — proactively renew expiring OAuth tokens (Appendix C `oauth-refresh.ts`)
- [ ] Slice: IP allowlisting for admin routes
- [ ] Slice: Request signing for webhook delivery
- [ ] Slice: Generated API client package
- [ ] Slice: Module scaffold CLI

#### 3.19 Desktop app gaps (CHECKLIST 12)

- [ ] Slice: Auto-updater integration
- [ ] Slice: Native menu + system tray
- [ ] Slice: Deep link handling

#### 3.20 CI/CD gaps (CHECKLIST 13.3)

- [ ] Slice: Staging environment workflow
- [ ] Slice: Preview deployments for PRs

#### 3.21 Storybook (CHECKLIST 12)

- [ ] Slice: Storybook config + setup in `src/apps/storybook/`
- [ ] Slice: Component stories for `client/ui` design system

#### 3.22 Frontend UX polish (CHECKLIST 8 Frontend Gaps)

- [ ] Slice: Command palette (optional — defer if not blocking launch)

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

### Sprint 4: Test Backfill for Already-Complete Code

> Sprints 1-3 include "Unit + integration + E2E tests" for each **new** feature slice.
> Sprint 4 is **only** for backfilling tests on code already marked `[x]` in CHECKLIST.md
> that was shipped without adequate test coverage (e.g., Auth at ~40% unit, 0% integration/E2E).
>
> Unit tests are colocated. Integration tests live in `apps/server/src/__tests__/integration/`.
> E2E tests live in `apps/web/e2e/`.

1. Test infrastructure setup
   - [ ] Slice: Playwright config + base test fixtures (`apps/web/e2e/` setup)
   - [ ] Slice: Integration test harness — test DB setup/teardown, Fastify inject helpers (`apps/server/src/__tests__/integration/`)
   - [ ] Slice: CI pipeline step for E2E tests (Playwright in headless mode)

2. Auth test pipeline (CHECKLIST 14.1)
   - [ ] Slice: Unit tests for all auth handlers (register, login, refresh, logout, reset, magic link, OAuth, TOTP, email change, canonicalization)
   - [ ] Slice: Integration tests for all auth HTTP endpoints
   - [ ] Slice: E2E tests — register/verify/login, password reset, 2FA, OAuth, lockout

3. Sessions test pipeline (CHECKLIST 14.2)
   - [ ] Slice: Unit tests for session handlers + UA parsing
   - [ ] Slice: Integration tests for session endpoints
   - [ ] Slice: E2E tests — view sessions, revoke, "log out all devices"

4. Multi-tenant test pipeline (CHECKLIST 14.4)
   - [ ] Slice: Unit tests for role hierarchy, orphan prevention, tenant scoping
   - [ ] Slice: Integration tests for tenant CRUD, invitations, membership management
   - [ ] Slice: E2E tests — create workspace, invite member, switch context

5. Billing test pipeline (CHECKLIST 14.6)
   - [ ] Slice: Unit tests for entitlements, webhook verification, state machine
   - [ ] Slice: Integration tests for plan CRUD, webhook processing, checkout
   - [ ] Slice: E2E tests — pricing page, checkout, upgrade/downgrade, invoices

6. Remaining domain test pipelines (CHECKLIST 14.3, 14.5, 14.7–14.13)
   - [ ] Slice: Account management tests (unit + integration + E2E)
   - [ ] Slice: RBAC tests (unit + integration + E2E)
   - [ ] Slice: Notifications tests (unit + integration + E2E)
   - [ ] Slice: Audit & security events tests (unit + integration + E2E)
   - [ ] Slice: Compliance tests (unit + integration + E2E)
   - [ ] Slice: Realtime/WebSocket tests (unit + integration + E2E)
   - [ ] Slice: Media processing tests (unit + integration + E2E)
   - [ ] Slice: API keys tests (unit + integration + E2E)
   - [ ] Slice: Admin console tests (unit + integration + E2E)

---

## Notes / Guardrails

- Prefer **one slice fully done** over "80% of five slices".
- Don't add new packages to implement a slice unless it removes duplication across apps.
- If you touch auth/session/billing flows, add at least one test that asserts the failure mode you're most worried about.
- For file placement rules during execution, follow `docs/todo/EXECUTION.md` (Hybrid Hexagonal standard).
