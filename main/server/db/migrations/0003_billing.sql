-- packages/db/migrations/0003_billing.sql
--
-- Billing: plans, subscriptions, customer_mappings, invoices, payment_methods, billing_events
-- Depends on: 0000_init.sql (users table)
-- Matches packages/db/src/schema/billing.ts exactly

-- ============================================================================
-- 1. Enums
-- ============================================================================

CREATE TYPE billing_provider AS ENUM ('stripe', 'paypal');
CREATE TYPE plan_interval AS ENUM ('month', 'year');
CREATE TYPE subscription_status AS ENUM (
    'active', 'canceled', 'incomplete', 'incomplete_expired',
    'past_due', 'paused', 'trialing', 'unpaid'
);
CREATE TYPE invoice_status AS ENUM ('draft', 'open', 'paid', 'void', 'uncollectible');
CREATE TYPE payment_method_type AS ENUM ('card', 'bank_account', 'paypal');

-- ============================================================================
-- 2. Plans (Pricing Tiers)
-- ============================================================================

CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    interval plan_interval NOT NULL,
    price_in_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'usd',
    features JSONB NOT NULL DEFAULT '[]',
    trial_days INTEGER NOT NULL DEFAULT 0,
    stripe_price_id TEXT,
    stripe_product_id TEXT,
    paypal_plan_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT plans_price_positive CHECK (price_in_cents >= 0),
    CONSTRAINT plans_trial_positive CHECK (trial_days >= 0),
    CONSTRAINT plans_currency_length CHECK (char_length(currency) BETWEEN 3 AND 3)
);

CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON plans
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 3. Subscriptions
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    provider billing_provider NOT NULL,
    provider_subscription_id TEXT NOT NULL,
    provider_customer_id TEXT NOT NULL,
    status subscription_status NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT subscriptions_period_order CHECK (current_period_end > current_period_start)
);

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 4. Customer Mappings (User ID <-> Provider Customer ID)
-- ============================================================================

CREATE TABLE IF NOT EXISTS customer_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider billing_provider NOT NULL,
    provider_customer_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One mapping per user per provider
    CONSTRAINT customer_mappings_user_provider UNIQUE (user_id, provider)
);

-- ============================================================================
-- 5. Invoices
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    provider billing_provider NOT NULL,
    provider_invoice_id TEXT NOT NULL,
    status invoice_status NOT NULL DEFAULT 'draft',
    amount_due INTEGER NOT NULL DEFAULT 0,
    amount_paid INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'usd',
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    invoice_pdf_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT invoices_amount_due_positive CHECK (amount_due >= 0),
    CONSTRAINT invoices_amount_paid_positive CHECK (amount_paid >= 0),
    CONSTRAINT invoices_period_order CHECK (period_end > period_start)
);

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 6. Payment Methods
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider billing_provider NOT NULL,
    provider_payment_method_id TEXT NOT NULL,
    type payment_method_type NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    card_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_payment_methods_updated_at
    BEFORE UPDATE ON payment_methods
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ============================================================================
-- 7. Billing Events (Webhook Idempotency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS billing_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider billing_provider NOT NULL,
    provider_event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Idempotency: one event per provider per event ID
    CONSTRAINT billing_events_idempotency UNIQUE (provider, provider_event_id)
);

-- ============================================================================
-- 8. Indexes
-- ============================================================================

-- Plans
CREATE INDEX idx_plans_active ON plans(is_active, sort_order) WHERE is_active = TRUE;
CREATE INDEX idx_plans_stripe ON plans(stripe_price_id) WHERE stripe_price_id IS NOT NULL;

-- Subscriptions
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(user_id, status);
CREATE INDEX idx_subscriptions_provider ON subscriptions(provider, provider_subscription_id);
CREATE INDEX idx_subscriptions_period ON subscriptions(current_period_end);

-- Customer Mappings
CREATE INDEX idx_customer_mappings_user ON customer_mappings(user_id);
CREATE INDEX idx_customer_mappings_provider ON customer_mappings(provider, provider_customer_id);

-- Invoices
CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(user_id, status);
CREATE INDEX idx_invoices_provider ON invoices(provider, provider_invoice_id);

-- Payment Methods
CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX idx_payment_methods_default ON payment_methods(user_id, is_default)
    WHERE is_default = TRUE;

-- Billing Events
CREATE INDEX idx_billing_events_provider ON billing_events(provider, provider_event_id);
CREATE INDEX idx_billing_events_type ON billing_events(event_type, created_at DESC);
