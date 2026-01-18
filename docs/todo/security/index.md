# Security Documentation

_Last Updated: January 19, 2026_

This section covers the security implementation and roadmap for ABE Stack.

---

## Documents

| Document                                  | Purpose                             |
| ----------------------------------------- | ----------------------------------- |
| [Phase 1 Complete](./phase-1-complete.md) | Auth security implementation report |
| [Phase 2 Roadmap](./phase-2-roadmap.md)   | Future security enhancements        |

---

## Current Security Features (Phase 1 Complete)

- **JWT Authentication** - Access + refresh token rotation with reuse detection
- **Password Security** - Argon2id hashing (OWASP parameters), custom strength validation
- **Password Reset** - Secure token-based reset with Argon2id hashed tokens
- **Email Verification** - Token-based verification with 24h expiry
- **Account Protection** - Login attempt tracking, progressive delays, account lockout
- **Role-Based Access** - User/admin/moderator roles with middleware guards
- **Input Validation** - Zod schemas on all endpoints
- **Rate Limiting** - Token bucket algorithm with configurable limits
- **Audit Logging** - Security events table for token reuse, lockouts, admin actions
- **Security Headers** - Comprehensive HTTP security headers (CSP, HSTS, etc.)
- **Token Storage** - Memory-based by default (XSS protection), HTTP-only cookies for refresh
- **WebSocket Auth** - Subprotocol header or cookie-based (no query params)

---

## Planned Features (Phase 2)

- Passport.js integration (Backend)
- OAuth providers - Google, GitHub, Apple (Backend)
- Magic links authentication (Backend)
- Two-factor authentication / TOTP (Backend)
- Session management UI (Frontend)

See [Phase 2 Roadmap](./phase-2-roadmap.md) for details.
