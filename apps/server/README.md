# ABE Stack Server

## The Story of This Server

When we set out to build this server, we had a simple goal: create something that feels inevitable. Not clever, not fancy - just the obvious choice for what we needed. A TypeScript backend built with **Fastify 5.x**, **PostgreSQL**, **Drizzle ORM**, and contracts defined in a shared package. Nothing surprising, nothing to explain away.

But underneath that simplicity lies a set of hard-won opinions about how backend code should be organized. We follow a **hexagonal architecture** - business logic in the center, infrastructure on the edges - because we've been burned by the alternative. When your authentication logic knows it's running on Fastify, or your user service imports from `node:http`, you've coupled yourself to decisions you might want to change.

**Stats:** 96 source files | 53 test files | 800+ tests passing

## Table of Contents

- [The Story of This Server](#the-story-of-this-server)
- [Philosophy: Why Hexagonal Architecture?](#philosophy-why-hexagonal-architecture)
- [The App Container: Our Dependency Injection Story](#the-app-container-our-dependency-injection-story)
- [The Three-File Entry Point Pattern](#the-three-file-entry-point-pattern)
- [Walkthrough: What Happens When a User Logs In](#walkthrough-what-happens-when-a-user-logs-in)
- [Walkthrough: Adding a New Endpoint](#walkthrough-adding-a-new-endpoint)
- [Directory Structure](#directory-structure)
- [Security: What We Do and Why](#security-what-we-do-and-why)
- [Scaling: How This Architecture Grows](#scaling-how-this-architecture-grows)
- [Configuration](#configuration)
- [API Routes](#api-routes)
- [Database Schema](#database-schema)
- [Running the Server](#running-the-server)
- [Dependencies](#dependencies)
- [Trade-offs and Honest Limitations](#trade-offs-and-honest-limitations)

---

## Philosophy: Why Hexagonal Architecture?

Let's be honest: hexagonal architecture has a cost. More files, more indirection, more "where does this code go?" decisions. We accepted that cost because the alternative is worse.

Here's what we're avoiding:

**The Fat Controller Problem.** In simpler architectures, route handlers grow into monsters. They validate input, call the database, send emails, format responses, and handle errors - all in one function. Testing requires mocking Fastify, the database, the email service, and half the Node.js standard library.

**The Hidden Dependency Problem.** When your business logic imports from `fastify` or `@aws-sdk/client-s3`, you've made an irreversible decision. Want to switch from S3 to Cloudflare R2? Good luck finding all the places you need to change.

**The "It Works on My Machine" Problem.** Without clear boundaries, developers make assumptions. "Oh, `req.ip` gives me the client IP." Does it? Behind a proxy? In production? Business logic shouldn't need to know.

Our hexagonal architecture addresses this by separating concerns:

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
│                      Infrastructure Layer (14 modules)          │
│  database, storage, email, pubsub, websocket, security,         │
│  http, rate-limit, crypto, health, logger, queue, router, write │
└─────────────────────────────────────────────────────────────────┘
```

The rule is simple: **modules/ imports from infra/, never the reverse.** Business logic doesn't know how emails get sent or where files are stored. It just knows it has services that do those things.

## The App Container: Our Dependency Injection Story

We tried a lot of approaches before landing on this one. Frameworks like InversifyJS felt like overkill - decorators, reflection, binding syntax. We just wanted to pass things to other things.

The `App` class is our composition root. It's where dependencies are created, wired together, and made available to handlers. Here's the mental model:

```typescript
// app.ts - simplified
class App implements IServiceContainer {
  readonly config: AppConfig;
  readonly db: DbClient;
  readonly email: EmailService;
  readonly storage: StorageProvider;
  readonly pubsub: SubscriptionManager;

  constructor(options: AppOptions) {
    this.config = options.config;
    this.db = options.db ?? createDbClient(options.config.database);
    this.email = options.email ?? createEmailService(options.config.email);
    this.storage = options.storage ?? createStorage(options.config.storage);
    this.pubsub = new SubscriptionManager();
  }

  get context(): AppContext {
    return {
      config: this.config,
      db: this.db,
      email: this.email,
      storage: this.storage,
      pubsub: this.pubsub,
      log: this.server.log,
    };
  }
}
```

Every handler receives an `AppContext`. This context contains everything the handler might need - database client, email service, storage, pub/sub, logger, and config. The handler doesn't create these things or know where they come from. It just uses them.

**Why this matters for testing:**

```typescript
// In tests, you can inject mocks at construction time
const mockEmail = { send: vi.fn() };
const app = new App({
  config: testConfig,
  email: mockEmail, // Use mock instead of real email service
});
```

No dependency injection framework needed. No decorators. Just constructor parameters and TypeScript's type system.

## The Three-File Entry Point Pattern

We split application startup across three files, and each has a specific job:

**main.ts** - The thinnest possible entry point. Loads config, creates the app, registers signal handlers for graceful shutdown. If you're debugging "why won't it start," you won't spend long here.

```typescript
// main.ts - the whole thing
async function main(): Promise<void> {
  const config = loadConfig(process.env);
  const app = createApp(config);
  await app.start();

  process.on('SIGTERM', () => void app.stop());
  process.on('SIGINT', () => void app.stop());
}
```

**app.ts** - The composition root. Creates services, wires them together, manages lifecycle. If you're asking "why does the server have access to X," look here.

**server.ts** - Fastify-specific configuration. Plugins, middleware, error handlers, core routes. If you're asking "why doesn't this header get set," look here.

This separation means Fastify details don't leak into business logic. If we ever needed to swap Fastify for something else (unlikely, but possible), the blast radius would be limited to `server.ts` and the route registration code.

## Walkthrough: What Happens When a User Logs In

Let's trace a login request from start to finish. This is the kind of walkthrough we wish we'd had when learning other codebases.

**1. Request arrives at `/api/auth/login`**

Fastify receives the HTTP request. Before any route handler runs, our middleware kicks in:

- `registerCorrelationIdHook` extracts or generates a correlation ID for distributed tracing
- `registerRequestInfoHook` extracts IP address and user-agent into `request.requestInfo`
- The global `onRequest` hook applies security headers, CORS, and rate limiting
- `registerCsrf` validates the CSRF token for mutating requests

**2. Route registration finds the handler**

In `modules/index.ts`, we register all routes using a generic router pattern:

```typescript
registerRouteMap(app, ctx, authRoutes, { prefix: '/api', jwtSecret: ctx.config.auth.jwt.secret });
```

The `authRoutes` map defines the login endpoint:

```typescript
'auth/login': publicRoute<LoginRequest, AuthResponse>(
  'POST',
  (ctx, body, req, reply) => handleLogin(ctx, body, req, reply),
  loginRequestSchema,
),
```

The `publicRoute` helper sets up Zod validation automatically. If the request body doesn't match `loginRequestSchema`, we return a 400 before the handler runs.

**3. The handler delegates to the service**

Handlers are thin. They receive validated input, call service functions, format responses, and set cookies:

```typescript
// handlers/login.ts
async function handleLogin(ctx, body, request, reply) {
  const { ipAddress, userAgent } = request.requestInfo;

  const result = await authenticateUser(
    ctx.db,
    ctx.config.auth,
    body.email,
    body.password,
    ctx.log,
    ipAddress,
    userAgent,
  );

  setRefreshTokenCookie(reply, result.refreshToken, ctx.config.auth);
  return { status: 200, body: { token: result.accessToken, user: result.user } };
}
```

Notice what's happening: the handler doesn't know how authentication works. It doesn't check passwords or create tokens. It just passes parameters to `authenticateUser` and handles the response.

**4. The service does the real work**

`authenticateUser` in `service.ts` contains the actual business logic:

```typescript
async function authenticateUser(db, config, email, password, logger, ipAddress, userAgent) {
  // Check account lockout
  if (await isAccountLocked(db, email, config.lockout)) {
    throw new AccountLockedError();
  }

  // Apply progressive delay (brute force protection)
  await applyProgressiveDelay(db, email, config.lockout);

  // Fetch and verify user
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  const isValid = await verifyPasswordSafe(password, user?.passwordHash);

  if (!user || !isValid) {
    await handleFailedLogin(db, config, email, 'Invalid credentials', ipAddress, userAgent);
    throw new InvalidCredentialsError();
  }

  // Create tokens atomically
  const { refreshToken } = await withTransaction(db, async (tx) => {
    await logLoginAttempt(tx, email, true, ipAddress, userAgent);
    return createRefreshTokenFamily(tx, user.id, config.refreshToken.expiryDays);
  });

  return createAuthResponse(createAccessToken(user, config), refreshToken, user);
}
```

The service imports from `@infra` for database access and from `@shared` for error types. It doesn't import anything from Fastify. It could run in any context - a CLI tool, a background job, a different web framework.

**5. Errors become HTTP responses**

If `authenticateUser` throws an `InvalidCredentialsError`, the handler catches it and calls `mapErrorToResponse`. Our error types know their HTTP status codes:

```typescript
class InvalidCredentialsError extends AppError {
  statusCode = 401;
  code = 'INVALID_CREDENTIALS';
}
```

The global error handler in `server.ts` formats these into a consistent API response with correlation IDs for debugging.

## Walkthrough: Adding a New Endpoint

Let's say you need to add a `POST /api/users/profile` endpoint to update the current user's profile. Here's the process:

**Step 1: Define the contract (in packages/core)**

Before writing server code, define the request/response types and validation schema:

```typescript
// packages/core/src/contracts/users/profile.ts
export const updateProfileRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatar: z.string().url().optional(),
});

export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
```

**Step 2: Create or update the service**

Add the business logic in `modules/users/service.ts`:

```typescript
export async function updateUserProfile(
  db: DbClient,
  userId: string,
  updates: UpdateProfileRequest,
): Promise<User> {
  const [updated] = await db
    .update(users)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();

  if (!updated) throw new NotFoundError('User not found');
  return updated;
}
```

**Step 3: Create the handler**

Add a thin handler in `modules/users/handlers.ts`:

```typescript
export async function handleUpdateProfile(
  ctx: AppContext,
  body: UpdateProfileRequest,
  req: RequestWithCookies,
): Promise<RouteResult<User>> {
  const userId = req.user!.userId; // Auth middleware guarantees this exists
  const user = await updateUserProfile(ctx.db, userId, body);
  return { status: 200, body: user };
}
```

**Step 4: Register the route**

In `modules/users/routes.ts`:

```typescript
export const userRoutes: RouteMap = {
  'users/me': protectedRoute<undefined, User>('GET', handleMe),

  // Add the new route
  'users/profile': protectedRoute<UpdateProfileRequest, User>(
    'POST',
    handleUpdateProfile,
    updateProfileRequestSchema,
  ),
};
```

The `protectedRoute` helper automatically adds authentication middleware. The schema automatically validates the request body.

**Step 5: Add tests**

Create `modules/users/__tests__/handlers.test.ts`:

```typescript
describe('handleUpdateProfile', () => {
  it('updates user profile with valid data', async () => {
    const ctx = createTestContext();
    const req = mockRequest({ user: { userId: 'user-1' } });

    const result = await handleUpdateProfile(ctx, { name: 'New Name' }, req);

    expect(result.status).toBe(200);
    expect(result.body.name).toBe('New Name');
  });
});
```

That's it. The router pattern handles the Fastify integration. You focus on business logic and tests.

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
├── infra/               # Infrastructure (14 modules)
│   ├── database/        # Drizzle ORM client + schemas
│   │   ├── client.ts        # createDbClient, connection pooling
│   │   ├── transaction.ts   # withTransaction wrapper
│   │   ├── test-utils.ts    # Database testing utilities
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
│   ├── health/          # Health checks
│   │   └── index.ts     # Per-service health validation
│   │
│   ├── logger/          # Structured logging
│   │   ├── logger.ts    # Pino logger factory
│   │   ├── middleware.ts # Request logging middleware
│   │   └── types.ts     # Logger types
│   │
│   ├── queue/           # Background job processing
│   │   ├── queueServer.ts   # Job queue server
│   │   ├── memoryStore.ts   # In-memory queue store
│   │   ├── postgresStore.ts # PostgreSQL queue store
│   │   └── types.ts
│   │
│   ├── router/          # Route registration
│   │   └── index.ts     # Generic route registry pattern
│   │
│   └── write/           # Unified write pattern
│       └── index.ts     # Transaction + PubSub write helper
│
├── modules/             # Business modules (3 modules)
│   ├── index.ts         # registerRoutes() - route registration
│   │
│   ├── auth/            # Authentication
│   │   ├── handlers.ts  # register, login, refresh, logout
│   │   ├── service.ts   # AuthService business logic
│   │   ├── middleware.ts  # requireAuth, requireRole guards
│   │   ├── routes.ts    # Route definitions
│   │   └── utils/
│   │       ├── jwt.ts         # Token generation
│   │       ├── password.ts    # Argon2id hashing
│   │       ├── refresh-token.ts  # Token rotation, family detection
│   │       └── request.ts     # IP/user-agent extraction
│   │
│   ├── users/           # User management
│   │   ├── handlers.ts  # GET /me
│   │   ├── service.ts   # UserService
│   │   └── routes.ts    # Route definitions
│   │
│   └── admin/           # Admin operations
│       ├── handlers.ts  # Admin unlock endpoint
│       ├── service.ts   # AdminService
│       └── routes.ts    # Route definitions
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

## Security: What We Do and Why

> **See also:** [Security Architecture](../../docs/dev/security.md) for comprehensive security documentation.

Security isn't a feature - it's a constraint on everything else. Here's what we implement and why:

| Feature          | Implementation                                | Why This Way                                             |
| ---------------- | --------------------------------------------- | -------------------------------------------------------- |
| Password Hashing | Argon2id (OWASP parameters)                   | Memory-hard, resistant to GPU attacks                    |
| JWT              | Native HS256 (no external library)            | Fewer dependencies, easier to audit                      |
| Token Rotation   | Family-based tracking, reuse detection        | Stolen token detection, limits exposure                  |
| Account Lockout  | Progressive delay after failed attempts       | Brute force protection without blocking legitimate users |
| Audit Logging    | Security events (login, lockout, token reuse) | Incident response, compliance                            |
| Rate Limiting    | Token bucket algorithm                        | Graceful degradation under load                          |
| CSRF Protection  | Signed double-submit cookies                  | Works with same-site cookies, no server state            |
| Security Headers | CSP, X-Frame-Options, etc.                    | Defense in depth                                         |

### Token Rotation: The Family Pattern

Our refresh token system deserves explanation because it's more complex than most.

When a user logs in, we create a "token family" - a unique ID that groups all tokens from that login session. Every refresh operation creates a new token in the same family and invalidates the old one.

If someone uses an already-invalidated token, we know something is wrong - either the token was stolen, or there's a replay attack. We invalidate the entire family, forcing the user to log in again.

```
Login → Creates family F1, token T1
Refresh T1 → Creates T2 (same family), invalidates T1
Refresh T2 → Creates T3, invalidates T2
Refresh T1 (attacker) → T1 already used! Invalidate entire F1
```

This means a stolen refresh token has a limited window of usefulness - until the legitimate user refreshes their token.

## Scaling: How This Architecture Grows

We've thought about horizontal scaling from the start, even if we're not there yet.

### The PostgresPubSub Adapter

Real-time features need to notify connected clients when data changes. In a single-server setup, this is easy - just keep a map of WebSocket connections in memory.

But add a second server, and you have a problem. A write on Server A needs to notify clients connected to Server B.

Our solution: Postgres NOTIFY/LISTEN as a message bus.

```typescript
// In app.ts
if (connectionString && config.env !== 'test') {
  this._pgPubSub = createPostgresPubSub({
    connectionString,
    onMessage: (key, version) => this.pubsub.publishLocal(key, version),
  });
  this.pubsub.setAdapter(this._pgPubSub);
}
```

When you call `pubsub.publish(key, version)`, it:

1. Notifies all local WebSocket connections immediately
2. Sends a NOTIFY to Postgres
3. Other server instances receive the NOTIFY and notify their local connections

No Redis required. No additional infrastructure. Just Postgres doing what it's good at.

### The Queue Pattern

Background jobs follow a similar philosophy. The `QueueServer` class polls for jobs and processes them with retry and exponential backoff:

```typescript
const queue = createQueueServer({
  store: createPostgresStore(db),
  handlers: {
    'send-email': async (args) => {
      /* ... */
    },
    'process-image': async (args) => {
      /* ... */
    },
  },
});

queue.start();
```

For single-server deployments, use `memoryStore`. For horizontal scaling, use `postgresStore`. Same interface, different backend.

### What We Haven't Built Yet

Some things we've explicitly deferred:

- **Distributed tracing** - Correlation IDs are in place, but we're not shipping traces to Jaeger yet
- **Circuit breakers** - External service calls don't have automatic failure isolation
- **Cache layer** - No Redis caching. Postgres handles our load fine for now.
- **Read replicas** - Single database, no read/write splitting

These would be straightforward to add given our architecture. The dependency injection pattern means swapping implementations doesn't require touching business logic.

## Configuration

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

### Environment Variables

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

## API Routes

```
POST /api/auth/register     # User registration (returns pending_verification)
POST /api/auth/login        # Email/password login
POST /api/auth/refresh      # Token refresh (via cookie)
POST /api/auth/logout       # Logout (revoke tokens)
POST /api/auth/logout-all   # Logout all sessions (protected)
POST /api/auth/forgot-password  # Request password reset
POST /api/auth/reset-password   # Reset password with token
POST /api/auth/verify-email     # Verify email with token
POST /api/auth/resend-verification  # Resend verification email

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

We're deliberate about dependencies. Every package is a liability - something that can break, have security vulnerabilities, or go unmaintained. The fewer, the better.

## Trade-offs and Honest Limitations

**What we chose NOT to do:**

- **No GraphQL.** REST is simpler, more cacheable, and sufficient for our needs. GraphQL would add complexity without clear benefit.

- **No microservices.** This is a monolith. Modules are in-process. The boundaries are logical, not physical. We can split later if needed.

- **No ORM magic.** Drizzle is thin - it's a query builder with types, not a full ORM. We write SQL-like code, not magic methods.

- **No fancy state machines.** Auth flows are straightforward conditionals. State machines are powerful but add cognitive load we don't need yet.

**Things we'd do differently with hindsight:**

- Some handler-to-service boundaries are awkward. We're still learning the right granularity.
- Test utilities could be better organized. There's duplication we haven't cleaned up.
- Error types proliferated faster than we'd like. Some consolidation would help.

## Build Configuration

```
tsconfig.json        # Type-checking (includes tests)
tsconfig.build.json  # Build output (excludes tests)
vitest.config.ts     # Re-exports shared config
```

**Build command:** `tsc -p tsconfig.build.json`
**Type-check command:** `tsc --project tsconfig.json --noEmit`

---

_Last Updated: 2026-01-21_
