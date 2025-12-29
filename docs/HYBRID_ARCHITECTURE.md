# HYBRID ARCHITECTURE: ABE-STACK + CHET-STACK for Web-Based DAW

## 🎯 Project Goal
Build a **web-based Digital Audio Workstation (DAW)** combining:
- **ABE-STACK**: Multi-platform monorepo, PostgreSQL, modern tooling
- **CHET-STACK**: Real-time sync, offline support, optimistic updates, undo/redo

---

## 📋 DAW-Specific Requirements

### Functional Requirements
1. **Real-time Collaboration**: Multiple users editing same project simultaneously
2. **Offline Mode**: Work without internet, auto-sync when online
3. **Optimistic Updates**: Instant UI feedback (moving clips, adjusting knobs)
4. **Undo/Redo**: Full operation history with branching support
5. **Version Control**: Automatic conflict resolution (last-write-wins)
6. **Audio File Management**: Upload, store, stream audio samples
7. **Background Processing**: Waveform generation, audio transcoding, effects rendering
8. **Permissions**: Project ownership, collaborator roles (owner/editor/viewer)
9. **High Performance**: Handle 100+ audio clips per project

### Technical Requirements
- **Latency**: <100ms for UI updates, <500ms for real-time sync
- **Storage**: Support large audio files (up to 500MB per file)
- **Concurrent Users**: 5-10 collaborators per project
- **Offline Storage**: Cache projects locally in IndexedDB
- **Transaction Throughput**: 100+ operations/second during playback automation

---

## 🏗️ Hybrid Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                          │
├─────────────────────────────────────────────────────────────┤
│  React UI Components                                         │
│    ├── useProject() → RecordCache (in-memory)               │
│    ├── useTracks() → RecordStorage (IndexedDB)              │
│    └── useClips() → Suspense loaders                        │
├─────────────────────────────────────────────────────────────┤
│  State Management                                            │
│    ├── RecordCache (NEW) - in-memory database               │
│    ├── RecordStorage (NEW) - IndexedDB persistence          │
│    ├── TransactionQueue (NEW) - offline write queue         │
│    ├── UndoRedoStack (NEW) - operation history              │
│    └── React Query - non-realtime data (user profile, etc)  │
├─────────────────────────────────────────────────────────────┤
│  Network Layer                                               │
│    ├── ts-rest API client - RPC calls                       │
│    ├── WebSocket client (NEW) - real-time pub/sub           │
│    └── Audio file uploader - S3 signed URLs                 │
└─────────────────────────────────────────────────────────────┘
                              ▲
                              │ HTTP + WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Node.js)                          │
├─────────────────────────────────────────────────────────────┤
│  API Layer (Fastify)                                         │
│    ├── ts-rest endpoints (existing)                         │
│    ├── /api/write (NEW) - transaction processor             │
│    ├── /api/getRecords (NEW) - batch record fetcher         │
│    └── /api/audio/upload (NEW) - signed URL generator       │
├─────────────────────────────────────────────────────────────┤
│  Real-time Layer (NEW)                                       │
│    ├── WebSocket server (ws package)                        │
│    ├── PubSub service - in-memory (Redis later)             │
│    └── Subscription manager - track client subscriptions    │
├─────────────────────────────────────────────────────────────┤
│  Transaction Processor (NEW)                                 │
│    ├── Operation applier (set, listInsert, listRemove)      │
│    ├── Version validator (optimistic concurrency)           │
│    ├── Permission checker (row-level access control)        │
│    └── Publisher (notify clients via WebSocket)             │
├─────────────────────────────────────────────────────────────┤
│  Background Jobs (NEW)                                       │
│    ├── Task queue (tuple-database → Redis later)            │
│    ├── Waveform generator                                   │
│    ├── Audio transcoder (mp3/wav/flac → web formats)        │
│    └── Project snapshot exporter                            │
├─────────────────────────────────────────────────────────────┤
│  Database Layer                                              │
│    ├── PostgreSQL (existing)                                │
│    ├── Drizzle ORM (existing)                               │
│    └── Schema with version fields (MODIFIED)                │
├─────────────────────────────────────────────────────────────┤
│  Storage Layer                                               │
│    ├── S3 / Local FS (existing @abe-stack/storage)          │
│    ├── Audio files (wav, mp3, flac)                         │
│    └── Generated waveforms (png, json peaks)                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Package Structure (Enhanced Monorepo)

