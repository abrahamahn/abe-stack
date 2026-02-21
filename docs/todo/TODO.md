# TODO (Open Work)

**Last updated: 2026-02-21**

---

## Status Snapshot

- This file tracks **open work only** (`- [ ]`).
- Completed checklist entries were migrated to `docs/log/2026-W08.md`.
- Focus order: Sprint 3 → Sprint 5 → Sprint 6 → Sprint 7.

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

- [ ] Table exists in migrations: `main/server/db/migrations/*.sql`
- [ ] Table included in runtime validation list (when required for boot): `main/server/db/src/validation.ts` (`REQUIRED_TABLES`)
- [ ] Schema table constant exported: `main/server/db/src/schema/*` and re-exported via `main/server/db/src/schema/index.ts` (`*_TABLE`)
- [ ] Repository exists for reads/writes: `main/server/db/src/repositories/**`
- [ ] Dev bootstrap is not missing it: `main/tools/scripts/db/push.ts` (if you rely on `pnpm db:push` for local dev)
- [ ] Seed coverage is intentional:
  - If needed for dev/demo: ensure `main/tools/scripts/db/seed.ts` creates minimal rows
  - If not needed: explicitly leave unseeded (do not “seed everything”)
- [ ] Run `pnpm db:audit` after changes (and `pnpm db:audit:db` if you have a DB running)

---

#### Sprint 3 Remaining Work (Incomplete TODO Backlog)

> Snapshot date: 2026-02-20. This is the canonical list of still-open Sprint 3 work.
> Open-item counts below may lag after reconciliation edits in this file.

**P0 (Launch/Critical Path):**

**P1 (Admin/Workspace/Compliance):**

**P2 (UX + Verification Backfill):**

- [ ] 3.19 Desktop manual verification

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

#### 3.19 Desktop App Gaps (CHECKLIST 12)

> **Existing:** Electron main process, preload script, IPC handlers, React entry point.
> **Gap:** No auto-updater, no native menu, no deep link handling.

**Tests:**

- [ ] Manual: auto-update flow (mock update server); deep link → correct page; tray actions work

---

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

- [x] Config: all production secrets provisioned (JWT secret, cookie secret, OAuth client IDs/secrets, Stripe keys, SMTP credentials, Turnstile secret)
- [ ] Config: env validation passes on production config (`config.env === 'production'`) — blocked: billing provider is `stripe` but `STRIPE_SECRET_KEY`/`STRIPE_PUBLISHABLE_KEY`/`STRIPE_WEBHOOK_SECRET` are unset in `config/env/.env.production` (2026-02-21)
- [x] Config: secret rotation documented — JWT rotation procedure, API key rotation, OAuth client secret rotation (`docs/runbooks/auth-issues.md`)
- [x] Config: verify `config.server.trustProxy` is correctly set for production reverse proxy chain (`main/apps/server/src/config/infra/server.ts`, `docs/deploy/trusted-proxy-setup.md`, verified with production env parse on 2026-02-21)

**Database Production Readiness:**

- [ ] DB: all migrations (0000–0023+) apply cleanly to fresh production DB
- [ ] DB: seed script runs without errors (`seed.ts` — production seeds only, no test data)
- [ ] DB: `bootstrap-admin.ts` creates initial admin user idempotently
- [ ] DB: backup schedule configured (automated daily backups with retention)
- [ ] DB: restore procedure tested — backup → restore → verify data integrity
- [ ] DB: connection pool size tuned for expected load

**Deployment Pipeline:**

- [ ] CI: zero-downtime deployment verified (rolling restart, no dropped connections)

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

- [ ] Verify: security headers present in production — CSP, HSTS, X-Frame-Options, X-Content-Type-Options (requires production deployment verification)

**Dependency Security:**

**Penetration Testing Checklist:**

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
- [ ] OWASP Top 10 verified (SQL injection, XSS, CSRF, auth bypass, IDOR)
- [ ] Rate limiting verified under simulated attack

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

#### 6.2 Real-Time Collaboration Hooks (ROADMAP Milestone 1, Phases 1+2+3+6)

> **Source:** Milestone 1: CHET-Stack Real-Time Features (see Sprint 7.1 for enterprise-scope detail).
> **Purpose:** Expose real-time data subscriptions and optimistic writes to the UI layer
> via clean React hooks, enabling collaborative features.
>
> **Already complete (ROADMAP `[x]` items):**
>
> - `RecordCache` — in-memory with version conflict resolution (69 tests)
> - `WebSocketServer` — `apps/server/src/infra/websocket/`
> - `WebSocketPubSubClient` — `@bslt/client-engine/pubsub` (20 tests)
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

