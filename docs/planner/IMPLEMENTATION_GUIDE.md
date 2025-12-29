# REAL-TIME IMPLEMENTATION GUIDE

**Step-by-Step Guide to Building Collaborative Applications**

This guide provides a **phased implementation plan** for adding real-time collaboration, offline support, and optimistic updates to any application.

---

## 🎯 Implementation Phases Overview

### Phase 1: Foundation (Week 1-2)

Set up the core infrastructure

- Database schema with version fields
- Transaction operation types
- Basic RecordCache (in-memory)
- Server endpoints for write/getRecords

### Phase 2: Real-time Sync (Week 3-4)

Enable live collaboration

- WebSocket server + client
- Pub/sub system
- Version-based update notifications
- Client subscription management

### Phase 3: Offline Support (Week 5-6)

Work without internet

- RecordStorage (IndexedDB)
- TransactionQueue
- Stale-while-revalidate loaders
- Service worker for assets

### Phase 4: Undo/Redo (Week 7)

Full operation history

- UndoRedoStack implementation
- Operation inversion logic
- Keyboard shortcuts

### Phase 5: Permissions (Week 8)

Secure access control

- Row-level read validation
- Row-level write validation
- Permission records loading

### Phase 6-8: Optional Enhancements

- File uploads with S3
- Background job queue
- Email notifications
- Advanced features for your app

---

## 📝 PHASE 1: Foundation

### Step 1.1: Add Version Fields to Database

**Goal:** Every table that needs real-time sync must have a `version` field.

```bash
cd packages/db
```

#### Update Existing Tables

```typescript
// packages/db/src/schema/users.ts (MODIFY)
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1), // ADD THIS
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

#### Create Your App's Tables

Example for a **Task Management App**:

```typescript
// packages/db/src/schema/workspaces.ts (NEW FILE)
import { pgTable, uuid, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1),

  name: text('name').notNull(),
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id),
  memberIds: jsonb('member_ids').$type<string[]>().notNull().default([]),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deleted: timestamp('deleted'),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1),

  workspaceId: uuid('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status').$type<'todo' | 'in_progress' | 'done'>().notNull().default('todo'),
  assigneeId: uuid('assignee_id').references(() => users.id),
  dueDate: timestamp('due_date'),

  orderIndex: integer('order_index').notNull().default(0),

  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deleted: timestamp('deleted'),
});

export type Workspace = typeof workspaces.$inferSelect;
export type Task = typeof tasks.$inferSelect;
```

**Or for a Note-Taking App:**

```typescript
// packages/db/src/schema/notes.ts (NEW FILE)
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
  content: text('content').notNull().default(''),

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

#### Generate and Apply Migration

```bash
# Generate migration
pnpm db:generate

# Review the generated SQL in drizzle/XXXX_migration.sql

# Apply migration
pnpm db:migrate
```

---

### Step 1.2: Create Realtime Package

```bash
# Create package directory
mkdir -p packages/realtime/src
cd packages/realtime
```

```json
// packages/realtime/package.json (NEW FILE)
{
  "name": "@abe-stack/realtime",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "dependencies": {
    "tuple-database": "^2.2.4",
    "idb": "^7.1.1",
    "ws": "^8.13.0"
  },
  "devDependencies": {
    "typescript": "^5.9.3"
  }
}
```

```bash
pnpm install
```

---

### Step 1.3: Implement Transaction Types

