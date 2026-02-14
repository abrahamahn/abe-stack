-- server/db/migrations/0022_account_lifecycle.sql
--
-- Account Lifecycle: deactivation, soft-deletion with grace period, and reactivation.
-- Depends on: 0000_init.sql (users)

-- ============================================================================
-- 1. Add lifecycle columns to users table
-- ============================================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS deletion_grace_period_ends TIMESTAMPTZ DEFAULT NULL;
