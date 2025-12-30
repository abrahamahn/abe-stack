# REAL-TIME COLLABORATIVE ARCHITECTURE

**ABE-STACK + CHET-STACK: General-Purpose Boilerplate**

This document provides a **comprehensive architecture** for building real-time, collaborative, offline-first applications by combining the best features from both ABE-STACK and CHET-STACK.

---

## 🎯 What This Architecture Enables

Build **any collaborative application** with:

✅ **Real-time Collaboration** - Multiple users editing simultaneously (Google Docs-style)
✅ **Offline Support** - Work without internet, auto-sync when online
✅ **Optimistic Updates** - Instant UI feedback (0ms perceived latency)
✅ **Undo/Redo** - Full operation history with keyboard shortcuts
✅ **Conflict Resolution** - Automatic last-write-wins strategy
✅ **Type Safety** - End-to-end TypeScript with compile-time validation
✅ **Production Ready** - PostgreSQL, Docker, CI/CD, proper authentication

---

## 📋 Use Cases

This architecture is perfect for:

- **Task Managers** (Trello, Asana, Linear clones)
- **Note-Taking Apps** (Notion, Evernote, Obsidian clones)
- **Collaborative Editors** (Google Docs, Figma, Miro clones)
- **Project Management Tools** (Monday.com, ClickUp clones)
- **CRM/Sales Tools** (Pipedrive, HubSpot clones)
- **Kanban Boards** (Jira, GitHub Projects clones)
- **Spreadsheets** (Airtable, Google Sheets clones)
- **Whiteboarding Tools** (Miro, Excalidraw clones)
- **Chat Applications** (Slack, Discord clones)
- **Any app requiring real-time sync!**

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                          │
├─────────────────────────────────────────────────────────────┤
│  React UI Components                                         │
│    Your app-specific components                              │
│                                                               │
│  State Management Layer                                      │
│    ├── RecordCache (in-memory database)                     │
│    ├── RecordStorage (IndexedDB persistence)                │
│    ├── TransactionQueue (offline write queue)               │
│    ├── UndoRedoStack (operation history)                    │
│    └── React Query (for non-realtime data)                  │
│                                                               │
│  Network Layer                                               │
│    ├── ts-rest API client (type-safe RPC)                   │
│    ├── WebSocket client (real-time pub/sub)                 │
│    └── File uploader (S3 signed URLs)                       │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTP + WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Node.js)                          │
├─────────────────────────────────────────────────────────────┤
│  API Layer (Fastify + ts-rest)                              │
│    ├── /api/realtime/write (transaction processor)          │
│    ├── /api/realtime/getRecords (batch record fetcher)      │
│    └── Your custom endpoints                                │
│                                                               │
│  Real-time Layer                                             │
│    ├── WebSocket server (ws package)                        │
│    ├── PubSub service (in-memory → Redis for scale)         │
│    └── Subscription manager                                  │
│                                                               │
│  Transaction Processor                                       │
│    ├── Load records from database                            │
│    ├── Apply operations (set, listInsert, listRemove)       │
│    ├── Validate versions (optimistic concurrency)           │
│    ├── Check permissions (row-level access control)         │
│    ├── Save to PostgreSQL                                    │
│    └── Publish updates via WebSocket                        │
│                                                               │
│  Background Jobs (Optional)                                  │
│    ├── Task queue (tuple-database → Redis)                  │
│    ├── Email notifications                                   │
│    ├── Data exports                                          │
│    └── Scheduled tasks                                       │
│                                                               │
│  Database Layer                                              │
│    ├── PostgreSQL + Drizzle ORM                             │
│    └── All tables have version fields                        │
│                                                               │
│  Storage Layer (Optional)                                    │
│    ├── S3 / Local FS for file uploads                       │
│    └── Signed URLs for secure access                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Enhanced Monorepo Structure

