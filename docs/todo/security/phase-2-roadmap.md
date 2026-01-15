# Security Phase 2 - Roadmap

**Last Updated: January 10, 2026**

This document outlines remaining security enhancements and refactoring opportunities identified during Phase 1 code review. All items are tracked for future implementation.

## Overview

Phase 1 (✅ **COMPLETED**) delivered production-ready authentication with:

- Argon2id password hashing
- Account lockout with progressive delays
- Refresh token rotation with reuse detection
- CSRF protection
- Rate limiting infrastructure
- Comprehensive security logging
- Environment validation
- Timing attack protection

Phase 2 focuses on data integrity, advanced security features, and operational excellence.

---

## CRITICAL PRIORITY (14 hours estimated)

### 1. Database Transaction Support ⚠️ HIGHEST IMPACT (Backend)

**Effort:** 4 hours | **Impact:** Critical

**Problem:**

- User registration + token creation can leave orphaned data if token creation fails
- Token rotation can fail mid-operation, leaving user without valid token
- No atomic operations for multi-step auth flows
- Risk of data inconsistency

**Implementation:**

```typescript
// apps/server/src/infra/database/transaction.ts
export async function withTransaction<T>(
  db: DbClient,
  callback: (tx: DbClient) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    return await callback(tx);
  });
}
```

**Files to Update:**

- `apps/server/src/infra/database/index.ts` - Export transaction helper
- `apps/server/src/modules/index.ts` - Wrap registration, login, token rotation
- `apps/server/src/shared/refresh-token.ts` - Use transactions for rotation
- Test mocks - Add transaction simulation

**Success Criteria:**

- [ ] Registration is atomic (user + token family or nothing)
- [ ] Token rotation is atomic (delete old + create new or nothing)
- [ ] Tests verify rollback on failure
- [ ] No orphaned records in database

---

### 2. Token Reuse Detection - Security Event Logging (Backend)

**Effort:** 3 hours | **Impact:** High

**Problem:**

- When token reuse is detected, family is revoked but NO security event is logged
- No notification sent to user that account may be compromised
- Silent failure - attacker doesn't know they were caught
- No metrics on reuse detection rate

**Implementation:**

```typescript
// apps/server/src/shared/security-events.ts
export interface SecurityEvent {
  type: 'TOKEN_REUSE_DETECTED' | 'ACCOUNT_LOCKED' | 'PASSWORD_RESET' | 'ADMIN_UNLOCK';
  userId: string;
  email: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

export async function logSecurityEvent(db: DbClient, event: SecurityEvent): Promise<void>;

export async function notifyUserOfSecurityEvent(email: string, eventType: string): Promise<void>;
```

**Files to Update:**

- Create `apps/server/src/shared/security-events.ts`
- Create `apps/server/src/infra/database/schema/security-events.ts` - New table
- Update `apps/server/src/shared/refresh-token.ts` - Log reuse detection
- Add email notification integration (when email service ready)

**Success Criteria:**

- [ ] Token reuse creates security_event record
- [ ] User receives email notification
- [ ] Admin dashboard can query security events
- [ ] Metrics exported for monitoring

---

### 3. IP Address Extraction - Proxy Header Validation (Backend)

**Effort:** 2 hours | **Impact:** Medium

**Status:** ✅ Basic implementation complete, needs proxy validation

**Enhancement Needed:**

```typescript
// apps/server/src/shared/request-utils.ts
export interface ProxyConfig {
  trustProxy: boolean;
  trustedProxies: string[]; // List of trusted proxy IPs
}

function validateForwardedFor(
  forwardedFor: string,
  clientIp: string,
  config: ProxyConfig,
): string | undefined {
  // Only trust x-forwarded-for if request came from trusted proxy
  if (!config.trustProxy) return undefined;
  if (!config.trustedProxies.includes(clientIp)) return undefined;
  // ... validation logic
}
```

**Files to Update:**

- `apps/server/src/shared/request-utils.ts` - Add proxy validation
- `apps/server/src/config/auth.ts` - Add proxy config
- Update tests for proxy scenarios

---

### 4. Account Lockout - Edge Case Handling (Backend)

**Effort:** 2 hours | **Impact:** Medium

**Status:** ✅ Basic unlock added, needs edge case handling

**Remaining Work:**

