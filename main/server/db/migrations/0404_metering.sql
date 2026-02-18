-- 0404_metering.sql
--
-- Usage Metering: metric definitions and per-tenant snapshots
--
-- Depends on: 0100_tenants.sql

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE aggregation_type AS ENUM ('sum', 'max', 'last');

-- ============================================================================
-- Usage Metrics (Metric Definitions)
-- ============================================================================
-- TEXT primary key — metrics referenced by name in billing logic
-- (e.g., "api_calls", "storage_gb", "seats").

CREATE TABLE IF NOT EXISTS usage_metrics (
    key              TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    unit             TEXT NOT NULL,
    aggregation_type aggregation_type NOT NULL DEFAULT 'sum',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT usage_metrics_key_format CHECK (key ~ '^[a-z][a-z0-9_]+$'),
    CONSTRAINT usage_metrics_key_length CHECK (char_length(key) BETWEEN 1 AND 100)
);

-- ============================================================================
-- Usage Snapshots (Recorded Usage Per Tenant Per Period)
-- ============================================================================

CREATE TABLE IF NOT EXISTS usage_snapshots (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    metric_key   TEXT NOT NULL REFERENCES usage_metrics(key) ON DELETE RESTRICT,
    value        NUMERIC NOT NULL DEFAULT 0,
    period_start TIMESTAMPTZ NOT NULL,
    period_end   TIMESTAMPTZ NOT NULL,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT usage_snapshots_unique        UNIQUE (tenant_id, metric_key, period_start),
    CONSTRAINT usage_snapshots_value_positive CHECK (value >= 0),
    CONSTRAINT usage_snapshots_period_order  CHECK (period_end > period_start)
);

CREATE TRIGGER update_usage_snapshots_updated_at
    BEFORE UPDATE ON usage_snapshots
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_usage_snapshots_tenant        ON usage_snapshots(tenant_id);
CREATE INDEX idx_usage_snapshots_metric        ON usage_snapshots(metric_key, period_start DESC);
CREATE INDEX idx_usage_snapshots_tenant_period ON usage_snapshots(tenant_id, period_start DESC);
CREATE INDEX idx_usage_snapshots_lookup        ON usage_snapshots(tenant_id, metric_key, period_start DESC);
