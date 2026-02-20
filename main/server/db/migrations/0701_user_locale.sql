-- 0701_user_locale.sql
--
-- Sprint 6.7: Document and constrain the users.language column as a locale preference
--
-- The `language` column already exists on the `users` table (0000_users.sql, line 56)
-- as a nullable TEXT field. This migration adds:
--
-- 1. A DEFAULT value of 'en-US' for new rows
-- 2. A CHECK constraint limiting values to supported BCP 47 locale tags
-- 3. An index on language for potential locale-based queries
--
-- Supported locales: en-US, es, fr, de, ja, zh-CN
--
-- The column is intentionally kept as `language` (not renamed to `locale`)
-- to avoid breaking existing queries and ORM mappings.
--
-- Depends on: 0000_users.sql

-- ============================================================================
-- Add DEFAULT and CHECK constraint
-- ============================================================================

-- Set a default for future inserts
ALTER TABLE users
    ALTER COLUMN language SET DEFAULT 'en-US';

-- Add CHECK constraint for supported locales (NULL is still allowed for
-- users who have not explicitly chosen a language)
ALTER TABLE users
    ADD CONSTRAINT chk_users_language_supported
    CHECK (language IS NULL OR language IN ('en-US', 'es', 'fr', 'de', 'ja', 'zh-CN'));

-- ============================================================================
-- Index for locale-based queries
-- ============================================================================

-- Partial index on non-null language values for locale-based filtering
CREATE INDEX idx_users_language
    ON users(language)
    WHERE language IS NOT NULL;

-- ============================================================================
-- Backfill existing NULL rows (optional — uncomment if desired)
-- ============================================================================

-- UPDATE users SET language = 'en-US' WHERE language IS NULL;
