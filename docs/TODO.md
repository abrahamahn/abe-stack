# ABE Stack - TODO

> **Scope:** Solo developer to small team (3-5 engineers), 50,000+ users, up to Series A. :contentReference[oaicite:1]{index=1}  
> **Philosophy:** Ship products. The foundation is solid. Build features users pay for. :contentReference[oaicite:2]{index=2}
>
> **New guiding constraint:** Everything should support **(a)** developer velocity, **(b)** production readiness, **(c)** leanness/maintainability.
>
> **Distribution model:**
>
> - **Minimal Profile (default):** deployable core + auth + DB + basic UI + docs
> - **SaaS Profile (optional):** billing/subscriptions + quotas + customer portal
> - **Admin Profile (optional):** command center, security viewer, job monitor
> - **Advanced Profile (optional):** realtime/offline sync, push, search, desktop, heavy media
>
> Add “operational readiness” next (not more features). :contentReference[oaicite:3]{index=3}

Minimal production ops pack: structured logs already started, but also:

- migrations story, backup/restore story, rate-limit observability, basic metrics, error budget style alerts. :contentReference[oaicite:4]{index=4}

---

## Immediate: Code Review

- [ ] Smoke test: Web + Server + Desktop "happy path" on a clean machine (no local dev shortcuts)

---

## High Priority: One-Click Deploy (DigitalOcean / GCP Ubuntu)

**Goal:** clone → env → **one command** → production-ish deployment.

### 1) “Deploy Pack” (Docker-first)

- [ ] Production Dockerfiles for: `apps/server`, `apps/web`, `apps/desktop` (desktop optional)
- [ ] `docker-compose.prod.yml` (server + web + postgres + redis optional)
- [ ] `docker-compose.dev.yml` (fast local onboarding)
- [ ] Health checks wired (compose + server health endpoints)
- [ ] Container logging format standardized (JSON logs, request correlation id in logs)
- [ ] Document: required ports + networking + reverse proxy assumptions

### 2) Reverse Proxy + TLS

- [ ] Provide **Caddy** (or Nginx) config for:
  - TLS via Let’s Encrypt
  - `/api/*` → server
  - `/*` → web
  - WebSocket upgrade pass-through
- [ ] Security headers + compression verified behind proxy
- [ ] “Trusted proxy” config documented (X-Forwarded-For, etc.)

### 3) Database + Migrations Story (must be boring + reliable)

- [ ] Single command migration workflow (`pnpm db:migrate` or equivalent)
- [ ] Migration strategy doc:
  - how to run on deploy
  - rollback policy
  - idempotency and safety
- [ ] Add “first deploy bootstrap” flow (seed/admin creation is explicit + safe)

### 4) “Deploy Targets”

**DigitalOcean (baseline)**

- [ ] `docs/deploy/digitalocean.md`:
  - Ubuntu droplet setup
  - Docker install
  - Caddy/Nginx
  - environment secrets
  - systemd unit or docker compose “restart always”
  - backups/restore drill

**GCP**

- [ ] `docs/deploy/gcp.md` with one concrete option:
  - Compute Engine VM (Ubuntu) or Cloud Run (if you go serverless)

### 5) CI/CD (keep it simple)

- [ ] GitHub Actions “deploy” workflow (manual trigger is fine):
  - build + test + docker build
  - push images to registry
  - SSH into server and pull + restart
- [ ] Secrets checklist (env var template + required vars)
- [ ] Add “Release checklist” gating deploy (see Docs section)

---

## High Priority: Deployment & DevOps Orchestration (IaC + Pipeline)

**Goal:** standardized infra + repeatable deployments across providers.

### IaC

- [ ] Choose one: **Terraform or Pulumi** (default to Terraform for ecosystem + adoption)
- [ ] Provide minimal IaC modules:
  - [ ] `infra/digitalocean/` (droplet + firewall + domain + optional managed db)
  - [ ] `infra/gcp/` (compute instance + firewall + service account)
  - [ ] Optional adapters: AWS/Vercel/Railway (only if it stays small)
- [ ] “Bring-your-own” variables + outputs (domain, SSH keys, region, instance size)

### CI/CD Pipeline (complete)

