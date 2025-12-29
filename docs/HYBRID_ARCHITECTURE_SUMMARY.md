# HYBRID ARCHITECTURE SUMMARY

**Web-Based DAW: ABE-STACK + CHET-STACK**

This document provides a **comprehensive overview** of the hybrid architecture that combines the best features from both ABE-STACK and CHET-STACK for building a production-ready web-based Digital Audio Workstation.

---

## 📚 Documentation Index

1. **HYBRID_ARCHITECTURE.md** - Complete architecture design with package structure
2. **DAW_IMPLEMENTATION_GUIDE.md** - Step-by-step implementation phases (8 weeks)
3. **DAW_UI_COMPONENTS.md** - Ready-to-use React components
4. **This file** - High-level summary and quick-start guide

---

## 🎯 What We're Building

A **collaborative, offline-first DAW** that combines:

✅ **From ABE-STACK:**
- Multi-platform monorepo (Turborepo + pnpm)
- PostgreSQL + Drizzle ORM (production database)
- Type-safe API contracts (ts-rest)
- Modern DevOps (Docker, CI/CD, ESLint, Prettier)
- Multi-platform support (web, desktop, mobile scaffolding)

✅ **From CHET-STACK:**
- Real-time WebSocket synchronization
- Version-based optimistic concurrency
- Offline support (IndexedDB + transaction queue)
- Operation-based transactions (set, listInsert, listRemove)
- Undo/redo with operation inversion
- Row-level permissions
- Background task queue

---

