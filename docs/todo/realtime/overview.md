# Real-Time Overview

**Last Updated: January 10, 2026**

Quick start guide for ABE Stack's real-time collaboration features.

---

## What This Enables

Build **any collaborative application** with:

- **Real-time Collaboration** - Multiple users editing simultaneously (Google Docs-style)
- **Offline Support** - Work without internet, auto-sync when online
- **Optimistic Updates** - Instant UI feedback (0ms perceived latency)
- **Undo/Redo** - Full operation history with keyboard shortcuts
- **Conflict Resolution** - Automatic last-write-wins strategy
- **Type Safety** - End-to-end TypeScript with compile-time validation

---

## Use Cases

This architecture is perfect for:

- **Task Managers** - Trello, Asana, Linear clones
- **Note-Taking Apps** - Notion, Evernote, Obsidian clones
- **Collaborative Editors** - Google Docs, Figma, Miro clones
- **Project Management** - Monday.com, ClickUp clones
- **Kanban Boards** - Jira, GitHub Projects clones
- **Chat Applications** - Slack, Discord clones
- **Any app requiring real-time sync**

---

## Quick Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                      │
├─────────────────────────────────────────────────────────┤
│  React Components                                        │
│    │                                                     │
│  State Management                                        │
│    ├── RecordCache (in-memory)                          │
│    ├── RecordStorage (IndexedDB)                        │
│    ├── TransactionQueue (offline writes)                │
│    └── UndoRedoStack (operation history)                │
│    │                                                     │
│  Network                                                 │
│    ├── ts-rest client (HTTP)                            │
│    └── WebSocket client (real-time)                     │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    SERVER (Node.js)                      │
├─────────────────────────────────────────────────────────┤
│  API (Fastify + ts-rest)                                │
│    ├── /api/realtime/write                              │
│    └── /api/realtime/getRecords                         │
│                                                          │
│  Real-time (WebSocket)                                   │
│    ├── PubSub service                                   │
│    └── Subscription manager                             │
│                                                          │
│  Database (PostgreSQL + Drizzle)                        │
│    └── All tables have version fields                   │
└─────────────────────────────────────────────────────────┘
```

---

## How It Works

### 1. User Makes a Change

```typescript
// User clicks "Mark as Done"
await write([{ type: 'set', table: 'tasks', id: 'task-123', key: 'status', value: 'done' }]);
```

### 2. Optimistic Update

```typescript
// Cache updates IMMEDIATELY (0ms)
recordCache.write('tasks', { ...task, status: 'done' });
// UI re-renders instantly
```

### 3. Queue for Server

```typescript
// Transaction queued (works offline)
transactionQueue.enqueue({
  txId: crypto.randomUUID(),
  operations: [...],
  timestamp: Date.now()
});
```

### 4. Server Processes

```typescript
// Server validates, saves, broadcasts
await db.update(tasks).set({ status: 'done' });
pubsub.publish([{ key: 'tasks:task-123', version: 5 }]);
```

### 5. Other Users See Update

```typescript
// WebSocket: { type: 'updates', updates: [{ key: 'tasks:task-123', version: 5 }] }
// Client fetches new version, cache updates, UI re-renders
```

**Total latency:**

- Initiating user: **0ms** (optimistic)
- Other users: **100-500ms** (via WebSocket)

---

## React Usage

```typescript
// Read a record (auto-subscribes to updates)
function TaskCard({ taskId }: { taskId: string }) {
  const task = useRecord<Task>('tasks', taskId);
  const write = useWrite();

  if (!task) return <Skeleton />;

  return (
    <div>
      <h3>{task.title}</h3>
      <select
        value={task.status}
        onChange={(e) => write([
          { type: 'set', table: 'tasks', id: taskId, key: 'status', value: e.target.value }
        ])}
      >
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>
    </div>
  );
}
```

---

## Implementation Phases

| Phase | Description | Deliverable                                                |
| ----- | ----------- | ---------------------------------------------------------- |
| 1     | Foundation  | Database versions, RecordCache, write/getRecords endpoints |
| 2     | Real-time   | WebSocket server/client, pub/sub, subscriptions            |
| 3     | Offline     | IndexedDB storage, transaction queue, sync on reconnect    |
| 4     | Undo/Redo   | Operation history, inversion, keyboard shortcuts           |
| 5     | Permissions | Row-level read/write validation                            |

Each phase is independently useful. You can ship after Phase 1 for basic sync, add more phases as needed.

---

## Getting Started

1. Read [Architecture](./architecture.md) for detailed design
2. Follow [Implementation Guide](./implementation-guide.md) step-by-step
3. Reference [Patterns](./patterns.md) for common use cases

---

## Related Documentation

- [Architecture Overview](../index.md)
- [CHET-Stack Comparison](../chet-comparison.md)
- [Realtime Architecture](./architecture.md)
- [Implementation Guide](./implementation-guide.md)
- [Patterns](./patterns.md)
