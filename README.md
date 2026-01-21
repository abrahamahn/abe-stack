# ABE Stack

> A boilerplate that ships, not a framework you fight.

I kept rebuilding the same foundation for every project: monorepo setup, authentication, database layer, UI components, testing infrastructure, Docker, CI pipelines. Weeks of work before writing any actual product code.

ABE Stack is that foundation, extracted and refined. It handles auth, security, data layer, and UI so you can focus on what makes your product different.

## Features

- **Cookie-based auth** — JWT with refresh rotation, account lockout, audit logging
- **Realtime updates** — WebSocket pub/sub with automatic reconnection
- **Offline mode** — Mutation queue syncs when connection returns
- **Undo/redo** — Built-in operation history with grouping support
- **End-to-end testing** — Playwright E2E, Vitest unit tests, 5,300+ tests total
- **Runs in a single process** — Scales when you need to

---

## Getting Started

```bash
git clone https://github.com/abrahamahn/abe-stack.git && cd abe-stack
corepack enable && corepack prepare pnpm@10.26.2 --activate
pnpm install
cp config/.env/.env.example config/.env/.env.development
pnpm dev
```

Open [localhost:3000](http://localhost:3000).

**Or with Docker:**

```bash
docker compose -f config/docker/docker-compose.yml up --build
```

---

## What Makes This Different

### The SDK Does More Than Fetch

Most boilerplates give you a typed API client and call it a day. This SDK handles what happens when the network isn't reliable:

- **Mutation queue** — Writes are queued when offline and replayed on reconnect
- **Record cache** — In-memory cache with optimistic updates and conflict resolution
- **Persistence** — IndexedDB storage with localStorage fallback
- **Undo/redo** — Operation history with grouping support

The architecture is inspired by Notion's data layer — everything can run in a single process, but the abstractions make it easy to break pieces out when you need to scale.

### The Server Is Production-Ready

Not a toy example. The Fastify server includes everything you need:

- **Auth that works** — JWT tokens with refresh rotation, password reset flow, email verification, role-based access control
- **Security defaults** — CSP headers with nonce-based scripts, COEP/COOP/CORP isolation, HSTS, encrypted CSRF tokens
- **Rate limiting** — Per-route limits with role-based overrides
- **Audit logging** — Track login attempts, password changes, suspicious activity
- **WebSocket pub/sub** — Real-time updates with automatic channel management

### Strict TypeScript, No Exceptions

Every line of code passes the same standards:

- **`strict: true`** — All strict flags enabled (noImplicitAny, strictNullChecks, etc.)
- **No `any` types** — Use `unknown` and type guards instead
- **No `eslint-disable`** — Fix the issue, don't silence it
- **Explicit return types** — Required on exported functions
- **Zod validation** — Runtime type checking at API boundaries

---

## Structure

### Apps

| App            | Stack                          | Purpose                            |
| -------------- | ------------------------------ | ---------------------------------- |
| `apps/web`     | Vite + React 19                | Web frontend                       |
| `apps/desktop` | Electron                       | Desktop app (shares code with web) |
| `apps/server`  | Fastify + Drizzle + PostgreSQL | API backend                        |

### Packages

| Package           | Purpose                                    | Docs                                                       |
| ----------------- | ------------------------------------------ | ---------------------------------------------------------- |
| `@abe-stack/core` | Contracts, validation, stores, error types | [`packages/core/README.md`](packages/core/README.md)       |
| `@abe-stack/ui`   | 25 elements, 16 components, 14 layouts     | [`packages/ui/docs/README.md`](packages/ui/docs/README.md) |
| `@abe-stack/sdk`  | API client, caching, offline, undo/redo    | [`packages/sdk/README.md`](packages/sdk/README.md)         |

> **Dependency rule:** Apps import packages. Packages never import apps. Domain logic stays framework-agnostic.

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

## Repository Layout

```
abe-stack/
├── apps/
│   ├── web/              # React frontend
│   ├── desktop/          # Electron app
│   └── server/           # Fastify API
├── packages/
│   ├── core/             # Shared domain logic
│   ├── ui/               # Component library
│   └── sdk/              # API client and data layer
├── config/               # Build and environment configs
├── tools/                # Development scripts
└── docs/                 # Documentation
```

---

## Roadmap

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for planned features:

- **MFA** — TOTP support with authenticator apps
- **Data handling templates** — GDPR/HIPAA patterns

---

## Contributing

Issues and pull requests welcome.

---

## License

MIT © 2026 ABE Stack Contributors

---

Built to ship faster. Now it's yours.

[GitHub](https://github.com/abrahamahn/abe-stack)
