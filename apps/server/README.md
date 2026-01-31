# ABE Stack Server

> Hexagonal architecture that doesn't get in your way.

Fastify 5.x backend with PostgreSQL and Drizzle ORM. Business logic in the center, infrastructure on the edges. Modules don't know they're running on Fastify. Infrastructure doesn't know what business problem it's solving. When you want to swap S3 for Cloudflare R2, you change one file.

## Features

- hexagonal architecture 🔷
- cookie-based auth with token rotation 🍪
- Argon2id password hashing 🔐
- real-time pub/sub (Postgres NOTIFY) ⚡
- background job queue 📋
- rate limiting (token bucket) 🚦
- CSRF protection 🛡️
- audit logging 📝
- health checks ❤️
- 133 test files ✅

## Getting Started

```sh
# from monorepo root
pnpm dev

# standalone
pnpm --filter @abe-stack/server dev

# with database
docker compose up -d postgres
pnpm --filter @abe-stack/server db:push
pnpm --filter @abe-stack/server dev
```

## Commands

```sh
pnpm --filter @abe-stack/server dev        # development (hot reload)
pnpm --filter @abe-stack/server build      # production build
pnpm --filter @abe-stack/server start      # run production build
pnpm --filter @abe-stack/server test       # run tests
pnpm --filter @abe-stack/server type-check # check types

# database
pnpm --filter @abe-stack/server db:push    # push schema to database
pnpm --filter @abe-stack/server db:studio  # open Drizzle Studio
pnpm --filter @abe-stack/server db:seed    # seed test data
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Entry: main.ts → app.ts → server.ts                        │
├─────────────────────────────────────────────────────────────┤
│  Config: Zod-validated environment configuration            │
├─────────────────────────────────────────────────────────────┤
│  Modules: auth, users, admin, notifications, realtime       │
│  (business logic - imports from infra, never reverse)       │
├─────────────────────────────────────────────────────────────┤
│  Infrastructure: database, email, storage, pubsub, cache,   │
│  websocket, http, security, rate-limit, queue, search,      │
│  media, notifications, monitor, permissions                 │
└─────────────────────────────────────────────────────────────┘
```

**The rule:** modules import from infrastructure, never the reverse.

## Infrastructure

### Database (`src/infrastructure/data/database/`)

Drizzle ORM with PostgreSQL. Connection pooling, transactions, optimistic locking.

```typescript
const user = await db.query.users.findFirst({ where: eq(users.email, email) });

await withTransaction(db, async (tx) => {
  await tx.insert(users).values({ email, passwordHash });
  await tx.insert(securityEvents).values({ type: 'user_created', userId });
});
```

**Schema tables:**

- Users: `users`, `refreshTokens`
- Auth: `refreshTokenFamilies`, `loginAttempts`, `passwordResetTokens`, `emailVerificationTokens`, `securityEvents`
- Magic Link: `magicLinkTokens`
- OAuth: `oauthConnections`
- Notifications: `pushSubscriptions`, `notificationPreferences`

### Email (`src/infrastructure/messaging/email/`)

Pluggable providers: `console` (dev), `smtp` (production).

```typescript
const email = createEmailService(config.email); // returns ConsoleEmailService or SmtpEmailService
await email.send({ to, subject, html: emailTemplates.passwordReset(url) });
```

### Storage (`src/infrastructure/data/storage/`)

Pluggable providers: `local` (filesystem), `s3` (AWS/compatible).

```typescript
const storage = createStorage(config.storage);
await storage.upload('avatars/user-123.png', buffer, 'image/png');
const url = await storage.getSignedUrl('avatars/user-123.png');
```

### PubSub (`src/infrastructure/messaging/pubsub/`)

Real-time subscriptions. In-memory for single server, Postgres NOTIFY for horizontal scaling.

```typescript
pubsub.subscribe('user:123', (version) => ws.send({ type: 'update', version }));
pubsub.publish('user:123', newVersion); // notifies all subscribers across servers
```

### Cache (`src/infrastructure/cache/`)

Pluggable providers: `memory` (single server), `redis` (distributed - ready but not implemented).

