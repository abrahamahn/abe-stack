# Deployment Profiles

ABE Stack supports four deployment profiles, from a lightweight starter to a full-featured SaaS platform. Each profile is configured entirely through environment variables — no code changes required.

## Profile Summary

| Profile | Use Case | Packages Active | Approx. Services |
|---------|----------|-----------------|------------------|
| **Minimal** | MVP, prototyping, learning | core + auth + db + email(console) | 6 |
| **SaaS** | Paid product with subscriptions | Minimal + billing + admin | 8 |
| **Admin** | Internal tools, back-office | Minimal + admin | 7 |
| **Advanced** | Real-time apps, mobile, scale | SaaS + realtime + push + elasticsearch + redis | 12 |

## Minimal Profile (Default)

The smallest deployable configuration. Suitable for MVPs, internal tools, and learning the stack.

**Includes:**
- Web app + API server
- PostgreSQL database
- Auth (local email/password, magic link)
- User management (profiles, avatars, sessions)
- Console email (logs to stdout in dev, SMTP in production)
- Local file storage
- In-memory cache
- Local job queue
- SQL-based search

**Excludes:**
- Billing/subscriptions
- Admin dashboard
- Real-time/WebSocket
- Push notifications
- Elasticsearch
- Redis
- Desktop app

### Environment Variables

```bash
# Required
NODE_ENV=development
JWT_SECRET=your-secret-key-min-32-chars-long

# Database (defaults to local PostgreSQL)
DATABASE_PROVIDER=postgresql
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=abe_stack
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres

# Disable optional features
ENABLE_ADMIN=false
ENABLE_REALTIME=false
BILLING_ENABLED=false
```

All other env vars use sensible defaults (console email, local storage, memory cache, local queue, SQL search).

---

## SaaS Profile

For products that charge customers. Adds Stripe/PayPal billing with subscription management and an admin dashboard for customer oversight.

**Adds to Minimal:**
- Stripe or PayPal billing provider
- Subscription management (plans, invoices, payment methods)
- Admin dashboard (user management, billing overview, security events)
- Webhook handling for payment events

### Environment Variables

```bash
# Everything from Minimal, plus:

# Enable billing
BILLING_ENABLED=true
BILLING_PROVIDER=stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
BILLING_SUCCESS_URL=http://localhost:5173/billing/success
BILLING_CANCEL_URL=http://localhost:5173/billing/cancel
BILLING_PORTAL_URL=http://localhost:5173/billing

# Enable admin dashboard
ENABLE_ADMIN=true
```

---

## Admin Profile

For internal tools and back-office applications that need user management and monitoring but no billing.

**Adds to Minimal:**
- Admin dashboard (user management, security events, job monitoring)
- User lock/unlock, role management

### Environment Variables

```bash
# Everything from Minimal, plus:
ENABLE_ADMIN=true
```

---

## Advanced Profile

Full-featured deployment for real-time applications, mobile apps, and production scale.

**Adds to SaaS:**
- WebSocket real-time sync (CRDT-based)
- Push notifications (FCM, OneSignal, or other providers)
- Elasticsearch for advanced search
- Redis for cache and job queue
- Desktop app (Electron)

### Environment Variables

```bash
# Everything from SaaS, plus:

# Real-time
ENABLE_REALTIME=true

# Push notifications
NOTIFICATIONS_PROVIDER=fcm
FCM_PROJECT_ID=your-project
FCM_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# Elasticsearch
SEARCH_PROVIDER=elasticsearch
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_INDEX_PREFIX=abe_

# Redis (for cache + queue)
CACHE_USE_REDIS=true
REDIS_URL=redis://localhost:6379
QUEUE_PROVIDER=redis

# Production email
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-api-key

# Production storage
STORAGE_PROVIDER=s3
S3_BUCKET=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=...
```

---

## Feature Flag Reference

| Flag | Default | Controls |
|------|---------|----------|
| `BILLING_ENABLED` | `false` | Billing provider, billing routes, webhook handler |
| `ENABLE_ADMIN` | `true` | Admin dashboard routes (user mgmt, security, jobs) |
| `ENABLE_REALTIME` | `true` | WebSocket server, CRDT sync, pub/sub |
| `NOTIFICATIONS_PROVIDER` | (none) | Push notification provider (FCM, OneSignal, etc.) |
| `SEARCH_PROVIDER` | `sql` | Search backend (`sql` or `elasticsearch`) |
| `CACHE_USE_REDIS` | `false` | Redis vs. in-memory cache |
| `QUEUE_PROVIDER` | `local` | Redis vs. in-memory job queue |
| `STORAGE_PROVIDER` | `local` | S3 vs. local file storage |
| `EMAIL_PROVIDER` | `console` | SMTP vs. console logging |

### How Flags Work

Feature flags **remove runtime wiring**, not just config values:

- **Disabled billing:** No Stripe/PayPal SDK loaded, no billing routes registered, webhook endpoint returns 404
- **Disabled admin:** No admin routes registered, admin UI bundle excluded
- **Disabled realtime:** No WebSocket upgrade handler, no pub/sub connection, no CRDT sync
- **Disabled notifications:** No push provider instantiated, notification routes return no-ops

Services that depend on disabled features gracefully degrade — they remain on the `IServiceContainer` as no-op implementations to avoid null checks throughout the codebase.

---

## Tier 3 Cross-Dependencies

Module dependencies are intentional and follow the product tier model:

```
auth, billing, realtime, notifications  → No Tier 3 deps (base modules)
users                                   → depends on auth (mid-layer)
admin                                   → depends on auth + billing (orchestration)
```

**Why admin depends on billing:** The admin dashboard includes subscription management (view/modify plans, handle refunds). If billing is disabled, admin billing views show "Billing not enabled" rather than crashing.

**Why users depends on auth:** User profiles, sessions, and avatar management are tightly coupled to authentication. This is an intentional bundled dependency — you cannot have users without auth.

This coupling is by design for the product tier model (Standard/Pro licensing). Modules are physically separate packages so license tiers can include/exclude directories.
