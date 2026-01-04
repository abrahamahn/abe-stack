# ABE-Stack → Pure Architecture Transformation

## Vision

Transform ABE-stack from a complex monorepo into a **pure, minimal, powerful** architecture inspired by chet-stack while preserving ABE-stack's production-ready strengths (TypeScript, Drizzle ORM, multi-platform).

### Design Principles

1. **Understand every line** - No magic, explicit over implicit
2. **Single source of truth** - One schema, one environment, one way to do things
3. **Offline-first** - Works without network, syncs when available
4. **Real-time by default** - Changes propagate instantly via PubSub
5. **Minimal dependencies** - Only what's truly needed

---

## Phase Overview

```
Phase 1: Simplify Structure (Week 1)
    ├── 1.1 Merge packages
    ├── 1.2 Consolidate schemas
    └── 1.3 Reduce config files

Phase 2: Environment Pattern (Week 1-2)
    ├── 2.1 ServerEnvironment
    └── 2.2 ClientEnvironment

Phase 3: Cookie Sessions (Week 2)
    ├── 3.1 Replace JWT with cookies
    └── 3.2 Simplify auth flow

Phase 4: WebSocket PubSub (Week 2-3)
    ├── 4.1 Server PubSub
    └── 4.2 Client PubSub

Phase 5: Offline Support (Week 3-4)
    ├── 5.1 RecordCache
    ├── 5.2 RecordStorage (IndexedDB)
    ├── 5.3 TransactionQueue
    └── 5.4 Service Worker

Phase 6: Additional Features (Week 4+)
    ├── 6.1 Undo/Redo
    ├── 6.2 Background Job Queue
    └── 6.3 Auto-indexed APIs (optional)
```

---

# Phase 1: Simplify Structure

## 1.1 Merge Packages

### Current State (11 packages)
```
packages/
├── shared/        → Keep (expand as core)
├── ui/            → Keep (design system)
├── db/            → Merge into shared
├── api-client/    → Merge into shared
├── storage/       → Merge into shared
└── create-abe-app → Keep separate
```

### Target State (3 packages)
```
packages/
├── core/          → shared + db + api-client + storage (NEW)
├── ui/            → Keep as-is
└── create-abe-app → Keep as-is
```

### Tasks

- [ ] **1.1.1** Create `packages/core/` directory structure
  ```
  packages/core/
  ├── src/
  │   ├── schema.ts           # THE source of truth
  │   ├── env.ts              # Environment validation
  │   ├── contracts/          # API contracts (from shared)
  │   ├── db/                 # Database (from db package)
  │   │   ├── client.ts
  │   │   ├── schema.ts       # Generated from core schema.ts
  │   │   └── migrations/
  │   ├── storage/            # Storage (from storage package)
  │   │   ├── factory.ts
  │   │   ├── local.ts
  │   │   └── s3.ts
  │   ├── api/                # API client (from api-client)
  │   │   ├── client.ts
  │   │   └── react-query.ts
  │   ├── services/           # Shared services (NEW)
  │   │   ├── ServerEnvironment.ts
  │   │   └── ClientEnvironment.ts
  │   └── utils/              # Utilities
  │       ├── token.ts
  │       ├── dates.ts
  │       └── ids.ts
  ├── package.json
  └── tsconfig.json
  ```

- [ ] **1.1.2** Move `packages/db/` contents to `packages/core/src/db/`
- [ ] **1.1.3** Move `packages/storage/` contents to `packages/core/src/storage/`
- [ ] **1.1.4** Move `packages/api-client/` contents to `packages/core/src/api/`
- [ ] **1.1.5** Move `packages/shared/` contents to `packages/core/src/`
- [ ] **1.1.6** Update all imports in `apps/web`, `apps/server`, `apps/desktop`, `apps/mobile`
- [ ] **1.1.7** Delete old packages: `packages/db`, `packages/storage`, `packages/api-client`, `packages/shared`
- [ ] **1.1.8** Update `pnpm-workspace.yaml`
- [ ] **1.1.9** Update root `package.json` scripts
- [ ] **1.1.10** Run build and fix any issues

---

## 1.2 Consolidate Schemas

### Current State (Scattered)
```
packages/db/src/schema/users.ts          # Drizzle schema
packages/shared/src/contracts/index.ts   # Zod schemas in contracts
packages/shared/src/env.ts               # Env validation
```

### Target State (Single Source)
```
packages/core/src/schema.ts              # THE source of truth
```

### Tasks

- [ ] **1.2.1** Create unified `packages/core/src/schema.ts`
  ```typescript
  // packages/core/src/schema.ts
  import { z } from 'zod'

  // =============================================================
  // CORE SCHEMA - Single Source of Truth
  // =============================================================
  // All records MUST have: id, version, createdAt
  // This enables: real-time sync, offline, undo/redo
  // =============================================================

  // Base record (all records extend this)
  export const BaseRecordSchema = z.object({
    id: z.string(),
    version: z.number().default(1),
    createdAt: z.date().default(() => new Date()),
    updatedAt: z.date().default(() => new Date()),
  })

  // User
  export const UserSchema = BaseRecordSchema.extend({
    email: z.string().email(),
    name: z.string().optional(),
    role: z.enum(['user', 'admin', 'moderator']).default('user'),
  })
  export type User = z.infer<typeof UserSchema>

  // Password (separate for security)
  export const PasswordSchema = z.object({
    id: z.string(),
    userId: z.string(),
    hash: z.string(),
  })
  export type Password = z.infer<typeof PasswordSchema>

  // Session (cookie-based auth)
  export const SessionSchema = BaseRecordSchema.extend({
    userId: z.string(),
    token: z.string(),
    expiresAt: z.date(),
  })
  export type Session = z.infer<typeof SessionSchema>

  // =============================================================
  // TABLE MAPPING (for type-safe access)
  // =============================================================
  export const Tables = {
    user: UserSchema,
    password: PasswordSchema,
    session: SessionSchema,
  } as const

  export type TableName = keyof typeof Tables
  export type TableToRecord = {
    user: User
    password: Password
    session: Session
  }
  export type RecordValue<T extends TableName> = TableToRecord[T]

  // =============================================================
  // RECORD MAP (for caching, sync)
  // =============================================================
  export type RecordMap = {
    [T in TableName]?: {
      [id: string]: RecordValue<T>
    }
  }

  export type VersionMap = {
    [T in TableName]?: {
      [id: string]: number
    }
  }

  // =============================================================
  // VALIDATION
  // =============================================================
  export function validateRecord<T extends TableName>(
    table: T,
    record: unknown
  ): RecordValue<T> {
    return Tables[table].parse(record) as RecordValue<T>
  }
  ```