- [ ] Add `lockoutExpiresAt` column to track exact lockout time
- [ ] Prevent counter reset exploit (attacker waits for window to slide)
- [ ] Add admin endpoint `POST /admin/auth/unlock/:userId`
- [ ] Require admin authorization
- [ ] Add audit logging for admin unlocks

**Database Migration:**

```sql
-- Add lockout tracking columns
ALTER TABLE users ADD COLUMN lockout_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN lockout_count INTEGER DEFAULT 0;
```

---

### 5. Error Message Sanitization - Complete Audit (Backend)

**Effort:** 1 hour | **Impact:** High

**Status:** ✅ Password validation sanitized, needs full audit

**Remaining:**

- [ ] Audit all error returns in modules/auth/
- [ ] Ensure handleMe() uses constants (currently inline strings)
- [ ] Create error sanitization helper
- [ ] Document which errors are safe to expose

---

## HIGH PRIORITY (11 hours estimated)

### 6. Dummy Hash Cryptographic Improvement (Backend)

**Effort:** 1 hour | **Impact:** Medium

**Current Issue:**

```typescript
// Static hash - potentially timing-detectable
const DUMMY_HASH = '$argon2id$v=19$m=19456,t=2,p=1$...';
```

**Solution:**

```typescript
// Generate random dummy hash per call or rotate from pool
let dummyHashPool: string[] = [];

async function initDummyHashPool(): Promise<void> {
  for (let i = 0; i < 100; i++) {
    const hash = await hashPassword(crypto.randomBytes(32).toString('hex'));
    dummyHashPool.push(hash);
  }
}

function getDummyHash(): string {
  return dummyHashPool[Math.floor(Math.random() * dummyHashPool.length)];
}
```

---

### 7. Login Attempt Cleanup & Retention (Backend)

**Effort:** 2 hours | **Impact:** Medium

**Problem:**

- login_attempts table grows indefinitely
- No cleanup mechanism (disk bloat risk)
- Performance degradation over time

**Solution:**

```typescript
// apps/server/src/shared/maintenance.ts
export async function cleanupOldLoginAttempts(
  db: DbClient,
  retentionDays: number = 90,
): Promise<number> {
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const result = await db.delete(loginAttempts).where(lt(loginAttempts.createdAt, cutoffDate));

  return result.length;
}
```

**Add cron job:** Daily cleanup at 2 AM

---

### 8. JWT Secret Rotation Support (Backend)

**Effort:** 2 hours | **Impact:** Medium

**Enhancement:**

```typescript
// Support multiple valid secrets for zero-downtime rotation
export function getJwtSecrets(): { current: string; previous?: string } {
  return {
    current: process.env.JWT_SECRET!,
    previous: process.env.JWT_SECRET_PREVIOUS,
  };
}

export function verifyToken(token: string): TokenPayload {
  const { current, previous } = getJwtSecrets();

  try {
    return jwt.verify(token, current) as TokenPayload;
  } catch {
    if (previous) {
      return jwt.verify(token, previous) as TokenPayload;
    }
    throw new Error('Invalid token');
  }
}
```

---

### 9. Logout All Devices Endpoint (Backend)

**Effort:** 2 hours | **Impact:** High

**Implementation:**

```typescript
// Add to apiContract
logoutAll: {
  method: 'POST',
  path: '/auth/logout-all',
  responses: {
    200: { message: 'Logged out from all devices' }
  }
}

// Handler
async function handleLogoutAll(
  app: FastifyInstance,
  request: RequestWithCookies
): Promise<...> {
  const { userId } = request.user;
  await revokeAllUserTokens(app.db, userId);
  // ... clear current cookie
}
```

---

### 10. Test Coverage - Critical Paths (Backend)

**Effort:** 4 hours | **Impact:** High

**Missing Test Scenarios:**

**Token Rotation:**

- [ ] Grace period boundary (exactly at end)
- [ ] Multiple reuse attempts in same family
- [ ] Concurrent rotation requests (race condition)
- [ ] Expired family with old tokens

**Login Flow:**

- [ ] Lockout + wait for expiration + login succeeds
- [ ] Lockout + admin unlock + login succeeds
- [ ] Parallel login requests
- [ ] Token refresh after password change (should fail)

**Registration:**

