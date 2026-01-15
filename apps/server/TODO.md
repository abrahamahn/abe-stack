# ABE Stack Server - Roadmap

> **Mission:** Production-ready TypeScript backend with real-time capabilities, offline-first support, and enterprise security features.

---

## Current Architecture

| Component                 | Implementation                 | Status      |
| ------------------------- | ------------------------------ | ----------- |
| **Framework**             | Fastify 5.x                    | ✅ Complete |
| **Database**              | PostgreSQL + Drizzle           | ✅ Complete |
| **API Pattern**           | ts-rest contracts              | ✅ Complete |
| **Auth**                  | JWT + Refresh Token Rotation   | ✅ Complete |
| **Password**              | Argon2id (OWASP params)        | ✅ Complete |
| **Security Events**       | Audit logging                  | ✅ Complete |
| **Account Lockout**       | Progressive delay              | ✅ Complete |
| **Rate Limiting**         | Token bucket                   | ✅ Complete |
| **Email**                 | Console + SMTP providers       | ✅ Complete |
| **Storage**               | Local + S3 providers           | ✅ Complete |
| **Pub/Sub**               | In-memory subscription manager | ✅ Complete |
| **Optimistic Locking**    | Version-based updates          | ✅ Complete |
| **Real-time (WebSocket)** | /ws route + auth + pub/sub     | ✅ Complete |
| **Offline Support**       | Not implemented                | ❌ Planned  |

---

## Completed Features

### Phase 1: Foundation ✅

- [x] Fastify 5.x with Pino logging
- [x] PostgreSQL + Drizzle ORM with migrations
- [x] ts-rest contract-based routing
- [x] Zod-validated configuration system
- [x] Service container pattern (App class)
- [x] Modular architecture (infra/modules separation)

### Phase 2: Authentication ✅

- [x] User registration with email/password
- [x] Login with JWT access tokens (15 min expiry)
- [x] Refresh token rotation (7-day tokens)
- [x] Token family tracking for reuse detection
- [x] Secure logout (token invalidation)
- [x] Argon2id password hashing
- [x] Password strength validation

### Phase 3: Security Hardening ✅

- [x] Login attempt tracking
- [x] Account lockout after failed attempts
- [x] Progressive delay on failed logins
- [x] Security event logging (token reuse, lockouts)
- [x] Admin unlock endpoint
- [x] IP extraction with proxy validation
- [x] Rate limiting middleware
- [x] CORS and security headers

### Phase 4: Infrastructure ✅

- [x] Database transaction wrapper
- [x] Optimistic locking utilities
- [x] Email service abstraction (Console, SMTP)
- [x] Storage provider abstraction (Local, S3)
- [x] Pub/Sub subscription manager
- [x] publishAfterWrite helper
- [x] Standardized API response/error shape
- [x] Global error handler for JSON errors
- [x] SMTP email service via nodemailer
- [x] Email template layout helper
- [x] Rate limiter supports custom store
- [x] JWT header alg validation

### Phase 4.5: Near-Term Priorities (Next 4–8 Weeks)

#### 4.5A. File Uploads (Backend)

- [ ] Presigned upload endpoint (filename + contentType)
- [ ] Storage key conventions (uploads/{uuid}/{filename})
- [ ] Optional upload confirmation endpoint

#### 4.5B. Pagination Contract (Core + Backend)

- [ ] Cursor-based pagination schema in @abe-stack/core
- [ ] Document pagination shape for list endpoints

#### 4.5C. WebSocket Client Library (Frontend)

- [ ] packages/ws-client with reconnect + auth refresh
- [ ] Subscription dedup + query invalidation integration

#### 4.5D. Request IDs + Structured Logging (Backend)

- [ ] Request ID hook + X-Request-ID header
- [ ] Child logger with requestId context

---

## Planned Features

### Phase 5: Real-Time Infrastructure

WebSocket-based real-time updates for collaborative features.

#### 5A. WebSocket Integration (Backend)

- [x] Install @fastify/websocket (Backend)
- [x] Create WebSocket plugin with authentication (Backend)
- [ ] Implement client-side WebsocketPubsubClient (Frontend)
- [ ] Add subscription reference counting (Backend)

```typescript
// Target pattern
pubsub.subscribe(`record:user:${id}`, async ({ version }) => {
  if (version > cache.getVersion(pointer)) {
    const fresh = await api.getRecord(pointer);
    cache.write(fresh);
  }
});
```

#### 5B. Real-Time Event Broadcasting (Backend)

- [ ] Broadcast version updates after writes (Backend)
- [ ] Client-side cache invalidation on version mismatch (Frontend)
- [ ] Debounced unsubscribe (10s) to prevent thrashing (Frontend)

### Phase 6: Conflict Resolution

Handle concurrent edits gracefully.

#### 6A. Transaction Queue (Frontend)

- [ ] Client-side transaction queue with retry
- [ ] localStorage persistence for offline resilience
- [ ] Exponential backoff on server errors
- [ ] 409 Conflict handling with rollback callback

#### 6B. Conflict UI (Frontend)

- [ ] Conflict resolution helpers
- [ ] User-facing merge UI for conflicts

### Phase 7: Undo/Redo System (Frontend + Backend)

Operation-based undo/redo for document-editing UX.

- [ ] Define Operation types (set, listInsert, listRemove) (Frontend + Backend)
- [ ] Implement applyOperation function (Backend)
- [ ] Implement invertOperation function (Backend)
- [ ] Create UndoRedoStack with time-based batching (Frontend)
- [ ] Add Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts (Frontend)

