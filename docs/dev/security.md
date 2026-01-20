# Security Architecture

**Last Updated: January 20, 2026**

Overview of security measures implemented in ABE Stack.

---

## Authentication

### Password Hashing

- **Algorithm:** Argon2id (winner of Password Hashing Competition)
- **Parameters:** `m=19456, t=2, p=1` (OWASP recommended)
- **Why Argon2id:** Memory-hard, GPU/ASIC resistant, timing attack safe

### JWT Access Tokens

- **Expiry:** 15 minutes (short-lived)
- **Algorithm:** HS256 with strict validation
- **Contains:** `userId`, `email`, `role`
- **Storage:** Memory only (never localStorage)

### Refresh Tokens

- **Expiry:** 7 days
- **Storage:** HTTP-only, Secure, SameSite=Lax cookie
- **Rotation:** New token issued on each refresh
- **Family Tracking:** Tokens grouped by login session for reuse detection

### Token Reuse Detection

When a refresh token is used after it's been rotated:

1. Entire token family is revoked (all devices from that login)
2. Security event logged with severity "high"
3. User must re-authenticate

**Grace Period:** 30 seconds (allows network retries)

---

## Account Protection

### Login Rate Limiting

| Endpoint                | Limit       | Window   |
| ----------------------- | ----------- | -------- |
| `/auth/login`           | 5 attempts  | 1 minute |
| `/auth/register`        | 3 attempts  | 1 hour   |
| `/auth/forgot-password` | 3 attempts  | 1 hour   |
| `/auth/reset-password`  | 5 attempts  | 1 hour   |
| `/auth/refresh`         | 30 attempts | 1 minute |

### Account Lockout

- **Trigger:** 5 failed login attempts within 15 minutes
- **Duration:** 15 minutes (configurable)
- **Progressive Delay:** Exponential backoff on repeated failures

### Timing Attack Prevention

- Failed logins for non-existent users still hash a dummy password
- Constant-time comparison for sensitive operations

---

## Request Security

### CSRF Protection

- Double-submit cookie pattern with encrypted tokens
- Required for state-changing authenticated requests
- **Exempt endpoints:** Login, register, forgot-password (no session to hijack)

### Correlation IDs

- Every request gets a UUID for distributed tracing
- Included in error responses for debugging
- Header: `x-correlation-id`

### Input Validation

- Zod schemas on all endpoints
- Prototype pollution protection (strips `__proto__`, `constructor`)
- Path traversal prevention on file uploads

---

## Data Security

### Database

- All auth operations wrapped in transactions
- Cascading deletes for user data
- Optimistic locking with version fields

### Indexes (Performance + Security)

```
refresh_tokens: user_id, family_id, token (unique)
login_attempts: (email, created_at), ip_address
security_events: user_id, email, event_type, severity, created_at
```

### Audit Trail

Security events logged:

- `token_reuse_detected` - Potential session hijacking
- `token_family_revoked` - Forced logout
- `account_locked` - Lockout triggered
- `account_unlocked` - Admin intervention
- `password_changed` - User action
- `suspicious_login` - Unusual location/device

---

## API Endpoints

### Public (No Auth)

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/verify-email
POST /api/auth/resend-verification
POST /api/auth/refresh (uses cookie)
POST /api/auth/logout
```

### Protected (Requires Auth)

```
GET  /api/users/me
POST /api/auth/logout-all (revokes all sessions)
POST /api/admin/auth/unlock (admin only)
```

---

## Configuration

### Environment Variables

```bash
# Required
JWT_SECRET=           # Min 32 chars, random
DATABASE_URL=         # Postgres connection

# Optional (with defaults)
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
LOCKOUT_THRESHOLD=5
LOCKOUT_DURATION=15m
```

### Production Checklist

- [ ] JWT_SECRET is cryptographically random (32+ bytes)
- [ ] HTTPS only (Secure cookies won't work without it)
- [ ] Database SSL enabled
- [ ] Rate limiting configured for your scale
- [ ] Monitoring alerts on security events

---

## What's NOT Implemented (By Design)

These are intentionally deferred for Series A scope:

| Feature              | Why Skipped                                                       |
| -------------------- | ----------------------------------------------------------------- |
| JWT Secret Rotation  | Rotate manually when needed. Zero-downtime rotation is Series B+. |
| IP Proxy Whitelist   | Fastify's trustProxy is sufficient for single LB setups.          |
| Prometheus Metrics   | Use Datadog/Sentry. Custom metrics are premature.                 |
| Hardware Key Support | WebAuthn is nice-to-have, not essential.                          |

---

## References

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Argon2 RFC 9106](https://www.rfc-editor.org/rfc/rfc9106.html)
