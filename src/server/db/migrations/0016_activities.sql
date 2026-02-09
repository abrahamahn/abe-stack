-- server/db/migrations/0016_activities.sql
--
-- Activities: user-facing activity feed ("X did Y on Z" timeline)
-- Depends on: 0000_init.sql (users), 0001_tenant.sql (tenants)
-- Matches server/db/src/schema/activities.ts exactly

-- ============================================================================
-- 1. Enums
-- ============================================================================

CREATE TYPE actor_type AS ENUM ('user', 'system', 'api_key');

-- ============================================================================
-- 2. Activities (Append-Only Activity Feed)
-- ============================================================================
-- Append-only table. No UPDATE or DELETE in normal operations.
-- Similar to audit_events in 0005_system.sql but user-facing.

CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_type actor_type NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}',
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. Indexes
-- ============================================================================

-- Tenant activity feed ordered by most recent
CREATE INDEX idx_activities_tenant ON activities(tenant_id, created_at DESC)
    WHERE tenant_id IS NOT NULL;

-- Actor activity history
CREATE INDEX idx_activities_actor ON activities(actor_id, created_at DESC)
    WHERE actor_id IS NOT NULL;

-- Resource-specific activity (e.g., "show all activity on project X")
CREATE INDEX idx_activities_resource ON activities(resource_type, resource_id, created_at DESC);

-- Action type filter
CREATE INDEX idx_activities_action ON activities(action, created_at DESC);
