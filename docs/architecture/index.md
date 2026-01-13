# Architecture Overview

**Last Updated: January 13, 2026**

ABE Stack architecture principles, current structure, and design decisions.

---

## Design Philosophy

### Core Principles

1. **Framework-Agnostic Core** - Business logic lives in shared packages, not in UI frameworks
2. **React as Renderer Only** - Components render state, don't contain business logic
3. **Type-Safe End-to-End** - TypeScript strict mode, Zod validation, ts-rest contracts
4. **Minimal Dependencies** - Choose focused libraries over monolithic frameworks
5. **Separation of Concerns** - Clear boundaries between data, logic, and presentation

### Layer Architecture

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

---

## Current Structure

```
abe-stack/
├── apps/
│   ├── web/              # Vite + React web application
│   │   └── src/
│   │       ├── app/      # App setup (providers, routes)
│   │       ├── features/ # Feature modules (auth, dashboard)
│   │       ├── api/      # API client setup
│   │       └── pages/    # Route pages
│   ├── desktop/          # Electron application
│   └── server/           # Fastify API server
│       └── src/
│           ├── modules/  # Feature modules (auth, users, admin)
│           ├── infra/    # Infrastructure layer
│           │   ├── database/  # Drizzle ORM, schemas, migrations
│           │   ├── storage/   # S3/local file storage
│           │   ├── pubsub/    # WebSocket subscriptions
│           │   ├── security/  # Auth, lockout, audit logging
│           │   └── email/     # Email service
│           └── shared/   # Server constants, types
├── packages/
│   ├── core/             # Shared contracts, validation, stores
│   │   └── src/
│   │       ├── contracts/   # ts-rest API contracts
│   │       ├── validation/  # Zod schemas
│   │       ├── stores/      # Zustand stores (toast, etc.)
│   │       └── utils/       # Shared utilities
│   ├── ui/               # Shared UI library
│   │   └── src/
│   │       ├── components/  # Stateful components
│   │       ├── elements/    # Stateless primitives
│   │       ├── layouts/     # Layout patterns
│   │       ├── hooks/       # React hooks
│   │       └── theme/       # Styling tokens
│   └── sdk/              # Type-safe API client
│       └── src/
│           ├── client.ts       # Framework-agnostic client
│           ├── react-query.ts  # React Query integration
│           └── types.ts        # Re-exported types
├── config/               # Docker, env, test configs
└── tools/                # Dev scripts
```

### Package Responsibilities

| Package           | Purpose                | Key Exports                                 |
| ----------------- | ---------------------- | ------------------------------------------- |
| `@abe-stack/core` | Shared business logic  | Contracts, validation, stores, utilities    |
| `@abe-stack/ui`   | Reusable UI components | Components, elements, hooks, layouts        |
| `@abe-stack/sdk`  | Type-safe API calls    | `createApiClient`, `createReactQueryClient` |

### Server Infrastructure

| Module                           | Purpose          | Key Features                        |
| -------------------------------- | ---------------- | ----------------------------------- |
| `apps/server/src/infra/database` | Data persistence | Drizzle ORM, PostgreSQL, migrations |
| `apps/server/src/infra/storage`  | File storage     | S3/local providers, signed URLs     |
| `apps/server/src/infra/security` | Auth & security  | JWT, lockout, audit logging         |
| `apps/server/src/infra/pubsub`   | Real-time        | WebSocket subscriptions             |

---

## CHET-Stack Integration

ABE Stack is designed to adopt CHET-Stack patterns for real-time features. See [CHET Comparison](./chet-comparison.md) and [Realtime Architecture](./realtime/architecture.md).

### Key Concepts from CHET-Stack

1. **Environment Objects** - Configuration passed through app, not globals
2. **Operation-Based Sync** - Send operations, not full records
3. **Optimistic Updates** - Apply changes locally, sync to server
4. **Offline-First** - Queue writes in IndexedDB, sync when online
5. **Version-Based Conflicts** - Each record has a version for concurrency

### Planned Additions

```
packages/realtime/     # Real-time sync engine
├── RecordCache.ts     # In-memory record store
├── RecordStorage.ts   # IndexedDB persistence
├── TransactionQueue.ts # Offline write queue
├── UndoRedoStack.ts   # Operation history
└── WebSocketClient.ts # Real-time connection
```

---

## Related Documentation

- [CHET-Stack Comparison](./chet-comparison.md) - Feature comparison and adoption plan
- [Realtime Overview](./realtime/overview.md) - Quick start for real-time features
- [Realtime Architecture](./realtime/architecture.md) - Detailed sync system design
- [Realtime Implementation](./realtime/implementation-guide.md) - Step-by-step guide
- [Realtime Patterns](./realtime/patterns.md) - Common patterns and examples

---

## Dependency Flow

```
    apps/web, apps/desktop
            │
            ▼
    packages/ui, packages/sdk
            │
            ▼
       packages/core

    apps/server
            │
            ▼
    apps/server/src/infra/*
            │
            ▼
       packages/core
```

**Rules:**

- Apps can import from packages, never from other apps
- `packages/core` is framework-agnostic (no React)
- `packages/ui` and `packages/sdk` can import from `packages/core`
- Server infra modules are internal to the server app
- All packages use `packages/core` for shared contracts/types
