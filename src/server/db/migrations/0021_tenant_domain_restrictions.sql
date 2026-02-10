-- server/db/migrations/0021_tenant_domain_restrictions.sql
--
-- Tenant Domain Restrictions: optional email domain allowlist per workspace.
-- When set, only users with matching email domains can be invited.
-- Depends on: 0001_tenant.sql (tenants)

-- ============================================================================
-- 1. Add allowed_email_domains column
-- ============================================================================

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS allowed_email_domains TEXT[] NOT NULL DEFAULT '{}';
