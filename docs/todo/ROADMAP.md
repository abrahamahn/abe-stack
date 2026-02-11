# ABE Stack Roadmap

> **Scope:** Features deferred beyond the current sprint plan — require enterprise customers, dedicated platform engineers, or large teams (5+ engineers).

**Last Updated: 2026-02-11**

---

## When to Use This Roadmap

Add features here when you have:

- Enterprise customers requiring Passkeys/WebAuthn
- Platform engineer to own observability
- Traffic that justifies load testing
- Collaborative editing requirements (CHET-Stack)

---

## Milestone 1: CHET-Stack Real-Time Features

Add real-time collaboration, offline support, and optimistic updates.

### Phase 1: Foundation

- [ ] Add `version` field to all syncable database tables
- [ ] Create `infra/realtime` with transaction types
- [x] Implement `RecordCache` (in-memory with version conflict resolution) → `@abe-stack/client-engine/cache`
- [ ] Add `/api/realtime/write` endpoint
- [ ] Add `/api/realtime/getRecords` endpoint

> **Implementation:** `RecordCache` in `client/src/cache/RecordCache.ts` (69 tests)
> **Partial progress:** WriteService (`apps/server/src/infra/write/`) provides transaction handling, version bumping, and auto-pubsub

### Phase 2: Real-Time Sync

- [x] Implement `WebSocketServer` (ws package) → `apps/server/src/infra/websocket/`
- [x] Implement `WebSocketPubSubClient` → `@abe-stack/client-engine/pubsub` (20 tests)
- [ ] Create `RealtimeContext` and `RealtimeProvider`
- [x] Add subscription management (subscribe/unsubscribe by key) → `SubscriptionCache` (20 tests)
- [ ] Version-based update notifications

> **Implementation:** Client in `client/src/pubsub/`, Server in `apps/server/src/infra/websocket/`

### Phase 3: Offline Support

- [x] Implement `RecordStorage` (IndexedDB wrapper) → `@abe-stack/client-engine/cache` (31 tests)
- [x] Implement `TransactionQueue` for offline writes → `@abe-stack/client-engine/offline` (26 tests)
- [x] Add stale-while-revalidate loaders → `LoaderCache` with TTL (57 tests)
- [ ] Service worker for asset caching
- [x] Conflict resolution (last-write-wins) → Built into RecordCache/RecordStorage

> **Implementation:** `client/src/cache/RecordStorage.ts`, `client/src/offline/TransactionQueue.ts`, `client/src/cache/LoaderCache.ts`

### Phase 4: Undo/Redo

- [x] Implement `UndoRedoStack` → `@abe-stack/client-engine/undo` (38 tests)
- [x] Operation inversion logic → Built into UndoRedoStack with grouping support
- [ ] Keyboard shortcuts (Cmd+Z / Cmd+Shift+Z)
- [ ] UI indicators for undo/redo availability (use `onStateChange` callback)

> **Implementation:** `client/src/undo/UndoRedoStack.ts`

### Phase 5: Permissions

- [ ] Row-level read validation
- [ ] Row-level write validation
- [ ] Permission records loading
- [ ] Workspace/board/task permission patterns

### Phase 6: React Hooks

- [ ] `useRecord<T>(table, id)` - single record subscription
- [ ] `useRecords<T>(table, filters)` - collection subscription
- [ ] `useWrite()` - optimistic write with queue
- [ ] `useUndoRedo()` - undo/redo controls

---

## Milestone 2: WebAuthn / Passkeys

Passwordless authentication via hardware keys and biometrics. Standalone — does not require Passport.js.

### Implementation

- [ ] `webauthn_credentials` table (DB migration)
- [ ] WebAuthn registration endpoint (challenge + attestation)
- [ ] WebAuthn authentication endpoint (challenge + assertion)
- [ ] Registration UI (add passkey from settings)
- [ ] Authentication UI (passkey login option)
- [ ] Passkey management UI (list, rename, delete)

---

## Milestone 3: Security Phase 1 (COMPLETED)

- [x] Migrate password hashing from bcrypt to Argon2id
- [x] Implement rate limiting on auth endpoints
- [x] Add login attempt logging
- [x] Implement account lockout with progressive delays
- [x] Add password strength validation with zxcvbn
- [x] Implement refresh token rotation with reuse detection
- [x] Add CSRF protection (double-submit cookie pattern)

---

## Infrastructure Improvements

### Error Handling

- [ ] Request context logging (IP, method, path, user agent)
- [x] Error serialization with `.toJSON()` - AppError in `@abe-stack/shared/errors`
- [x] Correlation IDs for tracing requests - `apps/server/src/infra/logger/`
- [ ] Conditional logging by severity (500+ vs client errors)

> **Implementation:** Errors in `shared/core/src/errors/`, Logging in `apps/server/src/infra/logger/`

### API Versioning & Typed Client

- [ ] API versioning and OpenAPI/typed client generation
- [ ] Generate fetch/React Query clients from ts-rest contract
- [x] Route registry pattern (`registerRouteMap` - DRY route registration)
- [x] Modular server composition (QueueServer pattern)

> **Implementation:** `apps/server/src/infra/router/` (route registry), `apps/server/src/infra/queue/` (QueueServer)

---

## Priority Matrix

| Priority   | Area      | Items                                     |
| ---------- | --------- | ----------------------------------------- |
| **High**   | Real-Time | React hooks, RealtimeProvider             |
| **Medium** | Security  | WebAuthn/Passkeys                         |
| **Medium** | Backend   | API versioning, typed client generation   |
| **Low**    | Debugging | Request context logging, severity logging |

> **Engine status (2026-01-20):** `RecordCache`, `RecordStorage`, `LoaderCache`, `SubscriptionCache`, `TransactionQueue`, `UndoRedoStack`, `WebsocketPubsubClient` (261 tests total)

---

## Notes

- CHET-Stack features can be implemented independently per phase
- WebAuthn/Passkeys is standalone — no Passport.js dependency
- All changes require passing format, lint, type-check, and test checks

---

## References

- **In-scope tasks:** See `docs/todo/TODO.md`
- **Business checklist:** See `docs/CHECKLIST.md`

---

_Last Updated: 2026-02-11_
