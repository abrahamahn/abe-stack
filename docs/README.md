# ABE Stack Documentation

**Last Updated: January 17, 2026**

A full-stack TypeScript boilerplate for shipping real apps fast. Web, desktop, mobile, and backend from a single monorepo.

---

## Why ABE Stack?

- **One codebase, multiple platforms** - Web (Vite + React), Desktop (Electron/Tauri), Mobile (React Native), and Fastify backend
- **No framework lock-in** - React is just the renderer; all logic lives in shared packages
- **Speed without chaos** - Turborepo caching, parallel builds, minimal config
- **Production-ready from day one** - Secure defaults, Docker, strict types, env validation
- **Real-time ready** - Architecture designed for collaborative features via CHET-Stack patterns

---

## Current Stack

### Monorepo Structure

```
abe-stack/
├── apps/
│   ├── web/           # Vite + React web app
│   ├── desktop/       # Electron (Tauri-ready)
│   └── server/        # Fastify API server
│       └── src/
│           ├── modules/   # Feature modules (auth, users)
│           └── infra/     # Database, storage, security, pubsub
├── packages/
│   ├── core/          # Contracts, validation, stores, utils
│   ├── ui/            # Shared component library (700+ tests)
│   └── sdk/           # Type-safe ts-rest client
├── config/            # Docker, env, test configs
└── tools/             # Dev scripts
```

### Tech Stack

| Layer    | Technology                                          |
| -------- | --------------------------------------------------- |
| Frontend | React 19, Vite, TanStack Query                      |
| Backend  | Fastify, ts-rest, Zod                               |
| Database | PostgreSQL, Drizzle ORM                             |
| Auth     | JWT (access + refresh tokens), Argon2id, role-based |
| Testing  | Vitest (1900+ tests), Playwright E2E                |
| Tooling  | Turborepo, pnpm, ESLint, Prettier                   |

### What's Built

- Full JWT auth with refresh tokens and role-based access
- 25+ UI elements, 16 components, 14 layouts, 13 hooks
- Interactive component demo at `/demo`
- Type-safe API contracts with runtime validation
- Pluggable storage (local/S3)
- Docker-ready deployment

---

## Quick Start

### Option 1: Docker (5 minutes)

```bash
git clone https://github.com/abrahamahn/abe-stack.git
cd abe-stack
docker compose -f config/docker/docker-compose.yml up --build
```

Open [http://localhost:3000](http://localhost:3000)

### Option 2: Local Development

```bash
corepack enable && corepack prepare pnpm@10.26.2 --activate
git clone https://github.com/abrahamahn/abe-stack.git
cd abe-stack && pnpm install
cp config/.env/.env.example config/.env/.env.development
pnpm dev
```

---

## Documentation

For full documentation, see [INDEX.md](./INDEX.md) - the complete navigation guide.

Key sections:

- **[Architecture](./dev/architecture.md)** - System design and structure
- **[Security](./todo/security/index.md)** - Auth implementation and roadmap
- **[Roadmap](./ROADMAP.md)** - Project milestones and tasks
- **[Changelog](./CHANGELOG.md)** - Change history

---

## Keyword Routing

- Automation, sync tools, dev watchers → [docs/dev/architecture.md](./dev/architecture.md)
- Path aliases, import aliases → [docs/dev/principles.md](./dev/principles.md)
- File headers, code conventions → [docs/dev/principles.md](./dev/principles.md)
- Barrel exports, `index.ts` patterns → [docs/dev/architecture.md](./dev/architecture.md)
- `__tests__` folders, test structure → [docs/dev/architecture.md](./dev/architecture.md)

---

## What's Next

See the [Roadmap](./ROADMAP.md) for the full implementation plan:

1. **CHET-Stack Features** - Real-time collaboration, offline support, undo/redo
2. **Security Phase 2** - Passport.js integration, OAuth providers, MFA
3. **V5 Architecture** - Migration to layer-based structure

---

## Contributing

Found a bug? Want to add a feature? Open an issue or PR.

## License

MIT © 2026 ABE Stack Contributors
