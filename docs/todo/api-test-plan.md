# API Integration Test Plan

> Comprehensive test coverage for apps/server API endpoints and infrastructure.

---

## Current State Summary

### What's Built

| Layer                 | Modules                          | Test Files | Coverage |
| --------------------- | -------------------------------- | ---------- | -------- |
| **Modules**           | 4 (auth, admin, users, realtime) | 12         | ~95%     |
| **Infrastructure**    | 18 modules                       | 53         | ~85%     |
| **Integration Tests** | -                                | 10         | Partial  |

### API Endpoints (13 total)

| Module   | Endpoints | Tested     |
| -------- | --------- | ---------- |
| Auth     | 9         | ✅ Yes     |
| Users    | 2         | ✅ Yes     |
| Admin    | 1         | ✅ Yes     |
| Realtime | 2         | ⚠️ Partial |
| Health   | 5         | ✅ Yes     |

---

## Existing Integration Tests

### apps/server/src/**tests**/integration/

| File                                   | Tests | Coverage                                         |
| -------------------------------------- | ----- | ------------------------------------------------ |
| `auth-routes.integration.test.ts`      | 18    | Login, register, refresh, logout, password reset |
| `user-routes.integration.test.ts`      | 14    | /users/me authentication and profile             |
| `admin-routes.integration.test.ts`     | 15    | Account unlock with role checks                  |
| `health-endpoints.integration.test.ts` | 32    | All health endpoints                             |
| `auth.integration.test.ts`             | 73    | Full auth flows, CSRF                            |
| `error-handling.integration.test.ts`   | 51    | Error responses (4xx, 5xx)                       |
| `http.integration.test.ts`             | 87    | Security headers, CORS, CSRF, rate limiting      |
| `middleware.integration.test.ts`       | 48    | Middleware chain                                 |
| `permissions.integration.test.ts`      | 69    | Row-level permissions                            |

**Total: ~407 integration tests**

---

## Gap Analysis

### Missing API Integration Tests

#### 1. Realtime Module (HIGH PRIORITY)

```
POST /api/realtime/write
POST /api/realtime/getRecords
```

**Needs tests for:**

- [ ] Basic write operations (set, set-now)
- [ ] List operations (listInsert, listRemove)
- [ ] Version conflict detection (409)
- [ ] Concurrent writes (optimistic locking)
- [ ] Protected field rejection
- [ ] Unauthorized table access
- [ ] Record not found errors
- [ ] getRecords batch loading
- [ ] PubSub notification after write

#### 2. Auth Edge Cases (MEDIUM PRIORITY)

- [ ] Token reuse detection
- [ ] Refresh token family rotation under load
- [ ] Concurrent login attempts
- [ ] Email verification token expiry
- [ ] Password reset with already-used token

#### 3. WebSocket Integration (MEDIUM PRIORITY)

- [ ] Connection with valid JWT
- [ ] Connection rejection without auth
- [ ] Subscription to allowed tables
- [ ] Subscription to disallowed tables
- [ ] Message receive after write
- [ ] Reconnection with same subscriptions
- [ ] CSRF token validation on upgrade

#### 4. File Upload/Download (LOW PRIORITY - if files module is exposed)

- [ ] Presigned URL generation
- [ ] File upload flow
- [ ] Signature verification
- [ ] Path traversal prevention

---

## Test Plan: Realtime Module

### File: `apps/server/src/__tests__/integration/realtime.integration.test.ts`

```typescript
describe('Realtime API Integration', () => {
  describe('POST /api/realtime/write', () => {
    describe('Authentication', () => {
      it('rejects unauthenticated requests (401)');
      it('rejects requests with invalid token (401)');
      it('accepts requests with valid token (200)');
    });

    describe('Basic Operations', () => {
      it('applies SET operation to existing record');
      it('applies SET_NOW operation with server timestamp');
      it('returns updated recordMap in response');
      it('increments version on successful write');
    });

    describe('List Operations', () => {
      it('applies listInsert with prepend position');
      it('applies listInsert with append position');
      it('applies listInsert with before position');
      it('applies listInsert with after position');
      it('applies listRemove operation');
    });

    describe('Validation', () => {
      it('rejects write to disallowed table (403)');
      it('rejects write to protected field (400)');
      it('rejects write with mismatched authorId (403)');
      it('rejects write to non-existent record (400)');
      it('validates transaction schema');
    });

    describe('Optimistic Locking', () => {
      it('detects version conflict (409)');
      it('succeeds when versions match');
      it('handles concurrent writes correctly');
      it('returns conflicting records in error response');
    });

    describe('Transactions', () => {
      it('applies multiple operations atomically');
      it('rolls back on partial failure');
    });
  });

  describe('POST /api/realtime/getRecords', () => {
    describe('Authentication', () => {
      it('rejects unauthenticated requests (401)');
      it('accepts requests with valid token (200)');
    });

    describe('Record Loading', () => {
      it('loads single record by pointer');
      it('loads multiple records in batch');
      it('returns empty map for non-existent records');
      it('validates pointer array (min 1, max 100)');
    });

    describe('Table Access', () => {
      it('allows access to permitted tables');
      it('rejects access to disallowed tables (403)');
    });
  });
});
```