```
abe-stack/
├── apps/
│   ├── web/                    # Vite + React 19
│   │   └── src/
│   │       ├── components/     # Your app UI components
│   │       ├── pages/          # App pages/routes
│   │       ├── hooks/          # useRecord, useRecords, useCollection
│   │       ├── actions/        # write, undo, redo
│   │       └── contexts/       # RealtimeContext
│   │
│   ├── desktop/                # Electron (optional)
│   ├── mobile/                 # React Native (optional)
│   │
│   └── server/                 # Fastify backend
│       └── src/
│           ├── routes/         # realtime, files, custom routes
│           ├── services/       # WebSocketServer, TaskQueue
│           └── lib/            # permissions, validation helpers
│
├── packages/
│   ├── realtime/               # NEW: Real-time sync engine
│   │   └── src/
│   │       ├── RecordCache.ts      # In-memory database
│   │       ├── RecordStorage.ts    # IndexedDB wrapper
│   │       ├── TransactionQueue.ts # Offline queue
│   │       ├── UndoRedoStack.ts    # Undo/redo state
│   │       ├── WebSocketClient.ts  # Client WebSocket
│   │       ├── WebSocketServer.ts  # Server WebSocket
│   │       └── transactions.ts     # Operation types
│   │
│   ├── db/                     # PostgreSQL + Drizzle ORM
│   │   └── src/
│   │       └── schema/
│   │           ├── users.ts        # Enhanced with version
│   │           └── your-models.ts  # Your app's data models
│   │
│   ├── shared/                 # Shared types & contracts
│   │   └── src/
│   │       ├── contracts/      # ts-rest API contracts
│   │       └── types/          # Shared TypeScript types
│   │
│   ├── storage/                # File storage (existing)
│   ├── ui/                     # Reusable UI components (existing)
│   └── api-client/             # Type-safe API client (existing)
│
└── docs/
    ├── REALTIME_ARCHITECTURE.md        # This file
    ├── IMPLEMENTATION_GUIDE.md         # Step-by-step guide
    └── REALTIME_PATTERNS.md            # Common patterns & examples
```

---

## 🗄️ Database Schema Pattern

### Core Principle: Add `version` to All Tables

Every table that needs real-time sync must have a `version` field:

```typescript
// Example: Task Management App Schema

// packages/db/src/schema/workspaces.ts
import { pgTable, uuid, text, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core';

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1), // Required for sync

  name: text('name').notNull(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  memberIds: jsonb('member_ids').$type<string[]>().notNull().default([]),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deleted: timestamp('deleted'), // Soft delete for undo support
});

export const boards = pgTable('boards', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1),

  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id),
  name: text('name').notNull(),
  color: text('color').default('#3b82f6'),
  orderIndex: integer('order_index').notNull().default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deleted: timestamp('deleted'),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1),

  boardId: uuid('board_id')
    .notNull()
    .references(() => boards.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').$type<'todo' | 'in_progress' | 'done'>().notNull().default('todo'),
  priority: text('priority').$type<'low' | 'medium' | 'high'>().notNull().default('medium'),

  assigneeId: uuid('assignee_id').references(() => users.id),
  dueDate: timestamp('due_date'),

  orderIndex: integer('order_index').notNull().default(0),
  tags: jsonb('tags').$type<string[]>().notNull().default([]),

  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deleted: timestamp('deleted'),
});

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1),

  taskId: uuid('task_id')
    .notNull()
    .references(() => tasks.id),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id),
  text: text('text').notNull(),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deleted: timestamp('deleted'),
});

export type Workspace = typeof workspaces.$inferSelect;
export type Board = typeof boards.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Comment = typeof comments.$inferSelect;
```

### Alternative Example: Note-Taking App

```typescript
// packages/db/src/schema/notes.ts
export const notebooks = pgTable('notebooks', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1),

  name: text('name').notNull(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  sharedWith: jsonb('shared_with').$type<string[]>().notNull().default([]),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deleted: timestamp('deleted'),
});

export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1),

  notebookId: uuid('notebook_id')
    .notNull()
    .references(() => notebooks.id),
  title: text('title').notNull(),
  content: text('content').notNull(), // Rich text / Markdown

  tags: jsonb('tags').$type<string[]>().notNull().default([]),
  isPinned: boolean('is_pinned').notNull().default(false),

  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deleted: timestamp('deleted'),
});
```

