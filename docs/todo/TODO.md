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

## High Priority: Eliminate Server Module Duplicates (Phase 4)

Five server modules have complete code duplicates in `packages/*`.
Now that `BaseContext` is defined and `AppContext` satisfies it (Phases 0-3),
the server adapter layer is unnecessary.

- [ ] Add `emailTemplates` to server `AppContext` / `IServiceContainer`
- [ ] Switch `modules/routes.ts` to import route maps from `@abe-stack/auth`, `@abe-stack/realtime`, `@abe-stack/notifications`
- [ ] Convert module barrel `index.ts` files to re-export from packages
- [ ] Delete ~40 duplicate source files (auth, users/service, realtime, notifications)
- [ ] Update ~37 test file imports to use `@abe-stack/*` packages
- [ ] Verify: `pnpm --filter @abe-stack/server type-check && test`

**Keep local:** admin (no package), billing (incompatible BillingRouteMap), system (server-specific), users handlers/routes (pagination adapter).

**Future:** Migrate test files to packages, align billing route map, switch to package router, rewire WebSocket.

---

## Medium Priority: User Settings (Remaining)

- [ ] 2FA setup UI (TOTP) + recovery codes
- [ ] Email change flow with verification

---

## Medium Priority: UI Package

### Code Quality (Frontend)

- [ ] Standardize arrow functions with forwardRef :contentReference[oaicite:11]{index=11}
- [ ] Consistent prop naming across components :contentReference[oaicite:12]{index=12}
- [ ] JSDoc comments on public APIs :contentReference[oaicite:13]{index=13}

---

## Medium Priority: Infrastructure

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
- [x] Quickstart guides per app (see `docs/quickstart/`)

- [ ] `docs/deploy/` folder (DO + GCP guides)
- [ ] `docs/OPERATIONS.md` (migrations, backups, restore drills, incident basics)

---

## Low Priority: Monitoring

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

---

## References

### WebSocket Enhancements (Backend + Frontend)

- [ ] Auth token refresh on reconnect (use `onConnect` callback) :contentReference[oaicite:39]{index=39}
- [ ] React Query cache invalidation on WebSocket events :contentReference[oaicite:40]{index=40}
- [ ] Presence tracking (online/offline/away, last seen) :contentReference[oaicite:41]{index=41}
- [ ] Typing indicators via WebSocket events :contentReference[oaicite:42]{index=42}

---

_Last Updated: 2026-01-23 (User Profile & Settings UI complete - see docs/log/2026-W04.md)_
