# Enterprise SaaS Boilerplate Checklist

> Comprehensive work tracker for ABE Stack. Each item maps to concrete files.
> Status: [x] done, [-] partial (has some artifacts), [ ] not started.

---

## Build Order (lowest risk, highest leverage)

1. **Kernel** - config, logging, errors, request context (done)
2. **DB + tenancy model + migrations** (current focus)
3. **Auth + sessions + device list**
4. **Tenants / memberships / invites**
5. **RBAC enforcement** (backend + frontend gating)
6. **User settings + workspace admin UI**
7. **Audit + security events**
8. **Job queue + email + webhook replay / idempotency**
9. **Billing rails** (Stripe checkout + webhooks + portal)
10. **System admin / ops console**
11. **Feature flags + usage metering + polish**

---

## Database Layer (backend/db)

### Legend

| Symbol | Meaning                                                                         |
| ------ | ------------------------------------------------------------------------------- |
| S      | `backend/db/src/schema/<module>.ts` - TypeScript column types + table constants |
| M      | `backend/db/migrations/NNNN_<name>.sql` - SQL DDL                               |
| R      | `backend/db/src/repositories/<module>/` - functional repo (`create*Repository`) |
| D      | `shared/src/domain/<module>/` - Zod schemas + domain logic                      |

### Module 1: Identity

| Table           | S                        | M                       | R                            | D                        | Notes                       |
| --------------- | ------------------------ | ----------------------- | ---------------------------- | ------------------------ | --------------------------- |
| `users`         | [x] `schema/users.ts`    | [x] `0000_init.sql`     | [x] `repositories/users/`    | [x] `domain/users/`      | Core user accounts          |
| `tenants`       | [x] `schema/tenant.ts`   | [x] `0001_tenant.sql`   | [x] `repositories/tenant/`   | [x] `domain/tenant/`     | Workspaces / organizations  |
| `memberships`   | [x] `schema/tenant.ts`   | [x] `0001_tenant.sql`   | [x] `repositories/tenant/`   | [x] `domain/membership/` | User-to-tenant roles        |
| `invitations`   | [x] `schema/tenant.ts`   | [x] `0001_tenant.sql`   | [x] `repositories/tenant/`   | [x] `domain/membership/` | Email invite flow           |
| `user_sessions` | [x] `schema/sessions.ts` | [x] `0002_sessions.sql` | [x] `repositories/sessions/` | [x] `domain/sessions/`   | Active device list + revoke |

### Module 2: Auth & Security

| Table                       | S                          | M                       | R                              | D                  | Notes                            |
| --------------------------- | -------------------------- | ----------------------- | ------------------------------ | ------------------ | -------------------------------- |
| `refresh_tokens`            | [x] `schema/users.ts`      | [x] `0000_init.sql`     | [x] `repositories/auth/`       | [x] `domain/auth/` | JWT refresh tokens               |
| `refresh_token_families`    | [x] `schema/auth.ts`       | [x] `0000_init.sql`     | [x] `repositories/auth/`       | [x] `domain/auth/` | Token rotation / reuse detection |
| `login_attempts`            | [x] `schema/auth.ts`       | [x] `0000_init.sql`     | [x] `repositories/auth/`       | [x] `domain/auth/` | Brute-force protection           |
| `password_reset_tokens`     | [x] `schema/auth.ts`       | [x] `0000_init.sql`     | [x] `repositories/auth/`       | [x] `domain/auth/` | Password reset flow              |
| `email_verification_tokens` | [x] `schema/auth.ts`       | [x] `0000_init.sql`     | [x] `repositories/auth/`       | [x] `domain/auth/` | Email verification               |
| `security_events`           | [x] `schema/auth.ts`       | [x] `0000_init.sql`     | [x] `repositories/auth/`       | [x] `domain/auth/` | Security audit trail             |
| `magic_link_tokens`         | [x] `schema/magic-link.ts` | [x] `0002_sessions.sql` | [x] `repositories/magic-link/` | [x] `domain/auth/` | Passwordless login               |
| `oauth_connections`         | [x] `schema/oauth.ts`      | [x] `0002_sessions.sql` | [x] `repositories/oauth/`      | [x] `domain/auth/` | Google, GitHub, Apple            |

### Module 3: Billing & Subscriptions

