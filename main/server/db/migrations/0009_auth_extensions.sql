-- packages/db/migrations/0009_auth_extensions.sql
--
-- Auth extensions: TOTP columns on users, totp_backup_codes, email_change_tokens
-- Depends on: 0000_init.sql (users)

-- ============================================================================
-- 1. TOTP Columns on Users
-- ============================================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS totp_secret TEXT,
  ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================================
-- 2. TOTP Backup Codes
-- ============================================================================
-- Each user has up to 10 single-use backup codes for 2FA recovery.
-- Codes are hashed with Argon2id. Consumed by setting used_at.

CREATE TABLE IF NOT EXISTS totp_backup_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash TEXT NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. Email Change Tokens
-- ============================================================================
-- Tracks pending email change requests. Token is hashed.
-- Consumed by setting used_at when confirmed.

CREATE TABLE IF NOT EXISTS email_change_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    new_email TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. Indexes
-- ============================================================================

-- TOTP Backup Codes
CREATE INDEX idx_totp_backup_codes_user ON totp_backup_codes(user_id);
CREATE INDEX idx_totp_backup_codes_unused ON totp_backup_codes(user_id) WHERE used_at IS NULL;

-- Email Change Tokens
CREATE INDEX idx_email_change_tokens_user ON email_change_tokens(user_id);
CREATE INDEX idx_email_change_tokens_hash ON email_change_tokens(token_hash);
