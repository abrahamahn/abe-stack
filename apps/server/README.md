# ABE Stack Server

## Overview

The ABE Stack server is a TypeScript backend built with **Fastify 5.x**, **PostgreSQL**, **Drizzle ORM**, and **ts-rest** contracts. It follows a **hexagonal architecture** with clear separation between infrastructure and business logic.

**Stats:** 79 source files | 39 test files | 557 tests passing

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Entry Points                               │
│  main.ts → app.ts → server.ts                                   │
├─────────────────────────────────────────────────────────────────┤
│                      Config Layer (8 files)                     │
│  Zod-validated environment configuration                        │
├─────────────────────────────────────────────────────────────────┤
│                      Modules Layer (16 files)                   │
│  Business features: auth, users, admin                          │
├─────────────────────────────────────────────────────────────────┤
│                      Shared Layer (4 files)                     │
│  Constants, errors, types                                       │
├─────────────────────────────────────────────────────────────────┤
│                      Infrastructure Layer (46 files)            │
│  database, storage, email, pubsub, websocket, security,         │
│  http, rate-limit, crypto, health                               │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
apps/server/src/
├── main.ts              # Application entry point
├── app.ts               # App DI container + lifecycle
├── server.ts            # Fastify server factory + plugins
│
├── config/              # Configuration (8 files)
│   ├── index.ts         # loadConfig() entry point
│   ├── loader.ts        # Environment loading utilities
│   ├── types.ts         # AppConfig type definition
│   ├── auth.config.ts   # JWT, password, lockout, OAuth, TOTP
│   ├── database.config.ts
│   ├── email.config.ts
│   ├── server.config.ts
│   └── storage.config.ts
│
├── infra/               # Infrastructure (46 files, 10 modules)
│   ├── database/        # Drizzle ORM client + schemas
│   │   ├── client.ts        # createDbClient, connection pooling
│   │   ├── transaction.ts   # withTransaction wrapper
│   │   ├── schema/          # Database schemas
│   │   │   ├── users.ts     # users table
│   │   │   └── auth.ts      # refreshTokens, loginAttempts, etc.
│   │   └── utils/
│   │       └── optimistic-lock.ts
│   │
│   ├── storage/         # File storage abstraction
│   │   ├── storageFactory.ts    # Provider factory
│   │   └── providers/
│   │       ├── localStorageProvider.ts
│   │       └── s3StorageProvider.ts
│   │
│   ├── email/           # Email service
│   │   ├── factory.ts           # Provider factory
│   │   ├── consoleEmailService.ts
│   │   ├── smtpEmailService.ts
│   │   ├── smtp.ts              # Raw SMTP client
│   │   └── templates.ts
│   │
│   ├── pubsub/          # Real-time subscriptions
│   │   ├── subscriptionManager.ts  # In-memory pub/sub
│   │   ├── postgresPubSub.ts       # Postgres NOTIFY/LISTEN
│   │   └── helpers.ts              # SubKeys, publishAfterWrite
│   │
│   ├── security/        # Security infrastructure
│   │   ├── lockout.ts   # Login attempt tracking, account lockout
│   │   └── events.ts    # Security event audit logging
│   │
│   ├── http/            # HTTP middleware
│   │   ├── security.ts  # Security headers, CORS
│   │   ├── cookie.ts    # HMAC-SHA256 signed cookies
│   │   ├── csrf.ts      # CSRF protection
│   │   └── static.ts    # Static file serving
│   │
│   ├── crypto/          # Cryptographic utilities
│   │   └── jwt.ts       # Native HS256 JWT (no external lib)
│   │
│   ├── rate-limit/      # Rate limiting
│   │   └── limiter.ts   # Token bucket algorithm
│   │
│   ├── websocket/       # WebSocket support
│   │   └── websocket.ts
│   │
│   └── health/          # Health checks
│       └── index.ts     # Per-service health validation
│
├── modules/             # Business modules (16 files, 3 modules)
│   ├── index.ts         # registerRoutes() - route registration
│   │
│   ├── auth/            # Authentication (10 files)
│   │   ├── handlers.ts  # register, login, refresh, logout
│   │   ├── service.ts   # AuthService business logic
│   │   ├── middleware.ts  # requireAuth, requireRole guards
│   │   └── utils/
│   │       ├── jwt.ts         # Token generation
│   │       ├── password.ts    # Argon2id hashing
│   │       ├── refresh-token.ts  # Token rotation, family detection
│   │       └── request.ts     # IP/user-agent extraction
│   │
│   ├── users/           # User management (3 files)
│   │   ├── handlers.ts  # GET /me
│   │   └── service.ts   # UserService
│   │
│   └── admin/           # Admin operations (3 files)
│       ├── handlers.ts  # Admin unlock endpoint
│       └── service.ts   # AdminService
│
├── shared/              # Shared kernel (4 files)
│   ├── constants.ts     # Time constants, HTTP status, messages
│   ├── errors.ts        # AppError classes (BadRequest, Unauthorized, etc.)
│   └── types.ts         # User, Token, AppContext interfaces
│
├── scripts/
│   └── seed.ts          # Database seeding
│
└── types/
    └── fastify.d.ts     # Fastify type augmentation
