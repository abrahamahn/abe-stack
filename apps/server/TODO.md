# Abe-Stack Evolution: The "God Stack" TODO

> **Mission:** Keep the **Body of Abe** (Fastify, Postgres, Drizzle, Zod) while injecting the **Blood of Chet** (Optimistic Locking, WebSocket Subscriptions, Real-time Pub/Sub).

---

## Architecture Comparison: abe-stack vs chet-stack

### Overview

| Aspect                 | **abe-stack-main**                 | **chet-stack-0**                |
| ---------------------- | ---------------------------------- | ------------------------------- |
| **Framework**          | Fastify 5.x ✅                     | Express 4.x ❌                  |
| **API Pattern**        | Contract-first REST (ts-rest) ✅   | Custom RPC-style REST           |
| **Database**           | PostgreSQL + Drizzle ORM ✅        | File-based JSON ❌              |
| **Auth**               | JWT + Refresh Token Rotation ✅    | Cookie-based session tokens     |
| **Real-time**          | None ❌                            | WebSocket pub/sub ✅            |
| **Type Safety**        | Zod schemas + ts-rest contracts ✅ | data-type-ts runtime validation |
| **Optimistic Locking** | None ❌                            | Version-based conflicts ✅      |
| **Background Jobs**    | None ❌                            | Tuple-database queue ✅         |

### What We Keep (Abe-stack Strengths)

- **Fastify 5.x** - Schema compilation, plugin system, Pino logging
- **PostgreSQL + Drizzle** - Production-ready, migrations, connection pooling
- **ts-rest contracts** - Compile-time type safety across client/server
- **JWT + Refresh Token Rotation** - Token family reuse detection, account lockout
- **Argon2id password hashing** - OWASP recommended
- **Security audit trail** - Comprehensive event logging
- **ServerEnvironment DI pattern** - Testable, mockable architecture

### What We Steal (Chet-stack Strengths)

- **WebSocket Pub/Sub** - Real-time subscription system
- **Optimistic Locking** - Version-based conflict detection (409s)
- **Record Map Pattern** - Normalized data fetching
- **Background Job Queue** - Deferred task execution
- **Auto-registration DX** - "Drop a file to create endpoint" feel

---

## Architectural Trade-off Analysis

### 1. API Patterns: Custom RPC-style vs Contract-First REST

**The Battle:** Speed of Writing vs Speed of Maintenance

#### Custom RPC-style REST (Chet-stack)

- **What it is:** Treat API like functions. URLs are actions: `/api/createUser`, `/api/addComment`
- **Pros:** Extremely fast to build. No worry about HTTP verbs or resource hierarchies
- **Cons:** Becomes messy at scale. Hundreds of disconnected endpoints. Caching harder (everything is POST)

#### Contract-First REST (Abe-stack w/ ts-rest)

- **What it is:** Define the interface (contract) before code. "Endpoint takes X, returns Y"
- **Pros:** Generates fully typed clients. Backend changes break frontend at _compile time_, not runtime
- **Cons:** Higher upfront setup (write contract file first)

**The Cherry-Pick:** Use Contract-First (`ts-rest`), organize by Feature domain. The 5 minutes of contract setup prevents the most common bug class: "Frontend sent string, Backend expected number."

---

### 2. Auth: JWT + Rotation vs Cookie Sessions (2026 Standard)

The industry is shifting _back_ toward cookies, but with a twist.

#### JWT + Refresh Token Rotation (Abe-stack)

- **How:** Client holds Access (15m) + Refresh (7d) tokens. Reuse detection locks account
- **Pros:** Stateless, works great for mobile apps (iOS/Android)
- **Cons:** Storing JWTs in localStorage is XSS-vulnerable

#### Cookie-based Session Tokens (Chet-stack)

- **How:** Server sets `Set-Cookie: session_id=...; HttpOnly`. Browser handles everything
- **Pros:** Extremely XSS-secure. Simple
- **Cons:** Harder for React Native mobile. Requires CSRF protection

**The Cherry-Pick: BFF Pattern (Cookie-wrapped JWTs)**

1. Keep Abe-stack JWT engine (rotation, reuse detection, lockout)
2. Change delivery: Send token as **HttpOnly Cookie**, not JSON body
3. Result: Enterprise security (rotation) + Browser hardening (HttpOnly/No XSS)

---

