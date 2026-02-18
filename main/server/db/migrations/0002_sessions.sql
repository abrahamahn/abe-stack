-- 0002_sessions.sql
--
-- Sessions, OAuth & Magic Links
--
-- Session management, third-party OAuth connections, and passwordless login.
-- Includes device fields (device_name, device_type) from initial definition.
-- Depends on: 0000_users.sql

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE oauth_provider AS ENUM ('google', 'github', 'apple');

-- ============================================================================
-- User Sessions (device-aware, revocable)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address     TEXT,
    user_agent     TEXT,
    device_id      TEXT,
    device_name    TEXT,
    device_type    TEXT,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- OAuth Connections (linked social accounts)
-- ============================================================================

CREATE TABLE IF NOT EXISTS oauth_connections (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider         oauth_provider NOT NULL,
    provider_user_id TEXT NOT NULL,
    provider_email   TEXT,
    access_token     TEXT NOT NULL,
    refresh_token    TEXT,
    expires_at       TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT oauth_connections_provider_user UNIQUE (provider, provider_user_id)
);

CREATE TRIGGER update_oauth_connections_updated_at
    BEFORE UPDATE ON oauth_connections
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- Magic Link Tokens (passwordless email login)
-- ============================================================================

CREATE TABLE IF NOT EXISTS magic_link_tokens (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email      TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- User Sessions
CREATE INDEX idx_user_sessions_user     ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active   ON user_sessions(user_id, last_active_at DESC)
    WHERE revoked_at IS NULL;
CREATE INDEX idx_user_sessions_device   ON user_sessions(user_id, device_id);

-- OAuth Connections
CREATE INDEX idx_oauth_connections_user     ON oauth_connections(user_id);
CREATE INDEX idx_oauth_connections_provider ON oauth_connections(user_id, provider);

-- Magic Link Tokens
CREATE INDEX idx_magic_link_tokens_email   ON magic_link_tokens(email);
CREATE INDEX idx_magic_link_tokens_hash    ON magic_link_tokens(token_hash);
CREATE INDEX idx_magic_link_tokens_expires ON magic_link_tokens(expires_at)
    WHERE used_at IS NULL;

-- deleteRevokedBefore() cleanup: scans all revoked rows by date
CREATE INDEX idx_user_sessions_revoked_at
    ON user_sessions(revoked_at) WHERE revoked_at IS NOT NULL;

-- hourly OAuth refresh task: find tokens expiring soon
CREATE INDEX idx_oauth_connections_expires
    ON oauth_connections(expires_at) WHERE expires_at IS NOT NULL;
