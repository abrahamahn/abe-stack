# ABE Stack Documentation

**Last Updated: January 10, 2026**

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
│   ├── web/          # Vite + React web app
│   ├── desktop/      # Electron (Tauri-ready)
│   └── server/       # Fastify API
├── packages/
│   ├── ui/           # Shared component library (700+ tests)
│   ├── api-client/   # Type-safe ts-rest client
│   ├── db/           # Drizzle ORM + PostgreSQL
│   ├── shared/       # Utils, types, validation
│   └── storage/      # S3/local file storage
├── config/           # Docker, env, test configs
└── tools/            # Dev scripts
```

### Tech Stack

| Layer    | Technology                                        |
| -------- | ------------------------------------------------- |
| Frontend | React 19, Vite, TanStack Query                    |
| Backend  | Fastify, ts-rest, Zod                             |
| Database | PostgreSQL, Drizzle ORM                           |
| Auth     | JWT (access + refresh tokens), bcrypt, role-based |
| Testing  | Vitest (1000+ tests), Playwright E2E              |
| Tooling  | Turborepo, pnpm, ESLint, Prettier                 |

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
cp config/.env.example config/.env.development
pnpm dev
```

---

## Documentation Index

### Architecture

- [Architecture Overview](./architecture/index.md) - Current structure and design principles
- [V5 Architecture Proposal](./architecture/v5-proposal.md) - Proposed layer-based restructure
- [CHET-Stack Comparison](./architecture/chet-comparison.md) - Real-time collaboration features
- [Realtime Overview](./architecture/realtime/overview.md) - WebSocket pub/sub system
- [Realtime Architecture](./architecture/realtime/architecture.md) - Detailed sync architecture
- [Realtime Implementation](./architecture/realtime/implementation-guide.md) - Step-by-step guide
- [Realtime Patterns](./architecture/realtime/patterns.md) - Common patterns and examples

### Security

- [Phase 1 Complete](./security/phase-1-complete.md) - Auth security implementation
- [Phase 2 Roadmap](./security/phase-2-roadmap.md) - Future security enhancements

### Development

- [Testing Guide](./dev/testing.md) - Testing strategy and setup
- [Workflows](./dev/workflows.md) - CI/CD and development workflows
- [Roadmap](./ROADMAP.md) - Project roadmap and milestones

### UI

- [UI Priorities](./ui/todo.md) - UI component priorities and remaining work

### Logs

- [Changelog](./CHANGELOG.md) - Detailed change history

---

## What's Next

See the [Roadmap](./ROADMAP.md) for the full implementation plan:

1. **V5 Migration** - Restructure to `frontend/`, `backend/`, `shared/` layers
2. **CHET-Stack Features** - Add pub/sub, WebSockets, offline support
3. **Security Phase 2** - Enhanced auth, rate limiting, audit logging
4. **UI Polish** - Remaining component tests and accessibility

---

## Contributing

Found a bug? Want to add a feature? Open an issue or PR.

## License

MIT © 2026 ABE Stack Contributors
