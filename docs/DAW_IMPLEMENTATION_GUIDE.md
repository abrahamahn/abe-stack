# DAW IMPLEMENTATION GUIDE: Step-by-Step

This guide provides a **phased implementation plan** for building the hybrid architecture.

---

## 🎯 Implementation Phases

### Phase 1: Foundation (Week 1-2)
- ✅ Database schema with version fields
- ✅ Transaction operation types
- ✅ Basic RecordCache (in-memory)
- ✅ ts-rest endpoints for write/getRecords

### Phase 2: Real-time Sync (Week 3-4)
- ✅ WebSocket server + client
- ✅ Pub/sub system
- ✅ Version-based update notifications
- ✅ Client subscription management

### Phase 3: Offline Support (Week 5-6)
- ✅ RecordStorage (IndexedDB)
- ✅ TransactionQueue
- ✅ Stale-while-revalidate loaders
- ✅ Service worker for assets

### Phase 4: Undo/Redo (Week 7)
- ✅ UndoRedoStack
- ✅ Operation inversion
- ✅ Keyboard shortcuts (Cmd+Z, Cmd+Shift+Z)

### Phase 5: Permissions (Week 8)
- ✅ Row-level validation
- ✅ Project collaborators
- ✅ Read/write rules

### Phase 6: Audio Files (Week 9-10)
- ✅ File upload with signed URLs
- ✅ Background waveform generation
- ✅ Audio metadata extraction
- ✅ Streaming playback

### Phase 7: Background Jobs (Week 11)
- ✅ Task queue system
- ✅ Audio transcoding
- ✅ Project export

### Phase 8: DAW UI (Week 12-16)
- ✅ Timeline component
- ✅ Mixer component
- ✅ Transport controls
- ✅ Waveform visualization
- ✅ Drag-and-drop editing

---

## 📝 PHASE 1: Foundation

### Step 1.1: Add Version Fields to Database

```bash
cd packages/db
```

```typescript
// packages/db/src/schema/users.ts
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1), // NEW
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

```typescript
// packages/db/src/schema/projects.ts (NEW FILE)
import { pgTable, uuid, text, timestamp, integer, jsonb, real, boolean } from 'drizzle-orm/pg-core'
import { users } from './users'

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1),

  name: text('name').notNull(),
  bpm: integer('bpm').notNull().default(120),
  timeSignature: text('time_signature').notNull().default('4/4'),

  createdBy: uuid('created_by').notNull().references(() => users.id),
  collaborators: jsonb('collaborators').$type<string[]>().notNull().default([]),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deleted: timestamp('deleted'),
})

export const tracks = pgTable('tracks', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1),

  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').$type<'audio' | 'midi' | 'bus'>().notNull(),

  volume: real('volume').notNull().default(1.0),
  pan: real('pan').notNull().default(0.0),
  muted: boolean('muted').notNull().default(false),
  solo: boolean('solo').notNull().default(false),

  orderIndex: integer('order_index').notNull().default(0),
  plugins: jsonb('plugins').$type<any[]>().notNull().default([]),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deleted: timestamp('deleted'),
})

export const clips = pgTable('clips', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1),

  trackId: uuid('track_id').notNull().references(() => tracks.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),

  startBeat: real('start_beat').notNull(),
  durationBeats: real('duration_beats').notNull(),

  audioFileId: uuid('audio_file_id'),
  audioStartOffset: real('audio_start_offset').default(0),
  audioEndOffset: real('audio_end_offset').default(0),

  midiData: jsonb('midi_data'),

  gain: real('gain').notNull().default(1.0),
  fadeIn: real('fade_in').notNull().default(0),
  fadeOut: real('fade_out').notNull().default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deleted: timestamp('deleted'),
})

export const audioFiles = pgTable('audio_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1),

  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),

  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),

  storageKey: text('storage_key').notNull(),
  waveformKey: text('waveform_key'),
  peaksData: jsonb('peaks_data').$type<number[]>(),

  durationSeconds: real('duration_seconds').notNull(),
  sampleRate: integer('sample_rate').notNull(),
  channels: integer('channels').notNull(),
  bitDepth: integer('bit_depth'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deleted: timestamp('deleted'),
})

export type Project = typeof projects.$inferSelect
export type Track = typeof tracks.$inferSelect
export type Clip = typeof clips.$inferSelect
export type AudioFile = typeof audioFiles.$inferSelect
```

```bash
# Generate migration
pnpm db:generate