### 3. Type Safety: Zod (Abe) vs Runtime (Chet)

**Winner: Zod (Abe-stack)** - No contest.

- **Zod** is the industry standard. Integrates with OpenAPI, React Hook Form, Fastify
- **data-type-ts** is niche. If maintainer quits, you're stranded
- Zod enables `z.infer<typeof schema>` - runtime validation AND TypeScript types from one source

---

### 4. Middleware: Express-style Composition in Fastify

You can get Express's `app.use(authMiddleware, loggingMiddleware, controller)` feel in Fastify via **preHandler arrays**:

```typescript
// Define "middleware" as plain functions
const requireAuth = async (req: FastifyRequest, reply: FastifyReply) => {
  if (!req.headers.authorization) throw new Error('Unauthorized');
  req.user = { id: '123' };
};

const validateAdmin = async (req: FastifyRequest, reply: FastifyReply) => {
  if (req.user.role !== 'admin') throw new Error('Forbidden');
};

// Stack them in route definition - reads like Express!
fastify.route({
  method: 'GET',
  url: '/api/admin/dashboard',
  preHandler: [requireAuth, validateAdmin], // Auth -> Admin -> Handler
  handler: async (req, reply) => {
    return { secret: 'data' };
  },
});
```

---

### The "God Stack" Blueprint Summary

| Layer          | Choice                   | Rationale                                                     |
| -------------- | ------------------------ | ------------------------------------------------------------- |
| **Framework**  | Fastify                  | Speed, plugins, schema compilation                            |
| **Middleware** | `preHandler` arrays      | Express-like readability, explicit stacking                   |
| **API**        | ts-rest (Contract-first) | Type safety, organize by feature domain                       |
| **Auth**       | JWTs in HttpOnly Cookies | Enterprise security + browser hardening                       |
| **Database**   | Postgres + Drizzle       | Production-ready, add `version` column for optimistic locking |
| **Real-time**  | @fastify/websocket       | Native integration, subscription keys                         |
| **Validation** | Zod                      | Industry standard, type inference                             |

---

## Phase 1: Foundation - Optimistic Concurrency

> **Goal:** Enable collaborative, conflict-aware mutations

### 1.1 Add Version Column to All Tables

- [x] Add `version` column to `users` table
  ```typescript
  version: integer('version').default(0).notNull();
  ```
- [ ] Add `version` column to `refreshTokens` table
- [ ] Add `version` column to `refreshTokenFamilies` table
- [ ] Add `version` column to `securityEvents` table
- [ ] Create migration: `pnpm drizzle-kit generate`
- [ ] Run migration: `pnpm drizzle-kit migrate`

### 1.2 Create Optimistic Lock Utilities

- [x] Create `packages/db/src/utils/optimistic-lock.ts`

  ```typescript
  export async function updateWithVersion<T>(
    tx: Transaction,
    table: PgTable,
    id: string,
    data: Partial<T>,
    expectedVersion: number,
  ): Promise<T> {
    const [record] = await tx
      .update(table)
      .set({ ...data, version: sql`${table.version} + 1` })
      .where(and(eq(table.id, id), eq(table.version, expectedVersion)))
      .returning();

    if (!record) throw new TransactionConflictError();
    return record;
  }
  ```

### 1.3 Update ts-rest Contracts

- [ ] Add `expectedVersion` to mutation request schemas
- [ ] Add `version` to all response schemas
- [ ] Add 409 Conflict response type to all mutations
  ```typescript
  responses: {
    200: successSchema,
    409: conflictErrorSchema, // { message: string, currentVersion: number }
  }
  ```

---

## Phase 2: Real-Time Infrastructure

> **Goal:** Make the app feel alive with WebSocket subscriptions

### 2.1 Install Dependencies

- [x] `pnpm add @fastify/websocket`
- [x] `pnpm add fastify-plugin`
- [ ] `pnpm install` (run to install new deps)

### 2.2 Create Subscription Manager

- [x] Create `apps/server/src/infra/pubsub/index.ts` (includes SubscriptionManager)

  ```typescript
  type SubscriptionKey = `getRecord:${string}:${string}` | `getList:${string}:${string}`;

  class SubscriptionManager {
    private subscriptions = new Map<SubscriptionKey, Set<WebSocket>>();

    subscribe(key: SubscriptionKey, socket: WebSocket): void;
    unsubscribe(key: SubscriptionKey, socket: WebSocket): void;
    publish(key: SubscriptionKey, data: { version: number }): void;
    cleanup(socket: WebSocket): void;
  }
  ```

