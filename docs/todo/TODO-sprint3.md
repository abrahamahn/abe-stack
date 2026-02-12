# TODO Sprint 3

Source: `docs/todo/TODO.md`
Sprint heading: ### Sprint 3: Supporting Modules + Admin + Operational Completeness
Unchecked items captured: 229

> Auto-generated from TODO.md. This file contains only unchecked checklist items for this sprint.

## Sprint 3 Remaining Work (Incomplete TODO Backlog)

**P0 (Launch/Critical Path):**

- [ ] 3.2 Billing lifecycle end-to-end (subscriptions, invoices, upgrades/downgrades, entitlements, dunning)
- [ ] 3.17 Operational quality gaps (health/readiness verification, metrics, docs endpoint, queue verification)
- [ ] 3.18 Backend security/infra gaps (oauth-refresh job, webhook idempotency, email-change-revert token repo)
- [ ] 3.25 Webhook delivery completion (client/UI + integration/E2E)

**P1 (Admin/Workspace/Compliance):**

- [ ] 3.13 System admin gaps (webhook monitor/replay, health dashboard, per-tenant overrides)
- [ ] 3.12 Workspace admin remaining UI and invitation hardening (logo, danger zone, regenerate/reminder flow)
- [ ] 3.8 Compliance gaps (legal current/agreements endpoints, legal publish, consent banner, deletion status UI)
- [ ] 3.15 Ban flows completion (lock reason UX/email, hard-ban confirmation/cascade/anonymization)

**P2 (UX + Verification Backfill):**

- [ ] 3.1 API keys client/UI + integration/E2E
- [ ] 3.4 Notifications remaining email templates/bounce/unsubscribe + test coverage
- [ ] 3.5 Avatar/file pipeline verification + tests
- [ ] 3.6 Activities contracts + tests
- [ ] 3.7 Usage metering + workspace override UI + tests
- [ ] 3.9 Realtime reconnection/offline queue/delta sync + tests
- [ ] 3.10 Media library/gallery + tests
- [ ] 3.11 Settings completeness (preferences/API keys/backup codes tabs + E2E)
- [ ] 3.14 Impersonation integration/E2E
- [ ] 3.16 Data hygiene follow-through (search/list visibility, audit shape, FK safety, file cleanup, tests)
- [ ] 3.19 Desktop manual verification
- [ ] 3.20 Staging infra/docs
- [ ] 3.21 Storybook layout/pattern stories
- [ ] 3.23 Device detection remaining email template + integration/E2E
- [ ] 3.24 SMS 2FA integration/E2E

## 3.1 API Keys & Programmatic Access (CHECKLIST 6.1 | BUSINESS 1 IAM)

**Client + UI:**

- [x] Client API: `client/api/src/api-keys/client.ts` + `hooks.ts` — CRUD hooks
- [x] UI: API key management page in settings (create with name + scopes, copy-once, revoke)
- [x] UI: scope selector component (checkbox list of available scopes)

**Tests:**

- [x] Integration tests: create → use → revoke lifecycle, expired key rejection, scope enforcement
- [x] E2E test: settings → create key → copy → use in API call → revoke → verify rejected

## 3.2 Billing & Subscription Lifecycle (CHECKLIST 6.2 | BUSINESS 3)

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

## 3.3 Audit & Events Completeness (CHECKLIST 6.3 | BUSINESS 5.1)

**Workspace Audit Viewer:**

- [x] Route: `GET /api/tenants/:id/audit-events` — tenant-scoped events (paginated, filtered)
- [x] Service: filter by actor, action, target, date range within tenant scope
- [x] UI: audit event detail modal

**Retention + Cleanup:**

- [ ] Cron: archive to cold storage before deletion (optional, config-gated)

**Tests:**

- [ ] Unit: audit event creation (typed events), metrics aggregation, retention logic
- [ ] Integration: events written on actions, admin listing/filtering/export, tenant-scoped isolation
- [ ] E2E: admin → security events dashboard → filter → export; workspace admin → audit log

## 3.4 Communication & Notifications (CHECKLIST 6.4 | BUSINESS 4)

**Email Setup (BUSINESS 4.3):**

- [ ] Docs: SMTP configuration guide (dev: console provider, staging/prod: SMTP/SES)
- [ ] Service: verify SMTP config on server boot (optional health check)
- [ ] Templates: Email Verification — content + layout
- [ ] Templates: Password Reset — content + layout
- [ ] Templates: Workspace Invitation — content + layout

