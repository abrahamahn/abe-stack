-- 0200_billing.sql
--
-- Billing: Plans, Subscriptions, Payments & Events
--
-- Depends on: 0000_users.sql

-- ============================================================================
-- Enums
-- ============================================================================

CREATE TYPE billing_provider    AS ENUM ('stripe', 'paypal');
CREATE TYPE plan_interval       AS ENUM ('month', 'year', 'lifetime');
CREATE TYPE subscription_status AS ENUM (
    'active', 'trialing', 'past_due', 'canceled', 'unpaid',
    'incomplete', 'incomplete_expired', 'paused'
);
CREATE TYPE invoice_status      AS ENUM ('draft', 'open', 'paid', 'uncollectible', 'void');
CREATE TYPE payment_method_type AS ENUM ('card', 'bank_transfer', 'paypal', 'crypto', 'other');

-- ============================================================================
-- Plans (product catalogue)
-- ============================================================================

CREATE TABLE IF NOT EXISTS plans (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    description       TEXT,
    interval          plan_interval NOT NULL,
    price_in_cents    INTEGER NOT NULL CHECK (price_in_cents >= 0),
    currency          TEXT NOT NULL DEFAULT 'usd',
    features          JSONB NOT NULL DEFAULT '[]',
    trial_days        INTEGER NOT NULL DEFAULT 0,
    stripe_price_id   TEXT,
    stripe_product_id TEXT,
    paypal_plan_id    TEXT,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order        INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- Subscriptions
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id                  TEXT NOT NULL REFERENCES plans(id),
    provider                 billing_provider NOT NULL,
    provider_subscription_id TEXT NOT NULL,
    provider_customer_id     TEXT NOT NULL,
    status                   subscription_status NOT NULL,
    current_period_start     TIMESTAMPTZ NOT NULL,
    current_period_end       TIMESTAMPTZ NOT NULL CHECK (current_period_end > current_period_start),
    cancel_at_period_end     BOOLEAN NOT NULL DEFAULT FALSE,
    canceled_at              TIMESTAMPTZ,
    trial_end                TIMESTAMPTZ,
    metadata                 JSONB NOT NULL DEFAULT '{}',
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- Customer Mappings (user ↔ billing provider customer ID)
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_mappings (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider             billing_provider NOT NULL,
    provider_customer_id TEXT NOT NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, provider)
);

-- ============================================================================
-- Invoices
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id     UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    provider            billing_provider NOT NULL,
    provider_invoice_id TEXT NOT NULL,
    status              invoice_status NOT NULL,
    amount_due          INTEGER NOT NULL CHECK (amount_due >= 0),
    amount_paid         INTEGER NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),

    CONSTRAINT invoices_paid_lte_due CHECK (amount_paid <= amount_due),
    currency            TEXT NOT NULL DEFAULT 'usd',
    period_start        TIMESTAMPTZ NOT NULL,
    period_end          TIMESTAMPTZ NOT NULL,
    paid_at             TIMESTAMPTZ,
    invoice_pdf_url     TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- Payment Methods
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_methods (
    id                         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider                   billing_provider NOT NULL,
    provider_payment_method_id TEXT NOT NULL,
    type                       payment_method_type NOT NULL,
    is_default                 BOOLEAN NOT NULL DEFAULT FALSE,
    card_details               JSONB,
    created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- Billing Events (idempotent webhook ingestion log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS billing_events (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider          billing_provider NOT NULL,
    provider_event_id TEXT NOT NULL,
    event_type        TEXT NOT NULL,
    payload           JSONB NOT NULL,
    processed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (provider, provider_event_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX idx_subscriptions_user     ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status   ON subscriptions(status);
CREATE INDEX idx_subscriptions_plan     ON subscriptions(plan_id);

CREATE INDEX idx_customer_mappings_user ON customer_mappings(user_id);

CREATE INDEX idx_invoices_user          ON invoices(user_id);
CREATE INDEX idx_invoices_subscription  ON invoices(subscription_id);

CREATE INDEX idx_payment_methods_user   ON payment_methods(user_id);

CREATE INDEX idx_billing_events_provider ON billing_events(provider, provider_event_id);

-- listActive() query: is_active + ordering by sort_order
CREATE INDEX idx_plans_active_sorted
    ON plans(sort_order) WHERE is_active = TRUE;

-- hot-path: findActiveByUserId(), findExpiringSoon() — composite covers both
CREATE INDEX idx_subscriptions_user_status_period
    ON subscriptions(user_id, status, current_period_end DESC);

-- trial-expiry hourly task: findExpiredTrials()
CREATE INDEX idx_subscriptions_trial_expiry
    ON subscriptions(trial_end) WHERE status = 'trialing' AND trial_end IS NOT NULL;

-- countActiveByPlanId() admin query
CREATE INDEX idx_subscriptions_plan_status
    ON subscriptions(plan_id, status);

-- user invoice list: findByUserId() and list() with status filter
CREATE INDEX idx_invoices_user_status
    ON invoices(user_id, status, created_at DESC);

-- findDefaultByUserId(): hot path, hit on every request that touches payment
CREATE INDEX idx_payment_methods_user_default
    ON payment_methods(user_id) WHERE is_default = TRUE;

-- webhook type queries: listByType() in billing-events repo
CREATE INDEX idx_billing_events_type
    ON billing_events(event_type, created_at DESC);