| Table               | S                       | M                      | R                           | D                     | Notes                    |
| ------------------- | ----------------------- | ---------------------- | --------------------------- | --------------------- | ------------------------ |
| `plans`             | [x] `schema/billing.ts` | [x] `0003_billing.sql` | [x] `repositories/billing/` | [x] `domain/billing/` | Pricing tiers            |
| `subscriptions`     | [x] `schema/billing.ts` | [x] `0003_billing.sql` | [x] `repositories/billing/` | [x] `domain/billing/` | User subscription state  |
| `customer_mappings` | [x] `schema/billing.ts` | [x] `0003_billing.sql` | [x] `repositories/billing/` | [x] `domain/billing/` | User ID to Stripe/PayPal |
| `invoices`          | [x] `schema/billing.ts` | [x] `0003_billing.sql` | [x] `repositories/billing/` | [x] `domain/billing/` | Invoice records          |
| `payment_methods`   | [x] `schema/billing.ts` | [x] `0003_billing.sql` | [x] `repositories/billing/` | [x] `domain/billing/` | Stored cards / methods   |
| `billing_events`    | [x] `schema/billing.ts` | [x] `0003_billing.sql` | [x] `repositories/billing/` | [x] `domain/billing/` | Webhook idempotency      |

### Module 4: Notifications

| Table                      | S                             | M                            | R                                 | D                           | Notes                       |
| -------------------------- | ----------------------------- | ---------------------------- | --------------------------------- | --------------------------- | --------------------------- |
| `notifications`            | [x] `schema/notifications.ts` | [x] `0004_notifications.sql` | [x] `repositories/notifications/` | [x] `domain/notifications/` | In-app notification records |
| `push_subscriptions`       | [x] `schema/push.ts`          | [x] `0004_notifications.sql` | [x] `repositories/push/`          | [x] `domain/notifications/` | Web Push endpoints          |
| `notification_preferences` | [x] `schema/push.ts`          | [x] `0004_notifications.sql` | [x] `repositories/push/`          | [x] `domain/notifications/` | Per-user channel toggles    |

### Module 5: System Infrastructure

| Table                | S                      | M                     | R                          | D                       | Notes                        |
| -------------------- | ---------------------- | --------------------- | -------------------------- | ----------------------- | ---------------------------- |
| `jobs`               | [x] `schema/system.ts` | [x] `0005_system.sql` | [x] `repositories/system/` | [x] `domain/jobs/`      | Background job queue         |
| `audit_events`       | [x] `schema/system.ts` | [x] `0005_system.sql` | [x] `repositories/system/` | [x] `domain/audit-log/` | General audit log            |
| `webhooks`           | [x] `schema/system.ts` | [x] `0005_system.sql` | [x] `repositories/system/` | [x] `domain/webhooks/`  | Registered webhook endpoints |
| `webhook_deliveries` | [x] `schema/system.ts` | [x] `0005_system.sql` | [x] `repositories/system/` | [x] `domain/webhooks/`  | Delivery log + replay        |

### Module 6: Feature Management

| Table                      | S                        | M                       | R                            | D                           | Notes                  |
| -------------------------- | ------------------------ | ----------------------- | ---------------------------- | --------------------------- | ---------------------- |
| `feature_flags`            | [x] `schema/features.ts` | [x] `0006_features.sql` | [x] `repositories/features/` | [x] `domain/feature-flags/` | Global feature toggles |
| `tenant_feature_overrides` | [x] `schema/features.ts` | [x] `0006_features.sql` | [x] `repositories/features/` | [x] `domain/feature-flags/` | Per-tenant overrides   |

### Module 7: Usage Metering

| Table             | S                        | M                       | R                            | D                            | Notes               |
| ----------------- | ------------------------ | ----------------------- | ---------------------------- | ---------------------------- | ------------------- |
| `usage_metrics`   | [x] `schema/metering.ts` | [x] `0007_metering.sql` | [x] `repositories/metering/` | [x] `domain/usage-metering/` | Metric definitions  |
| `usage_snapshots` | [x] `schema/metering.ts` | [x] `0007_metering.sql` | [x] `repositories/metering/` | [x] `domain/usage-metering/` | Recorded usage data |

### Module 8: Compliance

