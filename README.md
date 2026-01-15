# ABE Stack

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
- Auth: JWT foundation with Argon2id hashing, refresh tokens, and role-based access

**Quality & Developer Experience**

- Full TypeScript strict mode with end-to-end safety
- Comprehensive test coverage (Vitest + Playwright)
- ESLint + Prettier + git hooks (no bad code slips through)
- Comprehensive shared UI library with interactive demo at `/demo`
- State: React Query for server state
- Theming, hooks, layouts, resizable panels — all reusable

### Repository Layout

```
abe-stack/
├── apps/
│   ├── web/          # Vite + React web app
│   ├── desktop/      # Electron (Tauri-ready)
│   └── server/       # Fastify API
├── packages/
│   ├── ui/           # Shared component library + demo
│   ├── sdk/          # Type-safe API client
│   └── core/         # Contracts, validation, shared logic
├── config/           # Docker, env, test configs
└── tools/            # Dev scripts
```

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

cp config/.env.example config/.env.development
# Edit with your DB/Redis creds and secrets

pnpm dev
```

### Coming Very Soon

- MFA support
- Rate limiting & security headers
- Logging and audit trails
- GDPR/HIPAA-ready templates

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