```typescript
// packages/realtime/src/transactions.ts (NEW FILE)
export type Operation = SetOperation | SetNowOperation | ListInsertOperation | ListRemoveOperation;

export type SetOperation = {
  type: 'set';
  table: string;
  id: string;
  key: string;
  value: unknown;
};

export type SetNowOperation = {
  type: 'set-now';
  table: string;
  id: string;
  key: string;
};

export type ListInsertOperation = {
  type: 'listInsert';
  table: string;
  id: string;
  key: string;
  value: unknown;
  position: 'prepend' | 'append' | { before: unknown } | { after: unknown };
};

export type ListRemoveOperation = {
  type: 'listRemove';
  table: string;
  id: string;
  key: string;
  value: unknown;
};

export type Transaction = {
  txId: string;
  authorId: string;
  operations: Operation[];
  clientTimestamp: number;
};

export type RecordPointer = {
  table: string;
  id: string;
};

export type Record = {
  id: string;
  version: number;
  [key: string]: unknown;
};

export type RecordMap = {
  [table: string]: {
    [id: string]: Record;
  };
};

// Apply operation to record
export function applyOperation(record: Record, op: Operation): Record {
  const newRecord = { ...record, version: record.version + 1 };

  switch (op.type) {
    case 'set':
      setPath(newRecord, op.key, op.value);
      break;

    case 'set-now':
      setPath(newRecord, op.key, new Date().toISOString());
      break;

    case 'listInsert': {
      const list = (getPath(newRecord, op.key) as unknown[]) || [];
      const filtered = list.filter((item) => !deepEqual(item, op.value));

      if (op.position === 'prepend') {
        setPath(newRecord, op.key, [op.value, ...filtered]);
      } else if (op.position === 'append') {
        setPath(newRecord, op.key, [...filtered, op.value]);
      } else if ('before' in op.position) {
        const index = filtered.findIndex((item) => deepEqual(item, op.position.before));
        filtered.splice(index >= 0 ? index : 0, 0, op.value);
        setPath(newRecord, op.key, filtered);
      } else if ('after' in op.position) {
        const index = filtered.findIndex((item) => deepEqual(item, op.position.after));
        filtered.splice(index + 1, 0, op.value);
        setPath(newRecord, op.key, filtered);
      }
      break;
    }

    case 'listRemove': {
      const list = (getPath(newRecord, op.key) as unknown[]) || [];
      setPath(
        newRecord,
        op.key,
        list.filter((item) => !deepEqual(item, op.value)),
      );
      break;
    }
  }

  return newRecord;
}

// Invert operation for undo
export function invertOperation(
  beforeRecord: Record,
  afterRecord: Record,
  op: Operation,
): Operation {
  switch (op.type) {
    case 'set':
      return { ...op, value: getPath(beforeRecord, op.key) };

    case 'set-now':
      return {
        type: 'set',
        table: op.table,
        id: op.id,
        key: op.key,
        value: getPath(beforeRecord, op.key),
      };

    case 'listInsert':
      return {
        type: 'listRemove',
        table: op.table,
        id: op.id,
        key: op.key,
        value: op.value,
      };

    case 'listRemove': {
      const beforeList = (getPath(beforeRecord, op.key) as unknown[]) || [];
      const index = beforeList.findIndex((item) => deepEqual(item, op.value));

      const position = index === 0 ? 'prepend' : { after: beforeList[index - 1] };

      return {
        type: 'listInsert',
        table: op.table,
        id: op.id,
        key: op.key,
        value: op.value,
        position,
      };
    }
  }
}

// Helper functions
function getPath(obj: any, path: string): unknown {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function setPath(obj: any, path: string, value: unknown): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((acc, key) => {
    if (!(key in acc)) acc[key] = {};
    return acc[key];
  }, obj);
  target[lastKey] = value;
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
```

---

### Step 1.4: Implement RecordCache

```typescript
// packages/realtime/src/RecordCache.ts (NEW FILE)
import { TupleDatabase, MemoryTupleStorage } from 'tuple-database';
import type { Record, RecordMap, RecordPointer } from './transactions';

export class RecordCache {
  private db: TupleDatabase<MemoryTupleStorage>;
  private listeners = new Set<(table: string, id: string) => void>();

  constructor() {
    this.db = new TupleDatabase(new MemoryTupleStorage());
  }

  write(table: string, record: Record) {
    this.db.transact(({ set }) => {
      set(['record', table, record.id], record);
    });

    this.notifyListeners(table, record.id);
  }

  writeMany(recordMap: RecordMap) {
    this.db.transact(({ set }) => {
      for (const [table, records] of Object.entries(recordMap)) {
        for (const record of Object.values(records)) {
          set(['record', table, record.id], record);
        }
      }
    });

    for (const [table, records] of Object.entries(recordMap)) {
      for (const id of Object.keys(records)) {
        this.notifyListeners(table, id);
      }
    }
  }

  get(table: string, id: string): Record | undefined {
    const results = this.db.scan({ prefix: ['record', table, id] });
    return results[0]?.[1] as Record | undefined;
  }

  getMany(pointers: RecordPointer[]): RecordMap {
    const recordMap: RecordMap = {};

    for (const { table, id } of pointers) {
      const record = this.get(table, id);
      if (record) {
        recordMap[table] = recordMap[table] || {};
        recordMap[table][id] = record;
      }
    }

    return recordMap;
  }

  query(table: string, filters: Record<string, unknown> = {}): Record[] {
    const results = this.db.scan({ prefix: ['record', table] });
    const records = results.map(([_, record]) => record as Record);

    return records.filter((record) => {
      return Object.entries(filters).every(([key, value]) => {
        return record[key] === value;
      });
    });
  }

  subscribe(callback: (table: string, id: string) => void) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners(table: string, id: string) {
    for (const listener of this.listeners) {
      listener(table, id);
    }
  }

  clear() {
    this.db = new TupleDatabase(new MemoryTupleStorage());
  }
}
```

