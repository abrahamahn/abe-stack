-- server/db/migrations/0013_files.sql
--
-- Files/Uploads: file management with multi-provider storage support
-- Depends on: 0000_init.sql (users), 0003_tenants.sql (tenants)

-- ============================================================================
-- 1. Files Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_provider TEXT NOT NULL CHECK (storage_provider IN ('local', 's3', 'gcs')),
    storage_path TEXT NOT NULL,
    url TEXT,
    purpose TEXT NOT NULL DEFAULT 'other' CHECK (purpose IN ('avatar', 'document', 'export', 'attachment', 'other')),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. Updated_at Trigger
-- ============================================================================

CREATE TRIGGER trg_files_updated_at
    BEFORE UPDATE ON files
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 3. Indexes
-- ============================================================================

-- User's files ordered by most recent
CREATE INDEX idx_files_user_created ON files(user_id, created_at DESC);

-- Tenant files (partial: only rows with tenant_id)
CREATE INDEX idx_files_tenant_created ON files(tenant_id, created_at DESC) WHERE tenant_id IS NOT NULL;

-- Filter by purpose
CREATE INDEX idx_files_purpose_created ON files(purpose, created_at DESC);

-- Filter by MIME type
CREATE INDEX idx_files_mime_type ON files(mime_type);

-- Storage provider + path for deduplication/lookup
CREATE INDEX idx_files_storage ON files(storage_provider, storage_path);
