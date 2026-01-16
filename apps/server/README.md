# ABE Stack Server

## Overview

The ABE Stack server is a TypeScript backend built with **Fastify 5.x**, **PostgreSQL**, **Drizzle ORM**, and **ts-rest** contracts. It follows a hybrid **infra/modules** architecture with an `App` dependency injection container.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Entry Points                               │
│  main.ts → app.ts → server.ts                                   │
├─────────────────────────────────────────────────────────────────┤
│                      Config Layer                               │
│  Zod-validated environment configuration                        │
├─────────────────────────────────────────────────────────────────┤
│                      Modules Layer                              │
│  Business features: auth, users, admin                          │
├─────────────────────────────────────────────────────────────────┤
│                      Shared Layer                               │
│  Constants, errors, types                                       │
├─────────────────────────────────────────────────────────────────┤
│                      Infrastructure Layer                       │
│  Database, storage, email, pubsub, websocket, security           │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
apps/server/src/
├── main.ts              # Application entry point
├── app.ts               # App DI container + lifecycle
├── server.ts            # Fastify server factory + listeners
│
├── config/              # Configuration
│   ├── index.ts         # loadConfig() entry point
│   ├── loader.ts        # Environment loading utilities
│   ├── types.ts         # AppConfig type definition
│   ├── auth.config.ts   # JWT, password, lockout settings
│   ├── database.config.ts
│   ├── email.config.ts
│   ├── server.config.ts
│   └── storage.config.ts
│
├── infra/               # Infrastructure (technical capabilities)
│   ├── database/
│   │   ├── client.ts        # createDbClient, connection string
│   │   ├── transaction.ts   # withTransaction wrapper
│   │   ├── schema/          # Drizzle schemas
│   │   │   ├── users.ts     # users, refreshTokens tables
│   │   │   └── auth.ts      # refreshTokenFamilies, loginAttempts, etc.
│   │   ├── utils/
│   │   │   └── optimistic-lock.ts  # Version-based locking
│   │   └── index.ts         # Database exports
│   ├── storage/
│   │   ├── storageFactory.ts    # createStorage()
│   │   ├── types.ts
│   │   └── index.ts
│   ├── email/
│   │   ├── consoleEmailService.ts
│   │   ├── smtpEmailService.ts
│   │   ├── templates.ts
│   │   └── types.ts
│   ├── pubsub/
│   │   ├── subscriptionManager.ts  # In-memory pub/sub
│   │   ├── postgresPubSub.ts        # Postgres adapter
│   │   ├── helpers.ts              # publishAfterWrite
│   │   └── types.ts
│   ├── websocket/
│   │   ├── websocket.ts             # WebSocket server wiring
│   │   └── index.ts
│   ├── security/
│   │   ├── lockout.ts     # Login attempt tracking, account lockout
│   │   ├── events.ts      # Security event logging
│   │   └── types.ts
│   ├── crypto/
│   │   └── jwt.ts         # JWT utilities
│   ├── http/
│   │   └── security.ts    # CORS, security headers
│   ├── rate-limit/
│   │   └── limiter.ts     # Token bucket rate limiter
│   └── health/
│       └── index.ts       # Health checks, startup summary
│
├── modules/             # Business modules (features)
│   ├── index.ts         # registerRoutes() - all routes
│   ├── auth/
│   │   ├── index.ts     # Exports
│   │   ├── handlers.ts  # Route handlers
│   │   ├── service.ts   # AuthService business logic
│   │   ├── middleware.ts  # requireAuth, requireRole
│   │   └── utils/
│   │       ├── jwt.ts         # Token generation/verification
│   │       ├── password.ts    # Argon2id hashing
│   │       ├── refresh-token.ts  # Token rotation, family detection
│   │       ├── request.ts     # IP extraction, user agent parsing
│   │       └── __tests__/     # Utility unit tests
│   ├── users/
│   │   ├── handlers.ts  # User CRUD handlers
│   │   └── service.ts   # UserService
│   └── admin/
│       ├── handlers.ts  # Admin operations
│       └── service.ts   # AdminService
│
├── shared/              # Shared utilities
│   ├── index.ts
│   ├── constants.ts     # Error messages, config defaults
│   ├── errors.ts        # Custom error classes
│   └── types.ts         # AppContext, service interfaces
│
├── scripts/
│   └── seed.ts          # Database seeding
│
├── types/
│   └── fastify.d.ts     # Fastify type augmentation
```

## Key Concepts

### App Dependency Container

The `App` class in `app.ts` implements the dependency container:

```typescript
interface IServiceContainer {
  readonly config: AppConfig;
  readonly db: DbClient;
  readonly email: EmailService;
  readonly storage: StorageProvider;
  readonly pubsub: SubscriptionManager;
}
```

Handlers receive an `AppContext` with all dependencies:

```typescript
interface AppContext extends IServiceContainer {
  log: FastifyBaseLogger;
}
```

### Configuration

All configuration is loaded from environment variables and validated with Zod:

```typescript
const config = loadConfig(process.env);
// Returns typed AppConfig with nested objects:
// - config.server (port, host, env)
// - config.database (url, poolSize)
// - config.auth (jwt secrets, expiry, lockout)
// - config.email (provider, smtp settings)
// - config.storage (provider, local/s3 settings)
```

### Authentication Flow

1. **Register/Login** → Creates user, generates access + refresh tokens
2. **Access Token** → Short-lived JWT (15 min), used for API requests
3. **Refresh Token** → Long-lived (7 days), stored in database with family ID
4. **Token Rotation** → On refresh, old token invalidated, new one issued
5. **Reuse Detection** → If old token reused, entire family revoked

### Security Features

- **Argon2id** password hashing (OWASP parameters)
- **JWT rotation** with token family tracking
- **Account lockout** after failed attempts (progressive delay)
- **Security event logging** (token reuse, lockouts, suspicious activity)
- **Auth middleware** (`requireAuth`, `requireRole`) for protected routes
- **Request utilities** for IP/user-agent extraction and audit logging
- **Rate limiting** (token bucket algorithm)
- **CORS** and security headers

### Real-Time Infrastructure

- **SubscriptionManager** for in-memory publish/subscribe
- **Postgres PubSub adapter** for horizontal scaling
- **WebSocket wiring** for real-time client updates

## API Contracts

Routes are defined using **ts-rest** contracts in `packages/core`:

```typescript
// packages/core/src/contracts/auth.ts
export const authContract = c.router({
  register: { method: 'POST', path: '/auth/register', ... },
  login: { method: 'POST', path: '/auth/login', ... },
  refresh: { method: 'POST', path: '/auth/refresh', ... },
  logout: { method: 'POST', path: '/auth/logout', ... },
});
```

The server implements these contracts with full type safety.

## Running the Server

```bash
# Development
pnpm --filter @abe-stack/server dev

# Production build
pnpm --filter @abe-stack/server build
pnpm --filter @abe-stack/server start

# Run tests
pnpm --filter @abe-stack/server test

# Database operations
pnpm --filter @abe-stack/server db:generate  # Generate migrations
pnpm --filter @abe-stack/server db:migrate   # Run migrations
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
JWT_SECRET=your-secret-key

# Email (optional)
EMAIL_PROVIDER=console  # or smtp
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user
SMTP_PASS=pass

# Storage (optional)
STORAGE_PROVIDER=local  # or s3
STORAGE_ROOT_PATH=./storage
```

## Testing

Tests use Vitest with a test database:

```bash
# Run all server tests
pnpm --filter @abe-stack/server test

# Run specific test file
pnpm test -- --run apps/server/src/modules/auth/utils/__tests__/password.test.ts
```

Test utilities create mock `AppContext` for unit testing handlers.

## Adding New Features

1. **Create module** in `src/modules/your-feature/`
2. **Define contract** in `packages/core/src/contracts/`
3. **Implement handlers** that receive `AppContext`
4. **Register routes** in `src/modules/index.ts`
5. **Add tests** in `src/modules/your-feature/__tests__/`

---

_Last Updated: 2026-01-17_
