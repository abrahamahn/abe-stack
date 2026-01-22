# @abe-stack/sdk

> Optimistic-first data layer.

Type-safe API client and client-side state management. The client is the optimistic source of truth. When you click "Save," UI updates instantly. Network requests happen in the background with automatic retry and conflict resolution.

## Features

- type-safe API client (ts-rest) 🔒
- optimistic updates with rollback ⚡
- version-based conflict resolution 🔄
- offline-first transaction queue 📴
- real-time WebSocket subscriptions 🔔
- push notifications with service worker 🔔
- search query builder with URL sync 🔍
- IndexedDB persistence 💾
- undo/redo stack ↩️
- React hooks 🎣
- ~700 tests passing ✅

## Installation

```bash
pnpm add @abe-stack/sdk
```

## Quick Start

```typescript
import { RealtimeProvider, useRecord, useWrite } from '@abe-stack/sdk';

// Wrap your app
function App() {
  return (
    <RealtimeProvider config={{ host: 'localhost:3000' }}>
      <YourApp />
    </RealtimeProvider>
  );
}

// Use in components
function UserProfile({ userId }) {
  const { data: user, isLoading } = useRecord('user', userId);
  const { write } = useWrite();

  const handleSave = (updates) => {
    write([{ table: 'user', id: userId, updates }]); // Instant UI update
  };

  return <div>{user?.name}</div>;
}
```

## Modules

### API Client (`src/api/`)

Type-safe REST clients with automatic auth headers.

**Standalone Client** (simple fetch-based):

```typescript
import { createApiClient } from '@abe-stack/sdk';

const api = createApiClient({
  baseUrl: 'http://localhost:3000',
  getToken: () => localStorage.getItem('token'),
});

// Auth methods
const authResponse = await api.login({ email, password });
const registerResponse = await api.register({ email, password });
const user = await api.getCurrentUser();
await api.logout();
await api.refresh();

// Password reset
await api.forgotPassword({ email });
await api.resetPassword({ token, newPassword });

// Email verification
await api.verifyEmail({ token });
await api.resendVerification({ email });
```

**React Query Client** (with caching and hooks):

```typescript
import { createReactQueryClient } from '@abe-stack/sdk';

const api = createReactQueryClient({
  baseUrl: 'http://localhost:3000',
  getToken: () => useAuthStore.getState().token,
  onUnauthorized: () => useAuthStore.getState().logout(),
});

// In components - automatic caching and refetching
const { data: user, isLoading } = api.auth.getCurrentUser.useQuery();
const { mutate: login } = api.auth.login.useMutation();
```

### RecordCache (`src/cache/`)

In-memory cache with version conflict resolution and optimistic updates.

```typescript
import { RecordCache } from '@abe-stack/sdk';

const cache = new RecordCache<{ user: User; post: Post }>();

// Basic CRUD
cache.set('user', 'u1', { id: 'u1', name: 'Alice', version: 1 });
const user = cache.get('user', 'u1');

// Version-based conflict resolution
cache.set('user', 'u1', { ...user, version: 1 }); // Ignored (same version)
cache.set('user', 'u1', { ...user, version: 2 }); // Applied

// Optimistic update with rollback
const rollback = cache.optimisticUpdate('user', 'u1', { name: 'Bob' });
try {
  await api.updateUser('u1', { name: 'Bob' });
} catch {
  rollback?.(); // Restore original
}
```

### LoaderCache (`src/cache/`)

Request deduplication with TTL.

```typescript
import { LoaderCache, loadWithCache } from '@abe-stack/sdk';

const cache = new LoaderCache<User>({ defaultTtlMs: 60000 });

// Multiple concurrent calls = single request
const [user1, user2] = await Promise.all([
  loadWithCache(cache, 'user:123', () => fetchUser('123')),
  loadWithCache(cache, 'user:123', () => fetchUser('123')), // Deduped
]);
```

### WebsocketPubsubClient (`src/realtime/`)

Real-time subscriptions with automatic reconnection.

```typescript
import { WebsocketPubsubClient } from '@abe-stack/sdk';

const pubsub = new WebsocketPubsubClient({
  host: 'localhost:3000',
  onMessage: (key, value) => cache.set(/*...*/),
  onConnect: () => resubscribeAll(),
});

pubsub.subscribe('user:123');
```

### TransactionQueue (`src/offline/`)

Offline-first mutation queue with conflict resolution.

```typescript
import { createTransactionQueue } from '@abe-stack/sdk';

const queue = createTransactionQueue({
  submitTransaction: async (tx) =>
    fetch('/api/transactions', {
      /*...*/
    }),
  onRollback: async (tx) => undoOptimisticUpdates(tx),
});

// Queued when offline, processed when online
await queue.enqueue({ operations: [{ type: 'set', path: ['user', '1'], value }] });
```

**Conflict resolution:**

- `400/422` → Rollback (validation error)
- `409` → Retry immediately (optimistic lock)
- `500` → Exponential backoff
- `0` (offline) → Wait for online

### RecordStorage (`src/storage/`)

Persistent IndexedDB with localStorage/memory fallback.

```typescript
import { createRecordStorage } from '@abe-stack/sdk';

const storage = createRecordStorage({ dbName: 'myapp' });
await storage.setRecord('user', { id: '1', version: 1, name: 'Alice' });
const user = await storage.getRecord({ table: 'user', id: '1' });
```

### MutationQueue (`src/storage/`)

Offline mutation handling with exponential backoff.