**Bounce + Unsubscribe:**

- [ ] Service: handle email bounces (soft/hard) — update delivery status
- [ ] Service: one-click unsubscribe header (RFC 8058)
- [ ] Route: `GET /api/email/unsubscribe/:token` — unsubscribe endpoint
- [ ] Service: respect unsubscribe preference in email sending pipeline

**Tests:**

- [ ] Unit: notification service (create, mark read, delete), template rendering, preference evaluation
- [ ] Integration: notification CRUD, email delivery (console provider), push lifecycle, preferences
- [ ] E2E: trigger action → bell shows alert → click → navigate; toggle preferences; transactional email

## 3.5 File Storage Endpoints (CHECKLIST 6.5)

**Avatar Pipeline Verification:**

- [ ] Verify: `PUT /api/users/me/avatar` → multipart → validate → resize → store to S3/local → update user record
- [ ] Verify: `DELETE /api/users/me/avatar` → remove file → update user record
- [ ] Verify: fallback chain — custom upload → Gravatar → generated initials

**Tests:**

- [ ] Unit: file type validation, size limits, presigned URL generation
- [ ] Integration: upload → store → retrieve → delete lifecycle; avatar upload pipeline
- [ ] E2E: upload file → see in list → download → delete

## 3.6 Activity Tracking (CHECKLIST 6.6)

- [ ] Contract: `shared/domain/activities/` — activity event types, request/response schemas

**Tests:**

- [ ] Unit: activity creation, feed query logic, filtering
- [ ] Integration: trigger action → activity logged → feed endpoint returns it
- [ ] E2E: perform action → see it in activity feed

## 3.7 Feature Flags & Usage Metering (CHECKLIST 6.7 | BUSINESS 5.4 + 5.5)

**Feature Flags (BUSINESS 5.4):**

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

## 3.8 Compliance & Data Privacy (CHECKLIST 6.8 | BUSINESS 6)

**Terms of Service (BUSINESS 6.1):**

- [ ] Route: `GET /api/legal/current` — get current ToS + privacy policy versions
- [ ] Route: `GET /api/users/me/agreements` — list user's accepted agreements
- [ ] Admin route: `POST /api/admin/legal/publish` — publish new ToS version

**Consent Management (BUSINESS 6.2):**

- [ ] UI: cookie consent banner on first visit (if applicable)

**Account Deletion — Right to be Forgotten (BUSINESS 6.4):**

- [ ] UI: deletion request status indicator (countdown to permanent deletion)

**Tests:**

- [ ] Unit: deletion logic (grace period, anonymization rules), export aggregation, consent versioning
- [ ] Integration: export request → job queued → archive generated; ToS gating + acceptance; consent CRUD
- [ ] E2E: request export → receive download; accept ToS modal; toggle consent preferences

## 3.9 Realtime Client Completeness (CHECKLIST 6.9)

- [ ] Client: automatic reconnection with exponential backoff on disconnect
- [ ] Client: offline queue — buffer outgoing messages during disconnect, flush on reconnect
- [ ] Client: missed-message recovery — request delta sync after reconnect

**Tests:**

- [ ] Unit: reconnection logic, offline queue buffering, delta sync request
- [ ] Integration: WebSocket connect → auth → subscribe → receive published message
- [ ] E2E: two browser tabs → action in tab A → real-time update in tab B; disconnect → reconnect → sync

## 3.10 Media HTTP Endpoints (CHECKLIST 6.11)

**Client Integration:**

- [ ] UI: media library/gallery component (grid of uploaded media)

**Tests:**

- [ ] Unit: upload validation, processing job creation, status transitions
- [ ] Integration: upload → queue → process → retrieve processed media; reject invalid types
- [ ] E2E: upload image → see processing → see thumbnail; upload invalid file → see error

## 3.11 User Settings Completeness (CHECKLIST 7.1 | BUSINESS 1 IAM)

**Preferences Page:**

- [ ] UI: preferences settings page (theme selector, timezone picker, locale dropdown)
- [ ] UI: notification preferences section (link to notification preference center from 3.4)

**Data Controls Page:**

- [ ] UI: confirmation dialogs with countdown for destructive actions

**API Key Management:**

- [ ] UI: API keys section in settings — list keys, create new, revoke (from 3.1)
- [ ] UI: key creation dialog — name input, scope checkboxes, copy-once modal

**TOTP Management:**

- [ ] UI: backup codes display + regenerate flow

**Settings Navigation:**

