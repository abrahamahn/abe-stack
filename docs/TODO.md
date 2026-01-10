# ABE-Stack Master TODO

This document contains three parts:
- **Part A**: Single Entry Point Configuration (immediate priority)
- **Part B**: Pure Architecture Transformation (adopting chet-stack patterns)
- **Part C**: Boilerplate Delivery Plan (production readiness checklist)

---

# Part A: Single Entry Point Configuration

## Overview

The goal is to transform abe-stack from a scattered, multi-package architecture into a **single entry point** pattern like chet-stack. This makes the codebase easier to understand, debug, and maintain.

### Current State (Complex)

```
apps/server/
├── src/index.ts           # Entry point - loads env, creates server
├── src/server.ts          # Creates Fastify, decorates db/storage separately
├── src/routes/index.ts    # Routes with ts-rest
└── src/lib/*.ts           # Scattered utilities

apps/web/
├── src/main.tsx           # Entry point - just renders <App/>
├── src/app/root.tsx       # Routes and providers
├── src/app/providers.tsx  # 4 nested providers (Query, Auth, Api, History)
└── src/providers/*.tsx    # More scattered providers

packages/ (11 packages!)
├── shared/               # env, contracts, utils
├── db/                   # drizzle client, schema
├── api-client/           # fetch wrapper
├── storage/              # file storage
├── ui/                   # components
└── ...
```

### Target State (Simple - like chet-stack)

```
apps/server/
├── src/index.ts           # Entry point - creates ServerEnvironment, starts
└── src/api/*.ts           # API handlers (receive env explicitly)

apps/web/
├── src/main.tsx           # Entry point - creates ClientEnvironment, renders
└── src/app/*.tsx          # Components (access env via single hook)

packages/core/             # Single package for all shared code
├── src/schema.ts          # THE source of truth
├── src/server/
│   └── ServerEnvironment.ts
├── src/client/
│   └── ClientEnvironment.ts
└── src/shared/            # Contracts, utils, types
```

---

## A.1 ServerEnvironment Pattern

### What chet-stack does:

```typescript
// chet-stack: Single environment object passed everywhere
const environment: ServerEnvironment = { config, db, queue, pubsub }

// Every API handler receives it explicitly
export function handleLogin(env: ServerEnvironment, body: LoginRequest) {
  const user = await env.db.query.users.findFirst(...)
  await env.pubsub.publish('user:login', user.id)
  return { success: true }
}
```

### How to transform abe-stack:

**Step 1: Create ServerEnvironment type** (`packages/core/src/server/ServerEnvironment.ts`)

```typescript
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { StorageProvider } from '../storage'
import type * as schema from '../db/schema'

export type ServerConfig = {
  port: number
  host: string
  cookieSecret: string
  sessionMaxAge: number  // milliseconds
  env: 'development' | 'production' | 'test'
  corsOrigin: string | boolean
}

export type ServerEnvironment = {
  config: ServerConfig
  db: PostgresJsDatabase<typeof schema>
  storage: StorageProvider
  // Phase 4: pubsub: PubsubServer
  // Phase 6: queue: QueueServer
}

// Factory function - explicit, testable
export function createServerEnvironment(
  config: ServerConfig,
  db: PostgresJsDatabase<typeof schema>,
  storage: StorageProvider
): ServerEnvironment {
  return { config, db, storage }
}
```

**Step 2: Simplify server entry point** (`apps/server/src/index.ts`)