- [ ] Full GitHub Actions workflow that respects your established build rules:
  - [ ] `pnpm config:generate:check`
  - [ ] Turbo-cached testing
  - [ ] build artifacts + docker images
  - [ ] deployment step (DO/GCP)
- [ ] Environments: `staging` + `production`
- [ ] Rollback strategy (previous image tags, health-check based)
- [ ] Add “CI sanity mode” to keep PR checks fast (see Testing strip plan)

---

## High Priority: Lean-Down / Strip Unnecessary Code (Without Losing Power)

**Goal:** keep your “everything stack”, but ship as a **minimal default**.

### 1) Define the “Minimal Profile” explicitly

- [ ] Write `docs/profiles.md` defining:
  - **Minimal** includes: web + server + postgres, auth, core UI kit, basic logging, basic tests
  - **SaaS** includes: billing + subscriptions + portal + quotas
  - **Admin** includes: command center dashboards
  - **Advanced** includes: realtime/offline, push, search, cache/redis, desktop, heavy media
- [ ] Add `FEATURE_FLAGS.md` or `config/features.ts`:
  - `ENABLE_ADMIN`
  - `ENABLE_BILLING`
  - `ENABLE_REALTIME`
  - `ENABLE_OFFLINE_QUEUE`
  - `ENABLE_PUSH`
  - `ENABLE_SEARCH`
  - `ENABLE_CACHE_REDIS`
  - `ENABLE_MEDIA_PIPELINE`
  - `ENABLE_DESKTOP`
- [ ] Ensure disabling a feature removes runtime wiring (not just dead config)

### 2) “Boilerplate Tax” Strip Plan (explicit)

Create `docs/STRIP_PLAN.md` with the following defaults:

#### A) Tests (reduce brittleness)

- [ ] Introduce test tiers:
  - `pnpm test` = fast unit + critical integration
  - `pnpm test:full` = everything (heavy)
  - `pnpm test:e2e` = Playwright
- [ ] Strip default boilerplate tests down to **50–100 high-value tests**:
  - Auth E2E (signup/login/magic link/oauth/logout all)
  - Core SDK “happy path” integration
  - Minimal DB persistence + migrations
- [ ] Move the rest into `tests/templates/` (example patterns users copy)
- [ ] CI: PRs run fast tests; nightly runs full

#### B) Media processing (opt-in plugin)

- [ ] Move heavy deps into optional module/plugin:
  - `packages/media-plugin/` (sharp, ffmpeg wrappers, pipelines)
- [ ] Minimal profile uses a lightweight upload path (no heavy binaries)
- [ ] Docs: “Enable Media Plugin” guide + dependency notes

#### C) 5-phase SDK flow (advanced mode)

- [ ] Minimal profile: `createRecordCache` behaves like a standard React Query wrapper
- [ ] Advanced profile: keep Optimistic → Persist → Sync → Confirm → Reconcile
- [ ] Provide a “Switch to Advanced Sync Mode” guide
- [ ] Default templates should not require TransactionQueue/conflict resolution knowledge

#### D) Security hardening defaults (don’t scare new users)

- [ ] Minimal profile defaults:
  - Argon2id (standard parameters)
  - Standard CSRF tokens (non-AES complexity)
- [ ] Advanced security goes to docs:
  - `docs/security-hardening.md` (dummy hash pool, special CSRF crypto, etc.)
- [ ] Keep advanced security available as toggles, not hardwired

### 3) Modular boundaries cleanup

- [ ] Move optional features into isolated modules:
  - `apps/server/src/modules/*` (billing, admin, realtime, push, media)
- [ ] SDK exports grouped by feature (minimal consumers don’t import everything)
- [ ] Ensure stubs are not shipped in Minimal (or clearly marked experimental)

### 4) Controlled “Delete list”

- [ ] `docs/STRIP_PLAN.md` lists what can be removed safely in Minimal:
  - Desktop app
  - Push notifications
  - Realtime/offline
  - Search/filtering
  - Redis provider
  - Media plugin
  - Demo catalogs
- [ ] Provide “re-enable” instructions for each

---

## High Priority: The Administrative "Command Center" (Admin Profile)