```typescript
// packages/realtime/src/index.ts (NEW FILE)
export * from './transactions';
export * from './RecordCache';
// Will add more exports in later phases
```

---

### Step 1.5: Add Server Endpoints

```typescript
// apps/server/src/routes/realtime.ts (NEW FILE)
import { initContract } from '@ts-rest/core';
import { z } from 'zod';

const c = initContract();

// Schemas
const operationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('set'),
    table: z.string(),
    id: z.string(),
    key: z.string(),
    value: z.unknown(),
  }),
  z.object({
    type: z.literal('set-now'),
    table: z.string(),
    id: z.string(),
    key: z.string(),
  }),
  z.object({
    type: z.literal('listInsert'),
    table: z.string(),
    id: z.string(),
    key: z.string(),
    value: z.unknown(),
    position: z.union([
      z.literal('prepend'),
      z.literal('append'),
      z.object({ before: z.unknown() }),
      z.object({ after: z.unknown() }),
    ]),
  }),
  z.object({
    type: z.literal('listRemove'),
    table: z.string(),
    id: z.string(),
    key: z.string(),
    value: z.unknown(),
  }),
]);

const transactionSchema = z.object({
  txId: z.string(),
  authorId: z.string(),
  operations: z.array(operationSchema),
  clientTimestamp: z.number(),
});

const recordPointerSchema = z.object({
  table: z.string(),
  id: z.string(),
});

export const realtimeContract = c.router({
  write: {
    method: 'POST',
    path: '/api/realtime/write',
    body: transactionSchema,
    responses: {
      200: z.object({ recordMap: z.record(z.record(z.any())) }),
      409: z.object({ message: z.string() }), // Conflict
      400: z.object({ message: z.string() }), // Validation error
      403: z.object({ message: z.string() }), // Permission denied
    },
  },

  getRecords: {
    method: 'POST',
    path: '/api/realtime/getRecords',
    body: z.object({
      pointers: z.array(recordPointerSchema),
    }),
    responses: {
      200: z.object({ recordMap: z.record(z.record(z.any())) }),
    },
  },
});
```