```
abe-stack/
├── apps/
│   ├── web/                    # Vite + React (existing)
│   │   └── src/
│   │       ├── components/     # DAW UI components (timeline, mixer, etc)
│   │       ├── services/       # NEW: RecordCache, TransactionQueue
│   │       ├── loaders/        # NEW: Suspense loaders
│   │       ├── actions/        # NEW: write(), undo(), redo()
│   │       └── hooks/          # NEW: useProject(), useTracks(), useClips()
│   ├── desktop/                # Electron (future: native audio APIs)
│   └── server/                 # Fastify (existing)
│       └── src/
│           ├── routes/         # ts-rest endpoints
│           ├── websocket/      # NEW: WebSocket server
│           ├── services/       # NEW: PubSub, TransactionProcessor
│           ├── tasks/          # NEW: Background jobs
│           └── lib/            # NEW: Permission validators
│
├── packages/
│   ├── shared/                 # Shared types (existing)
│   │   └── src/
│   │       ├── contracts/      # ts-rest API contracts
│   │       ├── schema.ts       # NEW: DAW data models
│   │       ├── transactions.ts # NEW: Operation types
│   │       ├── permissions.ts  # NEW: Access control logic
│   │       └── pubsub-keys.ts  # NEW: Subscription key format
│   │
│   ├── db/                     # Database (existing)
│   │   └── src/
│   │       ├── schema/         # Drizzle tables
│   │       │   ├── users.ts    # Existing
│   │       │   ├── projects.ts # NEW: DAW projects with version
│   │       │   ├── tracks.ts   # NEW: Audio/MIDI tracks
│   │       │   ├── clips.ts    # NEW: Audio/MIDI clips
│   │       │   ├── automation.ts # NEW: Parameter automation
│   │       │   └── files.ts    # NEW: Audio file metadata
│   │       └── client.ts       # Postgres connection
│   │
│   ├── realtime/               # NEW: Real-time sync package
│   │   └── src/
│   │       ├── RecordCache.ts  # In-memory database
│   │       ├── RecordStorage.ts # IndexedDB wrapper
│   │       ├── TransactionQueue.ts # Offline queue
│   │       ├── UndoRedoStack.ts # Undo/redo state
│   │       ├── WebSocketClient.ts # Client WebSocket
│   │       └── WebSocketServer.ts # Server WebSocket
│   │
│   ├── api-client/             # Type-safe API (existing)
│   ├── storage/                # S3/Local FS (existing)
│   └── ui/                     # React components (existing)
│
└── docs/
    ├── HYBRID_ARCHITECTURE.md  # This file
    └── DAW_IMPLEMENTATION.md   # Step-by-step guide
```

---

## 🗄️ Database Schema (Enhanced with Versions)

### Core Principles
1. **Add `version` field to all tables** (for optimistic concurrency)
2. **Normalize relationships** (projects → tracks → clips)
3. **Track ownership** (created_by, collaborators)
4. **Soft deletes** (deleted field for undo support)

### Schema Definition

```typescript
// packages/db/src/schema/projects.ts
import { pgTable, uuid, text, timestamp, integer, jsonb } from 'drizzle-orm/pg-core'

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1), // NEW: For sync

  name: text('name').notNull(),
  bpm: integer('bpm').notNull().default(120),
  timeSignature: text('time_signature').notNull().default('4/4'),

  createdBy: uuid('created_by').notNull().references(() => users.id),
  collaborators: jsonb('collaborators').$type<string[]>().notNull().default([]),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deleted: timestamp('deleted'), // Soft delete
})

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
```

