# Developer Onboarding Guide

Welcome to BSLT. This guide will get you productive in your first day.

BSLT is a TypeScript monorepo for building full-stack web applications. It ships with authentication, a design system, an admin dashboard, billing scaffolding, and real-time infrastructure — all wired together and ready for production.

**Stack:** Turbo, pnpm, Vite, React, Fastify, Drizzle ORM, Zod, PostgreSQL

---

## Getting Started

```bash
# 1. Clone and install
git clone <repo-url> && cd bslt-main
pnpm install

# 2. Start database (Docker required)
docker compose -f infra/docker/development/docker-compose.dev.yml up -d

# 3. Push schema and seed data
pnpm db:push
pnpm db:seed

# 4. Start everything
pnpm dev
```

`pnpm dev` starts the Vite frontend, Fastify API, and several file watchers that handle imports, headers, and aliases automatically. You rarely need to think about those watchers — they run in the background.

- **Web app:** http://localhost:5173
- **API server:** http://localhost:8080
- **API docs:** http://localhost:8080/api/docs

---

## How the Codebase is Organized

```
src/
├── apps/
│   ├── web/            Vite + React frontend
│   ├── server/         Fastify API server
│   └── desktop/        Electron desktop app
├── client/
│   ├── ui/             Shared React components (design system)
│   ├── api/            Type-safe API client + React Query hooks
│   ├── react/          Shared React hooks (useLocalStorage, useMediaQuery, etc.)
│   └── engine/         Offline/real-time engine (RecordCache, WebSocket, etc.)
├── server/
│   ├── core/           Business logic modules (auth, users, admin, tenants)
│   ├── engine/         Infrastructure adapters (mailer, storage, security, JWT)
│   ├── db/             Drizzle ORM schemas, migrations, test helpers
│   ├── realtime/       WebSocket pub/sub server
│   └── media/          Audio/image processing
├── shared/             Domain types, Zod schemas, validation (framework-agnostic)
└── tools/              Dev scripts, sync tools, linters
```

### The key idea: layers with one-way dependencies

```
apps (web, server, desktop)
    ↓
client (ui, api, engine)  +  server (core, engine, db)
    ↓                              ↓
                  shared (domain types, validation)
```

Dependencies always flow downward. An app can import from any package below it, but packages never import from apps, and `shared/` never imports from anything above it.

The server follows **hexagonal architecture**:

- `server/core/` contains business logic (auth flows, user management, admin routes). This is the "what" of the application.
- `server/system/` contains infrastructure adapters (sending emails, storing files, hashing passwords). This is the "how."
- `server/core/` imports from `server/system/`, never the reverse. This means you can swap an email provider without touching any business logic.

### Conventions you'll see everywhere

- **Barrel exports:** Every directory has an `index.ts` that explicitly re-exports its public API. Always use named exports, never `export *`.
- **Named imports only:** Always use explicit named imports (`import { foo } from 'bar'`), never namespace imports (`import * as bar from 'bar'`). Exception: test files where `import *` is needed for `vi.spyOn`.
- **Colocated tests:** Test files live next to the code they test (`UserService.ts` + `UserService.test.ts`).
- **Path aliases:** Instead of `../../../shared/domain/auth`, you write `@bslt/shared`. The web app has shorter aliases like `@auth`, `@features`, `@app`. These are auto-generated.
- **File headers:** Every `.ts`/`.tsx` file starts with a `// path/to/file.ts` comment. Don't edit these manually — the `sync-file-headers` tool manages them.

---

## Where to Put New Code

This is the most common question for new developers. Here's the decision tree:

| What you're building               | Where it goes                 | Example                                       |
| ---------------------------------- | ----------------------------- | --------------------------------------------- |
| React component (reusable)         | `main/client/ui/`             | Button, Card, Dialog, Table                   |
| React component (feature-specific) | `main/apps/web/src/features/` | LoginForm, UserListPage                       |
| Business logic or validation       | `main/shared/`                | Zod schemas, domain rules, type contracts     |
| API route handler                  | `main/server/core/`           | Auth handlers, user CRUD, admin endpoints     |
| Infrastructure adapter             | `main/server/system/`         | Email sending, file storage, JWT signing      |
| Database schema or migration       | `main/server/db/`             | Drizzle table definitions, SQL migrations     |
| API client hook                    | `main/client/api/`            | `useLogin()`, `useUsers()`, React Query hooks |
| Dev tooling or scripts             | `main/tools/`                 | Linters, sync scripts, DB utilities           |

**Before creating a new file,** search if something similar already exists. Prefer editing an existing file over creating a new one.

---

## Coding Standards

### TypeScript

The project uses maximum TypeScript strictness. A few things that might surprise you:

- **No `any`.** If you need a flexible type, use `unknown` and narrow it.
- **No `@ts-ignore` or `@ts-expect-error`.** Fix the type error instead.
- **No `eslint-disable` comments.** If a rule seems wrong, discuss it — don't suppress it.
- **`exactOptionalPropertyTypes` is on.** You can't assign `undefined` to an optional property unless the type explicitly includes `| undefined`.
- **`noUncheckedIndexedAccess` is on.** Array access returns `T | undefined`, so you must check bounds.

Use Zod for all runtime validation. Define schemas in `main/shared/` and infer TypeScript types from them:

```typescript
const userSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});
type User = z.infer<typeof userSchema>;
```

### File Naming

| Convention | When                        | Examples                             |
| ---------- | --------------------------- | ------------------------------------ |
| PascalCase | Components, classes, types  | `UserProfile.tsx`, `ApiClient.ts`    |
| camelCase  | Functions, hooks, utilities | `formatCurrency.ts`, `useUser.ts`    |
| kebab-case | Config files                | `vite.config.ts`, `.env.development` |

### Import Order

Keep imports in this order (ESLint enforces this):

1. External packages (`react`, `zod`, `drizzle-orm`)
2. Internal packages (`@bslt/shared`, `@bslt/ui`)
3. Path aliases (`@auth`, `@features`)
4. Styles (last)

### Error Handling

- **Server:** Use try/catch with typed HTTP error responses (400, 404, 500). The `AppError` class in `@bslt/shared` standardizes error shapes.
- **Client:** Use React Query's built-in `error`/`isLoading`/`isError` states. Don't catch errors in components and swallow them.
- **Never** fail silently. If something goes wrong, surface it.

### Comments

- Write comments that explain **why**, not what. The code explains what it does.
- Use descriptive variable and function names instead of annotating obvious code.
- Don't manually edit the `// path/to/file.ts` file headers — those are auto-managed.

---

## Styling and the Design System

BSLT has a design system built on CSS custom properties (variables). Every visual value — colors, spacing, borders, shadows, typography — comes from the theme.

### Use design system components

When you need a button, input, table, card, or other standard UI element, import it from `@bslt/ui`:

```tsx
import { Button, Input, Card, Text, Heading } from '@bslt/ui';
```

Don't use raw `<Button>`, `<input>`, `<select>`, `<table>`, or `<a>` elements. The design system components handle theming, accessibility, and consistent styling automatically.

Raw HTML is fine for structural elements: `<div>`, `<nav>`, `<section>`, `<main>`, `<header>`, `<footer>`, `<form>`, `<label>`.

### Use CSS variables, not hardcoded values

```tsx
// Do this
<div style={{ color: 'var(--ui-color-text)', padding: 'var(--ui-gap-md)' }}>

// Not this
<div style={{ color: '#202124', padding: '16px' }}>
```

The theme variables are all prefixed with `--ui-`. Here are the most common ones:

| What you need        | Variable                |
| -------------------- | ----------------------- |
| Primary color        | `--ui-color-primary`    |
| Page background      | `--ui-color-bg`         |
| Card/surface bg      | `--ui-color-surface`    |
| Body text            | `--ui-color-text`       |
| Muted/secondary text | `--ui-color-text-muted` |
| Borders              | `--ui-color-border`     |
| Spacing (small)      | `--ui-gap-sm` (0.5rem)  |
| Spacing (medium)     | `--ui-gap-md` (1rem)    |
| Spacing (large)      | `--ui-gap-lg` (1.5rem)  |
| Border radius        | `--ui-radius-md`        |
| Focus ring           | `--ui-focus`            |
| Danger/error         | `--ui-color-danger`     |
| Success              | `--ui-color-success`    |

### Prefer utility classes

The design system includes utility classes similar to Tailwind (defined in `main/client/ui/src/styles/utilities.css`):

```tsx
<div className="flex gap-3 p-4 bg-surface border rounded-md">
```

Available: `.flex`, `.flex-col`, `.items-center`, `.justify-between`, `.gap-1` through `.gap-8`, `.p-1` through `.p-6`, `.bg-surface`, `.bg-primary`, `.text-muted`, `.text-danger`, `.border`, `.rounded`, `.rounded-md`

### Units

Never use `px` for spacing, font sizes, or layout. Use `rem`, `em`, `%`, or the `--ui-gap-*` / `--ui-font-size-*` tokens. The only acceptable use of `px` is for `1px` borders and box-shadow offsets.

---

## Common Patterns

### Adding an API endpoint

1. Define the Zod request/response schemas in `main/shared/src/domain/`
2. Write the handler in `main/server/core/src/<module>/handlers/`
3. Register the route in `main/server/core/src/<module>/routes.ts`
4. Add the API client hook in `main/client/api/src/`
5. Write tests for the handler

### Adding a new page

1. Create the page component in `main/apps/web/src/features/<feature>/pages/`
2. Add the route in `main/apps/web/src/app/routes.tsx`
3. If it needs lazy loading, add a lazy import in `main/apps/web/src/pages/`

### Form validation

