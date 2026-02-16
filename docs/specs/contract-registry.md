# Contract Registry (SSOT)

> **Purpose:** The Single Source of Truth for shared domain contracts, schemas, and interfaces.
> **Living Document:** This maps the `shared/domain` package to the implementation status.

## Universal Chart

| Domain            | Zod Schema (Input)              | TS Interface (Output)        | Status              | Enterprise Readiness                                                                              |
| :---------------- | :------------------------------ | :--------------------------- | :------------------ | :------------------------------------------------------------------------------------------------ |
| **Auth**          | `LoginSchema`, `RegisterSchema` | `AuthResponse`, `User`       | ✅ Stable           | [x] Rate-limited <br> [x] Audit logged <br> [x] Zod validated                                     |
| **Sessions**      | `RevokeSessionSchema`           | `Session`, `SessionList`     | 🚧 Missing Contract | [ ] **Contract-First** <br> [x] IP tracking <br> [x] RFC 6819 reuse detection                     |
| **Users**         | `UpdateProfileSchema`           | `UserProfile`, `PrivateUser` | ⚠️ Mixed            | [ ] **Domain ID Prefixes** (`usr_`) <br> [-] Hard Delete pending <br> [-] Export pending          |
| **Tenants**       | `CreateTenantSchema`            | `Tenant`, `TenantList`       | 🚧 Missing Contract | [ ] **Domain ID Prefixes** (`org_`) <br> [x] Slug uniqueness <br> [x] Logo support                |
| **Membership**    | `InviteMemberSchema`            | `Membership`, `Invitation`   | 🚧 Missing Contract | [ ] **Shared Entitlement Engine** <br> [x] Role hierarchy <br> [x] Domain restrictions            |
| **Billing**       | `CreateSubscriptionSchema`      | `Subscription`, `Plan`       | 🚧 Alpha            | [ ] **Idempotency Keys** <br> [x] Webhook handling <br> [-] Checkout flow                         |
| **Notifications** | `SendNotificationSchema`        | `Notification`               | 🚧 Alpha            | [x] DB Layer <br> [-] Preferences <br> [-] Push                                                   |
| **Audit**         | `AuditFilterSchema`             | `AuditEvent`                 | ✅ Stable           | [ ] **Impersonation Audit** (Sudo-Override) <br> [x] Actor polymorphism <br> [x] Retention policy |
| **Realtime**      | `SubscribeSchema`               | `RealtimeEvent`              | ✅ Stable           | [x] Auth integration <br> [x] Tenant scoping <br> [x] WebSocket transport                         |
| **API Keys**      | `CreateApiKeySchema`            | `ApiKey`                     | ✅ Stable           | [ ] **Idempotency Support** <br> [x] Hashing <br> [-] Scopes                                      |
| **Admin**         | `AdminSearchSchema`             | `AdminStats`                 | ✅ Stable           | [x] System visibility <br> [x] Impersonation prep                                                 |
| **Webhooks**      | `WebhookPayloadSchema`          | `WebhookReceipt`             | ✅ Stable           | [ ] **Signature Handshake** <br> [x] Delivery tracking                                            |
| **Jobs**          | `JobDefSchema`                  | `JobQueueStatus`             | ✅ Stable           | [ ] **Retry Idempotency** <br> [x] Monitoring                                                     |
| **Usage**         | `UsageSnapshotSchema`           | `UsageMetric`                | ⚠️ Shadow           | [ ] **Billing Integration** <br> [x] SNAPSHOT tracking                                            |
| **Flags**         | `FeatureFlagSchema`             | `FlagEvaluation`             | ⚠️ Shadow           | [ ] **Gating Middleware** <br> [x] Percentage rollouts                                            |

## Enterprise Hardening (SaaS vs Platform)

### A. Inbound Rate-Limit Contracts

| Tier         | Limit    | Burst | Target / Usecase                          |
| :----------- | :------- | :---- | :---------------------------------------- |
| **CRITICAL** | 100/min  | 50    | Auth, Payments, Security-sensitive routes |
| **STANDARD** | 1000/min | 200   | User-facing App API, CRUD                 |
| **UTILITY**  | 5000/min | 1000  | Audit Logs, Analytics, Internal Ops       |
| **WEBHOOK**  | 600/min  | 600   | Stripe/PayPal Ingress (Bursty)            |

### B. Recursive "Search & Filter" Interface (`shared/domain/common`)

Standardized contract for all list/search endpoints:

```typescript
interface SearchQuery {
  limit?: number; // Max 100
  offset?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  query?: string; // Full-text
  filters?: Record<string, unknown>; // Domain-specific
}
```

### C. Versioned API Contracts

All shared response types must include `apiVersion` to handle rolling deployments.