```typescript
// packages/db/src/schema/tracks.ts
export const tracks = pgTable('tracks', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1), // NEW

  projectId: uuid('project_id').notNull().references(() => projects.id),
  name: text('name').notNull(),
  type: text('type').$type<'audio' | 'midi' | 'bus'>().notNull(),

  // Audio properties
  volume: real('volume').notNull().default(1.0), // 0.0 - 2.0
  pan: real('pan').notNull().default(0.0), // -1.0 (left) to 1.0 (right)
  muted: boolean('muted').notNull().default(false),
  solo: boolean('solo').notNull().default(false),

  // Ordering
  orderIndex: integer('order_index').notNull().default(0),

  // Plugin chain (VSTs, effects)
  plugins: jsonb('plugins').$type<Plugin[]>().notNull().default([]),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deleted: timestamp('deleted'),
})

type Plugin = {
  id: string
  type: 'eq' | 'compressor' | 'reverb' | 'delay' | 'instrument'
  params: Record<string, number>
  bypassed: boolean
}
```

```typescript
// packages/db/src/schema/clips.ts
export const clips = pgTable('clips', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1), // NEW

  trackId: uuid('track_id').notNull().references(() => tracks.id),
  name: text('name').notNull(),

  // Timeline position (in beats)
  startBeat: real('start_beat').notNull(), // When clip starts on timeline
  durationBeats: real('duration_beats').notNull(), // Clip length

  // Audio clip specific
  audioFileId: uuid('audio_file_id').references(() => audioFiles.id),
  audioStartOffset: real('audio_start_offset').default(0), // Trim start (seconds)
  audioEndOffset: real('audio_end_offset').default(0), // Trim end (seconds)

  // MIDI clip specific
  midiData: jsonb('midi_data').$type<MidiNote[]>(),

  // Clip properties
  gain: real('gain').notNull().default(1.0),
  fadeIn: real('fade_in').notNull().default(0), // Fade duration (beats)
  fadeOut: real('fade_out').notNull().default(0),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deleted: timestamp('deleted'),
})

type MidiNote = {
  pitch: number // 0-127
  velocity: number // 0-127
  startBeat: number
  durationBeats: number
}
```

```typescript
// packages/db/src/schema/automation.ts
export const automation = pgTable('automation', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1),

  trackId: uuid('track_id').notNull().references(() => tracks.id),
  parameter: text('parameter').notNull(), // 'volume', 'pan', 'plugin.0.cutoff'

  points: jsonb('points').$type<AutomationPoint[]>().notNull().default([]),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deleted: timestamp('deleted'),
})

type AutomationPoint = {
  beat: number
  value: number
  curve?: 'linear' | 'exponential' | 'logarithmic'
}
```

```typescript
// packages/db/src/schema/audio-files.ts
export const audioFiles = pgTable('audio_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  version: integer('version').notNull().default(1),

  projectId: uuid('project_id').notNull().references(() => projects.id),
  uploadedBy: uuid('uploaded_by').notNull().references(() => users.id),

  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(), // audio/wav, audio/mpeg, etc.
  sizeBytes: integer('size_bytes').notNull(),

  // Storage locations
  storageKey: text('storage_key').notNull(), // S3 key or local path
  waveformKey: text('waveform_key'), // Generated waveform image
  peaksData: jsonb('peaks_data').$type<number[]>(), // For timeline preview

  // Audio metadata
  durationSeconds: real('duration_seconds').notNull(),
  sampleRate: integer('sample_rate').notNull(),
  channels: integer('channels').notNull(), // 1 = mono, 2 = stereo
  bitDepth: integer('bit_depth'), // 16, 24, 32

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deleted: timestamp('deleted'),
})
```

### Migration Strategy

```bash
# Generate new migration
pnpm db:generate

# Apply migration
pnpm db:migrate

# Sample migration file: drizzle/0003_add_daw_tables.sql
```

```sql
-- Add version column to existing users table
ALTER TABLE users ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- Create projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version INTEGER NOT NULL DEFAULT 1,
  name TEXT NOT NULL,
  bpm INTEGER NOT NULL DEFAULT 120,
  time_signature TEXT NOT NULL DEFAULT '4/4',
  created_by UUID NOT NULL REFERENCES users(id),
  collaborators JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted TIMESTAMP
);

-- Add indexes for common queries
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_projects_collaborators ON projects USING GIN(collaborators);
CREATE INDEX idx_tracks_project_id ON tracks(project_id);
CREATE INDEX idx_clips_track_id ON clips(track_id);
CREATE INDEX idx_audio_files_project_id ON audio_files(project_id);

-- Partial index for non-deleted records (performance optimization)
CREATE INDEX idx_projects_active ON projects(created_by) WHERE deleted IS NULL;
```