```typescript
const cache = createCache(config.cache);
await cache.set('session:abc', data, { ttl: 3600 });
const session = await cache.get('session:abc');
```

**Features:**

- LRU eviction with TTL support
- Memoization decorators (`@memoize`, `@memoizeMethod`)
- Cache statistics and monitoring

### Search (`src/infrastructure/search/`)

SQL-based search with filters, pagination, facets. Pluggable for future Elasticsearch/Meilisearch.

```typescript
const provider = createSqlSearchProvider(db, users, tableConfig);
const results = await provider.search({ filters: { role: 'admin' }, limit: 20 });
```

**Providers:**

- SQL: Full-text search with Postgres
- Elasticsearch: Stub implementation ready for future integration

### WebSocket (`@abe-stack/realtime`)

Authenticated WebSocket connections with CSRF protection. Provided by the `@abe-stack/realtime` package.

```typescript
registerWebSocket(server, ctx, { verifyToken }); // handles /ws endpoint
// clients connect with token in Sec-WebSocket-Protocol header
```

### Queue (`src/infrastructure/jobs/queue/`)

Background job processing with retry and exponential backoff.

```typescript
await queue.add('send-email', { to: email, template: 'welcome' });
// processed async with configurable retries
```

**Store implementations:**

- Memory: In-process queue for development
- Postgres: Persistent queue for production

**Scheduled jobs:**

- Login cleanup: Remove old login attempts
- Push subscription cleanup: Remove inactive subscriptions
- Magic link cleanup: Remove expired tokens
- OAuth token refresh: Refresh expiring OAuth tokens

### Rate Limiting (`src/infrastructure/security/rate-limit/`)

Token bucket algorithm. Per-endpoint configuration.

```typescript
const limiter = createRateLimiter({ maxTokens: 100, refillRate: 10 });
if (!limiter.consume(clientId)) throw new TooManyRequestsError();
```

### HTTP Middleware (`src/infrastructure/http/`)

Security headers, CORS, signed cookies, CSRF protection, static files.

```typescript
// Automatically applied via server.ts
// - Content-Security-Policy, X-Frame-Options, etc.
// - HMAC-SHA256 signed cookies
// - Double-submit CSRF tokens
// - Correlation ID tracking
// - Request logging
// - Proxy validation (X-Forwarded-For with CIDR support)
```

**Additional HTTP features:**

- **Router:** Generic route registration pattern (eliminates repetitive validation code)
- **Pagination:** Cursor-based and offset pagination middleware with helpers

### Permissions (`src/infrastructure/security/permissions/`)

Row-level access control for realtime features.

```typescript
const checker = createPermissionChecker({
  rules: [createOwnerRule('ownerId'), createMemberRule('members'), createAdminRule()],
});

const result = await checker.check(user, recordPointer, 'write', loadRecord);
if (!isAllowed(result)) throw new PermissionDeniedError();
```

**Features:**

- Ownership rules (user owns the record)
- Membership rules (user is in a list)
- Role rules (admin access)
- Custom rules (arbitrary logic)
- Batch record loading for efficiency

### Security (`src/infrastructure/security/crypto/`)

Native JWT implementation and token rotation.

```typescript
// Standard JWT
const token = jwtSign({ userId: '123' }, secret, { expiresIn: '15m' });
const payload = jwtVerify(token, secret);

// With rotation support
const handler = createJwtRotationHandler({ secrets: [newSecret, oldSecret] });
const token = signWithRotation(payload, handler);
const verified = verifyWithRotation(token, handler);
```

**Features:**

- Native HS256 implementation (no external library)
- Token rotation with grace period
- Family-based refresh token tracking
- Reuse detection for security

### Health Checks (`src/infrastructure/monitor/health/`)

Kubernetes-ready health endpoints with per-service status.

```
GET /health          → { status: 'ok' }
GET /health/ready    → { status: 'ready' }
GET /health/detailed → { database: 'up', schema: 'up', email: 'up', ... }
```

**Checks:**

- Database connectivity
- Database schema validation
- Email service availability
- Storage provider availability
- PubSub functionality
- Rate limiter functionality
- WebSocket availability

