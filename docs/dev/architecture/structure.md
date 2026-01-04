# Monorepo Structure and Conventions

## Monorepo Layout

```
abe-stack/
├── apps/
│   ├── web/
│   ├── server/
│   └── desktop/
├── packages/
│   ├── shared/
│   ├── ui/
│   ├── api-client/
│   ├── db/
│   └── storage/
├── config/
├── tools/
└── docs/
```

## Folder Conventions

Apps:

- `apps/web/src/components` for UI composition
- `apps/web/src/pages` for routes
- `apps/server/src/routes` for API handlers

Packages:

- `packages/shared/src` for framework-agnostic logic
- `packages/ui/src` for reusable UI components
- `packages/api-client/src` for client + React Query hooks
- `packages/db/src` for schema/queries/migrations

## File Naming

- PascalCase: components, classes, types
- camelCase: functions, hooks, utilities
- kebab-case: config files

See Also:

- `dev/architecture/patterns.md`
- `dev/architecture/testing.md`
