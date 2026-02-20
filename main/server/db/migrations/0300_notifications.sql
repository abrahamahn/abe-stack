-- 0300_notifications.sql
--
-- Notifications: in-app, push subscriptions, preferences
--
-- Depends on: 0000_users.sql

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');

-- ============================================================================
-- Notifications (In-App)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       notification_type NOT NULL DEFAULT 'info',
    title      TEXT NOT NULL,
    message    TEXT NOT NULL,
    data       JSONB,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Push Subscriptions (Web Push Endpoints)
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint        TEXT NOT NULL,
    expiration_time TIMESTAMPTZ,
    keys_p256dh     TEXT NOT NULL,
    keys_auth       TEXT NOT NULL,
    device_id       TEXT NOT NULL,
    user_agent      TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Notification Preferences (Per-User Channel Settings)
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    global_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    quiet_hours    JSONB NOT NULL DEFAULT '{"enabled": false, "startHour": 22, "endHour": 8, "timezone": "UTC"}',
    types          JSONB NOT NULL DEFAULT '{
        "system": {"enabled": true, "channels": ["push", "email", "in_app"]},
        "security": {"enabled": true, "channels": ["push", "email", "in_app"]},
        "marketing": {"enabled": false, "channels": ["email"]},
        "social": {"enabled": true, "channels": ["push", "in_app"]},
        "transactional": {"enabled": true, "channels": ["push", "email", "in_app"]}
    }',
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_notifications_user   ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read, created_at DESC)
    WHERE is_read = FALSE;
CREATE INDEX idx_notifications_type   ON notifications(user_id, type);

CREATE INDEX idx_push_subscriptions_user   ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_active ON push_subscriptions(user_id, is_active)
    WHERE is_active = TRUE;
CREATE INDEX idx_push_subscriptions_device ON push_subscriptions(user_id, device_id);
