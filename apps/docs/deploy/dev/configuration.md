# Configuration

**Last Updated: January 17, 2026**

Core monorepo configuration guide covering TypeScript, path aliases, build system, Vite, caching, and server configuration.

> **Related Documentation:**
>
> - [Sync Scripts](./sync-scripts.md) - DX automation scripts (path aliases, barrel exports, etc.)
> - [Workflow](./workflow.md) - Testing, CI/CD, Git hooks, Docker

---

## Table of Contents

1. [Monorepo Structure](#monorepo-structure)
2. [TypeScript Configuration](#typescript-configuration)
3. [Path Aliases](#path-aliases)
4. [Build System](#build-system)
5. [Vite Configuration](#vite-configuration)
6. [Caching Strategy](#caching-strategy)
7. [Database Configuration](#database-configuration)
8. [Server Configuration](#server-configuration)
9. [Quick Reference](#quick-reference)

---

## Monorepo Structure

### Directory Layout

```text
abe-stack/
├── apps/                    # Applications
│   ├── web/                 # Vite + React frontend
│   ├── server/              # Fastify API server
│   └── desktop/             # Electron app
├── infra/                   # Infrastructure packages (cache, db, http, etc.)
├── modules/                 # Business modules (admin, auth, billing)
├── shared/                  # Shared libraries (core, ui)
├── sdk/                     # Type-safe API client
├── config/                  # Shared configuration
│   ├── ts/                  # TypeScript configs
│   ├── docker/              # Docker compose files
│   ├── .env/                # Environment files
│   ├── linting.json          # Linting config source of truth
│   └── aliases.ts           # Centralized path aliases
├── tools/                   # Build and dev tools
│   ├── dev/                 # Dev server scripts
│   ├── sync/                # DX automation scripts
│   └── export/              # Code export utilities
├── apps/docs/                    # Documentation
├── turbo.json               # Turborepo config
├── package.json             # Root package.json
├── pnpm-workspace.yaml      # pnpm workspace config
└── eslint.config.ts         # ESLint flat config
```

### Package Manager

- **pnpm** (v10.26.2) - Fast, disk-efficient package manager
- Workspace defined in `pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'infra/*'
  - 'modules/*'
  - 'shared/*'
  - 'client'
```

- Store location configured in `.pnpmrc`:

```ini
store-dir=.cache/pnpm-store
```

### Dependency Flow (Never Reverse)

```text
apps/web     → shared/ui  → shared/core
apps/web     → sdk → shared/core
apps/server  → shared/core
apps/desktop → shared/core
```

---

## TypeScript Configuration

### Config Hierarchy

```text
tsconfig.json                    # Root: project references only
.config/tsconfig.json     # Base config (strictest settings)
    ├── tsconfig.node.json       # Node.js apps (server, tools)
    ├── tsconfig.react.json      # React apps (web, desktop)
    └── tsconfig.eslint.json     # ESLint (no emit, all files)

apps/server/tsconfig.json        # Extends tsconfig.node.json
apps/server/tsconfig.build.json  # Build-only (excludes tests)
apps/web/tsconfig.json           # Extends tsconfig.react.json
apps/desktop/tsconfig.json       # Extends tsconfig.react.json
infra/*/tsconfig.json (and modules/*, shared/*)         # Extends tsconfig.base.json
```

### Root tsconfig.json

The root `tsconfig.json` only defines project references for the monorepo:

```json
{
  "files": [],
  "references": [
    { "path": "./apps/web" },
    { "path": "./apps/desktop" },
    { "path": "./apps/server" },
    { "path": "./shared/core" },
    { "path": "./client" },
    { "path": "./shared/ui" }
  ]
}
```

This enables `tsc --build` to compile all packages in dependency order.

### Base Configuration (`.config/tsconfig.base.json`)

The base config defines the strictest settings inherited by all packages:

```json
{
  "compilerOptions": {
    // Monorepo & Build Performance
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "incremental": true,

    // Language Fundamentals
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",

    // Modern Strictness
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,

    // Module Safety
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  }
}
```

### Node.js Configuration (`.config/tsconfig.node.json`)

For server-side apps with Node.js module resolution:

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "module": "Node16",
    "moduleResolution": "node16",
    "verbatimModuleSyntax": false
  }
}
```

### React Configuration (`.config/tsconfig.react.json`)

For frontend apps bundled with Vite (no emit, bundler handles compilation):

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "composite": false,
    "declaration": false,
    "noEmit": true,
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true
  }
}
```

### Project References

Packages use TypeScript project references for incremental builds:

```json
// apps/web/tsconfig.json
{
  "references": [
    { "path": "../../client" },
    { "path": "../../shared/core" },
    { "path": "../../shared/ui" }
  ]
}
```

### Build Info Files

Each package stores incremental build info:

- **Packages**: `./tsconfig.tsbuildinfo` (root of package)
- **Apps**: `./node_modules/.cache/tsconfig.*.tsbuildinfo` (in cache dir)

---

## Path Aliases

### Where Aliases Are Defined

Path aliases are defined in two places that must be kept in sync:

| Location                                          | Purpose                  | Format                                  |
| ------------------------------------------------- | ------------------------ | --------------------------------------- |
| `apps/*/vite.config.ts`                           | Vite/Vitest resolution   | `resolve.alias: Record<string, string>` |
| `apps/*/tsconfig.json`                            | TypeScript type checking | `"paths": { "@alias": ["./src/path"] }` |
| `infra/*/tsconfig.json (and modules/*, shared/*)` | Package internal aliases | `"paths": { ... }`                      |

### Alias Categories

Each app's `vite.config.ts` defines aliases inline:

1. **Package aliases** - `@abe-stack/core`, `@abe-stack/ui`, etc. pointing to source
2. **UI internal aliases** - `@components`, `@elements`, etc. for UI package internals
3. **Core internal aliases** - `@contracts`, `@shared` for core package internals
4. **App-specific aliases** - `@features`, `@auth`, etc. for the specific app

### Example: Server Aliases

```json
// apps/server/tsconfig.json
{
  "paths": {
    "@/*": ["./src/*"],
    "@config": ["./src/config"],
    "@modules": ["./src/modules"],
    "@infra": ["./src/infra"],
    "@database": ["./src/infra/database"],
    "@auth": ["./src/modules/auth"]
  }
}
```

---

## Build System

### Turborepo Pipeline

The build system uses Turborepo for orchestration (`turbo.json`):

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**"],
      "cache": true
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "inputs": ["**/*.ts", "**/*.tsx"],
      "cache": true
    },
    "type-check": {
      "dependsOn": ["^build"],
      "cache": true
    },
    "test": {
      "inputs": ["**/*.ts", "**/*.tsx", "**/*.test.ts"],
      "cache": true
    }
  }
}
```

### Build Commands

| Command             | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `pnpm build`        | Full build: theme + build + lint + type-check + test |
| `pnpm build:fast`   | Quick build: theme + build only                      |
| `pnpm build:web`    | Build web app only                                   |
| `pnpm build:server` | Build server only                                    |
| `pnpm build:ui`     | Build UI package only                                |

### Package Build Scripts

Each package has smart build scripts that handle orphaned build info:

```json
// shared/core/package.json
{
  "scripts": {
    "build": "[ -d dist ] || rm -f tsconfig.tsbuildinfo && tsc --build",
    "clean": "rm -rf dist tsconfig.tsbuildinfo"
  }
}
```

This prevents stale builds when `dist` is deleted but `tsconfig.tsbuildinfo` remains.

### Build Output

| Package        | Output Dir | Contents                  |
| -------------- | ---------- | ------------------------- |
| `shared/core`  | `dist/`    | `.js`, `.d.ts`, `.js.map` |
| `sdk`          | `dist/`    | `.js`, `.d.ts`, `.js.map` |
| `shared/ui`    | `dist/`    | `.js`, `.d.ts`, `.js.map` |
| `apps/server`  | `dist/`    | `.js`, `.js.map`          |
| `apps/web`     | `build/`   | Bundled production assets |
| `apps/desktop` | `build/`   | Electron packaged app     |

### Test File Exclusion

Test files are excluded from build output:

```json
// infra/*/tsconfig.json (and modules/*, shared/*)
{
  "exclude": ["node_modules", "dist", "src/**/__tests__/**"]
}
```

### Server Build Config

The server has a separate `tsconfig.build.json` for builds that excludes tests:

```json
// apps/server/tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "src/**/__tests__/**"]
}
```

### Package Exports (Subpath Exports)

Packages use the `exports` field for granular imports and tree-shaking:

```json
// shared/core/package.json
{
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./contracts": {
      "import": "./dist/contracts/index.js",
      "types": "./dist/contracts/index.d.ts"
    },
    "./stores": {
      "import": "./dist/stores/index.js",
      "types": "./dist/stores/index.d.ts"
    }
  }
}
```

This enables:

```typescript
import { apiContract } from '@abe-stack/core/contracts';
import { toastStore } from '@abe-stack/core/stores';
```

### tsc-alias

Packages use `tsc-alias` to resolve path aliases in compiled output:

```json
// Package build script
{
  "build": "tsc --build && tsc-alias"
}
```

This transforms compiled imports like `@contracts/...` to relative paths in `dist/`.

---

## Vite Configuration

Centralized Vite configs in `config/` for consistency across apps.

### Web Configuration (`config/vite.web.config.ts`)

```typescript
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths({
      // Include all projects that web imports from
      projects: [
        `${webRoot}/tsconfig.json`,
        `${coreRoot}/tsconfig.json`,
        `${uiRoot}/tsconfig.json`,
        `${sdkRoot}/tsconfig.json`,
      ],
    }),
  ],
  publicDir: `${webRoot}/public`,
  build: {
    outDir: `${webRoot}/dist`,
    emptyOutDir: true,
  },
});
```

Key features:

- **vite-tsconfig-paths** - Resolves path aliases from tsconfig.json
- **Multi-project support** - Includes all referenced package tsconfigs

### Desktop Configuration (`config/vite.desktop.config.ts`)

```typescript
export default defineConfig(async ({ command }) => {
  // Dynamic port discovery for dev mode
  const rendererPort = await pickAvailablePort([5173, 5174, 5175], host);
  process.env.DESKTOP_RENDERER_PORT = String(rendererPort);

  return {
    plugins: [react()],
    base: './', // Relative paths for Electron
    build: {
      outDir: `${desktopRoot}/dist/renderer`,
    },
    resolve: {
      alias: getDesktopAliases(),
    },
    server: {
      port: rendererPort,
      strictPort: true,
    },
  };
});
```

Key features:

- **Relative base path** (`./`) - Required for Electron file:// protocol
- **Dynamic port discovery** - Finds available port if default is busy
- **Alias resolution** - Defines aliases inline for packages, UI, core, and desktop paths

---

## Caching Strategy

### Turbo Cache

Turborepo caches task outputs in `.cache/turbo/`:

```json
{
  "cacheDir": ".cache/turbo"
}
```

### Cache Invalidation

Tasks are re-run when:

1. **Input files change** - Specified in `inputs` array
2. **Dependencies change** - Via `dependsOn: ["^build"]`
3. **Global dependencies change** - Specified in `globalDependencies`

```json
{
  "globalDependencies": [
    "tsconfig.json",
    ".config/env/.env.development",
    "config/.prettierrc",
    ".config/*.json",
    "eslint.config.ts"
  ]
}
```

### Other Caches

| Cache      | Location                 | Purpose                 |
| ---------- | ------------------------ | ----------------------- |
| ESLint     | `.cache/eslint/.cache`   | Lint result cache       |
| Prettier   | `.cache/prettier/.cache` | Format result cache     |
| TypeScript | `*.tsbuildinfo`          | Incremental compilation |
| pnpm       | `.cache/pnpm-store`      | Package cache           |

### Clearing Caches

```bash
# Clear all caches
pnpm clean:cache

