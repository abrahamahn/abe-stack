-- 0301_email.sql
--
-- Email: templates and delivery log for transactional email
--
-- Depends on: 0000_users.sql

-- ============================================================================
-- Email Templates (TEXT primary key)
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_templates (
    key        TEXT PRIMARY KEY CHECK (key ~ '^[a-z][a-z0-9_.]+$' AND LENGTH(key) <= 100),
    name       TEXT NOT NULL,
    subject    TEXT NOT NULL,
    body_html  TEXT,
    body_text  TEXT,
    variables  JSONB NOT NULL DEFAULT '{}',
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- Email Log (append-only)
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
    template_key        TEXT REFERENCES email_templates(key) ON DELETE SET NULL,
    recipient           TEXT NOT NULL,
    subject             TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'bounced', 'failed')),
    provider            TEXT NOT NULL CHECK (provider IN ('smtp', 'ses', 'sendgrid', 'console')),
    provider_message_id TEXT,
    sent_at             TIMESTAMPTZ,
    delivered_at        TIMESTAMPTZ,
    bounced_at          TIMESTAMPTZ,
    error_message       TEXT,
    metadata            JSONB NOT NULL DEFAULT '{}',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_email_templates_active    ON email_templates(is_active) WHERE is_active = TRUE;

CREATE INDEX idx_email_log_user            ON email_log(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_email_log_status          ON email_log(status, created_at DESC);
CREATE INDEX idx_email_log_recipient       ON email_log(recipient, created_at DESC);
CREATE INDEX idx_email_log_template        ON email_log(template_key) WHERE template_key IS NOT NULL;
CREATE INDEX idx_email_log_provider_msg    ON email_log(provider_message_id) WHERE provider_message_id IS NOT NULL;