**Goal:** standardized admin UI so every app doesn't reinvent it.

### Admin UI: User Management

- [ ] Admin dashboard shell + navigation
- [ ] User list (search/filter/pagination)
- [ ] User detail: roles, email verification status, disable/ban, reset sessions
- [ ] Manual email verify / resend verification
- [ ] Role management UI (RBAC-friendly)

### Security Audit Viewer

- [ ] UI to visualize `security_events` (token reuse alerts, lockout events, suspicious activity)
- [ ] Filters: user, event type, date range
- [ ] Drill-down view for event details
- [ ] Export (CSV/JSON) for incident review

### Job Monitor (infra/queue)

- [ ] Queue dashboard:
  - pending, running, failed, retrying, dead-letter
- [ ] Job details: payload metadata (safe redaction), retries, last error
- [ ] Manual retry / cancel job controls
- [ ] Basic alert surface (spikes in failures)

---

## High Priority: Standardized Billing (SaaS Profile)

**Goal:** boilerplate SaaS billing that just works.

### Choose Provider + Abstraction

- [ ] Stripe-first implementation
- [ ] Optional LemonSqueezy adapter (behind interface)

### Subscription Logic

- [ ] Webhook handlers:
  - subscription created/updated/canceled
  - payment success/failure
  - refunds/chargebacks handling policy
- [ ] Pricing table UI components
- [ ] Customer portal integration (manage payment method, cancel, invoices)

### Entitlements + Usage Tracking

- [ ] Define “entitlements” model:
  - plan → features → limits
- [ ] Link realtime/transaction/queue usage to quotas:
  - usage counters
  - monthly reset
  - overage policy (block vs degrade vs bill)
- [ ] Admin override for entitlements (support workflows)

---

## High Priority: User Profile & Settings UI

**Goal:** eliminate the “settings page tax” for every new app.

### Profile Management

- [ ] Settings page skeleton (tabs: Profile / Security / Sessions / Billing)
- [ ] Avatar upload integrated with Media pipeline (or lightweight upload in Minimal)
- [ ] Username/display name + email change flows
- [ ] Session management:
  - list active sessions
  - revoke session
  - logout-all (use existing logic)

### Security (optional but common)

- [ ] 2FA setup UI (TOTP) + recovery codes
- [ ] Password change UI (with strength guidance)
- [ ] Device/login history (if you have events already)

### Billing hook (if SaaS enabled)

- [ ] Show current plan + limits + usage
- [ ] Link to customer portal

---

## High Priority: Authentication

### Social/OAuth Providers

- [ ] OAuth connection management UI (frontend) :contentReference[oaicite:7]{index=7}
- [ ] Provider enable/disable switch per provider (Google/GitHub/Apple) via env flags
- [ ] Document provider setup + callback URL pitfalls

---

## Medium Priority: UI Package

### Demo Performance (Frontend)

- [ ] Individual component lazy loading (currently category-based only) :contentReference[oaicite:8]{index=8}
- [ ] Progressive loading within categories :contentReference[oaicite:9]{index=9}
- [ ] Route-based code splitting for demo pages :contentReference[oaicite:10]{index=10}

### Code Quality (Frontend)

- [ ] Standardize arrow functions with forwardRef :contentReference[oaicite:11]{index=11}
- [ ] Consistent prop naming across components :contentReference[oaicite:12]{index=12}
- [ ] JSDoc comments on public APIs :contentReference[oaicite:13]{index=13}

---

## Medium Priority: Infrastructure

### Frontend

- [ ] Error boundary + toasts for API errors :contentReference[oaicite:14]{index=14}
- [ ] Focus management improvements :contentReference[oaicite:15]{index=15}

### Backend

- [ ] Production Postgres settings (connection pooling, SSL) :contentReference[oaicite:16]{index=16}
- [ ] Secrets management documentation :contentReference[oaicite:17]{index=17}
- [ ] Database backup/retention plan :contentReference[oaicite:18]{index=18}

### Testing

- [ ] Integration tests for API routes (vitest + fastify inject) :contentReference[oaicite:19]{index=19}
- [ ] Playwright E2E for auth flows :contentReference[oaicite:20]{index=20}
- [ ] Security audit: OWASP testing guide :contentReference[oaicite:21]{index=21}

