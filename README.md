# ABE Stack - The Fastest, Serious Full-Stack Starter You’ve Seen.

**A full-stack TypeScript boilerplate for shipping real apps — fast.**

I got tired of spending weeks on every new project just setting up the same things: monorepo config, auth, database, UI components, testing, Docker, CI... only to finally start building what actually mattered.

So I built **ABE Stack** — one clean, production-ready foundation that powers web, desktop, and backend from a single repo. The goal? Let you (and me) go from idea to deployed app in days instead of months.

Whether you're building a personal fitness coach, a music production tool, a bookkeeping app, or your next startup — this stack gets the boring (but critical) stuff out of the way so you can focus on what makes your product unique.

https://github.com/abrahamahn/abe-stack

### Why I Built This

- **One codebase, multiple platforms** → Web (Vite + React), Desktop (Electron, Tauri-ready), and a Fastify backend.
- **No framework lock-in** → React is just the renderer. All real logic lives in shared packages — swap UI layers later if you want.
- **Speed without chaos** → Turborepo caching, parallel builds, minimal config.
- **Production-ready from day one** → Secure defaults, Docker, strict types, env validation.
- **Joyful development** → Fast feedback, zero config fatigue, everything just works.

### What's Inside

**Core Stack**

- Monorepo powered by Turborepo + pnpm workspaces
- Frontend: React 19 (web via Vite, desktop via Electron)
- Backend: Fastify + Drizzle ORM + PostgreSQL
- API: Type-safe contracts with `ts-rest` + Zod
- Auth: JWT with refresh rotation, password reset, email verification, role-based access
- Password Strength: Custom validator (~5KB) with entropy scoring and common password detection

**Quality & Developer Experience**

- Full TypeScript strict mode with end-to-end safety
- 1900+ tests (Vitest unit tests + Playwright E2E)
- ESLint + Prettier + git hooks (no bad code slips through)
- Comprehensive shared UI library (16 components, 25 elements, 13 hooks, 14 layouts) with interactive demo at `/demo`
- State: React Query for server state, offline mutation queue
- Theming, hooks, layouts, resizable panels — all reusable

### Development Automation

`pnpm dev` runs all sync watchers in watch mode (quiet by default).

| Tool                  | Purpose                                                          |
| --------------------- | ---------------------------------------------------------------- |
| `sync-path-aliases`   | Auto-generates TS path aliases when directories add `index.ts`   |
| `sync-file-headers`   | Adds `// path/to/file.ts` headers on new files                   |
| `sync-test-folders`   | Creates `__tests__/` folders for code directories                |
| `sync-barrel-exports` | Auto-creates and updates `index.ts` barrels                      |
| `sync-tsconfig`       | Auto-generates TypeScript project references                     |
| `sync-linting`        | Syncs linting config to `package.json` + `.vscode/settings.json` |
| `sync-css-theme`      | Rebuilds `theme.css` when theme tokens change                    |

`sync-tsconfig` and `sync-linting` run on demand (and in pre-commit) to keep references and linting aligned.

**Path alias configuration:**

- Max depth: 3 levels from `src/` (e.g., `src/features/auth/components`)
- Excluded names: `utils`, `helpers`, `types`, `constants` (use relative imports instead)
- Shallower directories win for duplicate names

### Repository Layout

```
abe-stack/
├── apps/
│   ├── web/          # Vite + React web app
│   ├── desktop/      # Electron (Tauri-ready)
│   └── server/       # Fastify API (infra/ + modules/)
├── packages/
│   ├── ui/           # 16 components, 25 elements, 12 hooks, 28 layouts
│   ├── sdk/          # Type-safe API client + React Query + offline support
│   ├── core/         # Contracts, validation, stores, constants, errors
│   └── tests/        # Shared test utilities, mocks, and constants
├── config/           # Docker, env, test configs
└── tools/            # Dev scripts (sync watchers)
```

### SDK Features

- **Type-safe API Client:** Built on `ts-rest` with automatic request/response typing
- **React Query Integration:** Custom hooks for data fetching with caching
- **Offline Mutation Queue:** Queue mutations when offline, auto-sync when back online
- **Query Persister:** Persist React Query cache to localStorage for instant hydration

### Core Package

- **API Contracts:** Type-safe contracts with `ts-rest` for client-server communication
- **Validation Schemas:** Zod schemas for runtime validation (auth, user, environment)
- **Shared Stores:** Framework-agnostic stores (toastStore, tokenStore)
- **Constants:** Time conversions, HTTP status codes
- **Error Types:** Custom HTTP error classes with utilities

