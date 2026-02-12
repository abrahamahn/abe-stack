# TODO (Execution Plan)

This file is the **factory-worker** plan: build the product via **vertical slices** (end-to-end) instead of “layers”.

Business-level feature tracking and progress live in `docs/CHECKLIST.md`.

Last updated: 2026-02-12

---

## Status Snapshot

- This file tracks **open work only** (`- [ ]`).
- Completed checklist entries were migrated to `docs/log/2026-W07.md`.
- Focus order: Sprint 3 -> Sprint 4 -> Sprint 5 -> Sprint 6.

---

## Quick Navigation

- [How To Use This File](#how-to-use-this-file)
- [Definition of Done](#definition-of-done-per-slice)
- [DB Artifact Checklist](#db-artifact-checklist-when-slice-touches-the-database)
- [Work Queue](#work-queue-ordered-for-day-1-launch)
- [Sprint 3 Remaining Work](#sprint-3-remaining-work-incomplete-todo-backlog)
- [Sprint 4: Test Backfill + Quality Hardening](#sprint-4-test-backfill--quality-hardening)
- [Sprint 5: Production Launch Readiness & Polish](#sprint-5-production-launch-readiness--polish)
- [Sprint 6: Post-Launch Platform Maturity & Growth](#sprint-6-post-launch-platform-maturity--growth)
- [Notes / Guardrails](#notes--guardrails)

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
- [ ] Dev bootstrap is not missing it: `src/tools/scripts/db/push.ts` (if you rely on `pnpm db:push` for local dev)
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

> Archived verification notes (kept for traceability):

<details>
<summary>Expand Verification Queue</summary>

### Auth Verification (CHECKLIST 1.1–1.11) — COMPLETE

All 11 auth sub-systems verified: Registration, Email Verification, Login, Token Refresh, Logout, Password Reset, Magic Link, OAuth2, Email Change, TOTP, Canonicalization. All contracts, routes, clients, and tests pass.

### Sessions Verification (CHECKLIST 2.1–2.5) — COMPLETE

Sessions API (2.3) and UA labeling (2.5) verified. All contracts, routes, clients, and tests pass.

### Module 1 Verification: Identity (Appendix A) — COMPLETE

All identity tables verified: `users`, `tenants`, `memberships`, `invitations`, `user_sessions`. Migrations, schema constants, repos, and domain types all present.

### Module 2 Verification: Auth & Security (Appendix A)

All auth tables verified except one partial item:

- [ ] `email_change_revert_tokens` repo: uses raw SQL in `email-change.ts`, no dedicated repository → **tracked in Sprint 3.18**

### Infra-Complete Domains (Build-Time Integrity) — COMPLETE

#### Verify Multi-Tenant Infra (4.1)

#### Verify RBAC Definitions (5.1)

#### Verify Realtime (Server) (6.9)

#### Verify WebSocket Transport (6.10)

#### Verify Media Processing (Server) (6.11)

#### Verify Desktop Scaffold (12)

### Account Management Verification (CHECKLIST 3) — COMPLETE

Pre-Sprint-2: Username auto-generation (3.2), avatar workflow (3.3), profile (3.4), account locking (3.6) verified.
Sprint 2 additions: Sudo mode (3.1), username management with cooldown/blocklist (3.2), profile completeness (3.4), account lifecycle deactivate/delete/reactivate (3.6) all verified. Handlers, schemas, client UI (SudoModal, UsernameForm, ProfileCompleteness, DangerZone), and tests pass.

### Tenant Scoping & RBAC Verification (CHECKLIST 4.2–4.9, 5.2–5.3) — COMPLETE

Pre-Sprint-2: Workspace context utilities (4.9) and backend guards (5.2) verified.
Sprint 2 additions: Tenant CRUD (4.2), membership management (4.3), invitation flow (4.4), orphan prevention (4.5), role hierarchy (4.6), domain restrictions (4.7), workspace-scope middleware (4.9), per-tenant enforcement (5.2), frontend auth gating — Can, RequireWorkspaceRole, usePermissions (5.3) all verified. All handlers, services, client UI (workspace feature), and tests pass.

#### Verify ProtectedRoute Component (5.3)

### Module 3 Verification: Billing DB (Appendix A) — COMPLETE

### Module 4-9 Verification: Supporting DB (Appendix A) — COMPLETE

### Supporting Modules Verification (CHECKLIST 6) — COMPLETE

#### Verify API Keys DB Layer (6.1)

#### Verify Billing Infrastructure (6.2)

#### Verify Audit & Security Events (6.3)

#### Verify Notifications Infrastructure (6.4)

#### Verify File Storage Infrastructure (6.5)

#### Verify Activity Tracking DB (6.6)

#### Verify Feature Flags & Metering DB (6.7)

#### Verify Compliance DB Layer (6.8)

#### Verify Realtime Client (6.9)

### Admin & Support Verification (CHECKLIST 7)

#### Verify User Settings — Existing Parts (7.1) — COMPLETE

#### Verify System Admin (7.3) + Soft Ban (7.5) — COMPLETE

Admin UI (user list, detail, actions, security events, job monitor, billing, layout, API, role badge) and soft ban (lock/unlock) all verified.

### Architecture & Infrastructure Verification (CHECKLIST 8) — COMPLETE

#### Verify Backend Core Infrastructure

#### Verify Server Engine Adapters

#### Verify Security Modules

#### Verify Server App Middleware

#### Verify Job Idempotency

- [ ] Job idempotency keys prevent duplicate execution — **GAP**: no idempotency key field in Task interface
- [ ] Tests: job idempotency tests pass — deferred until idempotency keys added

### Frontend Verification (CHECKLIST 8 Frontend) — COMPLETE

#### Verify Core UI

#### Verify Client Engine

#### Verify Client API

#### Verify PWA Support

#### Verify Web App Features

### Operational Quality Verification (CHECKLIST 10) — COMPLETE

### Login Attempt Logging Verification (CHECKLIST 11.4) — COMPLETE

### Infrastructure & CI/CD Verification (CHECKLIST 13) — COMPLETE

#### Verify Containerization (13.1)

#### Verify Cloud Deployment (13.2)

#### Verify CI Pipelines (13.3)

#### Verify Dev Tooling (13.4)

- [ ] Git hooks: pre-commit, pre-push execute correctly — **GAP**: no `/infra/git-hooks/` directory found; hooks configured via `lint-staged` in package.json

#### Verify Engine Queue/Job System (Appendix C)

#### Verify Engine Search (Appendix C)

</details>

---

The ordering mirrors `docs/CHECKLIST.md` priority actions. Sprints 1-3 cover **all** of CHECKLIST sections 1-13. Sprint 4 covers test backfill (CHECKLIST 14). Sprint 5 covers production launch readiness, hardening, and polish. Sprint 6 covers post-launch growth: CHET-Stack real-time, WebAuthn/Passkeys, API tooling, scaling, and i18n.

---

### Sprint 1: Ship Blockers + Auth/Session Completeness — COMPLETE (8/8)

> Covers: CHECKLIST 1 (gaps), 2 (all gaps), 11 (all).
> Completed: 1.1 Session UI wiring, 1.2 Session security hardening, 1.3 Security Intelligence, 1.4 CAPTCHA, 1.5 Security emails, 1.6 ToS gating, 1.7 Login failure logging, 1.8 TOTP QR code.
> **Note:** Session idle timeout + max concurrent sessions (CHECKLIST 2.4) are implemented in `refresh.ts` and `login.ts` respectively.

---

### Sprint 2: Multi-Tenant + RBAC + Account Management — COMPLETE (15/15)

> Covers: CHECKLIST 3 (all), 4 (all gaps), 5 (all gaps).
> Completed: 2.1 Sudo mode, 2.2 Username management, 2.3 Avatar workflow, 2.4 Profile management, 2.5 Phone/SMS 2FA, 2.6 Account lifecycle, 2.7 Tenant CRUD, 2.8 Membership management, 2.9 Invitation flow, 2.10 Orphan prevention, 2.11 Role hierarchy, 2.12 Domain restrictions, 2.13 Tenant scoping, 2.14 RBAC backend, 2.15 RBAC frontend.

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

#### Sprint 3 Remaining Work (Incomplete TODO Backlog)

> Snapshot date: 2026-02-12. This is the canonical list of still-open Sprint 3 work.
> `Total open checkboxes: 206` across slices `3.1`-`3.25`.

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

**Open Item Count by Slice (for tracking):**

| Slice | Open Items | Slice | Open Items | Slice | Open Items |
| ----- | ---------- | ----- | ---------- | ----- | ---------- |
| 3.1   | 5          | 3.10  | 4          | 3.19  | 1          |
| 3.2   | 25         | 3.11  | 8          | 3.20  | 2          |
| 3.3   | 7          | 3.12  | 11         | 3.21  | 2          |
| 3.4   | 12         | 3.13  | 15         | 3.22  | 0          |
| 3.5   | 6          | 3.14  | 2          | 3.23  | 3          |
| 3.6   | 4          | 3.15  | 15         | 3.24  | 2          |
| 3.7   | 10         | 3.16  | 8          | 3.25  | 20         |
| 3.8   | 8          | 3.17  | 19         |       |            |
| 3.9   | 6          | 3.18  | 11         |       |            |

---

#### 3.1 API Keys & Programmatic Access (CHECKLIST 6.1 | BUSINESS 1 IAM)

> **Existing:** `api_keys` table, repository with full CRUD, domain types/schemas.
> **Gap:** Zero HTTP endpoints, zero auth middleware, zero client UI.

**Contract + Service:**

**Routes + Middleware:**

**Client + UI:**

**Tests:**

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

**General Audit Integration:**

**Retention + Cleanup:**

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
- [ ] Templates: Email Verification — content + layout
- [ ] Templates: Password Reset — content + layout
- [ ] Templates: Workspace Invitation — content + layout

**In-App Notifications (BUSINESS 4.1):**

**Push Notifications (BUSINESS 4.2):**

**Notification Preferences (BUSINESS 4.4):**

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

> **Existing:** `files` table + repo, S3 + local storage providers, media processing pipeline,
> HTTP endpoints (upload, get, delete, download) via `core/files/routes.ts`.
> **Gap:** Avatar pipeline verification, integration/E2E tests.

**Routes:**

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

> ToS gating middleware + acceptance wired in Sprint 1.6. Remaining: admin publish + agreements list.

- [ ] Route: `GET /api/legal/current` — get current ToS + privacy policy versions
- [ ] Route: `GET /api/users/me/agreements` — list user's accepted agreements
- [ ] Admin route: `POST /api/admin/legal/publish` — publish new ToS version

**Consent Management (BUSINESS 6.2):**

- [ ] UI: cookie consent banner on first visit (if applicable)

**Data Export — Right to Portability (BUSINESS 6.3):**

**Account Deletion — Right to be Forgotten (BUSINESS 6.4):**

> Self-service deletion API built in Sprint 2.6. Remaining: hard-delete cron + PII anonymization.

- [ ] UI: deletion request status indicator (countdown to permanent deletion)

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

**Client Integration:**

- [ ] UI: media library/gallery component (grid of uploaded media)

**Tests:**

- [ ] Unit: upload validation, processing job creation, status transitions
- [ ] Integration: upload → queue → process → retrieve processed media; reject invalid types
- [ ] E2E: upload image → see processing → see thumbnail; upload invalid file → see error

---

#### 3.11 User Settings Completeness (CHECKLIST 7.1 | BUSINESS 1 IAM)

> **Existing (post Sprint 2):** ProfileForm, UsernameForm, AvatarUpload, PasswordChangeForm,
> TotpManagement, TotpQrCode, SudoModal, ProfileCompleteness, SessionsList, SessionCard,
> OAuthConnectionsList, DangerZone + hooks — all wired in SettingsPage.
> **Gap:** Preferences UI page, API key management UI, backup codes UI, settings tab routing.

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

**Magic Link Frontend (CHECKLIST 1.7 | BUSINESS 1.5):**

> Backend complete. Frontend wired: `MagicLinkForm.tsx` + `MagicLinkVerifyPage.tsx` + full API stack.

**Settings Navigation:**

**Tests:**

- [ ] E2E: navigate through all settings tabs; save/load preferences; manage API keys; configure 2FA

---

#### 3.12 Workspace Admin (CHECKLIST 7.2 | BUSINESS 2 + 7)

> **Existing (post Sprint 2):** Tenant CRUD, memberships, invitations (backend + frontend).
> Workspace feature: MembersList, InviteMemberDialog, InvitationsList, CreateWorkspaceDialog,
> WorkspaceSettingsForm, TenantSwitcher, Can, RequireWorkspaceRole + hooks + workspaceApi.
> **Gap:** Billing, audit log, feature overrides, domain restrictions UI, invitation lifecycle hardening.

**Members + Invitations UI:**

**Role Management UI:**

**Workspace Settings:**

- [ ] UI: workspace logo upload (reuse avatar upload pattern)
- [ ] UI: danger zone — delete workspace (requires owner + sudo)

**Workspace Billing:**

- [ ] UI: current plan display + upgrade/downgrade buttons (links to billing flow from 3.2)
- [ ] UI: invoice list for workspace (from 3.2)
- [ ] UI: "Manage Payment Method" button → Stripe customer portal redirect

**Workspace Audit Log:**

**Workspace Feature Overrides:**

- [ ] UI: feature flag overrides list (from 3.7 — tenant override CRUD)
- [ ] UI: toggle overrides per flag for this workspace

**Domain Restrictions:**

**Invitation Lifecycle Hardening (CHECKLIST 4.8):**

> Sprint 2.9 built the core invitation flow. These items harden lifecycle management.

- [ ] Service: invitation reminder email — configurable N days before expiry (requires email template)

**Tests:**

- [ ] E2E: invite member → accept → appears in list; change role; remove member; edit workspace settings
- [ ] Integration: accept expired invitation → rejected; regenerate invitation → new token works; exceed max pending → rejected

---

#### 3.13 System Admin Completeness (CHECKLIST 7.3 | BUSINESS 7)

> **Existing:** User list/detail/lock/search, security events UI, job monitor,
> billing plan management, admin layout, admin API, tenant list/detail/suspend pages,
> feature flag admin UI (`FeatureFlagsPage.tsx`).
> **Gap:** Webhook monitor UI, health dashboard UI, per-tenant override table.

**User Support (BUSINESS 7.1):**

**Tenant Management (BUSINESS 7.2):**

- [ ] UI: plan override selector — assign specific plan to tenant

**Webhook Monitor + Replay:**

- [ ] UI: webhook list with status indicators
- [ ] UI: delivery log with retry/replay buttons

**Feature Flag Admin:**

- [ ] UI: per-tenant override table

**System Health Dashboard (BUSINESS 7.3):**

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

> **Existing:** Full service (`core/admin/impersonation.ts`), handlers, routes, audit logging,
> UI banner (`ImpersonationBanner.tsx`), hook (`useImpersonation.ts`), all with tests.
> **Purpose:** Allow admin/support to see the app as a specific user for debugging.

**Contract + Service:**

**Routes:**

**Audit Trail:**

**Client + UI:**

**Tests:**

- [ ] Integration: start → perform actions → verify audit trail → end; admin-only enforcement
- [ ] E2E: admin impersonates user → sees user's dashboard → sees banner → ends session → returns to admin

---

#### 3.15 Soft Ban / Hard Ban (CHECKLIST 7.5)

> **Existing:** Soft ban (lock/unlock) exists with `isAccountLocked()` check.
> **Gap:** No lock reason, no timed locks, no notification emails, no hard ban.

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

---

#### 3.16 Data Hygiene — Background Jobs + Crons (CHECKLIST 9.1 + 9.2 | BUSINESS 6.4)

> Self-service deletion API + UI live in Sprint 2.6 (Account Lifecycle).
> This slice covers the background enforcement: crons, anonymization, and cleanup.

**Soft Delete Enforcement:**

- [ ] Service: hide soft-deleted users from search results and member lists
- [ ] Service: preserve audit trail — soft-deleted user's events remain queryable by admin

**PII Anonymization Cron (BUSINESS 6.4):**

- [ ] Service: preserve audit log structure — replace actor names with "Deleted User (hash)"
- [ ] Service: foreign key safety — audit logs, invoices, activity history must not break
- [ ] Service: delete stored files (avatars, uploads) associated with anonymized users

**Unverified User Cleanup (CHECKLIST 9.2):**

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

---

#### 3.18 Backend Infrastructure Gaps (CHECKLIST 8 Gaps + Appendix C)

> **Existing:** Job system complete (types, client, writer, memory store).
> **Gap:** No scheduled jobs, no IP allowlisting, no webhook signing,
> no generated API client, no module scaffold CLI.

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

---

#### 3.19 Desktop App Gaps (CHECKLIST 12)

> **Existing:** Electron main process, preload script, IPC handlers, React entry point.
> **Gap:** No auto-updater, no native menu, no deep link handling.

**Tests:**

- [ ] Manual: auto-update flow (mock update server); deep link → correct page; tray actions work

---

#### 3.20 CI/CD Gaps (CHECKLIST 13.3)

> **Existing:** CI, deploy, security, audit, rollback, infra workflows all working.
> **Gap:** No staging environment, no PR preview deployments.

**Staging Environment:**

- [ ] Infra: staging environment Terraform config (mirrors prod, smaller resources)
- [ ] Docs: staging environment setup guide

**Preview Deployments:**

---

#### 3.21 Storybook (CHECKLIST 12)

> **Existing:** `src/apps/storybook/` directory exists but empty.
> **Gap:** No config, no stories.

- [ ] Stories: layouts — AuthLayout, Container, Modal, AppShell, ResizablePanel
- [ ] Stories: patterns — forms, navigation, data tables, loading states

---

#### 3.22 Frontend UX Polish (CHECKLIST 8 Frontend Gaps)

---

#### 3.23 Security Intelligence & Device Detection (CHECKLIST 2.4 + 2.6) — COMPLETE

> **Existing:** Login handler already logs IP + user agent per session. `security_events` table exists.
> `isNewDevice` check exists in `handleLogin` (compares IP + UA against active sessions).
> Also includes session enforcement items deferred from Sprint 1.2 (CHECKLIST 2.4):
> idle timeout and max concurrent sessions.

**Backend — Detection + Storage:**

**Backend — Token Version Invalidation:**

> Note: This is distinct from Sprint 1.2's "max concurrent sessions" (limit N active sessions).
> Token version invalidation forces ALL sessions to re-authenticate after security events.

**Session Enforcement (CHECKLIST 2.4) — IMPLEMENTED:**

**Backend — Alerts:**

- [ ] Email template: "New login from {location}" alert (already partially wired in `sendNewLoginAlert`)

**Client + UI:**

**Tests:**

- [ ] Integration tests: new device detection → security event created, token invalidation flow
- [ ] E2E test: login → see new device banner → trust device → banner gone on next login

---

#### 3.24 Phone / SMS Two-Factor Authentication (CHECKLIST 3.5 | BUSINESS 1.9) — COMPLETE

> **Existing:** TOTP 2FA is fully implemented. SMS provider in `server/engine/src/sms/`.
> Migration `0023_sms_verification.sql` creates `sms_verification_codes` table.

**Backend — SMS Provider:**

**Backend — Phone Number Management:**

**Backend — SMS 2FA Challenge:**

**Client + UI:**

**Tests:**

- [ ] Integration tests: phone verification flow, SMS 2FA login challenge end-to-end
- [ ] E2E test: settings → add phone → verify → enable SMS 2FA → login with SMS code

---

#### 3.25 Webhook Delivery System (BUSINESS 5.3 | CHECKLIST Appendix D)

> **Existing:** `webhooks` table + `webhook_deliveries` table (DB complete). Webhook monitor +
> replay UI in Sprint 3.13. Request signing in Sprint 3.18.
> **Gap:** No webhook registration CRUD, no event subscription, no actual delivery service
> (send HTTP POST to registered URLs when events occur), no retry pipeline.

**Backend — Webhook Registration:**

**Backend — Event Subscription + Delivery:**

**Client + UI:**

- [ ] Client API: `webhooks/client.ts` — CRUD hooks for webhook management
- [ ] UI: Webhook management page — create, list, edit, delete webhooks
- [ ] UI: Webhook detail — delivery log with success/failure indicators, replay button

**Tests:**

- [ ] Integration: register webhook → trigger event → delivery queued → POST sent → logged
- [ ] Integration: endpoint failure → retry scheduled → eventual dead-letter
- [ ] E2E: admin → create webhook → trigger event → see delivery in log

---

#### Sprint 3 Cross-Reference Summary

> Maps Sprint 3 items to BUSINESS.md sections for completeness verification.

| BUSINESS.md Section       | Sprint 3 Items                                                                     | Coverage                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1. IAM (gaps)             | 3.1 API Keys, 3.11 Settings (+ magic link UI), 3.23 Security Intel, 3.24 SMS 2FA   | Full (includes magic link frontend wiring)                                       |
| 2. Team & Workspace (UI)  | 3.12 Workspace Admin (+ invitation lifecycle hardening)                            | UI + invitation crons/limits (backend in Sprint 2)                               |
| 3. Billing & Monetization | 3.2 Billing Lifecycle                                                              | Full (checkout, recurring, invoicing, upgrade/downgrade, usage limits)           |
| 4. Communication          | 3.4 Notifications                                                                  | Full (in-app, push, email, preferences)                                          |
| 5. System Operations      | 3.3 Audit, 3.6 Activity, 3.7 Flags+Metering, 3.17 Ops, 3.18 Backend, 3.25 Webhooks | Full (audit, jobs, webhook delivery, flags, metering, health, revert-token repo) |
| 6. Compliance & Legal     | 3.8 Compliance, 3.16 Data Hygiene                                                  | Full (ToS, consent, export, deletion)                                            |
| 7. Business Admin Console | 3.13 System Admin, 3.14 Impersonation, 3.15 Bans                                   | Full (user support, tenant mgmt, health)                                         |
| Sessions (CHECKLIST 2.4)  | 3.23 Security Intel (+ idle timeout, max concurrent sessions)                      | Deferred from Sprint 1.2 — consolidated with device detection                    |
| 8. Test Pipelines         | Each item includes unit + integration + E2E                                        | Inline per slice; backfill in Sprint 4                                           |

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
>
> **Before starting each section:** Check Sprint 1-3 test coverage first. Skip tests already
> delivered inline with feature slices. Focus backfill on existing code with zero coverage.

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

---

#### 4.3 Sessions & Device Security Tests (CHECKLIST 14.2 | BUSINESS 8.1)

> **Existing:** Route existence integration tests, basic auth guards tested.
> **Gap:** Zero handler unit tests, zero real DB integration, zero E2E.

**Unit Tests (colocated):**

**Integration Tests (`apps/server/src/__tests__/integration/sessions.integration.test.ts`):**

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

**Integration Tests (`apps/server/src/__tests__/integration/account.integration.test.ts`):**

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

---

#### 4.6 RBAC & Authorization Tests (CHECKLIST 14.5 | BUSINESS 8.2)

> **Existing:** Permission checker (batch), middleware (Fastify preHandler), role-based presets.
> **Gap:** Zero end-to-end authorization flow tests, zero E2E role-gating tests.

**Unit Tests (colocated):**

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

---

#### 4.7 Billing & Subscriptions Tests (CHECKLIST 14.6 | BUSINESS 8.3)

> **Existing:** 6 billing tables, admin plan CRUD, Stripe/PayPal webhook routes + providers,
> entitlements domain logic, client UI pages.
> **Gap:** Zero webhook processing integration tests, zero subscription lifecycle E2E.

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

---

#### 4.8 Notifications Tests (CHECKLIST 14.7 | BUSINESS 8.4)

> **Existing:** Notification tables + repos, push subscription table, preference table.
> Email templates table + console provider.
> **Gap:** Zero notification service tests, zero delivery pipeline tests, zero E2E.

**Unit Tests (colocated):**

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

**Integration Tests (`apps/server/src/__tests__/integration/compliance.integration.test.ts`):**

- [ ] `POST /api/users/me/delete` → sets `deleted_at`, blocks login after grace period

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

**Integration Tests (`apps/server/src/__tests__/integration/api-keys.integration.test.ts`):**

- [ ] Revoked key → 401 on subsequent requests
- [ ] Expired key → 401 on subsequent requests
- [ ] Scope enforcement — key with `read` scope cannot access `write` endpoints
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

---

#### 4.16 Operational Blind Spot Verification (CHECKLIST 11)

> **Existing:** CAPTCHA integration (Turnstile), ToS gating stub, login failure logging (partial).
> **Gap:** Security notification emails, email change reversion, granular failure reasons.

**Anti-Abuse (11.1):**

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

**Login Failure Logging (11.4):**

---

#### 4.17 Scheduled Job Tests (CHECKLIST Appendix C)

> **Existing:** Queue system (QueueServer + WriteService), memory store for dev/test.
> **Gap:** Scheduled job implementations are stubs, zero tests.

- [ ] Integration tests: job enqueued → processed → DB state updated correctly
- [ ] Integration: generic job lifecycle — enqueue → process → success callback; failure → retry with backoff → dead-letter after max retries
- [ ] E2E: admin job monitor page → see scheduled jobs, status, last run, next run

---

#### 4.18 Client Engine & Search Tests (CHECKLIST Appendix C)

> **Existing:** ~40% unit coverage for client engine (RecordStorage, sync).
> Search: SQL provider tested, query builder test missing.
> **Gap:** RecordStorage edge cases, search query builder tests.

**Client Engine:**

**Search:**

---

#### 4.19 Activity Tracking, Feature Flags & Usage Metering Tests (Sprint 3.6 + 3.7 Backfill)

> **Existing:** Activity tracking table + service (Sprint 3.6), Feature flags table + metering table (Sprint 3.7).
> **Gap:** Zero tests for activity CRUD, flag evaluation, metering aggregation.
>
> **Note:** This section bundles three related domains. Split into separate subsections during
> execution if scope is too large for a single pass.

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

---

#### 4.20 Webhook Delivery System Tests (Sprint 3.25 Backfill)

> **Existing:** Webhook table + delivery log table, queue-based delivery (Sprint 3.25).
> Signing + idempotent receiving in Sprint 3.18.
> **Gap:** Zero tests for webhook signature, delivery, retry, registration.

**Unit Tests:**

**Integration Tests:**

- [ ] Event triggered → webhook queued → delivered to endpoint → delivery logged
- [ ] Endpoint returns 500 → retry scheduled with exponential backoff
- [ ] Endpoint returns 200 → delivery marked successful, no retry
- [ ] Max retries exceeded → webhook marked failed, admin notified
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
- [ ] Menu construction — correct items registered per platform (macOS vs Windows vs Linux)
- [ ] System tray — icon rendering, context menu items, click handlers
- [ ] Offline detection — network status change → queue operations, sync on reconnect

**Integration Tests (Electron test runner):**

- [ ] App launches → renders main window with correct preload script
- [ ] Login flow → tokens stored securely → subsequent launch auto-authenticates
- [ ] IPC: renderer requests data → main process fetches → result returned to renderer
- [ ] Offline → online transition → queued operations replayed successfully
- [ ] Menu items → correct IPC messages sent → expected actions performed

---

#### 4.22 Golden Path Onboarding E2E (Appendix E.8)

> **Existing:** Individual E2E tests per domain (auth, tenant, billing). No combined journey test.
> **Gap:** No single test validating the full new-user onboarding flow end-to-end.

- [ ] E2E: Register → verify email → create workspace → invite teammate → teammate accepts invite
- [ ] E2E: Select plan → complete checkout → see dashboard with team member and active subscription
- [ ] E2E: First success moment — user sees populated workspace with welcome content
- [ ] E2E: Negative path — expired invite link → clear error; invalid payment → graceful fallback

---

#### Sprint 4 Cross-Reference Summary

> Maps Sprint 4 items to CHECKLIST.md and BUSINESS.md sections for completeness verification.

| CHECKLIST Section            | BUSINESS.md   | Sprint 4 Items                                         | Coverage                                  |
| ---------------------------- | ------------- | ------------------------------------------------------ | ----------------------------------------- |
| 10. Operational Quality      | E.4           | 4.15 Operational Quality Tests                         | Health, error reporting, metrics, OpenAPI |
| 11.1 Anti-Abuse              | —             | 4.16 Operational Blind Spot Verification               | CAPTCHA integration tests                 |
| 11.2 Security Notifications  | —             | 4.16 Operational Blind Spot Verification               | "Was this you?" + email reversion tests   |
| 11.3 ToS Gating              | —             | 4.16 Operational Blind Spot Verification               | Middleware + acceptance flow tests        |
| 11.4 Login Failure Logging   | —             | 4.16 Operational Blind Spot Verification               | Granular failure reason tests             |
| 14.1 Authentication          | 8.1           | 4.2 Authentication Tests                               | Full (unit + integration + E2E)           |
| 14.2 Sessions                | 8.1           | 4.3 Sessions Tests                                     | Full (unit + integration + E2E)           |
| 14.3 Account Management      | 8.1           | 4.4 Account Management Tests                           | Full (unit + integration + E2E)           |
| 14.4 Multi-Tenant            | 8.2           | 4.5 Multi-Tenant Tests                                 | Full (unit + integration + E2E)           |
| 14.5 RBAC                    | 8.2           | 4.6 RBAC Tests                                         | Full (unit + integration + E2E)           |
| 14.6 Billing                 | 8.3           | 4.7 Billing Tests                                      | Full (unit + integration + E2E)           |
| 14.7 Notifications           | 8.4           | 4.8 Notifications Tests                                | Full (unit + integration + E2E)           |
| 14.8 Audit & Security Events | 8.5           | 4.9 Audit Tests                                        | Full (unit + integration + E2E)           |
| 14.9 Compliance              | 8.6           | 4.10 Compliance Tests                                  | Full (unit + integration + E2E)           |
| 14.10 Realtime               | —             | 4.11 Realtime Tests                                    | Full (unit + integration + E2E)           |
| 14.11 Media                  | —             | 4.12 Media Tests                                       | Full (unit + integration + E2E)           |
| 14.12 API Keys               | —             | 4.13 API Keys Tests                                    | Full (unit + integration + E2E)           |
| 14.13 Admin Console          | 8.7           | 4.14 Admin Tests                                       | Full (unit + integration + E2E)           |
| Appendix C (Engine)          | —             | 4.17 Scheduled Jobs, 4.18 Client Engine + Search       | Scheduled jobs + missing query builder    |
| 6.6 Activity Tracking        | 8.5 (partial) | 4.19 Activity Tracking, Feature Flags & Usage Metering | Sprint 3.6 backfill                       |
| 6.7 Feature Flags & Metering | 8.5 (partial) | 4.19 Activity Tracking, Feature Flags & Usage Metering | Sprint 3.7 backfill                       |
| CHECKLIST 5 (Webhooks)       | 8.5           | 4.20 Webhook Delivery System Tests                     | Sprint 3.25 backfill                      |
| CHECKLIST 12 (Desktop)       | —             | 4.21 Desktop App Tests                                 | Sprint 3.19 backfill                      |
| Appendix D (Essential)       | —             | 4.15 (deployment sanity), 4.20 (idempotent webhooks)   | Verify-vs-add items                       |
| Appendix E.5 (Rate Limits)   | —             | 4.16 Rate Limiting & IP Policy                         | Per-route presets + IP allowlist          |
| Appendix E.8 (Onboarding)    | —             | 4.22 Golden Path Onboarding E2E                        | Full user journey                         |

### Sprint 5: Production Launch Readiness & Polish

> **Goal:** Harden the product for production, close all remaining polish gaps, finalize
> documentation, and verify the full user journey end-to-end.
> Covers: CHECKLIST Definition of Done / Ship Criteria, Appendix D (remaining verify items),
> Appendix E.1 (subscription completeness), E.4 (observability prod-ready), E.6 (dev experience
> final), E.8 (onboarding UX); BUSINESS.md Sections 1-7 (final verification); EXECUTION.md
> (module layout + cross-feature integration validation).
>
> **Prerequisite:** Sprints 1-3 (features) and Sprint 4 (test backfill) must be complete.
> Sprint 5 is a hardening and verification sprint — no new features, only polish, integration,
> performance, documentation, and launch preparation.

---

#### 5.1 End-to-End Journey Verification (CHECKLIST Definition of Done)

> **Source:** CHECKLIST "Definition of Done" section — the enterprise-ready bar.
> **Purpose:** Verify that the full vertical slices work together, not just in isolation.

**Golden Path Flows (manual + automated):**

- [ ] Flow: Create user → create tenant → invite teammate → teammate accepts → enforce RBAC within workspace
- [ ] Flow: Run checkout → process webhooks idempotently → activate tenant plan → verify entitlements

**Ship Criteria Final Check (CHECKLIST):**

---

#### 5.2 Production Environment Setup (CHECKLIST 13 | EXECUTION)

> **Source:** CHECKLIST 13 (infrastructure gaps), EXECUTION (deployment sanity),
> Appendix D (deployment verification).

**Environment Provisioning:**

- [ ] Infra: production Terraform applied and verified (DigitalOcean or GCP)
- [ ] Infra: production database provisioned with connection pooling (PgBouncer or managed pool)
- [ ] Infra: production Redis/cache layer provisioned (if applicable)
- [ ] Infra: production storage bucket configured (S3-compatible with CDN)
- [ ] Infra: production SMTP provider configured and verified (SES, SendGrid, or Mailgun)
- [ ] Infra: SSL/TLS certificates provisioned (auto-renewal via Caddy or Certbot)
- [ ] Infra: reverse proxy (Caddy/Nginx) configured with security headers

**Secrets & Configuration:**

- [ ] Config: all production secrets provisioned (JWT secret, cookie secret, OAuth client IDs/secrets, Stripe keys, SMTP credentials, Turnstile secret)
- [ ] Config: env validation passes on production config (`config.env === 'production'`)
- [ ] Config: secret rotation documented — JWT rotation procedure, API key rotation, OAuth client secret rotation
- [ ] Config: verify `config.server.trustProxy` is correctly set for production reverse proxy chain

**Database Production Readiness:**

- [ ] DB: all migrations (0000–0023+) apply cleanly to fresh production DB
- [ ] DB: seed script runs without errors (`seed.ts` — production seeds only, no test data)
- [ ] DB: `bootstrap-admin.ts` creates initial admin user idempotently
- [ ] DB: backup schedule configured (automated daily backups with retention)
- [ ] DB: restore procedure tested — backup → restore → verify data integrity
- [ ] DB: connection pool size tuned for expected load

**Deployment Pipeline:**

- [ ] CI: `deploy.yml` workflow deploys to production on merge to `main` (or manual trigger)
- [ ] CI: zero-downtime deployment verified (rolling restart, no dropped connections)
- [ ] CI: rollback procedure tested — `rollback.yml` reverts to previous known-good deployment

---

#### 5.3 Performance Optimization & Benchmarking (Appendix E.4)

> **Source:** Appendix E.4 (observability/operations), implied by production readiness.

**Database Performance:**

- [ ] Benchmark: auth flow latency — login < 200ms p95, refresh < 50ms p95

**API Performance:**

- [ ] Benchmark: API latency — 95th percentile under 500ms for all endpoints under expected load

**Frontend Performance:**

**Load Testing:**

- [ ] Test: simulate 100 concurrent users — auth, dashboard, API calls
- [ ] Test: simulate sustained 50 req/s for 10 minutes — no memory leaks, stable latency
- [ ] Test: rate limiter verification under load — burst traffic correctly throttled

---

#### 5.4 Monitoring & Alerting (CHECKLIST 10 | Appendix E.4 | BUSINESS 7.3)

> **Source:** CHECKLIST 10 (operational quality), Appendix E.4 (observability),
> BUSINESS 7.3 (system health).

**Production Monitoring:**

- [ ] Setup: Sentry integration — server + client error capture with correlation IDs
- [ ] Setup: uptime monitoring — external ping to `/health` endpoint every 60s, alert on 2 consecutive failures
- [ ] Setup: log aggregation — structured logs shipped to centralized service (Datadog, Loki, or CloudWatch)
- [ ] Setup: log retention policy — 30 days hot, 90 days cold storage
- [ ] Setup: request tracing — correlation ID visible in log aggregation for cross-service debugging

**Alerting Rules:**

- [ ] Alert: error rate > 5% over 5 minutes → Slack/email notification
- [ ] Alert: p95 latency > 2s for 5 minutes → Slack/email notification
- [ ] Alert: health endpoint returns non-200 → immediate alert
- [ ] Alert: job queue failed count > 10 in 1 hour → alert
- [ ] Alert: disk usage > 80% → warning; > 90% → critical
- [ ] Alert: database connection pool exhaustion → critical alert
- [ ] Alert: certificate expiry within 14 days → warning

**Dashboards:**

- [ ] Dashboard: request volume + latency (by route, by status code)
- [ ] Dashboard: error rate + top errors (grouped by type)
- [ ] Dashboard: auth metrics (login attempts, success rate, lockouts)
- [ ] Dashboard: job queue health (pending, processing, failed, dead-letter)
- [ ] Dashboard: active WebSocket connections

---

#### 5.5 Security Hardening & Audit (CHECKLIST 11 | Appendix E.5 + E.7)

> **Source:** CHECKLIST 11 (operational blind spots final verification), Appendix E.5 (rate limits),
> Appendix E.7 (security essentials).

**Production Security Verification:**

**Dependency Security:**

**Penetration Testing Checklist:**

---

#### 5.6 Documentation Completeness (Appendix E.6 | EXECUTION)

> **Source:** Appendix E.6 (developer experience), EXECUTION.md (module patterns),
> implied by launch readiness.

**API Documentation:**

**Deployment Documentation:**

**Developer Documentation:**

**Operational Runbooks:**

---

#### 5.7 UX Polish & Empty States (Appendix E.8 | BUSINESS 8 UI)

> **Source:** Appendix E.8 (SaaS product UI surface area), BUSINESS sections 1-7 (UI gaps).

**Empty States:**

**Loading States:**

**Error States:**

**Onboarding Flow (BUSINESS E.8):**

---

#### 5.8 Cross-Module Integration Validation (EXECUTION.md)

> **Source:** EXECUTION.md (module boundary rules), CHECKLIST Appendix D (verify-vs-add).

**Module Boundary Verification:**

**Cross-Feature Integration Points:**

**Appendix D Essential Features Verification (CHECKLIST):**

- [ ] Verify: deployment sanity — migrations + seed + bootstrap on fresh DB works first try

**DRY Shared Package Consolidation (per-package):**

---

#### 5.9 Pre-Launch Checklist (Final Go/No-Go)

> **Source:** All three documents converge here. This is the final gate before production launch.

**Technical Readiness:**

- [ ] All Sprint 1-4 items marked [x] complete
- [ ] `pnpm build` passes (lint + type-check + test) on release commit
- [ ] Production Docker image builds successfully
- [ ] Production deployment completes without errors
- [ ] Health endpoint returns 200 from production URL
- [ ] Swagger UI accessible at production `/api/docs`
- [ ] WebSocket connections work in production (SSL termination correct)

**Security Sign-Off:**

- [ ] Penetration test checklist (5.5) completed with zero critical findings
- [ ] `pnpm audit` clean (zero critical/high)
- [ ] OWASP Top 10 verified (SQL injection, XSS, CSRF, auth bypass, IDOR)
- [ ] Rate limiting verified under simulated attack
- [ ] No secrets in codebase (`git log` scan for env vars, API keys, passwords)

**Operational Readiness:**

- [ ] Monitoring active — Sentry, uptime, logs
- [ ] Alerting configured — error rate, latency, health, disk
- [ ] Backup tested — restore from backup verified within last 7 days
- [ ] Rollback tested — revert to previous deployment verified
- [ ] On-call rotation defined — who gets paged, escalation path

**Business Readiness:**

- [ ] Billing provider (Stripe) connected with production keys
- [ ] Email provider (SMTP/SES) sending real emails in production
- [ ] OAuth providers (Google, GitHub, Apple) configured with production redirect URIs
- [ ] Turnstile/CAPTCHA configured with production site key
- [ ] Terms of Service published in `legal_documents` table
- [ ] Privacy Policy published
- [ ] Support contact / feedback channel documented for users

---

#### Sprint 5 Cross-Reference Summary

> Maps Sprint 5 items to CHECKLIST.md, BUSINESS.md, and EXECUTION.md sections.

| Source Document | Source Section                     | Sprint 5 Items                   | Coverage                                     |
| --------------- | ---------------------------------- | -------------------------------- | -------------------------------------------- |
| CHECKLIST       | Definition of Done                 | 5.1 E2E Journey Verification     | All 6 enterprise-ready flows                 |
| CHECKLIST       | Ship Criteria                      | 5.1 Ship Criteria Final Check    | All 6 ship-blocker items verified            |
| CHECKLIST       | 10. Operational Quality            | 5.4 Monitoring & Alerting        | Sentry, metrics, dashboards (prod-ready)     |
| CHECKLIST       | 11. Operational Blind Spots        | 5.5 Security Hardening           | Final production verification                |
| CHECKLIST       | 13. Infrastructure                 | 5.2 Production Environment       | Deployment, SSL, secrets, DB                 |
| CHECKLIST       | Appendix D                         | 5.8 Cross-Module Integration     | All verify-vs-add items                      |
| CHECKLIST       | Appendix E.1 (Subscriptions)       | 5.8 Cross-Module Integration     | Subscription lifecycle verification          |
| CHECKLIST       | Appendix E.4 (Observability)       | 5.3 Performance + 5.4 Monitoring | Production-grade observability               |
| CHECKLIST       | Appendix E.5 (Rate Limits)         | 5.5 Security Hardening           | Production rate limit verification           |
| CHECKLIST       | Appendix E.6 (Dev Experience)      | 5.6 Documentation                | Onboarding, scaffold guide, testing guide    |
| CHECKLIST       | Appendix E.7 (Security Essentials) | 5.5 Security Hardening           | Penetration testing, dependency audit        |
| CHECKLIST       | Appendix E.8 (SaaS UI)             | 5.7 UX Polish + Onboarding       | Empty states, loading, error, onboarding     |
| BUSINESS        | 1. IAM                             | 5.1 + 5.5                        | Final auth verification + security hardening |
| BUSINESS        | 2. Team & Workspace                | 5.1 + 5.8                        | E2E tenant flows + integration validation    |
| BUSINESS        | 3. Billing                         | 5.1 + 5.8                        | Checkout flow + subscription verification    |
| BUSINESS        | 4. Communication                   | 5.7                              | Notification empty/loading states            |
| BUSINESS        | 5. System Operations               | 5.4 Monitoring                   | Production alerting + dashboards             |
| BUSINESS        | 6. Compliance                      | 5.2 + 5.9                        | Production ToS + privacy policy published    |
| BUSINESS        | 7. Admin Console                   | 5.4 Monitoring                   | System health dashboard production-ready     |
| BUSINESS        | 8. Test Pipelines                  | 5.1 (verification)               | Sprint 4 deliverables verified in production |
| EXECUTION       | Module Boundaries                  | 5.8 Cross-Module Integration     | No cross-app imports, barrel exports clean   |
| EXECUTION       | Horizontal vs Vertical             | 5.8 Cross-Module Integration     | Dependency flow validated                    |

---

### Sprint 6: Post-Launch Platform Maturity & Growth

> **Goal:** Evolve the platform beyond MVP — add modern auth methods, real-time collaboration
> primitives, scaling infrastructure, and developer platform features.
> Covers: ROADMAP.md Milestones 1-2, Infrastructure Improvements (Error Handling + API Versioning).
>
> **Prerequisite:** Sprints 1-5 (features + tests + launch readiness) must be complete.
> Sprint 6 is a growth sprint — new capabilities that differentiate the product post-launch
> and prepare the platform for scale.
>
> **ROADMAP completeness:** Every incomplete (`[ ]`) item in ROADMAP.md is tracked in this sprint.
> Milestone 3 (Security Phase 1) is `[x]` complete — no Sprint 6 work needed.

---

#### 6.1 Passkeys / WebAuthn (ROADMAP Milestone 2)

> **Source:** ROADMAP.md Milestone 2: WebAuthn / Passkeys.
> **Purpose:** Add passwordless authentication via FIDO2/WebAuthn, the most secure and
> user-friendly auth method available. Standalone — no Passport.js dependency.

**Backend — WebAuthn Registration + Authentication:**

- [ ] Schema: `webauthn_credentials` table — `id`, `user_id`, `credential_id`, `public_key`, `counter`, `transports`, `device_type`, `backed_up`, `name`, `created_at`, `last_used_at`
- [ ] Migration: `0024_webauthn_credentials.sql`
- [ ] Repository: `webauthn_credentials` CRUD — create, findByUserId, findByCredentialId, updateCounter, delete
- [ ] Service: `core/auth/webauthn/service.ts` — registration challenge, registration verification, authentication challenge, authentication verification
- [ ] Service: use `@simplewebauthn/server` (or manual CBOR/COSE if preferred) for attestation/assertion
- [ ] Config: `auth.webauthn` section — `rpName`, `rpId`, `origin`, `attestation` preference

**Routes:**

- [ ] Route: `POST /api/auth/webauthn/register/options` — generate registration challenge (protected)
- [ ] Route: `POST /api/auth/webauthn/register/verify` — verify attestation, store credential (protected)
- [ ] Route: `POST /api/auth/webauthn/login/options` — generate authentication challenge (public)
- [ ] Route: `POST /api/auth/webauthn/login/verify` — verify assertion, issue tokens (public)
- [ ] Route: `GET /api/users/me/passkeys` — list registered passkeys (protected)
- [ ] Route: `PATCH /api/users/me/passkeys/:id` — rename passkey (protected)
- [ ] Route: `DELETE /api/users/me/passkeys/:id` — delete passkey (protected, requires sudo)

**Client + UI:**

- [ ] Client API: `auth/webauthn/client.ts` + `hooks.ts` — registration, login, management hooks
- [ ] UI: Passkey registration flow — "Add Passkey" button in Security settings → browser prompt → success
- [ ] UI: Passkey management list — name, device type, last used, rename/delete actions
- [ ] UI: Passkey login option on login page — "Sign in with Passkey" button → browser prompt → dashboard
- [ ] UI: conditional UI — show passkey option only when `PublicKeyCredential` is available in browser

**Tests:**

- [ ] Unit: challenge generation, attestation verification mock, assertion verification mock, counter validation
- [ ] Integration: register passkey → use to authenticate → verify session created; delete passkey → can't login with it
- [ ] E2E: settings → register passkey → see in list → login with passkey → dashboard (WebAuthn mock in Playwright)

---

#### 6.2 Real-Time Collaboration Hooks (ROADMAP Milestone 1, Phases 1+2+3+6)

> **Source:** ROADMAP.md Milestone 1: CHET-Stack Real-Time Features.
> **Purpose:** Expose real-time data subscriptions and optimistic writes to the UI layer
> via clean React hooks, enabling collaborative features.
>
> **Already complete (ROADMAP `[x]` items):**
>
> - `RecordCache` — in-memory with version conflict resolution (69 tests)
> - `WebSocketServer` — `apps/server/src/infra/websocket/`
> - `WebSocketPubSubClient` — `@abe-stack/client-engine/pubsub` (20 tests)
> - `SubscriptionCache` — subscribe/unsubscribe by key (20 tests)
> - `RecordStorage` — IndexedDB wrapper (31 tests)
> - `TransactionQueue` — offline writes (26 tests)
> - `LoaderCache` — stale-while-revalidate with TTL (57 tests)
> - Conflict resolution — last-write-wins built into RecordCache/RecordStorage

**Backend Foundation (ROADMAP Phase 1):**

> **Partial progress:** WriteService (`apps/server/src/infra/write/`) already provides
> transaction handling, version bumping, and auto-pubsub. Build on this foundation.

**Real-Time Sync (ROADMAP Phase 2):**

> WebSocketServer, WebSocketPubSubClient, and SubscriptionCache already exist.
> This phase wires them into the React app via context providers.

**React Hooks (ROADMAP Phase 6 — client/engine):**

**Optimistic Updates:**

**Service Worker Asset Caching (ROADMAP Phase 3):**

> RecordStorage, TransactionQueue, and LoaderCache already exist.
> This covers the remaining service worker gap.

**Tests:**

- [ ] E2E: two browser tabs → edit in tab A → see update in tab B; offline → online → sync

---

#### 6.3 Platform Developer Experience (ROADMAP Infrastructure Improvements)

> **Source:** ROADMAP.md Infrastructure Improvements → Error Handling + API Versioning & Typed Client.
> **Purpose:** Make the platform easier to extend, debug, and operate for teams and external developers.
>
> **Already complete (ROADMAP `[x]` items):**
>
> - Error serialization with `.toJSON()` — `AppError` in `@abe-stack/shared/errors`
> - Correlation IDs for tracing — `apps/server/src/infra/logger/`
> - Route registry pattern — `registerRouteMap` for DRY route registration
> - Modular server composition — `QueueServer` pattern

**Error Handling & Logging (ROADMAP Infrastructure > Error Handling):**

> Correlation IDs and error serialization already exist. These items close the remaining gaps.

**Generated API Client (ROADMAP Infrastructure > API Versioning & Typed Client):**

- [ ] Tool: publish as `@abe-stack/api-client` package (or npm-ready output) _(deferred to ROADMAP)_
- [ ] Tool: generate React Query hooks from client definitions _(deferred to ROADMAP)_
- [ ] CI: regenerate client on route/schema changes (pre-commit or CI step) _(deferred to ROADMAP)_

**Module Scaffold CLI:**

**API Versioning (ROADMAP Infrastructure > API Versioning & Typed Client):**

**DB Reset Command:**

**Tests:**

- [ ] Integration: generated client successfully calls all routes _(deferred to ROADMAP)_

---

#### 6.4 Scaling & Performance Infrastructure

> **Source:** Growth feature — prepare the platform for increased load.
> **Purpose:** Prepare the platform for increased load and multi-region deployments.

**Caching Layer:**

- [ ] Service: session store in Redis (optional, for horizontal scaling) — deferred (JWT-based, no server sessions)

**Database Read Replicas:**

**Horizontal Scaling:**

- [ ] Infra: shared job queue — Redis-backed queue for multi-instance job processing — deferred (MemoryQueueStore sufficient)

**CDN & Asset Optimization:**

- [ ] Infra: CDN configuration for static assets (Cloudflare, CloudFront, or BunnyCDN) — deferred (deployment-specific)
- [ ] Service: asset fingerprinting — Vite already does content hashing
- [ ] Service: image CDN — on-the-fly resize/optimize via CDN transform (or Imgproxy) — deferred
- [ ] Service: edge caching rules — static assets (1 year), API (no-cache), HTML (short TTL) — deferred

**Tests:**

- [ ] Integration: cache hit/miss/invalidation lifecycle
- [ ] Integration: read replica routing — write → primary, read → replica
- [ ] Load test: multi-instance deployment handles 500+ concurrent users

---

#### 6.5 Undo/Redo UI Integration (ROADMAP Milestone 1, Phase 4)

> **Source:** ROADMAP.md Milestone 1: CHET-Stack → Undo/Redo.
> **Existing:** `UndoRedoStack.ts` (38 tests), `undoRedoStore`, `useUndoRedoShortcuts` hook.
> **Gap:** Not wired to actual data operations or visible in the UI.

**Tests:**

- [ ] Integration: create record → undo → record removed → redo → record restored
- [ ] E2E: perform action → Ctrl+Z → action reversed → Ctrl+Shift+Z → action restored

---

#### 6.6 Storybook Production Build (CHECKLIST 12)

> **Source:** CHECKLIST 12 — Storybook scaffold exists but is empty.
> **Carried from Sprint 3.21.** This extends it into a production-quality component gallery.

**Configuration:**

- [ ] Config: Storybook 8+ setup — `main.ts`, `preview.ts`, Vite builder
- [ ] Config: viewport presets — mobile, tablet, desktop
- [ ] Config: accessibility addon — a11y checks in every story

**Stories:**

- [ ] Stories: layouts — AuthLayout, Container, Modal, AppShell, ResizablePanel, SidePeek
- [ ] Stories: patterns — forms, navigation, data tables, loading states, error states, empty states
- [ ] Stories: billing — PlanCard, PricingTable, InvoiceRow, SubscriptionStatus

**CI:**

- [ ] CI: Storybook build step — validate all stories compile without errors
- [ ] CI: Chromatic or Percy — visual regression testing (optional)
- [ ] Deploy: Storybook hosted at `/storybook` or separate subdomain

---

#### 6.7 Internationalization (i18n) Foundation

> **Source:** Growth feature — natural post-launch expansion.
> **Purpose:** Prepare the app for non-English users without a full translation sprint.

**Foundation:**

- [ ] Service: i18n framework setup — `react-intl`, `react-i18next`, or lightweight custom solution
- [ ] Service: message extraction — extract all user-facing strings to locale files
- [ ] Config: default locale (`en-US`), fallback behavior
- [ ] Config: locale detection — browser preference → user preference → default

**Infrastructure:**

- [ ] Service: locale files structure — `locales/en-US.json`, `locales/es.json`, etc.
- [ ] Service: lazy-load locale files — only load active locale, not all
- [ ] Service: date/time/number formatting — use `Intl` APIs with user's locale
- [ ] Service: pluralization rules — handle singular/plural/zero forms

**Integration Points:**

- [ ] UI: language selector in user preferences (settings)
- [ ] API: `Accept-Language` header support — localized error messages from server
- [ ] DB: user preference `locale` column (add to preferences if not exists)

**Tests:**

- [ ] Unit: string interpolation, pluralization, date formatting per locale
- [ ] Integration: set locale preference → API returns localized messages
- [ ] E2E: switch language → UI text updates → refresh → preference persisted

---

#### 6.8 Real-Time Data Permissions (ROADMAP Milestone 1, Phase 5)

> **Source:** ROADMAP.md Milestone 1: CHET-Stack → Permissions.
> **Purpose:** Row-level access control for real-time data sync — users only see/write
> records they have permission to access.

**Row-Level Validation:**

- [ ] Service: row-level read validation — filter records by user's permission set before returning
- [ ] Service: row-level write validation — reject writes to records user cannot modify
- [ ] Service: permission records loading — preload user's permissions on connection/auth

**Permission Patterns:**

- [ ] Service: workspace permission pattern — workspace members see workspace records
- [ ] Service: board/project permission pattern — per-board access control (viewer, editor, admin)
- [ ] Service: task/record ownership pattern — owner + shared-with permissions
- [ ] Service: permission inheritance — workspace admin overrides board-level restrictions

**Integration with Real-Time Hooks:**

- [ ] Service: permission-aware subscriptions — WebSocket only publishes to authorized subscribers
- [ ] Service: permission change propagation — revoke access → remove from subscription + client cache
- [ ] Client: `useRecord`/`useRecords` honor permissions — 403 graceful handling in hooks

**Tests:**

- [ ] Unit: permission evaluation for read/write across ownership/role/share patterns
- [ ] Integration: user A writes record → user B (no permission) does not receive update
- [ ] Integration: permission revoked → user stops receiving updates immediately
- [ ] E2E: share record with teammate → teammate sees it; revoke → teammate loses access

---

#### Sprint 6 Cross-Reference Summary

> Maps Sprint 6 items to ROADMAP.md milestones and other source documents.

| Source Document  | Source Section                    | Sprint 6 Items                    | Coverage                                                                                     |
| ---------------- | --------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------- |
| ROADMAP          | Milestone 1, Phase 1: Foundation  | 6.2 Real-Time Collaboration Hooks | Version fields, transaction types, write/getRecords, WriteService extension                  |
| ROADMAP          | Milestone 1, Phase 2: Sync        | 6.2 Real-Time Collaboration Hooks | RealtimeContext, RealtimeProvider, version-based notifications                               |
| ROADMAP          | Milestone 1, Phase 3: Offline     | 6.2 Real-Time Collaboration Hooks | Service worker asset caching (RecordStorage/TransactionQueue/LoaderCache already done)       |
| ROADMAP          | Milestone 1, Phase 4: Undo/Redo   | 6.5 Undo/Redo UI Integration      | UI wiring + keyboard shortcuts (UndoRedoStack already done)                                  |
| ROADMAP          | Milestone 1, Phase 5: Permissions | 6.8 Real-Time Data Permissions    | Row-level read/write, permission patterns                                                    |
| ROADMAP          | Milestone 1, Phase 6: React Hooks | 6.2 Real-Time Collaboration Hooks | useRecord, useRecords, useWrite, useUndoRedo                                                 |
| ROADMAP          | Milestone 2: WebAuthn/Passkeys    | 6.1 Passkeys / WebAuthn           | Full (registration, login, management)                                                       |
| ROADMAP          | Milestone 3: Security Phase 1     | n/a                               | All `[x]` complete — no Sprint 6 work needed                                                 |
| ROADMAP          | Infrastructure: Error Handling    | 6.3 Platform DX                   | Request context logging, conditional severity (serialization + correlation IDs already done) |
| ROADMAP          | Infrastructure: API Versioning    | 6.3 Platform DX                   | Generated client, scaffold CLI, API versioning (route registry + QueueServer already done)   |
| Growth (organic) | Scaling                           | 6.4 Scaling Infrastructure        | Redis cache, read replicas, CDN, horizontal                                                  |
| CHECKLIST        | 12. Storybook                     | 6.6 Storybook Production Build    | Full (config, stories, CI, deploy)                                                           |
| Growth (organic) | i18n                              | 6.7 Internationalization          | Foundation + infrastructure + integration                                                    |

**Removed from Sprint 6 (ROADMAP items deleted during trim):**

| Deleted Item                                                            | Reason                                                                               |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| V5 Architecture Migration (was 6.3)                                     | Cosmetic directory restructuring with zero functional benefit — deleted from ROADMAP |
| Advanced Security: BFF proxy, step-up auth, "remember device" (was 6.4) | Passport.js Phase 5 features — deleted from ROADMAP as over-engineering              |
| Mobile App Foundation (was 6.8)                                         | Product-Specific features — deleted from ROADMAP as app-specific, not platform       |

---

## Notes / Guardrails

- Prefer **one slice fully done** over "80% of five slices".
- Don't add new packages to implement a slice unless it removes duplication across apps.
- If you touch auth/session/billing flows, add at least one test that asserts the failure mode you're most worried about.
- For file placement rules during execution, follow `docs/todo/EXECUTION.md` (Hybrid Hexagonal standard).
- For DRY cross-package audit plan (server/_ ↔ server/_), see `docs/todo/TODO-dag.md`.

### Library-Style Facade Refactor (Incremental, No Big-Bang)

- [ ] Pattern: expose domain-level facades (for example `auth.signUp`) and keep route handlers thin.
- [ ] Rule: migrate one flow at a time (`signUp` -> `signIn` -> `refresh` -> etc), preserving behavior first.
- [ ] Rule: orchestration lives in service layer; crypto/token/db internals stay behind the facade boundary.
- [ ] Guardrail: block deep imports to internals from app layers; consume package/domain entrypoints only.
- [ ] Test policy: for each migrated flow, keep/add one success-path integration test and one critical failure-mode test.
- [ ] Cleanup policy: after each migrated flow is stable, delete dead wrappers/duplicate tests in the same PR.
