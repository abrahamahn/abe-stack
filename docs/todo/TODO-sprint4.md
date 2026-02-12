# TODO Sprint 4

Source: `docs/todo/TODO.md`
Sprint heading: ### Sprint 4: Test Backfill + Quality Hardening
Unchecked items captured: 203

> Auto-generated from TODO.md. This file contains only unchecked checklist items for this sprint.

## 4.1 Test Infrastructure Setup (CHECKLIST 14 Preamble)

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
- [ ] Harness: tenant context helpers — set `X-Workspace-Id` header for tenant-scoped tests

**CI Pipeline:**
- [ ] Workflow: E2E test step in `ci.yml` — install Playwright browsers, run in headless mode
- [ ] Workflow: E2E artifact upload — screenshots + videos on failure
- [ ] Workflow: test coverage reporting — collect and report coverage metrics
- [ ] Workflow: parallel test execution — split test suites across CI workers

## 4.2 Authentication Tests (CHECKLIST 14.1 | BUSINESS 8.1)

**Integration Tests (`apps/server/src/__tests__/integration/auth.integration.test.ts`):**
- [ ] `POST /api/auth/refresh` → rotates token, old token rejected on reuse
- [ ] `POST /api/auth/logout-all` → revokes all families except current
- [ ] `POST /api/auth/magic-link/request` → creates token, rate limited
- [ ] `POST /api/auth/magic-link/verify` → logs in user, creates new user if config allows
- [ ] `GET /api/auth/oauth/:provider` → returns valid authorization URL
- [ ] `GET /api/auth/oauth/:provider/callback` → exchanges code, creates/logs in user
- [ ] `POST /api/auth/change-email` + `/confirm` → full atomic email update flow
- [ ] `POST /api/auth/totp/setup` → `/enable` → `/disable` lifecycle against DB

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

## 4.3 Sessions & Device Security Tests (CHECKLIST 14.2 | BUSINESS 8.1)

**Integration Tests (`apps/server/src/__tests__/integration/sessions.integration.test.ts`):**
- [ ] Login creates `user_sessions` record with parsed UA fields
- [ ] Session record includes IP, user agent, device label

**E2E Tests (`apps/web/e2e/sessions.spec.ts`):**
- [ ] Login → navigate to settings → see active sessions list with "This device" indicator
- [ ] Login from two sessions → revoke one → verify revoked session is logged out
- [ ] "Log out all other devices" → only current session remains active
- [ ] Session shows human-readable device label (not raw UA string)

## 4.4 Account Management Tests (CHECKLIST 14.3 | BUSINESS 8.1)

**E2E Tests (`apps/web/e2e/account.spec.ts`):**
- [ ] Change username in settings → see updated username across the app
- [ ] Upload avatar → see avatar in profile and header
- [ ] Update profile fields → save → refresh → see persisted changes
- [ ] View profile completeness bar → fill missing fields → bar reaches 100%
- [ ] Delete account → confirm password → see logout; re-login attempt blocked
- [ ] Sudo mode: attempt sensitive action → prompted for password → re-auth → action succeeds

## 4.5 Multi-Tenant / Workspace Tests (CHECKLIST 14.4 | BUSINESS 8.2)

**Integration Tests (`apps/server/src/__tests__/integration/tenant.integration.test.ts`):**
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

## 4.6 RBAC & Authorization Tests (CHECKLIST 14.5 | BUSINESS 8.2)

**Integration Tests (`apps/server/src/__tests__/integration/rbac.integration.test.ts`):**
- [ ] Per-tenant role enforcement — viewer cannot write, member cannot manage members
- [ ] Resource ownership validation — user A cannot access user B's resources
- [ ] System admin vs workspace admin distinction
- [ ] Role change takes effect immediately on next request

**E2E Tests (`apps/web/e2e/rbac.spec.ts`):**
- [ ] Admin user: can access admin dashboard, manage users
- [ ] Regular user: admin routes return 403 / redirect to dashboard
- [ ] Workspace viewer: cannot create/edit resources; sees read-only UI
- [ ] Workspace admin: can manage members but cannot transfer ownership

## 4.7 Billing & Subscriptions Tests (CHECKLIST 14.6 | BUSINESS 8.3)

**Unit Tests (colocated):**
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

## 4.8 Notifications Tests (CHECKLIST 14.7 | BUSINESS 8.4)

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

## 4.9 Audit & Security Events Tests (CHECKLIST 14.8 | BUSINESS 8.5)

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

## 4.10 Compliance & Data Privacy Tests (CHECKLIST 14.9 | BUSINESS 8.6)

**Integration Tests (`apps/server/src/__tests__/integration/compliance.integration.test.ts`):**
- [ ] `POST /api/users/me/delete` → sets `deleted_at`, blocks login after grace period

**E2E Tests (`apps/web/e2e/compliance.spec.ts`):**
- [ ] Request data export → see "processing" status → receive download link
- [ ] Delete account → confirm → logged out → cannot log back in during grace period
- [ ] New ToS published → user forced to accept before continuing
- [ ] Accept ToS → normal access restored
- [ ] Consent preferences → toggle cookie consent → see updated state

## 4.11 Realtime & WebSocket Tests (CHECKLIST 14.10)

**Unit Tests (colocated):**
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

## 4.12 Media Processing Tests (CHECKLIST 14.11)

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

## 4.13 API Keys & Programmatic Access Tests (CHECKLIST 14.12)

