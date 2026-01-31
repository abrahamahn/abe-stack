# Quickstart: Monorepo (Full Stack)

Get all three apps running locally with one command.

---

## Prerequisites

| Tool       | Version  | Check                |
| ---------- | -------- | -------------------- |
| Node.js    | 20+      | `node --version`     |
| pnpm       | 10+      | `pnpm --version`     |
| PostgreSQL | 14+      | `pg_isready`         |

**Install pnpm** (if missing):

```bash
corepack enable && corepack prepare pnpm@latest --activate
```

**Start PostgreSQL** (if not running):

```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Windows
net start postgresql-x64-14   # adjust version
```

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/abrahamahn/abe-stack.git
cd abe-stack
pnpm install
```

### 2. Configure environment

```bash
cp .config/env/.env.development.example .config/env/.env.development
```

Defaults work out of the box:

- **Database:** `postgresql://postgres:postgres@localhost:5432/abe_stack_dev`
- **Email:** Console (prints to terminal)
- **Storage:** Local filesystem (`apps/server/uploads`)
- **Cache:** In-memory
- **Search:** SQL-based

For custom settings, create `.config/env/.env.local` (gitignored). See [.config/env/README.md](../../.config/env/README.md).

### 3. Initialize database

```bash
createdb abe_stack_dev
pnpm db:bootstrap
```

### 4. Start everything

```bash
pnpm dev
```

This starts:

| Service     | URL                           | Description                    |
| ----------- | ----------------------------- | ------------------------------ |
| Web app     | http://localhost:5173         | Vite + React frontend          |
| API server  | http://localhost:8080         | Fastify backend                |
| Desktop     | Electron window               | Native desktop app (optional)  |
| Sync tools  | Background                    | Path aliases, headers, theme   |

### 5. Verify

1. Open http://localhost:5173
2. Click **Register** and create an account
3. Check your terminal for the verification email (console provider)
4. Log in and visit `/demo` to explore the UI kit

---

## Running Individual Apps

```bash
pnpm dev:web       # Web only (port 5173)
pnpm dev:server    # Server only (port 8080)
pnpm dev:desktop   # Desktop only (Electron)
```

Or use pnpm filters:

```bash
pnpm --filter @abe-stack/web dev
pnpm --filter @abe-stack/server dev
pnpm --filter @abe-stack/desktop dev:standalone
```

---

## Docker Alternative

Skip PostgreSQL and Node.js setup entirely:

```bash
git clone https://github.com/abrahamahn/abe-stack.git && cd abe-stack
docker compose -f infra/docker/development/docker-compose.yml up --build
```

Runs PostgreSQL, API server, and web frontend in containers.

---

## Common Commands

| Command              | Description                         |
| -------------------- | ----------------------------------- |
| `pnpm dev`           | Start all apps + sync watchers      |
| `pnpm build`         | Full build with lint, types, tests  |
| `pnpm test`          | Run all tests                       |
| `pnpm lint`          | Lint all packages                   |
| `pnpm type-check`    | TypeScript type checking            |
| `pnpm format`        | Prettier format all files           |
| `pnpm db:bootstrap`  | Initialize database with seed data  |
| `pnpm db:push`       | Push Drizzle schema to PostgreSQL   |
| `pnpm clean`         | Remove dist, .turbo, caches        |
| `pnpm health-check`  | Project health audit                |

---

## Troubleshooting

**Database connection error:**
Ensure PostgreSQL is running and credentials in `.config/env/.env.development` match. Default expects `postgres:postgres` on `localhost:5432`.

**Port already in use:**
`pnpm dev` auto-kills ports 5173, 8080, and 3000 on startup. If issues persist, override `APP_PORT` or `API_PORT` in `.config/env/.env.local`.

**Module not found:**
Run `pnpm install` again. If workspace packages are missing, try `pnpm install --force`.

**Type errors after pulling:**
Run `pnpm type-check` to see specific errors. Workspace package types may need rebuilding with `pnpm build`.

---

## Next Steps

- [Web Quickstart](./web.md) -- frontend development details
- [Server Quickstart](./server.md) -- backend development details
- [Desktop Quickstart](./desktop.md) -- Electron app details
- [Architecture](../specs/architecture.md) -- how the monorepo is structured
- [Deployment](../deploy/README.md) -- production deployment guides
