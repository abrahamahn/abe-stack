# ABE Stack

**A full-stack TypeScript boilerplate for shipping real apps — fast.**

I got tired of spending weeks on every new project just setting up the same things: monorepo config, auth, database, UI components, testing, Docker, CI... only to finally start building what actually mattered.

So I built **ABE Stack** — one clean, production-ready foundation that powers web, desktop, and backend from a single repo. The goal? Let you (and me) go from idea to deployed app in days instead of months.

https://github.com/abrahamahn/abe-stack

---

## Why I Built This

- **One codebase, multiple platforms** → Web (Vite + React), Desktop (Electron), and a Fastify backend
- **No framework lock-in** → React is just the renderer. All real logic lives in shared packages — swap UI layers later if you want
- **Speed without chaos** → Turborepo caching, parallel builds, minimal config
- **Production-ready from day one** → Secure defaults, Docker, strict types, env validation
- **Joyful development** → Fast feedback, zero config fatigue, everything just works

---

## What's Inside

### Core Stack

- Monorepo powered by **Turborepo + pnpm** workspaces
- Frontend: **React 19** (web via Vite, desktop via Electron)
- Backend: **Fastify + Drizzle ORM + PostgreSQL**
- API: Type-safe contracts with **ts-rest + Zod**
- Auth: JWT with refresh rotation, password reset, email verification, role-based access
- Pagination: Cursor-based pagination for feeds and lists (50k+ users ready)

### Security (Enterprise Grade)

- **Security Headers**: CSP with nonce-based execution, COEP/COOP/CORP cross-origin isolation, HSTS
- **Rate Limiting**: Role-based limits (Admin: 1000/min, Premium: 500/min, Basic: 50/min) with progressive delays
- **CSRF Protection**: AES-256-GCM encrypted tokens with timing-safe comparison
- **Input Validation**: XSS prevention, SQL/NoSQL injection detection, comprehensive sanitization
- **Audit Logging**: Security event tracking, intrusion detection, risk scoring (0-100)
- **File Uploads**: HMAC-signed URLs, content validation, size limits

### Deployment & Infrastructure

- **Infrastructure as Code**: Terraform modules for DigitalOcean and Google Cloud
- **CI/CD Pipelines**: GitHub Actions for automated testing, building, and deployment
- **Multi-Environment**: Staging and production environment support
- **Container Ready**: Docker Compose for local development and production deployment
- **One-Click Deploy**: From code to production in minutes

### Quality & Developer Experience

- Full **TypeScript strict mode** with end-to-end type safety
- **5,300+ tests** (Vitest unit tests + Playwright E2E)
- ESLint + Prettier + git hooks (no bad code slips through)
- Shared UI library: 16 components, 25 elements, 13 hooks, 14 layouts (browse at `/ui-library`)
- State: React Query for server state, offline mutation queue
- Theming, hooks, layouts, resizable panels — all reusable

---

## Feature Guide

This repo tracks detailed status in `docs/CHECKLIST.md`. At a high level, it includes:

- Auth + security (email verify, reset, OAuth, 2FA, session management)
- Accounts + profiles (settings UI, avatars, password change, lifecycle scaffolding)
- RBAC + multi-tenant foundations (roles, memberships, invitations, policies)
- Billing + subscriptions (Stripe/PayPal plumbing, plans, UI + API clients)
- Notifications + audit (email/notification infra, security events, admin views)
- Realtime + media + storage (websocket transport, media processing, file storage)
- Compliance + ops (GDPR scaffolding, admin surfaces, CI/CD + infra tooling)

For exact progress and gaps, see `docs/CHECKLIST.md`.

---

## Quick Start

### Option 1: Docker Postgres (Default)

```bash
git clone https://github.com/abrahamahn/abe-stack.git && cd abe-stack
pnpm install
cp config/env/.env.development.example config/env/.env.development
docker compose --env-file config/env/.env.development -f infra/docker/development/docker-compose.dev.yml up -d
pnpm db:push
pnpm db:seed
pnpm dev
```

### Option 2: Local Postgres (VM-like Dev)

```bash
git clone https://github.com/abrahamahn/abe-stack.git && cd abe-stack
pnpm install
cp config/env/.env.local.example config/env/.env.local
ENV_FILE=config/env/.env.local pnpm db:push
ENV_FILE=config/env/.env.local pnpm db:seed
pnpm dev
```

