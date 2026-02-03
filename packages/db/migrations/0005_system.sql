-- packages/db/migrations/0005_system.sql
--
-- System infrastructure: jobs, audit_events, webhooks, webhook_deliveries
-- Depends on: 0000_init.sql (users), 0001_tenant.sql (tenants)
-- Matches packages/shared/src/domain/audit-log/audit-log.schemas.ts

-- ============================================================================
-- 1. Enums
-- ============================================================================

CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'dead');
CREATE TYPE audit_category AS ENUM ('security', 'admin', 'system', 'billing');
CREATE TYPE audit_severity AS ENUM ('info', 'warn', 'error', 'critical');
CREATE TYPE webhook_delivery_status AS ENUM ('pending', 'delivered', 'failed', 'dead');

-- ============================================================================
-- 2. Jobs (Postgres-Backed Queue)
-- ============================================================================

CREATE TABLE IF NOT EXISTS jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    status job_status NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 0,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_error TEXT,
    idempotency_key TEXT UNIQUE,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT jobs_attempts_positive CHECK (attempts >= 0),
    CONSTRAINT jobs_max_attempts_positive CHECK (max_attempts >= 1),
    CONSTRAINT jobs_priority_range CHECK (priority BETWEEN -100 AND 100)
);

-- ============================================================================
-- 3. Audit Events (General Audit Log)
-- ============================================================================
-- Append-only table. No UPDATE or DELETE in normal operations.

CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Action details
    action TEXT NOT NULL,
    category audit_category NOT NULL DEFAULT 'admin',
    severity audit_severity NOT NULL DEFAULT 'info',

    -- Target resource
    resource TEXT NOT NULL,
    resource_id TEXT,

    -- Context
    metadata JSONB NOT NULL DEFAULT '{}',
    ip_address TEXT,
    user_agent TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Action format enforcement: "noun.verb" (e.g., "user.created")
    CONSTRAINT audit_events_action_format CHECK (action ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$')
);

-- ============================================================================
-- 4. Webhooks (Registered Endpoints)
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL DEFAULT '{}',
    secret TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 5. Webhook Deliveries (Delivery Log + Replay)
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    response_status INTEGER,
    response_body TEXT,
    status webhook_delivery_status NOT NULL DEFAULT 'pending',
    attempts INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT webhook_deliveries_attempts_positive CHECK (attempts >= 0)
);

-- ============================================================================
-- 6. Indexes
-- ============================================================================

-- Jobs
CREATE INDEX idx_jobs_status ON jobs(status, scheduled_at)
    WHERE status IN ('pending', 'processing');
CREATE INDEX idx_jobs_type ON jobs(type, created_at DESC);
CREATE INDEX idx_jobs_scheduled ON jobs(scheduled_at)
    WHERE status = 'pending';
CREATE INDEX idx_jobs_failed ON jobs(status, created_at DESC)
    WHERE status IN ('failed', 'dead');
CREATE INDEX idx_jobs_idempotency ON jobs(idempotency_key)
    WHERE idempotency_key IS NOT NULL;

-- Audit Events
CREATE INDEX idx_audit_events_tenant ON audit_events(tenant_id, created_at DESC);
CREATE INDEX idx_audit_events_actor ON audit_events(actor_id, created_at DESC);
CREATE INDEX idx_audit_events_action ON audit_events(action, created_at DESC);
CREATE INDEX idx_audit_events_resource ON audit_events(resource, resource_id);
CREATE INDEX idx_audit_events_category ON audit_events(category, created_at DESC);
CREATE INDEX idx_audit_events_severity ON audit_events(severity, created_at DESC)
    WHERE severity IN ('error', 'critical');

-- Webhooks
CREATE INDEX idx_webhooks_tenant ON webhooks(tenant_id);
CREATE INDEX idx_webhooks_active ON webhooks(tenant_id, is_active)
    WHERE is_active = TRUE;

-- Webhook Deliveries
CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at)
    WHERE status IN ('pending', 'failed') AND next_retry_at IS NOT NULL;
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status, created_at DESC);