### 2.3 Create WebSocket Plugin

- [x] Create `apps/server/src/plugins/websocket.ts`
  ```typescript
  // Register @fastify/websocket
  // Handle /ws endpoint
  // Message types: SUBSCRIBE, UNSUBSCRIBE
  // Auto-cleanup on disconnect
  ```

### 2.4 Define Subscription Keys

- [x] Created in `apps/server/src/infra/pubsub/index.ts` (SubKeys helper)
  ```typescript
  export const SubscriptionKeys = {
    record: (table: string, id: string) => `getRecord:${table}:${id}` as const,
    userList: (userId: string, listType: string) => `getList:${userId}:${listType}` as const,
  };
  ```

### 2.5 Integrate Pub/Sub with Database Writes

- [x] Created `publishAfterWrite` helper in `apps/server/src/infra/pubsub/index.ts`

  ```typescript
  export function publishAfterWrite(
    pubsub: SubscriptionManager,
    table: string,
    id: string,
    version: number,
  ) {
    setImmediate(() => {
      pubsub.publish(SubscriptionKeys.record(table, id), { version });
    });
  }
  ```

- [x] Updated ServerEnvironment type to include pubsub (optional for backwards compat)
  ```typescript
  type ServerEnvironment = {
    // ... existing
    pubsub: SubscriptionManager;
  };
  ```

---

## Phase 3: Background Job Queue

> **Goal:** Handle deferred tasks (emails, notifications, cleanup)

### 3.1 Design Decision

- [ ] Evaluate options:
  - **Option A:** PostgreSQL-based queue (pg-boss) - Recommended for simplicity
  - **Option B:** Redis-based queue (BullMQ) - Better for high throughput
  - **Option C:** Simple in-memory queue - Development only

### 3.2 Implement Queue System

- [ ] Install chosen queue library
- [ ] Create `apps/server/src/infra/queue/index.ts`
  ```typescript
  interface QueueApi {
    enqueue<T>(taskName: string, payload: T, options?: { runAt?: Date }): Promise<void>;
    process<T>(taskName: string, handler: (payload: T) => Promise<void>): void;
  }
  ```

### 3.3 Define Task Types

- [ ] Create `apps/server/src/infra/queue/tasks/`
  - [ ] `send-welcome-email.ts`
  - [ ] `send-password-reset.ts`
  - [ ] `cleanup-expired-tokens.ts`
  - [ ] `send-security-alert.ts`

### 3.4 Integrate with ServerEnvironment

- [ ] Add queue to factory.ts
- [ ] Add queue to ServerEnvironment type
- [ ] Create mock queue for testing

---

## Phase 4: Developer Experience Improvements

> **Goal:** Adopt Chet's "drop a file" DX without losing type safety

### 4.1 Auto-loading Routes (Optional)

- [ ] Evaluate `@fastify/autoload` for route registration
- [ ] If adopted, restructure routes:
  ```
  apps/server/src/routes/
  ├── auth/
  │   ├── register.ts
  │   ├── login.ts
  │   └── refresh.ts
  ├── users/
  │   └── me.ts
  └── admin/
      └── unlock.ts
  ```

### 4.2 Contract Organization by Domain

- [ ] Reorganize contracts in `packages/core/src/contracts/`
  ```
  contracts/
  ├── auth.contract.ts
  ├── users.contract.ts
  ├── admin.contract.ts
  └── index.ts (merges all)
  ```

---

## Phase 5: Cookie-Based JWT Option

> **Goal:** Provide "it just works" auth like Chet while keeping JWT security

### 5.1 Hybrid Token Storage

- [ ] Add configuration option for token storage strategy

  ```typescript
  AUTH_TOKEN_STORAGE: 'header' | 'cookie' | 'both';
  ```

- [ ] Update JWT middleware to check both locations
- [ ] Update login/refresh to set HttpOnly cookie when configured

### 5.2 CSRF Considerations

- [ ] Ensure CSRF protection works with cookie-based JWT
- [ ] Document security tradeoffs

---

## Phase 6: Production Scaling Preparation

> **Goal:** Prepare for horizontal scaling

### 6.1 Stateless Pub/Sub Backend

