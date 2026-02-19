-- 0500_compliance.sql
--
-- Compliance: legal documents, consent records, data export requests
--
-- Depends on: 0000_users.sql

-- ============================================================================
-- Legal Documents (ToS, Privacy Policy Versions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS legal_documents (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type         TEXT NOT NULL,
    title        TEXT NOT NULL,
    content      TEXT NOT NULL,
    version      INTEGER NOT NULL DEFAULT 1,
    effective_at TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT legal_documents_version_unique   UNIQUE (type, version),
    CONSTRAINT legal_documents_version_positive CHECK (version >= 1)
);

-- ============================================================================
-- Consent Records (Acceptance + GDPR Consent Audit Trail)
-- Unified append-only table replacing user_agreements + consent_logs
-- ============================================================================

CREATE TABLE IF NOT EXISTS consent_records (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_type  TEXT NOT NULL CHECK (record_type IN ('legal_document','consent_preference')),
    document_id  UUID REFERENCES legal_documents(id) ON DELETE RESTRICT, -- legal_document only
    consent_type TEXT,       -- consent_preference only
    granted      BOOLEAN,    -- consent_preference only; NULL for legal_document
    ip_address   TEXT,
    user_agent   TEXT,
    metadata     JSONB NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Data Export Requests (GDPR Export & Deletion Workflows)
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_export_requests (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type          TEXT NOT NULL CHECK (type IN ('export', 'deletion')),
    status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'canceled')),
    format        TEXT NOT NULL DEFAULT 'json',
    download_url  TEXT,
    expires_at    TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ,
    error_message TEXT,
    metadata      JSONB NOT NULL DEFAULT '{}',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_legal_documents_type      ON legal_documents(type, version DESC);
CREATE INDEX idx_legal_documents_effective ON legal_documents(type, effective_at DESC);

CREATE INDEX idx_consent_records_user         ON consent_records(user_id, created_at DESC);
CREATE INDEX idx_consent_records_user_consent ON consent_records(user_id, consent_type, created_at DESC)
    WHERE consent_type IS NOT NULL;
CREATE INDEX idx_consent_records_document     ON consent_records(document_id)
    WHERE document_id IS NOT NULL;
CREATE INDEX idx_consent_records_user_doc     ON consent_records(user_id, document_id)
    WHERE document_id IS NOT NULL;

CREATE INDEX idx_data_export_requests_user   ON data_export_requests(user_id, created_at DESC);
CREATE INDEX idx_data_export_requests_status ON data_export_requests(status);

-- new deleteExpired() cleanup task
CREATE INDEX idx_data_export_requests_expires
    ON data_export_requests(expires_at)
    WHERE expires_at IS NOT NULL AND status != 'completed';