# Clear Turbo cache only
rm -rf .turbo .cache/turbo

# Full clean (including node_modules)
pnpm clean
```

---

## Database Configuration

### Drizzle ORM (`config/drizzle.config.ts`)

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: path.join(serverRoot, 'src/infra/database/schema/index.ts'),
  out: path.join(serverRoot, 'drizzle'),
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
```

### Database Commands

```bash
# Generate migrations
pnpm drizzle-kit generate

# Push schema changes (dev only)
pnpm drizzle-kit push

# Open Drizzle Studio
pnpm drizzle-kit studio
```

### Connection String

Built from environment variables:

```typescript
function getDatabaseUrl(): string {
  // Use DATABASE_URL if set, otherwise build from components
  const user = process.env.POSTGRES_USER || 'postgres';
  const password = process.env.POSTGRES_PASSWORD || 'postgres';
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const db = process.env.POSTGRES_DB || 'abe_stack_dev';

  return `postgres://${user}:${password}@${host}:${port}/${db}`;
}
```

---

## Server Configuration

### Domain Configuration Pattern

Server uses domain-split configuration in `apps/server/src/config/`:

```text
apps/server/src/config/
├── index.ts           # Exports all configs
├── loader.ts          # Loads and validates config
├── types.ts           # AppConfig type definition
├── auth.config.ts     # JWT, OAuth, strategies
├── database.config.ts # Connection, pool settings
├── email.config.ts    # SMTP, providers
├── server.config.ts   # Host, port, CORS
└── storage.config.ts  # Local, S3 providers
```

### Configuration Loading

Config is loaded once at startup via `loadConfig()`:

```typescript
// apps/server/src/config/loader.ts
export function loadConfig(): AppConfig {
  return {
    server: loadServerConfig(),
    database: loadDatabaseConfig(),
    auth: loadAuthConfig(),
    email: loadEmailConfig(),
    storage: loadStorageConfig(),
  };
}
```

### Example: Auth Config

```typescript
// apps/server/src/config/auth.config.ts
export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshSecret: string;
  refreshExpiresIn: string;
  strategies: AuthStrategy[];
  oauth: {
    google?: OAuthProviderConfig;
    github?: OAuthProviderConfig;
  };
}