---

## 🔄 Transaction System (Operation-Based)

### Operation Types

```typescript
// packages/shared/src/transactions.ts

export type Operation =
  | SetOperation
  | SetNowOperation
  | ListInsertOperation
  | ListRemoveOperation

export type SetOperation = {
  type: 'set'
  table: TableName
  id: string
  key: string // Dot-notation path: 'name', 'volume', 'plugins.0.params.cutoff'
  value: unknown
}

export type SetNowOperation = {
  type: 'set-now'
  table: TableName
  id: string
  key: string // Typically 'updatedAt'
}

export type ListInsertOperation = {
  type: 'listInsert'
  table: TableName
  id: string
  key: string // Path to array: 'collaborators', 'clips', 'plugins'
  value: unknown
  position: 'prepend' | 'append' | { before: unknown } | { after: unknown }
}

export type ListRemoveOperation = {
  type: 'listRemove'
  table: TableName
  id: string
  key: string
  value: unknown
}

export type Transaction = {
  txId: string // UUID
  authorId: string // User ID
  operations: Operation[]
  clientTimestamp: number // For undo/redo ordering
}

export type TableName =
  | 'users'
  | 'projects'
  | 'tracks'
  | 'clips'
  | 'automation'
  | 'audio_files'
```

### Apply & Invert Logic

```typescript
// packages/shared/src/transactions.ts

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
      const filtered = list.filter(item => !deepEqual(item, op.value)) // Dedupe

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

export function invertOperation(
  beforeRecord: Record,
  afterRecord: Record,
  op: Operation
): Operation {
  switch (op.type) {
    case 'set':
      return {
        ...op,
        value: getPath(beforeRecord, op.key) // Restore old value
      }

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
      // Find where item was in original list to restore position
      const beforeList = getPath(beforeRecord, op.key) as unknown[]
      const index = beforeList.findIndex(item => deepEqual(item, op.value))

      const position = index === 0
        ? 'prepend'
        : { after: beforeList[index - 1] }

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
  const target = keys.reduce((acc, key) => acc[key], obj)
  target[lastKey] = value
}

function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
```

### Example Operations

```typescript
// Move a clip on timeline
const moveClipOp: SetOperation = {
  type: 'set',
  table: 'clips',
  id: 'clip-123',
  key: 'startBeat',
  value: 16.0 // Move to bar 5
}

// Adjust track volume
const volumeOp: SetOperation = {
  type: 'set',
  table: 'tracks',
  id: 'track-456',
  key: 'volume',
  value: 0.8
}

// Add collaborator to project
const addCollabOp: ListInsertOperation = {
  type: 'listInsert',
  table: 'projects',
  id: 'project-789',
  key: 'collaborators',
  value: 'user-999',
  position: 'append'
}

// Adjust plugin parameter
const pluginParamOp: SetOperation = {
  type: 'set',
  table: 'tracks',
  id: 'track-456',
  key: 'plugins.0.params.cutoff', // First plugin's cutoff param
  value: 2500 // Hz
}

// Add automation point
const automationOp: ListInsertOperation = {
  type: 'listInsert',
  table: 'automation',
  id: 'auto-111',
  key: 'points',
  value: { beat: 32.0, value: 0.5, curve: 'linear' },
  position: 'append'
}
```

---

## 🌐 Real-time Synchronization Layer

### WebSocket Server

```typescript
// packages/realtime/src/WebSocketServer.ts
import { WebSocketServer as WSServer, WebSocket } from 'ws'
import type { Server } from 'http'

type SubscriptionKey = string // "project:abc-123" | "track:def-456"

export class WebSocketPubSubServer {
  private wss: WSServer
  private subscriptions = new Map<WebSocket, Set<SubscriptionKey>>()

  constructor(httpServer: Server) {
    this.wss = new WSServer({ server: httpServer })

    this.wss.on('connection', (ws) => {
      this.subscriptions.set(ws, new Set())

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString())
        this.handleMessage(ws, msg)
      })

      ws.on('close', () => {
        this.subscriptions.delete(ws)
      })
    })
  }

  private handleMessage(ws: WebSocket, msg: any) {
    if (msg.type === 'subscribe') {
      this.subscriptions.get(ws)?.add(msg.key)
    } else if (msg.type === 'unsubscribe') {
      this.subscriptions.get(ws)?.delete(msg.key)
    }
  }

  publish(updates: Array<{ key: SubscriptionKey, value: number }>) {
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
}
```

