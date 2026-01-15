# ABE Stack Roadmap

**Last Updated: January 10, 2026**

Single source of truth for project milestones and implementation priorities. Organized by milestone with checkboxes for task tracking.

---

## Overview

The roadmap is organized into four major milestones:

1. **V5 Migration** - Restructure to layer-based architecture
2. **CHET-Stack Real-Time** - Add pub/sub, WebSockets, offline support
3. **Security Phase 2** - Passport.js, additional auth methods, hardening
4. **Remaining TODOs** - UI, testing, infrastructure polish

---

## Milestone 1: V5 Architecture Migration

Restructure from role-based (`apps/`, `packages/`) to layer-based (`frontend/`, `backend/`, `shared/`) architecture. See [Architecture](./dev/architecture/index.md) for details.

### Phase 1: Preparation

- [ ] Create new directory structure: `frontend/`, `backend/`, `shared/`
- [ ] Update path aliases in all tsconfig.json files
- [ ] Update Turborepo pipeline configuration
- [ ] Document migration strategy for each package

### Phase 2: Backend Migration

- [ ] Move `apps/server/` to `backend/server/`
- [ ] Move `apps/server/src/infra/database/` to `backend/db/`
- [ ] Move `apps/server/src/infra/storage/` to `backend/storage/`
- [ ] Update all import paths (e.g., `@db` → `backend/db`)
- [ ] Verify server builds and tests pass

### Phase 3: Frontend Migration

- [ ] Move `apps/web/` to `frontend/web/`
- [ ] Move `apps/desktop/` to `frontend/desktop/`
- [ ] Move `apps/mobile/` to `frontend/mobile/`
- [ ] Move `packages/ui/` to `frontend/ui/`
- [ ] Move `packages/sdk/` to `frontend/sdk/`
- [ ] Update all import paths
- [ ] Verify all frontend apps build and tests pass

### Phase 4: Shared Layer

- [ ] Move `packages/core/` to `shared/`
- [ ] Ensure contracts and types are accessible from both layers
- [ ] Update documentation paths and examples

### Phase 5: Cleanup

- [ ] Remove old `apps/` and `packages/` directories
- [ ] Update all documentation to reflect new structure
- [ ] Update CI/CD pipelines
- [ ] Update Docker configurations

---

## Milestone 2: CHET-Stack Real-Time Features