---

## 🔄 Transaction System (Operation-Based)

### Operation Types

Instead of sending full records, send **operations** that describe atomic changes:

```typescript
// packages/realtime/src/transactions.ts

export type Operation =
  | SetOperation // Set a field value
  | SetNowOperation // Set field to current timestamp
  | ListInsertOperation // Add item to array
  | ListRemoveOperation; // Remove item from array

export type SetOperation = {
  type: 'set';
  table: string; // e.g., 'tasks', 'comments', 'notes'
  id: string; // Record UUID
  key: string; // Field path (supports dot notation: 'status', 'metadata.color')
  value: unknown; // New value
};

export type SetNowOperation = {
  type: 'set-now';
  table: string;
  id: string;
  key: string; // Typically 'updatedAt'
};

export type ListInsertOperation = {
  type: 'listInsert';
  table: string;
  id: string;
  key: string; // Path to array field: 'tags', 'memberIds'
  value: unknown; // Item to insert
  position: 'prepend' | 'append' | { before: unknown } | { after: unknown };
};

export type ListRemoveOperation = {
  type: 'listRemove';
  table: string;
  id: string;
  key: string;
  value: unknown; // Item to remove
};

export type Transaction = {
  txId: string; // UUID
  authorId: string; // User ID
  operations: Operation[];
  clientTimestamp: number;
};
```

### Common Operation Examples

```typescript
// Change task status
{
  type: 'set',
  table: 'tasks',
  id: 'task-123',
  key: 'status',
  value: 'done'
}

// Assign task to user
{
  type: 'set',
  table: 'tasks',
  id: 'task-123',
  key: 'assigneeId',
  value: 'user-456'
}

// Add tag to task
{
  type: 'listInsert',
  table: 'tasks',
  id: 'task-123',
  key: 'tags',
  value: 'urgent',
  position: 'append'
}

// Add member to workspace
{
  type: 'listInsert',
  table: 'workspaces',
  id: 'workspace-789',
  key: 'memberIds',
  value: 'user-999',
  position: 'append'
}

// Update timestamp
{
  type: 'set-now',
  table: 'tasks',
  id: 'task-123',
  key: 'updatedAt'
}

// Rename note
{
  type: 'set',
  table: 'notes',
  id: 'note-111',
  key: 'title',
  value: 'Updated Title'
}
```

---

## 🌐 Real-Time Synchronization Flow

### Example: User Changes Task Status

**1. Client (Optimistic Update)**

```typescript
// User clicks "Mark as Done" button

const operation: SetOperation = {
  type: 'set',
  table: 'tasks',
  id: 'task-123',
  key: 'status',
  value: 'done',
};

// Apply locally IMMEDIATELY
const oldTask = recordCache.get('tasks', 'task-123');
const newTask = applyOperation(oldTask, operation);

recordCache.write('tasks', newTask); // UI updates instantly!
```

**2. Queue for Server (Offline-Safe)**

```typescript
const transaction: Transaction = {
  txId: crypto.randomUUID(),
  authorId: currentUserId,
  operations: [operation],
  clientTimestamp: Date.now(),
};

transactionQueue.enqueue(transaction);
// Saved to localStorage - works offline!
```

**3. Server Processing**