### WebSocket Client

```typescript
// packages/realtime/src/WebSocketClient.ts
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

      // Resubscribe to all keys
      for (const key of this.subscriptions) {
        this.send({ type: 'subscribe', key })
      }
    }

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data)

      if (msg.type === 'updates') {
        for (const { key, value } of msg.updates) {
          this.onChange(key, value)
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

### Subscription Key Format

```typescript
// packages/shared/src/pubsub-keys.ts

export type SubscriptionKey =
  | `project:${string}`         // All changes to project
  | `track:${string}`           // All changes to track
  | `clip:${string}`            // All changes to clip
  | `automation:${string}`      // All changes to automation
  | `project-tracks:${string}`  // New/deleted tracks in project
  | `track-clips:${string}`     // New/deleted clips in track

export function serializeKey(type: string, id: string): SubscriptionKey {
  return `${type}:${id}` as SubscriptionKey
}

export function parseKey(key: SubscriptionKey): { type: string, id: string } {
  const [type, id] = key.split(':')
  return { type, id }
}

// Usage examples
const projectKey = serializeKey('project', 'abc-123') // "project:abc-123"
const trackKey = serializeKey('track', 'def-456')     // "track:def-456"
```

---

## 💾 Client-Side Storage (Offline Support)

### RecordCache (In-Memory)

```typescript
// packages/realtime/src/RecordCache.ts
import { TupleDatabase, MemoryTupleStorage } from 'tuple-database'

type Record = {
  id: string
  version: number
  [key: string]: unknown
}

type RecordMap = {
  [table: string]: {
    [id: string]: Record
  }
}

export class RecordCache {
  private db: TupleDatabase<MemoryTupleStorage>
  private listeners = new Set<(table: string, id: string) => void>()

  constructor() {
    this.db = new TupleDatabase(new MemoryTupleStorage())
  }

  // Write single record
  write(table: string, record: Record) {
    this.db.transact(({ set }) => {
      set(['record', table, record.id], record)
    })

    this.notifyListeners(table, record.id)
  }

  // Write multiple records
  writeMany(recordMap: RecordMap) {
    this.db.transact(({ set }) => {
      for (const [table, records] of Object.entries(recordMap)) {
        for (const record of Object.values(records)) {
          set(['record', table, record.id], record)
        }
      }
    })

    // Notify all listeners
    for (const [table, records] of Object.entries(recordMap)) {
      for (const id of Object.keys(records)) {
        this.notifyListeners(table, id)
      }
    }
  }

  // Read single record
  get(table: string, id: string): Record | undefined {
    return this.db.scan({
      prefix: ['record', table, id]
    })[0]?.[1] as Record | undefined
  }