### Phase 8: Advanced Permissions (Backend)

Table-level permission validators beyond role-based checks.

- [ ] Permission validators per table (create/update/delete)
- [ ] Permission record cascade loading
- [ ] Before/after record comparison in write handler
- [ ] Field-level update restrictions

### Phase 9: Offline-First Support (Frontend)

Full offline capability with IndexedDB persistence.

- [ ] IndexedDB record storage layer (Frontend)
- [ ] Stale-while-revalidate loading pattern (Frontend)
- [ ] Service worker for offline assets (Frontend)
- [ ] Background sync when online (Frontend)

### Phase 10: MFA Support (Backend)

Multi-factor authentication for enterprise security.

- [ ] TOTP secret generation (speakeasy library)
- [ ] QR code generation for authenticator apps
- [ ] MFA setup/verify/disable endpoints
- [ ] Login flow with MFA challenge
- [ ] Recovery codes

### Phase 11: Enhanced RBAC (Backend)

Full role-based access control system.

- [ ] Roles table with permissions
- [ ] User-role assignments
- [ ] requirePermission middleware
- [ ] Admin UI for role management
- [ ] Default roles (admin, moderator, user)

### Phase 12: Production Hardening (Backend)

Horizontal scaling and reliability improvements.

- [ ] Redis pub/sub adapter (horizontal scaling)
- [ ] Token blacklist for immediate revocation
- [ ] Multi-provider email (SendGrid, Mailgun, SES)
- [ ] Persistent job queue (pg-boss)
- [ ] Health check endpoints with dependency status

---

## File Structure After Full Implementation

```
apps/server/src/
├── config/                  # ✅ Complete
├── infra/
│   ├── database/            # ✅ Complete
│   ├── storage/             # ✅ Complete
│   ├── email/               # ✅ Complete
│   ├── pubsub/              # ✅ Complete
│   ├── security/            # ✅ Complete
│   ├── http/                # ✅ Complete
│   ├── rate-limit/          # ✅ Complete
│   ├── websocket/           # Phase 5 - WebSocket plugin
│   ├── queue/               # Phase 12 - Job queue
│   │   ├── pg-boss-queue.ts
│   │   └── tasks/
│   └── mfa/                 # Phase 10 - TOTP utilities
├── modules/
│   ├── auth/                # ✅ Complete
│   ├── users/               # ✅ Complete
│   ├── admin/               # ✅ Complete
│   └── roles/               # Phase 11 - RBAC module
├── shared/                  # ✅ Complete
└── scripts/                 # ✅ Complete

packages/core/src/
├── transaction/             # Phase 7 - Undo/redo
│   ├── types.ts
│   ├── apply.ts
│   └── invert.ts
├── permissions/             # Phase 8 - Permission validators
│   ├── validators.ts
│   └── cascade.ts
└── cache/                   # Phase 6 - Batched queries
    └── batched-queue.ts

packages/sdk/src/
├── transaction-queue.ts     # Phase 6 - Client queue
├── undo-redo.ts             # Phase 7 - Undo/redo stack
└── websocket-client.ts      # Phase 5 - WS client

apps/web/src/
├── services/
│   ├── record-cache.ts      # Phase 9 - Memory cache
│   ├── record-storage.ts    # Phase 9 - IndexedDB
│   └── subscription-cache.ts # Phase 5 - Subscription tracking
└── service-worker.js        # Phase 9 - Offline assets
```

---

## Technical Decisions

| Decision         | Choice              | Rationale                                    |
| ---------------- | ------------------- | -------------------------------------------- |
| Framework        | Fastify 5.x         | 2x faster than Express, schema compilation   |
| Database         | PostgreSQL          | ACID, production-ready, pg-boss integration  |
| ORM              | Drizzle             | Type-safe, lightweight, great DX             |
| API Pattern      | ts-rest             | Compile-time type safety, OpenAPI generation |
| Password Hashing | Argon2id            | OWASP recommended, memory-hard               |
| JWT Strategy     | Rotation + Families | Reuse detection, secure refresh              |
| Pub/Sub          | Memory → Redis      | Start simple, scale later                    |
| Job Queue        | pg-boss             | Same database, no extra infra                |
| MFA              | TOTP (speakeasy)    | Industry standard, no SMS costs              |

---

## Success Criteria

### MVP (Current State) ✅

- [x] All auth endpoints functional
- [x] Token rotation with reuse detection
- [x] Account lockout on failed attempts
- [x] Security event audit trail

### Real-Time Ready (Phase 5-6)

- [ ] WebSocket clients receive real-time updates
- [ ] Concurrent edits return 409 Conflict
- [ ] Failed writes retry automatically

### Offline-First (Phase 7-9)

- [ ] Undo/redo works with Ctrl+Z
- [ ] App works offline (cached data + queued writes)
- [ ] Permission errors show meaningful messages

### Enterprise Ready (Phase 10-12)

- [ ] MFA setup and verification works
- [ ] RBAC controls admin access
- [ ] Horizontal scaling with Redis
- [ ] Background jobs process reliably

---

## References

- [Fastify Documentation](https://fastify.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [ts-rest](https://ts-rest.com/)
- [pg-boss - PostgreSQL Job Queue](https://github.com/timgit/pg-boss)
- [speakeasy - TOTP Library](https://github.com/speakeasyjs/speakeasy)
- [OWASP Password Guidelines](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

---

_Last Updated: 2026-01-15_
