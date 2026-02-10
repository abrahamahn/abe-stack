# Quickstart: Server

Fastify 5 backend with PostgreSQL and hexagonal architecture. Business logic in the center, infrastructure on the edges.

---

## Prerequisites

- Monorepo installed (`pnpm install` from root)
- PostgreSQL running locally (or use Docker)

---

## Start

### Option A: With full stack

```bash
# From monorepo root
pnpm dev
```

### Option B: Server only

```bash
# Ensure database is ready
createdb abe_stack_dev
pnpm db:bootstrap

# Start server
pnpm --filter @abe-stack/server dev
```

API runs at http://localhost:8080.

### Option C: Docker (no local PostgreSQL needed)

```bash
docker compose -f infra/docker/development/docker-compose.yml up --build
```

---

## Commands

```bash
pnpm --filter @abe-stack/server dev         # Development (hot reload via tsx)
pnpm --filter @abe-stack/server build       # Production build (tsc)
pnpm --filter @abe-stack/server start       # Run production build
pnpm --filter @abe-stack/server test        # Run tests
pnpm --filter @abe-stack/server type-check  # TypeScript checking
pnpm --filter @abe-stack/server lint        # Lint

# Database
pnpm --filter @abe-stack/server db:push     # Push schema to PostgreSQL
pnpm --filter @abe-stack/server db:seed     # Seed test data
pnpm --filter @abe-stack/server db:studio   # Open Drizzle Studio (GUI)
```

---

## Database Setup

```bash
# Create the database
createdb abe_stack_dev

# Push schema + seed data (from monorepo root)
pnpm db:bootstrap

# Or step by step
pnpm --filter @abe-stack/server db:push    # schema only
pnpm --filter @abe-stack/server db:seed    # seed data only
```

Default connection: `postgresql://postgres:postgres@localhost:5432/abe_stack_dev`

Override in `config/env/.env.local`:

```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

---

## API Endpoints

### Health

```
GET /health           # { status: "ok" }
GET /health/ready     # { status: "ready" }
GET /health/detailed  # per-service health status
```

### Auth

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/logout
POST /api/auth/logout-all
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/verify-email
POST /api/auth/resend-verification
```

### Users

```
GET  /api/users/me     # Current user profile
GET  /api/users/list   # List users (admin, cursor pagination)
```

### Admin

```
POST /api/admin/auth/unlock   # Unlock locked account
```

Full endpoint list in the [Server README](../../apps/server/README.md).

---

## Architecture

```
apps/server/src/
├── main.ts              # Entry point
├── app.ts               # DI container (AppContext)
├── server.ts            # Fastify setup + middleware
├── config/              # Zod-validated environment config
├── infrastructure/      # Adapters (database, email, storage, etc.)
└── modules/             # Business logic (auth, users, admin, etc.)
```

**The rule:** Modules import from infrastructure, never the reverse.

Infrastructure components are pluggable via provider switches:

| Component | Default (Dev) | Production Options         |
| --------- | ------------- | -------------------------- |
| Database  | PostgreSQL    | PostgreSQL                 |
| Email     | Console       | SMTP                       |
| Storage   | Local files   | S3 / compatible            |
| Cache     | In-memory     | Redis (interface ready)    |
| Queue     | In-memory     | PostgreSQL-backed          |
| Search    | SQL           | Elasticsearch (stub ready) |

---

## Configuration

Environment is Zod-validated at startup. Required variables:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/abe_stack_dev
JWT_SECRET=this_is_a_development_secret_that_is_long_enough_for_development_purposes
```

Everything else has sensible defaults for development. See `config/env/.env.development.example` for the full list.

Key provider switches (all default to local/dev mode):

```bash
EMAIL_PROVIDER=console       # console | smtp
STORAGE_PROVIDER=local       # local | s3
CACHE_PROVIDER=local         # local | redis
QUEUE_PROVIDER=local         # local | redis
SEARCH_PROVIDER=sql          # sql | elasticsearch
```

---

## Testing

```bash
pnpm --filter @abe-stack/server test              # All tests (dot reporter)
pnpm --filter @abe-stack/server test:unit          # Unit tests only
pnpm --filter @abe-stack/server test:integration   # Integration tests only
pnpm --filter @abe-stack/server test:full          # Verbose output
```

133 test files covering infrastructure, modules, and security.

---

## Next Steps

- Check `GET /health/detailed` to verify all services started
- Read the full [Server README](../../apps/server/README.md) for infrastructure details
- See [Security docs](../dev/security.md) for auth and CSRF details
- See [Deployment](../deploy/README.md) for production setup