## 🏗️ Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  React Components                                                │
│    Timeline, Mixer, TransportControls, TrackHeader, ClipBlock   │
│                                                                   │
│  State Management                                                │
│    ├── RecordCache (in-memory tuple-database)                   │
│    ├── RecordStorage (IndexedDB persistence)                    │
│    ├── TransactionQueue (offline write queue)                   │
│    ├── UndoRedoStack (operation history)                        │
│    └── React Query (for non-realtime data)                      │
│                                                                   │
│  Network                                                         │
│    ├── ts-rest API client (type-safe RPC)                       │
│    ├── WebSocket client (real-time pub/sub)                     │
│    └── S3 uploader (audio files)                                │
└─────────────────────────────────────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  API Endpoints (Fastify + ts-rest)                              │
│    ├── /api/realtime/write (transaction processor)              │
│    ├── /api/realtime/getRecords (batch fetch)                   │
│    └── /api/audio/* (upload, download, metadata)                │
│                                                                   │
│  WebSocket Server (ws package)                                   │
│    ├── PubSub service (in-memory → Redis later)                 │
│    └── Subscription manager                                      │
│                                                                   │
│  Transaction Processor                                           │
│    ├── Load records from DB                                      │
│    ├── Apply operations                                          │
│    ├── Validate versions (optimistic concurrency)               │
│    ├── Check permissions                                         │
│    ├── Save to PostgreSQL                                        │
│    └── Publish updates via WebSocket                            │
│                                                                   │
│  Background Jobs                                                 │
│    ├── Task queue (tuple-database → Redis)                      │
│    ├── Waveform generation                                       │
│    ├── Audio transcoding                                         │
│    └── Project export                                            │
│                                                                   │
│  Database (PostgreSQL + Drizzle)                                 │
│    ├── users (with version field)                               │
│    ├── projects (name, bpm, collaborators, version)             │
│    ├── tracks (volume, pan, plugins, version)                   │
│    ├── clips (startBeat, duration, audioFileId, version)        │
│    ├── automation (points, version)                             │
│    └── audio_files (metadata, waveform, peaks, version)         │
│                                                                   │
│  Storage (S3 / Local FS)                                         │
│    ├── Audio files (.wav, .mp3, .flac)                          │
│    └── Waveform images (.png, .json)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Example: Moving a Clip

### Scenario: User drags audio clip from beat 0 to beat 8

**1. Client-Side (Optimistic Update)**
```typescript
// User drags clip
const newStartBeat = 8.0

// Apply operation locally IMMEDIATELY (optimistic)
const operation = {
  type: 'set',
  table: 'clips',
  id: 'clip-123',
  key: 'startBeat',
  value: 8.0
}

const oldRecord = recordCache.get('clips', 'clip-123')
const newRecord = applyOperation(oldRecord, operation)

recordCache.write('clips', newRecord) // UI updates instantly
```

**2. Queue Transaction (Offline-Safe)**
```typescript
const transaction = {
  txId: crypto.randomUUID(),
  authorId: currentUserId,
  operations: [operation],
  clientTimestamp: Date.now()
}

transactionQueue.enqueue(transaction)
// Saved to localStorage, will retry if offline
```

**3. Server Processing**
```typescript
// POST /api/realtime/write
async function handleWrite(transaction) {
  // 1. Load current clip from PostgreSQL
  const clip = await db.query.clips.findFirst({ where: eq(clips.id, 'clip-123') })

  // 2. Check version (optimistic concurrency)
  if (clip.version !== oldRecord.version) {
    return { status: 409, message: 'Conflict' } // Client will retry
  }

  // 3. Validate permissions
  const track = await db.query.tracks.findFirst({ where: eq(tracks.id, clip.trackId) })
  const project = await db.query.projects.findFirst({ where: eq(projects.id, track.projectId) })

  if (!canEditProject(currentUserId, project)) {
    return { status: 403, message: 'Permission denied' }
  }

  // 4. Apply operation
  const newClip = applyOperation(clip, operation)

  // 5. Save to PostgreSQL
  await db.update(clips)
    .set({ startBeat: 8.0, version: newClip.version })
    .where(eq(clips.id, 'clip-123'))

  // 6. Publish update to other clients
  pubsub.publish([
    { key: 'clip:clip-123', version: newClip.version }
  ])

  return { status: 200, body: { recordMap: { clips: { 'clip-123': newClip } } } }
}
```

**4. Other Clients (Real-Time Sync)**
```typescript
// WebSocket message received: { type: 'updates', updates: [{ key: 'clip:clip-123', version: 3 }] }

const cached = recordCache.get('clips', 'clip-123')

if (!cached || cached.version < 3) {
  // Fetch updated clip
  const response = await api.getRecords({ pointers: [{ table: 'clips', id: 'clip-123' }] })

  const updatedClip = response.recordMap.clips['clip-123']

  recordCache.write('clips', updatedClip) // UI updates reactively
  recordStorage.write('clips', updatedClip) // Save to IndexedDB
}
```

**Total Latency:**
- User sees change: **0ms** (optimistic)
- Server confirms: **50-200ms** (network roundtrip)
- Other clients see change: **100-500ms** (WebSocket + refetch)

---

## 📦 Package Structure

```
abe-stack/
├── apps/
│   ├── web/                    # Vite + React 19
│   │   ├── components/         # Timeline, Mixer, ClipBlock
│   │   ├── hooks/              # useProject, useTracks, useClips
│   │   ├── actions/            # write, undo, redo
│   │   └── contexts/           # RealtimeContext
│   │
│   ├── desktop/                # Electron (future)
│   ├── mobile/                 # React Native (future)
│   │
│   └── server/                 # Fastify + ts-rest
│       ├── routes/             # realtime, audio
│       ├── services/           # WebSocketServer, TaskQueue
│       └── lib/                # permissions, validation
│
├── packages/
│   ├── realtime/               # NEW: Real-time sync logic
│   │   ├── RecordCache.ts      # In-memory database
│   │   ├── RecordStorage.ts    # IndexedDB wrapper
│   │   ├── TransactionQueue.ts # Offline queue
│   │   ├── UndoRedoStack.ts    # Undo/redo
│   │   ├── WebSocketClient.ts  # Client WebSocket
│   │   └── WebSocketServer.ts  # Server WebSocket
│   │
│   ├── db/                     # PostgreSQL + Drizzle
│   │   └── schema/
│   │       ├── users.ts        # + version field
│   │       ├── projects.ts     # NEW
│   │       ├── tracks.ts       # NEW
│   │       ├── clips.ts        # NEW
│   │       ├── automation.ts   # NEW
│   │       └── audio-files.ts  # NEW
│   │
│   ├── shared/                 # Shared types
│   │   └── contracts/          # ts-rest API contracts
│   │
│   ├── storage/                # S3 / Local FS (existing)
│   ├── ui/                     # React components (existing)
│   └── api-client/             # Type-safe API (existing)
│
└── docs/
    ├── HYBRID_ARCHITECTURE.md          # This architecture
    ├── DAW_IMPLEMENTATION_GUIDE.md     # Step-by-step guide
    ├── DAW_UI_COMPONENTS.md            # React components
    └── HYBRID_ARCHITECTURE_SUMMARY.md  # You are here
```

---

## 🗓️ 8-Week Implementation Plan

### **Phase 1: Foundation (Week 1-2)**
- [ ] Add `version` fields to all database tables
- [ ] Create transaction operation types (set, listInsert, listRemove)
- [ ] Implement RecordCache (in-memory)
- [ ] Add `/api/realtime/write` endpoint
- [ ] Add `/api/realtime/getRecords` endpoint

### **Phase 2: Real-time Sync (Week 3-4)**
- [ ] Implement WebSocket server
- [ ] Implement WebSocket client
- [ ] Build pub/sub system
- [ ] Subscribe/unsubscribe logic
- [ ] Version-based update notifications

### **Phase 3: Offline Support (Week 5-6)**
- [ ] Implement RecordStorage (IndexedDB)
- [ ] Build TransactionQueue
- [ ] Stale-while-revalidate loaders
- [ ] Service worker for asset caching
- [ ] Handle online/offline transitions

### **Phase 4: Undo/Redo (Week 7)**
- [ ] Implement UndoRedoStack
- [ ] Operation inversion logic
- [ ] Keyboard shortcuts (Cmd+Z, Cmd+Shift+Z)
- [ ] Undo/redo UI indicators

### **Phase 5: Permissions (Week 8)**
- [ ] Row-level read validation
- [ ] Row-level write validation
- [ ] Project collaborator management
- [ ] Permission records loading

### **Phase 6: Audio Files (Week 9-10)**
- [ ] S3 signed URL upload
- [ ] Audio metadata extraction
- [ ] Background waveform generation
- [ ] Streaming audio playback

### **Phase 7: Background Jobs (Week 11)**
- [ ] Task queue implementation
- [ ] Audio transcoding task
- [ ] Waveform generation task
- [ ] Project export task

### **Phase 8: DAW UI (Week 12-16)**
- [ ] Timeline component
- [ ] Track headers with controls
- [ ] Draggable clip blocks
- [ ] Transport controls
- [ ] Mixer component
- [ ] Waveform visualization
- [ ] Automation lanes

---

## 🚀 Quick Start Guide

### 1. Install Dependencies

```bash
cd abe-stack
pnpm install
```

### 2. Create Realtime Package

```bash
mkdir -p packages/realtime/src
cd packages/realtime

cat > package.json <<EOF
{
  "name": "@abe-stack/realtime",
  "version": "0.1.0",
  "type": "module",
  "main": "./src/index.ts",
  "dependencies": {
    "tuple-database": "^2.2.4",
    "idb": "^7.1.1",
    "ws": "^8.13.0"
  }
}
EOF

pnpm install
```

### 3. Add Database Migrations

```bash
# Copy schema from docs/DAW_IMPLEMENTATION_GUIDE.md
# to packages/db/src/schema/projects.ts

pnpm db:generate
pnpm db:migrate
```

### 4. Start Development

```bash
# Terminal 1: Start database
docker-compose up postgres

# Terminal 2: Start server
pnpm --filter @abe-stack/server dev

# Terminal 3: Start web app
pnpm --filter @abe-stack/web dev
```

### 5. Open Browser

```
http://localhost:5173
```

---

## 🧪 Testing Strategy

### Unit Tests (Vitest)

```typescript
// packages/realtime/src/__tests__/transactions.test.ts
import { describe, it, expect } from 'vitest'
import { applyOperation, invertOperation } from '../transactions'

describe('Transaction operations', () => {
  it('should apply and invert set operation', () => {
    const record = { id: '1', version: 1, volume: 1.0 }
    const op = { type: 'set', table: 'tracks', id: '1', key: 'volume', value: 0.8 }

    const newRecord = applyOperation(record, op)
    expect(newRecord.volume).toBe(0.8)
    expect(newRecord.version).toBe(2)

    const inverted = invertOperation(record, newRecord, op)
    expect(inverted.value).toBe(1.0)
  })
})
```

### Integration Tests (Playwright)

```typescript
// apps/web/src/__tests__/collaboration.spec.ts
import { test, expect } from '@playwright/test'

test('real-time collaboration between 2 users', async ({ browser }) => {
  const user1 = await browser.newPage()
  const user2 = await browser.newPage()

  // User 1 creates project
  await user1.goto('/projects/new')
  await user1.fill('[name=name]', 'Collab Project')
  await user1.click('button[type=submit]')

  const projectUrl = user1.url()

  // User 2 opens same project
  await user2.goto(projectUrl)

  // User 1 changes BPM
  await user1.fill('[name=bpm]', '140')

  // User 2 sees update within 2 seconds
  await expect(user2.locator('[name=bpm]')).toHaveValue('140', { timeout: 2000 })
})
```

---

## 📈 Performance Targets

### Latency
- **Optimistic UI update**: < 16ms (1 frame)
- **Server roundtrip**: < 200ms
- **WebSocket notification**: < 100ms
- **Record fetch**: < 150ms
- **Undo/redo**: < 50ms

### Throughput
- **Concurrent users per project**: 5-10
- **Transactions per second**: 100+
- **Audio file upload**: 500MB max
- **Project size**: 1000+ clips

### Offline
- **IndexedDB storage**: 500MB+
- **Queued transactions**: 1000+
- **Cache retention**: 7 days

---

## 🔒 Security Considerations

### Authentication
- JWT tokens (7-day expiry)
- HTTP-only cookies for WebSocket auth
- Refresh token rotation

### Authorization
- Row-level permissions on all tables
- Project ownership + collaborators
- Validate read/write on every operation

### Data Validation
- Zod schemas for all API inputs
- Version number checks (optimistic concurrency)
- File size limits (audio uploads)

### Rate Limiting
- API endpoints: 100 req/min per user
- WebSocket messages: 1000 msg/min
- File uploads: 10 files/min

---

## 🎓 Key Concepts

### Operation-Based Transactions

Instead of sending full records, send **operations** that describe changes:

```typescript
// ❌ Bad: Send full record
{ table: 'clips', id: '123', data: { ...entireClip } }

// ✅ Good: Send operation
{ type: 'set', table: 'clips', id: '123', key: 'startBeat', value: 8.0 }
```

**Benefits:**
- Smaller payloads
- Invertible (for undo)
- Composable (batch multiple operations)
- Conflict-free (only change what you touched)

### Version-Based Sync

Every record has a `version` number that increments on writes:

```typescript
// Client has version 5
const cachedClip = { id: '123', version: 5, startBeat: 0 }

// Server notifies: "clip:123 is now version 6"
// Client refetches because 5 < 6

// Server returns version 6
const updatedClip = { id: '123', version: 6, startBeat: 8 }

// Client updates cache
recordCache.write('clips', updatedClip)
```

**Benefits:**
- Simple conflict detection
- Efficient (only send version number, not full record)
- Works with last-write-wins strategy

### Stale-While-Revalidate

Load data from offline cache immediately, fetch from server in background:

```typescript
async function loadClip(id: string) {
  // 1. Check in-memory cache
  const cached = recordCache.get('clips', id)
  if (cached) return cached

  // 2. Check IndexedDB (offline storage)
  const stored = await recordStorage.get('clips', id)
  if (stored) {
    recordCache.write('clips', stored) // Warm up cache
    // Continue loading from server in background
  }

  // 3. Fetch from server
  const response = await api.getRecords({ pointers: [{ table: 'clips', id }] })
  const serverClip = response.recordMap.clips[id]

  // 4. Update caches if server has newer version
  if (!stored || serverClip.version > stored.version) {
    recordCache.write('clips', serverClip)
    recordStorage.write('clips', serverClip)
  }

  return serverClip
}
```

**Benefits:**
- Instant UI (no loading spinner)
- Works offline
- Always converges to latest version

---

## 🎯 Next Steps

1. **Read the implementation guide**: `DAW_IMPLEMENTATION_GUIDE.md`
2. **Start with Phase 1**: Database schema + RecordCache
3. **Test early and often**: Write tests for each phase
4. **Deploy incrementally**: Ship Phase 1 before starting Phase 2
5. **Iterate on UI**: Use components from `DAW_UI_COMPONENTS.md`

---

## 🤝 Contributing

This hybrid architecture is designed to be **extended and customized**:

- Add new operation types (e.g., `MergeOperation` for complex updates)
- Implement custom permission logic (e.g., role-based access)
- Build additional UI components (e.g., piano roll, automation editor)
- Optimize for your use case (e.g., add indexes, tune cache sizes)

---

## 📚 Resources

### Documentation
- ABE-STACK: `/docs/DEVELOPER_GUIDE.md`
- CHET-STACK: `https://github.com/ccorcos/chet-stack/blob/v0/DOCS.md`
- Tuple Database: `https://github.com/ccorcos/tuple-database`
- Drizzle ORM: `https://orm.drizzle.team`
- ts-rest: `https://ts-rest.com`

### Tutorials
- Web Audio API: `https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API`
- IndexedDB: `https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API`
- WebSocket: `https://developer.mozilla.org/en-US/docs/Web/API/WebSocket`

---

**Built with ❤️ by combining the best of ABE-STACK and CHET-STACK**

Happy coding! 🎵
