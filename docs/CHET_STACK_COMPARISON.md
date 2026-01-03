# Chet Stack vs ABE Stack Architecture Comparison

## Executive Summary

This document provides a deep comparison between **chet-stack** (ccorcos/chet-stack v0) and **abe-stack** to identify architectural differences and opportunities to adopt chet-stack's "pure" philosophy.

### Philosophy Comparison

| Aspect | Chet Stack | ABE Stack |
|--------|------------|-----------|
| **Philosophy** | "Boilerplate, not a framework" - minimal abstractions, maximum control | Full-featured monorepo with abstraction layers |
| **Complexity** | Simple, single-process, ~18 shared files | Complex, multi-package monorepo with 11 packages |
| **Scaling Approach** | Start simple, break out services when needed | Pre-optimized for scale from the start |
| **Dependencies** | Minimal, battle-tested libraries | Rich ecosystem with many specialized packages |
| **Target** | Developers who want to understand every line | Teams wanting productivity with conventions |

---

## 1. Project Structure Comparison

### Chet Stack Structure (Pure & Simple)
```
chet-stack/
├── src/
│   ├── client/           # All frontend code
│   │   ├── actions/      # State mutations
│   │   ├── components/   # React components
│   │   ├── helpers/      # Utility functions
│   │   ├── hooks/        # React hooks
│   │   ├── loaders/      # Data loading logic
│   │   ├── services/     # Client services
│   │   ├── test/         # Tests
│   │   ├── index.html
│   │   ├── index.tsx
│   │   └── service-worker.js
│   ├── server/           # All backend code
│   │   ├── apis/         # API endpoints (auto-indexed)
│   │   ├── helpers/      # Utility functions
│   │   ├── services/     # Server services
│   │   ├── tasks/        # Background jobs
│   │   ├── server.ts     # Main entry point
│   │   ├── ApiServer.ts
│   │   ├── FileServer.ts
│   │   ├── PubsubServer.ts
│   │   └── QueueServer.ts
│   ├── shared/           # Shared between client/server
│   │   ├── schema.ts     # Data types (THE source of truth)
│   │   ├── dataTypes.ts
│   │   ├── transaction.ts
│   │   └── [utilities]
│   └── tools/            # Build and CLI tools
├── package.json          # Single package
└── tsconfig.json         # Single config
```

### ABE Stack Structure (Feature-Rich Monorepo)
```
abe-stack/
├── apps/
│   ├── web/              # React web app
│   ├── server/           # Fastify server
│   ├── desktop/          # Electron app
│   └── mobile/           # React Native app
├── packages/
│   ├── shared/           # Business logic + contracts
│   ├── ui/               # Design system (complex hierarchy)
│   ├── db/               # Database layer (Drizzle ORM)
│   ├── api-client/       # Generated API client
│   ├── storage/          # Storage abstraction
│   └── create-abe-app/   # CLI generator
├── config/               # Shared configs
│   ├── build/
│   ├── docker/
│   ├── playwright/
│   └── vitest/
├── tools/                # Scripts
├── pnpm-workspace.yaml   # Workspace definition
├── turbo.json            # Build orchestration
└── 11 package.json files # One per package
```

### Key Difference: Chet Stack uses a flat structure with a single `package.json`, while ABE Stack uses a complex monorepo with 11 packages.

---

## 2. Dependency Injection Pattern

### Chet Stack: Environment Object Pattern (Pure)

**Server Side** (`ServerEnvironment.ts`):
```typescript
export type ServerEnvironment = {
  config: ServerConfig
  db: DatabaseApi
  pubsub: PubsubApi
  queue: QueueDatabaseApi
}
```

**Client Side** (`ClientEnvironment`):
```typescript
const environment = {
  router: new Router(),
  api: createApiProxy(),
  recordCache: new RecordCache(),
  recordStorage: new RecordStorage(),
  loaderCache: new LoaderCache(),
  subscriptionCache: new SubscriptionCache(),
  transactionQueue: new TransactionQueue(),
  undoRedo: new UndoRedoStack(),
}
```

**Philosophy**: All dependencies bundled into a single "environment" object that flows through the entire application. No magic, no decorators, just plain objects.

### ABE Stack: Decorated/Provider Pattern

**Server Side** (Fastify decoration):
```typescript
app.decorate('db', db)
app.decorate('storage', storage)
// Accessed via request.server.db
```