- [x] UI: add Preferences, Notifications, API Keys tabs (not yet routed)

**Tests:**

- [ ] E2E: navigate through all settings tabs; save/load preferences; manage API keys; configure 2FA

## 3.12 Workspace Admin (CHECKLIST 7.2 | BUSINESS 2 + 7)

**Workspace Settings:**

- [ ] UI: workspace logo upload (reuse avatar upload pattern)
- [ ] UI: danger zone — delete workspace (requires owner + sudo)

**Workspace Billing:**

- [ ] UI: current plan display + upgrade/downgrade buttons (links to billing flow from 3.2)
- [ ] UI: invoice list for workspace (from 3.2)
- [ ] UI: "Manage Payment Method" button → Stripe customer portal redirect

**Workspace Feature Overrides:**

- [ ] UI: feature flag overrides list (from 3.7 — tenant override CRUD)
- [ ] UI: toggle overrides per flag for this workspace

**Invitation Lifecycle Hardening (CHECKLIST 4.8):**

- [x] Route: `POST /api/tenants/:id/invitations/:id/regenerate` — new token + new expiry (reuse existing invite record)
- [ ] Service: invitation reminder email — configurable N days before expiry (requires email template)

**Tests:**

- [ ] E2E: invite member → accept → appears in list; change role; remove member; edit workspace settings
- [ ] Integration: accept expired invitation → rejected; regenerate invitation → new token works; exceed max pending → rejected

## 3.13 System Admin Completeness (CHECKLIST 7.3 | BUSINESS 7)

**Tenant Management (BUSINESS 7.2):**

- [ ] UI: plan override selector — assign specific plan to tenant

**Webhook Monitor + Replay:**

- [x] Route: `GET /api/admin/webhooks` — list registered webhooks
- [x] Route: `GET /api/admin/webhooks/:id/deliveries` — delivery history (success/fail/retry)
- [x] Route: `POST /api/admin/webhooks/:id/deliveries/:deliveryId/replay` — replay failed delivery
- [ ] UI: webhook list with status indicators
- [ ] UI: delivery log with retry/replay buttons

**Feature Flag Admin:**

- [ ] UI: per-tenant override table

**System Health Dashboard (BUSINESS 7.3):**

- [x] Route: `GET /api/admin/health` — aggregated system health (DB, cache, queue, storage)
- [ ] UI: health dashboard page — component status cards (green/yellow/red)
- [ ] UI: job queue stats widget (pending, processing, failed counts + charts)
- [ ] UI: recent error log widget (last N errors with stack traces)
- [ ] UI: active connections count (WebSocket, HTTP)

**Tests:**

- [ ] Unit: multi-field search, tenant suspension logic
- [ ] Integration: admin user CRUD, tenant CRUD, webhook replay, health endpoint
- [ ] E2E: admin searches user → views detail → locks; admin manages tenants; admin views health

## 3.14 Impersonation / Shadow Login (CHECKLIST 7.4 | BUSINESS 7.1)

**Tests:**

- [ ] Integration: start → perform actions → verify audit trail → end; admin-only enforcement
- [ ] E2E: admin impersonates user → sees user's dashboard → sees banner → ends session → returns to admin

## 3.15 Soft Ban / Hard Ban (CHECKLIST 7.5)

**Soft Ban Enhancements:**

- [ ] Service: lock reason displayed to user on login attempt ("Your account has been suspended. Reason: ...")
- [ ] Service: notification email on lock/unlock (to user)
- [ ] UI: admin lock dialog — reason input + duration selector (permanent / 1h / 24h / 7d / 30d / custom)
- [ ] UI: user-facing lock message on login page

**Hard Ban:**

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

## 3.16 Data Hygiene — Background Jobs + Crons (CHECKLIST 9.1 + 9.2 | BUSINESS 6.4)

**Soft Delete Enforcement:**

- [ ] Service: hide soft-deleted users from search results and member lists
- [ ] Service: preserve audit trail — soft-deleted user's events remain queryable by admin

**PII Anonymization Cron (BUSINESS 6.4):**

- [ ] Service: preserve audit log structure — replace actor names with "Deleted User (hash)"
- [ ] Service: foreign key safety — audit logs, invoices, activity history must not break
- [ ] Service: delete stored files (avatars, uploads) associated with anonymized users

**Tests:**

- [ ] Unit: anonymization rules, grace period calculation, foreign key safety checks
- [ ] Integration: soft-delete user → cron runs → PII anonymized → audit trail intact
- [ ] Integration: create unverified user → wait past threshold → cron deletes → user gone

