# Environment Variables

This document explains every environment variable used by the server config. Use `.config/env/.env.production.example` as the canonical template and copy it to `.config/env/.env.development`, `.config/env/.env.test`, or `.config/env/.env.production`.

Notes:

- All values are strings in env files.
- Set only the switches you need; unused integrations can stay at their defaults.
- For production, generate strong secrets and keep them out of version control.

---

## Package Manager

Controls tooling behavior for scripts and CI.

- `PACKAGE_MANAGER_PROVIDER` — package manager to use.
- `NPM_AUDIT`, `NPM_LEGACY_PEER_DEPS`, `NPM_REGISTRY`
- `PNPM_STRICT_PEER_DEPS`, `PNPM_FROZEN_LOCKFILE`, `PNPM_REGISTRY`
- `YARN_AUDIT`, `YARN_FROZEN_LOCKFILE`, `YARN_REGISTRY`

---

## Application

Core runtime settings and URLs.

- `NODE_ENV` — environment: development/production/test.
- `APP_PORT` — web app port.
- `API_PORT` — API server port.
- `APP_BASE_URL` — web app base URL.
- `API_BASE_URL` — API base URL.
- `APP_URL` — public app URL (used by billing/email).
- `HOST` — server bind host (e.g., `0.0.0.0`).
- `PORT` — optional single-port override.
- `LOG_LEVEL` — logger level.
- `MAINTENANCE_MODE` — boolean maintenance toggle.

---

## CORS / Proxy

Controls proxy behavior and origin rules.

- `CORS_ORIGIN` — comma-separated list of allowed origins.
- `TRUST_PROXY` — whether to trust `x-forwarded-*` headers.
- `TRUSTED_PROXIES` — comma-separated CIDRs/IPs for trusted proxies.
- `MAX_PROXY_DEPTH` — max forwarded-for depth.

---

## Auth / Security

Authentication, tokens, and policies.

- `JWT_SECRET` — signing secret.
- `JWT_SECRET_PREVIOUS` — previous secret for rotation.
- `JWT_ISSUER`, `JWT_AUDIENCE`
- `ACCESS_TOKEN_EXPIRY` — e.g., `15m`.
- `REFRESH_TOKEN_EXPIRY_DAYS`
- `REFRESH_TOKEN_GRACE_PERIOD` — seconds.
- `COOKIE_SECRET` — cookie signing secret (defaults to JWT secret if blank).
- `SESSION_SECRET`
- `AUTH_BFF_MODE` — boolean toggle.
- `AUTH_STRATEGIES` — comma-separated list (e.g., `local,oauth`).
- `PASSWORD_MIN_LENGTH`, `PASSWORD_MAX_LENGTH`, `PASSWORD_MIN_SCORE`
- `LOCKOUT_MAX_ATTEMPTS`, `LOCKOUT_DURATION_MS`
- `MAGIC_LINK_EXPIRY_MINUTES`, `MAGIC_LINK_MAX_ATTEMPTS`
- `TOTP_ISSUER`, `TOTP_WINDOW`

---

## Rate Limiting

HTTP rate limiting controls.

- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `RATE_LIMIT_CLEANUP_INTERVAL_MS`
- `RATE_LIMIT_PROGRESSIVE_DELAY_ENABLED`
- `RATE_LIMIT_BASE_DELAY_MS`
- `RATE_LIMIT_MAX_DELAY_MS`

---

## Provider Switches

Select which provider is active per subsystem.

- `DATABASE_PROVIDER` — `postgresql | sqlite | mongodb | json`
- `STORAGE_PROVIDER` — `local | s3`
- `QUEUE_PROVIDER` — `local | redis`
- `CACHE_PROVIDER` — `local | redis`
- `SEARCH_PROVIDER` — `sql | elasticsearch`
- `EMAIL_PROVIDER` — `console | smtp | api`
- `BILLING_PROVIDER` — `stripe | paypal`
- `NOTIFICATIONS_PROVIDER` — `onesignal | fcm | courier`

---

## Database

Primary datastore configuration.

