# ABE Stack Architecture

**Last Updated: January 20, 2026**

Comprehensive architecture documentation for ABE Stack's layered architecture and package layout.

## When to Read

- When adding new dependencies or cross-package integrations.
- When you need to understand layering or server `infra/modules` boundaries.

## How to Use This Guide

1. Start with **Quick Summary** and **Monorepo Structure**.
2. Confirm **Dependency Flow** before adding imports.
3. Review **Hexagonal Architecture** if touching server modules.

---

## Quick Summary

- **Four layers**: Presentation → State → Business Logic → Data
- **One-way dependencies**: `apps` → `packages` → `core`
- **Framework-agnostic core** in `packages/core`
- **Hexagonal architecture** on server with `infra/modules` separation

---

## Monorepo Structure

```
abe-stack/
├── apps/
│   ├── web/              # Vite + React frontend
│   │   └── src/
│   │       ├── features/     # Feature modules (auth, dashboard)
│   │       ├── pages/        # Standalone pages
│   │       ├── api/          # API client setup
│   │       ├── app/          # App root and providers
│   │       └── config/       # App configuration
│   ├── server/           # Fastify API server
│   │   └── src/
│   │       ├── modules/      # Feature modules (auth, users, admin)
│   │       ├── infra/        # Infrastructure layer (14 modules)
│   │       │   ├── database/ # Drizzle ORM, schemas
│   │       │   ├── storage/  # S3/local file storage
│   │       │   ├── pubsub/   # Pub/sub subscriptions
│   │       │   ├── security/ # Lockout, audit logging
│   │       │   ├── email/    # Email service
│   │       │   ├── crypto/   # JWT utilities
│   │       │   ├── http/     # HTTP utilities, CSRF, cookies
│   │       │   ├── rate-limit/ # Token bucket rate limiter
│   │       │   ├── websocket/  # Real-time WebSocket support
│   │       │   ├── health/     # Health check endpoints
│   │       │   ├── logger/     # Structured logging with correlation IDs
│   │       │   ├── queue/      # Background job processing
│   │       │   ├── router/     # Route registration patterns
│   │       │   └── write/      # Transaction + PubSub write helper
│   │       ├── config/       # Server configuration
│   │       └── shared/       # Server-specific shared code
│   └── desktop/          # Electron desktop app
├── packages/
│   ├── core/             # Shared contracts, validation, stores
│   ├── ui/               # Reusable React components
│   ├── sdk/              # Type-safe API client + React Query hooks
│   └── tests/            # Shared test utilities, mocks, constants
├── config/               # Shared configs (tsconfig, prettier)
└── docs/                 # Documentation
```

### Folder Conventions

| Location                  | Purpose                                      |
| ------------------------- | -------------------------------------------- |
| `apps/web/src/features`   | Feature modules (auth, dashboard)            |
| `apps/web/src/pages`      | Standalone pages                             |
| `apps/server/src/modules` | API feature modules                          |
| `apps/server/src/infra`   | Infrastructure (database, storage, security) |
| `packages/core/src`       | Shared contracts, validation, stores         |
| `packages/ui/src`         | Reusable UI components                       |
| `packages/sdk/src`        | Type-safe API client + React Query hooks     |
| `packages/tests/src`      | Shared test utilities, mocks, constants      |

---

## Layers

```
┌─────────────────────────────────────────────────────────┐
│                   Presentation Layer                     │
│         (React Components, UI Elements, Hooks)          │
├─────────────────────────────────────────────────────────┤
│                     State Layer                          │
│           (React Query, Context, Local State)           │
├─────────────────────────────────────────────────────────┤
│                  Business Logic Layer                    │
│          (Services, Validators, Transformers)           │
├─────────────────────────────────────────────────────────┤
│                     Data Layer                           │
│         (API Client, Database, Storage, Cache)          │
└─────────────────────────────────────────────────────────┘
```

| Layer              | Responsibilities                                               | Avoid                         |
| ------------------ | -------------------------------------------------------------- | ----------------------------- |
| **Presentation**   | Render UI, handle interactions, UI-only state                  | Business logic, data fetching |
| **State**          | Server state caching, loading/error states, optimistic updates | Business rules, DB logic      |
| **Business Logic** | Domain rules, validation (Zod), transformations                | React hooks, UI concerns      |
| **Data**           | API routes, auth, DB schemas, queries                          | UI rendering                  |