**Estimated: 35-40 tests**

---

## Test Plan: WebSocket Integration

### File: `apps/server/src/__tests__/integration/websocket.integration.test.ts`

```typescript
describe('WebSocket Integration', () => {
  describe('Connection', () => {
    it('accepts connection with valid JWT in protocol header');
    it('accepts connection with valid JWT in cookie');
    it('rejects connection without authentication (403)');
    it('rejects connection with invalid JWT (403)');
    it('requires CSRF token for upgrade');
  });

  describe('Subscriptions', () => {
    it('subscribes to record updates');
    it('receives message when subscribed record changes');
    it('unsubscribes from record updates');
    it('handles multiple subscriptions');
    it('rejects subscription to disallowed tables');
  });

  describe('Message Format', () => {
    it('sends update message with correct key format');
    it('includes version in update message');
    it('handles malformed client messages gracefully');
  });

  describe('Reconnection', () => {
    it('allows reconnection with new token');
    it('cleans up subscriptions on disconnect');
  });
});
```

**Estimated: 15-20 tests**

---

## Test Plan: Auth Edge Cases

### File: `apps/server/src/__tests__/integration/auth-edge-cases.integration.test.ts`

```typescript
describe('Auth Edge Cases', () => {
  describe('Token Reuse Detection', () => {
    it('invalidates family when refresh token is reused');
    it('logs security event on token reuse');
    it('forces re-login after token reuse detected');
  });

  describe('Concurrent Operations', () => {
    it('handles concurrent login attempts');
    it('handles concurrent token refresh');
    it('handles concurrent password reset requests');
  });

  describe('Token Expiry', () => {
    it('rejects expired email verification token');
    it('rejects expired password reset token');
    it('allows grace period for refresh token rotation');
  });

  describe('Account Lockout', () => {
    it('applies progressive delay after failed attempts');
    it('locks account after max failures');
    it('admin can unlock locked account');
    it('lockout resets after successful login');
  });
});
```

**Estimated: 15-20 tests**

---

## Infrastructure Tests (Already Comprehensive)

These modules have good unit test coverage and don't necessarily need API integration tests:

| Module      | Unit Tests | Notes                               |
| ----------- | ---------- | ----------------------------------- |
| database    | 4 files    | Transaction, optimistic lock tested |
| email       | 6 files    | Provider factory tested             |
| http        | 5 files    | CSRF, cookies, security headers     |
| storage     | 5 files    | Local + S3 providers tested         |
| pubsub      | 4 files    | PostgreSQL adapter tested           |
| queue       | 2 files    | Job processing tested               |
| permissions | 2 files    | Row-level ACL tested                |
| rate-limit  | 1 file     | Token bucket tested                 |
| security    | 4 files    | Lockout, audit tested               |
| media       | 4 files    | Processing pipelines tested         |

---

## Priority Order

### Phase 1: Critical Path (Now)

1. **Realtime write/getRecords** - Core CRUD functionality
2. **WebSocket subscriptions** - Real-time updates

### Phase 2: Security Hardening

3. **Auth edge cases** - Token reuse, concurrent ops
4. **CSRF on WebSocket** - Already partially tested

### Phase 3: Full Coverage

5. **File upload/download** - When API exposed
6. **Admin operations** - As features added

---

## Running Integration Tests

```bash
# Run all integration tests
pnpm --filter @abe-stack/server test -- --run integration

# Run specific test file
pnpm --filter @abe-stack/server test -- --run realtime.integration

# Run with coverage
pnpm --filter @abe-stack/server test -- --run --coverage
```

---

## Test Utilities Needed

### apps/server/src/**tests**/test-utils.ts

```typescript
// Already exists, may need additions:
export async function createTestApp(): Promise<FastifyInstance>;
export function createAuthenticatedRequest(app, user): RequestOptions;
export function createTestUser(): Promise<User>;
export function createTestToken(userId): string;
export function waitForPubSubMessage(ws, timeout): Promise<Message>;
```

---

## Summary

| Category        | Existing | To Add  | Total    |
| --------------- | -------- | ------- | -------- |
| Auth routes     | 91       | 15      | 106      |
| User routes     | 14       | 0       | 14       |
| Admin routes    | 15       | 0       | 15       |
| Realtime routes | 0        | 40      | 40       |
| WebSocket       | 0        | 20      | 20       |
| Health          | 32       | 0       | 32       |
| HTTP/Security   | 135      | 0       | 135      |
| **Total**       | **~407** | **~75** | **~482** |

---

## Next Steps

1. Create `realtime.integration.test.ts` with write/getRecords tests
2. Create `websocket.integration.test.ts` with subscription tests
3. Add auth edge case tests to existing auth integration file
4. Run full test suite and verify coverage

---

Last Updated: 2026-01-21
