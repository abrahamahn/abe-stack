# Development Workflow

## Quick Start

```bash
pnpm install          # Install all dependencies
pnpm dev              # Start server + web dev servers (with sync scripts)
pnpm dev:desktop      # Start server + desktop dev servers
pnpm dev:all          # Start all dev servers
```

The `pnpm dev` command runs sync scripts (file headers, theme CSS) alongside the Vite dev server (port 5173) and Fastify API server (port 8080).

## Core Commands

| Command             | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| `pnpm dev`          | Start dev servers (web + API)                    |
| `pnpm build`        | Full build: compile + lint + type-check + test   |
| `pnpm test`         | Run all tests (turbo cached, errors-only output) |
| `pnpm test:verbose` | Run all tests with full output                   |
| `pnpm lint`         | Lint all packages via turbo                      |
| `pnpm lint:fix`     | Lint with auto-fix                               |
| `pnpm type-check`   | Type-check all packages via turbo                |
| `pnpm format`       | Format all files with Prettier                   |
| `pnpm format:check` | Check formatting without writing                 |
| `pnpm clean`        | Remove all dist/build/node_modules               |

### Targeted Checks (During Development)

```bash
# Lint specific changed files
npx eslint src/path/to/file.ts

# Type-check a single package
pnpm --filter @bslt/web type-check
pnpm --filter @bslt/server type-check
pnpm --filter @bslt/ui type-check

# Run a specific test file
pnpm test -- --run src/path/to/file.test.ts

# Format specific files
npx prettier --config config/.prettierrc --write src/path/to/file.ts
```

## Git Hooks

Hooks are stored in `infra/git-hooks/` and installed via `pnpm prepare` (runs `git config --local core.hooksPath infra/git-hooks`).

### Pre-commit

Skips if no staged changes. Otherwise runs:

1. **Sync file headers** (`pnpm sync:headers:staged`) -- ensures `// path/to/file.ts` headers on staged files
2. **lint-staged** -- formats (Prettier) and lints (ESLint) staged `.ts/.tsx/.js/.jsx` files; formats staged `.json/.css/.md/.yml` files

### Pre-push

Skips if refs are already up-to-date. Otherwise runs:

1. **Cache maintenance** (`pnpm hooks:cache:maintain`)
2. **Header sync check** (`pnpm sync:headers:check`)
3. **Full validation** via turbo (`lint`, `type-check`, `test`)

## CI Pipeline

CI is defined in `.github/workflows/ci.yml`. It triggers on:

- **Push** to `main` or `dev`
- **Pull requests** to any branch
- **Scheduled** daily at 02:00 UTC
- **Manual** dispatch (with optional `full_build` flag)

### Pipeline Structure

```
setup               → Determines if full build is needed
sanity-checks       → Format check, lint, type-check, tests
build-and-verify    → Full ci:verify (only on push/schedule/manual)
docker-build-publish → Build and push Docker images (only on main push)
```

**Concurrency**: Cancels in-progress runs for the same branch (`ci-${{ github.ref }}`).

### Sanity Checks Job

1. Install dependencies (`pnpm install --frozen-lockfile`)
2. Check file headers (`pnpm sync:headers:check`)
3. Format check (`pnpm format:check:ci`)
4. Lint (`pnpm lint`)
5. Type-check (`pnpm type-check`)
6. Run tests (`pnpm test`)

### Full Build (Push/Schedule Only)

Runs `pnpm ci:verify` which combines header sync check + full build pipeline.

### Docker Build (Main Push Only)

Builds and pushes API and Web Docker images to the configured container registry (default: `ghcr.io`). Produces a `deployment-images.json` artifact with image digests.

## Docker Commands

```bash
# Development (local Docker Compose)
pnpm docker:dev           # Build and start dev containers
pnpm docker:dev:down      # Stop dev containers

# Production (local Docker Compose)
pnpm docker:prod          # Build and start prod containers
pnpm docker:prod:down     # Stop prod containers
```

Docker files are in `infra/docker/`:

- `Dockerfile` -- API server image
- `Dockerfile.web` -- Web client image
- `development/docker-compose.dev.yml` -- Dev compose stack
- `production/docker-compose.prod.yml` -- Prod compose stack

## Database Commands

```bash
pnpm db:push              # Push schema changes to database
pnpm db:seed              # Seed database with sample data
pnpm db:bootstrap         # Bootstrap database (create + migrate + seed)
pnpm db:bootstrap:admin   # Bootstrap admin user
pnpm db:reset             # Reset database
pnpm db:audit             # Audit database schema
```

## Branch Strategy

- `main` -- Production branch. CI runs full build + Docker publish.
- `dev` -- Development branch. CI runs full build.
- Feature branches -- CI runs sanity checks on PRs.
- `staging` -- Deploys to staging environment (see `docs/dev/staging.md`).

## Verification Gates

| Gate       | When             | Command                                           |
| ---------- | ---------------- | ------------------------------------------------- |
| Pre-commit | Every commit     | `pnpm pre-commit` (format + lint staged files)    |
| Pre-push   | Every push       | `turbo run validate` (lint + type-check + test)   |
| CI (PR)    | Pull requests    | Sanity checks (format + lint + type-check + test) |
| CI (merge) | Push to main/dev | Full `pnpm ci:verify` (headers + build + tests)   |