- [ ] Abstract subscription manager behind interface
- [ ] Implement Redis Pub/Sub adapter
  ```typescript
  interface PubSubBackend {
    publish(channel: string, message: string): Promise<void>;
    subscribe(channel: string, handler: (message: string) => void): void;
  }
  ```

### 6.2 Sticky Sessions Alternative

- [ ] Document options:
  - Redis adapter for pub/sub (preferred)
  - Postgres LISTEN/NOTIFY
  - Sticky sessions via load balancer

---

## Implementation Priority

### MVP (Do First)

- [x] Phase 1.1 - Add version column to users table
- [x] Phase 1.2 - Optimistic lock utilities
- [x] Phase 2.1-2.3 - Basic WebSocket infrastructure
- [x] Phase 2.5 - Pub/Sub integration with writes
- [ ] Run `pnpm install` to install new dependencies
- [ ] Run `pnpm drizzle-kit generate` to create migration
- [ ] Run `pnpm drizzle-kit migrate` to apply migration

### Fast Follow

- [ ] Phase 1.3 - Update ts-rest contracts with version fields
- [ ] Phase 3 - Background job queue (pg-boss)
- [ ] Add version columns to remaining tables

### Nice to Have

- [ ] Phase 4 - DX improvements (autoload routes)
- [ ] Phase 5 - Cookie-based JWT option (BFF pattern)
- [ ] Phase 6 - Horizontal scaling prep (Redis pub/sub)

---

## Files to Create/Modify

### New Files

```
apps/server/src/
├── plugins/
│   └── websocket.ts                    # WebSocket plugin
├── infra/
│   ├── pubsub/
│   │   ├── index.ts                    # PubSub exports
│   │   ├── subscription-manager.ts     # In-memory subscription tracking
│   │   ├── publish-hook.ts             # Post-write publish helper
│   │   └── adapters/
│   │       ├── memory.ts               # In-memory backend
│   │       └── redis.ts                # Redis backend (future)
│   └── queue/
│       ├── index.ts                    # Queue exports
│       └── tasks/                      # Task definitions

packages/core/src/
├── pubsub-keys.ts                      # Subscription key helpers
└── contracts/
    ├── auth.contract.ts                # Auth domain contract
    ├── users.contract.ts               # Users domain contract
    └── admin.contract.ts               # Admin domain contract

packages/db/src/
└── utils/
    └── optimistic-lock.ts              # Version-based update helpers
```

### Modified Files

```
packages/db/src/schema/auth.ts          # Add version columns
packages/core/src/contracts/index.ts  # Add version to schemas, 409 responses
apps/server/src/infra/ctx.ts            # Add pubsub to ServerEnvironment
apps/server/src/infra/factory.ts        # Initialize pubsub
apps/server/src/server.ts               # Register WebSocket plugin
apps/server/src/modules/auth/handlers.ts # Use optimistic locking, publish updates
```

---

## Success Criteria

- [ ] All mutations return a `version` field
- [ ] Concurrent edits to same record return 409 Conflict
- [ ] WebSocket clients receive real-time updates when records change
- [ ] Background tasks can be scheduled and executed
- [ ] All existing tests pass
- [ ] New integration tests for optimistic locking
- [ ] New integration tests for WebSocket subscriptions

---

## Technical Decisions Log

| Decision               | Choice               | Rationale                                      |
| ---------------------- | -------------------- | ---------------------------------------------- |
| Keep Fastify           | ✅                   | Schema compilation, plugin system, performance |
| Keep PostgreSQL        | ✅                   | Production-ready, concurrent, ACID             |
| Keep ts-rest           | ✅                   | Type safety across stack                       |
| Keep JWT rotation      | ✅                   | Security best practice                         |
| Add WebSocket          | @fastify/websocket   | Native Fastify integration                     |
| Add optimistic locking | Version column       | Simple, proven pattern                         |
| Pub/Sub backend        | In-memory → Redis    | Start simple, scale later                      |
| Job queue              | TBD (pg-boss likely) | Evaluate in Phase 3                            |

---

## References

- [Fastify WebSocket Plugin](https://github.com/fastify/fastify-websocket)
- [pg-boss - PostgreSQL Job Queue](https://github.com/timgit/pg-boss)
- [Optimistic Concurrency Control](https://en.wikipedia.org/wiki/Optimistic_concurrency_control)
- [ts-rest Documentation](https://ts-rest.com/)
