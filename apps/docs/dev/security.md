# Security Decision Documentation

> Why we chose specific parameters, algorithms, and architectures for every security-critical subsystem.

**Audience:** Developers, auditors, and future maintainers.
**Scope:** Authentication, session management, input handling, transport security.

---

## Table of Contents

1. [Password Hashing (Argon2id)](#1-password-hashing-argon2id)
2. [JWT Access Tokens](#2-jwt-access-tokens)
3. [Refresh Token Architecture](#3-refresh-token-architecture)
4. [Refresh Token Grace Period](#4-refresh-token-grace-period)
5. [Account Lockout & Progressive Delays](#5-account-lockout--progressive-delays)
6. [Rate Limiting](#6-rate-limiting)
7. [CSRF Protection](#7-csrf-protection)
8. [Security Headers](#8-security-headers)
9. [Input Sanitization](#9-input-sanitization)
10. [Cookie Security](#10-cookie-security)
11. [User Enumeration Prevention](#11-user-enumeration-prevention)
12. [Password Strength Scoring](#12-password-strength-scoring)
13. [JWT Secret Rotation](#13-jwt-secret-rotation)
14. [Audit Logging & Intrusion Detection](#14-audit-logging--intrusion-detection)
15. [File Upload Security](#15-file-upload-security)
16. [Configuration Validation](#16-configuration-validation)

---

## 1. Password Hashing (Argon2id)

**Source:** `modules/auth/src/utils/password.ts`, `modules/auth/src/config/auth.ts`

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Algorithm | Argon2id (type `2`) | OWASP first recommendation. Hybrid of Argon2i (side-channel resistant) and Argon2d (GPU-resistant). Chosen over bcrypt/scrypt per OWASP Password Storage Cheat Sheet 2024. |
| Memory cost | `19456` KiB (19 MiB) | OWASP first-choice recommendation for Argon2id. Balances server RAM with brute-force resistance. At 19 MiB per hash, a 32-core server can handle ~50 concurrent login hashes within 1 GB, while forcing attackers to provision proportional memory per GPU core. |
| Time cost | `2` iterations | OWASP minimum. Two passes over memory doubles the computation time without increasing memory usage. Keeps p99 latency under 500ms on commodity hardware. |
| Parallelism | `1` | Single-threaded hashing ensures deterministic execution time, preventing timing side-channels. Multi-threaded hashing is unnecessary when memory cost is the primary defense. |

### Why not bcrypt?

Bcrypt is limited to 72-byte inputs and 4 KiB memory. Argon2id's configurable memory cost is its primary advantage: GPU crackers must allocate the full memory per parallel guess, making large-scale attacks economically infeasible.

### Lighter config for non-password tokens

Reset and verification token hashes use reduced parameters (`memoryCost: 8192`, `timeCost: 1`) because these tokens are single-use, time-limited (24h), and high-entropy (64 random bytes). The lighter config reduces server load for operations that don't protect low-entropy secrets.

### Timing-safe verification (dummy hash pool)

**Source:** `modules/auth/src/utils/password.ts:115-202`

When a login attempt targets a non-existent email, `verifyPasswordSafe()` still performs a full Argon2 verification against a pre-computed dummy hash. Without this, an attacker could distinguish "user exists" from "user doesn't exist" by measuring response time (~400ms difference).

The pool of 10 pre-computed hashes (initialized at startup) uses random selection to prevent statistical analysis of the dummy operation. Each hash has a unique salt, making the timing indistinguishable from real verification.

---

## 2. JWT Access Tokens

**Source:** `shared/core/src/infrastructure/crypto/jwt.ts`, `modules/auth/src/utils/jwt.ts`

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Algorithm | HS256 (HMAC-SHA256) | Symmetric signing. Simpler key management than RS256 for a single-service architecture. No public/private key infrastructure needed. Zero external dependencies (native `node:crypto`). |
| Default expiry | `15m` | Short-lived to limit damage from token theft. Most SPAs refresh tokens transparently. 15 minutes is the OWASP-recommended maximum for high-security applications. |
| Min secret length | `32` chars (256 bits) | Matches HS256 key size requirement. NIST SP 800-107 recommends key length >= hash output size (256 bits for SHA-256). |
| Payload | `userId`, `email`, `role` | Minimal claim set. No sensitive data in the payload. Enough for authorization checks without a database round-trip. |
| Storage | Memory only | Access tokens are never written to localStorage (XSS-accessible). Stored in JavaScript memory and sent via Authorization header. |

### Algorithm safety

The `verify` function explicitly validates the header `alg` field to prevent "none" algorithm attacks (CVE-2015-9235). Signature comparison uses `crypto.timingSafeEqual` to prevent timing attacks against HMAC verification.

### Why not RS256?

RS256 (RSA) is appropriate when multiple services need to verify tokens independently using a public key. ABE Stack uses a single server, making HS256 simpler with identical security properties. If the architecture evolves to microservices, RS256/ES256 should be reconsidered.

---

## 3. Refresh Token Architecture

**Source:** `modules/auth/src/utils/refresh-token.ts`, `modules/auth/src/utils/jwt.ts`

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Token size | 64 bytes (512 bits) | `crypto.randomBytes(64)`. Far exceeds the 128-bit minimum for unguessable tokens (OWASP Session Management Cheat Sheet). 512 bits provides a collision probability of ~10^-77 even at scale. |
| Encoding | Hex | 128-character hex string. URL-safe, no encoding issues in cookies. |
| Default expiry | `7` days | Balances UX (users don't re-authenticate daily) with security (limits window for stolen refresh tokens). Configurable via `REFRESH_TOKEN_EXPIRY_DAYS` (validated: 1-30 days). |
| Storage | Database (hashed family) | Server-side storage enables immediate revocation. Token families enable reuse detection. |
| Rotation | Full rotation per use | Every refresh request invalidates the old token and issues a new one (atomic transaction). Limits the window during which a stolen token is valid. |

### Token family tracking

Each login creates a new token family. All refresh tokens issued from that login belong to the same family. This enables:

1. **Reuse detection:** If a revoked token from a family is presented, the entire family is revoked (all sessions from that login).
2. **Forensic logging:** `TokenReuseError` captures `userId`, `email`, `familyId`, `ipAddress`, `userAgent` for incident response.
3. **User notification:** An email alert is sent when token reuse is detected.

Atomic rotation (delete old + insert new in a single transaction) prevents race conditions where both old and new tokens are valid simultaneously.

---

## 4. Refresh Token Grace Period

**Source:** `modules/auth/src/utils/refresh-token.ts:109-241`

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Grace period | `30` seconds | Configurable via `REFRESH_TOKEN_GRACE_PERIOD` env var. |

### Why a grace period?

Network retries create a race condition: a client sends a refresh request, the server rotates the token, but the response is lost (network timeout, mobile connection drop). The client retries with the now-invalidated old token. Without a grace period, this legitimate retry triggers token reuse detection and revokes the entire family, forcing the user to re-authenticate.

### How it works

When a refresh request arrives with a token that differs from the most recent token in the family:

- **Within 30 seconds:** Treated as a network retry. The server returns the most recent valid token from the family instead of revoking.
- **Outside 30 seconds:** Treated as a token reuse attack. The entire family is revoked, the user is logged out, and a security event is logged.

### Why 30 seconds?

- **Too short (< 10s):** Mobile networks and high-latency connections may exceed this window for legitimate retries.
- **Too long (> 60s):** Extends the attack window for stolen tokens. An attacker with a copied token has more time to use it before detection.
- **30 seconds:** Covers 99th percentile network retry scenarios while keeping the attack window narrow. Based on analysis of typical HTTP retry policies (exponential backoff typically completes within 15-20 seconds for 3 retries).

---

## 5. Account Lockout & Progressive Delays

**Source:** `modules/auth/src/security/lockout.ts`, `modules/auth/src/security/types.ts`, `modules/auth/src/types.ts`

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Max attempts | `10` (default) | Configurable via `LOCKOUT_MAX_ATTEMPTS` (validated: 3-20). 10 attempts allows for legitimate typos while stopping brute force. |
| Lockout duration | `1,800,000` ms (30 min) | Configurable via `LOCKOUT_DURATION_MS` (validated: >= 60s). 30 minutes deters automated attacks while not permanently locking out legitimate users. |
| Progressive delay | Enabled | Exponential backoff: `baseDelay * 2^(attempts - 1)`. |
| Base delay | `1,000` ms | 1 second after first failure. Imperceptible to legitimate users. |
| Max delay | `30,000` ms (30s) | Cap prevents extreme delays. After 5 failures: 1s, 2s, 4s, 8s, 16s. After 6: capped at 30s. |
| Delay window | `5` minutes | Failed attempts older than 5 minutes don't count toward progressive delay. Prevents permanent degradation from old failures. |

### Why progressive delays AND lockout?

Progressive delays slow automated attacks before lockout kicks in. A credential stuffing tool testing 10,000 passwords faces cumulative delays of ~5 minutes per account, making large-scale attacks impractical even before lockout triggers.

Lockout provides a hard stop when progressive delays aren't sufficient. The 30-minute duration is a balance: long enough to block sustained attacks, short enough that legitimate users recover without support intervention.

### Why not CAPTCHA?

CAPTCHA is planned as a future addition (see rate limit presets). Progressive delays + lockout provide equivalent protection server-side without UX friction. CAPTCHA will be added as a complementary measure for endpoints where rate limiting alone is insufficient.

---

## 6. Rate Limiting

**Source:** `modules/auth/src/security/rateLimitPresets.ts`, `modules/auth/src/config/auth.ts`

### Algorithm: Token Bucket with LRU Eviction

Token bucket was chosen over sliding window or fixed window because it handles burst traffic gracefully. LRU eviction (max 100,000 entries) prevents memory exhaustion from distributed attacks targeting many unique IPs.

### Per-endpoint limits

| Endpoint | Limit | Window | Why |
|----------|-------|--------|-----|
| Login | 5/min | 60s | Prevents credential stuffing. Combined with lockout for defense in depth. |
| Register | 3/hr | 1 hr | Prevents mass account creation (spam). Users register once. |
| Forgot password | 3/hr | 1 hr | Prevents email bombing and enumeration via response timing. |
| Reset password | 5/hr | 1 hr | Allows typo retries. Protected by one-time token expiration. |
| Verify email | 5/hr | 1 hr | Allows retries for token input errors. |
| Resend verification | 3/hr | 1 hr | Prevents email bombing. |
| Refresh | 30/min | 60s | More lenient: called automatically by clients every 15 minutes. Still blocks token grinding. |
| OAuth initiate | 10/min | 60s | Prevents state exhaustion attacks while allowing navigation retries. |
| OAuth callback | 20/min | 60s | More lenient: redirect from external provider may have latency. |
| OAuth link/unlink | 5/hr | 1 hr | Infrequent operations. Prevents linking abuse. |

### Progressive delay on rate limit

All auth rate limiters include progressive delay (`baseDelay: 1000ms`, `maxDelay: 30000ms`, `backoffFactor: 2`). When a client approaches the limit, response times increase gradually. This provides a smooth degradation rather than an abrupt 429 error.

### Response headers

`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` (on 429) are always set. This follows RFC 6585 and enables well-behaved clients to self-throttle.

---

## 7. CSRF Protection

**Source:** `infra/http/src/middleware/csrf.ts`

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Pattern | Double-submit cookie | Stateless CSRF protection. No server-side token storage needed. |
| Token size | 32 bytes (`randomBytes(32)`) | 256 bits of entropy. Exceeds OWASP minimum of 128 bits. |
| Signing | HMAC-SHA256 | Prevents token forgery. Attacker cannot craft a valid cookie without the secret. |
| Encryption | AES-256-GCM (production) | Encrypts token value in the cookie to prevent BREACH-style attacks that leak cookie contents via compression side-channels. |
| Cookie | httpOnly, secure, sameSite=strict | httpOnly prevents JavaScript access. strict sameSite prevents cross-origin cookie attachment. |
| Comparison | `crypto.timingSafeEqual` | Prevents timing attacks on token comparison. |

### Exempt endpoints

Six auth endpoints are exempt from CSRF validation, each for a specific reason:

- **Login/Register:** No authenticated session exists to exploit.
- **Forgot/Reset password, Verify email:** Protected by one-time, time-limited tokens.
- **Refresh:** Protected by httpOnly sameSite=strict cookie (browser-level CSRF prevention).

**Logout is NOT exempt.** A CSRF logout attack could force a victim to lose their session, causing data loss in unsaved work. This is a deliberate divergence from many frameworks that exempt all auth endpoints.

---

## 8. Security Headers

**Source:** `infra/http/src/middleware/security.ts`

| Header | Value | Why |
|--------|-------|-----|
| `X-Frame-Options` | `DENY` | Prevents clickjacking by blocking all framing. `DENY` over `SAMEORIGIN` because the app has no legitimate framing use case. |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing attacks where browsers interpret uploaded files as executable content. |
| `X-XSS-Protection` | `1; mode=block` | Legacy XSS filter for older browsers. Modern browsers use CSP instead, but this provides defense in depth. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Enforces HTTPS for 1 year. `includeSubDomains` prevents protocol downgrade on any subdomain. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Sends full URL to same-origin, only origin to cross-origin. Prevents leaking URL paths (which may contain tokens) to third parties. |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Disables browser APIs the application doesn't use. Reduces attack surface from compromised third-party scripts. |
| `X-Powered-By` | Removed | Hides technology stack from fingerprinting. |
| `Server` | Removed | Hides server software version. |

### Content Security Policy (production)

CSP is opt-in (`enableCSP: true` in production defaults) to avoid breaking development workflows:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: https:; object-src 'none'; frame-src 'none'
```

`'unsafe-inline'` for styles is a pragmatic concession for CSS-in-JS frameworks. Nonce-based script loading is supported via the `cspNonce` option for stricter configurations.

### Prototype pollution protection

A custom JSON content-type parser recursively strips `__proto__`, `constructor`, and `prototype` keys from all incoming request bodies. This prevents prototype pollution attacks (CVE-2019-10744 and similar) at the framework boundary, before any application code processes the input.

---

## 9. Input Sanitization

**Source:** `infra/http/src/middleware/validation.ts`

| Protection | Method | Why |
|------------|--------|-----|
| Null bytes | Stripped from all strings | Prevents null byte injection in file paths and database queries. |
| Script tags | Regex removal | Defense-in-depth against XSS (primary defense is output encoding). |
| Event handlers | `on*=` patterns removed | Prevents inline event handler injection. |
| `javascript:` URLs | Stripped | Prevents URL-scheme-based XSS. |
| Max object depth | 10 levels | Prevents stack overflow from deeply nested JSON (DoS vector). |
| Max array length | 1,000 elements | Prevents memory exhaustion from large arrays. |
| Max string length | 10,000 characters | Prevents oversized string processing. |
| SQL injection | Pattern detection | Detects common SQL syntax patterns as a secondary defense (primary: parameterized queries). |
| NoSQL injection | MongoDB operator detection | Detects `$gt`, `$ne`, `$where` and similar operators in input. |

### Defense in depth philosophy

Input sanitization is a secondary defense layer. The primary defenses are:
- **XSS:** Output encoding (React's default behavior) + CSP.
- **SQL injection:** Parameterized queries via the query builder.
- **NoSQL injection:** Zod schema validation at contract boundaries.

Sanitization catches cases where primary defenses have gaps (e.g., raw HTML rendering, dynamic queries).

---

## 10. Cookie Security

**Source:** `modules/auth/src/config/auth.ts`, `modules/auth/src/utils/cookies.ts`, `infra/http/src/middleware/cookie.ts`

### Refresh token cookie

| Setting | Production | Development | Why |
|---------|-----------|-------------|-----|
| httpOnly | `true` | `true` | Prevents JavaScript access. Mitigates XSS-based token theft. Never relaxed, even in development. |
| secure | `true` | `false` | Requires HTTPS in production. Disabled in development for `localhost` without TLS. |
| sameSite | `strict` | `lax` | `strict` prevents the cookie from being sent on any cross-origin request (even top-level navigation). `lax` in development allows OAuth redirects on localhost. |
| path | `/` | `/` | Available to all routes. Restricting to `/api/auth/refresh` would be more precise but breaks if route paths change. |

### Cookie signing

Manual HMAC-SHA256 signing replaces `@fastify/cookie`. Timing-safe comparison (`crypto.timingSafeEqual`) prevents signature forgery via timing analysis. The secret must be >= 32 characters and passes the same weak-secret checks as the JWT secret.

### Why manual cookie implementation?

Replacing `@fastify/cookie` with a manual implementation provides:
1. **Full audit control:** Every line of cookie handling is visible in the codebase.
2. **Zero hidden behavior:** No plugin defaults that might weaken security.
3. **Reduced dependency surface:** One fewer npm package in the supply chain.

---

## 11. User Enumeration Prevention

**Source:** `modules/auth/src/service.ts`, `modules/auth/src/utils/password.ts`

### Registration

When a user attempts to register with an existing email, the API returns the same success response as a new registration. An email notification is sent to the existing account holder informing them of the registration attempt. This prevents attackers from discovering which emails have accounts.

### Login

`verifyPasswordSafe()` performs a full Argon2 hash verification even when the user doesn't exist (using a dummy hash from the pre-computed pool). Response time is identical regardless of user existence.

The error message `"Invalid email or password"` never reveals which field is incorrect.

### Forgot password

If the email doesn't exist, the endpoint returns silently with the same response as a successful request. No email is sent, but the attacker cannot distinguish this from a real password reset email being dispatched.

---

## 12. Password Strength Scoring

**Source:** `shared/core/src/modules/auth/password-scoring.ts`

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Min length | `8` characters | NIST SP 800-63B minimum. Shorter passwords have insufficient entropy regardless of composition. |
| Max length | `64` characters | Prevents DoS via extremely long passwords that consume excessive Argon2 computation. |
| Min score | `3` (default) | Entropy >= 50 bits. Configurable via `PASSWORD_MIN_SCORE`. |
| Scoring model | Custom entropy + penalty system | Inspired by zxcvbn but zero-dependency. |
| Crack time assumption | 10,000 guesses/second | Models offline attack against Argon2id with OWASP-recommended parameters. Conservative estimate. |

### Score thresholds

| Score | Entropy | Approximate crack time |
|-------|---------|----------------------|
| 0 | < 20 bits | Seconds |
| 1 | < 35 bits | Minutes to hours |
| 2 | < 50 bits | Days |
| 3 | < 65 bits | Years |
| 4 | >= 65 bits | Centuries |

### Penalties applied

- Common password list membership
- Repeated character sequences (`aaa`, `111`)
- Sequential patterns (`abc`, `123`)
- Keyboard patterns (`qwerty`, `asdf`)
- Username/email content in password

### Why not enforce composition rules?

NIST SP 800-63B explicitly recommends against composition rules (uppercase + number + symbol). Research shows they reduce effective entropy by making passwords predictable (`Password1!`). Entropy-based scoring rewards truly random passwords regardless of character class.

---

## 13. JWT Secret Rotation

**Source:** `infra/security/src/crypto/jwt-rotation.ts`

### Dual-secret verification strategy

During rotation, two secrets are active: `JWT_SECRET` (current) and `JWT_SECRET_PREVIOUS` (old). The verification logic:

1. Try current secret first.
2. On `INVALID_SIGNATURE` error only, try previous secret.
3. Non-signature errors (`TOKEN_EXPIRED`, `MALFORMED_TOKEN`) are never retried with the previous secret.

### Why only signature errors trigger fallback?

An expired token should remain expired regardless of which secret signed it. Retrying with the previous secret on expiration errors would extend token lifetimes beyond their intended TTL, creating a security gap during rotation.

### Rotation workflow

1. Set `JWT_SECRET_PREVIOUS` to current `JWT_SECRET` value.
2. Generate new `JWT_SECRET`.
3. Deploy. Both secrets work for verification; new tokens use the new secret.
4. Wait for access token TTL to expire (e.g., 15 minutes + buffer).
5. Remove `JWT_SECRET_PREVIOUS`.

---

## 14. Audit Logging & Intrusion Detection

**Source:** `modules/auth/src/security/events.ts`, `modules/auth/src/security/audit.ts`

### Tracked events

| Event | Severity | Why tracked |
|-------|----------|-------------|
| `token_reuse_detected` | Critical | Indicates active session hijacking attempt. |
| `token_family_revoked` | High | Mass revocation triggered by reuse detection. |
| `account_locked` | Medium | May indicate brute force attack in progress. |
| `account_unlocked` | Low | Admin action for audit trail. |
| `suspicious_login` | High | Anomalous login pattern detected. |
| `password_changed` | Medium | Potential account takeover indicator. |
| `email_changed` | High | Account takeover persistence technique. |
| `oauth_*` | Varies | OAuth flow anomalies for supply chain monitoring. |

### Forensic data captured

`TokenReuseError` captures: `userId`, `email`, `familyId`, `ipAddress`, `userAgent`. This enables incident responders to correlate attacks across sessions and identify compromised clients.

### Database storage

Security events are stored in the `security_events` table with full metadata. This provides a queryable audit trail for compliance (SOC 2, GDPR incident response requirements).

---

## 15. File Upload Security

**Source:** `infra/media/src/security.ts`

| Control | Value | Why |
|---------|-------|-----|
| Max file size | 100 MB | Prevents storage exhaustion DoS. |
| MIME type | Whitelist-only | Only known-safe media types accepted. Prevents executable upload. |
| Content scanning | Script/PHP/ASP detection | Detects embedded server-side code in uploaded files (polyglot attacks). |
| Entropy analysis | Shannon entropy calculation | Detects encrypted/obfuscated content that may indicate packed malware or steganography. |

---

## 16. Configuration Validation

**Source:** `modules/auth/src/config/auth.ts:240-278`, `shared/core/src/config/env.schema.ts`

All security-critical configuration is validated at server startup. The server refuses to start if any constraint fails.

| Constraint | Validation | Why |
|------------|-----------|-----|
| JWT secret length | >= 32 chars | Matches HS256 key size requirement (256 bits). |
| JWT secret strength | Not in weak set, no repeating patterns | Prevents default/placeholder secrets in production. |
| Cookie secret length | >= 32 chars | Same rationale as JWT secret. |
| Lockout attempts | 3-20 range | < 3 causes false lockouts; > 20 is ineffective against brute force. |
| Lockout duration | >= 60 seconds | Shorter durations don't meaningfully deter automated attacks. |
| Refresh token expiry | 1-30 days | < 1 day destroys UX; > 30 days extends the theft window unacceptably. |
| Password min length | >= 8 | NIST SP 800-63B minimum. |

### Weak secret detection

Rejects: `secret`, `password`, `jwt_secret`, `changeme`, `test`, `dev`, `prod`, and any string of 32+ repeated characters (e.g., `aaaa...`).

---

## Plugin Registration Order

**Source:** `infra/http/src/plugins.ts`

Security middleware is registered in a specific order. Misordering can create vulnerabilities:

1. **Prototype pollution protection** (before any body parsing)
2. **Correlation ID** (for request tracing through security events)
3. **Request info extraction** (IP, user agent for audit logging)
4. **Security headers + CORS + rate limiting** (before any route handlers)
5. **Cookie parsing** (after security headers are set)
6. **CSRF validation** (after cookies are parsed)
7. **Error handler** (last, to catch and sanitize all errors)

Prototype pollution protection must be first because it replaces the default JSON parser. If any middleware runs before it, parsed bodies could contain `__proto__` payloads.

---

## References

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) - Argon2id parameters
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) - Token architecture
- [NIST SP 800-63B](https://pages.nist.gov/800-63-3/sp800-63b.html) - Password policy, no composition rules
- [NIST SP 800-107](https://csrc.nist.gov/publications/detail/sp/800-107/rev-1/final) - HMAC key length recommendations
- [RFC 6585](https://www.rfc-editor.org/rfc/rfc6585) - Rate limiting response headers
- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) - Double-submit cookie pattern

---

_Last updated: 2026-01-31_
