-- packages/db/migrations/0019_user_sessions_device_fields.sql
--
-- Add device labeling fields to user_sessions for session UX.
-- Depends on: 0002_sessions.sql

ALTER TABLE user_sessions
    ADD COLUMN IF NOT EXISTS device_name TEXT,
    ADD COLUMN IF NOT EXISTS device_type TEXT;