export function isStrategyEnabled(config: AuthConfig, strategy: AuthStrategy): boolean {
  return config.strategies.includes(strategy);
}
```

### Zod Validation

All configs use Zod for type-safe validation:

```typescript
const serverConfigSchema = z.object({
  host: z.string().default('0.0.0.0'),
  port: z.coerce.number().default(3000),
  cors: z.object({
    origin: z.union([z.string(), z.array(z.string())]),
    credentials: z.boolean().default(true),
  }),
});
```

---

## Quick Reference

### File Locations

| Purpose                        | Location                                      |
| ------------------------------ | --------------------------------------------- |
| Root TypeScript config         | `tsconfig.json`                               |
| Base TypeScript config         | `.config/tsconfig.base.json`                  |
| Node.js TypeScript config      | `.config/tsconfig.node.json`                  |
| React TypeScript config        | `.config/tsconfig.react.json`                 |
| ESLint TypeScript config       | `.config/tsconfig.eslint.json`                |
| Server build config            | `apps/server/tsconfig.build.json`             |
| Path aliases (Vite)            | `apps/*/vite.config.ts` (inline)              |
| Vite web config                | `apps/web/vite.config.ts`                     |
| Vite desktop config            | `apps/desktop/vite.config.ts`                 |
| Vitest configs                 | `config/vitest.config.ts`                     |
| Playwright E2E config          | `config/playwright.config.ts`                 |
| Drizzle ORM config             | `config/drizzle.config.ts`                    |
| Linting config source of truth | `config/linting.json`                         |
| ESLint config                  | `eslint.config.ts`                            |
| Prettier config                | `config/.prettierrc`                          |
| Prettier ignore                | `config/.prettierignore`                      |
| Turbo config                   | `turbo.json`                                  |
| pnpm workspace                 | `pnpm-workspace.yaml`                         |
| pnpm config                    | `.pnpmrc`                                     |
| Environment files              | `.env.*`                                      |
| Docker compose                 | `infra/docker/development/docker-compose.yml` |
| Dockerfile                     | `infra/docker/Dockerfile`                     |
| Server domain configs          | `apps/server/src/config/*.config.ts`          |
| CI/CD workflows                | `.github/workflows/*.yml`                     |
| Git ignore patterns            | `.gitignore`                                  |
| Sync scripts                   | `tools/sync/*.ts`                             |
| Dev scripts                    | `tools/dev/*.ts`                              |

### Package Filters

Use with `turbo run` or `pnpm --filter`:

| Filter               | Package        |
| -------------------- | -------------- |
| `@abe-stack/web`     | `apps/web`     |
| `@abe-stack/server`  | `apps/server`  |
| `@abe-stack/desktop` | `apps/desktop` |
| `@abe-stack/ui`      | `shared/ui`    |
| `@abe-stack/core`    | `shared/core`  |
| `@abe-stack/client`  | `sdk`          |

### Related Documentation

| Topic                        | Document                                    |
| ---------------------------- | ------------------------------------------- |
| Sync scripts (DX automation) | [sync-scripts.md](./sync-scripts.md)        |
| Testing, CI/CD, Git hooks    | [workflow.md](./workflow.md)                |
| Testing strategy             | [testing.md](./testing.md)                  |
| Architecture overview        | [architecture.md](../specs/architecture.md) |

---

_Philosophy: Convention over configuration. Automation over manual work. Single source of truth._