**Integration Tests (`apps/server/src/__tests__/integration/api-keys.integration.test.ts`):**
- [ ] Revoked key → 401 on subsequent requests
- [ ] Expired key → 401 on subsequent requests
- [ ] Scope enforcement — key with `read` scope cannot access `write` endpoints
- [ ] Key creation requires sudo mode

**E2E Tests (`apps/web/e2e/api-keys.spec.ts`):**
- [ ] Settings → API keys → create key → copy value (shown once) → see it in list
- [ ] Revoke key → removed from list → API calls with that key fail
- [ ] Create key with limited scopes → verify scope labels displayed

## 4.14 Admin & Support Tests (CHECKLIST 14.13 | BUSINESS 8.7)

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

## 4.15 Operational Quality Tests (CHECKLIST 10 | Appendix E.4)

**Health & Readiness:**
- [ ] Integration: health check includes queue system status
- [ ] E2E: health endpoint accessible from browser (no auth required)

**Correlation IDs:**
- [ ] Integration: correlation ID propagated to downstream service calls and queue jobs

**Error Reporting:**
- [ ] Service: Sentry integration provider (optional, config-gated)

**Metrics:**
- [ ] Service: metrics interface — request count/latency, job success/fail counts
- [ ] Service: Prometheus-compatible `/metrics` endpoint (config-gated)
- [ ] Integration: request → metrics counter incremented
- [ ] Integration: job processed → metrics counter incremented

**OpenAPI / Swagger:**
- [ ] Integration: `/api/docs/json` returns valid OpenAPI 3.0 spec
- [ ] Validation: all annotated routes appear in generated spec

**Deployment Sanity (Appendix D):**
- [ ] Integration: `pnpm db:push` applies all migrations to fresh test DB without errors
- [ ] Integration: `seed.ts` seeds test data without errors on clean DB
- [ ] Integration: `bootstrap-admin.ts` creates admin user on empty DB, idempotent on re-run

## 4.16 Operational Blind Spot Verification (CHECKLIST 11)

**Rate Limiting & IP Policy (Appendix E.5):**
- [ ] Integration: rate limit preset enforced on auth endpoints (burst rejected, normal allowed)
- [ ] Integration: rate limit preset on general API endpoints (higher threshold than auth)
- [ ] Integration: IP blocklist (blocked IP returns 403 on all routes)

**Security Notifications (11.2):**
- [ ] Integration: password change → "Was this you?" email sent to user
- [ ] Integration: new API key generated → security notification email sent

**ToS Gating (11.3):**
- [ ] Integration: admin publishes new ToS version → users with old version blocked
- [ ] E2E: new ToS → modal appears → accept → normal access

## 4.17 Scheduled Job Tests (CHECKLIST Appendix C)
- [ ] Integration tests: job enqueued → processed → DB state updated correctly
- [ ] Integration: generic job lifecycle — enqueue → process → success callback; failure → retry with backoff → dead-letter after max retries
- [ ] E2E: admin job monitor page → see scheduled jobs, status, last run, next run

## 4.19 Activity Tracking, Feature Flags & Usage Metering Tests (Sprint 3.6 + 3.7 Backfill)

**Activity Tracking:**
- [ ] Integration: tenant-scoped activity isolation — tenant A cannot see tenant B's activities

**Feature Flags:**
- [ ] Integration: tenant-scoped flags — tenant-specific overrides vs global defaults

**Usage Metering:**
- [ ] Unit: meter increment logic — idempotency key, counter aggregation, period rollover
- [ ] Unit: usage limit enforcement — soft limit (warn) vs hard limit (block)
- [ ] Integration: API call → meter incremented → usage reflected in billing
- [ ] Integration: usage exceeds plan limit → appropriate response (429 or degraded)
- [ ] Integration: metering data feeds billing invoice line items

## 4.20 Webhook Delivery System Tests (Sprint 3.25 Backfill)

**Integration Tests:**
- [ ] Event triggered → webhook queued → delivered to endpoint → delivery logged
- [ ] Endpoint returns 500 → retry scheduled with exponential backoff
- [ ] Endpoint returns 200 → delivery marked successful, no retry
- [ ] Max retries exceeded → webhook marked failed, admin notified
- [ ] Tenant-scoped webhooks — tenant A's events don't trigger tenant B's webhooks

## 4.21 Desktop App Tests (Sprint 3.19 Backfill)

**Unit Tests:**
- [ ] IPC handler registration — all handlers registered with correct channel names
- [ ] Auth flow — token storage in secure keychain (keytar/safeStorage), token refresh on app resume
- [ ] Deep link handling — protocol handler parses `abe://` links correctly
- [ ] Auto-update — version check, download progress, install-on-quit logic
- [ ] Menu construction — correct items registered per platform (macOS vs Windows vs Linux)
- [ ] System tray — icon rendering, context menu items, click handlers
- [ ] Offline detection — network status change → queue operations, sync on reconnect

**Integration Tests (Electron test runner):**
- [ ] App launches → renders main window with correct preload script
- [ ] Login flow → tokens stored securely → subsequent launch auto-authenticates
- [ ] IPC: renderer requests data → main process fetches → result returned to renderer
- [ ] Offline → online transition → queued operations replayed successfully
- [ ] Menu items → correct IPC messages sent → expected actions performed

## 4.22 Golden Path Onboarding E2E (Appendix E.8)
- [ ] E2E: Register → verify email → create workspace → invite teammate → teammate accepts invite
- [ ] E2E: Select plan → complete checkout → see dashboard with team member and active subscription
- [ ] E2E: First success moment — user sees populated workspace with welcome content
- [ ] E2E: Negative path — expired invite link → clear error; invalid payment → graceful fallback
