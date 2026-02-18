-- 0600_files.sql
--
-- Files: multi-provider file/upload management
--
-- Depends on: 0000_users.sql, 0100_tenants.sql

-- ============================================================================
-- Files
-- ============================================================================

CREATE TABLE IF NOT EXISTS files (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename         TEXT NOT NULL,
    original_name    TEXT NOT NULL,
    mime_type        TEXT NOT NULL,
    size_bytes       BIGINT NOT NULL,
    storage_provider TEXT NOT NULL CHECK (storage_provider IN ('local', 's3', 'gcs')),
    storage_path     TEXT NOT NULL,
    url              TEXT,
    purpose          TEXT NOT NULL DEFAULT 'other' CHECK (purpose IN ('avatar', 'document', 'export', 'attachment', 'other')),
    metadata         JSONB NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_files_user_created   ON files(user_id, created_at DESC);
CREATE INDEX idx_files_tenant_created ON files(tenant_id, created_at DESC) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_files_purpose_created ON files(purpose, created_at DESC);
CREATE INDEX idx_files_mime_type      ON files(mime_type);
CREATE INDEX idx_files_storage        ON files(storage_provider, storage_path);
