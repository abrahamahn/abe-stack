# BSLT

**A full-stack TypeScript boilerplate for shipping real apps — fast.**

I got tired of spending weeks on every new project just setting up the same things: monorepo config, auth, database, UI components, testing, Docker, CI... only to finally start building what actually mattered.

So I built **BSLT** — one clean, production-ready foundation that powers web, desktop, and backend from a single repo. The goal? Go from idea to deployed app in days instead of months.

---

## Why BSLT

|                                      |                                                                 |
| ------------------------------------ | --------------------------------------------------------------- |
| **One codebase, multiple platforms** | Web (Vite + React), Desktop (Electron), Fastify backend         |
| **No framework lock-in**             | React is just the renderer — all logic lives in shared packages |
| **Speed without chaos**              | Turborepo caching, parallel builds, minimal config              |
| **Production-ready from day one**    | Secure defaults, Docker, strict types, env validation           |
| **Joyful development**               | Fast feedback, zero config fatigue, everything just works       |

---

## What's Inside

### Architecture

- **Monorepo** — Turborepo + pnpm workspaces
- **Frontend** — React 19 (web via Vite, desktop via Electron)
- **Backend** — Fastify + Drizzle ORM + PostgreSQL
- **Contracts** — Type-safe API with ts-rest + Zod
- **Pagination** — Cursor-based for feeds and lists (50k+ users ready)

### Auth & Security

- **Authentication** — JWT with refresh rotation, password reset, email verification, OAuth, TOTP 2FA
- **RBAC** — Role-based access with multi-tenant workspaces
- **Security Headers** — CSP with nonce-based execution, COEP/COOP/CORP, HSTS
- **Rate Limiting** — Role-based limits with progressive delays
- **CSRF Protection** — AES-256-GCM encrypted tokens with timing-safe comparison
- **Input Validation** — XSS prevention, SQL/NoSQL injection detection, comprehensive sanitization
- **Audit Logging** — Security event tracking, intrusion detection, risk scoring (0–100)

### Infrastructure

- **Terraform** — Modules for DigitalOcean and Google Cloud
- **CI/CD** — GitHub Actions for testing, building, and deployment
- **Multi-Environment** — Staging and production support
- **Docker** — Compose for local development and production

### Developer Experience

- **TypeScript strict mode** with end-to-end type safety
- **5,300+ tests** — Vitest unit + Playwright E2E
- **ESLint + Prettier + git hooks** — enforced quality gates
- **Shared UI library** — components, hooks, layouts (browse at `/ui-library`)
- **Theming** — CSS custom properties with dark/light mode support

---

## Getting Started

### Prerequisites

```bash
node --version   # 20.x or higher
pnpm --version   # 10.x or higher
```

### 1. Clone and install

```bash
git clone https://github.com/abrahamahn/bslt.git
cd bslt
pnpm install
```

### 2. Configure environment

```bash
# Docker Postgres (recommended)
cp config/env/.env.development.example config/env/.env.development

# — OR — Local Postgres
cp config/env/.env.local.example config/env/.env.local
```

**Defaults:** PostgreSQL on localhost, console email (logs to terminal), local file storage. See [config/env/README.md](config/env/README.md) for details.

### 3. Start the database

**Docker Postgres:**

```bash
docker compose \
  --env-file config/env/.env.development \
  -f infra/docker/development/docker-compose.dev.yml \
  up -d
pnpm db:push
pnpm db:seed
```

**Local Postgres:**

```bash
createdb abe_stack_dev
ENV_FILE=config/env/.env.local pnpm db:push
ENV_FILE=config/env/.env.local pnpm db:seed
```

### 4. Start development

```bash
pnpm dev
```

| Service     | URL                                            |
| ----------- | ---------------------------------------------- |
| Web app     | [http://localhost:5173](http://localhost:5173) |
| API server  | [http://localhost:8080](http://localhost:8080) |
| Desktop app | Electron window (optional)                     |

### 5. Verify it works

1. Open [http://localhost:5173](http://localhost:5173)
2. Register an account
3. Check your terminal for the verification email
4. Log in and explore the UI library at `/ui-library`

### Troubleshooting

| Problem                   | Fix                                                              |
| ------------------------- | ---------------------------------------------------------------- |
| Database connection error | Ensure PostgreSQL is running and credentials match your env file |
| Port already in use       | Change `APP_PORT` or `API_PORT` in your env file                 |
| Module not found          | Run `pnpm install` again                                         |

---

## Commands

### Development

| Command            | Description                  |
| ------------------ | ---------------------------- |
| `pnpm dev`         | Start all apps with watchers |
| `pnpm dev:web`     | Start web app only           |
| `pnpm dev:server`  | Start server only            |
| `pnpm dev:desktop` | Start desktop app only       |

### Build & Quality

| Command           | Description                                 |
| ----------------- | ------------------------------------------- |
| `pnpm build`      | Full build with lint, type-check, and tests |
| `pnpm build:fast` | Build without tests                         |
| `pnpm lint`       | Check linting (max 0 warnings)              |
| `pnpm type-check` | Run TypeScript type checking                |
| `pnpm format`     | Format with Prettier                        |

### Testing

| Command              | Description                    |
| -------------------- | ------------------------------ |
| `pnpm test`          | Run all tests                  |
| `pnpm test:watch`    | Run tests in watch mode        |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm test:e2e`      | Run Playwright E2E tests       |

### Database

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `pnpm db:restart`   | Restart database container         |
| `pnpm db:reset`     | Reset database to clean state      |
| `pnpm db:bootstrap` | Initialize database with seed data |

---

## Feature Coverage

BSLT ships with production-ready implementations across these domains:

- **Identity & Access** — Registration, login, email verification, password reset, OAuth, TOTP 2FA, session management
- **Teams & Workspaces** — Multi-tenant with roles, memberships, invitations, permission gating
- **Billing** — Stripe/PayPal plumbing, plan definitions, pricing UI, checkout flows
- **Notifications & Audit** — Email infrastructure, security event tracking, admin views
- **Realtime & Media** — WebSocket transport, media processing, file storage
- **Compliance & Ops** — GDPR scaffolding, admin surfaces, CI/CD tooling

For detailed progress, see [`docs/todo/TODO.md`](docs/todo/TODO.md). For deferred features (real-time sync, WebAuthn, API versioning), see [`docs/todo/ROADMAP.md`](docs/todo/ROADMAP.md).

---

## Contributing

Found a bug? Want to add a feature? Have a better way to do something?

Open an issue or PR. All contributions welcome.

---

## License

MIT © 2026 BSLT Contributors

---

Built by one developer who just wanted to ship faster.
Now it's yours too.
