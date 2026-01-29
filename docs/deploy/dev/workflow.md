# Workflow

**Last Updated: January 19, 2026**

Guide to the ABE Stack development workflow, testing, linting, CI/CD, and Docker configuration.

> **Related Documentation:**
>
> - [Configuration](./configuration.md) - Core monorepo configuration
> - [Sync Scripts](./sync-scripts.md) - DX automation scripts
> - [Testing Strategy](./testing.md) - Detailed testing patterns

---

## Table of Contents

1. [Development Workflow](#development-workflow)
2. [Testing Configuration](#testing-configuration)
3. [E2E Testing (Playwright)](#e2e-testing-playwright)
4. [Linting & Formatting](#linting--formatting)
5. [Git Hooks](#git-hooks)
6. [Docker Configuration](#docker-configuration)
7. [CI/CD Configuration](#cicd-configuration)
8. [Troubleshooting](#troubleshooting)

---

## Development Workflow

### Starting Development

```bash
pnpm dev          # Start all (web + server + watchers)
pnpm dev web      # Start web only
pnpm dev server   # Start server only
pnpm dev desktop  # Start desktop only
```

### What `pnpm dev` Does

The `tools/dev/start-dev.ts` script:

1. **Checks PostgreSQL** - Attempts to start if not running
2. **Starts sync watchers** (all 3 in background, silent mode):
   - `config:generate` - Generates tsconfigs and path aliases
   - `sync-file-headers.ts` - Adds file path comments
   - `sync-css-theme.ts` - Generates theme CSS variables
3. **Runs `turbo dev`** - Starts Vite/Fastify dev servers

`sync-tsconfig.ts` and `sync-linting.ts` run on demand via `pnpm sync:tsconfig` / `pnpm sync:linting` (not watchers).

### Environment Variables

Environment files in ``:

```text

├── .config/env/.env.development    # Development settings
├── .config/env/.env.production     # Production settings
└── .config/env/.env.test           # Test settings
```

---

## Testing Configuration

### Vitest Setup

Centralized test config in `config/vitest.config.ts`:

```typescript
export const baseConfig = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/src/**/*.{test,spec}.{js,ts,tsx}'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      thresholds: {
        global: { branches: 70, functions: 70, lines: 70 },
      },
    },
  },
});

// Each package extends the base config
export const serverConfig = mergeConfig(
  baseConfig,
  defineConfig({
    resolve: { alias: getServerAliases() },
  }),
);

export const webConfig = mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [react()],
    test: { environment: 'jsdom' },
    resolve: { alias: getWebAliases() },
  }),
);
```

### Package Vitest Configs

Packages import their config from the centralized file:

```typescript
// apps/server/vitest.config.ts
import { serverConfig } from '../../config/vitest.config';
export default serverConfig;
```

### Test Commands

| Command            | Description                |
| ------------------ | -------------------------- |
| `pnpm test`        | Run all tests via Turbo    |
| `pnpm test:web`    | Run web tests only         |
| `pnpm test:server` | Run server tests only      |
| `pnpm test:ui`     | Run UI tests only          |
| `pnpm test:all`    | Run all tests sequentially |

### Test File Location

**Hybrid model:**

- Unit tests are colocated adjacent to the file under test.
- Integration/E2E tests are centralized in `src/__tests__/integration/` or `test/`.

```text
src/
├── auth/
│   ├── service.ts
│   └── service.test.ts
└── __tests__/
    └── integration/
        └── auth-flow.test.ts
```

---

## E2E Testing (Playwright)

End-to-end testing with Playwright (`config/playwright.config.ts`):

```typescript
import { defineConfig, devices } from '@playwright/test';

const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: '../apps/web/src/test/e2e',
  testMatch: /.*\.e2e\.(ts|tsx)/,

  // CI-aware settings
  fullyParallel: !CI,
  retries: CI ? 2 : 0,
  timeout: CI ? 30000 : 15000,

  use: {
    headless: CI,
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  // Auto-start dev server
  webServer: {
    command: 'pnpm dev:web',
    url: 'http://localhost:5173',
    reuseExistingServer: !CI,
  },
});
```

### E2E Test Commands

```bash
# Run E2E tests
pnpm exec playwright test

# Run with UI mode
pnpm exec playwright test --ui

# Run specific test
pnpm exec playwright test auth.e2e.ts
```

### Test File Location

E2E tests live in `apps/web/src/test/e2e/`:

```text
apps/web/src/test/e2e/
├── auth.e2e.ts
├── navigation.e2e.ts
└── ...
```

---

## Linting & Formatting

### ESLint Configuration

Using ESLint flat config (`eslint.config.ts`):

```typescript
export default [
  // Global ignores
  { ignores: ['**/node_modules/**', '**/dist/**', '**/.turbo/**'] },

  // TypeScript strict rules
  ...tseslint.configs.strictTypeChecked,

  // Per-project tsconfig
  {
    files: ['apps/server/**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: ['./apps/server/tsconfig.json'],
      },
    },
  },

  // TypeScript-specific rules
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },

  // Import order enforcement
  {
    plugins: { import: eslintPluginImport },
    rules: {
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
    },
  },

  // Prevent frontend from importing server code
  {
    files: ['apps/web/**/*', 'apps/desktop/**/*'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/apps/server/**'],
              message: 'Frontend must not import server modules.',
            },
          ],
        },
      ],
    },
  },
];
```

### Prettier Configuration

Located at `config/.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

### Lint Commands

| Command             | Description                             |
| ------------------- | --------------------------------------- |
| `pnpm lint`         | Lint all files                          |
| `pnpm lint:fix`     | Lint and auto-fix                       |
| `pnpm lint:staged`  | Lint staged files (used by lint-staged) |
| `pnpm format`       | Format all files                        |
| `pnpm format:check` | Check formatting                        |

### Linting Config Source of Truth

Linting configuration is centralized in `config/linting.json` and synced via:

```bash
pnpm sync:linting        # Sync package.json + .vscode/settings.json
pnpm sync:linting:check  # CI/check mode
```

---

## Git Hooks

### simple-git-hooks

Configured in `package.json`:

```json
{
  "simple-git-hooks": {
    "pre-commit": "pnpm pre-commit",
    "pre-push": "pnpm build"
  }
}
```

### Pre-commit Hook

The `pre-commit` script runs:

```bash
pnpm pre-commit
# Expands to:
pnpm config:generate && \
pnpm sync:headers && \
pnpm sync:theme && \
pnpm lint-staged && \
pnpm type-check
```

### lint-staged

Only formats/lints staged files:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx,cjs,mjs,cts,mts,json,css,scss,md}": [
      "pnpm prettier --config config/.prettierrc --ignore-path config/.prettierignore --write"
    ],
    "**/*.{ts,tsx,js,jsx,cjs,mjs,cts,mts}": ["pnpm lint:staged"]
  }
}
```

---

## Docker Configuration

### Docker Compose

Located at `config/docker/docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  maildev:
    image: maildev/maildev
    ports:
      - '1080:1080' # Web UI
      - '1025:1025' # SMTP
```

### Docker Commands

```bash
pnpm docker:up    # Start containers
pnpm docker:down  # Stop containers
pnpm docker:logs  # View logs
```

---

## CI/CD Configuration

GitHub Actions workflows in `.github/workflows/`:

| Workflow                         | Purpose                                          |
| -------------------------------- | ------------------------------------------------ |
| `ci.yml`                         | Main CI pipeline (build, lint, test, type-check) |
| `security.yml`                   | Security scanning                                |
| `audit.yml`                      | Dependency auditing                              |
| `auto-merge-main-to-dev.yml`     | Auto-merge main → dev                            |
| `auto-merge-claude-sessions.yml` | Auto-merge Claude Code sessions                  |

### CI Pipeline (`ci.yml`)

The main CI pipeline runs on every push and pull request:

```yaml
jobs:
  setup:
    # Install dependencies and cache node_modules

  build-and-verify:
    needs: setup
    steps:
      # Check all sync scripts (tsconfig, headers)
      - run: pnpm sync:tsconfig:check
      - run: pnpm sync:headers:check

      # Full build pipeline
      - run: pnpm build # format → lint → test → type-check → theme → build

      # Archive artifacts
      - uses: actions/upload-artifact@v4
```

### Caching in CI

- **pnpm cache** - Node.js action caches pnpm store
- **node_modules cache** - Cached by `pnpm-lock.yaml` hash
- **Turbo cache** - Cached by commit SHA with restore keys

---

## Troubleshooting

### Common Issues

#### Build fails with stale cache

```bash
pnpm clean:cache
pnpm build
```

#### Tests fail with path alias errors

1. Check `apps/*/vite.config.ts` aliases match `tsconfig.json` paths
2. Ensure both files define the same aliases for the same paths

#### ESLint can't find tsconfig

Each project needs its tsconfig registered in `eslint.config.ts`:

```typescript
{
  files: ['apps/newapp/**/*.ts'],
  languageOptions: {
    parserOptions: {
      project: ['./apps/newapp/tsconfig.json']
    }
  }
}
```

#### TypeScript incremental build broken

If `dist/` is deleted but `tsconfig.tsbuildinfo` remains:

```bash
rm -f packages/*/tsconfig.tsbuildinfo
pnpm build
```

#### Turbo cache returning stale results

```bash
rm -rf .turbo .cache/turbo
pnpm build
```

### Debug Commands

```bash
# Check which packages are affected
pnpm turbo run build --dry-run

# View dependency graph
pnpm turbo run build --graph

# Skip cache for one run
pnpm turbo run build --force

# Verbose output
pnpm turbo run build --verbosity=2
```

---

_Philosophy: Convention over configuration. Automation over manual work._
