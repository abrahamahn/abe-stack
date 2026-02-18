-- 0400_jobs.sql
--
-- Jobs: Postgres-backed async queue
--
-- Depends on: (none — standalone system table)

-- ============================================================================
-- Enums
-- ============================================================================

-- Final values: dead_letter replaces the old 'dead'; cancelled added.
CREATE TYPE job_status AS ENUM (
    'pending', 'processing', 'completed', 'failed', 'dead_letter', 'cancelled'
);

-- ============================================================================
-- Jobs (Postgres-Backed Queue)
-- ============================================================================

CREATE TABLE IF NOT EXISTS jobs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type            TEXT NOT NULL,
    payload         JSONB NOT NULL DEFAULT '{}',
    status          job_status NOT NULL DEFAULT 'pending',
    priority        INTEGER NOT NULL DEFAULT 0,
    attempts        INTEGER NOT NULL DEFAULT 0,
    max_attempts    INTEGER NOT NULL DEFAULT 3,
    last_error      TEXT,
    idempotency_key TEXT UNIQUE,
    scheduled_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT jobs_attempts_positive     CHECK (attempts >= 0),
    CONSTRAINT jobs_max_attempts_positive CHECK (max_attempts >= 1),
    CONSTRAINT jobs_priority_range        CHECK (priority BETWEEN -100 AND 100)
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_jobs_status      ON jobs(status, scheduled_at)
    WHERE status IN ('pending', 'processing');
CREATE INDEX idx_jobs_type        ON jobs(type, created_at DESC);
CREATE INDEX idx_jobs_scheduled   ON jobs(scheduled_at)
    WHERE status = 'pending';
CREATE INDEX idx_jobs_failed      ON jobs(status, created_at DESC)
    WHERE status IN ('failed', 'dead_letter');
CREATE INDEX idx_jobs_idempotency ON jobs(idempotency_key)
    WHERE idempotency_key IS NOT NULL;