### Documentation

- [ ] Security decision documentation (why Argon2id params, grace periods, etc.) :contentReference[oaicite:22]{index=22}
- [ ] Quickstart guides per app :contentReference[oaicite:23]{index=23}
- [ ] Release checklist :contentReference[oaicite:24]{index=24}
- [ ] Consolidate and organize `docs/log/` files (merge duplicate date sections, use tables) :contentReference[oaicite:25]{index=25}

- [ ] `docs/deploy/` folder (DO + GCP guides)
- [ ] `docs/OPERATIONS.md` (migrations, backups, restore drills, incident basics)
- [ ] “Minimal Profile Quickstart” + “Full Profile Quickstart”
- [ ] “SaaS Profile Quickstart” + “Admin Profile Quickstart”

---

## Low Priority: Observability

- [ ] Prometheus metrics (login attempts, sessions, hash duration, lockouts) :contentReference[oaicite:26]{index=26}
- [ ] Query performance monitoring :contentReference[oaicite:27]{index=27}
- [ ] Batch user lookups optimization :contentReference[oaicite:28]{index=28}

- [ ] Minimal “Golden Signals” dashboard (latency, traffic, errors, saturation)
- [ ] Error budget alerting policy (simple thresholds)

---

## Unused Code to Integrate

Code that exists but isn't used anywhere. Integrate when implementing related tasks. :contentReference[oaicite:29]{index=29}

| Unused Code                            | Package         | Related Task           |
| -------------------------------------- | --------------- | ---------------------- |
| `MutationQueue`, `createMutationQueue` | sdk/persistence | Offline mutations      |
| `localStorageQueue`                    | sdk/persistence | IndexedDB fallback     |
| `useOnScreen`                          | ui/hooks        | Lazy loading           |
| `useCopyToClipboard`                   | ui/hooks        | Demo copy button       |
| `usePanelConfig`                       | ui/hooks        | ResizablePanel layouts |

---

## Success Metrics

### Seed Stage

- [ ] First paying customers :contentReference[oaicite:30]{index=30}
- [ ] <100ms P95 latency on critical paths :contentReference[oaicite:31]{index=31}
- [ ] Zero security incidents :contentReference[oaicite:32]{index=32}

### Series A

- [ ] Multi-product architecture working :contentReference[oaicite:33]{index=33}
- [ ] Team of 3-5 engineers productive :contentReference[oaicite:34]{index=34}
- [ ] 99.9% uptime :contentReference[oaicite:35]{index=35}
- [ ] Cache layer reducing DB load by 30%+ :contentReference[oaicite:36]{index=36}

---

## The Rule

**Before adding to this TODO, ask:** :contentReference[oaicite:37]{index=37}

1. Does a user need this to give me money?
2. Will this unblock a product feature?
3. Is this a security/legal requirement?

If no to all three, it goes in `docs/ROADMAP.md`. :contentReference[oaicite:38]{index=38}

---

## References

### WebSocket Enhancements (Backend + Frontend)

- [ ] Auth token refresh on reconnect (use `onConnect` callback) :contentReference[oaicite:39]{index=39}
- [ ] React Query cache invalidation on WebSocket events :contentReference[oaicite:40]{index=40}
- [ ] Presence tracking (online/offline/away, last seen) :contentReference[oaicite:41]{index=41}
- [ ] Typing indicators via WebSocket events :contentReference[oaicite:42]{index=42}

- **Deferred features:** See `docs/ROADMAP.md` :contentReference[oaicite:43]{index=43}
- **Legacy migrations:** See `docs/dev/legacy.md` :contentReference[oaicite:44]{index=44}
- **Security overview:** See `docs/dev/security.md` :contentReference[oaicite:45]{index=45}
- **SDK features:** See `packages/sdk/README.md` :contentReference[oaicite:46]{index=46}
- **Core utilities:** See `packages/core/README.md` :contentReference[oaicite:47]{index=47}

---

_Last Updated: 2026-01-22 (Revised: Ops Pack + Admin + Billing + Profiles + Strip Plan)_