| Table             | S                          | M                         | R                              | D                        | Notes                        |
| ----------------- | -------------------------- | ------------------------- | ------------------------------ | ------------------------ | ---------------------------- |
| `legal_documents` | [x] `schema/compliance.ts` | [x] `0008_compliance.sql` | [x] `repositories/compliance/` | [x] `domain/compliance/` | ToS, Privacy Policy versions |
| `user_agreements` | [x] `schema/compliance.ts` | [x] `0008_compliance.sql` | [x] `repositories/compliance/` | [x] `domain/compliance/` | User acceptance records      |
| `consent_logs`    | [x] `schema/compliance.ts` | [x] `0008_compliance.sql` | [x] `repositories/compliance/` | [x] `domain/compliance/` | GDPR consent audit trail     |

### Summary

```
Total tables:  33
  Schema done:   33 / 33
  Migration done: 33 / 33
  Repo done:     33 / 33
  Domain done:   33 / 33  (shared contracts)
```

### Migration file plan

| File                     | Tables                                                                                                                           | Depends on                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `0000_init.sql`          | users, refresh_tokens, refresh_token_families, login_attempts, password_reset_tokens, email_verification_tokens, security_events | -                            |
| `0001_tenant.sql`        | tenants, memberships, invitations                                                                                                | 0000 (users)                 |
| `0002_sessions.sql`      | user_sessions, magic_link_tokens, oauth_connections                                                                              | 0000 (users)                 |
| `0003_billing.sql`       | plans, subscriptions, customer_mappings, invoices, payment_methods, billing_events                                               | 0000 (users)                 |
| `0004_notifications.sql` | notifications, push_subscriptions, notification_preferences                                                                      | 0000 (users)                 |
| `0005_system.sql`        | jobs, audit_events, webhooks, webhook_deliveries                                                                                 | 0000 (users), 0001 (tenants) |
| `0006_features.sql`      | feature_flags, tenant_feature_overrides                                                                                          | 0001 (tenants)               |
| `0007_metering.sql`      | usage_metrics, usage_snapshots                                                                                                   | 0001 (tenants)               |
| `0008_compliance.sql`    | legal_documents, user_agreements, consent_logs                                                                                   | 0000 (users)                 |

---

## Business Logic Modules

### 1. Identity & Access Management (IAM)

#### 1.1 Multi-tenant model

- [x] `shared/src/domain/tenant/tenant.schemas.ts` - Zod schemas
- [x] `shared/src/domain/membership/membership.schemas.ts` - Zod schemas
- [x] `shared/src/domain/membership/membership.logic.ts` - Role helpers
- [x] `backend/db/src/schema/tenant.ts` - DB types
- [x] `backend/db/migrations/0001_tenant.sql` - DDL
- [x] `backend/db/src/repositories/tenant/` - Repos (tenants, memberships, invitations)
- [ ] `backend/core/src/users/` - Tenant CRUD service + invite accept
- [ ] `apps/server/src/modules/` - Route registration
- [ ] Tenant scoping: `tenant_id` on tenant-owned tables
- [ ] Request context carries `tenantId` + `membership`

#### 1.2 Authentication lifecycle

- [x] Email + password auth
- [x] Email verification
- [x] Password reset flow
- [-] Magic link login (schema + repo + migration done, service wiring needed)
- [-] OAuth2 Google/GitHub (schema + repo + migration done, service wiring needed)
- [ ] Email change flow with re-verification

#### 1.3 Sessions & device security

- [x] `user_sessions` table (schema + repo + migration + domain done)
- [x] Refresh token rotation (via `refresh_token_families`)
- [x] Refresh tokens stored in HttpOnly cookies
- [ ] Active session/device list in settings UI
- [ ] Revoke session / "logout all" endpoint
- [ ] IP change alerts (optional)

#### 1.4 RBAC

- [x] `shared/src/domain/users/users.roles.ts` - Role definitions
- [x] `shared/src/domain/users/users.permissions.ts` - Permission strings
- [ ] Per-tenant role enforcement middleware
- [ ] `<Can permission="...">` UI gating component

#### 1.5 Audit logs

- [x] `shared/src/domain/audit-log/audit-log.schemas.ts` - Zod schemas
- [x] `shared/src/domain/audit-log/audit-log.logic.ts` - Event builder
- [x] `backend/db/src/schema/system.ts` - `audit_events` table types
- [x] `backend/db/migrations/0005_system.sql` - DDL
- [x] `backend/db/src/repositories/system/` - Audit repo
- [ ] Admin audit viewer page

---

