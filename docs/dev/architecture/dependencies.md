# Dependency Flow Rules

## One-Way Dependencies

```
Frontend Apps (web, desktop)
        │
        ▼
packages/ui, packages/sdk
        │
        ▼
   packages/core

Backend App (server)
        │
        ▼
apps/server/src/infra/*
        │
        ▼
   packages/core
```

## Rules

- No reverse dependencies from `packages/*` to apps
- No cross-app imports (web cannot import from server)
- Shared contracts and validation must live in `packages/core`
- Server infrastructure modules are internal to `apps/server`
- `packages/core` is framework-agnostic (no React imports)

## Package Dependencies

| Package           | Can Import From    |
| ----------------- | ------------------ |
| `@abe-stack/core` | External deps only |
| `@abe-stack/ui`   | `@abe-stack/core`  |
| `@abe-stack/sdk`  | `@abe-stack/core`  |
| `apps/web`        | All packages       |
| `apps/desktop`    | All packages       |
| `apps/server`     | `@abe-stack/core`  |

## Enforcement

- TypeScript project references in `tsconfig.json`
- ESLint import rules
- pnpm workspace protocol (`workspace:*`)

See Also:

- `dev/architecture/patterns.md`
- `dev/architecture/structure.md`