### Cross-Layer Rules

- React is a renderer only → Keep logic in `packages/core`
- API client is the boundary between UI and server
- Keep validation in shared to enforce contracts across apps

---

## Dependency Flow

```
Frontend Apps (web, desktop)
        │
        ▼
packages/ui, packages/sdk
        │
        ▼
   packages/core

Backend App (server)
        │
        ▼
apps/server/src/infra/*
        │
        ▼
   packages/core
```

### Rules

| Rule                    | Description                                      |
| ----------------------- | ------------------------------------------------ |
| No reverse deps         | `packages/*` cannot import from `apps`           |
| No cross-app imports    | `web` cannot import from `server`                |
| Shared in `core`        | Contracts and validation live in `packages/core` |
| Server infra internal   | `infra/*` modules are internal to `apps/server`  |
| Framework-agnostic core | `packages/core` has no React imports             |

### Package Dependencies

| Package            | Can Import From    |
| ------------------ | ------------------ |
| `@abe-stack/core`  | External deps only |
| `@abe-stack/ui`    | `@abe-stack/core`  |
| `@abe-stack/sdk`   | `@abe-stack/core`  |
| `@abe-stack/tests` | `@abe-stack/core`  |
| `apps/web`         | All packages       |
| `apps/server`      | `@abe-stack/core`  |

---

## Hexagonal Architecture (Server)

The server implements **hexagonal architecture** (ports & adapters) to isolate business logic from infrastructure concerns.

```
┌─────────────────────────────────────────────────────────────┐
│                        modules/                              │
│   (Business Logic: auth, users, admin - the "core")         │
├─────────────────────────────────────────────────────────────┤
│                         infra/                               │
│   (Adapters: database, email, storage, pubsub, security)    │
└─────────────────────────────────────────────────────────────┘
```

