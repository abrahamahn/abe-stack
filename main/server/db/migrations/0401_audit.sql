-- 0401_audit.sql
--
-- Audit Events: append-only general audit log
--
-- Depends on: 0000_users.sql, 0100_tenants.sql

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE audit_category AS ENUM ('security', 'admin', 'system', 'billing');
CREATE TYPE audit_severity AS ENUM ('info', 'warn', 'error', 'critical');

-- ============================================================================
-- Audit Events (Append-Only)
-- ============================================================================
-- No UPDATE or DELETE in normal operations.

CREATE TABLE IF NOT EXISTS audit_events (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID REFERENCES tenants(id) ON DELETE SET NULL,
    actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    action      TEXT NOT NULL,
    category    audit_category NOT NULL DEFAULT 'admin',
    severity    audit_severity NOT NULL DEFAULT 'info',
    resource    TEXT NOT NULL,
    resource_id TEXT,
    metadata    JSONB NOT NULL DEFAULT '{}',
    ip_address  TEXT,
    user_agent  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Action format enforcement: "noun.verb" (e.g., "user.created")
    CONSTRAINT audit_events_action_format CHECK (action ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$')
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_audit_events_tenant   ON audit_events(tenant_id, created_at DESC);
CREATE INDEX idx_audit_events_actor    ON audit_events(actor_id, created_at DESC);
CREATE INDEX idx_audit_events_action   ON audit_events(action, created_at DESC);
CREATE INDEX idx_audit_events_resource ON audit_events(resource, resource_id);
CREATE INDEX idx_audit_events_category ON audit_events(category, created_at DESC);
CREATE INDEX idx_audit_events_severity ON audit_events(severity, created_at DESC)
    WHERE severity IN ('error', 'critical');