# Apply migration
pnpm db:migrate
```

---

### Step 1.2: Create Transaction Types Package

```bash
# Create new package
mkdir -p packages/realtime/src
cd packages/realtime
```

```json
// packages/realtime/package.json
{
  "name": "@abe-stack/realtime",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "dependencies": {
    "tuple-database": "^2.2.4",
    "idb": "^7.1.1"
  },
  "devDependencies": {
    "@abe-stack/shared": "workspace:*",
    "typescript": "^5.9.3"
  }
}
```

```typescript
// packages/realtime/src/transactions.ts
export type Operation =
  | SetOperation
  | SetNowOperation
  | ListInsertOperation
  | ListRemoveOperation

export type SetOperation = {
  type: 'set'
  table: string
  id: string
  key: string
  value: unknown
}

export type SetNowOperation = {
  type: 'set-now'
  table: string
  id: string
  key: string
}

export type ListInsertOperation = {
  type: 'listInsert'
  table: string
  id: string
  key: string
  value: unknown
  position: 'prepend' | 'append' | { before: unknown } | { after: unknown }
}

export type ListRemoveOperation = {
  type: 'listRemove'
  table: string
  id: string
  key: string
  value: unknown
}

export type Transaction = {
  txId: string
  authorId: string
  operations: Operation[]
  clientTimestamp: number
}

export type RecordPointer = {
  table: string
  id: string
}

export type Record = {
  id: string
  version: number
  [key: string]: unknown
}

export type RecordMap = {
  [table: string]: {
    [id: string]: Record
  }
}

// Apply operation to record
export function applyOperation(record: Record, op: Operation): Record {
  const newRecord = { ...record, version: record.version + 1 }

  switch (op.type) {
    case 'set':
      setPath(newRecord, op.key, op.value)
      break

    case 'set-now':
      setPath(newRecord, op.key, new Date().toISOString())
      break

    case 'listInsert': {
      const list = getPath(newRecord, op.key) as unknown[]
      const filtered = list.filter(item => !deepEqual(item, op.value))

      if (op.position === 'prepend') {
        setPath(newRecord, op.key, [op.value, ...filtered])
      } else if (op.position === 'append') {
        setPath(newRecord, op.key, [...filtered, op.value])
      } else if ('before' in op.position) {
        const index = filtered.findIndex(item => deepEqual(item, op.position.before))
        filtered.splice(index, 0, op.value)
        setPath(newRecord, op.key, filtered)
      } else if ('after' in op.position) {
        const index = filtered.findIndex(item => deepEqual(item, op.position.after))
        filtered.splice(index + 1, 0, op.value)
        setPath(newRecord, op.key, filtered)
      }
      break
    }

    case 'listRemove': {
      const list = getPath(newRecord, op.key) as unknown[]
      setPath(newRecord, op.key, list.filter(item => !deepEqual(item, op.value)))
      break
    }
  }

  return newRecord
}

// Invert operation for undo
export function invertOperation(
  beforeRecord: Record,
  afterRecord: Record,
  op: Operation
): Operation {
  switch (op.type) {
    case 'set':
      return { ...op, value: getPath(beforeRecord, op.key) }

    case 'set-now':
      return {
        type: 'set',
        table: op.table,
        id: op.id,
        key: op.key,
        value: getPath(beforeRecord, op.key)
      }

    case 'listInsert':
      return {
        type: 'listRemove',
        table: op.table,
        id: op.id,
        key: op.key,
        value: op.value
      }

    case 'listRemove': {
      const beforeList = getPath(beforeRecord, op.key) as unknown[]
      const index = beforeList.findIndex(item => deepEqual(item, op.value))

      const position = index === 0 ? 'prepend' : { after: beforeList[index - 1] }

      return {
        type: 'listInsert',
        table: op.table,
        id: op.id,
        key: op.key,
        value: op.value,
        position
      }
    }
  }
}

// Helper functions
function getPath(obj: any, path: string): unknown {
  return path.split('.').reduce((acc, key) => acc?.[key], obj)
}

