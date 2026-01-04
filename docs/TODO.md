# ABE-Stack Master TODO

This document contains two parts:
- **Part A**: Pure Architecture Transformation (adopting chet-stack patterns)
- **Part B**: Boilerplate Delivery Plan (production readiness checklist)

---

# Part A: Pure Architecture Transformation

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

# Part B: Boilerplate Delivery Plan

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