Add real-time collaboration, offline support, and optimistic updates. See [Architecture](./dev/architecture/index.md#future-real-time-features).

### Phase 1: Foundation

- [ ] Add `version` field to all syncable database tables
- [ ] Create `packages/realtime` with transaction types
- [ ] Implement `RecordCache` (in-memory with tuple-database)
- [ ] Add `/api/realtime/write` endpoint
- [ ] Add `/api/realtime/getRecords` endpoint

### Phase 2: Real-Time Sync

- [ ] Implement `WebSocketServer` (ws package)
- [ ] Implement `WebSocketPubSubClient`
- [ ] Create `RealtimeContext` and `RealtimeProvider`
- [ ] Add subscription management (subscribe/unsubscribe by key)
- [ ] Version-based update notifications

### Phase 3: Offline Support

- [ ] Implement `RecordStorage` (IndexedDB wrapper)
- [ ] Implement `TransactionQueue` for offline writes
- [ ] Add stale-while-revalidate loaders
- [ ] Service worker for asset caching
- [ ] Conflict resolution (last-write-wins)

### Phase 4: Undo/Redo

- [ ] Implement `UndoRedoStack`
- [ ] Operation inversion logic for all operation types
- [ ] Keyboard shortcuts (Cmd+Z / Cmd+Shift+Z)
- [ ] UI indicators for undo/redo availability

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

## Milestone 3: Security Phase 2

Enhanced authentication with Passport.js and additional security hardening. See [Security Phase 2 Roadmap](./security/phase-2-roadmap.md).

### Phase 1: Security Hardening (COMPLETED)

- [x] Migrate password hashing from bcrypt to Argon2id
- [x] Implement rate limiting on auth endpoints
- [x] Add login attempt logging
- [x] Implement account lockout with progressive delays
- [x] Add password strength validation with zxcvbn
- [x] Implement refresh token rotation with reuse detection
- [x] Add CSRF protection (double-submit cookie pattern)

### Phase 2: Passport.js Integration

- [ ] Install and configure Passport.js with Fastify adapter
- [ ] Implement `passport-local` strategy
- [ ] Add session management with secure cookie store
- [ ] Create strategy enable/disable configuration
- [ ] Update auth routes to use Passport.js

### Phase 3: Additional Auth Methods

- [ ] Magic links (`passport-magic-link`)
- [ ] Passkeys/WebAuthn (`passport-webauthn`)
- [ ] WebAuthn registration/authentication UI
- [ ] Passkey management UI (list, rename, delete)

### Phase 4: Social/OAuth Providers

- [ ] Google OAuth (`passport-google-oauth20`)
- [ ] GitHub OAuth (`passport-github`)
- [ ] Apple OAuth (`passport-apple`)
- [ ] OAuth connection management UI
- [ ] Account linking (multiple providers per account)

### Phase 5: Advanced Features

- [ ] TOTP 2FA (`passport-totp` + `speakeasy`)
- [ ] BFF proxy mode for maximum security
- [ ] Step-up authentication for sensitive operations
- [ ] Device/session management UI
- [ ] "Remember this device" functionality

### Database Schema Updates Required

- [ ] `refresh_token_families` table (reuse detection)
- [ ] `webauthn_credentials` table (passkeys)
- [ ] `magic_link_tokens` table
- [ ] `login_attempts` table
- [ ] `oauth_connections` table

---

## Milestone 4: Remaining TODOs

### Backend

- [ ] Email service abstraction (provider-agnostic with local stub)
- [ ] Input validation with Zod; consistent error envelope
- [ ] API versioning and OpenAPI/typed client generation
- [ ] Health checks and readiness endpoints
- [ ] Generate fetch/React Query clients from ts-rest contract

### Frontend (Web)

- [ ] Error boundary + toasts for API errors
- [ ] Accessibility pass (focus management, keyboard resize handles)
- [ ] E2E tests for auth and layout resize persistence

### Infrastructure

- [ ] Dockerfile/docker-compose for server + Postgres + maildev
- [ ] Production Postgres settings (connection pooling, SSL)
- [ ] Secrets management documentation (env, Vault, SSM)
- [ ] Observability hooks (request logs, metrics, error reporting)
- [ ] Database backup/retention plan

### Testing

- [ ] Integration tests for API routes (vitest + fastify inject)
- [ ] Playwright E2E for auth + layout resize persistence
- [ ] Unit tests for Argon2id hashing and bcrypt migration
- [ ] Integration tests for each Passport strategy
- [ ] Security audit: OWASP testing guide compliance

### Documentation

- [ ] Update README with status badges once features land
- [ ] Quickstart guides per app (web/desktop/mobile)
- [ ] API docs (OpenAPI or generated client usage)
- [ ] Release checklist (versioning, changelog, tagging)

### UI Package

- [ ] Accessibility: keyboard support for ResizablePanel (arrow keys)
- [ ] Performance: lazy load demo registry by category
- [ ] Code consistency: standardize arrow functions with forwardRef

---

## Priority Matrix

| Priority     | Area         | Items                                    |
| ------------ | ------------ | ---------------------------------------- |
| **Critical** | Security     | Passport.js integration, CSRF hardening  |
| **High**     | Architecture | V5 migration preparation                 |
| **High**     | Real-Time    | Foundation (version fields, RecordCache) |
| **Medium**   | Backend      | Email service, API versioning            |
| **Medium**   | Testing      | E2E tests, API integration tests         |
| **Low**      | UI           | Demo lazy loading, code standardization  |

---

## Notes

- V5 migration should be done incrementally to avoid breaking changes
- CHET-Stack features can be implemented independently per phase
- Security Phase 2 builds on completed Phase 1 foundations
- All changes require passing format, lint, type-check, and test checks