> **Source:** Infrastructure Improvements → Error Handling + API Versioning & Typed Client (see Sprint 7.3).
> **Purpose:** Make the platform easier to extend, debug, and operate for teams and external developers.
>
> **Already complete (ROADMAP `[x]` items):**
>
> - Error serialization with `.toJSON()` — `AppError` in `@bslt/shared/errors`
> - Correlation IDs for tracing — `apps/server/src/infra/logger/`
> - Route registry pattern — `registerRouteMap` for DRY route registration
> - Modular server composition — `QueueServer` pattern

**Error Handling & Logging (ROADMAP Infrastructure > Error Handling):**

> Correlation IDs and error serialization already exist. These items close the remaining gaps.

**Generated API Client (ROADMAP Infrastructure > API Versioning & Typed Client):**

- [ ] Tool: publish as `@bslt/api-client` package (or npm-ready output) _(deferred to ROADMAP)_
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
- [ ] Service: image CDN — on-the-fly resize/optimize via CDN transform (or Imgproxy) — deferred
- [ ] Service: edge caching rules — static assets (1 year), API (no-cache), HTML (short TTL) — deferred

**Tests:**

- [ ] Integration: cache hit/miss/invalidation lifecycle
- [ ] Integration: read replica routing — write → primary, read → replica
- [ ] Load test: multi-instance deployment handles 500+ concurrent users

---

#### 6.5 Undo/Redo UI Integration (ROADMAP Milestone 1, Phase 4)

> **Source:** Milestone 1: CHET-Stack → Undo/Redo (see Sprint 7.1, Phase 4).
> **Existing:** `UndoRedoStack.ts` (38 tests), `undoRedoStore`, `useUndoRedoShortcuts` hook.
> **Gap:** Not wired to actual data operations or visible in the UI.

**Tests:**

- [ ] E2E: perform action → Ctrl+Z → action reversed → Ctrl+Shift+Z → action restored

---

#### 6.6 Storybook Production Build (CHECKLIST 12)

> **Source:** CHECKLIST 12 — Storybook scaffold exists but is empty.
> **Carried from Sprint 3.21.** This extends it into a production-quality component gallery.

**Configuration:**

**Stories:**

**CI:**

- [ ] CI: Chromatic or Percy — visual regression testing (optional)

---

#### 6.7 Internationalization (i18n) Foundation

> **Source:** Growth feature — natural post-launch expansion.
> **Purpose:** Prepare the app for non-English users without a full translation sprint.

**Foundation:**

**Infrastructure:**

**Integration Points:**

**Tests:**

- [ ] E2E: switch language → UI text updates → refresh → preference persisted

---

#### 6.8 Real-Time Data Permissions (ROADMAP Milestone 1, Phase 5)

> **Source:** Milestone 1: CHET-Stack → Permissions (see Sprint 7.1, Phase 5).
> **Purpose:** Row-level access control for real-time data sync — users only see/write
> records they have permission to access.

**Row-Level Validation:**

**Permission Patterns:**

**Integration with Real-Time Hooks:**

**Tests:**

- [ ] E2E: share record with teammate → teammate sees it; revoke → teammate loses access

---

#### 7.1 CHET-Stack Real-Time Collaboration (Milestone 1)

> **Infrastructure already complete (261 tests total):** `RecordCache` (69), `WebSocketServer`,
> `WebSocketPubSubClient` (20), `SubscriptionCache` (20), `RecordStorage` (31),
> `TransactionQueue` (26), `LoaderCache` (57), `UndoRedoStack` (38), conflict resolution.
> `WriteService` (`apps/server/src/infra/write/`) provides transaction handling, version
> bumping, and auto-pubsub. Sprint 6.2 covers React hook wiring; this sprint captures the
> remaining foundation, sync, offline, and permission gaps.

**Phase 1 — Foundation:**

**Phase 2 — Real-Time Sync:**

**Phase 3 — Offline Support:**

**Phase 4 — Undo/Redo UI:**

> `UndoRedoStack` (38 tests), `undoRedoStore`, and `useUndoRedoShortcuts` already exist.

**Phase 5 — Row-Level Permissions:**

**Phase 6 — React Hooks:**

**Tests:**

- [ ] E2E: two browser tabs → edit in tab A → update appears in tab B; offline → online → sync

---

#### 7.4 Scaling & Performance Infrastructure

> Activate when traffic justifies horizontal deployment.

**Session & Queue:**

**CDN & Asset Delivery:**

- [ ] Infra: CDN configuration — Cloudflare, CloudFront, or BunnyCDN for static assets
- [ ] Service: image CDN — on-the-fly resize/optimize via Imgproxy or CDN transform
- [ ] Service: edge caching rules — 1-year static, no-cache API, short-TTL HTML

**Load Testing:**

- [ ] Test: 500+ concurrent users under multi-instance deployment — no dropped connections
- [ ] Test: cache hit/miss/invalidation lifecycle
- [ ] Test: read replica routing — writes → primary, reads → replica

---
```
