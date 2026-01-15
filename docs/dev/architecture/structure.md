# Monorepo Structure and Conventions

## Monorepo Layout

```
abe-stack/
├── apps/
│   ├── web/           # Vite + React frontend
│   │   └── src/
│   │       ├── features/      # Feature modules (auth, dashboard, demo)
│   │       ├── pages/         # Standalone pages
│   │       ├── api/           # API client setup
│   │       ├── app/           # App root and providers
│   │       ├── config/        # App configuration
│   │       └── test/          # Test utilities, e2e
│   ├── server/        # Fastify API server
│   │   └── src/
│   │       ├── modules/       # Feature modules (auth, users, admin)
│   │       ├── infra/         # Infrastructure layer
│   │       │   ├── database/  # Drizzle ORM, schemas, utils
│   │       │   ├── storage/   # S3/local file storage
│   │       │   ├── pubsub/    # Pub/sub subscriptions
│   │       │   ├── security/  # Lockout, audit logging
│   │       │   ├── email/     # Email service
│   │       │   ├── crypto/    # JWT utilities
│   │       │   ├── http/      # HTTP utilities
│   │       │   └── rate-limit/# Rate limiting
│   │       ├── config/        # Server configuration
│   │       ├── shared/        # Server-specific shared code
│   │       ├── types/         # TypeScript declarations
│   │       └── scripts/       # Utility scripts (seed, etc.)
│   └── desktop/       # Electron desktop app
├── packages/
│   ├── core/          # Shared contracts, validation, stores, utils
│   ├── ui/            # Reusable React components
│   └── sdk/           # Type-safe API client + React Query hooks
├── config/            # Shared configs (tsconfig, prettier, docker)
├── tools/             # Build scripts, dev utilities
└── docs/              # Documentation
```

## Folder Conventions

Apps:

- `apps/web/src/features` for feature modules (auth, dashboard, etc.)
- `apps/web/src/pages` for standalone pages
- `apps/server/src/modules` for API feature modules
- `apps/server/src/infra` for infrastructure (database, storage, security)

Packages:

- `packages/core/src` for shared contracts, validation, stores
- `packages/ui/src` for reusable UI components
- `packages/sdk/src` for type-safe API client + React Query hooks

## File Naming

- PascalCase: components, classes, types
- camelCase: functions, hooks, utilities
- kebab-case: config files

See Also:

- [Patterns](./patterns.md)
- [Testing](./testing.md)
