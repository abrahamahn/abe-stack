# Package Architecture — Server & Package Boundaries

## The Mental Model

In a **SaaS Engine** architecture (Modular Monolith), the boundary is simple:

> **The Server is the "Motherboard." The Packages are the "Components."**

---

## 1. The Golden Rule of Imports

This is the only hard technical rule you need to follow.

- `apps/server` **can** import `packages/*`, `client/`.
- `packages/*`, `client/` can **NEVER** import `apps/server`.
- `backend/core` **can** import `backend/engine` and `packages/shared` (lower tier).

**If you find yourself in `backend/core/src/auth` trying to import a type from `apps/server/src/types.ts`, you have broken the architecture.** Move that type to `packages/shared` immediately.

---

## 2. The Responsibility Boundary (Capability vs. Composition)

### `packages/*`, `client/` — The Capabilities

| Aspect           | Description                           |
| ---------------- | ------------------------------------- |
| **Role**         | Defines **"HOW"** things work.        |
| **Mental Model** | The Engine, Transmission, and Wheels. |

**Contents:**

- **Business Logic:** "How do we calculate a refund?" (`backend/core/billing`)
- **Data Access:** "How do we query the users table?" (`backend/db`)
- **Route Handlers:** "What happens when `POST /login` is called?" (`backend/core/auth`)
- **Internal Config:** "I need a `STRIPE_KEY` to work."

### `apps/server` — The Composition

| Aspect           | Description                         |
| ---------------- | ----------------------------------- |
| **Role**         | Defines **"WHAT"** is running.      |
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
  - **Yes** → It belongs in `backend/core/billing`.
  - **No** (it relies on `req.body`) → It belongs in the Package's HTTP Adapter (`backend/core/src/billing/http`).

### Question 2: "Is this specific to THIS deployment?"

