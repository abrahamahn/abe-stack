# Authentication Issues Runbook

## Locked Accounts

### How accounts get locked

After repeated failed login attempts, the auth service locks the account by setting `locked_until` on the `users` table. The lockout duration escalates with consecutive failures. Once `locked_until` expires, the next login attempt auto-unlocks the account.

### How to unlock (database)

```sql
-- Find the locked account
SELECT id, email, locked_until, failed_login_attempts
FROM users
WHERE email = 'user@example.com';

-- Unlock the account
UPDATE users
SET locked_until = NULL, failed_login_attempts = 0
WHERE email = 'user@example.com';
```

### How to unlock (admin API)

Use the admin unlock endpoint if available, which also logs a security event:

```bash
curl -X POST https://api.yourapp.com/admin/users/<user-id>/unlock \
  -H "Authorization: Bearer <admin-jwt>"
```

## JWT Secret Rotation

ABE Stack supports `JWT_SECRET` and `JWT_SECRET_PREVIOUS` for zero-downtime rotation.

### Procedure

1. **Generate a new secret** (minimum 32 characters):
   ```bash
   openssl rand -base64 48
   ```
2. **Move the current secret to previous:**
   ```
   JWT_SECRET_PREVIOUS=<current-secret>
   JWT_SECRET=<new-secret>
   ```
3. **Deploy** the updated environment variables
4. **Wait for token expiry** (default: access tokens expire in 15 minutes, refresh tokens in 7 days)
5. **Remove `JWT_SECRET_PREVIOUS`** once all old tokens have expired

### When to rotate

- After a suspected secret leak
- Periodically (quarterly recommended)
- After an employee with access leaves the team

## OAuth Provider Outage

### Detection

- Users report inability to log in via Google/GitHub/etc.
- Login attempts for the OAuth provider fail with 5xx errors in logs

### Mitigation

1. **Confirm the outage** by checking the provider's status page
2. **Users with passwords** can fall back to email/password login
3. **Users without passwords** (OAuth-only) need a temporary password set:
   ```sql
   -- Check if the user has a password
   SELECT id, email, password_hash FROM users WHERE email = 'user@example.com';
   ```
   If `password_hash` is null or empty, direct them to the password reset flow once email is functional.
4. **Communicate** the outage to affected users and point them to alternative login methods

### Post-recovery

No action needed. OAuth logins resume automatically when the provider recovers.

## Mass Session Invalidation

### When needed

- Confirmed security breach or credential leak
- JWT secret compromised (rotate secret instead if possible)
- Mandatory logout for all users (policy change, major security update)

### How to execute

```sql
-- Revoke all active sessions
UPDATE user_sessions
SET revoked_at = NOW()
WHERE revoked_at IS NULL;

-- Revoke all refresh token families (forces re-authentication)
UPDATE refresh_token_families
SET revoked_at = NOW(), revoke_reason = 'security_breach'
WHERE revoked_at IS NULL;

-- Delete all active refresh tokens
DELETE FROM refresh_tokens
WHERE expires_at > NOW();
```

### Post-invalidation

- All users will be forced to log in again on their next request
- Monitor login volume for the spike and ensure the auth service handles the load
- Communicate the reason to users (email or status page)