- `DATABASE_URL` — full connection string (takes precedence when applicable).
- `POSTGRES_CONNECTION_STRING`
- `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- `DB_MAX_CONNECTIONS`
- `DB_SSL`

MongoDB:

- `MONGODB_CONNECTION_STRING`
- `MONGODB_DATABASE`, `MONGODB_DB`
- `MONGODB_SSL`
- `MONGODB_CONNECT_TIMEOUT_MS`, `MONGODB_SOCKET_TIMEOUT_MS`
- `MONGODB_USE_UNIFIED_TOPOLOGY`

SQLite:

- `SQLITE_FILE_PATH`
- `SQLITE_WAL_MODE`
- `SQLITE_FOREIGN_KEYS`
- `SQLITE_TIMEOUT_MS`

JSON DB:

- `JSON_DB_PATH`
- `JSON_DB_PERSIST_ON_WRITE`

---

## Cache / Redis

In-memory cache or Redis.

- `CACHE_PROVIDER` — `local | redis` (preferred switch)
- `CACHE_USE_REDIS`
- `CACHE_TTL_MS`
- `CACHE_MAX_SIZE`
- `REDIS_HOST`, `REDIS_PORT`

---

## Queue

Background job processing.

- `QUEUE_PROVIDER`
- `QUEUE_POLL_INTERVAL_MS`
- `QUEUE_CONCURRENCY`
- `QUEUE_MAX_ATTEMPTS`
- `QUEUE_BACKOFF_BASE_MS`
- `QUEUE_MAX_BACKOFF_MS`

---

## Storage

File storage configuration.

- `STORAGE_ROOT_PATH` — local path for uploads.
- `STORAGE_PUBLIC_BASE_URL` — public URL for files.

S3:

- `S3_BUCKET`
- `S3_REGION`
- `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
- `S3_ENDPOINT`
- `S3_FORCE_PATH_STYLE`
- `S3_PRESIGN_EXPIRES_IN_SECONDS`

---

## Email

Email providers and SMTP.

- `EMAIL_API_KEY` — for API-based providers.
- `EMAIL_FROM_NAME`, `EMAIL_FROM_ADDRESS`
- `EMAIL_REPLY_TO`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`
- `SMTP_USER`, `SMTP_PASS`
- `SMTP_CONNECTION_TIMEOUT`, `SMTP_SOCKET_TIMEOUT`

---

## OAuth Providers

OAuth credentials and callback URLs.

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`
- `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`, `FACEBOOK_CALLBACK_URL`
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_CALLBACK_URL`, `MICROSOFT_TENANT_ID`
- `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_PRIVATE_KEY_BASE64`, `APPLE_CALLBACK_URL`

---

## Notifications

Push/email notifications.

- `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`, `ONESIGNAL_USER_AUTH_KEY`, `ONESIGNAL_ENABLE_LOGGING`
- `FCM_PROJECT_ID`, `FCM_CREDENTIALS`
- `COURIER_API_KEY`, `COURIER_API_URL`, `COURIER_ENABLE_LOGGING`

---

## Billing

Subscription and payment providers.

- `BILLING_CURRENCY`
- `BILLING_PORTAL_RETURN_URL`
- `BILLING_CHECKOUT_SUCCESS_URL`
- `BILLING_CHECKOUT_CANCEL_URL`
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, `PAYPAL_WEBHOOK_ID`
- `PLAN_FREE_ID`, `PLAN_PRO_ID`, `PLAN_ENTERPRISE_ID`

---

## Search

Search provider config.

- `ELASTICSEARCH_NODE`, `ELASTICSEARCH_INDEX`
- `ELASTICSEARCH_USERNAME`, `ELASTICSEARCH_PASSWORD`, `ELASTICSEARCH_API_KEY`
- `ELASTICSEARCH_TLS`, `ELASTICSEARCH_REQUEST_TIMEOUT_MS`
- `SQL_SEARCH_DEFAULT_PAGE_SIZE`
- `SQL_SEARCH_MAX_PAGE_SIZE`
- `SQL_SEARCH_MAX_QUERY_DEPTH`
- `SQL_SEARCH_MAX_CONDITIONS`
- `SQL_SEARCH_LOGGING`
- `SQL_SEARCH_TIMEOUT_MS`

---

## Frontend (Vite)

Client-side build/runtime config.

- `VITE_API_URL`
- `VITE_APP_NAME`
