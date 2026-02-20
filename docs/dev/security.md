# Security

## Password Hashing

BSLT uses **Argon2id** (OWASP recommended) for password hashing.

### Configuration

Default parameters match OWASP guidelines (`main/server/core/src/auth/utils/password.ts`):

| Parameter   | Value               | Purpose                                                                |
| ----------- | ------------------- | ---------------------------------------------------------------------- |
| Algorithm   | Argon2id (type 2)   | Hybrid of Argon2i + Argon2d, resistant to side-channel and GPU attacks |
| Memory cost | 19,456 KiB (19 MiB) | Increases GPU attack cost                                              |
| Time cost   | 2 iterations        | Balances security vs. login latency                                    |
| Parallelism | 1                   | Single-threaded hash computation                                       |

### Password Flow

1. **Registration**: Password is validated for strength (entropy-based scoring, min score 3/4), then hashed with Argon2id
2. **Login**: Password is verified against stored hash using constant-time comparison
3. **Rehashing**: On login, if Argon2 parameters have changed, the hash is transparently upgraded
4. **Timing safety**: A pool of pre-computed dummy hashes prevents timing attacks when user does not exist (`verifyPasswordSafe`)

### Password Strength

Passwords are validated using custom entropy-based estimation (`main/server/core/src/auth/security/password-strength.ts`):

- Minimum length: 8 characters
- Maximum length: 64 characters
- Minimum score: 3 (Strong) on a 0-4 scale
- Penalizes user-specific words (email, name)
- Returns crack time estimates and improvement suggestions

## JWT Access Tokens

Short-lived access tokens carry user identity and role.

| Property       | Value                                              |
| -------------- | -------------------------------------------------- |
| Algorithm      | HS256 (HMAC-SHA256)                                |
| Default expiry | 15 minutes                                         |
| Payload        | `userId`, `email`, `role`, optional `tokenVersion` |
| Secret minimum | 32 characters                                      |

Tokens are created via `createAccessToken()` and verified via `verifyToken()` in `main/server/core/src/auth/utils/jwt.ts`.

### Secret Rotation Guidelines

For all production secret classes (JWT, API keys, OAuth client secrets), rotate using a dual-window strategy:

1. Add the new secret while keeping the previous secret available for verification.
2. Start signing new tokens/keys with the new secret immediately.
3. Keep the old secret only for verification during a bounded grace window.
4. Remove the old secret after access/refresh token max lifetime + rollback buffer.

Required operational rules:

- Never rotate multiple secret classes in the same deploy.
- Always rotate with an auditable change record (date, owner, reason, rollback plan).
- Verify `/health` and auth flows after each rotation.
- Prefer environment-driven secret injection; never hardcode secrets in source or committed files.

BSLT-specific references:

- JWT dual-secret verification: `main/server/system/src/security/crypto/jwt.rotation.ts`
- Auth token config wiring: `main/apps/server/src/config/`
- Webhook and provider secrets: `main/apps/server/src/config/services/`

## Refresh Token Families

Refresh tokens use **family-based rotation** with reuse detection (`main/server/core/src/auth/utils/refresh-token.ts`).

### How It Works

1. **Login** creates a new token family with a cryptographically random refresh token (64 bytes / 512 bits)
2. **Refresh** rotates the token: old token is deleted, new token is created in the same family
3. **Reuse detection**: If a rotated-out token is used again outside the grace period (30s), the entire family is revoked
4. **Session binding**: User-Agent is checked on refresh; a mismatch revokes the family (session hijacking defense)

### Token Reuse Attack Response

When reuse is detected:

1. Security event is logged to the audit trail
2. Entire token family is revoked (all tokens in the family)
3. User session is invalidated
4. `TokenReuseError` is thrown

### Max Concurrent Sessions

Configurable per deployment (default: 10). When the limit is reached, the oldest session family is evicted on new login.

## Cookie Security

Refresh tokens are stored in HTTP-only cookies (`main/server/core/src/auth/utils/cookies.ts`).

| Setting    | Development | Production |
| ---------- | ----------- | ---------- |
| `httpOnly` | true        | true       |
| `secure`   | false       | true       |
| `sameSite` | lax         | strict     |
| `path`     | /           | /          |
| `signed`   | true        | true       |