```typescript
// BEFORE (current): 110 lines, multiple concerns mixed
// AFTER (target): ~40 lines, single responsibility

import http from 'http'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import { createDbClient } from '@abe/core/db'
import { createStorage } from '@abe/core/storage'
import { createServerEnvironment, type ServerEnvironment } from '@abe/core/server'
import { loadServerEnv } from '@abe/core/env'
import { registerApi } from './api'

// Validate env at startup
const config = loadServerEnv(process.env)

// Create environment (single source of all dependencies)
const db = createDbClient(config.DATABASE_URL)
const storage = createStorage(config)
const env = createServerEnvironment(config, db, storage)

// Create Fastify app
const app = Fastify({ logger: true })

// Register minimal plugins
await app.register(cors, { origin: config.corsOrigin, credentials: true })
await app.register(cookie, { secret: config.cookieSecret })

// Single decoration - the environment
app.decorate('env', env)

// Register all API routes (passing env explicitly)
registerApi(app, env)

// Create HTTP server (needed for WebSocket in Phase 4)
const server = http.createServer(app.server)

// Start
server.listen(config.port, config.host, () => {
  app.log.info(`Server listening on http://${config.host}:${config.port}`)
})
```

**Step 3: Refactor API handlers** (`apps/server/src/api/auth.ts`)

```typescript
// BEFORE (current): Handlers access app.db, app.storage directly
async function handleLogin(app: FastifyInstance, body: LoginRequest, reply) {
  const user = await app.db.query.users.findFirst(...)
  // ...
}

// AFTER (target): Handlers receive environment explicitly
export function createAuthApi(env: ServerEnvironment) {
  return {
    async login(body: LoginRequest) {
      const user = await env.db.query.users.findFirst(...)
      // ...
    },
    async logout(sessionToken: string) {
      await env.db.delete(sessions).where(eq(sessions.token, sessionToken))
      // ...
    }
  }
}
```

### Tasks for ServerEnvironment

- [ ] **A.1.1** Create `packages/core/src/server/ServerEnvironment.ts`
- [ ] **A.1.2** Create `packages/core/src/server/index.ts` (exports)
- [ ] **A.1.3** Simplify `apps/server/src/index.ts` to ~40 lines
- [ ] **A.1.4** Create `apps/server/src/api/index.ts` (registers all routes)
- [ ] **A.1.5** Refactor `apps/server/src/routes/index.ts` → `apps/server/src/api/auth.ts`
- [ ] **A.1.6** Add TypeScript declaration for Fastify env decoration
- [ ] **A.1.7** Remove individual `app.decorate('db', ...)` and `app.decorate('storage', ...)`
- [ ] **A.1.8** Verify all routes work with new pattern

---

## A.2 ClientEnvironment Pattern

### What chet-stack does:

```typescript
// chet-stack: Single environment object with ALL client dependencies
const environment: ClientEnvironment = {
  config,
  router,
  api,
  recordCache,
  recordStorage,
  subscriptionCache,
  loaderCache,
  pubsub,
  transactionQueue,
  undoRedo,
}

// Single provider at app root
ReactDOM.render(
  <Container environment={environment} />,
  document.getElementById('root')
)

// Components access via single hook
function MyComponent() {
  const env = useEnvironment()
  await env.api.login(email, password)
  env.recordCache.set('user', user)
}
```

### How to transform abe-stack:

**Step 1: Create ClientEnvironment type** (`packages/core/src/client/ClientEnvironment.ts`)

```typescript
import type { ApiClient } from '../api/client'
import type { QueryClient } from '@tanstack/react-query'

export type ClientConfig = {
  apiUrl: string
  wsUrl: string  // Phase 4
  env: 'development' | 'production' | 'test'
}

