# ABE Stack

Developer-velocity boilerplate for shipping production-grade apps fast. One TypeScript monorepo powers web (Vite + React), desktop (Electron today, Tauri-ready), and mobile (React Native) with a Fastify/PostgreSQL backend and shared UI/API/util packages. The renderers stay thin; business logic and infrastructure live in shared code to stay framework-agnostic.

## Tech Highlights

- **Monorepo tooling:** Turborepo + pnpm workspaces, TypeScript end-to-end
- **Clients:** React 19 web (Vite), Electron desktop (Tauri pathway compatible), React Native mobile
- **UI/UX baseline:** Resizable, paneled layout (top/bottom/left/right + main) for the home experience; shared UI kit for consistency
- **Server:** Fastify, JWT auth with bcrypt, Drizzle ORM + PostgreSQL, email verification hook points
- **API contract:** ts-rest + Zod single source of truth for server routes and typed clients
- **Shared packages:** API client, UI kit, shared utilities/models
- **Tooling:** ESLint/Prettier, Vitest/Playwright, React Query, dotenv-flow for env management

## Repository Layout

- `apps/web` – Vite + React web app
- `apps/desktop` – Electron app using the shared UI
- `apps/mobile` – React Native app
- `apps/server` – Fastify API server (Drizzle/Postgres)
- `packages/api-client` – Typed client for the server APIs
- `packages/shared` – Shared utilities/types
- `packages/ui` – Reusable UI components
- `packages/db` – Drizzle schema/config
- `config` – Build/test configs and env samples
- `tools` – Developer utilities (e.g., code export, setup scripts)

## Requirements

- Node `>=18.19 <25`
- pnpm `10.26.2` (matching `packageManager`)
- PostgreSQL reachable at the URL defined in `config/.env.*` (defaults to `postgres://postgres@localhost:5432/abe_stack_dev`)

## Setup

1. Install dependencies: `pnpm install`
2. Copy env templates: `cp config/.env.example config/.env.development` (adjust for your environment)
3. Start development (all apps via Turborepo): `pnpm dev`
   - Web only: `pnpm dev:web`
   - Server only: `pnpm dev:server`
   - Desktop only: `pnpm dev:desktop`
   - Mobile: `pnpm --filter @abe-stack/mobile start`

Common tasks:

- Build all: `pnpm build`
- Lint all: `pnpm lint`
- Type-check all: `pnpm type-check`
- Run tests: `pnpm test` (see `config/playwright.config.ts` and `config/vitest.config.ts` for test setups)
- Export code snapshot: `pnpm export` (writes `full_code.txt` at repo root)

## Environment Notes

- Server loads env via `dotenv-flow` with base path `config/`
- Drizzle config lives in `packages/db/drizzle.config.ts`
- Git hooks via `simple-git-hooks` run linting/type-checking on push
