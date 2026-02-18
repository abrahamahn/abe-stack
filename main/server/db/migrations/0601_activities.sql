-- 0601_activities.sql
--
-- Activities: user-facing activity feed ("X did Y on Z" timeline)
--
-- Depends on: 0000_users.sql, 0100_tenants.sql

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE actor_type AS ENUM ('user', 'system', 'api_key');

-- ============================================================================
-- Activities (Append-Only Activity Feed)
-- ============================================================================
-- User-facing counterpart to audit_events (0401). No UPDATE or DELETE.

CREATE TABLE IF NOT EXISTS activities (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID REFERENCES tenants(id) ON DELETE SET NULL,
    actor_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_type    actor_type NOT NULL,
    action        TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id   TEXT NOT NULL,
    description   TEXT,
    metadata      JSONB NOT NULL DEFAULT '{}',
    ip_address    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_activities_tenant   ON activities(tenant_id, created_at DESC)
    WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_activities_actor    ON activities(actor_id, created_at DESC)
    WHERE actor_id IS NOT NULL;
CREATE INDEX idx_activities_resource ON activities(resource_type, resource_id, created_at DESC);
CREATE INDEX idx_activities_action   ON activities(action, created_at DESC);
