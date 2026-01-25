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
- Shared UI library: 16 components, 25 elements, 13 hooks, 14 layouts (demo at `/demo`)
- State: React Query for server state, offline mutation queue
- Theming, hooks, layouts, resizable panels — all reusable

---

## Quick Start

### Option 1: Local Development

```bash
git clone https://github.com/abrahamahn/abe-stack.git && cd abe-stack
pnpm install
cp .config/env/.env.development.example .config/env/.env.development
pnpm dev
```

Open [localhost:3000](http://localhost:3000).

### Option 2: Docker

```bash
git clone https://github.com/abrahamahn/abe-stack.git && cd abe-stack
docker compose -f config/docker/docker-compose.yml up --build
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

# PostgreSQL (for local development)
pg_isready  # Check if PostgreSQL is running

# If PostgreSQL isn't running:
# macOS (Homebrew): brew services start postgresql
# Linux: sudo systemctl start postgresql
# Windows: Start PostgreSQL service from Services
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
# Development environment (works out-of-box with PostgreSQL)
cp .config/env/.env.development.example .config/env/.env.development

# Local overrides (optional, for your personal settings)
cp .config/env/.env.local.example .config/env/.env.local
```

**Default configuration:**

- PostgreSQL: `postgresql://postgres:postgres@localhost:5432/abe_stack_dev`
- Email: Console (logs to terminal)
- Storage: Local filesystem (`apps/server/uploads`)
- All other services: Local/mock providers

**Need to customize?** Edit `.config/env/.env.local` with your settings. See [.config/env/README.md](.config/env/README.md) for details.

### 4. Initialize Database

```bash
# Create the database
createdb abe_stack_dev

# Run migrations and seed data
pnpm db:bootstrap
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
4. Log in and explore the demo at `/demo`

**Troubleshooting:**

- **Database connection error?** Ensure PostgreSQL is running and credentials match
- **Port already in use?** Change `APP_PORT` or `API_PORT` in `.config/env/.env.local`
- **Module not found?** Run `pnpm install` again
- **More help?** See [.config/env/README.md](.config/env/README.md#troubleshooting)

---

## Repository Layout

```
abe-stack/
├── apps/                 # Applications (Web, Server, Desktop)
│   ├── web/              # Vite + React web app
│   ├── desktop/          # Electron app (shares code with web)
│   └── server/           # Fastify API (enterprise security, audit logging)
├── packages/             # Shared Logic & Contracts
│   ├── core/             # Contracts, validation, stores, errors, media
│   ├── ui/               # 16 components, 25 elements, 13 hooks, 14 layouts
│   ├── sdk/              # Type-safe API client + React Query + offline support
│   └── tests/            # Shared test utilities and mocks
├── infra/                # Deployment & Orchestration
│   ├── docker/           # Dockerfiles & Compose
│   ├── caddy/            # Caddy reverse proxy configs
│   └── nginx/            # Nginx configs
├── tooling/              # Meta Development Tools
│   ├── generators/       # Code scaffolding utilities
│   ├── lint/             # Linting & formatting configs
│   └── schema/           # Build-time schemas
├── .config/              # Tooling Configurations (hidden)
│   ├── tsconfig*.json    # TypeScript configurations
│   ├── vite.config.ts    # Vite build config
│   ├── vitest.config.ts  # Testing framework config
│   └── ...               # Other tool configs
├── .env*                 # Environment configuration files
├── tools/                # Dev scripts (sync watchers, audit tools)
└── docs/                 # Documentation
```

---

## Architecture

```
apps/*           → Thin renderers (just UI)
                 ↓
packages/*       → Where the real logic lives (shared, framework-agnostic)
```

**Dependency rule:** Apps import packages. Packages never import apps. Change your mind about React later? Only touch `apps/`. Everything else stays.

---

## SDK Features

_Inspired by [chet-stack](https://github.com/ccorcos/chet-stack) — particularly the offline-first data layer, real-time sync, and undo/redo patterns._

- **Type-safe API Client** — Built on ts-rest with automatic request/response typing
- **React Query Integration** — Custom hooks for data fetching with caching
- **Pagination Hooks** — `usePaginatedQuery` for infinite scroll, `useOffsetPaginatedQuery` for traditional pagination
- **Offline Mutation Queue** — Queue mutations when offline, auto-sync when back online
- **Query Persister** — Persist React Query cache to localStorage for instant hydration
- **WebSocket Client** — Auto-reconnecting PubSub with exponential backoff
- **Record Cache** — Type-safe in-memory cache with version conflict resolution and optimistic updates
- **Record Storage** — IndexedDB persistence with automatic fallback to localStorage
- **Undo/Redo Stack** — Generic operation history with grouping support

---

## Core Package

- **API Contracts** — Type-safe contracts with ts-rest for client-server communication
- **Validation Schemas** — Zod schemas for runtime validation (auth, user, environment)
- **Pagination System** — Cursor-based pagination with encoding/decoding utilities
- **Shared Stores** — Framework-agnostic stores (toastStore, tokenStore)
- **Error Types** — Custom HTTP error classes with utilities

---

## Development Automation

`pnpm dev` runs all sync watchers in watch mode (quiet by default):

| Tool                | Purpose                                                          |
| ------------------- | ---------------------------------------------------------------- |
| `sync-path-aliases` | Auto-generates TS path aliases when directories add `index.ts`   |
| `sync-file-headers` | Adds `// path/to/file.ts` headers on new files                   |
| `sync-test-folders` | Creates `__tests__/` folders for code directories                |
| `sync-tsconfig`     | Auto-generates TypeScript project references                     |
| `sync-linting`      | Syncs linting config to `package.json` + `.vscode/settings.json` |
| `sync-css-theme`    | Rebuilds `theme.css` when theme tokens change                    |

**Path alias configuration:**

- Max depth: 3 levels from `src/` (e.g., `src/features/auth/components`)
- Excluded names: `utils`, `helpers`, `types`, `constants` (use relative imports)
- Shallower directories win for duplicate names

---

## Audit Tools

```bash
pnpm audit:deps      # Dependency analysis (unused, outdated, security)
pnpm audit:security  # Security vulnerability scanning with CVSS scores
pnpm audit:build     # Bundle size monitoring and optimization suggestions
pnpm audit:bundle    # Build performance analysis and bottleneck detection
pnpm audit:all       # Run all audit tools
```

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

See [`docs/todo/ROADMAP.md`](docs/todo/ROADMAP.md) for planned features:

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