function setPath(obj: any, path: string, value: unknown): void {
  const keys = path.split('.')
  const lastKey = keys.pop()!
  const target = keys.reduce((acc, key) => {
    if (!(key in acc)) acc[key] = {}
    return acc[key]
  }, obj)
  target[lastKey] = value
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
```

```typescript
// packages/realtime/src/index.ts
export * from './transactions'
export * from './RecordCache'
export * from './RecordStorage'
export * from './TransactionQueue'
export * from './UndoRedoStack'
export * from './WebSocketClient'
export * from './WebSocketServer'
```

---

### Step 1.3: Implement RecordCache

```typescript
// packages/realtime/src/RecordCache.ts
import { TupleDatabase, MemoryTupleStorage } from 'tuple-database'
import type { Record, RecordMap, RecordPointer } from './transactions'

export class RecordCache {
  private db: TupleDatabase<MemoryTupleStorage>
  private listeners = new Set<(table: string, id: string) => void>()

  constructor() {
    this.db = new TupleDatabase(new MemoryTupleStorage())
  }

  write(table: string, record: Record) {
    this.db.transact(({ set }) => {
      set(['record', table, record.id], record)
    })

    this.notifyListeners(table, record.id)
  }

  writeMany(recordMap: RecordMap) {
    this.db.transact(({ set }) => {
      for (const [table, records] of Object.entries(recordMap)) {
        for (const record of Object.values(records)) {
          set(['record', table, record.id], record)
        }
      }
    })

    for (const [table, records] of Object.entries(recordMap)) {
      for (const id of Object.keys(records)) {
        this.notifyListeners(table, id)
      }
    }
  }

  get(table: string, id: string): Record | undefined {
    const results = this.db.scan({ prefix: ['record', table, id] })
    return results[0]?.[1] as Record | undefined
  }

  getMany(pointers: RecordPointer[]): RecordMap {
    const recordMap: RecordMap = {}

    for (const { table, id } of pointers) {
      const record = this.get(table, id)
      if (record) {
        recordMap[table] = recordMap[table] || {}
        recordMap[table][id] = record
      }
    }

    return recordMap
  }

  query(table: string, filters: Record<string, unknown> = {}): Record[] {
    const results = this.db.scan({ prefix: ['record', table] })
    const records = results.map(([_, record]) => record as Record)

    return records.filter(record => {
      return Object.entries(filters).every(([key, value]) => {
        return record[key] === value
      })
    })
  }

  subscribe(callback: (table: string, id: string) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners(table: string, id: string) {
    for (const listener of this.listeners) {
      listener(table, id)
    }
  }

  clear() {
    this.db = new TupleDatabase(new MemoryTupleStorage())
  }
}
```

---

### Step 1.4: Add Write Endpoint (Server)

```typescript
// apps/server/src/routes/realtime.ts (NEW FILE)
import { initContract } from '@ts-rest/core'
import { z } from 'zod'

const c = initContract()

// Schemas
const operationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('set'),
    table: z.string(),
    id: z.string(),
    key: z.string(),
    value: z.unknown()
  }),
  z.object({
    type: z.literal('set-now'),
    table: z.string(),
    id: z.string(),
    key: z.string()
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
      z.object({ after: z.unknown() })
    ])
  }),
  z.object({
    type: z.literal('listRemove'),
    table: z.string(),
    id: z.string(),
    key: z.string(),
    value: z.unknown()
  })
])

const transactionSchema = z.object({
  txId: z.string(),
  authorId: z.string(),
  operations: z.array(operationSchema),
  clientTimestamp: z.number()
})

const recordPointerSchema = z.object({
  table: z.string(),
  id: z.string()
})

export const realtimeContract = c.router({
  write: {
    method: 'POST',
    path: '/api/realtime/write',
    body: transactionSchema,
    responses: {
      200: z.object({
        recordMap: z.record(z.record(z.any()))
      }),
      409: z.object({ message: z.string() }), // Conflict
      400: z.object({ message: z.string() }), // Validation error
      403: z.object({ message: z.string() })  // Permission denied
    }
  },

  getRecords: {
    method: 'POST',
    path: '/api/realtime/getRecords',
    body: z.object({
      pointers: z.array(recordPointerSchema)
    }),
    responses: {
      200: z.object({
        recordMap: z.record(z.record(z.any()))
      })
    }
  }
})
```

```typescript
// apps/server/src/routes/realtime-impl.ts (NEW FILE)
import { initServer } from '@ts-rest/fastify'
import { realtimeContract } from './realtime'
import { db } from '@abe-stack/db'
import { projects, tracks, clips, audioFiles } from '@abe-stack/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import { applyOperation } from '@abe-stack/realtime'
import type { Operation, RecordMap, RecordPointer } from '@abe-stack/realtime'

const s = initServer()