**Client Side** (React Context providers):
```typescript
<QueryClientProvider>
  <AuthProvider>
    <ApiProvider>
      <HistoryProvider>
        {children}
      </HistoryProvider>
    </ApiProvider>
  </AuthProvider>
</QueryClientProvider>
```

### Recommendation for Purity

**Create a unified environment pattern** like chet-stack:

```typescript
// shared/environment.ts
export type ClientEnvironment = {
  api: ApiClient
  auth: AuthService
  router: Router
  cache: RecordCache
  storage: RecordStorage
}

export type ServerEnvironment = {
  config: ServerConfig
  db: DatabaseClient
  storage: StorageProvider
  pubsub: PubsubServer
}
```

---

## 3. Data Schema & Types

### Chet Stack: Single Schema File (Pure)

**`shared/schema.ts`** - One file defines ALL data types:
```typescript
// Every record has id + version (for sync)
export type UserRecord = {
  id: string
  version: number
  username: string
  created_at: string
}

export type MessageRecord = {
  id: string
  version: number
  thread_id: string
  user_id: string
  content: string
  created_at: string
}

// Type mapping
export type TableToRecord = {
  user: UserRecord
  message: MessageRecord
  // ...
}

// Runtime validation
export const recordSchemas = {
  user: validateUserRecord,
  message: validateMessageRecord,
}
```

### ABE Stack: Distributed Schemas

**Multiple locations**:
- `packages/db/src/schema/users.ts` - Drizzle ORM schema
- `packages/shared/src/contracts/index.ts` - ts-rest API contracts
- Zod schemas scattered across contracts

### Recommendation for Purity

**Consolidate to a single source of truth**:

```typescript
// packages/shared/src/schema.ts - THE source of truth
import { z } from 'zod'

// Define schemas once
export const UserSchema = z.object({
  id: z.string(),
  version: z.number(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.enum(['user', 'admin', 'moderator']),
  createdAt: z.date(),
})

export type User = z.infer<typeof UserSchema>

// Generate Drizzle schema FROM this
// Generate API contracts FROM this
```

---

## 4. API Layer

### Chet Stack: Auto-Indexed APIs (Pure)

```typescript
// server/apis/login.ts - Just create a file!
export async function login(
  environment: ServerEnvironment,
  args: { username: string; password: string }
) {
  const user = await environment.db.getUser(args.username)
  // ... authentication logic
  return { userId: user.id, token: token }
}
```

The `autoindex` package automatically discovers and wires up APIs. No manual routing needed.

**Client calls**:
```typescript
const result = await environment.api.login({ username, password })
```

### ABE Stack: ts-rest Contracts

```typescript
// packages/shared/src/contracts/index.ts
export const apiContract = c.router({
  auth: {
    login: {
      method: 'POST',
      path: '/api/auth/login',
      body: loginRequestSchema,
      responses: {
        200: authResponseSchema,
        401: errorResponseSchema,
      },
    },
  },
})

// apps/server/src/routes/index.ts
// Must manually implement each route
```

### Trade-off Analysis

| Aspect | Chet Stack | ABE Stack |
|--------|------------|-----------|
| Boilerplate | Very low (auto-indexed) | Medium (contracts + implementations) |
| Type Safety | Manual types | Full end-to-end types |
| Documentation | Implicit | Explicit (contracts are self-documenting) |
| Validation | Manual | Automatic (Zod) |

### Recommendation for Purity

Keep ts-rest for type safety but simplify the structure:
- Move contracts closer to implementations
- Consider code generation for boilerplate reduction

---

## 5. State Management

### Chet Stack: Custom Implementation (Pure)

**RecordCache** - In-memory database:
```typescript
class RecordCache {
  private records: RecordMap = {}
  private listeners: Set<Listener> = new Set()

  get<T extends TableName>(table: T, id: string): RecordValue<T> | undefined
  set<T extends TableName>(table: T, id: string, record: RecordValue<T>): void
  subscribe(listener: Listener): () => void
}
```

**RecordStorage** - IndexedDB persistence:
```typescript
class RecordStorage {
  // Mirrors RecordCache structure in IndexedDB
  // Enables offline-first functionality
}
```

**LoaderCache** - Request deduplication for React Suspense:
```typescript
class LoaderCache {
  // Tracks loading states
  // Prevents duplicate requests
}
```

### ABE Stack: Library-Based

- **React Query** (TanStack) for server state
- **Zustand** for client state
- **localStorage** for token persistence

### Trade-off Analysis

