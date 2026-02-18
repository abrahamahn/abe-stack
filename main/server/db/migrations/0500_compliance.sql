-- 0500_compliance.sql
--
-- Compliance: legal documents, user agreements, consent logs, data export requests
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
-- User Agreements (Acceptance Records)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_agreements (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE RESTRICT,
    agreed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address  TEXT
);

-- ============================================================================
-- Consent Logs (GDPR Consent Audit Trail)
-- ============================================================================
-- Append-only. Records every consent grant or revocation.

CREATE TABLE IF NOT EXISTS consent_logs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL,
    granted      BOOLEAN NOT NULL,
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

CREATE INDEX idx_user_agreements_user      ON user_agreements(user_id);
CREATE INDEX idx_user_agreements_document  ON user_agreements(document_id);
CREATE INDEX idx_user_agreements_user_doc  ON user_agreements(user_id, document_id);

CREATE INDEX idx_consent_logs_user         ON consent_logs(user_id, created_at DESC);
CREATE INDEX idx_consent_logs_type         ON consent_logs(user_id, consent_type, created_at DESC);

CREATE INDEX idx_data_export_requests_user   ON data_export_requests(user_id, created_at DESC);
CREATE INDEX idx_data_export_requests_status ON data_export_requests(status);

-- new deleteExpired() cleanup task
CREATE INDEX idx_data_export_requests_expires
    ON data_export_requests(expires_at)
    WHERE expires_at IS NOT NULL AND status != 'completed';
