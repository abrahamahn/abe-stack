# CHET-Stack Comparison

**Last Updated: January 10, 2026**

Comparison between ABE Stack and CHET-Stack, with adoption recommendations for real-time collaboration features.

---

## What is CHET-Stack?

CHET-Stack (by Steve Ruiz, creator of tldraw) is a production-ready architecture for building real-time collaborative applications. It emphasizes:

- **Simplicity** - Minimal abstractions, direct patterns
- **Environment Objects** - Configuration passed through app, not globals
- **Operation-Based Sync** - Send operations, not full records
- **Offline-First** - Works without internet, syncs when online
- **Optimistic Updates** - Instant UI feedback (0ms perceived latency)

---

## Feature Comparison

| Feature                | ABE Stack (Current)  | CHET-Stack            | ABE Stack (Proposed)       |
| ---------------------- | -------------------- | --------------------- | -------------------------- |
| **Architecture**       | Monorepo, role-based | Monorepo, layer-based | Monorepo, layer-based (V5) |
| **Frontend**           | React, Vite          | React, Vite           | Same                       |
| **Backend**            | Fastify, ts-rest     | Fastify/Express       | Same                       |
| **Database**           | PostgreSQL, Drizzle  | PostgreSQL, Drizzle   | Same                       |
| **Auth**               | JWT, refresh tokens  | JWT, sessions         | Same + Passport.js         |
| **Real-time**          | None                 | WebSocket pub/sub     | Adopt WebSocket pub/sub    |
| **Offline**            | None                 | IndexedDB + queue     | Adopt IndexedDB pattern    |
| **Optimistic Updates** | None                 | Operation-based       | Adopt operation pattern    |
| **Undo/Redo**          | None                 | Operation history     | Adopt undo/redo stack      |
| **Collaboration**      | None                 | Multi-user sync       | Adopt sync protocol        |

---

## Key CHET-Stack Patterns to Adopt

### 1. Environment Objects

**Current ABE Stack:**

```typescript
// Uses global imports
import { db } from '@abe-stack/server';
import { storage } from '@abe-stack/server';

async function handleRequest(req) {
  const user = await db.query.users.findFirst(...);
  const file = await storage.getFile(...);
}
```

**CHET-Stack Pattern:**

```typescript
// Environment passed through context
type Environment = {
  db: DbClient;
  storage: StorageProvider;
  pubsub: PubSubServer;
  userId: string;
};

async function handleRequest(env: Environment, req: Request) {
  const user = await env.db.query.users.findFirst(...);
  const file = await env.storage.getFile(...);
}
```

**Benefits:**

- Easier testing (mock environment)
- No hidden dependencies
- Clear function signatures
- Better type inference

### 2. Operation-Based Sync

**Traditional Approach:**

```typescript
// Send full record
await api.updateTask({
  id: 'task-123',
  title: 'Updated Title',
  status: 'done',
  assigneeId: 'user-456',
  // ... all other fields
});
```

**CHET-Stack Pattern:**

```typescript
// Send operations
await api.write({
  operations: [
    { type: 'set', table: 'tasks', id: 'task-123', key: 'status', value: 'done' },
    { type: 'set-now', table: 'tasks', id: 'task-123', key: 'updatedAt' },
  ],
});
```

**Benefits:**

- Smaller payloads
- Invertible for undo/redo
- Mergeable for conflict resolution
- Works offline (queue operations)

### 3. Record Cache + Subscriptions

**CHET-Stack Pattern:**

```typescript
// In-memory cache with subscriptions
const cache = new RecordCache();

// Components subscribe to records
function TaskCard({ taskId }) {
  const task = useRecord('tasks', taskId);
  // Auto re-renders when task changes
}

// Write updates cache immediately
cache.write('tasks', { ...task, status: 'done' });
// UI updates instantly, sync to server in background
```

### 4. Offline Queue

**CHET-Stack Pattern:**

```typescript
// Operations queued in IndexedDB
const queue = new TransactionQueue();

// On write (works offline)
queue.enqueue({
  txId: crypto.randomUUID(),
  operations: [{ type: 'set', ... }],
  timestamp: Date.now()
});

// On reconnect
while (queue.hasNext()) {
  const tx = queue.peek();
  const result = await api.write(tx);
  if (result.ok) queue.dequeue();
}
```

---

## Adoption Plan

### Phase 1: Environment Objects

Update server handlers to receive environment:

```typescript
// apps/server/src/modules/index.ts
import type { Environment } from './types';

export function createRoutes(env: Environment) {
  return {
    async getUser({ params }) {
      return env.db.query.users.findFirst({
        where: eq(users.id, params.id),
      });
    },
  };
}
```

### Phase 2: Operation Types

Add `packages/realtime` with operation definitions:

```typescript
// packages/realtime/src/transactions.ts
export type Operation =
  | { type: 'set'; table: string; id: string; key: string; value: unknown }
  | { type: 'set-now'; table: string; id: string; key: string }
  | {
      type: 'listInsert';
      table: string;
      id: string;
      key: string;
      value: unknown;
      position: Position;
    }
  | { type: 'listRemove'; table: string; id: string; key: string; value: unknown };
```

### Phase 3: Record Cache

Add in-memory cache with React hooks:

```typescript
// packages/realtime/src/RecordCache.ts
export class RecordCache {
  write(table: string, record: Record): void;
  get(table: string, id: string): Record | undefined;
  subscribe(callback: (table: string, id: string) => void): () => void;
}

// apps/web/src/hooks/useRecord.ts
export function useRecord<T>(table: string, id: string): T | undefined {
  const { recordCache } = useRealtime();
  return useSyncExternalStore(
    (cb) => recordCache.subscribe((t, i) => t === table && i === id && cb()),
    () => recordCache.get(table, id) as T | undefined,
  );
}
```

### Phase 4: WebSocket Sync

Add pub/sub server and client:

```typescript
// WebSocket server publishes updates
pubsub.publish([{ key: 'tasks:task-123', version: 5 }]);

// Clients subscribe to keys they're viewing
client.subscribe('tasks:task-123');
client.onUpdate((key, version) => {
  // Fetch if our cached version is older
  if (cache.get(table, id)?.version < version) {
    // Fetch and update cache
  }
});
```

### Phase 5: Offline Support

Add IndexedDB storage and transaction queue for offline resilience.

---

## What NOT to Adopt

Some CHET-Stack patterns don't fit ABE Stack's goals:

1. **tuple-database for everything** - We use PostgreSQL, tuple-database is for in-memory only
2. **Custom build tooling** - We keep Turborepo + Vite
3. **Specific UI patterns** - tldraw-specific patterns like Canvas/Shape classes

---

## Timeline

| Phase | Description          | Priority           |
| ----- | -------------------- | ------------------ |
| 1     | Environment objects  | After V5 migration |
| 2     | Operation types      | After Phase 1      |
| 3     | Record cache + hooks | After Phase 2      |
| 4     | WebSocket sync       | After Phase 3      |
| 5     | Offline support      | After Phase 4      |

Each phase is independently useful - you can stop at any point and have a working system.

---

## Related Documentation

- [Architecture Overview](./index.md)
- [V5 Architecture Proposal](./v5-proposal.md)
- [Realtime Overview](./realtime/overview.md)
- [Realtime Architecture](./realtime/architecture.md)
- [Realtime Implementation Guide](./realtime/implementation-guide.md)
- [Realtime Patterns](./realtime/patterns.md)
