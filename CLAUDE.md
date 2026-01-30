# CLAUDE.md — ABE Stack

## Project Overview

TypeScript monorepo (pnpm + Turborepo) with three apps and 18 shared packages.

- **apps/web** — Vite + React 19 frontend
- **apps/server** — Fastify 5 backend
- **apps/desktop** — Electron desktop app
- **packages/** — Shared libraries (`@abe-stack/*`)

## Task Delegation — Reduce Context Usage

**Principle:** When a task can be solved by writing and executing a script, delegate to that script instead of performing the work step-by-step in the conversation. This preserves context window for higher-level reasoning.

### When to Delegate to Scripts

1. **Bulk file edits** — If more than 3 files need the same kind of change (renames, import updates, pattern replacements), write a Node.js or bash script to do it in one shot instead of editing each file individually.

2. **Search and analysis** — For questions like "find all usages of X" or "which packages depend on Y", write a script that greps/parses and outputs a summary rather than reading dozens of files into context.

3. **Code generation** — When generating boilerplate (new packages, new modules, test stubs), use a script that creates all files at once.

4. **Validation and checks** — Instead of reading files to verify correctness, write a script that checks invariants and reports violations (e.g., "ensure all packages export an index.ts", "verify no circular imports").

5. **Data transformations** — JSON/config manipulation, migration scripts, schema changes — always scriptable.

6. **Repetitive test fixes** — If multiple tests fail for the same reason, write a codemod script to fix them all rather than editing each test file.

### How to Delegate

```bash
# Write a self-contained script, execute it, then delete it
node -e "
  const fs = require('fs');
  const glob = require('glob');
  // ... do the bulk work ...
  console.log('Summary of changes made');
"
```

Or for more complex tasks:

```bash
# Write to a temp file, run it, remove it
cat > /tmp/task.mjs << 'EOF'
import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';
// ... perform bulk operation ...
EOF
node /tmp/task.mjs && rm /tmp/task.mjs
```

### Delegation Rules

- **Always print a summary** — Scripts must output what they changed so the conversation retains awareness without reading every file.
- **Keep scripts disposable** — Write to `/tmp/`, delete after execution. Never commit helper scripts.
- **Fail loudly** — Scripts should throw on unexpected conditions rather than silently skipping.
- **Prefer `node -e` for simple tasks** — Avoid creating files when a one-liner suffices.
- **Use `pnpm exec` for monorepo tools** — Access installed binaries via `pnpm exec`.
- **Batch related changes** — One script per logical change, not one per file.

### What NOT to Delegate

- Architectural decisions or design reasoning — these need conversational context.
- Single-file edits — faster to use the Edit tool directly.
- Anything requiring judgment call per-file — scripts are for uniform changes.

## Key Commands

```bash
pnpm dev                # Start all dev servers
pnpm build              # Full build pipeline
pnpm test               # Run all tests
pnpm test:parallel      # Parallel test execution (CI-style)
pnpm lint               # Lint all packages
pnpm lint:fix           # Auto-fix lint issues
pnpm type-check         # TypeScript type checking
pnpm format             # Prettier format
pnpm pre-commit         # Full pre-commit pipeline (build + format + lint + type-check)
pnpm clean              # Remove dist, .turbo, caches
```

### Database

```bash
pnpm db:push            # Push Drizzle schema to PostgreSQL
pnpm db:bootstrap       # Bootstrap database
```

### Docker

```bash
pnpm docker:dev         # Start dev containers
pnpm docker:dev:down    # Stop dev containers
```

### Sync & Maintenance

```bash
pnpm sync:imports       # Sync TypeScript path aliases
pnpm sync:ts            # Sync TypeScript references
pnpm build:headers      # Sync file headers
pnpm build:theme        # Generate CSS theme from design tokens
pnpm health-check       # Project health audit
```

## Code Conventions

- **Strict TypeScript** — No `any` without justification. Zod validation at all boundaries.
- **Import order** — External deps → `@abe-stack/*` → relative imports.
- **Naming** — PascalCase (components/types), camelCase (functions/hooks), kebab-case (configs).
- **Tests colocated** — `*.test.ts` / `*.spec.ts` next to source files.
- **One-way dependency flow** — `apps → packages → packages/core → external`.

## Architecture

```
apps/              → Deployable applications (Tier 4 — thin wiring only)
packages/          → Shared libraries (Tiers 1–3 — all business logic)
tooling/           → Build scripts, sync automation
infra/             → Terraform, Docker configs
docs/              → Specs, principles, deployment guides
```

Server follows hexagonal architecture: `apps/server/src/modules/` (business logic) + `apps/server/src/infra/` (adapters).

**Package boundary details:** See [`docs/dev/packages.md`](docs/dev/packages.md) for the full server/package boundary spec, 4-tier architecture, litmus tests, and current codebase evaluation.
