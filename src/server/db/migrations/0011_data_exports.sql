-- packages/db/migrations/0011_data_exports.sql
--
-- Data Export Requests: GDPR export and deletion workflows
-- Depends on: 0000_init.sql (users)

-- ============================================================================
-- 1. Data Export Requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('export', 'deletion')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'canceled')),
    format TEXT NOT NULL DEFAULT 'json',
    download_url TEXT,
    expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. Indexes
-- ============================================================================

CREATE INDEX idx_data_export_requests_user ON data_export_requests(user_id, created_at DESC);
CREATE INDEX idx_data_export_requests_status ON data_export_requests(status);
