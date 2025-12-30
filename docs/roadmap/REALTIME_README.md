# REAL-TIME COLLABORATIVE ARCHITECTURE

**ABE-STACK Enhanced: General-Purpose Real-Time Collaboration**

This documentation provides a complete architecture for building **Google Docs-style collaborative applications** with real-time synchronization, offline support, and optimistic updates.

---

## 🎯 What This Gives You

✅ **Real-time Collaboration** - Multiple users editing simultaneously
✅ **Offline Support** - Work without internet, auto-sync when online
✅ **Optimistic Updates** - Instant UI feedback (0ms perceived latency)
✅ **Undo/Redo** - Full operation history with keyboard shortcuts
✅ **Conflict Resolution** - Automatic version-based merging
✅ **Type Safety** - End-to-end TypeScript validation
✅ **Production Ready** - PostgreSQL, Docker, CI/CD, authentication

---

## 📚 Documentation

| File                                                       | Description                                      |
| ---------------------------------------------------------- | ------------------------------------------------ |
| **[REALTIME_ARCHITECTURE.md](./REALTIME_ARCHITECTURE.md)** | Complete system architecture and design patterns |
| **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)**   | Step-by-step implementation guide (5 phases)     |
| **[REALTIME_PATTERNS.md](./REALTIME_PATTERNS.md)**         | Common patterns with real-world examples         |
| **This file**                                              | Quick start and overview                         |

---

## 🚀 Quick Start

### 1. Read the Architecture

Start with **[REALTIME_ARCHITECTURE.md](./REALTIME_ARCHITECTURE.md)** to understand:

- How real-time synchronization works
- Database schema patterns (version fields)
- Operation-based transactions
- Client-side caching (RecordCache + IndexedDB)
- WebSocket pub/sub system

### 2. Follow the Implementation Guide

