-- packages/db/migrations/0006_features.sql
--
-- Feature management: feature_flags, tenant_feature_overrides
-- Depends on: 0001_tenant.sql (tenants)
-- Matches packages/shared/src/domain/feature-flags/feature-flags.schemas.ts

-- ============================================================================
-- 1. Feature Flags (Global Toggle Definitions)
-- ============================================================================
-- Uses TEXT primary key (e.g., "billing.seat_based", "ui.dark_mode")
-- rather than UUID since flags are referenced by name in code.

CREATE TABLE IF NOT EXISTS feature_flags (
    key TEXT PRIMARY KEY,
    description TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    default_value JSONB,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT feature_flags_key_format CHECK (key ~ '^[a-z][a-z0-9_.]+$'),
    CONSTRAINT feature_flags_key_length CHECK (char_length(key) BETWEEN 1 AND 100)
);

CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 2. Tenant Feature Overrides (Per-Tenant Flag Values)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_feature_overrides (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key TEXT NOT NULL REFERENCES feature_flags(key) ON DELETE CASCADE,
    value JSONB,
    is_enabled BOOLEAN NOT NULL,

    PRIMARY KEY (tenant_id, key)
);

-- ============================================================================
-- 3. Indexes
-- ============================================================================

-- Feature Flags
CREATE INDEX idx_feature_flags_enabled ON feature_flags(is_enabled);

-- Tenant Feature Overrides
CREATE INDEX idx_tenant_feature_overrides_tenant ON tenant_feature_overrides(tenant_id);
CREATE INDEX idx_tenant_feature_overrides_key ON tenant_feature_overrides(key);
