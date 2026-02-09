# Authentication System Specification

This document details the authentication and security implementation for the Abe Stack application.

## 1. Architecture Overview

The system uses a **Dual-Token Architecture** combined with **HttpOnly Cookies** for maximum security and user experience.

### Tokens

1.  **Access Token (JWT)**
    - **Format**: JSON Web Token (Stateless).
    - **Storage**: Memory (Client-side) / Authorization Header.
    - **Lifespan**: Short (e.g., 15 minutes).
    - **Purpose**: Authorize API requests.
2.  **Refresh Token (Opaque)**
    - **Format**: Cryptographically random string (Stateful).
    - **Storage**: `HttpOnly`, `Secure`, `SameSite=Strict` Cookie.
    - **Lifespan**: Long (e.g., 7 days).
    - **Purpose**: Obtain new Access Tokens.

### Security Features

- **Token Rotation**: Every time a Refresh Token is used, it is invalidated and replaced with a new one. This detects token theft (if an old token is used, the system knows it's a replay/theft).
- **Family Tracking**: Refresh tokens belong to a "family". If unauthorized use is detected, the _entire family_ (all tokens from that login) is revoked.
- **Session Binding**: The Refresh Token family is bound to the initial **User-Agent**. If a token is used from a different browser/device (User-Agent mismatch), the session is immediately revoked to prevent hijacking.
- **Deterministic Hashing**: Sensitive tokens (Email Verification, Password Reset) are stored as SHA-256 hashes. Lookup is performed by hashing the input, ensuring raw tokens are never exposed in the DB.
- **Account Enumeration Protection**: Public endpoints (`register`, `forgot-password`) always return generic "Success" messages, even if the user already exists or doesn't exist.

---

## 2. Authentication Flows

### 2.1 Registration

1.  User submits `email`, `password`, `username`.
2.  **Validation**:
    - Email format (canonicalized).
    - Password strength (zxcvbn score).
    - Username uniqueness.
3.  **Outcome**:
    - **Success**: Creates `User` (unverified). Sends verification email. Returns "Pending Verification".
    - **Existing User**: Sends "Account Exists" email to the holder. Returns generic "Success" to caller (Privacy).

### 2.2 Login

1.  User submits `identifier` (email/username) and `password`.
2.  **Security Checks**:
    - **Rate Limiting**: Blocks brute-force attempts.
    - **Account Lockout**: Locks account after $N$ failed attempts.
    - **Argon2 Verification**: Verifies password hash.
3.  **2FA (Optional)**: If TOTP is enabled, returns a temporary `totp_challenge` token instead of full auth.
4.  **Success**:
    - Sets `refreshToken` cookie.
    - Returns `accessToken` and `user` object in JSON body.

### 2.3 Token Refresh (Session Management)

1.  Client request to `/api/auth/refresh`.
2.  Server reads `refreshToken` cookie.
3.  **Validation**:
    - Token exists in DB?
    - Token is not expired?
    - **Session Binding**: Does `User-Agent` match the session origin?
4.  **Rotation**:
    - Invalidates old token.
    - Issues new `refreshToken` (rotated).
    - Issues new `accessToken`.

### 2.4 Password Reset

1.  User requests reset for `email`.
2.  **Enumeration Protection**: Always returns "If that email exists, we sent a link."
3.  **Process**:
    - Generates `token`.
    - Stores `SHA-256(token)` in DB with expiry (24h).
    - Email contains link with raw `token`.
4.  User submits `token` + `newPassword`.
5.  Server hashes `token`, looks up valid record, updates password, and **revokes all existing sessions** (Security best practice).

---

## 3. Configuration

Configuration is managed via environment variables (validated by Zod schemas).

| Variable                     | Description                                           | Default       |
| :--------------------------- | :---------------------------------------------------- | :------------ |
| `JWT_SECRET`                 | Secret for signing Access Tokens. Must be 32+ chars.  | (Required)    |
| `COOKIE_SECRET`              | Secret for signing Cookies.                           | `JWT_SECRET`  |
| `ACCESS_TOKEN_EXPIRY`        | JWT lifespan.                                         | `15m`         |
| `REFRESH_TOKEN_EXPIRY_DAYS`  | Session lifespan (if active).                         | `7`           |
| `REFRESH_TOKEN_GRACE_PERIOD` | Window for network retries during rotation (seconds). | `30`          |
| `LOCKOUT_MAX_ATTEMPTS`       | Failed logins before lockout.                         | `5`           |
| `LOCKOUT_DURATION_MS`        | Duration of account lockout.                          | `300000` (5m) |

## 4. Database Schema Reference

- **`users`**: Core identity. `password_hash` (Argon2), `totp_secret`, `email_verified`.
- **`refresh_tokens`**: Active refresh tokens. `token` (Hash/Opaque), `family_id`.
- **`refresh_token_families`**: Groups tokens to a single login session. Tracks `revoked_at`.
- **`user_sessions`**: Metadata for families. Stores `user_agent` for binding.
- **`email_verification_tokens`**: `token_hash` (SHA-256).
- **`password_reset_tokens`**: `token_hash` (SHA-256).
