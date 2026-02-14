-- server/db/migrations/0015_tenant_settings.sql
--
-- Tenant Settings: per-tenant key-value configuration storage
-- Depends on: 0001_tenant.sql (tenants)
-- Matches server/db/src/schema/tenant-settings.ts exactly

-- ============================================================================
-- 1. Tenant Settings (Key-Value Config Per Tenant)
-- ============================================================================
-- Composite primary key: (tenant_id, key).
-- Same pattern as tenant_feature_overrides in 0006_features.sql.

CREATE TABLE IF NOT EXISTS tenant_settings (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (tenant_id, key),

    -- Key format: lowercase alphanumeric + dots + underscores
    CONSTRAINT tenant_settings_key_format CHECK (key ~ '^[a-z][a-z0-9_.]+$'),
    CONSTRAINT tenant_settings_key_length CHECK (char_length(key) BETWEEN 1 AND 100)
);

CREATE TRIGGER update_tenant_settings_updated_at
    BEFORE UPDATE ON tenant_settings
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 2. Indexes
-- ============================================================================

-- Lookup settings by key across all tenants (admin use)
CREATE INDEX idx_tenant_settings_key ON tenant_settings(key);
