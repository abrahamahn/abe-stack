# Quickstart: Deployment Profiles

ABE Stack ships four deployment profiles. Each profile is a preset of environment variables — no code changes required. Pick the profile that matches your use case and copy the env block.

**New here?** Start with [Minimal](#minimal-profile). You can upgrade to any other profile later by changing env vars.

For full profile documentation, see [`apps/docs/profiles.md`](../profiles.md).

---

## Prerequisites

All profiles share the same prerequisites:

| Tool       | Version | Check            |
| ---------- | ------- | ---------------- |
| Node.js    | 20+     | `node --version` |
| pnpm       | 10+     | `pnpm --version` |
| PostgreSQL | 14+     | `pg_isready`     |

```bash
git clone https://github.com/abrahamahn/abe-stack.git
cd abe-stack
pnpm install
createdb abe_stack_dev
```

---

## Minimal Profile

The lightest configuration. Auth + database + local providers. No billing, no admin dashboard, no real-time sync.

**Good for:** MVPs, prototypes, internal tools, learning the stack.

### 1. Configure environment

```bash
cp .config/env/.env.development.example .config/env/.env.development
```

Add these overrides to `.config/env/.env.local` (or edit `.env.development`):

```bash
# Minimal Profile
ENABLE_ADMIN=false
ENABLE_REALTIME=false
BILLING_ENABLED=false
```

All other settings use sensible defaults: console email, local storage, in-memory cache, SQL search, local job queue.

### 2. Initialize and run

```bash
pnpm db:bootstrap
pnpm dev
```

| Service    | URL                   |
| ---------- | --------------------- |
| Web app    | http://localhost:5173 |
| API server | http://localhost:8080 |

### 3. Verify

1. Open http://localhost:5173 and register an account
2. Check terminal output for the verification email (console provider)
3. Log in — you have a working auth system

### What's running

- **Routes:** auth, users, notifications, health/system
- **Services:** PostgreSQL, console email, local storage, in-memory cache, local queue, SQL search
- **Not running:** admin dashboard, billing, real-time WebSocket, push notifications

### Upgrade path

Enable features one at a time by adding env vars:

```bash
# Add admin dashboard
ENABLE_ADMIN=true

# Add billing (requires Stripe or PayPal credentials)
BILLING_ENABLED=true
BILLING_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## SaaS Profile

For products that charge customers. Adds Stripe/PayPal billing with subscription management and admin oversight.

**Good for:** SaaS products, subscription services, paid tools.

### 1. Set up Stripe (test mode)

1. Create a [Stripe account](https://dashboard.stripe.com/register)
2. Go to **Developers → API keys** and copy your test keys
3. Set up a webhook endpoint pointing to `http://localhost:8080/api/billing/webhooks/stripe` and copy the webhook secret

### 2. Configure environment

```bash
cp .config/env/.env.development.example .config/env/.env.development
```

Add to `.config/env/.env.local`:

```bash
# SaaS Profile
ENABLE_ADMIN=true
ENABLE_REALTIME=false
BILLING_ENABLED=true
BILLING_PROVIDER=stripe
BILLING_CURRENCY=usd

# Stripe credentials (test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Billing URLs
BILLING_CHECKOUT_SUCCESS_URL=http://localhost:5173/billing/success
BILLING_CHECKOUT_CANCEL_URL=http://localhost:5173/pricing
BILLING_PORTAL_RETURN_URL=http://localhost:5173/settings/billing
```

### 3. Initialize and run

```bash
pnpm db:bootstrap
pnpm dev
```

### 4. Verify

1. Register and log in
2. Navigate to the admin dashboard — user management and billing overview are available
3. Test checkout flow with [Stripe test cards](https://docs.stripe.com/testing#cards)

### What's running

Everything from Minimal, plus:

- **Routes:** admin (user management, security events, job monitoring), billing (checkout, subscriptions, invoices, payment methods, webhooks)
- **Services:** Stripe SDK, webhook handler

### PayPal alternative

Replace the Stripe block with:

```bash
BILLING_PROVIDER=paypal
PAYPAL_CLIENT_ID=your-client-id
PAYPAL_CLIENT_SECRET=your-client-secret
PAYPAL_MODE=sandbox
PAYPAL_WEBHOOK_ID=your-webhook-id
```

---

## Admin Profile

Internal tools and back-office applications. Admin dashboard for user management and monitoring, but no billing.

**Good for:** Internal tools, support dashboards, content management systems.

### 1. Configure environment

```bash
cp .config/env/.env.development.example .config/env/.env.development
```

Add to `.config/env/.env.local`:

```bash
# Admin Profile
ENABLE_ADMIN=true
ENABLE_REALTIME=false
BILLING_ENABLED=false
```

### 2. Initialize and run

```bash
pnpm db:bootstrap
pnpm dev
```

### 3. Verify

1. Register and log in
2. Navigate to the admin dashboard
3. User management (lock/unlock, role changes) and security event viewer are available

### What's running

Everything from Minimal, plus:

- **Routes:** admin (user management, security events, job monitoring)
- **Not running:** billing, real-time WebSocket

---

## Advanced Profile

Full-featured deployment with real-time sync, push notifications, and production-grade infrastructure.

**Good for:** Real-time apps, mobile backends, collaboration tools, production scale.

### 1. Start infrastructure services

You need Redis and (optionally) Elasticsearch in addition to PostgreSQL:

```bash
# Using Docker for Redis + Elasticsearch
docker run -d --name redis -p 6379:6379 redis:7-alpine
docker run -d --name elasticsearch -p 9200:9200 -e "discovery.type=single-node" -e "xpack.security.enabled=false" elasticsearch:8.12.0
```

Or use the dev Docker Compose:

```bash
docker compose -f ops/docker/development/docker-compose.dev.yml up -d
```

### 2. Configure environment

```bash
cp .config/env/.env.development.example .config/env/.env.development
```

Add to `.config/env/.env.local`:

```bash
# Advanced Profile — everything enabled
ENABLE_ADMIN=true
ENABLE_REALTIME=true
BILLING_ENABLED=true

# Billing (Stripe)
BILLING_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
BILLING_CHECKOUT_SUCCESS_URL=http://localhost:5173/billing/success
BILLING_CHECKOUT_CANCEL_URL=http://localhost:5173/pricing
BILLING_PORTAL_RETURN_URL=http://localhost:5173/settings/billing

# Redis (cache + queue)
CACHE_PROVIDER=redis
CACHE_USE_REDIS=true
REDIS_HOST=localhost
REDIS_PORT=6379
QUEUE_PROVIDER=redis

# Elasticsearch (optional — falls back to SQL search)
SEARCH_PROVIDER=elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX_PREFIX=abe_

# Email (SMTP for testing — use Mailhog, Mailtrap, etc.)
EMAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025

# Push notifications (optional — requires FCM project)
# NOTIFICATIONS_PROVIDER=fcm
# FCM_PROJECT_ID=your-project
# FCM_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

### 3. Initialize and run

```bash
pnpm db:bootstrap
pnpm dev
```

### 4. Verify

1. Register and log in
2. Check `GET http://localhost:8080/api/system/status` — all services should show `up`
3. WebSocket connects at `ws://localhost:8080/ws`
4. Admin dashboard, billing, and real-time sync are all active

### What's running

Everything from SaaS, plus:

- **Routes:** realtime (CRDT sync, record operations)
- **Services:** WebSocket server, Redis cache, Redis queue, Elasticsearch, pub/sub (PostgreSQL LISTEN/NOTIFY)

---

## Profile Comparison

| Feature               | Minimal | Admin  | SaaS            | Advanced                      |
| --------------------- | ------- | ------ | --------------- | ----------------------------- |
| Auth (local/OAuth)    | Yes     | Yes    | Yes             | Yes                           |
| User management       | Yes     | Yes    | Yes             | Yes                           |
| Admin dashboard       | No      | Yes    | Yes             | Yes                           |
| Billing/subscriptions | No      | No     | Yes             | Yes                           |
| Real-time WebSocket   | No      | No     | No              | Yes                           |
| Push notifications    | No      | No     | No              | Optional                      |
| Elasticsearch         | No      | No     | No              | Optional                      |
| Redis                 | No      | No     | No              | Yes                           |
| External services     | 1 (PG)  | 1 (PG) | 2 (PG + Stripe) | 4+ (PG + Stripe + Redis + ES) |

---

## Production Deployment

When deploying any profile to production, you must additionally configure:

1. **SSL for PostgreSQL:** `DB_SSL=true` (enforced by config validation in production)
2. **Real email provider:** `EMAIL_PROVIDER=smtp` (console is blocked in production)
3. **Secure secrets:** Generate with `openssl rand -base64 32` for `JWT_SECRET`, `SESSION_SECRET`, `COOKIE_SECRET`
4. **CORS and proxy:** `CORS_ORIGIN=https://yourdomain.com`, `TRUST_PROXY=true`

See:

- [Secrets Checklist](../deploy/secrets-checklist.md)
- [Operations Manual](../OPERATIONS.md)
- [Production Postgres](../deploy/production-postgres.md)
- [DigitalOcean Guide](../deploy/digitalocean.md) / [GCP Guide](../deploy/gcp.md)