export const realtimeRouter = s.router(realtimeContract, {
  write: async ({ body: transaction, req }) => {
    const userId = req.user?.id // Assuming auth middleware sets req.user

    if (!userId) {
      return { status: 403, body: { message: 'Unauthorized' } }
    }

    try {
      // 1. Load affected records from database
      const recordMap = await loadRecords(transaction.operations)

      // 2. Clone and apply operations
      const newRecordMap = cloneRecordMap(recordMap)

      for (const op of transaction.operations) {
        const record = newRecordMap[op.table]?.[op.id]
        if (!record) {
          return {
            status: 400,
            body: { message: `Record not found: ${op.table}:${op.id}` }
          }
        }

        const newRecord = applyOperation(record, op)
        newRecordMap[op.table][op.id] = newRecord
      }

      // 3. Validate write permissions (simplified for now)
      // TODO: Implement row-level permissions

      // 4. Validate version numbers (optimistic concurrency)
      for (const op of transaction.operations) {
        const oldRecord = recordMap[op.table]?.[op.id]
        const newRecord = newRecordMap[op.table]?.[op.id]

        if (oldRecord && newRecord && oldRecord.version !== newRecord.version - 1) {
          return {
            status: 409,
            body: { message: `Version conflict for ${op.table}:${op.id}` }
          }
        }
      }

      // 5. Write to database
      await saveRecords(newRecordMap)

      // 6. Publish updates via WebSocket (TODO: Phase 2)
      // pubsub.publish(...)

      return {
        status: 200,
        body: { recordMap: newRecordMap }
      }

    } catch (error: any) {
      console.error('Write transaction failed:', error)
      return {
        status: 500,
        body: { message: error.message }
      }
    }
  },

  getRecords: async ({ body: { pointers } }) => {
    const recordMap = await loadRecords(pointers.map(p => ({
      type: 'set' as const,
      table: p.table,
      id: p.id,
      key: '',
      value: null
    })))

    return {
      status: 200,
      body: { recordMap }
    }
  }
})

// Helper: Load records from database
async function loadRecords(operations: Operation[]): Promise<RecordMap> {
  const recordMap: RecordMap = {}

  const byTable: Record<string, string[]> = {}

  for (const op of operations) {
    if (!byTable[op.table]) byTable[op.table] = []
    if (!byTable[op.table].includes(op.id)) {
      byTable[op.table].push(op.id)
    }
  }

  for (const [table, ids] of Object.entries(byTable)) {
    let records: any[] = []

    switch (table) {
      case 'projects':
        records = await db.query.projects.findMany({
          where: inArray(projects.id, ids)
        })
        break
      case 'tracks':
        records = await db.query.tracks.findMany({
          where: inArray(tracks.id, ids)
        })
        break
      case 'clips':
        records = await db.query.clips.findMany({
          where: inArray(clips.id, ids)
        })
        break
      case 'audio_files':
        records = await db.query.audioFiles.findMany({
          where: inArray(audioFiles.id, ids)
        })
        break
    }

    recordMap[table] = {}
    for (const record of records) {
      recordMap[table][record.id] = record
    }
  }

  return recordMap
}

// Helper: Save records to database
async function saveRecords(recordMap: RecordMap): Promise<void> {
  for (const [table, records] of Object.entries(recordMap)) {
    for (const record of Object.values(records)) {
      switch (table) {
        case 'projects':
          await db.update(projects)
            .set(record)
            .where(eq(projects.id, record.id))
          break
        case 'tracks':
          await db.update(tracks)
            .set(record)
            .where(eq(tracks.id, record.id))
          break
        case 'clips':
          await db.update(clips)
            .set(record)
            .where(eq(clips.id, record.id))
          break
        case 'audio_files':
          await db.update(audioFiles)
            .set(record)
            .where(eq(audioFiles.id, record.id))
          break
      }
    }
  }
}

function cloneRecordMap(recordMap: RecordMap): RecordMap {
  return JSON.parse(JSON.stringify(recordMap))
}
```

```typescript
// apps/server/src/index.ts (MODIFY)
import { createExpressEndpoints, initServer } from '@ts-rest/express'
import { realtimeRouter } from './routes/realtime-impl'

// ... existing code ...

app.register(realtimeRouter)
```

---

## 📝 PHASE 2: Real-time Sync

### Step 2.1: WebSocket Server

```typescript
// apps/server/src/services/WebSocketServer.ts (NEW FILE)
import { WebSocketServer as WSServer, WebSocket } from 'ws'
import type { Server } from 'http'