| Aspect | Chet Stack | ABE Stack |
|--------|------------|-----------|
| Offline Support | Built-in (IndexedDB + TransactionQueue) | Not built-in |
| Bundle Size | Smaller (custom code) | Larger (libraries) |
| Learning Curve | Higher (custom APIs) | Lower (standard libraries) |
| Maintenance | You maintain it | Community maintains it |
| Real-time Sync | Built-in pubsub | Would need to add |

### Recommendation for Purity

For a "pure" approach like chet-stack, consider:
1. Keep React Query for caching (it's excellent)
2. Add IndexedDB persistence layer
3. Implement proper offline queue
4. Add RecordCache abstraction over React Query

---

## 6. Real-Time & Offline

### Chet Stack: First-Class Citizens

**PubSub System**:
```typescript
// Server publishes updates
environment.pubsub.publish({ table: 'message', id: messageId, version: newVersion })

// Client subscribes
environment.subscriptionCache.subscribe('message', messageId, (update) => {
  if (update.version > localVersion) {
    // Fetch and update cache
  }
})
```

**Offline Queue**:
```typescript
class TransactionQueue {
  // Persists to localStorage
  // Auto-retries on reconnection
  // Handles conflicts with rollback
}
```

**Service Worker**:
```typescript
// Network-first with cache fallback
// Always tries fresh content first
```

### ABE Stack: Not Implemented

- No WebSocket/PubSub infrastructure
- No offline support
- No service worker
- No transaction queue

### Recommendation for Purity

This is a **major gap** in abe-stack. To achieve chet-stack purity:

1. **Add PubSub Server**:
```typescript
// apps/server/src/services/PubsubServer.ts
export class PubsubServer {
  private wss: WebSocketServer
  private subscriptions: Map<string, Set<WebSocket>>

  publish(key: string, data: any): void
  subscribe(ws: WebSocket, key: string): void
}
```

2. **Add Transaction Queue**:
```typescript
// packages/shared/src/services/TransactionQueue.ts
export class TransactionQueue {
  private queue: Transaction[] = []

  enqueue(transaction: Transaction): void
  dequeue(): Promise<void>
  persist(): void  // to localStorage
  restore(): void  // from localStorage
}
```

3. **Add Service Worker** for offline asset caching

---

## 7. Authentication

### Chet Stack: Cookie-Based Sessions

```typescript
// Simple token in HTTP-only cookie
const token = uuid()
await db.createAuthToken({ user_id: userId, token, expires_at: ... })
res.cookie('auth_token', token, { httpOnly: true, secure: true })

// Every request reads from cookie
const token = req.cookies.auth_token
const session = await db.getAuthToken(token)
```

### ABE Stack: JWT + Refresh Tokens

```typescript
// Access token (15 min) in memory/localStorage
// Refresh token (7 days) in HTTP-only cookie
// Auto-refresh every 13 minutes
```

### Trade-off Analysis

| Aspect | Chet Stack | ABE Stack |
|--------|------------|-----------|
| Simplicity | Very simple | More complex |
| Stateless | No (server stores tokens) | Yes (JWT is stateless) |
| Revocation | Easy (delete from DB) | Hard (need blocklist) |
| Token Size | Small (UUID) | Large (JWT payload) |
| XSS Protection | Full (HTTP-only) | Partial (access token exposed) |

### Recommendation for Purity

Chet-stack's approach is simpler and more secure. Consider:
- Switch to pure cookie-based sessions
- Store session tokens in database
- Remove JWT complexity

---

## 8. Build System

### Chet Stack: Single Script (Pure)

```typescript
// tools/build.ts - One file handles everything
import estrella from 'estrella'

estrella.build({
  entry: 'src/client/index.tsx',
  outfile: 'build/client.js',
  bundle: true,
  // ...
})
```

**Single `npm start`** runs everything.

### ABE Stack: Turborepo + Multiple Configs

- `turbo.json` - Build orchestration
- `config/build/vite.config.ts` - Vite config
- `config/vitest/vitest.config.ts` - Test config
- `config/playwright/playwright.config.ts` - E2E config
- Multiple `tsconfig.json` files
- Complex dependency graph

### Trade-off Analysis

| Aspect | Chet Stack | ABE Stack |
|--------|------------|-----------|
| Build Speed | Fast (esbuild) | Fast (Vite + Turbo cache) |
| Complexity | Very low | High |
| Caching | No | Yes (Turbo) |
| Parallelization | No | Yes (Turbo) |
| Monorepo Support | No | Yes |

### Recommendation for Purity

If you want chet-stack purity:
- Consider collapsing to a single package
- Use esbuild directly instead of Vite
- Single tsconfig.json with paths

If you need monorepo:
- Keep Turborepo but simplify configs
- Reduce number of packages

---

## 9. Database

### Chet Stack: Simple JSON File (Initially)

```typescript
// Start with file-based storage
class Database {
  private data: Record<string, Record<string, any>> = {}

  get(table: string, id: string): any
  set(table: string, id: string, record: any): void
  save(): void  // Write to file
}

// Migrate to SQLite/Postgres when needed
```

### ABE Stack: Drizzle ORM + PostgreSQL

```typescript
// Full ORM with migrations
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  // ...
})
```

### Trade-off Analysis

| Aspect | Chet Stack | ABE Stack |
|--------|------------|-----------|
| Initial Setup | Zero (JSON file) | Complex (Docker + Postgres) |
| Production Ready | No (file-based) | Yes |
| Migrations | Manual | drizzle-kit |
| Type Safety | Manual | Inferred from schema |

### Recommendation

ABE Stack's database approach is more production-ready. Keep Drizzle ORM but:
- Simplify migration workflow
- Consider SQLite for development (like chet-stack suggests)

---

## 10. Summary: Path to Purity

### What ABE Stack Does Well
1. ✅ Type-safe API contracts (ts-rest)
2. ✅ Production-ready database (Drizzle + Postgres)
3. ✅ Multi-platform support (web, desktop, mobile)
4. ✅ Comprehensive testing setup
5. ✅ Build caching (Turborepo)

### What Chet Stack Does Better (Purity)
1. ✨ **Single environment object** for dependency injection
2. ✨ **Single schema file** as source of truth
3. ✨ **Auto-indexed APIs** - just create a file
4. ✨ **Built-in real-time** (PubSub)
5. ✨ **Built-in offline** (IndexedDB + TransactionQueue)
6. ✨ **Simpler auth** (cookie sessions)
7. ✨ **Flat structure** - easy to understand
8. ✨ **Minimal dependencies** - you understand every line

### Recommended Changes for ABE Stack

#### Priority 1: Architectural Purity
1. **Create unified Environment pattern**
   - `ClientEnvironment` and `ServerEnvironment` types
   - Pass environment through functions, not decorators

2. **Consolidate schemas**
   - Single `shared/schema.ts` for all data types
   - Generate Drizzle/Zod from one source

3. **Simplify package structure**
   - Consider merging `shared`, `api-client` into one
   - Consider merging `db`, `storage` into one

#### Priority 2: Missing Features
4. **Add PubSub infrastructure**
   - WebSocket server for real-time updates
   - Client subscription management

5. **Add offline support**
   - IndexedDB persistence layer
   - Transaction queue with retry logic
   - Service worker for assets

#### Priority 3: Simplification
6. **Simplify authentication**
   - Consider cookie-based sessions
   - Remove JWT complexity if not needed

7. **Reduce build complexity**
   - Fewer config files
   - Consider single tsconfig

---

## Appendix: Feature Comparison Matrix

| Feature | Chet Stack | ABE Stack |
|---------|------------|-----------|
| **Structure** | | |
| Monorepo | ❌ Single package | ✅ 11 packages |
| Build Tool | esbuild/estrella | Vite + Turborepo |
| Package Manager | npm | pnpm |
| **Frontend** | | |
| Framework | React 18 | React 19 |
| Router | Custom | React Router 7 |
| State (Server) | Custom RecordCache | React Query |
| State (Client) | Custom | Zustand |
| Offline | ✅ IndexedDB | ❌ None |
| Real-time | ✅ WebSocket PubSub | ❌ None |
| **Backend** | | |
| Framework | Express | Fastify |
| Database | JSON file → SQLite | PostgreSQL + Drizzle |
| Auth | Cookie sessions | JWT + Refresh tokens |
| File Storage | ✅ FileServer | ✅ Storage package |
| Background Jobs | ✅ QueueServer | ❌ None |
| **DevEx** | | |
| Type Safety | Manual | ts-rest + Zod |
| API Discovery | Auto-indexed | Manual |
| Testing | Mocha + Playwright | Vitest + Playwright |
| Hot Reload | livereload | Vite HMR |
| **Philosophy** | | |
| Abstraction Level | Low (understand everything) | High (productivity) |
| Dependency Count | ~30 | ~150+ |
| Framework Lock-in | None | Moderate |
