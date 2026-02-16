# Forensic Spec: Authentication (`shared/domain/auth`)

> **Context:** This spec documents the "As-Is" state of the Auth module, identifying gaps against the newly defined Enterprise Hardening standards.

## 1. Logic Leaks & Security Gaps

### A. PII and Sensitive Data Leakage

- **Observation:** `bffLoginResponseSchema` and `authResponseSchema` return the full `User` object.
- **Risk:** Without explicit sanitization, internal fields (metadata, internal roles, or even hashed passwords if the DB model leaks into the domain) could be exposed to the client.
- **Hardening:** Introduce `PrivateUserSchema` vs `PublicUserSchema`. Implement `SanitizeSchema` for all responses.

### B. Raw UUIDs (Forensic Debt)

- **Observation:** All IDs (User ID, Tenant ID, Session ID) are raw UUIDs.
- **Risk:** Logs like `User 550e... logged into Tenant 660f...` are impossible for humans/AI to scan effectively for forensics.
- **Hardening:** Transition to `usr_...`, `org_...`, `ses_...` prefixes.

### C. Rate Limit Under-Definition

- **Observation:** Contracts exist, but `RateLimitTier` metadata is missing from the `authContract` definition.
- **Risk:** Middleware must guess or maintain a separate mapping of which routes are "Critical" vs "Standard".
- **Hardening:** Add `tier: RateLimitTier.CRITICAL` to all authentication mutations.

### D. Missing Traceability

- **Observation:** `BaseResponse` with `traceId` is not yet enforced across auth responses.
- **Risk:** Support cannot correlate a frontend error with backend logs.
- **Hardening:** Wrap all responses in a `TraceableResponse` interface.

## 2. Technical Debt & Logic Inconsistencies

### A. Non-Empty PATCH Invariant

- **Observation:** Account update schemas (if any exist in this module) allow empty bodies.
- **Risk:** Useless DB writes and undefined behavior.
- **Hardening:** Enforce `.refine(data => Object.keys(data).length > 0)` at the Zod layer.

### B. Actor Identity Confusion

- **Observation:** Audit logs currently assume a single `userId`.
- **Risk:** Cannot distinguish between a User action, an API Key action, or an Admin Impersonation.
- **Hardening:** Implement the `Actor` polymorphic interface.

### C. Clock Skew & Precision Invariant

- **Observation:** `expiresAt` fields currently use raw `string` or `Date`.
- **Risk:** Serialization bugs and client/server time disagreement.
- **Hardening:** Enforce `ISO8601` branded type for all temporal fields.

## 3. Implementation Blueprint (Hardened v1.0.0)

### A. Branded String Schema (Example)

```typescript
export const UserIdSchema = createBrandedStringSchema<'usr'>('usr');
export const OrgIdSchema = createBrandedStringSchema<'org'>('org');
```

### B. Hardened Registry Mapping

| Endpoint   | Method | Path                 | Rate Limit | Hardening Requirement                  |
| :--------- | :----- | :------------------- | :--------- | :------------------------------------- |
| `login`    | `POST` | `/api/auth/login`    | `CRITICAL` | Idempotency Key, TraceId, usr\_ prefix |
| `register` | `POST` | `/api/auth/register` | `CRITICAL` | PII Sanitization, Captcha bypass check |
| `sudo`     | `POST` | `/api/auth/sudo`     | `CRITICAL` | Impersonation Audit scoping            |

## 4. Maintenance & Operations

- [ ] Add `apiVersion: "v1.0.0"` to every response.
- [ ] Implement `X-BSLT-Deprecation` header logic for legacy endpoints.
- [ ] Centralize all `AuthError` strings into `shared/domain/errors.ts`.