type SubscriptionKey = string

export class WebSocketPubSubServer {
  private wss: WSServer
  private subscriptions = new Map<WebSocket, Set<SubscriptionKey>>()

  constructor(httpServer: Server) {
    this.wss = new WSServer({ server: httpServer })

    this.wss.on('connection', (ws) => {
      console.log('WebSocket client connected')
      this.subscriptions.set(ws, new Set())

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString())
          this.handleMessage(ws, msg)
        } catch (error) {
          console.error('Invalid WebSocket message:', error)
        }
      })

      ws.on('close', () => {
        console.log('WebSocket client disconnected')
        this.subscriptions.delete(ws)
      })

      ws.on('error', (error) => {
        console.error('WebSocket error:', error)
      })
    })
  }

  private handleMessage(ws: WebSocket, msg: any) {
    if (msg.type === 'subscribe' && typeof msg.key === 'string') {
      this.subscriptions.get(ws)?.add(msg.key)
      console.log(`Client subscribed to ${msg.key}`)

    } else if (msg.type === 'unsubscribe' && typeof msg.key === 'string') {
      this.subscriptions.get(ws)?.delete(msg.key)
      console.log(`Client unsubscribed from ${msg.key}`)
    }
  }

  publish(updates: Array<{ key: SubscriptionKey, version: number }>) {
    for (const [ws, keys] of this.subscriptions.entries()) {
      const relevantUpdates = updates.filter(u => keys.has(u.key))

      if (relevantUpdates.length > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'updates',
          updates: relevantUpdates
        }))
      }
    }
  }

  close() {
    this.wss.close()
  }
}
```

```typescript
// apps/server/src/index.ts (MODIFY)
import { WebSocketPubSubServer } from './services/WebSocketServer'

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})

// Initialize WebSocket server
export const pubsub = new WebSocketPubSubServer(server)
```

```typescript
// apps/server/src/routes/realtime-impl.ts (MODIFY)
import { pubsub } from '../index'

// In write endpoint, after saving records:
// 6. Publish updates via WebSocket
const updates = transaction.operations.map(op => ({
  key: `${op.table}:${op.id}`,
  version: newRecordMap[op.table][op.id].version
}))

setImmediate(() => {
  pubsub.publish(updates)
})
```

---

### Step 2.2: WebSocket Client

```typescript
// packages/realtime/src/WebSocketClient.ts (NEW FILE)
export class WebSocketPubSubClient {
  private ws: WebSocket | null = null
  private subscriptions = new Set<string>()
  private reconnectTimer: number | null = null
  private reconnectAttempts = 0

  constructor(
    private url: string,
    private onChange: (key: string, version: number) => void
  ) {
    this.connect()
  }

  private connect() {
    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0

      for (const key of this.subscriptions) {
        this.send({ type: 'subscribe', key })
      }
    }

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      if (msg.type === 'updates') {
        for (const { key, version } of msg.updates) {
          this.onChange(key, version)
        }
      }
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
      this.scheduleReconnect()
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)
    this.reconnectAttempts++

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  subscribe(key: string) {
    this.subscriptions.add(key)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe', key })
    }
  }

  unsubscribe(key: string) {
    this.subscriptions.delete(key)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'unsubscribe', key })
    }
  }

  private send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  close() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
    }
    this.ws?.close()
  }
}
```

---

### Step 2.3: Client Environment Setup

```typescript
// apps/web/src/contexts/RealtimeContext.tsx (NEW FILE)
import React, { createContext, useContext, useEffect, useState } from 'react'
import { RecordCache } from '@abe-stack/realtime'
import { WebSocketPubSubClient } from '@abe-stack/realtime'