### Logger (`src/infrastructure/monitor/logger/`)

Structured logging with correlation IDs.

```typescript
const logger = createLogger({ level: 'info', pretty: true });
logger.info('User logged in', { userId: '123' });

// Request-specific logging
const requestLogger = createRequestLogger(req);
requestLogger.error('Failed to process', { error });
```

**Features:**

- Configurable log levels
- Correlation ID tracking across requests
- Pretty printing for development
- JSON output for production

### Media (`src/infrastructure/media/`)

Media processing infrastructure for images, audio, and video.

```typescript
const queue = createServerMediaQueue(storage, db);
await queue.processImage({ path: 'uploads/photo.jpg', operations: ['resize', 'optimize'] });
```

**Features:**

- Image processing (resize, crop, optimize)
- Audio processing (transcode, normalize)
- Video processing (transcode, thumbnail generation)
- Job queue with retry logic
- Security scanning and file type detection
- Streaming support for large files

### Notifications (`src/infrastructure/notifications/`)

Push notification infrastructure with Web Push and FCM providers.

```typescript
const service = createNotificationService({ provider: 'web-push', config: vapidConfig });
await service.send(subscriptions, { title: 'Hello', body: 'World' });
```

**Providers:**

- Web Push: VAPID-based browser notifications
- FCM: Firebase Cloud Messaging (stub implementation)

## Modules

### Auth (`src/modules/auth/`)

Complete authentication system with security best practices.

| Feature         | Implementation                           |
| --------------- | ---------------------------------------- |
| Registration    | Email verification flow                  |
| Login           | Argon2id + constant-time comparison      |
| Tokens          | JWT access (15m) + rotating refresh (7d) |
| Token Rotation  | Family-based tracking, reuse detection   |
| Account Lockout | Progressive delays after failed attempts |
| Password Reset  | Time-limited tokens, secure flow         |
| Magic Links     | Passwordless authentication              |
| OAuth           | Google, GitHub, Apple providers          |
| CSRF            | Signed double-submit cookies             |

**Endpoints:**

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/logout-all
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/set-password
POST   /api/auth/verify-email
POST   /api/auth/resend-verification

# Magic Link
POST   /api/auth/magic-link/request
POST   /api/auth/magic-link/verify

# OAuth (per provider: google, github, apple)
GET    /api/auth/oauth/:provider
GET    /api/auth/oauth/:provider/callback
POST   /api/auth/oauth/:provider/link
DELETE /api/auth/oauth/:provider/unlink
GET    /api/auth/oauth/connections
```

### Users (`src/modules/users/`)

User profile management.

```
GET  /api/users/me     # current user profile
GET  /api/users/list   # list users (admin, with cursor pagination)
```

### Admin (`src/modules/admin/`)

Administrative operations (role-protected).

```
POST /api/admin/auth/unlock    # unlock locked account
```

### Notifications (`src/modules/notifications/`)

Push notification subscriptions and preferences.

```
GET  /api/notifications/vapid-key          # get VAPID public key
POST /api/notifications/subscribe          # subscribe to push notifications
POST /api/notifications/unsubscribe        # unsubscribe from push notifications
GET  /api/notifications/preferences        # get notification preferences
PUT  /api/notifications/preferences/update # update notification preferences
POST /api/notifications/test               # send test notification
POST /api/notifications/send               # send notification (admin)
```

**Features:**

- Web Push subscription management
- Per-channel notification preferences (email, push, sms)
- Per-type preferences (security, marketing, updates)
- Quiet hours configuration
- Test notification support

### Realtime (`src/modules/realtime/`)

Optimistic UI with conflict-free writes.

```
POST /api/realtime/write       # write operations with version checking
POST /api/realtime/getRecords  # batch record retrieval
```

**Features:**

- Version-based optimistic locking
- Conflict detection and resolution
- Row-level permissions
- Batch operations
- Integration with PubSub for real-time updates

## Project Structure

```
apps/server/src/
├── main.ts                    # entry point
├── app.ts                     # DI container
├── server.ts                  # Fastify setup
├── config/                    # Zod-validated config
├── infrastructure/
│   ├── data/
│   │   ├── database/          # Drizzle + schemas
│   │   ├── storage/           # file storage
│   │   └── files/             # file helpers
│   ├── http/                  # middleware, router, pagination
│   ├── cache/                 # caching with LRU
│   ├── search/                # search providers
│   ├── jobs/                  # queue, scheduled jobs, write service
│   ├── security/              # crypto, rate-limit, permissions
│   ├── media/                 # media processing
│   ├── notifications/         # push notifications
│   └── monitor/               # health checks, logger
├── modules/
│   ├── auth/                  # authentication
│   ├── users/                 # user management
│   ├── admin/                 # admin operations
│   ├── notifications/         # notification management
│   └── realtime/              # realtime operations
└── shared/                    # errors, types, constants
```

## Configuration

Environment variables (validated with Zod):

```sh
# Required
DATABASE_URL=postgresql://user:pass@localhost:5432/abe_stack
JWT_SECRET=your-secret-key-min-32-chars

