# Architecture Overview

**Last Updated: January 10, 2026**

ABE Stack architecture principles, current structure, and proposed evolution.

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
│   │       ├── features/ # Feature modules
│   │       └── pages/    # Route pages
│   ├── desktop/          # Electron application
│   └── server/           # Fastify API server
│       └── src/
│           ├── routes/   # API route handlers
│           ├── lib/      # Server utilities
│           └── services/ # Business logic
├── packages/
│   ├── ui/               # Shared UI library
│   │   └── src/
│   │       ├── components/  # Stateful components
│   │       ├── elements/    # Stateless primitives
│   │       ├── layouts/     # Layout patterns
│   │       ├── hooks/       # React hooks
│   │       └── theme/       # Styling tokens
│   ├── api-client/       # Type-safe API client
│   ├── db/               # Drizzle ORM + schemas
│   ├── shared/           # Types, validation, utilities
│   └── storage/          # File storage abstraction
├── config/               # Docker, env, test configs
└── tools/                # Dev scripts
```

### Package Responsibilities

| Package              | Purpose                | Key Exports                          |
| -------------------- | ---------------------- | ------------------------------------ |
| `@abeahn/ui`         | Reusable UI components | Components, elements, hooks, layouts |
| `@abeahn/api-client` | Type-safe API calls    | `createApiClient`, response types    |
| `@abeahn/db`         | Database layer         | Schemas, migrations, queries         |
| `@abeahn/shared`     | Shared utilities       | Contracts, types, validation         |
| `@abeahn/storage`    | File storage           | S3/local providers, signed URLs      |

---

## Proposed V5 Structure

Layer-based organization for clearer separation. See [V5 Proposal](./v5-proposal.md) for migration details.

```
abe-stack/
├── frontend/
│   ├── web/          # Web app (Vite + React)
│   ├── desktop/      # Desktop app (Electron)
│   ├── mobile/       # Mobile app (React Native)
│   ├── ui/           # Shared UI library
│   └── api-client/   # Frontend API client
├── backend/
│   ├── server/       # API server (Fastify)
│   ├── db/           # Database layer
│   └── storage/      # File storage
├── shared/           # Cross-layer types and contracts
└── config/           # Environment and tooling
```

### Benefits of V5

- **Clear Boundaries**: Frontend can't accidentally import backend code
- **Better Tree-Shaking**: Bundlers can optimize per-layer
- **Simpler Mental Model**: "Where does this go?" has obvious answers
- **Easier Onboarding**: New developers understand structure immediately

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

- [V5 Architecture Proposal](./v5-proposal.md) - Detailed migration plan
- [CHET-Stack Comparison](./chet-comparison.md) - Feature comparison and adoption plan
- [Realtime Overview](./realtime/overview.md) - Quick start for real-time features
- [Realtime Architecture](./realtime/architecture.md) - Detailed sync system design
- [Realtime Implementation](./realtime/implementation-guide.md) - Step-by-step guide
- [Realtime Patterns](./realtime/patterns.md) - Common patterns and examples

---

## Dependency Flow

```
     frontend/*
         │
         ▼
     shared/*
         │
         ▼
     backend/*  (server imports db, storage)
```

**Rules:**

- Frontend can import shared, never backend
- Backend can import shared
- Shared imports nothing from frontend or backend
- Within frontend: ui → api-client → apps
- Within backend: server → db, storage