```typescript
// POST /api/realtime/write

async function handleWrite(transaction: Transaction) {
  // 1. Load current task from PostgreSQL
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, 'task-123'),
  });

  // 2. Validate version (detect conflicts)
  if (task.version !== oldTask.version) {
    return { status: 409 }; // Conflict - client will retry
  }

  // 3. Check permissions
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, task.boardId),
  });

  if (!canEditBoard(currentUserId, board)) {
    return { status: 403 }; // Permission denied
  }

  // 4. Apply operation
  const updatedTask = applyOperation(task, operation);

  // 5. Save to database
  await db
    .update(tasks)
    .set({ status: 'done', version: updatedTask.version })
    .where(eq(tasks.id, 'task-123'));

  // 6. Notify other users via WebSocket
  pubsub.publish([
    {
      key: 'task:task-123',
      version: updatedTask.version,
    },
  ]);

  return { status: 200, body: { recordMap: { tasks: { 'task-123': updatedTask } } } };
}
```

**4. Other Clients (Real-Time Update)**

```typescript
// WebSocket message received
// { type: 'updates', updates: [{ key: 'task:task-123', version: 5 }] }

const cachedTask = recordCache.get('tasks', 'task-123');

if (!cachedTask || cachedTask.version < 5) {
  // Fetch updated task
  const response = await api.getRecords({
    pointers: [{ table: 'tasks', id: 'task-123' }],
  });

  const updatedTask = response.recordMap.tasks['task-123'];

  recordCache.write('tasks', updatedTask); // UI updates reactively!
  recordStorage.write('tasks', updatedTask); // Save to IndexedDB
}
```

**Total Latency:**

- Initiating user: **0ms** (optimistic)
- Server confirms: **50-200ms**
- Other users see change: **100-500ms**

---

## 🎨 Generic React Hooks

```typescript
// apps/web/src/hooks/useRecord.ts
import { useSyncExternalStore } from 'react';
import { useRealtime } from '../contexts/RealtimeContext';

export function useRecord<T>(table: string, id: string): T | undefined {
  const { recordCache } = useRealtime();

  return useSyncExternalStore(
    (callback) =>
      recordCache.subscribe((t, i) => {
        if (t === table && i === id) callback();
      }),
    () => recordCache.get(table, id) as T | undefined,
    () => undefined,
  );
}

// apps/web/src/hooks/useRecords.ts
export function useRecords<T>(table: string, filters: Record<string, unknown> = {}): T[] {
  const { recordCache } = useRealtime();

  return useSyncExternalStore(
    (callback) =>
      recordCache.subscribe((t) => {
        if (t === table) callback();
      }),
    () => recordCache.query(table, filters) as T[],
    () => [],
  );
}

// apps/web/src/hooks/useWrite.ts
export function useWrite() {
  const { recordCache, transactionQueue, userId } = useRealtime();

  return async (operations: Operation[]) => {
    const transaction: Transaction = {
      txId: crypto.randomUUID(),
      authorId: userId,
      operations,
      clientTimestamp: Date.now(),
    };

    // Optimistic update
    for (const op of operations) {
      const record = recordCache.get(op.table, op.id);
      if (record) {
        const newRecord = applyOperation(record, op);
        recordCache.write(op.table, newRecord);
      }
    }

    // Queue for server
    transactionQueue.enqueue(transaction);
  };
}
```

---

## 💡 Usage Examples

### Task Management App

```typescript
// apps/web/src/components/TaskCard.tsx
import { useRecord, useWrite } from '../hooks'
import type { Task } from '@abeahn/db/schema'

export function TaskCard({ taskId }: { taskId: string }) {
  const task = useRecord<Task>('tasks', taskId)
  const write = useWrite()

  if (!task) return <div>Loading...</div>

  const handleStatusChange = async (newStatus: Task['status']) => {
    await write([
      { type: 'set', table: 'tasks', id: taskId, key: 'status', value: newStatus },
      { type: 'set-now', table: 'tasks', id: taskId, key: 'updatedAt' }
    ])
  }

  const handleAddTag = async (tag: string) => {
    await write([
      { type: 'listInsert', table: 'tasks', id: taskId, key: 'tags', value: tag, position: 'append' }
    ])
  }

  return (
    <div className="task-card">
      <h3>{task.title}</h3>
      <p>{task.description}</p>

      <select value={task.status} onChange={(e) => handleStatusChange(e.target.value as Task['status'])}>
        <option value="todo">To Do</option>
        <option value="in_progress">In Progress</option>
        <option value="done">Done</option>
      </select>

      <div className="tags">
        {task.tags.map(tag => (
          <span key={tag} className="tag">{tag}</span>
        ))}
        <button onClick={() => handleAddTag('urgent')}>+ Add Tag</button>
      </div>
    </div>
  )
}
```