## 3.17 Operational Quality (CHECKLIST 10 | BUSINESS 5)

**Health + Readiness:**

- [ ] Verify: `GET /health` — returns server health (up/degraded/down)
- [ ] Verify: `GET /ready` — returns readiness (DB connected, cache warm, queue running)
- [ ] Service: health check includes all subsystems (DB, cache, queue, storage, email)
- [ ] Verify: correlation ID appears in log output for all requests

**Error Reporting:**

- [ ] Service: breadcrumbs for request lifecycle (auth, DB, external calls)
- [ ] Client: Sentry browser SDK integration (error boundary → Sentry)

**Metrics:**

- [ ] Service: request count + latency metrics (per route, per status code)
- [ ] Service: job queue metrics (pending, processing, completed, failed per queue)
- [ ] Service: auth metrics (login attempts, success rate, lockouts per period)
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

## 3.18 Backend Infrastructure Gaps (CHECKLIST 8 Gaps + Appendix C)

**Scheduled Cleanup Jobs (Appendix C):**

- [ ] Job: `oauth-refresh` — proactively renew expiring OAuth tokens (hourly)

**Security:**

- [ ] Middleware: IP blocklist/reputation hooks — per-route policy config (Appendix E.5)
- [ ] Service: idempotent webhook receiving — store event IDs, ignore duplicates, safe out-of-order handling (Appendix D)
- [ ] Service: file upload scanning hooks — extensible middleware for malware/script detection (Appendix E.7)
- [ ] Docs: secret rotation guidelines — JWT secrets, API keys, OAuth client secrets, env patterns (Appendix E.7)

**Repository Gaps (Module 2 Verification):**

- [ ] Repo: extract `email_change_revert_tokens` operations from raw SQL in `email-change.ts` into a dedicated repository (consistency with other auth token repos)

**Developer Experience:**

- [ ] Tool: generated API client package — auto-generate typed fetch client from route definitions
- [ ] Tool: module scaffold CLI — `pnpm scaffold:module <name>` → creates handler, service, route, test stubs
- [ ] Tool: `pnpm db:reset` — convenience command to drop + recreate + migrate + seed dev DB (Appendix E.6)

**Tests:**

- [ ] Unit: job scheduling, IP allowlist matching, webhook signature generation/verification
- [ ] Integration: scheduled jobs execute on schedule; IP allowlist blocks/allows correctly

## 3.19 Desktop App Gaps (CHECKLIST 12)

**Tests:**

- [ ] Manual: auto-update flow (mock update server); deep link → correct page; tray actions work

## 3.20 CI/CD Gaps (CHECKLIST 13.3)

**Staging Environment:**

- [ ] Infra: staging environment Terraform config (mirrors prod, smaller resources)
- [ ] Docs: staging environment setup guide

## 3.21 Storybook (CHECKLIST 12)

- [ ] Stories: layouts — AuthLayout, Container, Modal, AppShell, ResizablePanel
- [ ] Stories: patterns — forms, navigation, data tables, loading states

## 3.23 Security Intelligence & Device Detection (CHECKLIST 2.4 + 2.6) — COMPLETE

**Backend — Alerts:**

- [ ] Email template: "New login from {location}" alert (already partially wired in `sendNewLoginAlert`)

**Tests:**

- [ ] Integration tests: new device detection → security event created, token invalidation flow
- [ ] E2E test: login → see new device banner → trust device → banner gone on next login

## 3.24 Phone / SMS Two-Factor Authentication (CHECKLIST 3.5 | BUSINESS 1.9) — COMPLETE

**Tests:**

- [ ] Integration tests: phone verification flow, SMS 2FA login challenge end-to-end
- [ ] E2E test: settings → add phone → verify → enable SMS 2FA → login with SMS code

## 3.25 Webhook Delivery System (BUSINESS 5.3 | CHECKLIST Appendix D)

**Client + UI:**

- [ ] Client API: `webhooks/client.ts` — CRUD hooks for webhook management
- [ ] UI: Webhook management page — create, list, edit, delete webhooks
- [ ] UI: Webhook detail — delivery log with success/failure indicators, replay button

**Tests:**

- [ ] Integration: register webhook → trigger event → delivery queued → POST sent → logged
- [ ] Integration: endpoint failure → retry scheduled → eventual dead-letter
- [ ] E2E: admin → create webhook → trigger event → see delivery in log

## Sprint 3 Cross-Reference Summary

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