```typescript
interface BaseResponse {
  apiVersion: string; // e.g. "v1.0.0"
  traceId: string; // "err_..." or "req_..." for semantic logging
}
```

### D. Common Data Prototypes (`shared/domain/common`)

To prevent serialization bugs and ensure polymorphic identity:

```typescript
// 1. Precise Time
type ISO8601 = string & { __brand: 'ISO8601' }; // Strict ISO string

// 2. Polymorphic Actor
interface Actor {
  id: string; // branded: usr_..., key_..., or adm_...
  type: 'user' | 'api_key' | 'system';
  ip: string;
}

// 3. Standard Filter (Logic-based RLS)
interface StandardFilter {
  tenantId?: string; // Mandated for multi-tenant queries
  ownerId?: string; // Resource owner
  deleted?: boolean; // Soft-delete predicate
}
```

### E. The "Partial Update" Invariant

For all `PATCH` endpoints:

- Schema must be `DeepPartial<T>`
- **Rule:** Body CANNOT be empty. If keys === 0, return `400 Bad Request` (No-op).

## Missing "Day 1" Enterprise Features

### 1. Idempotency Keys (System Ops)

- **Requirement:** Essential for Billing and Webhooks.
- **Implementation:** Middleware check for `Idempotency-Key` header. Cache key + response to prevent double-charging or duplicate processing.
- **Target:** `shared/domain/billing`, `shared/domain/webhooks`.

### 2. Impersonation Audit (Admin)

- **Requirement:** Sudo-Override for audit logs.
- **Implementation:** When an admin impersonates, usage must log both `impersonator_id` (Admin) and `target_user_id` (Victim).
- **Target:** `shared/domain/audit-log`.

### 3. Domain-Specific ID Prefixes

- **Requirement:** Human-readable IDs (`usr_...`, `org_...`, `inv_...`) instead of raw UUIDs (`550e...`).
- **Benefit:** Forensic debugging and AI-readability.
- **Target:** All `shared/domain/**` schemas.

## Architecture Upgrade: Shared Entitlement Engine

### The Entitlement Service (`shared/domain/permissions`)

- **Problem:** Hardcoded `if (role === 'admin')` checks are brittle and duplicated.
- **Solution:** A centralized, isomorphic entitlement engine.
- **API:** `canUser(user).do(Action.CreateProject).in(workspace)`
- **Usage:**
  - **Frontend:** Hides buttons/tabs based on permissions.
  - **Backend:** Blocks routes/actions using the exact same logic.

## Domain Detail Map

### 1. Authentication (`shared/domain/auth`)

- **Status:** 95% Complete
- **Contracts:** `auth.contracts.ts`
- **Gaps:** Magic Link frontend wiring.

### 2. Users & Identity (`shared/domain/users`)

- **Status:** 70% Complete
- **Contracts:** `users.contracts.ts`, `profile.schemas.ts`
- **Gaps:** Domain ID Prefixes, Avatar pipeline verification.

### 3. Multi-Tenancy (`shared/domain/tenant`)

- **Status:** 90% Complete (Logic/Repo), 0% Contract
- **Contracts:** `tenant.contracts.ts` (MISSING)
- **Gaps:** Formal contract boundary, Entitlement Engine integration.

### 4. Membership (`shared/domain/membership`)

- **Status:** 80% Complete
- **Contracts:** `membership.contracts.ts` (MISSING)
- **Gaps:** Role-update validation at boundary, Invitation email logic.

### 5. Sessions (`shared/domain/sessions`)

- **Status:** 90% Complete (Server/Repo)
- **Contracts:** `sessions.contracts.ts` (MISSING)
- **Gaps:** Session revocation contract, Device parsing standardization.

### 6. Billing (`shared/domain/billing`)

- **Status:** 40% Complete
- **Contracts:** `billing.contracts.ts`
- **Gaps:** Idempotency Keys, Service logic for checkout, invoicing UI.

### 7. Compliance (`shared/domain/compliance`)

- **Status:** 35% Complete
- **Contracts:** `deletion.schemas.ts`, `tos.schemas.ts`
- **Gaps:** GDPR Data export, hard deletion jobs, consent management.

### 8. Admin & Ops (`shared/domain/admin`, `webhooks`, `jobs`)

- **Status:** 90% Complete
- **Contracts:** `admin.contracts.ts`, `webhooks.contracts.ts`, `jobs.contracts.ts`
- **Note:** Well-defined internal boundaries, but currently "hidden" from the top-level chart.

### 9. Feature Flags & Usage (`shared/domain/feature-flags`, `usage-metering`)

- **Status:** 60% Complete (Shadow)
- **Gaps:** Boundary validation. Currently uses raw schemas without `contracts.ts` wrapper.
