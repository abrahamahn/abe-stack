-- 0402_webhooks.sql
--
-- Webhooks: registered endpoints and delivery log
--
-- Depends on: 0100_tenants.sql

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE webhook_delivery_status AS ENUM ('pending', 'delivered', 'failed', 'dead');

-- ============================================================================
-- Webhooks (Registered Endpoints)
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhooks (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id  UUID REFERENCES tenants(id) ON DELETE CASCADE,
    url        TEXT NOT NULL,
    events     TEXT[] NOT NULL DEFAULT '{}',
    secret     TEXT NOT NULL,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- Webhook Deliveries (Delivery Log + Replay)
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id      UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type      TEXT NOT NULL,
    payload         JSONB NOT NULL DEFAULT '{}',
    response_status INTEGER,
    response_body   TEXT,
    status          webhook_delivery_status NOT NULL DEFAULT 'pending',
    attempts        INTEGER NOT NULL DEFAULT 0,
    next_retry_at   TIMESTAMPTZ,
    delivered_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT webhook_deliveries_attempts_positive CHECK (attempts >= 0)
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_webhooks_tenant          ON webhooks(tenant_id);
CREATE INDEX idx_webhooks_active          ON webhooks(tenant_id, is_active)
    WHERE is_active = TRUE;

CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_retry   ON webhook_deliveries(next_retry_at)
    WHERE status IN ('pending', 'failed') AND next_retry_at IS NOT NULL;
CREATE INDEX idx_webhook_deliveries_status  ON webhook_deliveries(status, created_at DESC);