### 2. Billing & Subscriptions

- [x] Plan management (schema + repo for plans, subscriptions, invoices, payment_methods)
- [x] `shared/src/domain/billing/` - All billing domain contracts
- [x] Migration SQL for all 6 billing tables
- [ ] Subscription lifecycle states wired end-to-end
  - [ ] States: `trialing` / `active` / `past_due` / `canceled`
  - [ ] Webhook handling updates state reliably
  - [ ] Access rules tied to state via entitlements
- [ ] Stripe integration (checkout + webhooks + portal)
- [ ] Usage / seat metering hooks + counters
- [ ] Entitlements service
  - [ ] `resolveEntitlements(subscription, role) -> { flags, limits }`
  - [ ] `assertEntitled("feature_x")` helper
  - [ ] Limit checks: max projects, max seats, max storage

---

### 3. Communication & Notifications

- [-] Push subscriptions (schema + repo + migration done)
- [-] Notification preferences (schema + repo + migration done)
- [x] `shared/src/domain/notifications/` - Domain contracts
- [x] `notifications` table (schema + repo + migration + domain done)
- [ ] Transactional email templates (Welcome, Verify, Reset, Invite)
- [ ] Email provider abstraction (console + SMTP + API)
- [ ] Preference center UI (email / in-app / push toggles)

---

## Backend Technical Architecture

### 4.1 Type-safe API contracts

- [x] Shared schema package (`shared` with Zod)
- [x] Request/response validation at boundary
- [ ] Generated API client package used by all apps

### 4.2 Module architecture

- [x] Standard module layout: `contracts -> routes -> service -> repo -> tests`
- [x] Feature modules as Fastify plugins (auth, billing, users, admin)
- [ ] Module template / scaffold CLI

### 4.3 Database layer

- [x] Postgres connection + pooling (`backend/db/src/client.ts`)
- [x] Raw `postgres` driver (no ORM)
- [x] Type-safe SQL builder (`backend/db/src/builder/`)
- [x] Migrations system (runner + all migrations 0000-0008 written)
- [x] Seed scripts (`tools/scripts/db/seed.ts`)
- [x] Bootstrap admin script (`tools/scripts/db/bootstrap-admin.ts`)

### 4.4 Background jobs

- [x] `jobs` table (schema + repo + migration + domain done)
- [x] Write service (`backend/db/src/write/write-service.ts`)
- [ ] Job idempotency keys for side effects
- [ ] Retries + backoff + dead-letter strategy

### 4.5 Resiliency & security hardening

- [x] Rate limiting (especially auth)
- [x] CORS per environment
- [x] Security headers
- [x] Structured logging (Pino)
- [x] Standard error model + error codes (`shared/src/core/errors.ts`)
- [x] Request correlation IDs

---

## Frontend Architecture

### 5.1 Data + state

- [x] TanStack Query for server state
- [x] Client stores (`client/stores/`)
- [x] Auth session handling

### 5.2 Forms & validation

- [x] Zod resolver for forms
- [x] Standard form components + patterns

### 5.3 UI system

- [x] Shared component library (`client/ui/`)
- [x] Accessibility defaults (aria, focus states)
- [x] Theme system (`client/ui/src/theme/`)

### 5.4 App shell

- [x] Sidebar + topbar layout
- [ ] Tenant switcher component
- [ ] Command palette (optional)
- [x] Error boundaries + global toasts

---

## Admin Surfaces

### 6.1 User Settings (self-service)

- [x] Profile (name, avatar)
- [ ] Account (change email with re-verify)
- [-] Security (change password done, sessions list missing)
- [ ] Preferences (theme, locale/timezone, notifications)
- [ ] Data controls (export / delete with grace period)

### 6.2 Workspace Admin (tenant-level)

- [ ] Members list + invite / resend / revoke
- [ ] Role management + permission gating
- [ ] Workspace settings (name / logo / defaults)
- [ ] Billing page (plan + invoices + portal)
- [ ] Audit log viewer
- [x] Security events viewer

### 6.3 System Admin (internal)

- [-] User search + view + disable + force logout (partial)
- [ ] Tenant search + suspend + plan override
- [-] Job monitor (partial)
- [ ] Webhook monitor + replay
- [ ] Support impersonation (optional)

---

## Operational Quality

### 7.1 Observability

