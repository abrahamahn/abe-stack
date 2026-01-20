# @abe-stack/sdk

Type-safe API client and client-side state management for ABE Stack applications.

## Installation

```bash
pnpm add @abe-stack/sdk
```

## Features

### API Client

Type-safe API client built on `@ts-rest/react-query` with React Query integration.

```typescript
import { createApiClient, createReactQueryClient } from '@abe-stack/sdk';
import { QueryClientProvider } from '@tanstack/react-query';

const apiClient = createApiClient({ baseUrl: 'http://localhost:3000' });
const queryClient = createReactQueryClient({ apiClient });

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
    </QueryClientProvider>
  );
}
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

**Features:**

- Automatic reconnection with exponential backoff
- Online/offline detection for smart reconnection
- Configurable max reconnect attempts and base delay
- Debug logging support

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

**Features:**

- Generic type safety for record tables
- Version-based conflict resolution
- Optimistic updates with rollback
- Change subscriptions (per-record and global)
- TTL support with automatic eviction
- Cache statistics tracking

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

**Features:**

- IndexedDB with localStorage and in-memory fallbacks
- Version-based optimistic concurrency
- Bulk read/write operations
- Query helpers with predicate functions
- Storage quota exceeded error handling
- Change event subscriptions

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

**Features:**

- Reference counting for multiple subscribers to same key
- Delayed cleanup prevents React StrictMode double-mount thrashing
- Callbacks for subscription lifecycle management
- Force unsubscribe for immediate cleanup

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

**Features:**

- Request deduplication - concurrent requests share the same promise
- TTL-based automatic expiration
- Auto-eviction of stale entries on access
- Invalidation by key, prefix, or predicate
- Loader state tracking (pending, resolved, rejected)

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

**Features:**

- Queue mutations when offline, auto-process when online
- Batch processing for efficiency
- Conflict resolution with retry (exponential backoff for server errors)
- Rollback callback for permanent failures
- Persistence to localStorage
- Pending write tracking with subscriptions
- Online/offline status callbacks

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

**Features:**

- Generic operation data type
- Operation grouping for batch undo/redo
- Configurable max stack size
- State change callbacks
- Stack inspection (peek, getUndoStack, getRedoStack)

## Persistence Utilities

Additional utilities for React Query persistence and offline support:

```typescript
import { createQueryPersister, MutationQueue, idbStorage } from '@abe-stack/sdk';

// Persist React Query cache to IndexedDB
const persister = createQueryPersister({
  storage: idbStorage,
  key: 'app-cache',
});

// Legacy mutation queue (for simpler offline scenarios)
const mutationQueue = createMutationQueue({
  storage: localStorageQueue,
});
```

## Architecture

The SDK is organized into focused modules:

```
packages/sdk/src/
  cache/           # RecordCache, RecordStorage, LoaderCache
  offline/         # TransactionQueue
  persistence/     # MutationQueue, QueryPersister, idbStorage
  pubsub/          # WebsocketPubsubClient
  subscriptions/   # SubscriptionCache
  undo/            # UndoRedoStack
  client.ts        # API client
  react-query.ts   # React Query integration
```

All modules are framework-agnostic except `react-query.ts` which provides React Query hooks.
