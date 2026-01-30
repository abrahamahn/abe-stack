# Package Architecture — Server & Package Boundaries

## The Mental Model

In a **SaaS Engine** architecture (Modular Monolith), the boundary is simple:

> **The Server is the "Motherboard." The Packages are the "Components."**

---

## 1. The Golden Rule of Imports

This is the only hard technical rule you need to follow.

- `apps/server` **can** import `packages/*`.
- `packages/*` can **NEVER** import `apps/server`.
- `packages/A` **can** import `packages/B` (if B is a lower tier — e.g., Auth imports DB).

**If you find yourself in `packages/auth` trying to import a type from `apps/server/src/types.ts`, you have broken the architecture.** Move that type to `packages/contracts` immediately.

---

## 2. The Responsibility Boundary (Capability vs. Composition)

### `packages/*` — The Capabilities

| Aspect | Description |
|---|---|
| **Role** | Defines **"HOW"** things work. |
| **Mental Model** | The Engine, Transmission, and Wheels. |

**Contents:**

- **Business Logic:** "How do we calculate a refund?" (`modules/billing`)
- **Data Access:** "How do we query the users table?" (`packages/db`)
- **Route Handlers:** "What happens when `POST /login` is called?" (`modules/auth`)
- **Internal Config:** "I need a `STRIPE_KEY` to work."

### `apps/server` — The Composition

| Aspect | Description |
|---|---|
| **Role** | Defines **"WHAT"** is running. |
| **Mental Model** | The Mechanic who assembles the car. |

**Contents:**

- **Wiring:** `app.register(authPlugin)`
- **Configuration:** "Here is the `STRIPE_KEY` from `process.env`."
- **Lifecycle:** "Start the server on port 3000."
- **Dependency Injection:** "Here is the Database instance you asked for."

---

## 3. The "Litmus Test" for Migration

As you migrate files, ask these 3 questions for each one.

### Question 1: "Could I use this in a CLI script?"

- **Scenario:** You want to write a script to manually refund a user from the terminal.
- **File:** `BillingService.ts`.
- **Test:** Can I import this service without starting the Fastify server?
  - **Yes** → It belongs in `packages/billing`.
  - **No** (it relies on `req.body`) → It belongs in the Package's HTTP Adapter (`packages/billing/src/http`).

### Question 2: "Is this specific to THIS deployment?"

