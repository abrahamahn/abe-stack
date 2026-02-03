-- packages/db/migrations/0008_compliance.sql
--
-- Compliance: legal_documents, user_agreements, consent_logs
-- Depends on: 0000_init.sql (users)

-- ============================================================================
-- 1. Legal Documents (ToS, Privacy Policy Versions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS legal_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    effective_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One version number per document type
    CONSTRAINT legal_documents_version_unique UNIQUE (type, version),
    CONSTRAINT legal_documents_version_positive CHECK (version >= 1)
);

-- ============================================================================
-- 2. User Agreements (User Acceptance Records)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES legal_documents(id) ON DELETE RESTRICT,
    agreed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address TEXT
);

-- ============================================================================
-- 3. Consent Logs (GDPR Consent Audit Trail)
-- ============================================================================
-- Append-only table. Records every consent grant or revocation.

CREATE TABLE IF NOT EXISTS consent_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type TEXT NOT NULL,
    granted BOOLEAN NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. Indexes
-- ============================================================================

-- Legal Documents
CREATE INDEX idx_legal_documents_type ON legal_documents(type, version DESC);
CREATE INDEX idx_legal_documents_effective ON legal_documents(type, effective_at DESC);

-- User Agreements
CREATE INDEX idx_user_agreements_user ON user_agreements(user_id);
CREATE INDEX idx_user_agreements_document ON user_agreements(document_id);
CREATE INDEX idx_user_agreements_user_doc ON user_agreements(user_id, document_id);

-- Consent Logs
CREATE INDEX idx_consent_logs_user ON consent_logs(user_id, created_at DESC);
CREATE INDEX idx_consent_logs_type ON consent_logs(user_id, consent_type, created_at DESC);