- [ ] Concurrent registration with same email
- [ ] UTF-8 in name field
- [ ] Password exactly at min/max boundaries

---

## MEDIUM PRIORITY (17 hours estimated)

### 11. Fastify Type Safety (Backend)

**Effort:** 1 hour

Extend Fastify types properly:

```typescript
// types/fastify.d.ts
declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}
```

---

### 12. Database Indexes for Performance (Backend)

**Effort:** 2 hours

**Create migration:**

```sql
CREATE INDEX idx_login_attempts_email_created
  ON login_attempts(email, created_at DESC, success);

CREATE INDEX idx_refresh_tokens_token
  ON refresh_tokens(token);

CREATE INDEX idx_refresh_tokens_family_id
  ON refresh_tokens(family_id);

CREATE INDEX idx_refresh_tokens_expires_at
  ON refresh_tokens(expires_at);
```

---

### 13. Auth Config Validation (Backend)

**Effort:** 1 hour

Validate configuration at startup:

```typescript
export function validateAuthConfig(config: AuthConfig): void {
  if (config.refreshTokenGracePeriodSeconds >= config.refreshTokenExpiryDays * 86400) {
    throw new Error('Grace period cannot exceed token expiry');
  }
  if (config.lockout.maxAttempts <= 0) {
    throw new Error('maxAttempts must be positive');
  }
  // ... more validations
}
```

---

### 14. Security Decision Documentation (Backend)

**Effort:** 3 hours

Create `docs/SECURITY.md`:

- Why Argon2id with specific parameters?
- Why 30 second grace period?
- Why exponential backoff formula?
- Threat models for each feature
- Security vs UX tradeoffs

---

## LOW PRIORITY (13.5 hours estimated)

### 15. Request Correlation IDs (Backend)

**Effort:** 2 hours

Add request ID middleware:

```typescript
app.addHook('onRequest', async (req) => {
  req.id = crypto.randomUUID();
});

// Include in all logs
app.log.error({ requestId: req.id, userId, error }, 'Error message');
```

---

### 16. Per-Endpoint Rate Limiting (Backend)

**Effort:** 2 hours

Apply stricter limits to auth endpoints:

```typescript
app.post(
  '/api/auth/register',
  {
    config: {
      rateLimit: {
        max: 3,
        timeWindow: '1 hour',
      },
    },
  },
  handler,
);
```

---

### 17. Query Optimization (Backend)

**Effort:** 3 hours

- Consolidate multiple queries in token rotation
- Add database view for common queries
- Batch user lookups where possible
- Add query performance monitoring

---

### 18. Metrics & Observability (Backend)

**Effort:** 4 hours

Add Prometheus metrics:

- Counter: `login_attempts_total{success="true|false"}`
- Gauge: `active_sessions_count{user_id}`
- Timer: `password_hash_duration_seconds`
- Counter: `token_reuse_detected_total`
- Gauge: `account_lockouts_active`

---

## Implementation Priority

**Week 1 (Critical):**

1. Database transactions (4h)
2. Token reuse logging (3h)
3. IP proxy validation (2h)
4. Account lockout edge cases (2h)
5. Error message audit (1h)

**Week 2 (High Priority):** 6. Dummy hash improvement (1h) 7. Login attempt cleanup (2h) 8. JWT secret rotation (2h) 9. Logout all devices (2h) 10. Test coverage (4h)

**Week 3 (Medium):**
11-14: Type safety, indexes, validation, documentation (7h)

**Week 4 (Low - Optional):**
15-18: Observability improvements (11.5h)

---

## Success Metrics

**Security:**

- Zero data integrity issues (transactions)
- 100% security events logged
- Token reuse detection rate tracked
- Admin unlock audit trail

**Quality:**

- Test coverage > 90% for auth flows
- All TypeScript strict mode passing
- Zero eslint security warnings

**Operations:**

- Metrics exported for all critical paths
- Error correlation via request IDs
- Automated cleanup jobs running

---

## Notes

- This roadmap assumes Phase 1 is production-ready
- Items can be implemented independently
- Critical items should be prioritized for production deployments
- Medium/Low items are quality-of-life improvements

**Created:** 2026-01-10
**Phase 1 Completed:** 2026-01-10
**Target Phase 2 Completion:** TBD based on team bandwidth