- **Scenario:** You have a `health-check.ts` that checks if the specific AWS Load Balancer is healthy.
- **Test:** Is this logic reusable for a different company using this stack?
  - **Yes** → `packages/monitor`.
  - **No** (it's hardcoded for your specific setup) → Keep it in `apps/server`.

### Question 3: "Does it define a Zod Schema?"

- **Scenario:** `UserSchema.ts`.
- **Test:** Does the Frontend need this too?
  - **Yes** → `packages/contracts` (Must be shared).
  - **No** (Internal DB validation) → `packages/db`.
  - **Never** → It should never stay in `apps/server` because the Frontend can't reach it there.

---

## 4. The "Grey Area": Route Definitions

> **Should `routes.ts` be in the App or the Package?**
>
> **Answer: The Package.**

**Why?** Because `POST /login` is a fundamental feature of your Auth "Product." If you sell the Auth module to a client, they expect that route to exist. They shouldn't have to copy-paste the route definition into their `server.ts`.

**The Pattern:**

- **Package:** Exports a Fastify Plugin (`registerAuthRoutes`).
- **Server:** Simply calls `app.register(registerAuthRoutes)`.

---

## 5. The Final Boundary — Summary Table

| Concept | `packages/*` (Modules) | `apps/server` (Application) |
|---|---|---|
| **Logic** | 100% (All Business Rules) | 0% (Only wiring) |
| **State** | Stateless (Classes/Functions) | Stateful (Instances/Env Vars) |
| **Database** | Definitions (Schema/Repo) | Connection (Pool Instance) |
| **Config** | Validation Schemas (Zod) | Actual Values (`process.env`) |
| **Knowledge** | Knows nothing about the App | Knows everything about Packages |

If you follow this, your `apps/server` will naturally shrink to about **10–15 files**, which is the goal.

---

## 6. The 4-Tier Architecture

This is the most powerful part of the architecture. It turns your directory structure into a **Business Strategy**.

You aren't just organizing code for cleanliness; you are organizing it for **Sales & Distribution**.

### The Tiered Hierarchy

Dependencies flow **DOWN**. A package in Tier 3 can import from Tier 2, but Tier 2 can **never** import from Tier 3.

```
Tier 4: Applications   (apps/server, apps/web, apps/desktop)
   ↓ imports from
Tier 3: Modules         (modules/auth, modules/billing, modules/media)
   ↓ imports from
Tier 2: Infrastructure  (packages/db, packages/http, packages/storage, ...)
   ↓ imports from
Tier 1: Kernel          (packages/core, packages/contracts)
```

---

### Tier 1: The "Kernel" (Shared Foundation)

These packages have **NO** internal dependencies. They are pure TypeScript/Node.js.

- **Role:** The common language of your ecosystem.
- **Packages:**
  - `packages/core` — Config loaders (dotenv), Zod helpers, Logger, Error classes.
  - `packages/contracts` — Shared Types, Interfaces, Zod Schemas. (The bridge between Frontend and Backend).
- **Why it matters:** If you decide to build a CLI tool or a Mobile App tomorrow, you import these immediately. They are the "Base Class" of your startup.

---

### Tier 2: The "Infrastructure" (Technical Plumbing)

These packages wrap external tools (AWS, Stripe, Redis). They depend on Tier 1.

- **Role:** Solves generic technical problems, not business problems.
- **Packages:**
  - `packages/db` — Drizzle client, Schema definitions, Migrations.
  - `packages/http` — Fastify wrapper, Middleware (CSRF, CORS), Router logic.
  - `packages/storage` — S3/R2/Local file adapters.
  - `packages/jobs` — BullMQ/PgBoss queue adapters.
  - `packages/email` — Email SMTP/Resend adapters.
- **Why it matters:** This allows you to say "We support AWS S3" or "We support Local Uploads" by just swapping a config line. The rest of the app doesn't care.

---

### Tier 3: The "Modules" (Business Features)

These are the products you sell. They consume Tier 2 and Tier 1.

- **Role:** Real-world value. This is where "User," "Invoice," and "Video" exist.
- **Packages:**
  - `modules/auth` — Login, Register, Magic Links, Session management. (Uses `db` and `email`).
  - `modules/billing` — Subscriptions, Invoices, Webhooks. (Uses `db` and `http`).
  - `modules/media` — Transcoding, Image optimization. (Uses `storage` and `jobs`).
- **Why it matters:** This is your **Money Maker**.
  - *Standard License ($399):* Ship the code without `modules/billing` and `modules/media`.
  - *Pro License ($999):* Ship the full `modules/` folder.

---

### Tier 4: The "Applications" (The Glue)

These are the deployable units. They wire everything together.

- **Role:** Composition and Configuration.
- **Packages:**
  - `apps/server` — The API Server. Imports `modules/auth`, registers the routes, and starts listening on Port 3000.
  - `apps/web` — The React Dashboard. Imports `packages/ui` and calls the API.
  - `apps/worker` — The Background Worker. Imports `packages/jobs` and processes queues.
- **Why it matters:** This layer is **thin**. It has no logic. It just says: "Start the Database, Start the Billing Module, Start the Server."

---

### The "Golden Rule" of Tiers

You can only import from tiers **BELOW** you.

| Import | Allowed? | Why |
|---|---|---|
| `modules/auth` → `packages/db` | **Yes** (Tier 3 → Tier 2) | Auth needs data access. |
| `packages/db` → `modules/auth` | **No** (Tier 2 → Tier 3) | Database client shouldn't care about login logic. |
| `modules/billing` → `apps/server` | **No** (Tier 3 → Tier 4) | Billing logic shouldn't care if it's running in an API server or a CLI script. |

---

## Why This Makes the Stack "Series A" Ready

- **Isolation:** If `modules/billing` crashes, you can isolate it easily.
- **Scalability:** When you hire a "Billing Engineer," they work inside `modules/billing`. They don't touch the Core Kernel.
- **Sales:** You can physically delete folders to create different product tiers (Standard vs. Pro) without breaking the build.

> This structure allows you to sell a **product line**, not just a single repository.

---

## Appendix: Current Code Evaluation

*Audit date: January 2025*

This section evaluates the current state of the codebase against the architecture defined above. It covers import direction compliance, responsibility boundary adherence, and identifies what needs to migrate.

---

### A. Import Direction Compliance

**Result: CLEAN — 0 violations.**

Scanned 848 source files across all 18 packages, checking 2,859 import statements.

| Check | Status |
|---|---|
| `packages/*` importing from `apps/*` (Critical) | **CLEAN** |
| Tier 1 (Kernel) importing Tier 2 or 3 | **CLEAN** |
| Tier 2 (Infrastructure) importing Tier 3 | **CLEAN** |
| Tier 3 (Modules) importing Tier 4 | **CLEAN** |
| `package.json` dependency direction | **CLEAN** |

All cross-package imports flow in the correct direction (same-tier or downward).

**Current dependency map (all valid):**

- **Tier 1:** `core` imports from `contracts` (same tier)
- **Tier 2:** `cache`, `db`, `email`, `storage` import from `core` (T1). `http` imports from `contracts`, `core` (T1). `jobs` imports from `core` (T1), `db` (T2 same tier).
- **Tier 3:** `auth` imports from `contracts`, `core` (T1), `db`, `http` (T2), `security` (T3 same tier). `billing` imports from `contracts`, `core` (T1), `db` (T2). `users` imports from `auth` (T3 same tier), `contracts`, `core` (T1), `db`, `http`, `storage` (T2). `notifications` imports from `contracts`, `core` (T1), `db`, `http` (T2). `realtime` imports from `contracts`, `core` (T1), `db`, `http` (T2).

---

### B. Responsibility Boundary — `apps/server` Size

**Target:** ~10–15 files.
**Actual:** ~116 non-test source files (approximately 8x the target).

```
apps/server/src/
├── main.ts              ← GOOD (thin entry point, 60 lines)
├── app.ts               ← ACCEPTABLE (composition root, 304 lines — slightly thick)
├── server.ts            ← GOOD (Fastify factory)
├── config/              ← GOOD (18 files — env config loading)
├── infrastructure/      ← MIXED (~42 files — some belong in packages)
│   ├── http/            ← Middleware, pagination, router
│   ├── media/           ← Full media processing pipeline
│   ├── messaging/       ← WebSocket adapter
│   ├── monitor/         ← Health checks, logging
│   ├── notifications/   ← FCM provider, notification factory
│   └── search/          ← Elasticsearch/SQL search providers
├── modules/             ← VIOLATION (~33 files — business logic)
│   ├── admin/           ← 12 files: services, handlers, routes
│   ├── billing/         ← 7 files: service, handlers, webhooks
│   ├── users/           ← 2 files: handlers, routes
│   └── system/          ← 3 files: handlers, routes
├── services/            ← VIOLATION (cache service)
├── shared/              ← VIOLATION (types, constants, error mapper)
├── scripts/             ← OK (seed, bootstrap, db-push)
├── types/               ← OK (declaration files)
└── utils/               ← OK (request utils)
```

---

### C. Business Logic Violations in `apps/server`

These files contain business logic that should live in packages.

#### C.1 — Service Classes (should be in packages)

| File | Lines | Business Logic |
|---|---|---|
| `modules/admin/billingService.ts` | 231 | Plan CRUD, plan-to-Stripe sync, "cannot deactivate plan with active subs" guard |
| `modules/admin/userService.ts` | 223 | User listing, locking/unlocking, lock duration calculation, data mapping |
| `modules/admin/securityService.ts` | 345 | Security event queries, metrics aggregation, CSV export generation |
| `modules/admin/jobsService.ts` | 205 | Job listing, queue stats, retry/cancel, sensitive field redaction |
| `modules/admin/service.ts` | 43 | Direct DB queries to unlock user accounts |
| `modules/billing/service.ts` | 451 | Full subscription lifecycle, checkout sessions, payment methods, invoices |

#### C.2 — Route Handlers (should be in packages)

| File | Lines | Handlers |
|---|---|---|
| `modules/admin/handlers.ts` | 67 | `handleAdminUnlock` |
| `modules/admin/userHandlers.ts` | 287 | 5 user admin handlers |
| `modules/admin/billingHandlers.ts` | 252 | 6 billing admin handlers |
| `modules/admin/securityHandlers.ts` | ~200 | 4 security handlers |
| `modules/admin/jobsHandlers.ts` | ~150 | 5 job handlers |
| `modules/billing/handlers.ts` | 651 | 12 billing handlers |
| `modules/users/handlers.ts` | 94 | 2 user handlers |
| `modules/system/handlers.ts` | 159 | 7 system handlers |

#### C.3 — Route Definitions (should be in packages)

| File | Lines | Currently | Should Be |
|---|---|---|---|
| `modules/admin/routes.ts` | 248 | `apps/server` | `packages/admin` (new) |
| `modules/billing/routes.ts` | 199 | `apps/server` | `packages/billing` |
| `modules/users/routes.ts` | 52 | `apps/server` | `packages/users` |
| `modules/system/routes.ts` | 34 | `apps/server` | `packages/core` or new `packages/system` |

**Already correct (routes in packages):**
- `authRoutes` — imported from `@abe-stack/auth`
- `notificationRoutes` — imported from `@abe-stack/notifications`
- `realtimeRoutes` — imported from `@abe-stack/realtime`

#### C.4 — Types That Should Be in Packages

| File | Lines | Types to Move | Destination |
|---|---|---|---|
| `shared/types.ts` | 230 | `TokenPayload`, `RefreshTokenData`, `AuthResult`, `OAuthUserInfo`, `MagicLinkData`, `TotpSecret` | `packages/auth` or `packages/contracts` |
| `shared/constants.ts` | 127 | `ERROR_MESSAGES`, `REFRESH_COOKIE_NAME`, `CSRF_COOKIE_NAME`, `MIN_JWT_SECRET_LENGTH` | `packages/contracts` / `packages/auth` |
| `infrastructure/search/types.ts` | 265 | `ServerSearchProvider`, `SearchContext`, provider configs | New `packages/search` |
| `infrastructure/http/router/types.ts` | 123 | `RouteMap`, `RouteDefinition`, `RouterOptions` | `packages/http` |

---

### D. What Is Correctly Placed

| File | Why It's Correct |
|---|---|
| `main.ts` | Thin entry point — config, create, start, shutdown. No business logic. |
| `app.ts` | Composition root — DI wiring, plugin registration. (Slightly thick but acceptable.) |
| `server.ts` | Fastify factory with plugin registration. |
| `config/` | Environment variable loading — this is the server's job. |
| Auth/Notification/Realtime routes | Imported from packages, registered with `app.register()`. |

---

### E. Migration Roadmap

To reach the ~10–15 file target for `apps/server`, these migrations are needed:

| Priority | What to Move | From | To |
|---|---|---|---|
| **P0** | Admin services + handlers + routes | `modules/admin/` (12 files) | New `packages/admin` |
| **P0** | Billing service + handlers + webhooks | `modules/billing/` (7 files) | `packages/billing` (already exists) |
| **P0** | User handlers + routes | `modules/users/` (2 files) | `packages/users` (already exists) |
| **P1** | Auth-domain types | `shared/types.ts` | `packages/contracts` or `packages/auth` |
| **P1** | Shared constants | `shared/constants.ts` | `packages/contracts` / `packages/auth` |
| **P1** | Router contract types | `infrastructure/http/router/types.ts` | `packages/http` |
| **P2** | Media processing pipeline | `infrastructure/media/` (15+ files) | `packages/media` (already exists) |
| **P2** | Search providers | `infrastructure/search/` (5 files) | New `packages/search` |
| **P2** | Notification providers | `infrastructure/notifications/` (4 files) | `packages/notifications` (already exists) |
| **P2** | System handlers + routes | `modules/system/` (3 files) | `packages/core` or new `packages/system` |
| **P3** | Cache service | `services/cache-service.ts` | `packages/cache` (already exists) |
| **P3** | Error mapper | `shared/errorMapper.ts` | `packages/http` or `packages/core` |

**After full migration, `apps/server/src/` would contain approximately:**
- `main.ts` — entry point
- `app.ts` — composition root
- `server.ts` — Fastify factory
- `config/index.ts` — config loading (+ config sub-modules)
- `modules/routes.ts` — route wiring (`registerRouteMap` calls only)
- `infrastructure/http/plugins.ts` — plugin registration
- A few index/barrel files

**Estimated: ~6–10 core files + config files = within the 10–15 target.**