# Optional
PORT=8080
NODE_ENV=development
LOG_LEVEL=info

# Email
EMAIL_PROVIDER=console          # or smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASSWORD=pass
SMTP_FROM=noreply@example.com

# Storage
STORAGE_PROVIDER=local          # or s3
STORAGE_PATH=./uploads          # for local
S3_BUCKET=bucket                # for s3
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=key
S3_SECRET_ACCESS_KEY=secret

# Cache
CACHE_PROVIDER=memory           # or redis (ready, not implemented)
CACHE_MAX_SIZE=1000
CACHE_DEFAULT_TTL=3600

# OAuth (optional)
OAUTH_GOOGLE_ENABLED=false
OAUTH_GOOGLE_CLIENT_ID=...
OAUTH_GOOGLE_CLIENT_SECRET=...
OAUTH_GITHUB_ENABLED=false
OAUTH_GITHUB_CLIENT_ID=...
OAUTH_GITHUB_CLIENT_SECRET=...
OAUTH_APPLE_ENABLED=false
OAUTH_APPLE_CLIENT_ID=...
OAUTH_APPLE_TEAM_ID=...
OAUTH_APPLE_KEY_ID=...
OAUTH_APPLE_PRIVATE_KEY=...

# Push Notifications (optional)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@example.com
```

## Security

| Feature          | Implementation                      |
| ---------------- | ----------------------------------- |
| Password Hashing | Argon2id (OWASP parameters)         |
| JWT              | Native HS256, no external library   |
| Token Rotation   | Family tracking, reuse detection    |
| Account Lockout  | Progressive delays                  |
| Rate Limiting    | Token bucket per endpoint           |
| CSRF             | Signed double-submit cookies        |
| Headers          | CSP, X-Frame-Options, HSTS          |
| Permissions      | Row-level access control            |
| Audit Logging    | Security events tracked in database |

## Testing

133 test files covering:

- Unit tests for all infrastructure components
- Integration tests for auth flows
- Database transaction tests
- Rate limiting tests
- Permission system tests
- Media processing tests
- Notification tests

Run tests:

```sh
pnpm --filter @abe-stack/server test
pnpm --filter @abe-stack/server test -- --run <test-file>
```

## Trade-offs

**What we chose:**

- REST over GraphQL (simpler, cacheable)
- Monolith over microservices (split later if needed)
- Drizzle over heavy ORM (SQL-like, explicit)
- Minimal dependencies (fewer vulnerabilities)
- Native JWT over library (no supply chain risk)

**What we deferred:**

- Distributed tracing (correlation IDs ready)
- Circuit breakers (add when needed)
- Read replicas (single DB for now)
- Redis cache provider (interface ready)
- Elasticsearch provider (interface ready)
- FCM push provider (stub ready)

**What's ready but not default:**

- Elasticsearch search provider
- S3 storage provider
- SMTP email provider
- Postgres job queue
- OAuth providers (configurable)

---

[Read the detailed docs](../../docs) for architecture decisions, development workflows, and contribution guidelines.