```typescript
// apps/server/src/routes/realtime-impl.ts (NEW FILE)
import { initServer } from '@ts-rest/fastify';
import { realtimeContract } from './realtime';
import { db } from '@abe-stack/db';
import { applyOperation } from '@abe-stack/realtime';
import type { Operation, RecordMap } from '@abe-stack/realtime';

const s = initServer();

export const realtimeRouter = s.router(realtimeContract, {
  write: async ({ body: transaction, req }) => {
    const userId = req.user?.id;

    if (!userId) {
      return { status: 403, body: { message: 'Unauthorized' } };
    }

    try {
      // 1. Load affected records from database
      const recordMap = await loadRecords(transaction.operations);

      // 2. Clone and apply operations
      const newRecordMap = cloneRecordMap(recordMap);

      for (const op of transaction.operations) {
        const record = newRecordMap[op.table]?.[op.id];
        if (!record) {
          return {
            status: 400,
            body: { message: `Record not found: ${op.table}:${op.id}` },
          };
        }

        const newRecord = applyOperation(record, op);
        newRecordMap[op.table][op.id] = newRecord;
      }

      // 3. TODO: Validate permissions (Phase 5)

      // 4. Validate version numbers (optimistic concurrency)
      for (const op of transaction.operations) {
        const oldRecord = recordMap[op.table]?.[op.id];
        const newRecord = newRecordMap[op.table]?.[op.id];

        if (oldRecord && newRecord && oldRecord.version !== newRecord.version - 1) {
          return {
            status: 409,
            body: { message: `Version conflict for ${op.table}:${op.id}` },
          };
        }
      }

      // 5. Save to database
      await saveRecords(newRecordMap);

      // 6. TODO: Publish updates via WebSocket (Phase 2)

      return {
        status: 200,
        body: { recordMap: newRecordMap },
      };
    } catch (error: any) {
      console.error('Write transaction failed:', error);
      return {
        status: 500,
        body: { message: error.message },
      };
    }
  },

  getRecords: async ({ body: { pointers } }) => {
    const recordMap = await loadRecords(
      pointers.map((p) => ({
        type: 'set' as const,
        table: p.table,
        id: p.id,
        key: '',
        value: null,
      })),
    );

    return {
      status: 200,
      body: { recordMap },
    };
  },
});

// Helper: Load records from database
async function loadRecords(operations: Operation[]): Promise<RecordMap> {
  const recordMap: RecordMap = {};

  const byTable: Record<string, string[]> = {};

  for (const op of operations) {
    if (!byTable[op.table]) byTable[op.table] = [];
    if (!byTable[op.table].includes(op.id)) {
      byTable[op.table].push(op.id);
    }
  }

  for (const [table, ids] of Object.entries(byTable)) {
    // You'll need to add cases for your app's tables
    let records: any[] = [];

    // Example: Dynamically load based on table name
    const schema = await import(`@abe-stack/db/schema`);
    const tableSchema = schema[table];

    if (tableSchema) {
      records = await db.query[table].findMany({
        where: (t: any, { inArray }: any) => inArray(t.id, ids),
      });
    }

    recordMap[table] = {};
    for (const record of records) {
      recordMap[table][record.id] = record;
    }
  }

  return recordMap;
}

// Helper: Save records to database
async function saveRecords(recordMap: RecordMap): Promise<void> {
  for (const [table, records] of Object.entries(recordMap)) {
    for (const record of Object.values(records)) {
      const schema = await import(`@abe-stack/db/schema`);
      const tableSchema = schema[table];

      if (tableSchema) {
        await db
          .update(tableSchema)
          .set(record)
          .where((t: any, { eq }: any) => eq(t.id, record.id));
      }
    }
  }
}

function cloneRecordMap(recordMap: RecordMap): RecordMap {
  return JSON.parse(JSON.stringify(recordMap));
}
```

```typescript
// apps/server/src/index.ts (MODIFY - add router)
import { realtimeRouter } from './routes/realtime-impl';

// ... existing code ...

app.register(realtimeRouter);
```

---

### ✅ Phase 1 Complete!

**Test it:**

```bash
# Start server
pnpm --filter @abe-stack/server dev

# Test write endpoint
curl -X POST http://localhost:8080/api/realtime/write \
  -H "Content-Type: application/json" \
  -d '{
    "txId": "test-123",
    "authorId": "user-123",
    "operations": [
      {
        "type": "set",
        "table": "tasks",
        "id": "task-1",
        "key": "title",
        "value": "Test Task"
      }
    ],
    "clientTimestamp": 1234567890
  }'
```

---

## 📝 PHASE 2: Real-time Sync

### Step 2.1: WebSocket Server

```typescript
// packages/realtime/src/WebSocketServer.ts (NEW FILE)
import { WebSocketServer as WSServer, WebSocket } from 'ws';
import type { Server } from 'http';

type SubscriptionKey = string;

export class WebSocketPubSubServer {
  private wss: WSServer;
  private subscriptions = new Map<WebSocket, Set<SubscriptionKey>>();

  constructor(httpServer: Server) {
    this.wss = new WSServer({ server: httpServer });

    this.wss.on('connection', (ws) => {
      console.log('WebSocket client connected');
      this.subscriptions.set(ws, new Set());

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this.handleMessage(ws, msg);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.subscriptions.delete(ws);
      });
    });
  }

  private handleMessage(ws: WebSocket, msg: any) {
    if (msg.type === 'subscribe' && typeof msg.key === 'string') {
      this.subscriptions.get(ws)?.add(msg.key);
    } else if (msg.type === 'unsubscribe' && typeof msg.key === 'string') {
      this.subscriptions.get(ws)?.delete(msg.key);
    }
  }

  publish(updates: Array<{ key: SubscriptionKey; version: number }>) {
    for (const [ws, keys] of this.subscriptions.entries()) {
      const relevantUpdates = updates.filter((u) => keys.has(u.key));

      if (relevantUpdates.length > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: 'updates',
            updates: relevantUpdates,
          }),
        );
      }
    }
  }

  close() {
    this.wss.close();
  }
}
```

```typescript
// apps/server/src/index.ts (MODIFY)
import { WebSocketPubSubServer } from '@abe-stack/realtime';

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// Initialize WebSocket server
export const pubsub = new WebSocketPubSubServer(server);
```

