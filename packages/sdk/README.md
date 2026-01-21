# @abe-stack/sdk

Type-safe API client and client-side state management for ABE Stack applications.

## Table of Contents

- [The Philosophy](#the-philosophy)
- [The Data Flow Story](#the-data-flow-story)
- [Module Architecture](#module-architecture)
- [API Reference](#api-reference)
- [React Integration](#react-integration)
- [Trade-offs and Limitations](#trade-offs-and-limitations)
- [Comparison to Similar Patterns](#comparison-to-similar-patterns)
- [Getting Started](#getting-started)

---

## The Philosophy

We wanted to build applications that feel instant, work offline, and stay in sync across tabs and devices. This SDK is our answer to that challenge.

Most client-side state management libraries treat the server as the source of truth and the client as a dumb cache. We flip that model. The client is the optimistic source of truth, and we reconcile with the server in the background. When you click "Save," the UI updates immediately. The network request happens later, in a queue, with automatic retry and conflict resolution.

This is harder to build but dramatically better to use. No loading spinners. No "please wait." Just instant feedback.

## Installation

```bash
pnpm add @abe-stack/sdk
```

## The Data Flow Story

Let us walk through what happens when you load a record, edit it, and keep it in sync with other users. This will help you understand how all the pieces fit together.

### Chapter 1: Initial Load

When a component mounts and calls `useRecord('user', '123')`, here is the journey:

```
Component renders
       |
       v
useRecord('user', '123') called
       |
       +---> SubscriptionCache.subscribe('user:123')
       |            |
       |            +---> First subscriber? Call onSubscribe
       |                        |
       |                        v
       |              WebsocketPubsubClient.subscribe('user:123')
       |                        |
       |                        v
       |              Server adds client to topic 'user:123'
       |
       +---> RecordCache.get('user', '123')
       |            |
       |            +---> Cache miss? Return undefined
       |            +---> Cache hit? Return record
       |
       v
Component renders with data (or undefined)
```

The first render might show undefined while we wait for data. But here is where it gets interesting: we are now subscribed to real-time updates. Any change to `user:123` anywhere in the system will push to us immediately.

### Chapter 2: Real-Time Update Arrives

A collaborator edits the user's name. The server broadcasts the change:

```
Server broadcasts: { key: 'user:123', value: { id: '123', name: 'New Name', version: 5 } }
       |
       v
WebsocketPubsubClient.onMessage received
       |
       v
RecordCache.set('user', '123', newRecord)
       |
       +---> Version check: is newRecord.version > existing.version?
       |            |
       |            +---> No: Ignore (we have newer data)
       |            +---> Yes: Update cache
       |
       +---> Notify listeners
                |
                v
useRecord's useSyncExternalStore triggers re-render
       |
       v
Component renders with new data
```

Notice the version check. This is how we handle out-of-order messages. If a slow network delivers an old update after a newer one, we just ignore it. Versions are monotonically increasing, so higher version always wins.

### Chapter 3: The User Makes an Edit

Now the user edits the record locally. Here is where optimistic updates shine:

```
User clicks "Save"
       |
       v
write([{ table: 'user', id: '123', updates: { name: 'My Edit' } }])
       |
       +---> RecordCache.optimisticUpdate('user', '123', { name: 'My Edit' })
       |            |
       |            +---> Store original state for potential rollback
       |            +---> Apply updates to cache immediately
       |            +---> Notify listeners (UI updates instantly)
       |            +---> Return rollback function
       |
       +---> TransactionQueue.enqueue(transaction)
       |            |
       |            +---> Add to pending writes
       |            +---> Persist to localStorage (survives refresh!)
       |            +---> If online, start processing
       |
       v
Component re-renders with new data IMMEDIATELY
```

The UI updates the instant you click Save. The actual network request is queued and processed in the background. If you are offline, it waits. If the server is slow, the user does not notice.

### Chapter 4: Transaction Processing

The TransactionQueue processes mutations with sophisticated conflict handling:

```
TransactionQueue.dequeue()
       |
       +---> Batch multiple transactions for efficiency
       |
       +---> submitTransaction(transaction)
       |            |
       |            +---> 200 OK: Success! Remove from queue
       |            |
       |            +---> 400/422: Validation error, rollback
       |            |          |
       |            |          v
       |            |     onRollback(transaction)
       |            |          |
       |            |          v
       |            |     RecordCache.rollback() - restore original state
       |            |
       |            +---> 409 Conflict: Retry immediately (optimistic locking)
       |            |
       |            +---> 500 Server Error: Exponential backoff retry
       |            |
       |            +---> 0 (Offline): Wait for online event
       |
       v
Continue processing queue until empty
```

This is the "offline-first" part. We persist the queue to localStorage, so even if you close the tab and come back tomorrow, your pending changes are still there, waiting to sync.

### Chapter 5: Unmounting and Cleanup

When the component unmounts, we need to clean up, but not too eagerly:

```
Component unmounts
       |
       v
useRecord cleanup runs
       |
       v
SubscriptionCache.unsubscribe('user:123')
       |
       +---> Decrement reference count
       +---> Set cleanup timer (10 seconds default)
       |
       v
10 seconds later...
       |
       +---> Still no subscribers? Actually unsubscribe
       +---> Clear from RecordCache
       +---> WebsocketPubsubClient.unsubscribe('user:123')
```

Why the delay? React. Specifically, React's StrictMode double-mounts components, and React 18's concurrent features can cause components to mount/unmount rapidly. Without the delay, you would see a lot of unnecessary subscribe/unsubscribe chatter.

## Module Architecture

The SDK is organized into focused, composable modules:

```
packages/sdk/src/
  api/             # Type-safe REST client
  cache/           # In-memory caches (RecordCache, LoaderCache)
  storage/         # Persistent storage (IndexedDB/localStorage)
  realtime/        # WebSocket pubsub and React integration
  offline/         # Transaction queue for offline-first
  undo/            # Undo/redo stack
```

Each module is framework-agnostic except for the React hooks in `realtime/`. You can use `RecordCache` or `TransactionQueue` in any JavaScript environment.

## API Reference

### API Client

Type-safe API client built on fetch with automatic auth headers and error handling.

```typescript
import { createApiClient } from '@abe-stack/sdk';

const apiClient = createApiClient({
  baseUrl: 'http://localhost:3000',
  getToken: () => localStorage.getItem('auth_token'),
});

// All methods are type-safe
const user = await apiClient.getCurrentUser();
const authResponse = await apiClient.login({ email, password });
```

### WebsocketPubsubClient

Real-time WebSocket client with automatic reconnection and exponential backoff.

```typescript
import { WebsocketPubsubClient } from '@abe-stack/sdk';

const pubsub = new WebsocketPubsubClient({
  host: 'localhost:3000',
  onMessage: (key, value) => {
    // Handle real-time updates
    cache.set(key.split(':')[0], key.split(':')[1], value);
  },
  onConnect: () => {
    // Resubscribe to active subscriptions
    subscriptionCache.keys().forEach((key) => pubsub.subscribe(key));
  },
});

// Subscribe to topics
pubsub.subscribe('user:123');
pubsub.unsubscribe('user:123');

// Clean up
pubsub.close();
```

**Why reconnection matters:** Networks are unreliable. WebSockets drop. The client handles this transparently with exponential backoff (1s, 2s, 4s, 8s... up to 30s), and also listens for the browser's `online` event to reconnect immediately when you come back from airplane mode.

### RecordCache

Type-safe in-memory cache with version conflict resolution and optimistic updates.

```typescript
import { RecordCache } from '@abe-stack/sdk';

interface User {
  id: string;
  name: string;
  version: number;
}
interface Post {
  id: string;
  title: string;
  version: number;
}

type Tables = { user: User; post: Post };

const cache = new RecordCache<Tables>();

// Basic CRUD
cache.set('user', 'u1', { id: 'u1', name: 'Alice', version: 1 });
const user = cache.get('user', 'u1');
cache.delete('user', 'u1');

// Version-based conflict resolution (only updates if version is higher)
cache.set('user', 'u1', { id: 'u1', name: 'Alice', version: 1 });
cache.set('user', 'u1', { id: 'u1', name: 'Bob', version: 1 }); // Ignored (same version)
cache.set('user', 'u1', { id: 'u1', name: 'Bob', version: 2 }); // Applied

// Optimistic updates with rollback
const rollback = cache.optimisticUpdate('user', 'u1', { name: 'Bob' });
try {
  await api.updateUser('u1', { name: 'Bob' });
} catch {
  rollback?.(); // Restore original state
}

// Subscribe to changes
const unsubscribe = cache.subscribe('user', 'u1', (change) => {
  console.log('Before:', change.before, 'After:', change.after);
});
```

**Why version numbers?** In a distributed system, you cannot trust timestamps (clocks drift). You cannot trust message ordering (networks are FIFO-ish at best). Version numbers are simple, deterministic, and work everywhere.

### RecordStorage

Persistent IndexedDB storage with automatic fallback to localStorage or in-memory.

```typescript
import { RecordStorage, createRecordStorage } from '@abe-stack/sdk';

type Tables = 'user' | 'post';

const storage = createRecordStorage<Tables>({ dbName: 'myapp' });
await storage.ready();

// CRUD operations
await storage.setRecord('user', { id: '1', version: 1, name: 'Alice' });
const user = await storage.getRecord({ table: 'user', id: '1' });
await storage.deleteRecord({ table: 'user', id: '1' });

// Version-based writes (only writes if version is higher)
await storage.setRecord('user', { id: '1', version: 2, name: 'Bob' }); // Writes
await storage.setRecord('user', { id: '1', version: 1, name: 'Alice' }); // Skipped

// Bulk operations
await storage.writeRecordMap({
  user: { '1': { id: '1', version: 1, name: 'Alice' } },
  post: { p1: { id: 'p1', version: 1, title: 'Hello' } },
});

// Query
const users = await storage.queryRecords('user', (u) => u.name.startsWith('A'));
```

**Why the fallback chain?** IndexedDB is great but not universally available (private browsing, old browsers, SSR). localStorage works almost everywhere but has size limits. In-memory is the last resort. The storage backend auto-selects the best available option, so your code never has to care.

### SubscriptionCache

Reference-counted subscription tracking with delayed cleanup to prevent thrashing.

```typescript
import { SubscriptionCache } from '@abe-stack/sdk';

const subscriptionCache = new SubscriptionCache({
  onSubscribe: (key) => pubsub.subscribe(key),
  onUnsubscribe: (key) => {
    pubsub.unsubscribe(key);
    cache.delete(key.split(':')[0], key.split(':')[1]);
  },
  cleanupDelayMs: 10000, // 10 second delay before unsubscribing
});

// In a React hook
useEffect(() => {
  const unsubscribe = subscriptionCache.subscribe(`user:${id}`);
  return unsubscribe; // Delayed cleanup prevents thrashing on re-mount
}, [id]);
```

**Why delayed cleanup?** React StrictMode double-mounts components. Fast navigation causes rapid mount/unmount cycles. Without delayed cleanup, you get a thundering herd of subscribe/unsubscribe messages that overwhelm the server and create race conditions.

### LoaderCache

Request deduplication with TTL for caching async operation results.

```typescript
import { LoaderCache, loadWithCache } from '@abe-stack/sdk';

const userCache = new LoaderCache<User>({ defaultTtlMs: 60000 });

async function getUser(id: string): Promise<User> {
  return loadWithCache(userCache, `user:${id}`, () =>
    fetch(`/api/users/${id}`).then((r) => r.json()),
  );
}

// Multiple concurrent calls deduplicated to single request
const [user1, user2] = await Promise.all([
  getUser('123'),
  getUser('123'), // Same promise as above
]);

// Manual cache control
userCache.invalidate('user:123');
userCache.invalidateByPrefix('user:');
userCache.evictStale();
```

**Why deduplication matters:** Imagine 10 components all mounting and calling `getUser('123')` simultaneously. Without deduplication, you fire 10 identical network requests. With it, you fire one request and share the result.

### TransactionQueue

Offline-first mutation queue with conflict resolution and rollback support.

```typescript
import { createTransactionQueue } from '@abe-stack/sdk';

const queue = createTransactionQueue({
  submitTransaction: async (tx) => {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      body: JSON.stringify(tx),
    });
    return { status: res.status };
  },
  onRollback: async (tx) => {
    // Undo optimistic updates when transaction permanently fails
    for (const op of tx.operations.reverse()) {
      await undoOperation(op);
    }
  },
  onOnlineStatusChange: (isOnline) => {
    console.log('Online:', isOnline);
  },
});

// Enqueue mutation (queued when offline, processed when online)
await queue.enqueue({
  id: 'tx-1',
  authorId: 'user-1',
  timestamp: Date.now(),
  operations: [{ type: 'set', path: ['posts', 'p1', 'title'], value: 'Hello' }],
});

// Track pending writes
const isPending = queue.isPendingWrite({ table: 'posts', id: 'p1' });

// Subscribe to pending status
const unsubscribe = queue.subscribeIsPendingWrite({ table: 'posts', id: 'p1' }, (isPending) =>
  console.log('Pending:', isPending),
);
```

**The conflict resolution strategy:**

- **400/422 (Validation error):** Rollback. The data is wrong.
- **403 (Forbidden):** Rollback. User lacks permission.
- **409 (Conflict):** Retry immediately. Optimistic lock failed, try again with fresh data.
- **500 (Server error):** Exponential backoff retry. Server might recover.
- **0 (Offline):** Wait for `online` event. Network is down.

### UndoRedoStack

Generic undo/redo stack with operation grouping support.

```typescript
import { createUndoRedoStack } from '@abe-stack/sdk';

interface TextChange {
  oldText: string;
  newText: string;
  position: number;
}

const history = createUndoRedoStack<TextChange>({
  onUndo: (op) => {
    editor.replaceText(op.data.position, op.data.newText.length, op.data.oldText);
  },
  onRedo: (op) => {
    editor.replaceText(op.data.position, op.data.oldText.length, op.data.newText);
  },
  onStateChange: (state) => {
    undoButton.disabled = !state.canUndo;
    redoButton.disabled = !state.canRedo;
  },
  maxUndoSize: 100,
});

// Push operations
history.push({ oldText: 'Hello', newText: 'Hello World', position: 0 });

// Undo/redo
history.undo();
history.redo();

// Group related operations (undone/redone together)
history.beginGroup();
history.push({ ... });
history.push({ ... });
history.endGroup();

// Or use withGroup helper
history.withGroup(() => {
  history.push({ ... });
  history.push({ ... });
});
```

**Why grouping?** Some user actions involve multiple operations. Dragging a shape might update both position and rotation. When the user hits Cmd+Z, they expect both to undo together, not one at a time.

## React Integration

The SDK provides React hooks that wire everything together:

```typescript
import {
  RealtimeProvider,
  useRecord,
  useRecords,
  useWrite,
  useIsOnline,
  useIsPendingWrite,
  useConnectionState,
  useUndoRedo,
} from '@abe-stack/sdk';

// Wrap your app
function App() {
  return (
    <RealtimeProvider config={{ host: 'localhost:3000' }}>
      <YourApp />
    </RealtimeProvider>
  );
}

// Use hooks in components
function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading } = useRecord<User>('user', userId);
  const { write, isWriting } = useWrite();
  const isPending = useIsPendingWrite('user', userId);
  const isOnline = useIsOnline();
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  const handleSave = async (updates: Partial<User>) => {
    await write([{ table: 'user', id: userId, updates }]);
  };

  if (isLoading) return <Spinner />;
  if (!user) return <NotFound />;

  return (
    <div>
      <h1>{user.name}</h1>
      {isPending && <span>Syncing...</span>}
      {!isOnline && <span>Offline</span>}
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
    </div>
  );
}
```

## Trade-offs and Limitations

We should be honest about what this architecture costs:

**Memory usage:** We keep data in memory. For applications with thousands of records, you will need to implement pagination or virtualization. The cache does support TTL for automatic eviction, but you need to tune it for your use case.

**Complexity:** This is not the simplest way to build a CRUD app. If you are building a simple form that saves to a database, use React Query. This architecture shines when you need instant feedback, offline support, and real-time collaboration.

**Eventual consistency:** The user sees optimistic state that might not match the server. You need to design your UI to handle rollbacks gracefully. Show a toast when something fails. Do not let optimistic updates corrupt your domain logic.

**Version tracking:** Every record needs a version field that increments on each change. If your backend does not support this, you will need to add it.

## Comparison to Similar Patterns

This SDK draws heavy inspiration from [chet-stack](https://github.com/ccorcos/chet-stack). Both share the same core ideas:

- Optimistic updates with rollback
- Version-based conflict resolution
- Reference-counted subscriptions with delayed cleanup
- Offline-first transaction queues

The main differences:

- We use TypeScript generics more aggressively for type safety
- We provide React hooks out of the box
- We integrate with the broader ABE Stack ecosystem (shared types from `@abe-stack/core`)

If you are evaluating this pattern, also look at:

- **Linear's sync engine:** Similar philosophy, battle-tested at scale
- **Replicache:** More sophisticated CRDT-based approach
- **Liveblocks:** Hosted solution with similar mental model

## Getting Started

1. Set up the `RealtimeProvider` at the root of your app
2. Use `useRecord` to fetch and subscribe to records
3. Use `useWrite` to make optimistic mutations
4. Use `useIsOnline` and `useIsPendingWrite` to show sync status

The data flows automatically. Records update in real-time. Mutations queue when offline. Version conflicts resolve deterministically. You focus on building features.

That is the goal, anyway.

---

_Last Updated: 2026-01-21_
