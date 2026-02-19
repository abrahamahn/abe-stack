-- 0000_users.sql
--
-- Foundation: Users & Core Authentication Tokens
--
-- The root identity layer. Every other table references users.
-- Includes all user profile and lifecycle fields (consolidated final state).
-- Depends on: nothing

-- ============================================================================
-- Extensions & Utilities
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Auto-update updated_at on any table that uses it
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');

-- ============================================================================
-- Users (core identity — all profile + lifecycle fields)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email                      TEXT NOT NULL UNIQUE,
    canonical_email            TEXT NOT NULL UNIQUE,
    username                   TEXT UNIQUE,
    password_hash              TEXT NOT NULL,
    avatar_url                 TEXT,
    role                       user_role NOT NULL DEFAULT 'user',

    -- Email verification
    email_verified             BOOLEAN NOT NULL DEFAULT FALSE,
    email_verified_at          TIMESTAMPTZ,

    -- MFA / TOTP
    totp_secret                TEXT,
    totp_enabled               BOOLEAN NOT NULL DEFAULT FALSE,

    -- Profile
    first_name                 TEXT NOT NULL DEFAULT '',
    last_name                  TEXT NOT NULL DEFAULT '',
    bio                        TEXT,
    website                    TEXT,
    language                   TEXT,

    -- Location
    city                       TEXT,
    state                      TEXT,
    country                    TEXT,

    -- Contact
    phone                      TEXT,
    phone_verified             BOOLEAN,
    date_of_birth              TIMESTAMPTZ,
    gender                     TEXT,

    -- Username change tracking
    last_username_change       TIMESTAMPTZ,

    -- Security
    failed_login_attempts      INTEGER NOT NULL DEFAULT 0 CHECK (failed_login_attempts >= 0),
    locked_until               TIMESTAMPTZ,
    lock_reason                TEXT,
    token_version              INTEGER NOT NULL DEFAULT 0,

    -- Account lifecycle
    deactivated_at             TIMESTAMPTZ,
    deleted_at                 TIMESTAMPTZ,
    deletion_grace_period_ends TIMESTAMPTZ,

    -- Timestamps
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version                    INTEGER NOT NULL DEFAULT 1
);

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- Refresh Token Families (reuse detection — revoke entire family on theft)
-- ============================================================================

CREATE TABLE IF NOT EXISTS refresh_token_families (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address    TEXT,
    user_agent    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at    TIMESTAMPTZ,
    revoke_reason TEXT
);

-- ============================================================================
-- Refresh Tokens (short-lived, rotated on each use)
-- ============================================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id  UUID REFERENCES refresh_token_families(id) ON DELETE CASCADE,
    token      TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Login Attempts (rate limiting + account lockout detection)
-- ============================================================================

CREATE TABLE IF NOT EXISTS login_attempts (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email          TEXT NOT NULL,
    ip_address     TEXT,
    user_agent     TEXT,
    success        BOOLEAN NOT NULL,
    failure_reason TEXT,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Password Reset Tokens
-- ============================================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Email Verification Tokens
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Security Events (audit trail for critical auth events)
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_events (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    email      TEXT,
    event_type TEXT NOT NULL,
    severity   TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    metadata   JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_users_email                    ON users(email);
CREATE INDEX idx_users_canonical_email          ON users(canonical_email);
CREATE INDEX idx_users_username                 ON users(username) WHERE username IS NOT NULL;
CREATE INDEX idx_users_role                     ON users(role);
CREATE INDEX idx_users_created_at               ON users(created_at DESC);

CREATE INDEX idx_refresh_token_families_user    ON refresh_token_families(user_id);

CREATE INDEX idx_refresh_tokens_token           ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_family          ON refresh_tokens(family_id);
CREATE INDEX idx_refresh_tokens_user            ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_expires   ON refresh_tokens(token, expires_at);

CREATE INDEX idx_login_attempts_email_created   ON login_attempts(email, created_at);
CREATE INDEX idx_login_attempts_ip              ON login_attempts(ip_address);

CREATE INDEX idx_password_reset_tokens_hash     ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_user     ON password_reset_tokens(user_id);

CREATE INDEX idx_email_verification_tokens_hash ON email_verification_tokens(token_hash);
CREATE INDEX idx_email_verification_tokens_user ON email_verification_tokens(user_id);

CREATE INDEX idx_security_events_user           ON security_events(user_id);
CREATE INDEX idx_security_events_user_created   ON security_events(user_id, created_at DESC);

-- Active users (soft-delete filter — most user queries exclude deleted/deactivated)
CREATE INDEX idx_users_active ON users(id)
    WHERE deleted_at IS NULL AND deactivated_at IS NULL;

-- Active refresh tokens by user (common: "invalidate all sessions for user X")
CREATE INDEX idx_refresh_tokens_user_expires ON refresh_tokens(user_id, expires_at DESC)
    WHERE expires_at > NOW();

-- login lockout check on every login attempt
CREATE INDEX idx_users_locked_until
    ON users(locked_until) WHERE locked_until IS NOT NULL;

-- hard-delete batch job filter
CREATE INDEX idx_users_deletion_grace
    ON users(deletion_grace_period_ends)
    WHERE deletion_grace_period_ends IS NOT NULL;

-- deleteExpired() cleanup task
CREATE INDEX idx_password_reset_tokens_expires
    ON password_reset_tokens(expires_at);

-- deleteExpired() cleanup task
CREATE INDEX idx_email_verification_tokens_expires
    ON email_verification_tokens(expires_at);

-- admin security-event filtering by type
CREATE INDEX idx_security_events_type
    ON security_events(event_type, created_at DESC);