  // Read multiple records
  getMany(pointers: Array<{ table: string, id: string }>): RecordMap {
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

  // Query by index (e.g., all tracks in project)
  query(table: string, filters: Record<string, unknown>): Record[] {
    const allRecords = this.db.scan({
      prefix: ['record', table]
    }).map(([_, record]) => record as Record)

    return allRecords.filter(record => {
      return Object.entries(filters).every(([key, value]) => {
        return record[key] === value
      })
    })
  }

  // Subscribe to changes
  subscribe(callback: (table: string, id: string) => void) {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners(table: string, id: string) {
    for (const listener of this.listeners) {
      listener(table, id)
    }
  }

  // Clear all data
  clear() {
    this.db = new TupleDatabase(new MemoryTupleStorage())
  }
}
```

### RecordStorage (IndexedDB)

```typescript
// packages/realtime/src/RecordStorage.ts
import { TupleDatabase, IndexedDbTupleStorage } from 'tuple-database'

export class RecordStorage {
  private db: TupleDatabase<IndexedDbTupleStorage> | null = null

  async init() {
    const storage = new IndexedDbTupleStorage('daw-storage', 1)
    this.db = new TupleDatabase(storage)
  }

  async write(table: string, record: Record) {
    if (!this.db) throw new Error('RecordStorage not initialized')

    await this.db.transact(async ({ set }) => {
      set(['record', table, record.id], record)
    })
  }

  async writeMany(recordMap: RecordMap) {
    if (!this.db) throw new Error('RecordStorage not initialized')

    await this.db.transact(async ({ set }) => {
      for (const [table, records] of Object.entries(recordMap)) {
        for (const record of Object.values(records)) {
          set(['record', table, record.id], record)
        }
      }
    })
  }

  async get(table: string, id: string): Promise<Record | undefined> {
    if (!this.db) throw new Error('RecordStorage not initialized')

    const results = await this.db.scan({
      prefix: ['record', table, id]
    })

    return results[0]?.[1] as Record | undefined
  }

  async getMany(pointers: Array<{ table: string, id: string }>): Promise<RecordMap> {
    if (!this.db) throw new Error('RecordStorage not initialized')

    const recordMap: RecordMap = {}

    for (const { table, id } of pointers) {
      const record = await this.get(table, id)
      if (record) {
        recordMap[table] = recordMap[table] || {}
        recordMap[table][id] = record
      }
    }

    return recordMap
  }

  async query(table: string, filters: Record<string, unknown>): Promise<Record[]> {
    if (!this.db) throw new Error('RecordStorage not initialized')

    const results = await this.db.scan({
      prefix: ['record', table]
    })

    const records = results.map(([_, record]) => record as Record)

    return records.filter(record => {
      return Object.entries(filters).every(([key, value]) => {
        return record[key] === value
      })
    })
  }

  async clear() {
    if (!this.db) throw new Error('RecordStorage not initialized')

    await this.db.transact(async ({ remove }) => {
      const allRecords = await this.db!.scan({ prefix: [] })
      for (const [key] of allRecords) {
        remove(key)
      }
    })
  }
}
```

### TransactionQueue (Offline Writes)

```typescript
// packages/realtime/src/TransactionQueue.ts
import type { Transaction } from '@abe-stack/shared'

type QueuedTransaction = {
  transaction: Transaction
  retries: number
  lastError?: string
}

export class TransactionQueue {
  private queue: QueuedTransaction[] = []
  private isProcessing = false
  private storageKey = 'daw-transaction-queue'

  constructor(
    private sendToServer: (tx: Transaction) => Promise<void>
  ) {
    this.loadFromStorage()

    // Resume processing when online
    window.addEventListener('online', () => this.process())
  }

  enqueue(transaction: Transaction) {
    this.queue.push({ transaction, retries: 0 })
    this.saveToStorage()
    this.process()
  }

  private async process() {
    if (this.isProcessing || this.queue.length === 0) return
    if (!navigator.onLine) return // Wait for online

    this.isProcessing = true

    while (this.queue.length > 0) {
      const queued = this.queue[0]

      try {
        await this.sendToServer(queued.transaction)

        // Success: remove from queue
        this.queue.shift()
        this.saveToStorage()

      } catch (error: any) {
        queued.retries++
        queued.lastError = error.message

        if (error.status === 409) {
          // Conflict: retry immediately with new version
          // (server will send updated version via WebSocket)
          continue

        } else if (error.status === 400 || error.status === 403) {
          // Validation/permission error: remove from queue (can't retry)
          console.error('Transaction failed validation:', error)
          this.queue.shift()
          this.saveToStorage()

        } else if (error.status === 0) {
          // Offline: pause processing
          break

        } else {
          // Server error: exponential backoff
          const delay = Math.min(1000 * Math.pow(2, queued.retries), 30000)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    this.isProcessing = false
  }

  private saveToStorage() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.queue))
  }

  private loadFromStorage() {
    const stored = localStorage.getItem(this.storageKey)
    if (stored) {
      this.queue = JSON.parse(stored)
    }
  }

  getPendingCount(): number {
    return this.queue.length
  }

  clear() {
    this.queue = []
    this.saveToStorage()
  }
}
```

---

## ⏮️ Undo/Redo System

```typescript
// packages/realtime/src/UndoRedoStack.ts
import type { Operation, Transaction } from '@abe-stack/shared'
import { invertOperation } from '@abe-stack/shared'

type HistoryEntry = {
  transaction: Transaction
  invertedOperations: Operation[]
  timestamp: number
}

export class UndoRedoStack {
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []
  private maxStackSize = 100

  constructor(
    private applyTransaction: (tx: Transaction) => void,
    private getRecord: (table: string, id: string) => Record | undefined
  ) {}

  push(transaction: Transaction, beforeRecords: RecordMap) {
    // Compute inverted operations
    const invertedOperations = transaction.operations.map((op, i) => {
      const beforeRecord = beforeRecords[op.table]?.[op.id]
      const afterRecord = this.getRecord(op.table, op.id)

      if (!beforeRecord || !afterRecord) {
        throw new Error(`Cannot invert operation: missing record ${op.table}:${op.id}`)
      }

      return invertOperation(beforeRecord, afterRecord, op)
    })

    this.undoStack.push({
      transaction,
      invertedOperations,
      timestamp: Date.now()
    })

    // Clear redo stack (new action invalidates redo history)
    this.redoStack = []

    // Limit stack size
    if (this.undoStack.length > this.maxStackSize) {
      this.undoStack.shift()
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  undo() {
    const entry = this.undoStack.pop()
    if (!entry) return

    // Create undo transaction with inverted operations
    const undoTransaction: Transaction = {
      txId: crypto.randomUUID(),
      authorId: entry.transaction.authorId,
      operations: entry.invertedOperations,
      clientTimestamp: Date.now()
    }

    this.applyTransaction(undoTransaction)

    // Move to redo stack
    this.redoStack.push(entry)
  }

  redo() {
    const entry = this.redoStack.pop()
    if (!entry) return

    // Re-apply original transaction
    const redoTransaction: Transaction = {
      ...entry.transaction,
      txId: crypto.randomUUID(), // New transaction ID
      clientTimestamp: Date.now()
    }

    this.applyTransaction(redoTransaction)

    // Move back to undo stack
    this.undoStack.push(entry)
  }

  clear() {
    this.undoStack = []
    this.redoStack = []
  }

  getUndoStackSize(): number {
    return this.undoStack.length
  }

  getRedoStackSize(): number {
    return this.redoStack.length
  }
}
```

---

## 🎨 React Integration (Client)

### Custom Hooks

```typescript
// apps/web/src/hooks/useProject.ts
import { useSyncExternalStore } from 'react'
import { useClientEnvironment } from '../contexts/ClientEnvironment'
import type { Project } from '@abe-stack/db/schema'

export function useProject(projectId: string): Project {
  const { recordCache, loaderCache } = useClientEnvironment()

  // Subscribe to changes
  const project = useSyncExternalStore(
    (callback) => recordCache.subscribe((table, id) => {
      if (table === 'projects' && id === projectId) {
        callback()
      }
    }),
    () => recordCache.get('projects', projectId) as Project | undefined,
    () => undefined
  )

  // Suspense integration
  if (!project) {
    const loader = loaderCache.getOrCreate(`project:${projectId}`, async () => {
      // This will be implemented in loaders section
    })

    if (loader.state === 'loading') {
      throw loader.promise
    }
  }

  return project!
}
```

```typescript
// apps/web/src/hooks/useTracks.ts
export function useTracks(projectId: string): Track[] {
  const { recordCache } = useClientEnvironment()

  const tracks = useSyncExternalStore(
    (callback) => recordCache.subscribe((table, id) => {
      if (table === 'tracks') {
        const track = recordCache.get('tracks', id)
        if (track?.projectId === projectId) {
          callback()
        }
      }
    }),
    () => {
      const allTracks = recordCache.query('tracks', { projectId })
      return allTracks.sort((a, b) => a.orderIndex - b.orderIndex)
    },
    () => []
  )

  return tracks as Track[]
}
```

```typescript
// apps/web/src/hooks/useClips.ts
export function useClips(trackId: string): Clip[] {
  const { recordCache } = useClientEnvironment()

  return useSyncExternalStore(
    (callback) => recordCache.subscribe((table, id) => {
      if (table === 'clips') {
        const clip = recordCache.get('clips', id)
        if (clip?.trackId === trackId) {
          callback()
        }
      }
    }),
    () => {
      const clips = recordCache.query('clips', { trackId })
      return clips.sort((a, b) => a.startBeat - b.startBeat)
    },
    () => []
  )
}
```

### Write Actions

```typescript
// apps/web/src/actions/write.ts
import type { Operation, Transaction } from '@abe-stack/shared'
import { applyOperation } from '@abe-stack/shared'

export async function write(
  environment: ClientEnvironment,
  operations: Operation[]
) {
  const { recordCache, transactionQueue, undoRedoStack, userId } = environment

  // Create transaction
  const transaction: Transaction = {
    txId: crypto.randomUUID(),
    authorId: userId,
    operations,
    clientTimestamp: Date.now()
  }

  // Capture before state (for undo)
  const beforeRecords: RecordMap = {}
  for (const op of operations) {
    const record = recordCache.get(op.table, op.id)
    if (record) {
      beforeRecords[op.table] = beforeRecords[op.table] || {}
      beforeRecords[op.table][op.id] = record
    }
  }

  // Apply optimistically to local cache
  for (const op of operations) {
    const record = recordCache.get(op.table, op.id)
    if (record) {
      const newRecord = applyOperation(record, op)
      recordCache.write(op.table, newRecord)
    }
  }

  // Push to undo stack
  undoRedoStack.push(transaction, beforeRecords)

  // Enqueue for server sync
  transactionQueue.enqueue(transaction)
}
```

```typescript
// apps/web/src/actions/undo.ts
export function undo(environment: ClientEnvironment) {
  const { undoRedoStack } = environment

  if (undoRedoStack.canUndo()) {
    undoRedoStack.undo()
  }
}

export function redo(environment: ClientEnvironment) {
  const { undoRedoStack } = environment

  if (undoRedoStack.canRedo()) {
    undoRedoStack.redo()
  }
}
```

### Example Usage in Components

```typescript
// apps/web/src/components/Timeline.tsx
import { useProject, useTracks, useClips } from '../hooks'
import { write } from '../actions'
import { useClientEnvironment } from '../contexts/ClientEnvironment'

export function Timeline({ projectId }: { projectId: string }) {
  const environment = useClientEnvironment()
  const project = useProject(projectId)
  const tracks = useTracks(projectId)

  const handleMoveClip = async (clipId: string, newStartBeat: number) => {
    await write(environment, [
      {
        type: 'set',
        table: 'clips',
        id: clipId,
        key: 'startBeat',
        value: newStartBeat
      },
      {
        type: 'set-now',
        table: 'clips',
        id: clipId,
        key: 'updatedAt'
      }
    ])
  }

  const handleAddTrack = async () => {
    const trackId = crypto.randomUUID()

    await write(environment, [
      {
        type: 'set',
        table: 'tracks',
        id: trackId,
        key: 'projectId',
        value: projectId
      },
      {
        type: 'set',
        table: 'tracks',
        id: trackId,
        key: 'name',
        value: 'New Track'
      },
      {
        type: 'set',
        table: 'tracks',
        id: trackId,
        key: 'type',
        value: 'audio'
      }
    ])
  }

  return (
    <div className="timeline">
      <h1>{project.name} - {project.bpm} BPM</h1>

      {tracks.map(track => (
        <TrackRow key={track.id} track={track} onMoveClip={handleMoveClip} />
      ))}

      <button onClick={handleAddTrack}>Add Track</button>
    </div>
  )
}

function TrackRow({ track, onMoveClip }) {
  const clips = useClips(track.id)

  return (
    <div className="track-row">
      <div className="track-header">{track.name}</div>
      <div className="track-clips">
        {clips.map(clip => (
          <ClipBlock
            key={clip.id}
            clip={clip}
            onMove={(newBeat) => onMoveClip(clip.id, newBeat)}
          />
        ))}
      </div>
    </div>
  )
}
```

---

**(Continuing in next message due to length...)**
