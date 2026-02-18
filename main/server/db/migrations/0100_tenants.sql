-- 0100_tenants.sql
--
-- Multi-Tenancy: Tenants, Memberships, Invitations & Settings
--
-- Workspace/organization layer. Tenants own resources; users join via memberships.
-- Includes allowed_email_domains for domain-restricted workspaces.
-- Depends on: 0000_users.sql

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE tenant_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- ============================================================================
-- Tenants (workspaces / organizations)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenants (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                 TEXT NOT NULL,
    slug                 TEXT NOT NULL UNIQUE,
    logo_url             TEXT,
    owner_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    allowed_email_domains TEXT[] NOT NULL DEFAULT '{}',
    metadata             JSONB NOT NULL DEFAULT '{}',
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT tenants_slug_format CHECK (slug ~ '^[a-z0-9-]+$'),
    CONSTRAINT tenants_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
    CONSTRAINT tenants_slug_length CHECK (char_length(slug) BETWEEN 1 AND 100)
);

CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- Memberships (user ↔ tenant with role)
-- ============================================================================

CREATE TABLE IF NOT EXISTS memberships (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       tenant_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT memberships_tenant_user_unique UNIQUE (tenant_id, user_id)
);

CREATE TRIGGER update_memberships_updated_at
    BEFORE UPDATE ON memberships
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- Invitations (pending membership offers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS invitations (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email         TEXT NOT NULL,
    role          tenant_role NOT NULL DEFAULT 'member',
    status        invitation_status NOT NULL DEFAULT 'pending',
    invited_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at    TIMESTAMPTZ NOT NULL,
    accepted_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT invitations_pending_unique UNIQUE (tenant_id, email)
);

-- ============================================================================
-- Tenant Settings (key-value store per tenant)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_settings (
    tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key        TEXT NOT NULL,
    value      JSONB NOT NULL DEFAULT 'null',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (tenant_id, key),
    CONSTRAINT tenant_settings_key_format CHECK (key ~ '^[a-z][a-z0-9_\.]{0,63}$')
);

CREATE TRIGGER update_tenant_settings_updated_at
    BEFORE UPDATE ON tenant_settings
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- Indexes
-- ============================================================================

-- Tenants
CREATE INDEX idx_tenants_owner  ON tenants(owner_id);
CREATE INDEX idx_tenants_slug   ON tenants(slug);
CREATE INDEX idx_tenants_active ON tenants(is_active) WHERE is_active = TRUE;

-- Memberships
CREATE INDEX idx_memberships_tenant ON memberships(tenant_id);
CREATE INDEX idx_memberships_user   ON memberships(user_id);
CREATE INDEX idx_memberships_role   ON memberships(tenant_id, role);

-- Invitations
CREATE INDEX idx_invitations_tenant  ON invitations(tenant_id);
CREATE INDEX idx_invitations_email   ON invitations(email);
CREATE INDEX idx_invitations_pending ON invitations(tenant_id, status)
    WHERE status = 'pending';
CREATE INDEX idx_invitations_expires    ON invitations(expires_at)
    WHERE status = 'pending';
CREATE INDEX idx_invitations_invited_by ON invitations(invited_by_id);

-- Tenant Settings
CREATE INDEX idx_tenant_settings_key ON tenant_settings(key);
