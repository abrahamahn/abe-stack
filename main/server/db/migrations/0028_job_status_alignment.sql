-- packages/db/migrations/0028_job_status_alignment.sql
--
-- Align job_status enum with shared domain definition.
-- Renames 'dead' → 'dead_letter' and adds 'cancelled'.
-- Updates partial indexes that reference old values.

-- ============================================================================
-- 1. Add new enum values
-- ============================================================================

ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'dead_letter';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'cancelled';

-- ============================================================================
-- 2. Migrate existing data ('dead' → 'dead_letter')
-- ============================================================================

-- PostgreSQL doesn't support renaming enum values or removing them directly.
-- We need to: create a new type, migrate the column, drop the old type.

-- Step 2a: Create the new enum without 'dead'
CREATE TYPE job_status_new AS ENUM (
    'pending', 'processing', 'completed', 'failed', 'dead_letter', 'cancelled'
);

-- Step 2b: Migrate the column
-- First drop dependent objects (indexes with WHERE clauses referencing the column)
DROP INDEX IF EXISTS idx_jobs_failed;

ALTER TABLE jobs
    ALTER COLUMN status DROP DEFAULT,
    ALTER COLUMN status TYPE job_status_new
        USING (CASE WHEN status::text = 'dead' THEN 'dead_letter'::job_status_new
                     ELSE status::text::job_status_new END),
    ALTER COLUMN status SET DEFAULT 'pending';

-- Step 2c: Drop old type and rename new
DROP TYPE job_status;
ALTER TYPE job_status_new RENAME TO job_status;

-- ============================================================================
-- 3. Recreate affected indexes with updated values
-- ============================================================================

CREATE INDEX idx_jobs_failed ON jobs(status, created_at DESC)
    WHERE status IN ('failed', 'dead_letter');