**[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** provides 5 phases:

**Phase 1: Foundation (Week 1-2)**

- Add `version` fields to database tables
- Create transaction operation types
- Implement RecordCache (in-memory)
- Add server endpoints

**Phase 2: Real-time Sync (Week 3-4)**

- WebSocket server + client
- Pub/sub system
- Version-based updates

**Phase 3: Offline Support (Week 5-6)**

- IndexedDB persistence
- Transaction queue
- Stale-while-revalidate

**Phase 4: Undo/Redo (Week 7)**

- Operation inversion
- Keyboard shortcuts

**Phase 5: Permissions (Week 8)**

- Row-level access control

### 3. Use the Patterns

**[REALTIME_PATTERNS.md](./REALTIME_PATTERNS.md)** shows how to:

- Create/update/delete records
- Add comments and threads
- Upload files
- Show presence indicators
- Implement sharing/permissions
- Handle collaborative lists

---

## 💡 Example Use Cases

### Task Management (Trello/Asana/Linear)

```typescript
// Change task status (real-time sync + offline support)
const write = useWrite();

await write([
  { type: 'set', table: 'tasks', id: taskId, key: 'status', value: 'done' },
  { type: 'set-now', table: 'tasks', id: taskId, key: 'updatedAt' },
]);
```

### Note-Taking (Notion/Evernote)

```typescript
// Edit note content with debouncing
const debouncedWrite = useDebouncedCallback((content: string) => {
  write([
    { type: 'set', table: 'notes', id: noteId, key: 'content', value: content },
    { type: 'set-now', table: 'notes', id: noteId, key: 'updatedAt' },
  ]);
}, 500);
```

### Kanban Boards (Jira/GitHub Projects)

```typescript
// Drag task between columns
await write([
  { type: 'set', table: 'tasks', id: taskId, key: 'status', value: newColumn },
  { type: 'set-now', table: 'tasks', id: taskId, key: 'updatedAt' },
]);
```

---

## 🏗️ Architecture Overview

```
CLIENT (Browser)
├── React Components (your app UI)
├── RecordCache (in-memory database)
├── RecordStorage (IndexedDB persistence)
├── TransactionQueue (offline queue)
├── UndoRedoStack (operation history)
└── WebSocket Client (real-time sync)
         │
         │ HTTP + WebSocket
         ▼
SERVER (Node.js)
├── Fastify + ts-rest (API endpoints)
├── WebSocket Server (pub/sub)
├── Transaction Processor (validate + save)
├── PostgreSQL + Drizzle ORM
└── Background Jobs (optional)
```

---

## 🔄 How It Works

### 1. User Makes Change

```typescript
// User clicks "Mark as Done"
const operation = {
  type: 'set',
  table: 'tasks',
  id: 'task-123',
  key: 'status',
  value: 'done',
};
```

### 2. Apply Optimistically (Instant UI)

```typescript
// Update local cache immediately
const newTask = applyOperation(oldTask, operation);
recordCache.write('tasks', newTask); // UI updates now!
```

### 3. Queue for Server (Offline-Safe)

```typescript
// Save to localStorage, will retry when online
transactionQueue.enqueue(transaction);
```

### 4. Server Validates & Saves

```typescript
// Check version (conflict detection)
if (task.version !== expectedVersion) {
  return { status: 409 }; // Conflict - client retries
}

// Check permissions
if (!canEdit(user, task)) {
  return { status: 403 }; // Denied
}

// Save to PostgreSQL
await db.update(tasks).set({ status: 'done', version: version + 1 });

// Notify other users via WebSocket
pubsub.publish([{ key: 'task:task-123', version: newVersion }]);
```

### 5. Other Users Get Update

```typescript
// WebSocket message: task:task-123 version 5
if (cachedVersion < 5) {
  // Fetch updated task
  const task = await api.getRecords([{ table: 'tasks', id: 'task-123' }]);
  recordCache.write('tasks', task); // Their UI updates!
}
```

**Total Latency:**

- Initiating user: **0ms** (optimistic)
- Server confirms: **50-200ms**
- Other users: **100-500ms**

---

## 🗄️ Database Schema Pattern

**Key Principle:** Every table needs a `version` field

```typescript
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1), // Required!

  title: text('title').notNull(),
  status: text('status').$type<'todo' | 'in_progress' | 'done'>().notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deleted: timestamp('deleted'), // Soft delete for undo
});
```

---

## 🎨 React Hooks

### useRecord - Subscribe to Single Record

```typescript
const task = useRecord<Task>('tasks', taskId);

// Automatically updates when record changes (locally or from server)
```

### useRecords - Subscribe to Multiple Records

```typescript
const tasks = useRecords<Task>('tasks', { boardId: 'board-123' });

// Filters deleted records
const activeTasks = tasks.filter((t) => !t.deleted);
```

### useWrite - Optimistic Updates

```typescript
const write = useWrite();

await write([{ type: 'set', table: 'tasks', id: taskId, key: 'status', value: 'done' }]);
```

### useUndoRedo - Operation History

```typescript
const { undo, redo, canUndo, canRedo } = useUndoRedo();

// Automatically handles Cmd+Z / Cmd+Shift+Z
```

---

## 📊 Performance

### Optimizations

- **Batch operations** - Combine multiple changes into one transaction
- **Debounce writes** - Don't send every keystroke (500ms recommended)
- **Subscribe selectively** - Only subscribe to records you're viewing
- **Virtualize lists** - Use react-window for 1000+ items

### Scaling

**MVP (100s of users)**

- Single server
- In-memory pub/sub
- PostgreSQL

**Production (1000s of users)**

- Multiple stateless API servers
- Redis pub/sub
- PostgreSQL with connection pooling

**Large Scale (10,000s of users)**

- Load balancer
- Database sharding by workspace/organization
- Redis cluster
- S3 for files

---

## 🔒 Security

### Authentication

- JWT tokens (existing ABE-STACK auth)
- WebSocket auth via token

### Authorization

- Row-level permissions on all operations
- Validate read access before returning data
- Validate write access before saving changes

### Data Validation

- Zod schemas for all API inputs
- Version number checks (optimistic concurrency)
- File size limits

---

## 🧪 Testing

### Unit Tests

```typescript
describe('Transaction operations', () => {
  it('should apply set operation', () => {
    const record = { id: '1', version: 1, status: 'todo' };
    const op = { type: 'set', table: 'tasks', id: '1', key: 'status', value: 'done' };

    const result = applyOperation(record, op);

    expect(result.status).toBe('done');
    expect(result.version).toBe(2);
  });
});
```

### E2E Tests

```typescript
test('real-time collaboration', async ({ browser }) => {
  const user1 = await browser.newPage();
  const user2 = await browser.newPage();

  await user1.goto('/tasks/task-1');
  await user2.goto('/tasks/task-1');

  // User 1 changes status
  await user1.selectOption('[name=status]', 'done');

  // User 2 sees update within 2 seconds
  await expect(user2.locator('[name=status]')).toHaveValue('done', { timeout: 2000 });
});
```

---

## 🎯 Next Steps

1. **Read REALTIME_ARCHITECTURE.md** - Understand the full system
2. **Follow IMPLEMENTATION_GUIDE.md** - Build phase by phase
3. **Use REALTIME_PATTERNS.md** - Copy/paste common patterns
4. **Start building!** - Apply to your specific use case

---

## 🤝 What You Get vs. ABE-STACK (Original)

| Feature               | ABE-STACK (Original)  | With Real-Time Architecture |
| --------------------- | --------------------- | --------------------------- |
| Multi-platform        | ✅ Web/Desktop/Mobile | ✅ Web/Desktop/Mobile       |
| Type-safe API         | ✅ ts-rest            | ✅ ts-rest                  |
| PostgreSQL            | ✅ Drizzle ORM        | ✅ Drizzle ORM + versions   |
| Authentication        | ✅ JWT                | ✅ JWT                      |
| Real-time sync        | ❌                    | ✅ WebSocket pub/sub        |
| Offline support       | ❌                    | ✅ IndexedDB + queue        |
| Optimistic updates    | ❌                    | ✅ 0ms perceived latency    |
| Undo/redo             | ❌                    | ✅ Full history             |
| Collaboration         | ❌                    | ✅ Multi-user editing       |
| Conflict resolution   | ❌                    | ✅ Version-based            |
| Row-level permissions | ❌                    | ✅ Full validation          |

---

## 📚 Inspiration

This architecture combines the best of:

**ABE-STACK**

- Modern monorepo (Turborepo)
- Production database (PostgreSQL + Drizzle)
- Type-safe APIs (ts-rest)
- Multi-platform support
- DevOps tooling (Docker, CI/CD)

**CHET-STACK**

- Real-time WebSocket sync
- Offline support (IndexedDB)
- Operation-based transactions
- Undo/redo with inversion
- Version-based conflict resolution
- Row-level permissions

**Result:** Production-ready real-time collaboration for any app! 🚀

---

## 💬 Questions?

- Architecture questions → See [REALTIME_ARCHITECTURE.md](./REALTIME_ARCHITECTURE.md)
- Implementation help → See [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
- Code examples → See [REALTIME_PATTERNS.md](./REALTIME_PATTERNS.md)

Happy building! 🎉