- [ ] **1.2.2** Create Drizzle schema generator from core schema
  ```typescript
  // packages/core/src/db/schema.ts
  // Auto-generate from core schema.ts
  import { pgTable, text, timestamp, integer } from 'drizzle-orm/pg-core'
  import type { User, Password, Session } from '../schema'

  export const users = pgTable('users', {
    id: text('id').primaryKey(),
    version: integer('version').notNull().default(1),
    email: text('email').notNull().unique(),
    name: text('name'),
    role: text('role').notNull().default('user'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  })

  export const passwords = pgTable('passwords', {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id),
    hash: text('hash').notNull(),
  })

  export const sessions = pgTable('sessions', {
    id: text('id').primaryKey(),
    version: integer('version').notNull().default(1),
    userId: text('user_id').notNull().references(() => users.id),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  })
  ```

- [ ] **1.2.3** Update API contracts to use core schemas
- [ ] **1.2.4** Remove duplicate schema definitions
- [ ] **1.2.5** Run type check across all packages

---

## 1.3 Reduce Config Files

### Current State
```
config/
├── build/vite.config.ts
├── docker/docker-compose.yml
├── playwright/playwright.config.ts
└── vitest/vitest.config.ts
tsconfig.json (root)
apps/web/tsconfig.json
apps/server/tsconfig.json
packages/*/tsconfig.json (x6)
```

### Target State
```
config/
├── docker-compose.yml        # Keep (necessary)
├── vite.config.ts            # Simplified
├── vitest.config.ts          # Simplified
└── playwright.config.ts      # Simplified
tsconfig.json                 # Single root config
tsconfig.app.json             # Extends root (for apps)
tsconfig.package.json         # Extends root (for packages)
```

### Tasks

- [ ] **1.3.1** Create single root `tsconfig.json` with all paths
- [ ] **1.3.2** Create `tsconfig.app.json` that extends root
- [ ] **1.3.3** Create `tsconfig.package.json` that extends root
- [ ] **1.3.4** Update app tsconfigs to extend `tsconfig.app.json`
- [ ] **1.3.5** Update package tsconfigs to extend `tsconfig.package.json`
- [ ] **1.3.6** Move and simplify vite config
- [ ] **1.3.7** Move and simplify vitest config
- [ ] **1.3.8** Remove redundant configs
- [ ] **1.3.9** Verify builds still work

---

# Phase 2: Environment Pattern

## 2.1 ServerEnvironment

### Target
```typescript
// Single object containing all server dependencies
// Passed explicitly to every function (no magic)

export type ServerEnvironment = {
  config: ServerConfig
  db: DatabaseClient
  storage: StorageProvider
  pubsub: PubsubServer
  queue: QueueServer
}
```

### Tasks

- [ ] **2.1.1** Create `packages/core/src/services/ServerEnvironment.ts`
  ```typescript
  import type { DatabaseClient } from '../db/client'
  import type { StorageProvider } from '../storage/factory'

  export type ServerConfig = {
    port: number
    host: string
    cookieSecret: string
    sessionMaxAge: number // 7 days default
    env: 'development' | 'production' | 'test'
  }

  export type ServerEnvironment = {
    config: ServerConfig
    db: DatabaseClient
    storage: StorageProvider
    pubsub: PubsubServer | null  // null until Phase 4
    queue: QueueServer | null    // null until Phase 6
  }

  export function createServerEnvironment(
    config: ServerConfig,
    db: DatabaseClient,
    storage: StorageProvider
  ): ServerEnvironment {
    return {
      config,
      db,
      storage,
      pubsub: null,
      queue: null,
    }
  }
  ```

- [ ] **2.1.2** Refactor `apps/server/src/server.ts` to use environment
  ```typescript
  import http from 'http'
  import Fastify from 'fastify'
  import { createServerEnvironment } from '@abe/core'

  export async function createServer() {
    const app = Fastify({ logger: true })

    // Create environment
    const env = createServerEnvironment(config, db, storage)

    // Decorate with environment (single decoration)
    app.decorate('env', env)

    // Wrap with http for WebSocket support (Phase 4)
    const server = http.createServer(app.server)

    return { app, server, env }
  }
  ```

- [ ] **2.1.3** Update all route handlers to use `request.server.env`
- [ ] **2.1.4** Remove individual Fastify decorations (`db`, `storage`)
- [ ] **2.1.5** Add TypeScript declaration for Fastify
  ```typescript
  // apps/server/src/types/fastify.d.ts
  import type { ServerEnvironment } from '@abe/core'

  declare module 'fastify' {
    interface FastifyInstance {
      env: ServerEnvironment
    }
  }
  ```

---

## 2.2 ClientEnvironment

### Target
```typescript
// Single object containing all client dependencies
// Accessed via React context (single provider)

export type ClientEnvironment = {
  config: ClientConfig
  api: ApiClient
  router: Router
  auth: AuthState
  recordCache: RecordCache       // Phase 5
  recordStorage: RecordStorage   // Phase 5
  transactionQueue: TransactionQueue  // Phase 5
  subscriptionCache: SubscriptionCache // Phase 4
  pubsub: PubsubClient           // Phase 4
  undoRedo: UndoRedoStack        // Phase 6
}
```

### Tasks

- [ ] **2.2.1** Create `packages/core/src/services/ClientEnvironment.ts`
  ```typescript
  export type ClientConfig = {
    apiUrl: string
    wsUrl: string
    env: 'development' | 'production' | 'test'
  }

  export type ClientEnvironment = {
    config: ClientConfig
    api: ApiClient
    router: Router | null  // null if using React Router
    auth: AuthState
    // These are null until implemented in later phases
    recordCache: RecordCache | null
    recordStorage: RecordStorage | null
    transactionQueue: TransactionQueue | null
    subscriptionCache: SubscriptionCache | null
    pubsub: PubsubClient | null
    undoRedo: UndoRedoStack | null
  }
  ```