- [x] Health endpoints (`/health` + `/ready`)
- [x] Request correlation IDs in logs
- [ ] Error reporting integration (Sentry hook)
- [ ] Minimal metrics (request count / latency, job success / fail)

### 7.2 API documentation

- [ ] OpenAPI / Swagger generation
- [ ] Auth-protected docs in non-dev envs

### 7.3 Feature flags

- [x] `shared/src/domain/feature-flags/` - Domain contracts
- [x] `feature_flags` + `tenant_feature_overrides` tables (schema + repo + migration done)
- [ ] Evaluation helper middleware
- [ ] Admin UI for flag management

### 7.4 Compliance

- [x] `legal_documents`, `user_agreements`, `consent_logs` tables (schema + repo + migration + domain done)
- [ ] Data export endpoint (GDPR)
- [ ] Data deletion workflow (soft delete + background hard delete)
- [ ] Consent tracking UI

---

## Definition of Done

The boilerplate is "enterprise-ready" when you can:

- [ ] Create user -> create tenant -> invite teammate -> enforce RBAC
- [ ] Run checkout -> process webhooks idempotently -> activate tenant plan
- [ ] View audit logs + security events
- [ ] Operate jobs / webhooks via ops console
- [ ] Debug issues via correlated logs + error tracking
- [ ] Add a new module using a documented template without inventing patterns

---

## Current Priority: Backend Engine (`backend/engine`)

The server engine package consolidates all infrastructure adapters. Many modules
were migrated from the old `infra/` packages but several are incomplete or have
stale imports. Fix these first — they unblock every vertical slice.

### Legend

| Symbol | Meaning                                                |
| ------ | ------------------------------------------------------ |
| F      | File exists and is production-ready                    |
| B      | Barrel (`index.ts`) exports the module correctly       |
| T      | Colocated `.test.ts` with meaningful coverage          |
| I      | Imports are correct (no stale `@abe-stack/infra` refs) |

### Engine Module 1: Queue / Job System (`src/queue/`)

| Item                               | F   | B   | T   | I   | Notes                                            |
| ---------------------------------- | --- | --- | --- | --- | ------------------------------------------------ |
| `types.ts`                         | [x] | -   | -   | [x] | Merged queue + write types into single file      |
| `client.ts` (QueueServer)          | [x] | [x] | [x] | [x] | Fixed header, imports resolve via `./types`      |
| `writer.ts` (WriteService)         | [x] | [x] | [x] | [x] | Fixed `@abe-stack/infra` → `@abe-stack/db`       |
| `memory-store.ts`                  | [x] | [x] | [x] | [x] | NEW — in-memory `QueueStore` for dev/test        |
| `index.ts` barrel                  | [x] | [x] | -   | [x] | Explicit named exports for all queue/write types |
| Scheduled: `login-cleanup.ts`      | [ ] | [ ] | [ ] | -   | Purge expired login attempts                     |
| Scheduled: `magic-link-cleanup.ts` | [ ] | [ ] | [ ] | -   | Purge expired magic link tokens                  |
| Scheduled: `oauth-refresh.ts`      | [ ] | [ ] | [ ] | -   | Refresh expiring OAuth tokens                    |
| Scheduled: `push-cleanup.ts`       | [ ] | [ ] | [ ] | -   | Purge stale push subscriptions                   |

### Engine Module 2: Permissions (`src/security/permissions/`)

| Item              | F   | B   | T   | I   | Notes                                          |
| ----------------- | --- | --- | --- | --- | ---------------------------------------------- |
| `types.ts`        | [x] | -   | -   | [x] | NEW — full permission type system with helpers |
| `checker.ts`      | [x] | [x] | [x] | [x] | NEW — `PermissionChecker` with batch checking  |
| `middleware.ts`   | [x] | [x] | [x] | [x] | NEW — Fastify preHandler hooks for RBAC        |
| `index.ts` barrel | [x] | [x] | -   | [x] | NEW — explicit named exports                   |

### Engine Module 3: Rate Limiting (`src/security/rate-limit/`)

| Item              | F   | B   | T   | I   | Notes                                                  |
| ----------------- | --- | --- | --- | --- | ------------------------------------------------------ |
| `limiter.ts`      | [x] | [x] | [x] | [x] | NEW — token-bucket algo, LRU store, role-based presets |
| `index.ts` barrel | [x] | [x] | -   | [x] | NEW — explicit named exports                           |