---

## First-Time Setup

**New to ABE Stack?** Here's everything you need to get started:

### 1. Prerequisites

Ensure you have these installed:

```bash
# Node.js 20+ and pnpm
node --version  # Should be 20.x or higher
pnpm --version  # Should be 10.x or higher

# PostgreSQL (optional for local Postgres dev)
pg_isready  # Check if PostgreSQL is running
```

### 2. Clone and Install

```bash
git clone https://github.com/abrahamahn/abe-stack.git
cd abe-stack
pnpm install
```

### 3. Configure Environment

Copy the example environment files:

```bash
# Development environment (Docker Postgres)
cp config/env/.env.development.example config/env/.env.development

# Local Postgres (VM-like dev)
cp config/env/.env.local.example config/env/.env.local
```

**Default configurations:**

- Docker Postgres: `postgresql://postgres:development@localhost:5432/abe_stack_dev`
- Local Postgres: `postgresql://postgres:postgres@localhost:5433/abe_stack_dev`
- Email: Console (logs to terminal)
- Storage: Local filesystem (`apps/server/uploads`)
- All other services: Local/mock providers

**Need to customize?** Edit the env file you’re using. See [config/env/README.md](config/env/README.md) for details.

### 4. Initialize Database

Docker Postgres:

```bash
docker compose --env-file config/env/.env.development -f infra/docker/development/docker-compose.dev.yml up -d
pnpm db:push
pnpm db:seed
```

Local Postgres:

```bash
createdb abe_stack_dev
ENV_FILE=config/env/.env.local pnpm db:push
ENV_FILE=config/env/.env.local pnpm db:seed
```

### 5. Start Development

```bash
pnpm dev
```

**What runs:**

- Web app: [http://localhost:5173](http://localhost:5173)
- API server: [http://localhost:8080](http://localhost:8080)
- Desktop app: Electron window (optional)

### 6. Verify Everything Works

1. Open [http://localhost:5173](http://localhost:5173)
2. Click "Register" and create an account
3. Check your terminal for the verification email (console provider)
4. Log in and explore the UI library at `/ui-library`

**Troubleshooting:**

- **Database connection error?** Ensure PostgreSQL is running and credentials match
- **Port already in use?** Change `APP_PORT` or `API_PORT` in `config/env/.env.local`
- **Module not found?** Run `pnpm install` again
- **More help?** See [config/env/README.md](config/env/README.md#troubleshooting)

---

## Commands

### Development

| Command            | Description                  |
| ------------------ | ---------------------------- |
| `pnpm dev`         | Start all apps with watchers |
| `pnpm dev:web`     | Start web app only           |
| `pnpm dev:server`  | Start server only            |
| `pnpm dev:desktop` | Start desktop app only       |

### Build

| Command           | Description                                 |
| ----------------- | ------------------------------------------- |
| `pnpm build`      | Full build with lint, type-check, and tests |
| `pnpm build:fast` | Build without tests                         |

### Testing

| Command              | Description                    |
| -------------------- | ------------------------------ |
| `pnpm test`          | Run all tests                  |
| `pnpm test:watch`    | Run tests in watch mode        |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm test:e2e`      | Run Playwright E2E tests       |

### Quality

| Command           | Description                    |
| ----------------- | ------------------------------ |
| `pnpm lint`       | Check linting (max 0 warnings) |
| `pnpm type-check` | Run TypeScript type checking   |
| `pnpm format`     | Format with Prettier           |

### Database

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `pnpm db:restart`   | Restart database container         |
| `pnpm db:reset`     | Reset database to clean state      |
| `pnpm db:bootstrap` | Initialize database with seed data |

---

## Roadmap

See [`apps/docs/todo/ROADMAP.md`](apps/docs/todo/ROADMAP.md) for planned features:

- **MFA** — TOTP support with authenticator apps
- **Data handling templates** — GDPR/HIPAA patterns

---

## Contributing

Found a bug? Want to add a feature? Have a better way to do something?

Open an issue or PR. All contributions welcome.

---

## License

MIT © 2026 ABE Stack Contributors

---

Built by one developer who just wanted to ship faster.
Now it's yours too.