### Architecture Philosophy

```
apps/*           → Thin renderers (just UI)
                 ↓
packages/*       → Where the real logic lives (shared, framework-agnostic)
```

Change your mind about React later? Only touch `apps/`. Everything else stays.

### Quick Start

#### Option 1: Instant Run (Docker — <5 minutes)

```bash
git clone https://github.com/abrahamahn/abe-stack.git
cd abe-stack
docker compose -f config/docker/docker-compose.yml up --build
```

→ Open [http://localhost:3000](http://localhost:3000) — full stack running.

#### Option 2: Local Development

```bash
corepack enable
corepack prepare pnpm@10.26.2 --activate

git clone https://github.com/abrahamahn/abe-stack.git
cd abe-stack
pnpm install

cp config/.env/.env.example config/.env/.env.development
# Edit with your DB/Redis creds and secrets

pnpm dev
```

### Infrastructure & Health Monitoring

- **Rate Limiting:** Token bucket algorithm with customizable limits and pluggable store (Memory → Redis)
- **Security Headers:** Comprehensive HTTP security headers (CSP, HSTS, X-Frame-Options, etc.)
- **Audit Logging:** Security events table for token reuse, lockouts, and admin actions
- **Health Endpoints:** Detailed service status, readiness/liveness probes (`/health/ready`, `/health/live`), route listing
- **Startup Validation:** Formatted summary showing all service statuses on server start
- **Database Transactions:** Atomic transaction wrapper for auth operations (registration, login, token rotation)
- **Optimistic Locking:** Version-based concurrency control for collaborative editing (409 Conflict on mismatch)
- **Storage Providers:** Pluggable local and S3 storage with static file serving
- **Structured Logging:** Pino logger with correlation IDs, request context, and child loggers
- **Background Jobs:** Queue system with PostgreSQL persistence and in-memory stores (Chet-stack pattern)
- **Write Service:** Unified write pattern with transaction support and automatic PubSub publishing

### Real-Time Infrastructure

- **WebSocket Server:** Built on `@fastify/websocket` for real-time updates
- **Postgres PubSub:** Horizontal scaling via Postgres LISTEN/NOTIFY
- **Subscription Manager:** Handles subscriptions with initial data push (Chet-stack pattern)
- **publishAfterWrite:** Helper to broadcast version updates after database writes

### Security Hardening

- **Token Reuse Detection:** Automatic family revocation on refresh token reuse
- **Account Lockout:** Progressive delays after failed login attempts
- **IP Validation:** Proxy-aware IP extraction with CIDR support for trusted proxies
- **Admin Unlock:** `POST /api/admin/auth/unlock` endpoint with audit trail
- **Strict JWT:** Algorithm validation (HS256 only), format checks, proper error handling
- **Memory Token Storage:** Access tokens stored in memory (not localStorage) to prevent XSS
- **Secure Password Reset:** Argon2id-hashed tokens with 24h expiry and single-use enforcement
- **WebSocket Auth:** Subprotocol header or HTTP-only cookie (no URL query params)

### Email Service

- **Multiple Providers:** Console (dev) and SMTP (production) email services
- **HTML Templates:** Shared email templates for verification, password reset, magic links
- **Layout Helper:** Consistent HTML email structure with reusable styles

### Error Handling

- **Type-safe HTTP Errors:** Custom error classes (`ValidationError`, `UnauthorizedError`, `NotFoundError`, etc.)
- **Standardized Responses:** Consistent `ApiErrorResponse` shape across all endpoints
- **Error Utilities:** `isHttpError()`, `getSafeErrorMessage()`, `getErrorStatusCode()`

### Server Architecture

- **App Class (DI Container):** Single entry point managing all services and lifecycle (start/stop)
- **ServerEnvironment Pattern:** Single context object for all dependencies (framework-agnostic handlers)
- **Centralized Config:** Split config files (auth, database, email, server, storage) with Zod validation
- **Hybrid Architecture:** Clean separation between `infra/` (infrastructure) and `modules/` (business logic)

### Coming Soon

- MFA support (TOTP with authenticator apps)
- GDPR/HIPAA-ready data handling templates

### Contributing

This is still growing — and I’d love your help making it better.

Found a bug? Want to add a feature? Have a better way to do something?

Open an issue or PR. All contributions welcome.

### License

MIT © 2026 ABE Stack Contributors

---

Built by one developer who just wanted to ship faster.
Now it’s yours too.

⭐ Star on GitHub if this helps you move faster.