- [ ] **2.2.2** Create `EnvironmentProvider` React component
  ```typescript
  // packages/core/src/react/EnvironmentProvider.tsx
  import { createContext, useContext } from 'react'
  import type { ClientEnvironment } from '../services/ClientEnvironment'

  const EnvironmentContext = createContext<ClientEnvironment | null>(null)

  export function EnvironmentProvider({
    environment,
    children,
  }: {
    environment: ClientEnvironment
    children: React.ReactNode
  }) {
    return (
      <EnvironmentContext.Provider value={environment}>
        {children}
      </EnvironmentContext.Provider>
    )
  }

  export function useEnvironment(): ClientEnvironment {
    const env = useContext(EnvironmentContext)
    if (!env) throw new Error('useEnvironment must be used within EnvironmentProvider')
    return env
  }
  ```

- [ ] **2.2.3** Refactor `apps/web/src/app/providers.tsx`
  ```typescript
  // BEFORE: Multiple nested providers
  <QueryClientProvider>
    <AuthProvider>
      <ApiProvider>
        <HistoryProvider>
          {children}
        </HistoryProvider>
      </ApiProvider>
    </AuthProvider>
  </QueryClientProvider>

  // AFTER: Single environment provider
  <QueryClientProvider client={queryClient}>
    <EnvironmentProvider environment={environment}>
      {children}
    </EnvironmentProvider>
  </QueryClientProvider>
  ```

- [ ] **2.2.4** Update components to use `useEnvironment()` hook
- [ ] **2.2.5** Remove old providers (`AuthProvider`, `ApiProvider`, `HistoryProvider`)
- [ ] **2.2.6** Expose environment on window for debugging
  ```typescript
  if (typeof window !== 'undefined') {
    (window as any).env = environment
  }
  ```

---

# Phase 3: Cookie Sessions

## 3.1 Replace JWT with Cookie Sessions

### Current State (Complex)
```
Login → JWT access token (15 min, in memory)
      → Refresh token (7 days, HTTP-only cookie)
      → Auto-refresh every 13 minutes
      → Token rotation on refresh
```

### Target State (Simple)
```
Login → Session token (HTTP-only cookie)
      → Server validates on each request
      → Revocable (just delete from DB)
```

### Tasks

- [ ] **3.1.1** Add sessions table to schema (done in 1.2.1)

- [ ] **3.1.2** Create session service
  ```typescript
  // packages/core/src/services/session.ts
  import { nanoid } from 'nanoid'
  import type { ServerEnvironment } from './ServerEnvironment'

  const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days

  export async function createSession(
    env: ServerEnvironment,
    userId: string
  ): Promise<string> {
    const token = nanoid(32)
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE)

    await env.db.insert(sessions).values({
      id: nanoid(),
      userId,
      token,
      expiresAt,
    })

    return token
  }

  export async function validateSession(
    env: ServerEnvironment,
    token: string
  ): Promise<{ userId: string } | null> {
    const session = await env.db.query.sessions.findFirst({
      where: (s, { eq, gt, and }) => and(
        eq(s.token, token),
        gt(s.expiresAt, new Date())
      ),
    })

    if (!session) return null
    return { userId: session.userId }
  }

  export async function deleteSession(
    env: ServerEnvironment,
    token: string
  ): Promise<void> {
    await env.db.delete(sessions).where(eq(sessions.token, token))
  }

  export async function deleteUserSessions(
    env: ServerEnvironment,
    userId: string
  ): Promise<void> {
    await env.db.delete(sessions).where(eq(sessions.userId, userId))
  }
  ```

- [ ] **3.1.3** Update login route
  ```typescript
  // apps/server/src/routes/auth.ts
  app.post('/api/auth/login', async (request, reply) => {
    const { email, password } = request.body
    const env = request.server.env

    const user = await env.db.query.users.findFirst({
      where: eq(users.email, email),
    })
    if (!user) return reply.status(401).send({ error: 'Invalid credentials' })

    const passwordRecord = await env.db.query.passwords.findFirst({
      where: eq(passwords.userId, user.id),
    })
    if (!passwordRecord) return reply.status(401).send({ error: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, passwordRecord.hash)
    if (!valid) return reply.status(401).send({ error: 'Invalid credentials' })

    const token = await createSession(env, user.id)

    reply.setCookie('session', token, {
      httpOnly: true,
      secure: env.config.env === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return { user: { id: user.id, email: user.email, name: user.name, role: user.role } }
  })
  ```

- [ ] **3.1.4** Create auth middleware
  ```typescript
  // apps/server/src/middleware/auth.ts
  export async function authenticate(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const token = request.cookies.session
    if (!token) {
      return reply.status(401).send({ error: 'Not authenticated' })
    }

    const session = await validateSession(request.server.env, token)
    if (!session) {
      reply.clearCookie('session')
      return reply.status(401).send({ error: 'Session expired' })
    }

    request.userId = session.userId
  }
  ```

- [ ] **3.1.5** Update logout route
  ```typescript
  app.post('/api/auth/logout', async (request, reply) => {
    const token = request.cookies.session
    if (token) {
      await deleteSession(request.server.env, token)
      reply.clearCookie('session')
    }
    return { success: true }
  })
  ```

- [ ] **3.1.6** Remove JWT-related code
  - Delete `apps/server/src/lib/jwt.ts`
  - Delete refresh token logic
  - Delete `refreshTokens` table
  - Remove token refresh interval from client

- [ ] **3.1.7** Update client auth
  ```typescript
  // No more token management needed!
  // Cookies are sent automatically with credentials: 'include'

  const api = createApiClient({
    baseUrl: config.apiUrl,
    credentials: 'include', // Sends cookies automatically
  })
  ```

- [ ] **3.1.8** Update client auth state
  ```typescript
  // packages/core/src/services/AuthState.ts
  export type AuthState = {
    user: User | null
    isLoading: boolean
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
    checkAuth: () => Promise<void>
  }
  ```

---

# Phase 4: WebSocket PubSub

## 4.1 Server PubSub

### Tasks

- [ ] **4.1.1** Install ws package
  ```bash
  pnpm add ws
  pnpm add -D @types/ws
  ```

