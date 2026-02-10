# TODO (Execution Plan)

This file is the **factory-worker** plan: build the product via **vertical slices** (end-to-end) instead of “layers”.

Business-level feature tracking and progress live in `docs/CHECKLIST.md`.

Last updated: 2026-02-09

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

---

The ordering mirrors `docs/CHECKLIST.md` “Next Priority Actions”.

### Sprint 1: Security & Sessions (Ship Blockers)

1. Sessions HTTP wiring (CHECKLIST 2.3 + 2.7)
   - [ ] Slice: `GET /api/users/me/sessions`
   - [ ] Slice: `DELETE /api/users/me/sessions/:id`
   - [ ] Slice: `POST /api/users/me/sessions/revoke-all`
   - [ ] Slice: `GET /api/users/me/sessions/count`
   - [ ] Slice: Web UI wiring in Settings (route/nav + revoke actions + “this device”)

2. Turnstile / CAPTCHA on public auth forms (CHECKLIST 11.1)
   - [ ] Slice: server middleware + verification (config-gated)
   - [ ] Slice: apply to register/login/forgot-password (and invite accept if public)
   - [ ] Slice: client UI widget + error messaging
   - [ ] Slice: tests (verification happy path + fail closed)

3. “Was this you?” security emails (CHECKLIST 11.2)
   - [ ] Slice: security email template + send on suspicious login / sensitive change
   - [ ] Slice: minimal UI copy to explain event + recommended action

4. ToS version gating middleware (CHECKLIST 11.3)
   - [ ] Slice: middleware (protect sensitive routes, redirect/deny)
   - [ ] Slice: client handling (show ToS modal/page; accept -> proceed)

5. Granular login failure logging (CHECKLIST 11.4)
   - [ ] Slice: internal audit/security event enums for login failures
   - [ ] Slice: ensure HTTP responses remain generic (anti-enumeration)

6. Session labeling (UA parsing) (CHECKLIST 2.5)
   - [ ] Slice: parse/store UA label on login
   - [ ] Slice: display labels in sessions UI

### Sprint 2: Multi-Tenant Core (Make It Usable For Teams)

Keep this strictly vertical: create workspace -> invite -> accept -> switch context.

1. Tenant CRUD (CHECKLIST 4.2)
   - [ ] Slice: `POST /api/tenants` create workspace (transaction: tenant + owner membership)
   - [ ] Slice: `GET /api/tenants` list user’s workspaces

2. Invitations (CHECKLIST 4.4 + 4.8)
   - [ ] Slice: `POST /api/tenants/:id/invitations` create invite + send email
   - [ ] Slice: `POST /api/invitations/:token/accept` accept invite -> membership
   - [ ] Slice: UI: invite member flow in workspace settings

3. Tenant scoping middleware (CHECKLIST 4.9)
   - [ ] Slice: read `x-workspace-id`, validate membership, attach to request context
   - [ ] Slice: tenant switcher UI + header injection in client API

### Sprint 3: Operational Safety (Reduce Support Load)

1. Email change reversion hardening (CHECKLIST 1.9 + 11.2)
   - [ ] Slice: “revert email change” link to old email; lock + revoke all sessions

2. Impersonation (CHECKLIST 7.4)
   - [ ] Slice: `POST /api/admin/impersonate/:userId` + audit events
   - [ ] Slice: web UI banner + exit impersonation

3. Compliance basics (CHECKLIST 6.8)
   - [ ] Slice: data export request endpoint + admin visibility
   - [ ] Slice: deletion request endpoint + grace period job wiring

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

### Sprint 4: Test Coverage Pipeline (All Business Domains)

> Establish the three test layers across every business domain.
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