- **Scenario:** You have a `health-check.ts` that checks if the specific AWS Load Balancer is healthy.
- **Test:** Is this logic reusable for a different company using this stack?
  - **Yes** → `infra/monitor`.
  - **No** (it's hardcoded for your specific setup) → Keep it in `apps/server`.

### Question 3: "Does it define a Zod Schema?"

- **Scenario:** `UserSchema.ts`.
- **Test:** Does the Frontend need this too?
  - **Yes** → `packages/shared` (Must be shared).
  - **No** (Internal DB validation) → `backend/db`.
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

| Concept       | `packages/*`, `client/` (Modules) | `apps/server` (Application)     |
| ------------- | --------------------------------- | ------------------------------- |
| **Logic**     | 100% (All Business Rules)         | 0% (Only wiring)                |
| **State**     | Stateless (Classes/Functions)     | Stateful (Instances/Env Vars)   |
| **Database**  | Definitions (Schema/Repo)         | Connection (Pool Instance)      |
| **Config**    | Validation Schemas (Zod)          | Actual Values (`process.env`)   |
| **Knowledge** | Knows nothing about the App       | Knows everything about Packages |

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
Tier 3: Modules         (backend/core: auth, billing, admin, users, notifications)
   ↓ imports from
Tier 2: Infrastructure  (backend/engine, backend/db)
   ↓ imports from
Tier 1: Kernel          (packages/shared)
```

---

### Tier 1: The "Kernel" (Shared Foundation)

These packages have **NO** internal dependencies. They are pure TypeScript/Node.js.

- **Role:** The common language of your ecosystem.
- **Packages:**
  - `packages/shared` — Contracts, Zod schemas, validation, stores, error classes. (The bridge between Frontend and Backend).
- **Why it matters:** If you decide to build a CLI tool or a Mobile App tomorrow, you import these immediately. They are the "Base Class" of your startup.

---

### Tier 2: The "Infrastructure" (Technical Plumbing)

These packages wrap external tools (AWS, Stripe, Redis). They depend on Tier 1.

- **Role:** Solves generic technical problems, not business problems.
- **Packages:**
  - `backend/db` — Drizzle client, Schema definitions, Migrations.
  - `backend/engine` — Cache, config, mailer, storage, queue, security, search.
- **Why it matters:** This allows you to say "We support AWS S3" or "We support Local Uploads" by just swapping a config line. The rest of the app doesn't care.

---

### Tier 3: The "Modules" (Business Features)

These are the products you sell. They consume Tier 2 and Tier 1.

- **Role:** Real-world value. This is where "User," "Invoice," and "Video" exist.
- **Packages:**
  - `backend/core/auth` — Login, Register, Magic Links, Session management. (Uses `db` and `engine`).
  - `backend/core/billing` — Subscriptions, Invoices, Webhooks. (Uses `db` and `engine`).
  - `backend/core/admin` — Administrative operations, user management.
  - `backend/core/users` — User profile management.
  - `backend/core/notifications` — Push notification subscriptions and preferences.
- **Why it matters:** This is your **Money Maker**.
  - _Standard License ($399):_ Ship the code without `backend/core/billing` and `premium/media`.
  - _Pro License ($999):_ Ship the full `backend/core/` folder.

---

### Tier 4: The "Applications" (The Glue)

These are the deployable units. They wire everything together.

- **Role:** Composition and Configuration.
- **Packages:**
  - `apps/server` — The API Server. Imports `@abe-stack/core`, registers the routes, and starts listening on Port 3000.
  - `apps/web` — The React Dashboard. Imports `shared/ui` and calls the API.
  - `apps/worker` — The Background Worker. Imports `infra/jobs` and processes queues.
- **Why it matters:** This layer is **thin**. It has no logic. It just says: "Start the Database, Start the Billing Module, Start the Server."

---

### The "Golden Rule" of Tiers

You can only import from tiers **BELOW** you.

| Import                                 | Allowed?                  | Why                                                                            |
| -------------------------------------- | ------------------------- | ------------------------------------------------------------------------------ |
| `backend/core/auth` → `backend/db`     | **Yes** (Tier 3 → Tier 2) | Auth needs data access.                                                        |
| `backend/db` → `backend/core/auth`     | **No** (Tier 2 → Tier 3)  | Database client shouldn't care about login logic.                              |
| `backend/core/billing` → `apps/server` | **No** (Tier 3 → Tier 4)  | Billing logic shouldn't care if it's running in an API server or a CLI script. |

---

## Why This Makes the Stack "Series A" Ready

- **Isolation:** If `backend/core/billing` crashes, you can isolate it easily.
- **Scalability:** When you hire a "Billing Engineer," they work inside `backend/core/billing`. They don't touch the Core Kernel.
- **Sales:** You can physically delete folders to create different product tiers (Standard vs. Pro) without breaking the build.

> This structure allows you to sell a **product line**, not just a single repository.

---

## Appendix: Current Code Evaluation

_Last updated: January 2026_

This section evaluates the current state of the codebase against the architecture defined above. It covers import direction compliance, responsibility boundary adherence, and migration progress.

---

### A. Import Direction Compliance

**Result: CLEAN — 0 violations.**

All cross-package imports flow in the correct direction (same-tier or downward). No packages import from apps.

| Check                                                      | Status    |
| ---------------------------------------------------------- | --------- |
| `packages/*`, `client/` importing from `apps/*` (Critical) | **CLEAN** |
| Tier 1 (Kernel) importing Tier 2 or 3                      | **CLEAN** |
| Tier 2 (Infrastructure) importing Tier 3                   | **CLEAN** |
| Tier 3 (Modules) importing Tier 4                          | **CLEAN** |
| `package.json` dependency direction                        | **CLEAN** |

**Current dependency map (all valid):**

- **Tier 1:** `core` imports from `contracts` (same tier)
- **Tier 2:** `cache`, `db`, `email`, `storage` import from `core` (T1). `http` imports from `contracts`, `core` (T1). `jobs` imports from `core` (T1), `db` (T2 same tier).
- **Tier 3:** `auth` imports from `contracts`, `core` (T1), `db`, `http` (T2), `security` (T3 same tier). `billing` imports from `contracts`, `core` (T1), `db` (T2). `users` imports from `auth` (T3 same tier), `contracts`, `core` (T1), `db`, `http`, `storage` (T2). `notifications` imports from `contracts`, `core` (T1), `db`, `http` (T2). `realtime` imports from `contracts`, `core` (T1), `db`, `http` (T2). `admin` imports from `auth`, `billing` (T3 same tier), `contracts`, `core` (T1), `db`, `http`, `jobs` (T2).

---

### B. Responsibility Boundary — `apps/server` Size

**Target:** ~10–15 core files + config.
**Current:** ~76 non-test source files (down from ~116 before migration).

```
apps/server/src/
├── main.ts              ← GOOD (thin entry point)
├── app.ts               ← GOOD (composition root — imports from source packages directly)
├── server.ts            ← GOOD (Fastify factory)
├── config/              ← GOOD (18 files — env config loading, server's job)
├── infrastructure/      ← ACCEPTABLE (37 files — local server-specific adapters)
│   ├── http/            ← Local router (AppContext-typed), middleware, pagination, plugins
│   ├── messaging/       ← WebSocket adapter (module-level state)
│   ├── monitor/         ← Health checks, logging middleware
│   ├── notifications/   ← FCM provider factory (thin adapter)
│   └── search/          ← Elasticsearch/SQL search providers
├── modules/             ← GOOD (5 files — system module + route wiring)
│   ├── routes.ts        ← Route wiring only (imports from @abe-stack/* packages)
│   ├── index.ts         ← Barrel (exports registerRoutes only)
│   └── system/          ← System routes/handlers (deployment-specific: health, uptime)
├── services/            ← OK (2 files — cache service)
├── shared/              ← GOOD (2 files — AppContext, IServiceContainer, HasContext only)
├── scripts/             ← OK (3 files — seed, bootstrap, db-push)
├── types/               ← OK (2 files — declaration files)
└── utils/               ← OK (2 files — request utils)
```

**No re-exports:** `infrastructure/index.ts` only exports local server-specific code. All package code is imported directly from `@abe-stack/*` packages by consumers.

---

### C. Migration Progress

#### Completed

| Phase  | What                                                          | Result                                                                  |
| ------ | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **P0** | Admin services + handlers + routes → `modules/admin` (new)    | ✅ Created package with `AdminAppContext`, `adminProtectedRoute` helper |
| **P0** | Billing duplicate modules deleted (code in `modules/billing`) | ✅ Deleted `modules/billing/` (8 files)                                 |
| **P0** | Users duplicate modules deleted (code in `infra/users`)       | ✅ Deleted `modules/users/` (5 files)                                   |
| **P0** | Route wiring rewritten — no re-exports                        | ✅ `modules/routes.ts` imports directly from `@abe-stack/*`             |
| **P1** | Dead auth types removed from `shared/types.ts`                | ✅ Removed 12 unused type exports                                       |
| **P1** | `shared/constants.ts` + `shared/errorMapper.ts` deleted       | ✅ Zero remaining consumers                                             |
| **P2** | `infrastructure/media/` deleted (unused, 29 files)            | ✅ Completely unused code                                               |
| **P2** | Package re-exports removed from `infrastructure/index.ts`     | ✅ Consumers import from source packages                                |

**Lines removed from server:** ~25,000+ (across P0, P1, P2)

#### Remaining (Optional)

| Phase     | What                                                        | Notes                                                                                           |
| --------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **P3**    | Replace `services/cache-service.ts` with `@abe-stack/cache` | Local is basic TTL; package has full LRU. Low priority — functional.                            |
| **P3**    | Unify local HTTP router with `@abe-stack/infra`             | Local uses `AppContext`; package uses `HandlerContext`. Requires system module handler updates. |
| **P3**    | Migrate notification factory to `@abe-stack/notifications`  | Local is thin adapter. Low impact.                                                              |
| **Known** | Fix billing `BillingRouteMap` type incompatibility          | Pre-existing: billing uses custom route system divergent from `@abe-stack/infra`.               |

---

### D. What Is Correctly Placed

| File/Directory              | Why It's Correct                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `main.ts`                   | Thin entry point — config, create, start, shutdown. No business logic.               |
| `app.ts`                    | Composition root — DI wiring. Imports directly from source packages.                 |
| `server.ts`                 | Fastify factory with plugin registration.                                            |
| `config/`                   | Environment variable loading — server's job.                                         |
| `modules/routes.ts`         | Route wiring only — `registerRouteMap` calls importing from `@abe-stack/*` packages. |
| `modules/system/`           | Thin HTTP adapter: delegates to `@abe-stack/server-engine` health functions.         |
| `infrastructure/http/`      | Local router with `AppContext` handler signatures (bridges packages to server).      |
| `infrastructure/monitor/`   | Health checks integrate all infrastructure components.                               |
| `infrastructure/messaging/` | WebSocket adapter with module-level connection state.                                |
| `infrastructure/search/`    | SQL/Elasticsearch adapters — server-specific provider selection.                     |
| `shared/types.ts`           | `AppContext`, `IServiceContainer`, `HasContext` — pure server DI types.              |

---

### E. Architecture Patterns Established

1. **Package context narrowing:** Each package defines a narrow `XxxAppContext extends BaseContext` (e.g., `AdminAppContext`). The server's full `AppContext` structurally satisfies all of them — no casting needed at the boundary.

2. **Route helper pattern:** Packages that need specific context types define a module-specific `xxxProtectedRoute` helper (e.g., `adminProtectedRoute`) that wraps `protectedRoute` from `@abe-stack/infra` and casts the handler context. This keeps route definitions clean while maintaining type safety in handlers.

3. **No re-exports:** Consumers import directly from source packages. The `infrastructure/index.ts` barrel only exports local server-specific infrastructure code.

4. **System health logic in engine:** Pure Node.js health orchestration (all `check*Status` functions, `getDetailedHealth`, `logStartupSummary`) lives in `backend/engine/src/system/`. The `apps/server/src/modules/system/` layer is a thin Fastify HTTP adapter that imports from `@abe-stack/server-engine` and passes WebSocket stats from the realtime package. The standalone `modules/system/` workspace package has been deleted.