- [ ] **4.1.2** Create PubSub types
  ```typescript
  // packages/core/src/pubsub/types.ts
  export type SubscriptionKey = string // Format: "table:id" e.g., "user:123"

  export type PubsubMessage =
    | { type: 'subscribe'; key: SubscriptionKey }
    | { type: 'unsubscribe'; key: SubscriptionKey }
    | { type: 'update'; key: SubscriptionKey; version: number }

  export function toSubscriptionKey(table: string, id: string): SubscriptionKey {
    return `${table}:${id}`
  }

  export function fromSubscriptionKey(key: SubscriptionKey): { table: string; id: string } {
    const [table, id] = key.split(':')
    return { table, id }
  }
  ```

- [ ] **4.1.3** Create PubsubServer
  ```typescript
  // packages/core/src/pubsub/PubsubServer.ts
  import { WebSocketServer, WebSocket } from 'ws'
  import type { Server } from 'http'
  import type { PubsubMessage, SubscriptionKey } from './types'

  export class PubsubServer {
    private wss: WebSocketServer
    private subscriptions: Map<WebSocket, Set<SubscriptionKey>> = new Map()
    private keyToClients: Map<SubscriptionKey, Set<WebSocket>> = new Map()

    constructor(server: Server) {
      this.wss = new WebSocketServer({ server })

      this.wss.on('connection', (ws) => {
        this.subscriptions.set(ws, new Set())

        ws.on('message', (data) => {
          try {
            const message: PubsubMessage = JSON.parse(data.toString())
            this.handleMessage(ws, message)
          } catch (e) {
            console.error('Invalid pubsub message:', e)
          }
        })

        ws.on('close', () => {
          this.handleDisconnect(ws)
        })
      })
    }

    private handleMessage(ws: WebSocket, message: PubsubMessage) {
      if (message.type === 'subscribe') {
        this.subscribe(ws, message.key)
      } else if (message.type === 'unsubscribe') {
        this.unsubscribe(ws, message.key)
      }
    }

    private subscribe(ws: WebSocket, key: SubscriptionKey) {
      this.subscriptions.get(ws)?.add(key)

      if (!this.keyToClients.has(key)) {
        this.keyToClients.set(key, new Set())
      }
      this.keyToClients.get(key)?.add(ws)
    }

    private unsubscribe(ws: WebSocket, key: SubscriptionKey) {
      this.subscriptions.get(ws)?.delete(key)
      this.keyToClients.get(key)?.delete(ws)
    }

    private handleDisconnect(ws: WebSocket) {
      const keys = this.subscriptions.get(ws)
      if (keys) {
        for (const key of keys) {
          this.keyToClients.get(key)?.delete(ws)
        }
      }
      this.subscriptions.delete(ws)
    }

    // Call this when a record is updated
    publish(key: SubscriptionKey, version: number) {
      const clients = this.keyToClients.get(key)
      if (!clients) return

      const message: PubsubMessage = { type: 'update', key, version }
      const data = JSON.stringify(message)

      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data)
        }
      }
    }

    // Publish to all clients subscribed to any of these keys
    publishMany(updates: Array<{ key: SubscriptionKey; version: number }>) {
      for (const { key, version } of updates) {
        this.publish(key, version)
      }
    }
  }
  ```