### Note-Taking App

```typescript
// apps/web/src/components/NoteEditor.tsx
import { useState, useEffect } from 'react'
import { useRecord, useWrite } from '../hooks'
import { useDebouncedCallback } from 'use-debounce'
import type { Note } from '@abeahn/db/schema'

export function NoteEditor({ noteId }: { noteId: string }) {
  const note = useRecord<Note>('notes', noteId)
  const write = useWrite()
  const [content, setContent] = useState(note?.content || '')

  // Sync with remote changes
  useEffect(() => {
    if (note?.content !== content) {
      setContent(note?.content || '')
    }
  }, [note?.content])

  // Debounce writes (don't send every keystroke)
  const debouncedWrite = useDebouncedCallback((newContent: string) => {
    write([
      { type: 'set', table: 'notes', id: noteId, key: 'content', value: newContent },
      { type: 'set-now', table: 'notes', id: noteId, key: 'updatedAt' }
    ])
  }, 500)

  const handleChange = (newContent: string) => {
    setContent(newContent)
    debouncedWrite(newContent)
  }

  if (!note) return <div>Loading...</div>

  return (
    <div className="note-editor">
      <input
        type="text"
        value={note.title}
        onChange={(e) => write([
          { type: 'set', table: 'notes', id: noteId, key: 'title', value: e.target.value }
        ])}
      />

      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Start writing..."
      />
    </div>
  )
}
```

### Kanban Board

```typescript
// apps/web/src/components/KanbanBoard.tsx
import { useRecords, useWrite } from '../hooks'
import type { Task } from '@abeahn/db/schema'

export function KanbanBoard({ boardId }: { boardId: string }) {
  const tasks = useRecords<Task>('tasks', { boardId })
  const write = useWrite()

  const todoTasks = tasks.filter(t => t.status === 'todo')
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress')
  const doneTasks = tasks.filter(t => t.status === 'done')

  const handleDrop = async (taskId: string, newStatus: Task['status']) => {
    await write([
      { type: 'set', table: 'tasks', id: taskId, key: 'status', value: newStatus },
      { type: 'set-now', table: 'tasks', id: taskId, key: 'updatedAt' }
    ])
  }

  const handleCreateTask = async (status: Task['status']) => {
    const taskId = crypto.randomUUID()

    await write([
      { type: 'set', table: 'tasks', id: taskId, key: 'id', value: taskId },
      { type: 'set', table: 'tasks', id: taskId, key: 'boardId', value: boardId },
      { type: 'set', table: 'tasks', id: taskId, key: 'title', value: 'New Task' },
      { type: 'set', table: 'tasks', id: taskId, key: 'status', value: status },
      { type: 'set', table: 'tasks', id: taskId, key: 'version', value: 1 }
    ])
  }

  return (
    <div className="kanban-board">
      <Column title="To Do" tasks={todoTasks} onDrop={(id) => handleDrop(id, 'todo')} onCreate={() => handleCreateTask('todo')} />
      <Column title="In Progress" tasks={inProgressTasks} onDrop={(id) => handleDrop(id, 'in_progress')} onCreate={() => handleCreateTask('in_progress')} />
      <Column title="Done" tasks={doneTasks} onDrop={(id) => handleDrop(id, 'done')} onCreate={() => handleCreateTask('done')} />
    </div>
  )
}
```

---

## ⏮️ Undo/Redo System

