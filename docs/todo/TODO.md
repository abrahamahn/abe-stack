# ABE Stack - TODO

> **Scope:** Solo developer to small team (3-5 engineers), 50,000+ users, up to Series A.
> **Philosophy:** Ship products. The foundation is solid. Build features users pay for.
>
> **New guiding constraint:** Everything should support **(a)** developer velocity, **(b)** production readiness, **(c)** leanness/maintainability.
>
> **Distribution model:**
>
> - **Minimal Profile (default):** deployable core + auth + DB + basic UI + docs
> - **SaaS Profile (complete):** billing/subscriptions + quotas + customer portal ✅
> - **Admin Profile (complete):** command center, security viewer, job monitor ✅
> - **Advanced Profile (optional):** realtime/offline sync, push, search, desktop, heavy media

---

## Priority Zero: Package Reduction (The Notion Path)

> **Goal:** Transition from Product Engineer (gluing libraries) to Systems Engineer (building engines).
> Stay ultra framework-independent while keeping React + TypeScript.
>
> **Completed:** Database (drizzle→raw SQL), Push Notifications (removed), Validation (zod→manual), Build Tools (vite-tsconfig-paths removed). See `docs/log/2026-W04.md` for details.

### Packages to Keep (Dangerous to Code Manually)

| Package          | Why Keep                                            |
| ---------------- | --------------------------------------------------- |
| `typescript`     | Type safety (non-negotiable)                        |
| `react`          | UI layer (non-negotiable)                           |
| `vite` + `turbo` | Build infrastructure                                |
| `argon2`         | Never code your own password hashing                |
| `postgres`       | Don't write your own DB driver protocol             |
| `ws`             | Raw TCP socket management is a rabbit hole          |
| `fastify`        | Schema validation + performance (industry standard) |
| `vitest`         | Test runner                                         |
| `playwright`     | E2E testing                                         |

### New Responsibilities After Cleanup

- [ ] **Manual Sync** - Own how data flows from DB to UI
- [ ] **Raw Queries** - Own SQL structure and optimization

### Future: Server Mode Flag

Add environment flag to switch between server implementations:

- [ ] Add `SERVER_MODE` env variable: `fastify` | `raw` | `both`
- [ ] `fastify` (default) - Use Fastify framework only
- [ ] `raw` - Use raw Node.js HTTP server only (maximum performance, minimal features)
- [ ] `both` - Run both servers on different ports (for benchmarking)

**Use cases:**

- Production: `fastify` for full features (validation, hooks, plugins)
- Benchmarking: `both` to compare performance
- Edge/Lambda: `raw` for minimal cold start (future consideration)

---

## Immediate: Code Review

- [ ] Smoke test: Web + Server + Desktop "happy path" on a clean machine (no local dev shortcuts)

---

## Completed: PayPal Billing Adapter ✅

> **Note:** Both Stripe and PayPal billing are complete. See `docs/log/2026-W04.md` for implementation details.
> PayPal provider implements full parity with Stripe: subscriptions, webhooks, checkout flow.

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

## High Priority: Lean-Down / Strip Unnecessary Code (Without Losing Power)

**Goal:** keep your “everything stack”, but ship as a **minimal default**.

### 1) Define the “Minimal Profile” explicitly

- [ ] Write `docs/profiles.md` defining:
  - **Minimal** includes: web + server + postgres, auth, core UI kit, basic logging, basic tests
  - **SaaS** includes: billing + subscriptions + portal + quotas
  - **Admin** includes: command center dashboards
  - **Advanced** includes: realtime/offline, push, search, cache desktop, heavy media
- [ ] Add `FEATURE_FLAGS.md` or `config/features.ts`:
  - `ENABLE_ADMIN`
  - `ENABLE_BILLING`
  - `ENABLE_REALTIME`
  - `ENABLE_OFFLINE_QUEUE`
  - `ENABLE_PUSH`
  - `ENABLE_SEARCH`
  - `ENABLE_CACHE`
  - `ENABLE_MEDIA_PIPELINE`
  - `ENABLE_DESKTOP`
  - `USE_RAW_SQL` - Toggle between drizzle-orm and raw SQL query builder for A/B testing
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

- [ ] Minimal profile uses a lightweight upload path (no heavy binaries)
- [ ] Docs: "Enable Media Plugin" guide + dependency notes

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
  - Cache provider
  - Media plugin
  - Demo catalogs
- [ ] Provide “re-enable” instructions for each

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
- **Legacy migrations:** See `docs/reference/legacy.md`
- **Security overview:** See `docs/dev/security.md` :contentReference[oaicite:45]{index=45}
- **SDK features:** See `packages/sdk/README.md` :contentReference[oaicite:46]{index=46}
- **Core utilities:** See `packages/core/README.md` :contentReference[oaicite:47]{index=47}

---

## Final: Post-Trimdown Package Removal

> **Do this LAST** after test trimdown is complete (see "Boilerplate Tax" Strip Plan above).

### Remove @testing-library

Once unit tests are trimmed to 50-100 high-value tests, evaluate removing `@testing-library/*`:

- [ ] Audit remaining tests - how many use `@testing-library/react`?
- [ ] Convert critical component tests to Playwright E2E or simple `vitest` + `jsdom`
- [ ] Remove packages from root `package.json`:
  - `@testing-library/jest-dom`
  - `@testing-library/react`
  - `@testing-library/user-event`
- [ ] Update test patterns documentation

**Rationale:** Testing-library encourages many granular unit tests. After trimdown, if most value comes from E2E tests (Playwright) and integration tests (vitest + fastify inject), these packages become unnecessary weight.

**Keep if:** Component-level testing remains valuable after trimdown.

---

_Last Updated: 2026-01-23 (SaaS Billing + Admin Command Center complete - see docs/log/2026-W04.md)_