- [ ] **4.1.4** Integrate PubSub into server
  ```typescript
  // apps/server/src/server.ts
  import http from 'http'
  import { PubsubServer } from '@abe/core'

  export async function createServer() {
    const app = Fastify({ logger: true })

    // Create HTTP server wrapper for WebSocket
    const server = http.createServer(app.server)

    // Create PubSub
    const pubsub = new PubsubServer(server)

    // Create environment with pubsub
    const env = createServerEnvironment(config, db, storage)
    env.pubsub = pubsub

    app.decorate('env', env)

    // Use server.listen instead of app.listen
    server.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`)
    })

    return { app, server, env }
  }
  ```

- [ ] **4.1.5** Publish updates on writes
  ```typescript
  // In your write/update routes
  app.post('/api/users/:id', async (request, reply) => {
    const { id } = request.params
    const env = request.server.env

    // Update in database
    const [updated] = await env.db.update(users)
      .set({ ...request.body, version: sql`version + 1` })
      .where(eq(users.id, id))
      .returning()

    // Publish update via PubSub
    env.pubsub?.publish(`user:${id}`, updated.version)

    return updated
  })
  ```

---

## 4.2 Client PubSub

### Tasks

- [ ] **4.2.1** Create PubsubClient
  ```typescript
  // packages/core/src/pubsub/PubsubClient.ts
  import type { PubsubMessage, SubscriptionKey } from './types'

  type UpdateHandler = (key: SubscriptionKey, version: number) => void

  export class PubsubClient {
    private ws: WebSocket | null = null
    private url: string
    private subscriptions: Set<SubscriptionKey> = new Set()
    private handlers: Set<UpdateHandler> = new Set()
    private reconnectTimer: number | null = null
    private reconnectDelay = 1000

    constructor(url: string) {
      this.url = url
      this.connect()

      // Reconnect when coming back online
      window.addEventListener('online', () => this.connect())
    }

    private connect() {
      if (this.ws?.readyState === WebSocket.OPEN) return

      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('PubSub connected')
        this.reconnectDelay = 1000

        // Resubscribe to all keys
        for (const key of this.subscriptions) {
          this.send({ type: 'subscribe', key })
        }
      }

      this.ws.onmessage = (event) => {
        const message: PubsubMessage = JSON.parse(event.data)
        if (message.type === 'update') {
          this.notifyHandlers(message.key, message.version)
        }
      }

      this.ws.onclose = () => {
        console.log('PubSub disconnected, reconnecting...')
        this.scheduleReconnect()
      }

      this.ws.onerror = (error) => {
        console.error('PubSub error:', error)
      }
    }

    private scheduleReconnect() {
      if (this.reconnectTimer) return

      this.reconnectTimer = window.setTimeout(() => {
        this.reconnectTimer = null
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000)
        this.connect()
      }, this.reconnectDelay)
    }

    private send(message: PubsubMessage) {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message))
      }
    }

    private notifyHandlers(key: SubscriptionKey, version: number) {
      for (const handler of this.handlers) {
        handler(key, version)
      }
    }

    subscribe(key: SubscriptionKey) {
      this.subscriptions.add(key)
      this.send({ type: 'subscribe', key })
    }

    unsubscribe(key: SubscriptionKey) {
      this.subscriptions.delete(key)
      this.send({ type: 'unsubscribe', key })
    }

    onUpdate(handler: UpdateHandler): () => void {
      this.handlers.add(handler)
      return () => this.handlers.delete(handler)
    }

    close() {
      this.ws?.close()
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer)
      }
    }
  }
  ```

- [ ] **4.2.2** Create SubscriptionCache
  ```typescript
  // packages/core/src/pubsub/SubscriptionCache.ts
  import type { SubscriptionKey } from './types'
  import type { PubsubClient } from './PubsubClient'

  // Reference-counted subscriptions with delayed cleanup
  export class SubscriptionCache {
    private refCounts: Map<SubscriptionKey, number> = new Map()
    private cleanupTimers: Map<SubscriptionKey, number> = new Map()
    private pubsub: PubsubClient
    private cleanupDelay = 10000 // 10 seconds

    constructor(pubsub: PubsubClient) {
      this.pubsub = pubsub
    }

    subscribe(key: SubscriptionKey) {
      // Cancel pending cleanup
      const timer = this.cleanupTimers.get(key)
      if (timer) {
        clearTimeout(timer)
        this.cleanupTimers.delete(key)
      }

      const count = this.refCounts.get(key) || 0
      this.refCounts.set(key, count + 1)

      if (count === 0) {
        this.pubsub.subscribe(key)
      }
    }

    unsubscribe(key: SubscriptionKey) {
      const count = this.refCounts.get(key) || 0
      if (count <= 1) {
        // Delay cleanup in case component remounts
        const timer = window.setTimeout(() => {
          this.refCounts.delete(key)
          this.cleanupTimers.delete(key)
          this.pubsub.unsubscribe(key)
        }, this.cleanupDelay)

        this.cleanupTimers.set(key, timer)
        this.refCounts.set(key, 0)
      } else {
        this.refCounts.set(key, count - 1)
      }
    }
  }
  ```

- [ ] **4.2.3** Create useSubscription hook
  ```typescript
  // packages/core/src/react/useSubscription.ts
  import { useEffect } from 'react'
  import { useQueryClient } from '@tanstack/react-query'
  import { useEnvironment } from './EnvironmentProvider'
  import { toSubscriptionKey } from '../pubsub/types'

  export function useSubscription(table: string, id: string) {
    const env = useEnvironment()
    const queryClient = useQueryClient()

    useEffect(() => {
      if (!env.subscriptionCache || !env.pubsub) return

      const key = toSubscriptionKey(table, id)

      // Subscribe
      env.subscriptionCache.subscribe(key)

      // Handle updates
      const unsubscribe = env.pubsub.onUpdate((updateKey, version) => {
        if (updateKey === key) {
          // Invalidate React Query cache
          queryClient.invalidateQueries({ queryKey: [table, id] })
        }
      })

      return () => {
        env.subscriptionCache?.unsubscribe(key)
        unsubscribe()
      }
    }, [table, id, env, queryClient])
  }
  ```

- [ ] **4.2.4** Integrate into ClientEnvironment
  ```typescript
  // In apps/web/src/main.tsx
  const pubsub = new PubsubClient(config.wsUrl)
  const subscriptionCache = new SubscriptionCache(pubsub)

  const environment: ClientEnvironment = {
    config,
    api,
    auth,
    pubsub,
    subscriptionCache,
    // ...
  }
  ```

---

# Phase 5: Offline Support

## 5.1 RecordCache (In-Memory)

### Tasks

- [ ] **5.1.1** Create RecordCache
  ```typescript
  // packages/core/src/cache/RecordCache.ts
  import type { TableName, RecordValue, RecordMap } from '../schema'

  type Listener = () => void

  export class RecordCache {
    private records: RecordMap = {}
    private listeners: Map<string, Set<Listener>> = new Map()

    get<T extends TableName>(table: T, id: string): RecordValue<T> | undefined {
      return this.records[table]?.[id] as RecordValue<T> | undefined
    }

    set<T extends TableName>(table: T, id: string, record: RecordValue<T>) {
      if (!this.records[table]) {
        this.records[table] = {}
      }

      const existing = this.records[table]![id]

      // Only update if version is higher
      if (existing && existing.version >= record.version) {
        return
      }

      this.records[table]![id] = record
      this.notify(`${table}:${id}`)
    }

    setMany(recordMap: RecordMap) {
      for (const [table, records] of Object.entries(recordMap)) {
        for (const [id, record] of Object.entries(records || {})) {
          this.set(table as TableName, id, record)
        }
      }
    }

    delete(table: TableName, id: string) {
      delete this.records[table]?.[id]
      this.notify(`${table}:${id}`)
    }

    subscribe(table: TableName, id: string, listener: Listener): () => void {
      const key = `${table}:${id}`
      if (!this.listeners.has(key)) {
        this.listeners.set(key, new Set())
      }
      this.listeners.get(key)!.add(listener)

      return () => {
        this.listeners.get(key)?.delete(listener)
      }
    }

    private notify(key: string) {
      const listeners = this.listeners.get(key)
      if (listeners) {
        for (const listener of listeners) {
          listener()
        }
      }
    }

    clear() {
      this.records = {}
      // Notify all listeners
      for (const listeners of this.listeners.values()) {
        for (const listener of listeners) {
          listener()
        }
      }
    }
  }
  ```

---

## 5.2 RecordStorage (IndexedDB)

### Tasks

- [ ] **5.2.1** Install idb package
  ```bash
  pnpm add idb
  ```

- [ ] **5.2.2** Create RecordStorage
  ```typescript
  // packages/core/src/cache/RecordStorage.ts
  import { openDB, type IDBPDatabase } from 'idb'
  import type { TableName, RecordValue, RecordMap } from '../schema'

  const DB_NAME = 'abe-stack-records'
  const DB_VERSION = 1

  export class RecordStorage {
    private db: IDBPDatabase | null = null
    private initPromise: Promise<void>

    constructor() {
      this.initPromise = this.init()
    }

    private async init() {
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Create a store for each table
          if (!db.objectStoreNames.contains('records')) {
            db.createObjectStore('records')
          }
        },
      })
    }

    private async ready() {
      await this.initPromise
      if (!this.db) throw new Error('RecordStorage not initialized')
      return this.db
    }

    private key(table: TableName, id: string): string {
      return `${table}:${id}`
    }

    async get<T extends TableName>(table: T, id: string): Promise<RecordValue<T> | undefined> {
      const db = await this.ready()
      return db.get('records', this.key(table, id))
    }

    async set<T extends TableName>(table: T, id: string, record: RecordValue<T>) {
      const db = await this.ready()

      // Only store if version is higher
      const existing = await this.get(table, id)
      if (existing && existing.version >= record.version) {
        return
      }

      await db.put('records', record, this.key(table, id))
    }

    async setMany(recordMap: RecordMap) {
      const db = await this.ready()
      const tx = db.transaction('records', 'readwrite')

      for (const [table, records] of Object.entries(recordMap)) {
        for (const [id, record] of Object.entries(records || {})) {
          const key = this.key(table as TableName, id)
          const existing = await tx.store.get(key)
          if (!existing || existing.version < record.version) {
            await tx.store.put(record, key)
          }
        }
      }

      await tx.done
    }

    async delete(table: TableName, id: string) {
      const db = await this.ready()
      await db.delete('records', this.key(table, id))
    }

    async clear() {
      const db = await this.ready()
      await db.clear('records')
    }
  }
  ```

---

## 5.3 TransactionQueue

### Tasks

- [ ] **5.3.1** Create Transaction types
  ```typescript
  // packages/core/src/cache/Transaction.ts
  import type { TableName, RecordValue } from '../schema'

  export type Operation =
    | { type: 'set'; table: TableName; id: string; field: string; value: unknown }
    | { type: 'create'; table: TableName; id: string; record: RecordValue<TableName> }
    | { type: 'delete'; table: TableName; id: string }

  export type Transaction = {
    id: string
    operations: Operation[]
    createdAt: number
  }
  ```

- [ ] **5.3.2** Create TransactionQueue
  ```typescript
  // packages/core/src/cache/TransactionQueue.ts
  import { nanoid } from 'nanoid'
  import type { Transaction, Operation } from './Transaction'
  import type { ApiClient } from '../api/client'

  const STORAGE_KEY = 'abe-stack-transaction-queue'

  export class TransactionQueue {
    private queue: Transaction[] = []
    private processing = false
    private api: ApiClient
    private onError?: (error: Error, transaction: Transaction) => void

    constructor(api: ApiClient, onError?: (error: Error, transaction: Transaction) => void) {
      this.api = api
      this.onError = onError
      this.loadFromStorage()

      // Process queue when coming back online
      window.addEventListener('online', () => this.process())
    }

    private loadFromStorage() {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          this.queue = JSON.parse(stored)
        }
      } catch (e) {
        console.error('Failed to load transaction queue:', e)
      }
    }

    private saveToStorage() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue))
      } catch (e) {
        console.error('Failed to save transaction queue:', e)
      }
    }

    enqueue(operations: Operation[]): Transaction {
      const transaction: Transaction = {
        id: nanoid(),
        operations,
        createdAt: Date.now(),
      }

      this.queue.push(transaction)
      this.saveToStorage()
      this.process()

      return transaction
    }

    async process() {
      if (this.processing || this.queue.length === 0) return
      if (!navigator.onLine) return

      this.processing = true

      while (this.queue.length > 0) {
        const transaction = this.queue[0]

        try {
          await this.api.write({ operations: transaction.operations })

          // Success - remove from queue
          this.queue.shift()
          this.saveToStorage()
        } catch (error) {
          if (error instanceof Error) {
            // Check if it's a conflict error (needs retry with fresh data)
            if (error.message.includes('conflict')) {
              // Could implement rollback here
              this.onError?.(error, transaction)
            } else if (error.message.includes('network')) {
              // Network error - stop processing, will retry when online
              break
            } else {
              // Permanent error - remove and notify
              this.queue.shift()
              this.saveToStorage()
              this.onError?.(error, transaction)
            }
          }
        }
      }

      this.processing = false
    }

    get pending(): Transaction[] {
      return [...this.queue]
    }

    get hasPending(): boolean {
      return this.queue.length > 0
    }
  }
  ```

- [ ] **5.3.3** Create usePendingWrites hook
  ```typescript
  // packages/core/src/react/usePendingWrites.ts
  import { useSyncExternalStore } from 'react'
  import { useEnvironment } from './EnvironmentProvider'

  export function usePendingWrites(): boolean {
    const env = useEnvironment()

    return useSyncExternalStore(
      (callback) => {
        // Subscribe to queue changes
        const interval = setInterval(callback, 1000)
        return () => clearInterval(interval)
      },
      () => env.transactionQueue?.hasPending ?? false
    )
  }
  ```

---

## 5.4 Service Worker

### Tasks

- [ ] **5.4.1** Create service worker
  ```javascript
  // apps/web/public/service-worker.js
  const CACHE_NAME = 'abe-stack-v1'
  const STATIC_ASSETS = [
    '/',
    '/index.html',
  ]

  // Install - cache static assets
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS)
      })
    )
    self.skipWaiting()
  })

  // Activate - clean old caches
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches.keys().then((keys) => {
        return Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      })
    )
    self.clients.claim()
  })

  // Fetch - network first, fall back to cache
  self.addEventListener('fetch', (event) => {
    const { request } = event

    // Skip non-GET requests
    if (request.method !== 'GET') return

    // Skip API requests
    if (request.url.includes('/api/')) return

    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful responses
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, clone)
            })
          }
          return response
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(request).then((cached) => {
            if (cached) return cached

            // For navigation, return cached index.html (SPA)
            if (request.mode === 'navigate') {
              return caches.match('/')
            }

            return new Response('Offline', { status: 503 })
          })
        })
    )
  })
  ```

- [ ] **5.4.2** Register service worker
  ```typescript
  // apps/web/src/main.tsx
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('SW registered:', registration)
        })
        .catch((error) => {
          console.error('SW registration failed:', error)
        })
    })
  }
  ```

---

# Phase 6: Additional Features

## 6.1 Undo/Redo

### Tasks

- [ ] **6.1.1** Create operation inverters
  ```typescript
  // packages/core/src/cache/operations.ts
  import type { Operation } from './Transaction'
  import type { RecordMap } from '../schema'

  export function invertOperation(
    operation: Operation,
    currentRecords: RecordMap
  ): Operation {
    switch (operation.type) {
      case 'set': {
        const current = currentRecords[operation.table]?.[operation.id]
        const currentValue = current ? (current as any)[operation.field] : undefined
        return {
          type: 'set',
          table: operation.table,
          id: operation.id,
          field: operation.field,
          value: currentValue,
        }
      }
      case 'create': {
        return { type: 'delete', table: operation.table, id: operation.id }
      }
      case 'delete': {
        const current = currentRecords[operation.table]?.[operation.id]
        if (!current) throw new Error('Cannot invert delete: record not found')
        return { type: 'create', table: operation.table, id: operation.id, record: current }
      }
    }
  }
  ```

- [ ] **6.1.2** Create UndoRedoStack
  ```typescript
  // packages/core/src/cache/UndoRedoStack.ts
  import type { Operation } from './Transaction'

  type UndoItem = {
    operations: Operation[]      // What was done
    inverseOps: Operation[]      // How to undo it
  }

  export class UndoRedoStack {
    private undoStack: UndoItem[] = []
    private redoStack: UndoItem[] = []
    private maxSize = 100

    push(operations: Operation[], inverseOps: Operation[]) {
      this.undoStack.push({ operations, inverseOps })
      this.redoStack = [] // Clear redo on new action

      // Limit stack size
      if (this.undoStack.length > this.maxSize) {
        this.undoStack.shift()
      }
    }

    undo(): Operation[] | null {
      const item = this.undoStack.pop()
      if (!item) return null

      this.redoStack.push(item)
      return item.inverseOps
    }

    redo(): Operation[] | null {
      const item = this.redoStack.pop()
      if (!item) return null

      this.undoStack.push(item)
      return item.operations
    }

    get canUndo(): boolean {
      return this.undoStack.length > 0
    }

    get canRedo(): boolean {
      return this.redoStack.length > 0
    }

    clear() {
      this.undoStack = []
      this.redoStack = []
    }
  }
  ```

- [ ] **6.1.3** Create useUndoRedo hook
  ```typescript
  // packages/core/src/react/useUndoRedo.ts
  import { useCallback } from 'react'
  import { useEnvironment } from './EnvironmentProvider'

  export function useUndoRedo() {
    const env = useEnvironment()

    const undo = useCallback(() => {
      if (!env.undoRedo) return

      const ops = env.undoRedo.undo()
      if (ops) {
        env.transactionQueue?.enqueue(ops)
      }
    }, [env])

    const redo = useCallback(() => {
      if (!env.undoRedo) return

      const ops = env.undoRedo.redo()
      if (ops) {
        env.transactionQueue?.enqueue(ops)
      }
    }, [env])

    return {
      undo,
      redo,
      canUndo: env.undoRedo?.canUndo ?? false,
      canRedo: env.undoRedo?.canRedo ?? false,
    }
  }
  ```

- [ ] **6.1.4** Add keyboard shortcuts
  ```typescript
  // packages/core/src/react/useShortcut.ts
  import { useEffect } from 'react'

  export function useShortcut(
    key: string, // e.g., 'cmd+z', 'ctrl+shift+z'
    handler: () => void
  ) {
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        const parts = key.toLowerCase().split('+')
        const mainKey = parts.pop()!

        const needsCmd = parts.includes('cmd') || parts.includes('meta')
        const needsCtrl = parts.includes('ctrl')
        const needsShift = parts.includes('shift')
        const needsAlt = parts.includes('alt')

        const matchesMod =
          (needsCmd ? e.metaKey : !e.metaKey) &&
          (needsCtrl ? e.ctrlKey : !e.ctrlKey) &&
          (needsShift ? e.shiftKey : !e.shiftKey) &&
          (needsAlt ? e.altKey : !e.altKey)

        if (matchesMod && e.key.toLowerCase() === mainKey) {
          e.preventDefault()
          handler()
        }
      }

      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }, [key, handler])
  }
  ```

---

## 6.2 Background Job Queue

### Tasks

- [ ] **6.2.1** Create job queue tables
  ```typescript
  // Add to schema.ts
  export const JobSchema = BaseRecordSchema.extend({
    type: z.string(),
    payload: z.record(z.unknown()),
    status: z.enum(['pending', 'processing', 'completed', 'failed']).default('pending'),
    attempts: z.number().default(0),
    maxAttempts: z.number().default(3),
    runAt: z.date().default(() => new Date()),
    error: z.string().optional(),
  })
  export type Job = z.infer<typeof JobSchema>
  ```

- [ ] **6.2.2** Create QueueServer
  ```typescript
  // packages/core/src/queue/QueueServer.ts
  import type { ServerEnvironment } from '../services/ServerEnvironment'
  import type { Job } from '../schema'

  type TaskHandler = (env: ServerEnvironment, payload: Record<string, unknown>) => Promise<void>

  export class QueueServer {
    private handlers: Map<string, TaskHandler> = new Map()
    private running = false
    private pollInterval = 1000

    constructor(private env: ServerEnvironment) {}

    register(type: string, handler: TaskHandler) {
      this.handlers.set(type, handler)
    }

    async start() {
      this.running = true
      this.poll()
    }

    stop() {
      this.running = false
    }

    private async poll() {
      while (this.running) {
        try {
          await this.processNext()
        } catch (e) {
          console.error('Queue error:', e)
        }
        await sleep(this.pollInterval)
      }
    }

    private async processNext() {
      // Get next pending job
      const job = await this.env.db.query.jobs.findFirst({
        where: (j, { eq, lte, and }) => and(
          eq(j.status, 'pending'),
          lte(j.runAt, new Date())
        ),
        orderBy: (j, { asc }) => asc(j.runAt),
      })

      if (!job) return

      // Mark as processing
      await this.env.db.update(jobs)
        .set({ status: 'processing', attempts: job.attempts + 1 })
        .where(eq(jobs.id, job.id))

      const handler = this.handlers.get(job.type)
      if (!handler) {
        await this.markFailed(job, `Unknown job type: ${job.type}`)
        return
      }

      try {
        await handler(this.env, job.payload)
        await this.markCompleted(job)
      } catch (e) {
        if (job.attempts + 1 >= job.maxAttempts) {
          await this.markFailed(job, String(e))
        } else {
          await this.markPending(job) // Retry later
        }
      }
    }

    private async markCompleted(job: Job) {
      await this.env.db.update(jobs)
        .set({ status: 'completed' })
        .where(eq(jobs.id, job.id))
    }

    private async markFailed(job: Job, error: string) {
      await this.env.db.update(jobs)
        .set({ status: 'failed', error })
        .where(eq(jobs.id, job.id))
    }

    private async markPending(job: Job) {
      // Exponential backoff
      const delay = Math.pow(2, job.attempts) * 1000
      await this.env.db.update(jobs)
        .set({
          status: 'pending',
          runAt: new Date(Date.now() + delay)
        })
        .where(eq(jobs.id, job.id))
    }
  }
  ```

- [ ] **6.2.3** Create helper to enqueue jobs
  ```typescript
  // packages/core/src/queue/enqueue.ts
  export async function enqueueJob(
    env: ServerEnvironment,
    type: string,
    payload: Record<string, unknown>,
    options?: { runAt?: Date; maxAttempts?: number }
  ) {
    await env.db.insert(jobs).values({
      id: nanoid(),
      type,
      payload,
      runAt: options?.runAt ?? new Date(),
      maxAttempts: options?.maxAttempts ?? 3,
    })
  }
  ```

- [ ] **6.2.4** Register job handlers
  ```typescript
  // apps/server/src/jobs/index.ts
  import { sendEmail } from './sendEmail'
  import { processImage } from './processImage'

  export function registerJobs(queue: QueueServer) {
    queue.register('send-email', sendEmail)
    queue.register('process-image', processImage)
  }
  ```

---

## 6.3 Auto-Indexed APIs (Optional)

### Tasks

- [ ] **6.3.1** Research autoindex package or build simple version
- [ ] **6.3.2** Create API file structure
  ```
  apps/server/src/apis/
  ├── login.ts
  ├── logout.ts
  ├── signup.ts
  ├── getUser.ts
  └── write.ts
  ```

- [ ] **6.3.3** Create API loader
  ```typescript
  // apps/server/src/apis/loader.ts
  import type { FastifyInstance } from 'fastify'
  import * as apis from './index' // Auto-generated index

  export function registerApis(app: FastifyInstance) {
    for (const [name, handler] of Object.entries(apis)) {
      app.post(`/api/${name}`, async (request, reply) => {
        const result = await handler(request.server.env, request.body)
        return result
      })
    }
  }
  ```

---

# Testing Checklist

## After Each Phase

- [ ] All existing tests pass
- [ ] TypeScript compiles without errors
- [ ] App runs in development mode
- [ ] App builds for production
- [ ] Manual smoke test of core features

## Phase-Specific Tests

### Phase 1 Tests
- [ ] Imports resolve correctly after package merge
- [ ] Schema types are consistent across packages

### Phase 2 Tests
- [ ] ServerEnvironment is accessible in all routes
- [ ] ClientEnvironment is accessible via hook

### Phase 3 Tests
- [ ] Login sets cookie
- [ ] Logout clears cookie
- [ ] Protected routes check cookie
- [ ] Session expires correctly

### Phase 4 Tests
- [ ] WebSocket connects
- [ ] Subscribe/unsubscribe works
- [ ] Updates propagate to subscribers
- [ ] Reconnection works

### Phase 5 Tests
- [ ] Records cache in memory
- [ ] Records persist to IndexedDB
- [ ] Offline changes queue
- [ ] Queue processes when online
- [ ] Service worker caches assets

### Phase 6 Tests
- [ ] Undo/redo works
- [ ] Jobs process correctly
- [ ] Failed jobs retry

---

# Migration Guide

## For Existing Code

### Import Changes
```typescript
// BEFORE
import { apiContract } from '@abe-stack/shared'
import { db } from '@abe-stack/db'
import { createStorage } from '@abe-stack/storage'
import { createApiClient } from '@abe-stack/api-client'