```typescript
// apps/web/src/hooks/useUndoRedo.ts
import { useRealtime } from '../contexts/RealtimeContext'

export function useUndoRedo() {
  const { undoRedoStack } = useRealtime()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault()
        if (e.shiftKey) {
          undoRedoStack.redo()
        } else {
          undoRedoStack.undo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undoRedoStack])

  return {
    undo: () => undoRedoStack.undo(),
    redo: () => undoRedoStack.redo(),
    canUndo: undoRedoStack.canUndo(),
    canRedo: undoRedoStack.canRedo()
  }
}

// Usage in UI
export function UndoRedoButtons() {
  const { undo, redo, canUndo, canRedo } = useUndoRedo()

  return (
    <div className="undo-redo-controls">
      <button onClick={undo} disabled={!canUndo} title="Undo (Cmd+Z)">
        ↶ Undo
      </button>
      <button onClick={redo} disabled={!canRedo} title="Redo (Cmd+Shift+Z)">
        ↷ Redo
      </button>
    </div>
  )
}
```

---

## 🔒 Permission Patterns

```typescript
// apps/server/src/lib/permissions.ts
import type { RecordMap } from '@abeahn/realtime';

export async function validateRead(
  table: string,
  record: any,
  userId: string,
  recordMap: RecordMap,
): Promise<boolean> {
  switch (table) {
    case 'workspaces':
      // Can read if owner or member
      return record.ownerId === userId || record.memberIds.includes(userId);

    case 'boards':
      // Can read if has access to workspace
      const workspace = recordMap.workspaces?.[record.workspaceId];
      return workspace && validateRead('workspaces', workspace, userId, recordMap);

    case 'tasks':
      // Can read if has access to board
      const board = recordMap.boards?.[record.boardId];
      return board && validateRead('boards', board, userId, recordMap);

    case 'notes':
      // Can read if creator or shared with
      return record.createdBy === userId || record.sharedWith?.includes(userId);

    default:
      return false;
  }
}

export async function validateWrite(
  table: string,
  beforeRecord: any,
  afterRecord: any,
  userId: string,
  recordMap: RecordMap,
): Promise<boolean> {
  // Must have read access
  if (!(await validateRead(table, beforeRecord, userId, recordMap))) {
    return false;
  }

  switch (table) {
    case 'workspaces':
      // Only owner can modify workspace
      return beforeRecord.ownerId === userId;

    case 'tasks':
      // Any workspace member can edit tasks
      const board = recordMap.boards?.[beforeRecord.boardId];
      const workspace = board && recordMap.workspaces?.[board.workspaceId];
      return workspace && (workspace.ownerId === userId || workspace.memberIds.includes(userId));

    case 'comments':
      // Only comment author can edit
      return beforeRecord.authorId === userId;

    default:
      return false;
  }
}
```

---

## 📊 Performance Considerations

### Optimizations

1. **Batch Operations** - Combine multiple operations into one transaction
2. **Debounce Writes** - Don't send every keystroke (use 300-500ms debounce)
3. **Subscribe Selectively** - Only subscribe to records you're actively viewing
4. **Virtualize Lists** - Use react-window for long lists
5. **Index Strategically** - Add database indexes for common queries

### Scaling Strategy

**Single Server (MVP)**

- In-memory PubSub
- Single PostgreSQL instance
- Works for 100s of concurrent users

**Horizontal Scaling**

```
Load Balancer
├── API Server 1 (stateless)
├── API Server 2 (stateless)
└── API Server 3 (stateless)

Redis (PubSub + Session Store)
PostgreSQL (with connection pooling)
S3 (file storage)
```

**Database Sharding (Large Scale)**

- Shard by workspace ID or organization ID
- Each shard is independent
- Route requests based on shard key

---

## 🎯 Next Steps

See the companion guides:

- **IMPLEMENTATION_GUIDE.md** - Step-by-step implementation (8 phases)
- **REALTIME_PATTERNS.md** - Common patterns and best practices

---

This architecture gives you **Google Docs-level real-time collaboration** in any application you build! 🚀
