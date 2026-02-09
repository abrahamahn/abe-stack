-- packages/db/migrations/0017_user_profile_extended.sql
--
-- User Profile Extended: additional profile fields
-- Adds optional location, bio, language, and website columns.
-- Depends on: 0012_user_profile.sql (users profile expansion)

-- ============================================================================
-- 1. Add Profile Columns
-- ============================================================================

-- Location fields: city, state, country (all optional)
ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT;

-- About fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS website TEXT;