1. Define the Zod schema in `main/shared/` (so both client and server share it)
2. Use `safeParse()` before submitting
3. Display field errors from `error.flatten().fieldErrors`

### Environment variables

1. Define a Zod schema for the variable in `main/shared/`
2. Parse at app startup: `envSchema.parse(process.env)`
3. Use the validated object everywhere — never read `process.env` directly

---

## Things to Avoid

These are the most common mistakes new developers make:

| Mistake                            | Why it's a problem                      | What to do instead                       |
| ---------------------------------- | --------------------------------------- | ---------------------------------------- |
| Business logic in React components | Can't test without rendering UI         | Move logic to `main/shared/`             |
| Duplicating types across files     | They drift apart over time              | Single source of truth in `main/shared/` |
| Importing from another app         | Breaks build boundaries                 | Use shared packages instead              |
| Prop drilling through 5+ levels    | Fragile, hard to refactor               | Use React Context or hooks               |
| Using `any` to "fix" type errors   | Defeats the purpose of TypeScript       | Write proper types + Zod schemas         |
| `export *` in barrel files         | Hides dependencies, breaks tree-shaking | Explicit named exports                   |
| `import * as X` namespace imports  | Hides what's actually used              | Explicit named imports (`import { X }`)  |
| Deep relative imports (`../../..`) | Breaks when files move                  | Use path aliases (`@auth`, etc.)         |
| Adding npm packages without asking | Security + bundle size concerns         | Discuss first, prefer manual if <50 LOC  |
| Premature abstraction              | Adds complexity for no benefit          | Don't abstract until used in 2+ places   |

---

## Quality Checks and Git Workflow

### What happens when you commit

Git hooks run automatically (configured via `infra/git-hooks/`):

1. **On commit:** Prettier formats your staged files, ESLint fixes what it can. File headers are synced. This is fast — it only touches files you changed.
2. **On push:** The full suite runs — lint, type-check, and tests (via Turbo, so cached results make this fast if nothing changed).

If the pre-push check fails, your push is blocked. Fix the issue and push again.

### Running checks manually

During development, run targeted checks on just the files you changed:

```bash
# Lint specific files
npx eslint main/apps/web/src/features/auth/pages/LoginPage.tsx

# Type-check a specific package
pnpm --filter @bslt/web type-check

# Run a specific test file
pnpm test -- --run main/server/core/src/auth/service.test.ts

# Run all tests for a package
pnpm --filter @bslt/shared test

# Format specific files
npx prettier --config config/.prettierrc --write main/apps/web/src/features/auth/pages/LoginPage.tsx
```

Before creating a PR or after large cross-package changes, run the full build:

```bash
pnpm build    # Runs: build + lint + type-check + test (with Turbo caching)
```

### Package filter names

When using `pnpm --filter`, these are the package names:

`@bslt/web`, `@bslt/server`, `@bslt/desktop`, `@bslt/ui`, `@bslt/shared`, `@bslt/engine`, `@bslt/stores`, `@bslt/media`

### CI pipeline

When you push to `main` or open a PR, GitHub Actions runs:

1. **Sanity checks** — format, lint, type-check, tests
2. **Full build** (on push to `main`) — builds everything, runs all tests
3. **Docker build** (on push to `main`) — builds production images
4. **Security scans** — CodeQL, Semgrep, dependency audit, secret scanning
5. **Auto-deploy** (on push to `main`) — deploys to production if CI passes

See `docs/dev/ci-cd.md` for the full CI/CD workflow documentation.

---

## Useful Commands

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `pnpm dev`          | Start all dev servers + file watchers |
| `pnpm lint`         | Lint everything (Turbo cached)        |
| `pnpm type-check`   | Type-check everything (Turbo cached)  |
| `pnpm test`         | Run all tests (minimal output)        |
| `pnpm test:verbose` | Run all tests (full output)           |
| `pnpm build`        | Full build + lint + type-check + test |
| `pnpm db:push`      | Push Drizzle schema to database       |
| `pnpm db:seed`      | Seed database with test data          |
| `pnpm db:reset`     | Reset database (drop + recreate)      |
| `pnpm sync:headers` | Fix all file path headers             |
| `pnpm format`       | Format all files with Prettier        |
| `pnpm health-check` | Run monorepo health diagnostics       |

---

## Further Reading

| Topic                    | Document                     |
| ------------------------ | ---------------------------- |
| Architecture deep dive   | `docs/specs/architecture.md` |
| Authentication system    | `docs/specs/auth.md`         |
| Coding principles        | `docs/specs/principles.md`   |
| CI/CD & infrastructure   | `docs/dev/ci-cd.md`          |
| Testing strategy         | `docs/dev/testing.md`        |
| Current sprint / backlog | `docs/todo/TODO.md`          |
| Future roadmap           | `docs/todo/TODO.md` (Sprint 7) |
| Configuration system     | `config/README.md`           |

---

_Last updated: 2026-02-11_