type RealtimeContextValue = {
  recordCache: RecordCache
  pubsub: WebSocketPubSubClient
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null)

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const [value] = useState(() => {
    const recordCache = new RecordCache()

    const pubsub = new WebSocketPubSubClient(
      import.meta.env.VITE_WS_URL || 'ws://localhost:8080',
      async (key, version) => {
        // Handle update notification
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

    return { recordCache, pubsub }
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
          {/* ... routes ... */}
        </BrowserRouter>
      </RealtimeProvider>
    </AuthProvider>
  )
}
```

---

## 🎯 Next Steps

This implementation guide covers **Phases 1-2**. Continue with:

- **Phase 3**: Offline support (RecordStorage, TransactionQueue)
- **Phase 4**: Undo/Redo
- **Phase 5**: Permissions
- **Phase 6**: Audio file handling
- **Phase 7**: Background jobs
- **Phase 8**: DAW UI components

Each phase builds on the previous, allowing you to ship incrementally.

---

## 📚 Testing Strategy

### Unit Tests

```typescript
// packages/realtime/src/__tests__/transactions.test.ts
import { describe, it, expect } from 'vitest'
import { applyOperation, invertOperation } from '../transactions'

describe('applyOperation', () => {
  it('should apply set operation', () => {
    const record = { id: '1', version: 1, name: 'Old' }
    const op = { type: 'set', table: 'projects', id: '1', key: 'name', value: 'New' }

    const result = applyOperation(record, op)

    expect(result.name).toBe('New')
    expect(result.version).toBe(2)
  })

  it('should apply listInsert operation', () => {
    const record = { id: '1', version: 1, collaborators: ['user1'] }
    const op = {
      type: 'listInsert',
      table: 'projects',
      id: '1',
      key: 'collaborators',
      value: 'user2',
      position: 'append'
    }

    const result = applyOperation(record, op)

    expect(result.collaborators).toEqual(['user1', 'user2'])
    expect(result.version).toBe(2)
  })
})

describe('invertOperation', () => {
  it('should invert set operation', () => {
    const before = { id: '1', version: 1, name: 'Old' }
    const after = { id: '1', version: 2, name: 'New' }
    const op = { type: 'set', table: 'projects', id: '1', key: 'name', value: 'New' }

    const inverted = invertOperation(before, after, op)

    expect(inverted.value).toBe('Old')
  })
})
```

### E2E Tests

```typescript
// apps/web/src/__tests__/realtime-sync.spec.ts
import { test, expect } from '@playwright/test'

test('real-time collaboration', async ({ browser }) => {
  // Create 2 browser contexts (2 users)
  const user1 = await browser.newContext()
  const user2 = await browser.newContext()

  const page1 = await user1.newPage()
  const page2 = await user2.newPage()

  // User 1 logs in and creates project
  await page1.goto('/login')
  await page1.fill('[name=email]', 'user1@example.com')
  await page1.fill('[name=password]', 'password')
  await page1.click('button[type=submit]')

  await page1.goto('/projects/new')
  await page1.fill('[name=name]', 'Test Project')
  await page1.click('button[type=submit]')

  const projectId = await page1.locator('[data-project-id]').getAttribute('data-project-id')

  // User 2 logs in and opens same project
  await page2.goto('/login')
  await page2.fill('[name=email]', 'user2@example.com')
  await page2.fill('[name=password]', 'password')
  await page2.click('button[type=submit]')

  await page2.goto(`/projects/${projectId}`)

  // User 1 changes BPM
  await page1.fill('[name=bpm]', '140')
  await page1.blur('[name=bpm]')

  // User 2 should see updated BPM in real-time
  await expect(page2.locator('[name=bpm]')).toHaveValue('140', { timeout: 2000 })

  // Clean up
  await user1.close()
  await user2.close()
})
```

---

## 📦 Deployment Checklist

### Development
- [x] PostgreSQL running (Docker)
- [x] Redis optional (can use in-memory pubsub)
- [x] Environment variables configured
- [x] Database migrations applied

### Production
- [ ] PostgreSQL with connection pooling
- [ ] Redis for pub/sub (horizontal scaling)
- [ ] WebSocket load balancer (sticky sessions)
- [ ] S3 for audio file storage
- [ ] CDN for static assets
- [ ] Monitoring (Sentry, DataDog)
- [ ] Rate limiting on API endpoints
- [ ] HTTPS for WebSocket connections

---

## 🔧 Performance Optimizations

### Database
- Add composite indexes for common queries
- Use materialized views for complex aggregations
- Enable query plan analysis
- Connection pooling (pgBouncer)

### WebSocket
- Batch pub/sub notifications (debounce 50ms)
- Compress WebSocket messages (permessage-deflate)
- Use binary protocol for large payloads
- Implement heartbeat/ping-pong

### Client
- Virtualize timeline (only render visible clips)
- Debounce automation point updates
- Web Workers for waveform rendering
- IndexedDB batched writes

### Audio
- Stream large audio files (range requests)
- Generate multiple resolutions of waveforms
- Use Web Audio API for playback
- Implement audio buffer caching

---

This guide provides a complete roadmap to implement the hybrid architecture. Start with Phase 1, validate each phase with tests, and iterate!
