# Shared Utils: Crypto Module - Current Behavior Spec

**Status:** DRAFT (Current State)
**Module:** `@bslt/shared/utils/crypto`
**Source:** `main/shared/src/utils/crypto`

## Overview

The Crypto module provides cryptographically secure primitives for token generation, JWT handling, and constant-time comparisons. It is designed to be environment-agnostic (Node.js/Edge/Browser) by leveraging the Web Crypto API.

## Core Capabilities

### 1. Secure Primitives (`crypto.ts`)

- **Method:** Uses `globalThis.crypto` (Web Crypto API).
- **Generators:**
  - `generateToken(length)`: Hex string of random bytes.
  - `generateUUID()`: Native `randomUUID()` or secure fallback (v4 compliant).
  - `generateSecureId(length)`: Alphanumeric string using **Rejection Sampling** to eliminate modular bias (uniform distribution).
- **Security:** `constantTimeCompare(a, b)` prevents timing attacks on string comparisons (XOR-based).

### 2. JWT Implementation (`jwt.ts`)

- **Philosophy:** Zero-dependency, native Node.js implementation using `node:crypto`.
- **Algorithm:** HS256 (HMAC-SHA256) only. No support for "none" or asymmetric algs to reduce attack surface.
- **Signing:** Supports `iat` (issued at) and `exp` (expiration) claims automatically.
- **Verification:**
  - Strict check for `alg: HS256`.
  - Constant-time signature verification.
  - Expiration check (`exp` claim).
- **Rotation:** `signWithRotation` and `verifyWithRotation` support a graceful key rotation strategy (Current + Previous secret).

### 3. Token Storage (`token.ts`)

- **Strategy:** In-Memory storage by default (`createMemoryTokenStore`).
- **Persistence:** Optional local storage sync (vulnerable to XSS, but supported).
- **Helper:** `addAuthHeader` utility for constructing Bearer headers.

## API Surface

### `crypto.ts`

| Function              | Input       | Returns             | Notes                           |
| :-------------------- | :---------- | :------------------ | :------------------------------ |
| `generateToken`       | `length=32` | `string` (hex)      |                                 |
| `generateUUID`        | `void`      | `string` (uuid)     | Uses `randomUUID` if available. |
| `generateSecureId`    | `length=16` | `string` (alphanum) | Uniform distribution.           |
| `constantTimeCompare` | `a, b`      | `boolean`           | O(max(a, b)) time.              |

### `jwt.ts`

| Function             | Input                   | Returns      | Notes                         |
| :------------------- | :---------------------- | :----------- | :---------------------------- |
| `sign`               | `payload, secret, opts` | `string`     | HS256 only.                   |
| `verify`             | `token, secret`         | `JwtPayload` | Throws `JwtError`.            |
| `verifyWithRotation` | `token, config`         | `JwtPayload` | Tries current, then previous. |
| `checkTokenSecret`   | `secret`                | `boolean`    | Verifies >= 32 bytes.         |

## Behavior Notes & Edge Cases

1.  **JWT Expiration:** `parseExpiration` supports `s, m, h, d` suffixes. If no suffix is provided, it assumes seconds (if number) or throws (if string without unit).
2.  **Secret Length:** `checkTokenSecret` enforces a recommendation (32 bytes) but `sign` does _not_ throw if the secret is weak. It allows weak keys.
3.  **Token Store:** `createMemoryTokenStore` attempts to sync with `localStorage` if available. This means even "Memory" storage might flush to disk in a browser environment, which could be an unexpected XSS vector if not understood.

## Observed Limitations / Flaws (For Audit)

- **JWT Header Verification:** The header verification logic parses JSON _before_ verifying the signature. While `alg` is checked, parsing untrusted JSON can be a vector (though minimal in this context).
- **No "nbf" Check:** The `verify` function checks `exp` but ignores `nbf` (Not Before) claim if present.
- **Token Store Ambiguity:** The `memory` store is actually a "Memory + LocalStorage Sync" hybrid. This naming is misleading secure-by-default users who expect _only_ RAM storage.

## Usage Example

```typescript
const secret = generateToken(64); // Secure 64-char hex
const token = jwtSign({ userId: '123' }, secret, { expiresIn: '1h' });

const isValid = constantTimeCompare(userInput, storedHash);
```