```typescript
import { createMutationQueue } from '@abe-stack/sdk';

const queue = createMutationQueue({
  maxRetries: 3,
  retryDelay: 1000,
  onProcess: async (mutation) => {
    await api.submitMutation(mutation);
  },
});

await queue.enqueue({
  id: 'mut-1',
  type: 'update-user',
  data: { userId: '1', name: 'Alice' },
  timestamp: Date.now(),
  retries: 0,
});
```

### QueryPersister (`src/storage/`)

TanStack Query persistence to IndexedDB.

```typescript
import { createQueryPersister, clearQueryCache } from '@abe-stack/sdk';
import { QueryClient } from '@tanstack/react-query';

const queryClient = new QueryClient();
const persister = createQueryPersister({
  queryClient,
  dbName: 'myapp-queries',
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
});

// Clear persisted cache
await clearQueryCache('myapp-queries');
```

### UndoRedoStack (`src/undo/`)

Generic undo/redo with operation grouping.

```typescript
import { createUndoRedoStack } from '@abe-stack/sdk';

const history = createUndoRedoStack({
  onUndo: (op) => applyReverse(op),
  onRedo: (op) => applyForward(op),
});

history.push({ oldValue, newValue });
history.undo();
history.redo();
```

### Search (`src/search/`)

Type-safe query builder with URL serialization.

```typescript
import {
  createClientSearchQuery,
  eq,
  contains,
  serializeToURLParams,
  useSearch,
  useInfiniteSearch,
} from '@abe-stack/sdk';

// Build queries
const query = createClientSearchQuery<User>()
  .whereEq('status', 'active')
  .whereContains('name', 'alice')
  .sortBy('createdAt', 'desc')
  .page(1)
  .limit(20)
  .build();

// Serialize to URL
const params = serializeToURLParams(query);
// ?filters=eq(status,active),contains(name,alice)&sort=createdAt:desc&page=1&limit=20

// React hooks with automatic caching
const { data, isLoading, setSearch, setPage } = useSearch(async (query) => api.searchUsers(query), {
  initialQuery: query,
  syncToUrl: true,
});

// Infinite scrolling
const { data, fetchNextPage, hasNextPage } = useInfiniteSearch(
  async (query) => api.searchUsers(query),
  { initialQuery: query },
);
```

### Push Notifications (`src/notifications/`)

Client and hooks for push notification management.

```typescript
import {
  createNotificationClient,
  usePushSubscription,
  useNotificationPreferences,
  usePushPermission,
} from '@abe-stack/sdk';

// Client
const client = createNotificationClient({
  baseUrl: 'http://localhost:3000',
  getToken: () => localStorage.getItem('token'),
});

const vapidKey = await client.getVapidKey();
await client.subscribe({ subscription: pushSubscription, deviceId });
await client.updatePreferences({ emailEnabled: true, pushEnabled: true });
await client.testNotification();

// React hooks
function NotificationSettings() {
  const { isSupported, isSubscribed, subscribe, unsubscribe } = usePushSubscription({
    clientConfig: { baseUrl: '/api', getToken },
  });

  const { preferences, isLoading, updatePreferences } = useNotificationPreferences({
    clientConfig: { baseUrl: '/api', getToken },
  });

  const { permission, requestPermission } = usePushPermission();
}
```

## React Hooks

```typescript
import {
  // Realtime Data
  useRecord, // Subscribe to single record
  useRecords, // Subscribe to multiple records
  useWrite, // Optimistic mutations
  useIsOnline, // Network status
  useIsPendingWrite, // Sync status for record
  useConnectionState, // WebSocket state
  useUndoRedo, // Undo/redo controls

  // Search
  useSearch, // Paginated search with React Query
  useInfiniteSearch, // Infinite scroll search
  useDebounceSearch, // Debounced search input
  useSearchParams, // URL search param sync

  // Notifications
  usePushSubscription, // Manage push subscription
  useNotificationPreferences, // Notification preferences
  usePushPermission, // Push permission status
  useTestNotification, // Send test notification
} from '@abe-stack/sdk';

function Component() {
  // Realtime
  const { data, isLoading } = useRecord('user', userId);
  const { write, isWriting } = useWrite();
  const isPending = useIsPendingWrite('user', userId);
  const isOnline = useIsOnline();
  const { undo, redo, canUndo, canRedo } = useUndoRedo();

  // Search
  const { data: results, setSearch, setPage } = useSearch(searchFn);
  const { data: infiniteResults, fetchNextPage } = useInfiniteSearch(searchFn);

  // Notifications
  const { isSubscribed, subscribe } = usePushSubscription(config);
  const { preferences, updatePreferences } = useNotificationPreferences(config);
}
```

## Project Structure

```
packages/sdk/src/
├── api/              # Type-safe REST clients (standalone + React Query)
├── cache/            # RecordCache, LoaderCache
├── storage/          # IndexedDB persistence, MutationQueue, QueryPersister
├── realtime/         # WebSocket pubsub + React context/hooks
├── offline/          # TransactionQueue
├── undo/             # UndoRedoStack
├── search/           # Query builder, URL serialization, hooks
├── notifications/    # Push notification client and hooks
├── errors.ts         # Typed error classes
└── queryKeys.ts      # React Query key factories
```

## Trade-offs

**Memory usage:** Data kept in memory. Implement pagination for large datasets.

**Complexity:** Not for simple CRUD. Use React Query if you don't need offline/realtime.

**Eventual consistency:** Optimistic state may not match server. Design UI for rollbacks.

**Version tracking:** Every record needs a `version` field that increments on change.

---

[Read the detailed docs](../../docs) for architecture decisions, development workflows, and contribution guidelines.