| Layer        | Purpose                                 | Examples                                                     |
| ------------ | --------------------------------------- | ------------------------------------------------------------ |
| **modules/** | Business logic, use cases, domain rules | `auth/service.ts`, `users/routes.ts`                         |
| **infra/**   | External system adapters                | `database/`, `email/`, `storage/`, `pubsub/`, `queue/`, etc. |

**Key benefits**:

- Swap infrastructure without changing business logic (e.g., switch email providers)
- Test business logic in isolation with mocked adapters
- Clear boundaries prevent infrastructure concerns from leaking into domain code

**Rules**:

- `modules/` can import from `infra/` (dependency flows inward)
- `infra/` never imports from `modules/`
- Each `infra/` module exports a clean interface via `index.ts`

---

## Development Automation (tools/dev/)

- `sync-path-aliases` keeps TS path aliases aligned with directories that have `index.ts` barrels
- `sync-file-headers` prepends `// path/to/file.ts` headers to new or updated files
- `sync-css-theme` generates CSS custom properties from theme tokens
- `pnpm dev` runs all sync tools in watch mode alongside Vite/Fastify dev servers

---

## Key Patterns

### DRY Enforcement

- Extract shared logic to `packages/core`
- Use `packages/ui` only for reusable UI components
- Keep API contracts in shared, consume from server/client

### Framework-Agnostic Core

- Shared logic must not import React or platform APIs
- Provide React hooks in `packages/sdk` or app layers

### API Client Split

- Framework-agnostic client: `packages/sdk/src/client.ts`
- React Query hooks: `packages/sdk/src/react-query.ts`

### Environment Configuration

- Define schemas with Zod in `packages/core/src/env.ts`
- Validate at startup for server apps
- Use `VITE_`-prefixed variables for web client
- Keep secrets server-side only

---

## Client-Side State Management (SDK)

The SDK (`packages/sdk`) provides a complete client-side state management solution for real-time, offline-first applications.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    React Components                          │
│              (useQuery, useMutation, useEffect)             │
├─────────────────────────────────────────────────────────────┤
│                    SubscriptionCache                         │
│         (Reference counting, delayed cleanup)               │
├─────────────────────────────────────────────────────────────┤
│    RecordCache (Memory)    │    LoaderCache (Requests)      │
│    - Type-safe records     │    - Request deduplication     │
│    - Version conflicts     │    - TTL expiration            │
│    - Optimistic updates    │    - Stale eviction            │
├─────────────────────────────────────────────────────────────┤
│              RecordStorage (IndexedDB)                       │
│    - Persistent storage with fallbacks                       │
│    - Version-based concurrency                               │
├─────────────────────────────────────────────────────────────┤
│   WebsocketPubsubClient   │    TransactionQueue             │
│   - Real-time updates     │    - Offline mutations          │
│   - Auto-reconnect        │    - Conflict resolution        │
│   - Exponential backoff   │    - Rollback support           │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Read Path**: Component subscribes via `SubscriptionCache` -> `WebsocketPubsubClient` subscribes to server -> Updates flow to `RecordCache` -> Component re-renders
2. **Write Path**: Mutation added to `TransactionQueue` -> Optimistic update in `RecordCache` -> Queue processes when online -> Server confirms or rollback triggers

### Module Responsibilities

| Module                  | Purpose                                 |
| ----------------------- | --------------------------------------- |
| `RecordCache`           | In-memory cache with version conflicts  |
| `RecordStorage`         | IndexedDB persistence for offline       |
| `LoaderCache`           | Request deduplication with TTL          |
| `SubscriptionCache`     | Reference counting for subscriptions    |
| `TransactionQueue`      | Offline mutation queue with retry       |
| `WebsocketPubsubClient` | Real-time WebSocket with auto-reconnect |
| `UndoRedoStack`         | Generic operation history management    |

### Integration Pattern

```typescript
// Initialize SDK components
const pubsub = new WebsocketPubsubClient({ host, onMessage, onConnect });
const cache = new RecordCache<Tables>();
const storage = createRecordStorage<Tables>();
const subscriptionCache = new SubscriptionCache({
  onSubscribe: (key) => pubsub.subscribe(key),
  onUnsubscribe: (key) => pubsub.unsubscribe(key),
});
const transactionQueue = createTransactionQueue({
  submitTransaction,
  onRollback,
});

// In React hooks
function useRecord<T>(table: string, id: string) {
  useEffect(() => subscriptionCache.subscribe(`${table}:${id}`), [table, id]);
  return cache.get(table, id);
}
```

---

## Testing Organization

| Test Type         | Location                                              | Purpose             |
| ----------------- | ----------------------------------------------------- | ------------------- |
| Unit tests        | Adjacent to source files (`file.ts` + `file.test.ts`) | Business logic      |
| Integration tests | `apps/server/src/__tests__/integration/` or `test/`   | Routes + DB         |
| Component tests   | Adjacent to components (`Component.tsx` + `.test.tsx`) | UI components       |
| E2E tests         | `apps/web/src/test/e2e`                               | Critical user flows |

**Hybrid model**: Colocate unit/component tests; centralize integration/E2E tests.

---

## Future: V5 Proposal

**Status**: Proposed

Restructure from role-based to layer-based organization:

```
abe-stack/
├── frontend/         # web, desktop, ui, sdk
├── backend/          # server, jobs
├── shared/           # contracts, types, validation
└── config/
```

**Benefits**: Clear layer separation, build optimization, enforced boundaries.

**Migration**: 5 PRs (structure → frontend → backend → shared → cleanup).

---

## Real-Time Features Status

Based on CHET-Stack patterns. Core infrastructure is now complete.

| Phase | Feature                          | Status      |
| ----- | -------------------------------- | ----------- |
| 1     | Environment objects (AppContext) | ✅ Complete |
| 2     | Operation types                  | ✅ Complete |
| 3     | Record cache + hooks             | ✅ Complete |
| 4     | WebSocket sync                   | ✅ Complete |
| 5     | Offline support                  | ✅ Complete |

**Implemented in `packages/sdk`**:

- `RecordCache` - Type-safe in-memory cache with version conflict resolution
- `RecordStorage` - IndexedDB persistence with automatic fallbacks
- `WebsocketPubsubClient` - Auto-reconnecting WebSocket client
- `TransactionQueue` - Offline-first mutation queue with rollback
- `SubscriptionCache` - Reference-counted subscription management
- `LoaderCache` - Request deduplication with TTL
- `UndoRedoStack` - Generic undo/redo with operation grouping

**Remaining work**: React hooks integration (useRecord, useSubscription) and full offline-first example app

---

## See Also

- [Principles & Standards](./principles.md)
- [Testing Guide](../dev/testing.md)
- [Workflows](../agent/workflows.md)

---

_Last Updated: January 20, 2026_