export type AuthState = {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

export type ClientEnvironment = {
  config: ClientConfig
  api: ApiClient
  auth: AuthState
  queryClient: QueryClient
  // Phase 4:
  // pubsub: PubsubClient
  // subscriptionCache: SubscriptionCache
  // Phase 5:
  // recordCache: RecordCache
  // recordStorage: RecordStorage
  // transactionQueue: TransactionQueue
  // Phase 6:
  // undoRedo: UndoRedoStack
}
```

**Step 2: Create EnvironmentProvider** (`packages/core/src/client/EnvironmentProvider.tsx`)

```typescript
import { createContext, useContext, useMemo, useState, useCallback } from 'react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { createApiClient } from '../api/client'
import type { ClientEnvironment, ClientConfig, AuthState, User } from './ClientEnvironment'

const EnvironmentContext = createContext<ClientEnvironment | null>(null)

export function useEnvironment(): ClientEnvironment {
  const env = useContext(EnvironmentContext)
  if (!env) {
    throw new Error('useEnvironment must be used within EnvironmentProvider')
  }
  return env
}

// Convenience hooks
export function useApi() { return useEnvironment().api }
export function useAuth() { return useEnvironment().auth }

type Props = {
  config: ClientConfig
  children: React.ReactNode
}

export function EnvironmentProvider({ config, children }: Props) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } }
  }), [])

  const api = useMemo(() => createApiClient({
    baseUrl: config.apiUrl,
    getToken: () => null, // Cookies handle auth
  }), [config.apiUrl])

  const auth: AuthState = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isLoading,
    login: async (email, password) => {
      const result = await api.login({ email, password })
      setUser(result.user)
    },
    logout: async () => {
      await api.logout()
      setUser(null)
      queryClient.clear()
    },
    refresh: async () => {
      try {
        await api.refresh()
        const userData = await api.getCurrentUser()
        setUser(userData)
      } catch {
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    },
  }), [user, isLoading, api, queryClient])

  const environment: ClientEnvironment = useMemo(() => ({
    config,
    api,
    auth,
    queryClient,
  }), [config, api, auth, queryClient])

  // Debug access
  if (typeof window !== 'undefined') {
    (window as any).env = environment
  }

  return (
    <QueryClientProvider client={queryClient}>
      <EnvironmentContext.Provider value={environment}>
        {children}
      </EnvironmentContext.Provider>
    </QueryClientProvider>
  )
}
```

**Step 3: Simplify client entry point** (`apps/web/src/main.tsx`)

```typescript
// BEFORE (current): Just renders <App/>
// App has nested: QueryClientProvider > AuthProvider > ApiProvider > HistoryProvider

// AFTER (target): Create environment, single provider
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { EnvironmentProvider } from '@abe/core/client'
import { App } from './app/App'

const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:8080',
  env: import.meta.env.MODE as 'development' | 'production',
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EnvironmentProvider config={config}>
      <App />
    </EnvironmentProvider>
  </StrictMode>
)
```

**Step 4: Simplify App component** (`apps/web/src/app/App.tsx`)

```typescript
// BEFORE (current - root.tsx):
// Wrapped in 4 providers, auth logic scattered across files

// AFTER (target):
import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEnvironment } from '@abe/core/client'
import { HomePage } from '../pages/Home'
import { LoginPage } from '../pages/Login'
import { DashboardPage } from '../pages/Dashboard'
import { ProtectedRoute } from '../components/ProtectedRoute'

