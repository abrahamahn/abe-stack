# CHET-Stack Comparison

**Last Updated: January 15, 2026**

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

| Feature                 | ABE Stack (Current)         | CHET-Stack            | ABE Stack (Proposed)    |
| ----------------------- | --------------------------- | --------------------- | ----------------------- |
| **Architecture**        | Monorepo, infra/modules     | Monorepo, layer-based | Layer-based (V5)        |
| **Frontend**            | React, Vite                 | React, Vite           | Same                    |
| **Backend**             | Fastify, ts-rest            | Fastify/Express       | Same                    |
| **Database**            | PostgreSQL, Drizzle         | PostgreSQL, Drizzle   | Same                    |
| **Auth**                | JWT, refresh tokens         | JWT, sessions         | Same                    |
| **Environment Pattern** | ✅ AppContext (implemented) | Environment objects   | Already adopted         |
| **Real-time**           | In-memory pub/sub (basic)   | WebSocket pub/sub     | Adopt WebSocket pub/sub |
| **Offline**             | None                        | IndexedDB + queue     | Adopt IndexedDB pattern |
| **Optimistic Updates**  | None                        | Operation-based       | Adopt operation pattern |
| **Undo/Redo**           | None                        | Operation history     | Adopt undo/redo stack   |
| **Collaboration**       | None                        | Multi-user sync       | Adopt sync protocol     |

---

## Key CHET-Stack Patterns

### 1. Environment Objects ✅ (Already Adopted)

ABE Stack already uses the environment/service container pattern via `AppContext`:

**Current ABE Stack Implementation:**

```typescript
// apps/server/src/shared/types.ts
interface IServiceContainer {
  readonly config: AppConfig;
  readonly db: DbClient;
  readonly email: EmailService;
  readonly storage: StorageProvider;
  readonly pubsub: SubscriptionManager;
}

interface AppContext extends IServiceContainer {
  log: FastifyBaseLogger;
}

// Handlers receive context with all dependencies
async function handleLogin(ctx: AppContext, req: LoginRequest) {
  const user = await ctx.db.query.users.findFirst(...);
  await ctx.email.send(...);
}
```

**Benefits (already realized):**

- Easier testing (mock context)
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

### Phase 1: Environment Objects ✅ COMPLETE

ABE Stack already implements this pattern via `AppContext` in `apps/server/src/shared/types.ts`.
All handlers receive context with db, email, storage, pubsub dependencies injected.

### Phase 2: Operation Types (Planned)

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

| Phase | Description          | Status        |
| ----- | -------------------- | ------------- |
| 1     | Environment objects  | ✅ Complete   |
| 2     | Operation types      | Planned       |
| 3     | Record cache + hooks | After Phase 2 |
| 4     | WebSocket sync       | After Phase 3 |
| 5     | Offline support      | After Phase 4 |

Each phase is independently useful - you can stop at any point and have a working system.

---

## Related Documentation

- [Architecture Overview](./index.md)
- [V5 Architecture Proposal](./v5-proposal.md)
- [Realtime Overview](./realtime/overview.md)
- [Realtime Architecture](./realtime/architecture.md)
- [Realtime Implementation Guide](./realtime/implementation-guide.md)
- [Realtime Patterns](./realtime/patterns.md)

---

_Last Updated: January 15, 2026_