Cookie secret is injected via environment configuration and used for both signing and CSRF token encryption.

## Rate Limiting

### Global Rate Limiter

Applied to all requests via the HTTP plugin stack (`main/apps/server/src/http/plugins.ts`). Returns standard rate limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`).

### Auth Endpoint Presets

Stricter per-endpoint limits defined in `main/server/core/src/auth/security/rateLimitPresets.ts`:

| Endpoint            | Max Requests | Window   |
| ------------------- | ------------ | -------- |
| Login               | 5            | 1 minute |
| Register            | 3            | 1 hour   |
| Forgot password     | 3            | 1 hour   |
| Reset password      | 5            | 1 hour   |
| Verify email        | 5            | 1 hour   |
| Resend verification | 3            | 1 hour   |
| Token refresh       | 30           | 1 minute |
| OAuth initiate      | 10           | 1 minute |
| OAuth callback      | 20           | 1 minute |
| OAuth link/unlink   | 5            | 1 hour   |

All auth rate limiters use progressive delay with exponential backoff (1s base, 30s max, 2x factor).

## CSRF Protection

Uses the double-submit cookie pattern with signed tokens (`main/apps/server/src/http/middleware/csrf.ts`):

- **Development**: HMAC-signed tokens in signed cookies (`sameSite: lax`)
- **Production**: AES-256-GCM encrypted tokens in signed cookies (`sameSite: strict`)
- Safe methods (GET, HEAD, OPTIONS) are exempt
- Select endpoints with one-time token protection are also exempt

## CORS

Explicit CORS handling replaces `@fastify/cors` (`main/apps/server/src/http/middleware/security.ts`):

- Origin validated against configured allow list (supports comma-separated origins)
- Credentials require exact origin match (no wildcard)
- Preflight responses cached for 24 hours
- Default allowed methods: GET, POST, PUT, DELETE, OPTIONS, PATCH

## Security Headers

Explicit headers replace `@fastify/helmet`:

| Header                      | Value                                    | Purpose                           |
| --------------------------- | ---------------------------------------- | --------------------------------- |
| `X-Frame-Options`           | DENY                                     | Prevent clickjacking              |
| `X-Content-Type-Options`    | nosniff                                  | Prevent MIME sniffing             |
| `X-XSS-Protection`          | 1; mode=block                            | XSS protection for older browsers |
| `Strict-Transport-Security` | max-age=31536000                         | Enforce HTTPS (1 year)            |
| `Referrer-Policy`           | strict-origin-when-cross-origin          | Control referrer leakage          |
| `Permissions-Policy`        | geolocation=(), microphone=(), camera=() | Restrict browser APIs             |
| `Content-Security-Policy`   | (production only)                        | Restrict resource loading         |

Production enables CSP with `getProductionSecurityDefaults()`. API routes also get `Cache-Control: no-store` to prevent back-button data leaks after logout.

## Account Lockout

Progressive lockout with exponential backoff (`main/server/core/src/auth/security/lockout.ts`):

1. Failed attempts are tracked per email within a configurable window
2. After exceeding `maxAttempts`, the account is locked for `lockoutDurationMs`
3. Progressive delay applies exponential backoff: `baseDelay * 2^(attempts - 1)`, capped at max delay
4. Admin unlock is supported with full audit trail logging
5. Lockout status includes remaining time and attempt count

## Prototype Pollution Protection

All incoming JSON request bodies are sanitized by `registerPrototypePollutionProtection()` which strips `__proto__`, `constructor`, and `prototype` keys recursively.

## Input Validation & Sanitization

The validation middleware (`main/apps/server/src/http/middleware/validation.ts`) provides:

- XSS prevention: strips `<script>` blocks, event handlers, `javascript:` schemes
- SQL injection detection (pattern-based, context-aware)
- NoSQL injection detection (MongoDB operator detection)
- Max depth/array length/string length enforcement
- Prototype pollution key filtering

## New Login Alerts

On each successful login, the system:

1. Generates a device fingerprint from IP + User-Agent
2. Checks if the device is known (via `trusted_devices` table)
3. Records device access (upsert)
4. Sends a "Was this you?" email alert (fire-and-forget)