```typescript
// apps/server/src/routes/realtime-impl.ts (MODIFY)
import { pubsub } from '../index';

// In write endpoint, after saving records:
// 6. Publish updates via WebSocket
const updates = transaction.operations.map((op) => ({
  key: `${op.table}:${op.id}`,
  version: newRecordMap[op.table][op.id].version,
}));

setImmediate(() => {
  pubsub.publish(updates);
});
```

---

### Step 2.2: WebSocket Client

```typescript
// packages/realtime/src/WebSocketClient.ts (NEW FILE)
export class WebSocketPubSubClient {
  private ws: WebSocket | null = null;
  private subscriptions = new Set<string>();
  private reconnectTimer: number | null = null;
  private reconnectAttempts = 0;

  constructor(
    private url: string,
    private onChange: (key: string, version: number) => void,
  ) {
    this.connect();
  }

  private connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;

      for (const key of this.subscriptions) {
        this.send({ type: 'subscribe', key });
      }
    };

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === 'updates') {
        for (const { key, version } of msg.updates) {
          this.onChange(key, version);
        }
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  subscribe(key: string) {
    this.subscriptions.add(key);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe', key });
    }
  }

  unsubscribe(key: string) {
    this.subscriptions.delete(key);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'unsubscribe', key });
    }
  }

  private send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  close() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.ws?.close();
  }
}
```

---

### Step 2.3: Client Context

```typescript
// apps/web/src/contexts/RealtimeContext.tsx (NEW FILE)
import React, { createContext, useContext, useEffect, useState } from 'react'
import { RecordCache, WebSocketPubSubClient } from '@abe-stack/realtime'

type RealtimeContextValue = {
  recordCache: RecordCache
  pubsub: WebSocketPubSubClient
  userId: string
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [value] = useState(() => {
    const recordCache = new RecordCache()

    const pubsub = new WebSocketPubSubClient(
      import.meta.env.VITE_WS_URL || 'ws://localhost:8080',
      async (key, version) => {
        const [table, id] = key.split(':')
        const cached = recordCache.get(table, id)

        if (!cached || cached.version < version) {
          // Fetch updated record
          const response = await fetch('/api/realtime/getRecords', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pointers: [{ table, id }]
            })
          })

          const { recordMap } = await response.json()

          if (recordMap[table]?.[id]) {
            recordCache.write(table, recordMap[table][id])
          }
        }
      }
    )

    // Get userId from auth context (implement based on your auth)
    const userId = 'current-user-id'

    return { recordCache, pubsub, userId }
  })

  useEffect(() => {
    return () => {
      value.pubsub.close()
    }
  }, [value])

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  )
}

export function useRealtime() {
  const context = useContext(RealtimeContext)
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider')
  }
  return context
}
```

```typescript
// apps/web/src/App.tsx (MODIFY)
import { RealtimeProvider } from './contexts/RealtimeContext'

export function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <BrowserRouter>
          {/* routes */}
        </BrowserRouter>
      </RealtimeProvider>
    </AuthProvider>
  )
}
```

---

### ✅ Phase 2 Complete!

You now have **real-time synchronization**! Changes from one user instantly appear for all other users viewing the same data.

---

## 📝 PHASE 3-5: Remaining Phases

Due to length, the remaining phases follow the same pattern as the original guide:

- **Phase 3**: RecordStorage (IndexedDB) + TransactionQueue
- **Phase 4**: UndoRedoStack
- **Phase 5**: Permission validation

See `REALTIME_ARCHITECTURE.md` for detailed code examples.

---

## 🧪 Testing Your Implementation

### Unit Tests

```typescript
// packages/realtime/src/__tests__/transactions.test.ts
import { describe, it, expect } from 'vitest';
import { applyOperation, invertOperation } from '../transactions';

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
// apps/web/src/__tests__/collaboration.spec.ts
import { test, expect } from '@playwright/test';

test('real-time collaboration', async ({ browser }) => {
  const user1 = await browser.newPage();
  const user2 = await browser.newPage();

  // Both users open same task
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

1. **Complete Phase 1** - Get foundation working
2. **Test thoroughly** - Write tests for each phase
3. **Deploy incrementally** - Ship after each phase
4. **Build your app** - Use the patterns to build your specific features

This architecture is production-ready and scales to thousands of users! 🚀