```

## Dependencies

**Production (9 packages):**

- `@abe-stack/core` - Shared contracts and validation
- `fastify` - Web framework
- `drizzle-orm` + `postgres` - Database
- `argon2` - Password hashing
- `ws` - WebSocket
- `@aws-sdk/*` (3 packages) - S3 storage

**Development (3 packages):**

- `@types/ws` - WebSocket types
- `drizzle-kit` - Database migrations
- `pino-pretty` - Log formatting

## Key Concepts

### App Dependency Container

The `App` class manages all services and lifecycle:

```typescript
class App implements IServiceContainer {
  readonly config: AppConfig;
  readonly db: DbClient;
  readonly email: EmailService;
  readonly storage: StorageProvider;
  readonly pubsub: SubscriptionManager;

  async start(): Promise<void>; // Initialize and listen
  async stop(): Promise<void>; // Graceful shutdown
}
```

Handlers receive `AppContext` with all dependencies:

```typescript
interface AppContext extends IServiceContainer {
  log: FastifyBaseLogger;
}
```

### Configuration

All configuration loaded from environment and validated with Zod:

```typescript
const config = loadConfig(process.env);
// Returns typed AppConfig:
// - config.server (port, host, env, cors, trustProxy)
// - config.database (url, poolSize, fallbackHosts)
// - config.auth (jwt, password, lockout, oauth, totp)
// - config.email (provider, smtp settings)
// - config.storage (provider, local/s3 settings)
```

### Authentication Flow

1. **Register/Login** → Creates user, generates access + refresh tokens
2. **Access Token** → Short-lived JWT (15 min), used for API requests
3. **Refresh Token** → Long-lived (7 days), stored in DB with family ID
4. **Token Rotation** → On refresh, old token invalidated, new one issued
5. **Reuse Detection** → If old token reused, entire family revoked

### Security Features

| Feature          | Implementation                                |
| ---------------- | --------------------------------------------- |
| Password Hashing | Argon2id (OWASP parameters)                   |
| JWT              | Native HS256 (no external library)            |
| Token Rotation   | Family-based tracking, reuse detection        |
| Account Lockout  | Progressive delay after failed attempts       |
| Audit Logging    | Security events (login, lockout, token reuse) |
| Rate Limiting    | Token bucket algorithm                        |
| CSRF Protection  | Signed double-submit cookies                  |
| Security Headers | CSP, X-Frame-Options, etc.                    |

### Infrastructure Modules

| Module       | Purpose                                       |
| ------------ | --------------------------------------------- |
| `database`   | Drizzle ORM, transactions, optimistic locking |
| `storage`    | Local filesystem or S3 abstraction            |
| `email`      | Console or SMTP email service                 |
| `pubsub`     | In-memory + Postgres NOTIFY for scaling       |
| `security`   | Login lockout, audit logging                  |
| `http`       | Security headers, CORS, cookies, CSRF, static |
| `crypto`     | Native JWT signing/verification               |
| `rate-limit` | Token bucket rate limiter                     |
| `websocket`  | Real-time connection support                  |
| `health`     | Per-service health checks                     |

## API Routes

```
POST /api/auth/register     # User registration
POST /api/auth/login        # Email/password login
POST /api/auth/refresh      # Token refresh (via cookie)
POST /api/auth/logout       # Logout (revoke tokens)
POST /api/auth/verify-email # Email verification (not implemented)

GET  /api/users/me          # Current user profile (protected)

POST /api/admin/auth/unlock # Unlock account (admin only)

GET  /health                # Basic health check
GET  /health/detailed       # Detailed service status
GET  /health/routes         # Registered routes list
GET  /health/ready          # Kubernetes readiness
GET  /health/live           # Kubernetes liveness
```

## Database Schema

```sql
-- Core tables
users                    # User accounts (id, email, name, role, passwordHash)

-- Auth tables
refresh_tokens           # Active refresh tokens
refresh_token_families   # Token family tracking (for reuse detection)
login_attempts           # Failed login tracking (for lockout)
password_reset_tokens    # Password reset flow
email_verification_tokens # Email verification flow
security_events          # Audit log
```

## Running the Server

```bash
# Development (with hot reload via tsx)
pnpm dev:server

# Production build
pnpm --filter @abe-stack/server build
pnpm --filter @abe-stack/server start

# Tests
pnpm --filter @abe-stack/server test

# Type checking (includes tests)
pnpm --filter @abe-stack/server type-check

# Database operations
pnpm --filter @abe-stack/server db:generate  # Generate migrations
pnpm --filter @abe-stack/server db:migrate   # Run migrations
pnpm --filter @abe-stack/server db:push      # Push schema changes
pnpm --filter @abe-stack/server db:studio    # Open Drizzle Studio
pnpm --filter @abe-stack/server db:seed      # Seed test data
```

## Environment Variables

```bash
# Server
PORT=8080
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/abe_stack

# Auth
JWT_SECRET=your-secret-key-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email (optional)
EMAIL_PROVIDER=console  # or smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=pass

# Storage (optional)
STORAGE_PROVIDER=local  # or s3
STORAGE_ROOT_PATH=./storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=...
AWS_S3_REGION=...
```

## Build Configuration

```
tsconfig.json        # Type-checking (includes tests)
tsconfig.build.json  # Build output (excludes tests)
vitest.config.ts     # Re-exports shared config
```

**Build command:** `tsc -p tsconfig.build.json`
**Type-check command:** `tsc --project tsconfig.json --noEmit`

## Adding New Features

1. **Define contract** in `packages/core/src/contracts/`
2. **Create module** in `src/modules/your-feature/`
   - `handlers.ts` - Route handlers
   - `service.ts` - Business logic
   - `index.ts` - Barrel exports
3. **Register routes** in `src/modules/index.ts`
4. **Add tests** in `src/modules/your-feature/__tests__/`

### Handler Pattern

```typescript
export async function handleYourFeature(
  ctx: AppContext,
  body: YourInput,
  req: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await yourService(ctx, body);
  return { status: 200, body: result };
}
```

### Route Registration

```typescript
// In src/modules/index.ts
instance.route({
  method: 'POST',
  url: '/api/your-feature',
  preHandler: [authGuard], // Optional auth
  handler: async (req, reply) => {
    const result = await handleYourFeature(ctx, req.body, req, reply);
    return reply.status(result.status).send(result.body);
  },
});
```

---

_Last Updated: 2026-01-17_