export function App() {
  const { auth } = useEnvironment()

  // Restore session on mount
  useEffect(() => {
    auth.refresh()
  }, [])

  if (auth.isLoading) {
    return <div>Loading...</div>
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
```

### Tasks for ClientEnvironment

- [ ] **A.2.1** Create `packages/core/src/client/ClientEnvironment.ts`
- [ ] **A.2.2** Create `packages/core/src/client/EnvironmentProvider.tsx`
- [ ] **A.2.3** Create `packages/core/src/client/index.ts` (exports)
- [ ] **A.2.4** Update `apps/web/src/main.tsx` to create environment
- [ ] **A.2.5** Simplify `apps/web/src/app/root.tsx` → `apps/web/src/app/App.tsx`
- [ ] **A.2.6** Delete `apps/web/src/app/providers.tsx` (merged into EnvironmentProvider)
- [ ] **A.2.7** Delete `apps/web/src/providers/ApiProvider.tsx`
- [ ] **A.2.8** Delete `apps/web/src/features/auth/AuthContext.tsx` (merged into EnvironmentProvider)
- [ ] **A.2.9** Update all components to use `useEnvironment()` hook
- [ ] **A.2.10** Verify auth flow works with new pattern

---

## A.3 Package Consolidation

### Current: 11 packages
```
packages/shared/      → env, contracts, utils, stores
packages/db/          → schema, client, migrations
packages/api-client/  → fetch wrapper, react-query hooks
packages/storage/     → local, s3 storage
packages/ui/          → components (KEEP SEPARATE)
packages/setup/       → CLI tool (KEEP SEPARATE)
```

### Target: 3 packages
```
packages/core/        → EVERYTHING except UI and CLI
├── src/
│   ├── schema.ts              # Single source of truth
│   ├── env.ts                 # Environment validation
│   ├── server/
│   │   ├── ServerEnvironment.ts
│   │   └── index.ts
│   ├── client/
│   │   ├── ClientEnvironment.ts
│   │   ├── EnvironmentProvider.tsx
│   │   └── index.ts
│   ├── db/
│   │   ├── schema.ts          # Drizzle tables
│   │   ├── client.ts
│   │   └── index.ts
│   ├── api/
│   │   ├── client.ts
│   │   ├── contracts.ts       # ts-rest contracts
│   │   └── index.ts
│   ├── storage/
│   │   ├── factory.ts
│   │   ├── local.ts
│   │   ├── s3.ts
│   │   └── index.ts
│   └── utils/
│       ├── token.ts
│       ├── dates.ts
│       └── index.ts
├── package.json
└── tsconfig.json

packages/ui/          → KEEP (design system)
packages/setup/       → KEEP (CLI tool)
```

### Tasks for Package Consolidation

- [ ] **A.3.1** Create `packages/core/` directory structure
- [ ] **A.3.2** Move `packages/shared/src/*` → `packages/core/src/`
- [ ] **A.3.3** Move `packages/db/src/*` → `packages/core/src/db/`
- [ ] **A.3.4** Move `packages/api-client/src/*` → `packages/core/src/api/`
- [ ] **A.3.5** Move `packages/storage/src/*` → `packages/core/src/storage/`
- [ ] **A.3.6** Create `packages/core/package.json` with correct exports
- [ ] **A.3.7** Update all imports in `apps/web`, `apps/server`, `apps/desktop`, `apps/mobile`
  ```typescript
  // BEFORE
  import { serverEnvSchema } from '@abe-stack/shared'
  import { createDbClient } from '@abe-stack/db'
  import { createApiClient } from '@abe-stack/api-client'
  import { createStorage } from '@abe-stack/storage'

  // AFTER
  import { serverEnvSchema, createDbClient, createApiClient, createStorage } from '@abe/core'
  // OR with subpaths:
  import { createDbClient } from '@abe/core/db'
  import { createServerEnvironment } from '@abe/core/server'
  import { EnvironmentProvider } from '@abe/core/client'
  ```
- [ ] **A.3.8** Delete old packages: `packages/shared`, `packages/db`, `packages/api-client`, `packages/storage`
- [ ] **A.3.9** Update `pnpm-workspace.yaml`
- [ ] **A.3.10** Update root `package.json` scripts
- [ ] **A.3.11** Run `pnpm build` and fix all issues
- [ ] **A.3.12** Run `pnpm test` and fix all issues

---

## A.4 Complete File Structure After Transformation

```
abe-stack/
├── apps/
│   ├── server/
│   │   └── src/
│   │       ├── index.ts           # ~40 lines: create env, start server
│   │       └── api/
│   │           ├── index.ts       # registerApi(app, env)
│   │           ├── auth.ts        # createAuthApi(env)
│   │           ├── users.ts       # createUsersApi(env)
│   │           └── health.ts      # createHealthApi(env)
│   ├── web/
│   │   └── src/
│   │       ├── main.tsx           # ~20 lines: create env, render
│   │       └── app/
│   │           └── App.tsx        # Routes only (no providers)
│   ├── desktop/
│   └── mobile/
├── packages/
│   ├── core/                      # All shared code
│   │   ├── src/
│   │   │   ├── schema.ts          # THE source of truth
│   │   │   ├── env.ts
│   │   │   ├── server/
│   │   │   ├── client/
│   │   │   ├── db/
│   │   │   ├── api/
│   │   │   ├── storage/
│   │   │   └── utils/
│   │   └── package.json
│   └── ui/                        # Design system (unchanged)
└── config/
    └── .env.development
```

---

## Summary: Key Differences from chet-stack

| Aspect | chet-stack | abe-stack (after transform) |
|--------|------------|----------------------------|
| HTTP Framework | Express | Fastify (keep - better DX) |
| Database | Custom SQL | Drizzle ORM (keep - type safety) |
| Router (client) | Custom | React Router (keep - ecosystem) |
| Query Layer | Custom | React Query (keep - caching) |
| Schema | Single schema.ts | Single schema.ts ✅ |
| Entry Points | Single env objects | Single env objects ✅ |
| Package Structure | Single src/ | Single @abe/core ✅ |
| Auth | Cookie sessions | Cookie sessions (Phase 3) |
| Real-time | WebSocket PubSub | WebSocket PubSub (Phase 4) |
| Offline | IndexedDB + Queue | IndexedDB + Queue (Phase 5) |

---

# Part B: Pure Architecture Transformation

> **Note:** Part A (Single Entry Point Configuration) should be completed first. It provides the foundation for Phases 1-2 below.

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
Phase 1: Package Consolidation (Part A covers this)
    → See Part A.3 Package Consolidation

Phase 2: Environment Pattern (Part A covers this)
    → See Part A.1 ServerEnvironment
    → See Part A.2 ClientEnvironment

Phase 3: Cookie Sessions
    ├── 3.1 Replace JWT with cookies
    └── 3.2 Simplify auth flow

Phase 4: WebSocket PubSub
    ├── 4.1 Server PubSub
    └── 4.2 Client PubSub

Phase 5: Offline Support
    ├── 5.1 RecordCache
    ├── 5.2 RecordStorage (IndexedDB)
    ├── 5.3 TransactionQueue
    └── 5.4 Service Worker

Phase 6: Additional Features
    ├── 6.1 Undo/Redo
    ├── 6.2 Background Job Queue
    └── 6.3 Auto-indexed APIs (optional)
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
- [ ] **3.1.4** Create auth middleware
- [ ] **3.1.5** Update logout route
- [ ] **3.1.6** Remove JWT-related code
  - Delete `apps/server/src/lib/jwt.ts`
  - Delete refresh token logic
  - Delete `refreshTokens` table
  - Remove token refresh interval from client

- [ ] **3.1.7** Update client auth (credentials: 'include')
- [ ] **3.1.8** Update client auth state

---

# Phase 4: WebSocket PubSub

## 4.1 Server PubSub

### Tasks

- [ ] **4.1.1** Install ws package
  ```bash
  pnpm add ws
  pnpm add -D @types/ws
  ```

- [ ] **4.1.2** Create PubSub types (`packages/core/src/pubsub/types.ts`)
- [ ] **4.1.3** Create PubsubServer (`packages/core/src/pubsub/PubsubServer.ts`)
- [ ] **4.1.4** Integrate PubSub into server
- [ ] **4.1.5** Publish updates on writes

## 4.2 Client PubSub

### Tasks

- [ ] **4.2.1** Create PubsubClient (`packages/core/src/pubsub/PubsubClient.ts`)
- [ ] **4.2.2** Create SubscriptionCache (`packages/core/src/pubsub/SubscriptionCache.ts`)
- [ ] **4.2.3** Create useSubscription hook
- [ ] **4.2.4** Integrate into ClientEnvironment

---

# Phase 5: Offline Support

## 5.1 RecordCache (In-Memory)

- [ ] **5.1.1** Create RecordCache (`packages/core/src/cache/RecordCache.ts`)

## 5.2 RecordStorage (IndexedDB)

- [ ] **5.2.1** Install idb package (`pnpm add idb`)
- [ ] **5.2.2** Create RecordStorage (`packages/core/src/cache/RecordStorage.ts`)

## 5.3 TransactionQueue

- [ ] **5.3.1** Create Transaction types
- [ ] **5.3.2** Create TransactionQueue (`packages/core/src/cache/TransactionQueue.ts`)
- [ ] **5.3.3** Create usePendingWrites hook

## 5.4 Service Worker

- [ ] **5.4.1** Create service worker (`apps/web/public/service-worker.js`)
- [ ] **5.4.2** Register service worker in main.tsx

---

# Phase 6: Additional Features

## 6.1 Undo/Redo

- [ ] **6.1.1** Create operation inverters
- [ ] **6.1.2** Create UndoRedoStack
- [ ] **6.1.3** Create useUndoRedo hook
- [ ] **6.1.4** Add keyboard shortcuts (Cmd+Z, Cmd+Shift+Z)

## 6.2 Background Job Queue

- [ ] **6.2.1** Create job queue tables (add to schema)
- [ ] **6.2.2** Create QueueServer
- [ ] **6.2.3** Create enqueueJob helper
- [ ] **6.2.4** Register job handlers

## 6.3 Auto-Indexed APIs (Optional)

- [ ] **6.3.1** Research autoindex package or build simple version
- [ ] **6.3.2** Create API file structure
- [ ] **6.3.3** Create API loader

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

## Import Changes
```typescript
// BEFORE
import { apiContract } from '@abe-stack/shared'
import { db } from '@abe-stack/db'
import { createStorage } from '@abe-stack/storage'
import { createApiClient } from '@abe-stack/api-client'

// AFTER
import { apiContract, db, createStorage, createApiClient } from '@abe/core'
```

## Auth Changes
```typescript
// BEFORE (JWT)
const token = localStorage.getItem('token')
headers: { Authorization: `Bearer ${token}` }

// AFTER (Cookies)
credentials: 'include' // That's it!
```

## Environment Access
```typescript
// BEFORE (Server)
request.server.db
request.server.storage

// AFTER (Server)
request.server.env.db
request.server.env.storage

// BEFORE (Client)
useAuth()
useApi()

// AFTER (Client)
const env = useEnvironment()
env.auth
env.api
```

---

# Dependencies

## To Add
```bash
# Phase 4 - WebSocket
pnpm add ws
pnpm add -D @types/ws

# Phase 5 - IndexedDB
pnpm add idb

# Phase 6 - Utilities (if not already present)
pnpm add nanoid
```

## To Remove (After Migration)
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

---
---
---

# Part C: Boilerplate Delivery Plan

Guide to make the monorepo production-ready while keeping the renderer-agnostic philosophy (React/React Native/Electron-Tauri as view layers only).

## 1) Foundations & DX

- [x] Confirm Node/pnpm versions align with repo policy (`>=18.19 <25`, `pnpm@10.26.2`).
- [x] Harden env loading (`dotenv-flow`) and examples (`config/.env.*`) with required keys for server, email, DB, and client origins.
- [x] Ensure `pnpm install` succeeds on clean checkout (no optional native deps breaking CI).
- [x] Add dev bootstrap script to start DB (docker-compose) and run migrations/seed.
- [x] Wire CI (lint, type-check, test, build) via GitHub Actions (or target CI).
- [x] Cache strategy for Turbo/PNPM in CI.

## 2) Frontend (Web + Shared UI)

### packages/ui (Reusable UI Library)

- [x] Audit and align elements/components with industry best practices (accessibility, keyboard nav, ARIA, focus management).
- [x] Standardize component APIs (controlled/uncontrolled patterns, polymorphic typing where needed).
- [x] Expand documentation examples for each component (usage, props, do/don't).
- [x] Add missing UI tests for critical behaviors (a11y, keyboard interactions, focus traps).
- [x] Ensure theme tokens cover spacing, typography, color, and motion consistently.
- [x] Publishable DX: consistent exports, tree-shakeable entrypoints, and clear versioning notes.

### Demo Surface (Live UI Gallery)

- [ ] Implement a dedicated `/features/demo` page that showcases every `packages/ui` component in live, interactive states.
- [ ] Build a resizable pane layout shell (top/bottom/left/right/center) with mouse drag handles and toggles per pane; persist sizes per user.
- [ ] Center pane renders the active demo; side panes host component docs, prop tables, and usage notes.
- [ ] Top bar: category tabs (elements, components, hooks, layouts, test, theme, utils) that filter the catalog.
- [ ] Component registry: map each component to demos, states, props schema, and related docs.
- [ ] Demo cards include live controls (props knobs), copyable snippets, and notes for do/don't.
- [ ] Cover primary/secondary/disabled/loading/error/empty states for each component where applicable.
- [ ] Include layout variations (stack, split, grid, dock, modal, drawer, sheet, tabs) and responsive breakpoints.
- [ ] Add interactive UX examples that combine components (forms, search, data table, wizard, auth, notifications).
- [ ] Theme controls: light/dark and density toggles; place the theme switch in the bottom pane with live preview.
- [ ] Keyboard accessibility pass for demo navigation and resize handles; document shortcuts.
- [ ] In-app docs panel links to related `docs/dev` guidance where relevant.

### IMPORTANT: Every single components in packages/ui should be presented in an interactive ui/ux and with toggleable/resizeable top/left/right/bottom bar and main render area on the center.

## 3) Backend (Fastify + Drizzle + Postgres)

- [ ] Serve routes via `@ts-rest/fastify` using the shared contract to keep server/client in lockstep.
- [ ] Define DB schema in `packages/db/src/schema` (users, sessions, verification tokens, audit tables).
- [ ] Migrations: generate and run via `drizzle-kit`; add `pnpm db:migrate` + `pnpm db:push`.
- [ ] Seed script for local dev users and feature toggles.
- [ ] Auth flows: signup, login, logout, refresh, password reset, email verification token issuance/validation.
- [ ] Email service abstraction (provider-agnostic); add local stub transporter + templates.
- [ ] Input validation with Zod; consistent error envelope and status codes.
- [ ] Rate limiting + CORS + Helmet defaults; request logging.
- [ ] Health checks and readiness endpoints.
- [ ] API versioning and OpenAPI/typed client generation hookup (align with `packages/api-client`).

## 4) Frontend (Web)

- [ ] Home shell with resizable panes (top/bottom/left/right/main); persist layout state.
- [ ] Auth screens (signup/login/forgot/reset/verify email) wired to API client.
- [ ] Global query/state setup (React Query), theming, and router guard logic.
- [ ] Error boundary + toasts/snackbars for API errors.
- [ ] Accessibility pass (focus management, keyboard resize handles).
- [ ] E2E happy path (Playwright) for auth and layout resize persistence.

## 5) Desktop (Electron, Tauri-ready)

- [ ] Share UI with web; keep renderer thin.
- [ ] IPC or HTTP strategy for auth/session; secure storage of tokens (keytar/file-safe).
- [ ] Window management mirroring web layout; remember pane sizes across launches.
- [ ] Package signing/build targets (AppImage/NSIS/mac) and auto-update strategy (note if deferred).
- [ ] Document Tauri migration steps (if/when needed).

## 6) Mobile (React Native)

- [ ] Navigation baseline (stack) with auth-protected routes.
- [ ] Screens for auth + minimal home reflecting core layout concepts (tabs/stack + sheet for panes).
- [ ] API client usage with React Query; network error handling.
- [ ] Secure token storage (SecureStore/Keychain/Keystore) and refresh flow.
- [ ] Metro config and build sanity (Android/iOS); add Detox or equivalent E2E (optional).

## 7) Shared Packages

- [ ] `packages/api-client`: align with server routes, re-export types, handle auth headers/refresh, response normalization.
- [ ] `packages/ui`: shared components (buttons, inputs, layout elements, pane resizers), theme tokens, dark/light support.
- [ ] `packages/shared`: domain types, validation schemas, utilities (date, money, feature flags), logging helpers.
- [ ] `packages/db`: ensure schema exports are tree-shakeable; publish/consume pattern documented.
- [ ] Generate fetch/React Query clients from the shared ts-rest contract for web/desktop/mobile consumption.

## 8) Infrastructure & Ops

- [ ] Dockerfile/docker-compose for server + Postgres + maildev (dev).
- [ ] Production Postgres settings guidance (connection pooling, SSL).
- [ ] Secrets management note (env, Vault, SSM).
- [ ] Observability hooks: request logs, basic metrics, and error reporting placeholders.
- [ ] Backups/retention plan for DB (documented checklist).

## 9) Security & Compliance

- [ ] Password policy + bcrypt cost tuning; account lockout/backoff on brute force.
- [ ] CSRF story (mainly for web forms if cookies are used), CORS allowlist.
- [ ] Input validation coverage; output encoding where needed.
- [ ] Dependencies audit (pnpm audit or npm audit-lite) and update cadence.
- [ ] GDPR-ready data export/delete stubs (documented).

## 10) Testing

- [ ] Unit tests for auth flows and schema validation.
- [ ] Integration tests for API routes (vitest + supertest/fastify inject).
- [ ] Playwright E2E for auth + layout resize persistence.
- [ ] Snapshot/golden tests for key UI components (optional).
- [ ] Test data builders/factories for consistent fixtures.

## 11) Documentation

- [ ] Update README once core features land (status badges, links to docs).
- [ ] Add quickstart guides per app (web/desktop/mobile) under `docs/`.
- [ ] API docs (OpenAPI link or generated client usage) in `docs/api`.
- [ ] Release checklist (versioning, changelog, tagging).
- [x] 2025-12-29 Modularize ARCHITECTURE/TESTING/WORKFLOWS docs and add INDEX.md.
- [x] 2025-12-29 Clarify workflow to not auto-fix pre-existing lint/type-check/test failures.
- [x] 2025-12-29 Split PRINCIPLES, compress PATTERNS/ANTI_PATTERNS, add keyword routing, update Last Updated stamps.
- [x] 2025-12-29 Add context retention summaries, resume mode, session bridge, and migration classification guidance.
- [x] 2025-12-29 Move CLAUDE/AGENTS/GEMINI into docs/ and normalize doc references.
- [x] 2025-12-29 Rename dev overview docs to index.md within their modules and update references.
- [x] 2025-12-29 Fix remaining doc references after index renames.
- [x] 2025-12-29 Normalize agent doc paths/names and align template numbering/testing matrix.
- [x] 2025-12-29 Rename underscore/caps docs to lowercase-hyphen and move coding-standards/performance/use-cases into module folders.
- [x] 2025-12-29 Rename log docs to lowercase (log.md, milestone.md) and update references.
- [x] 2025-12-29 Clarify agent vs dev doc scope in INDEX.md.
- [x] 2025-12-29 Refresh README with doc links, startup paths, guardrails, and test caveat.
- [x] 2025-12-29 Add README Why/5-minute Docker run/architecture diagram/badges.
- [x] 2025-12-29 Add velocity tips, index template, examples index, and expand AGENTS guide.

## 12) Delivery Checklist

- [ ] Clean install + `pnpm dev` smoke test passes across apps.
- [x] `pnpm build` succeeds across workspace.
- [x] `pnpm test`/`pnpm lint`/`pnpm type-check` green locally and in CI.
- [ ] Example environment variables populated for demo auth/email flows.
- [ ] Publish starter `full_code.txt` or similar export for sharing (kept gitignored).