// AFTER
import { apiContract, db, createStorage, createApiClient } from '@abe/core'
```

### Auth Changes
```typescript
// BEFORE (JWT)
const token = localStorage.getItem('token')
headers: { Authorization: `Bearer ${token}` }

// AFTER (Cookies)
credentials: 'include' // That's it!
```

### Environment Access
```typescript
// BEFORE (Server)
request.server.db
request.server.storage

// AFTER (Server)
request.server.env.db
request.server.env.storage
```

```typescript
// BEFORE (Client)
useAuth()
useApi()

// AFTER (Client)
const env = useEnvironment()
env.auth
env.api
```

---

# Dependencies to Add

```bash
# Phase 4 - WebSocket
pnpm add ws
pnpm add -D @types/ws

# Phase 5 - IndexedDB
pnpm add idb

# Phase 6 - Utilities (if not already present)
pnpm add nanoid
```

# Dependencies to Remove (After Migration)

```bash
# After Phase 3 - Remove JWT
pnpm remove jsonwebtoken @types/jsonwebtoken
```

---

# Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1 | 3-5 days | None |
| Phase 2 | 2-3 days | Phase 1 |
| Phase 3 | 2-3 days | Phase 2 |
| Phase 4 | 3-5 days | Phase 2 |
| Phase 5 | 5-7 days | Phase 4 |
| Phase 6 | 3-5 days | Phase 5 |

**Total: 3-4 weeks**

---

# Success Metrics

After completing all phases:

- [ ] **Simplicity**: Single `@abe/core` package for all shared code
- [ ] **Purity**: Explicit environment objects, no magic
- [ ] **Type Safety**: End-to-end types preserved
- [ ] **Offline**: App works without network
- [ ] **Real-time**: Changes sync instantly
- [ ] **Undo/Redo**: User can undo actions
- [ ] **Production Ready**: Drizzle + PostgreSQL preserved
- [ ] **Multi-platform**: Web, desktop, mobile still supported
