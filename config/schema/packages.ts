// config/schema/packages.ts
/**
 * Package Configuration Schema - package.json scripts
 *
 * Edit this file to change shared scripts across packages.
 * Run: pnpm config:generate
 */

/**
 * Scripts shared across all packages
 */
export const sharedScripts = {
  'type-check': 'tsc --noEmit',
  clean: 'rm -rf dist tsconfig.tsbuildinfo',
} as const;

/**
 * Scripts for library packages (packages/*)
 */
export const libraryScripts = {
  build: '[ -d dist ] || rm -f tsconfig.tsbuildinfo && tsc --build',
} as const;

/**
 * Per-package script configurations
 */
export const packageScripts: Record<string, Record<string, string>> = {
  'apps/web': {
    dev: 'vite --config ../../config/vite.web.config.ts',
    build: 'tsc && vite build --config ../../config/vite.web.config.ts',
    preview: 'vite preview --config ../../config/vite.web.config.ts',
    test: 'VITEST_TARGET=web vitest --config ../../config/vitest.config.ts',
  },

  'apps/server': {
    dev: 'tsx watch src/main.ts',
    build: 'tsc -p tsconfig.build.json && tsc-alias -p tsconfig.build.json',
    start: 'node dist/main.js',
    test: 'VITEST_TARGET=server vitest --config ../../config/vitest.config.ts',
  },

  'apps/desktop': {
    dev: 'concurrently "vite --config ../../config/vite.desktop.config.ts" "tsx src/electron/main.ts"',
    build:
      'vite build --config ../../config/vite.desktop.config.ts && tsc -p tsconfig.electron.json',
    test: 'vitest --config vitest.config.ts',
  },

  'packages/core': {
    build: 'tsc --build',
    test: 'VITEST_TARGET=core vitest --config ../../config/vitest.config.ts',
  },

  'packages/sdk': {
    build: 'tsc --build',
    test: 'VITEST_TARGET=sdk vitest --config ../../config/vitest.config.ts',
  },

  'packages/ui': {
    build: 'tsc --build',
    test: 'VITEST_TARGET=ui vitest --config ../../config/vitest.config.ts',
  },
};

/**
 * Root package.json scripts
 */
export const rootScripts = {
  // Config generation
  'config:generate': 'tsx config/generators/index.ts',
  'config:generate:check': 'tsx config/generators/index.ts --check',

  // Dev
  dev: 'tsx tools/dev/start-dev.ts',
  'dev:web': 'tsx tools/dev/start-dev.ts web',
  'dev:server': 'tsx tools/dev/start-dev.ts server',
  'dev:desktop': 'tsx tools/dev/start-dev.ts desktop',

  // Build
  build: 'pnpm theme:build && turbo run build lint type-check test',
  'build:fast': 'pnpm theme:build && turbo run build',
  'build:validate': 'turbo run validate build',
  'build:web': 'turbo run build --filter=@abe-stack/web',
  'build:server': 'turbo run build --filter=@abe-stack/server',
  'build:desktop': 'turbo run build --filter=@abe-stack/desktop',
  'build:contracts': 'turbo run build --filter=@abe-stack/core',
  'build:ui': 'turbo run build --filter=@abe-stack/ui',

  // Theme
  'theme:build': 'node --import tsx tools/sync/sync-css-theme.ts',
  'theme:watch': 'node --import tsx tools/sync/sync-css-theme.ts --watch',
  'sync:theme': 'node --import tsx tools/sync/sync-css-theme.ts',
  'sync:theme:watch': 'node --import tsx tools/sync/sync-css-theme.ts --watch',

  // Test
  test: 'turbo run test',
  'test:all': 'tsx tools/dev/test-all.ts',
  'test:web': 'turbo run test --filter=@abe-stack/web',
  'test:server': 'turbo run test --filter=@abe-stack/server',
  'test:desktop': 'turbo run test --filter=@abe-stack/desktop',
  'test:ui': 'turbo run test --filter=@abe-stack/ui',
  'test:core': 'turbo run test --filter=@abe-stack/core',
  'test:sdk': 'turbo run test --filter=@abe-stack/sdk',

  // Lint
  lint: 'eslint . --cache --cache-location .cache/eslint/.cache --ext .js,.jsx,.ts,.tsx,.cjs,.mjs,.cts,.mts --report-unused-disable-directives --max-warnings=0',
  'lint:fix':
    'eslint . --cache --cache-location .cache/eslint/.cache --ext .js,.jsx,.ts,.tsx,.cjs,.mjs,.cts,.mts --fix',
  'lint:changed': 'eslint --cache --cache-location .cache/eslint/.cache --max-warnings=0',
  'lint:staged':
    'eslint --cache --cache-location .cache/eslint/.cache --report-unused-disable-directives --max-warnings=0 --no-warn-ignored',

  // Sync scripts (kept - these transform code, not config)
  'sync:headers': 'tsx tools/sync/sync-file-headers.ts',
  'sync:headers:check': 'tsx tools/sync/sync-file-headers.ts --check',
  'sync:headers:watch': 'tsx tools/sync/sync-file-headers.ts --watch',
  'sync:imports': 'tsx tools/sync/sync-import-aliases.ts',
  'sync:imports:check': 'tsx tools/sync/sync-import-aliases.ts --check',
  'sync:imports:watch': 'tsx tools/sync/sync-import-aliases.ts --watch',
  'sync:tests': 'tsx tools/sync/sync-test-folders.ts',
  'sync:tests:check': 'tsx tools/sync/sync-test-folders.ts --check',
  'sync:tests:watch': 'tsx tools/sync/sync-test-folders.ts --watch',

  // Type check
  'type-check': 'turbo run type-check',

  // Format
  format:
    'prettier --config config/.prettierrc --ignore-path config/.prettierignore --cache --cache-location .cache/prettier/.cache --write .',
  'format:check':
    'prettier --config config/.prettierrc --ignore-path config/.prettierignore --cache --cache-location .cache/prettier/.cache --check .',

  // Validate
  validate: 'turbo run validate',

  // Clean
  clean: 'turbo run clean && rm -rf node_modules .turbo .cache',
  'clean:cache':
    'rm -rf .turbo .cache packages/*/tsconfig.tsbuildinfo apps/*/tsconfig.tsbuildinfo packages/*/.cache apps/*/.cache',

  // Export
  export: 'node tools/export/export-code.ts',
  'export:ui': 'node tools/export/export-ui-code.ts',

  // Database
  'db:restart': 'tsx tools/restart-db.ts',

  // Setup
  setup: 'tsx tools/setup.ts',
  prepare: 'simple-git-hooks',

  // Docker
  'docker:up':
    'docker compose --env-file config/.env/.env.development -f config/docker/docker-compose.yml up --build',
  'docker:down':
    'docker compose --env-file config/.env/.env.development -f config/docker/docker-compose.yml down',
  'docker:logs':
    'docker compose --env-file config/.env/.env.development -f config/docker/docker-compose.yml logs -f',

  // Bundle size
  'bundle-size': 'tsx tools/dev/bundle-size.ts',
  'bundle-size:save': 'tsx tools/dev/bundle-size.ts --save',

  // Pre-commit (updated to use config:generate)
  'pre-commit':
    'pnpm config:generate && pnpm sync:headers && pnpm sync:imports && pnpm sync:tests && pnpm sync:theme && pnpm lint-staged && pnpm type-check',
} as const;
