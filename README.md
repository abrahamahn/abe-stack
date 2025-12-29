<!-- markdownlint-disable MD040 -->
<!-- cspell:ignore Turborepo -->

# ABE Stack

Developer-velocity boilerplate for shipping production-grade apps fast. One TypeScript monorepo powers web (Vite + React), desktop (Electron today, Tauri-ready), and mobile (React Native) with a Fastify/PostgreSQL backend and shared UI/API/util packages. The renderers stay thin; business logic and infrastructure live in shared code to stay framework-agnostic.

![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)
![Turborepo](https://img.shields.io/badge/Turborepo-cached-orange)
![Docker](https://img.shields.io/badge/Docker-ready-blue)
[![Docs](https://img.shields.io/badge/docs-INDEX-blue)](./docs/INDEX.md)

## Why ABE Stack?

- **One codebase** → web, desktop, mobile, API with shared logic
- **No framework lock-in** → React is just a renderer; business logic lives in `shared/`
- **Monorepo speed** → Turborepo cached builds, parallel tasks
- **Production-ready by default** → Zod env validation, secure defaults, Docker
- **Developer joy** → strict but fast feedback loops, minimal config churn

## Table of Contents

- [Tech Highlights](#tech-highlights)
- [Repository Layout](#repository-layout)
- [Architecture Philosophy](#architecture-philosophy)
- [Documentation](#documentation)
- [Quick Start](#quick-start)
- [Development Workflows](#development-workflows)
- [Testing](#testing)
- [Production Deployment](#production-deployment)
- [Environment Configuration](#environment-configuration)
- [Code Quality](#code-quality)

## Tech Highlights

### Core Stack

- **Monorepo:** Turborepo + pnpm workspaces with TypeScript end-to-end
- **Frontend:** React 19 (Web via Vite, Desktop via Electron, Mobile via React Native)
- **Backend:** Fastify with Drizzle ORM + PostgreSQL + Redis
- **API Contract:** ts-rest + Zod for type-safe client-server communication
- **Authentication:** JWT with bcrypt, email verification hooks

### Quality & DevEx

- **Type Safety:** Full TypeScript coverage with strict mode
- **Testing:** Vitest for unit tests, Playwright for E2E, @testing-library for React
- **Code Quality:** ESLint, Prettier, simple-git-hooks for pre-commit/pre-push checks
- **Environment:** Type-safe env validation via Zod schemas
- **State Management:** React Query for server state
- **UI Components:** Shared design system with resizable panel layouts

## Repository Layout

```
abe-stack/
├── apps/
│   ├── web/          # Vite + React web application
│   ├── desktop/      # Electron desktop app
│   ├── mobile/       # React Native mobile app
│   └── server/       # Fastify API server
├── packages/
│   ├── api-client/   # Type-safe API client (ts-rest)
│   ├── db/           # Drizzle ORM schemas and migrations
│   ├── shared/       # Shared utilities, types, and validation
│   └── ui/           # Reusable UI component library
├── config/           # Build configs, test setups, env templates
├── tools/            # Developer utilities and scripts
└── .github/          # CI/CD workflows
```

## Architecture Philosophy

```
apps/*     → Thin renderers (React, Electron, RN)
            ↓
packages/  → Real logic lives here
   ├── shared/      → Business rules, types, validation (framework-agnostic)
   ├── ui/          → Reusable components
   ├── api-client/  → Type-safe contract
   └── db/          → Drizzle schemas & queries
```

Change UI frameworks by touching `apps/` only.

## Documentation

Quick links into the docs structure:

- Essentials: `docs/CLAUDE.md`
- Agent guide: `docs/AGENTS.md`
- Doc index: `docs/INDEX.md`
- Dev references: `docs/dev/`
- Agent workflows: `docs/agent/`
- Logs: `docs/log/`

## Quick Start

## First Run in < 5 Minutes (Docker Recommended)

Want to see it running instantly? Use the built-in dev stack:

```bash
git clone <repository-url>
cd abe-stack
docker compose up --build
```

Now open:

- Web app: http://localhost:3000
- API server: http://localhost:8080

No Node/pnpm/Postgres/Redis install required.

### Prerequisites

- **Node.js:** `>=18.19 <25` ([Download](https://nodejs.org/))
- **pnpm:** `10.26.2` (installed via corepack - see below)
- **PostgreSQL:** Running instance (local or Docker)
- **Redis:** Running instance (local or Docker)

### 1. Install pnpm

```bash
corepack enable
corepack prepare pnpm@10.26.2 --activate
```

### 2. Clone and Install

```bash
git clone <repository-url>
cd abe-stack
pnpm install
```

### 3. Configure Environment

```bash
# Copy the example environment file
cp config/.env.example config/.env.development

# Edit config/.env.development with your settings
# At minimum, update:
# - Database credentials (POSTGRES_*)
# - Redis settings (REDIS_*)
# - JWT/Session secrets (use strong random values!)
```

### 4. Start Development Servers

```bash
# Start all apps (web + server + desktop)
pnpm dev

# Or start individual apps:
pnpm dev:web       # Web app on http://localhost:3000
pnpm dev:server    # API server on http://localhost:8080
pnpm dev:desktop   # Electron desktop app
pnpm dev:mobile    # React Native mobile app
```

### Fast vs Full Startup

- **Fast:** `pnpm install` → `pnpm dev`
- **Full:** `pnpm install` → `pnpm dev` → `pnpm format` → `pnpm lint` → `pnpm type-check` → `pnpm test`

## Development Workflows

### Common Commands

| Command                   | Description                        |
| ------------------------- | ---------------------------------- |
| `pnpm dev`                | Start all apps in development mode |
| `pnpm build`              | Build all apps for production      |
| `pnpm test`               | Run all unit tests with Vitest     |
| `pnpm test -- --coverage` | Run tests with coverage report     |
| `pnpm lint`               | Lint all code with ESLint          |
| `pnpm lint:fix`           | Auto-fix linting issues            |
| `pnpm type-check`         | Type-check all TypeScript code     |
| `pnpm format`             | Format code with Prettier          |
| `pnpm clean`              | Clean all build artifacts          |

### Working with Specific Apps

```bash
# Web app
pnpm --filter @abe-stack/web dev
pnpm --filter @abe-stack/web build

# Server
pnpm --filter @abe-stack/server dev
pnpm --filter @abe-stack/server build

# Shared packages
pnpm --filter @abe-stack/shared build
pnpm --filter @abe-stack/ui build
```

## Testing

**Testing Strategy:**

- **Vitest** - Unit and integration tests (frontend & backend)
- **Playwright** - End-to-end tests

**Note:** `apps/web` currently has no unit test files, so `pnpm test` fails until tests are added or the Vitest config is adjusted.

### Unit Tests (Vitest)

```bash
# Run all unit tests
pnpm test

# Run tests for specific app
pnpm test:web
pnpm test:server

# Run with coverage
pnpm test -- --coverage

# Watch mode
pnpm --filter @abe-stack/web test -- --watch
```

### E2E Tests (Playwright)

```bash
# Install browsers (first time only)
pnpm exec playwright install

# Run E2E tests
pnpm test:e2e

# Run in UI mode
pnpm test:e2e:ui
```

**Test Files:**

- Unit tests: `**/*.test.{ts,tsx}`
- E2E tests: `tests/e2e/**/*.spec.ts`
- Config: `config/vitest.config.ts` and `config/playwright.config.ts`

## Production Deployment

### Docker Deployment (Recommended)

The included multi-stage Dockerfile builds an optimized production image:

```bash
# Build production image
docker build -t abe-stack-server .

# Run with environment variables
docker run -p 8080:8080 \
  -e POSTGRES_HOST=your-db-host \
  -e POSTGRES_PASSWORD=your-secure-password \
  -e JWT_SECRET=your-jwt-secret \
  -e SESSION_SECRET=your-session-secret \
  abe-stack-server
```

**Security Features:**

- Multi-stage build for minimal image size
- Non-root user execution
- Security updates applied
- dumb-init for proper signal handling
- Health check endpoint
- Build cache optimization

### Manual Deployment

```bash
# Build all applications
pnpm build

# Deploy specific apps
pnpm --filter @abe-stack/server build
pnpm --filter @abe-stack/web build

# Start production server
NODE_ENV=production node apps/server/dist/index.js
```

## Environment Configuration

### Environment Files

- `config/.env.example` - Template with all available variables
- `config/.env.development` - Local development settings (git-ignored)
- `config/.env.production` - Production settings (git-ignored)

### Required Variables

```bash
# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=abe_stack_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security (CRITICAL: Change in production!)
JWT_SECRET=<minimum 32 characters>
SESSION_SECRET=<minimum 32 characters>
```

### Type-Safe Validation

Environment variables are validated at server startup using Zod schemas. See `packages/shared/src/env.ts` for the complete schema.

**Production Safety:**

- Secrets are validated for minimum length (32 chars)
- Development defaults (containing `dev_` or `change_me`) are rejected in production
- Missing required variables cause immediate startup failure with helpful error messages

## Code Quality

Git hooks automatically ensure code quality:

**Pre-commit:**

- Prettier formatting check
- ESLint on changed files

**Pre-push:**

- Full linting
- TypeScript type checking

### Contributing Guardrails

- If format/lint/type-check/test failures are pre-existing or unrelated, do not auto-fix them; report them clearly and keep scope focused.

## License

[Add your license here]