### Engine Module 4: Search (`src/search/`)

| Item               | F   | B   | T   | I   | Notes                                                       |
| ------------------ | --- | --- | --- | --- | ----------------------------------------------------------- |
| `types.ts`         | [x] | -   | -   | [x] | NEW — `ServerSearchProvider`, config types, `SearchContext` |
| `elastic.ts`       | [x] | [x] | [ ] | [x] | Fixed header; stub implementation                           |
| `query-builder.ts` | [x] | [x] | [ ] | [x] | Fixed header                                                |
| `sql-provider.ts`  | [x] | [x] | [x] | [x] | NEW — Postgres full-text search with parameterized queries  |
| `factory.ts`       | [x] | [x] | [x] | [x] | NEW — `SearchProviderFactory` singleton                     |
| `index.ts` barrel  | [x] | [x] | -   | [x] | NEW — explicit named exports                                |

### Engine Module 5: Root Barrel & Stale Imports

| Item                                   | Status    | Notes                                                             |
| -------------------------------------- | --------- | ----------------------------------------------------------------- |
| `src/index.ts` uses `export *`         | [x] Fixed | Replaced with explicit named exports for all modules              |
| `queue/writer.ts` → `@abe-stack/infra` | [x] Fixed | Changed to `@abe-stack/db`                                        |
| `queue/client.ts` → `./types`          | [x] Fixed | `types.ts` created, resolves correctly                            |
| `queue/writer.ts` → `./types`          | [x] Fixed | `types.ts` created, resolves correctly                            |
| `security/index.ts` → `./permissions`  | [x] Fixed | Permissions module created                                        |
| `security/index.ts` → `./rate-limit`   | [x] Fixed | Rate-limit module created                                         |
| `security/crypto/index.ts` barrel      | [x] Fixed | NEW — re-exports JWT base + rotation                              |
| `security/hash.ts` → `./jwt-rotation`  | [x] Fixed | Changed to `./crypto/jwt-rotation`                                |
| `backend/db/src/index.ts` utils path   | [x] Fixed | Changed `./utils/index` → `./utils/transaction` (naming conflict) |

### Summary

```
Queue system:      5 / 9  files ready (core done, scheduled jobs pending)
Permissions:       4 / 4  files ready ✓
Rate limiting:     2 / 2  files ready ✓
Search:            6 / 6  files ready ✓
Root barrel:       fixed (explicit named exports) ✓
```

### Remaining Work

1. **Scheduled jobs** — `login-cleanup.ts`, `magic-link-cleanup.ts`, `oauth-refresh.ts`, `push-cleanup.ts`
2. **Dependency build chain** — `@abe-stack/shared` has duplicate export errors preventing dist types; `@abe-stack/db` DTS build depends on shared. All source-level imports are correct but dist types are stale.
3. **Search test gaps** — `elastic.test.ts` and `query-builder.test.ts` not yet created

---

## Priority: DB Layer Hardening

Work in this order (matches build order steps 2-3):

### Step 1: Write missing migrations (schemas + repos already exist)

```
[x] 0001_tenant.sql    - tenants, memberships, invitations
[x] 0002_sessions.sql  - user_sessions, magic_link_tokens, oauth_connections
[x] 0003_billing.sql   - plans, subscriptions, customer_mappings, invoices, payment_methods, billing_events
```

### Step 2: New schemas + migrations + repos

```
[x] 0004_notifications.sql + schema/notifications.ts + repositories/notifications/
[x] 0005_system.sql        + schema/system.ts        + repositories/system/
```

### Step 3: Feature tables (depend on tenants)

```
[x] 0006_features.sql  + schema/features.ts  + repositories/features/
[x] 0007_metering.sql  + schema/metering.ts  + repositories/metering/
```

### Step 4: Compliance

```
[x] 0008_compliance.sql + schema/compliance.ts + repositories/compliance/
```

### After DB layer: vertical slices

Once the DB layer is solid, work module-by-module:

1. **Auth module** - wire user_sessions, magic_link, oauth into `backend/core/auth`
2. **Tenant module** - wire tenants, memberships, invitations into `backend/core/users` (or new `backend/core/tenant`)
3. **Billing module** - wire all billing repos into `backend/core/billing` + Stripe webhooks
4. **Notifications module** - wire in-app + push + preferences
5. **System module** - jobs, audit, webhooks
