// config/vitest.config.ts
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vitest/config';

const repoRoot = path.resolve(__dirname, '..');
const packagesRoot = path.join(repoRoot, 'packages');
const appsRoot = path.join(repoRoot, 'apps');

const webRoot = path.join(appsRoot, 'web');
const desktopRoot = path.join(appsRoot, 'desktop');
const uiRoot = path.join(packagesRoot, 'ui');

const packageAliases = {
  '@abe-stack/core': path.join(repoRoot, 'packages/core/src'),
  '@abe-stack/sdk': path.join(repoRoot, 'packages/sdk/src'),
  '@abe-stack/ui': path.join(repoRoot, 'packages/ui/src'),
};

function getWebAliases(): Record<string, string> {
  return {
    '@': path.join(webRoot, 'src'),
    '@api': path.join(webRoot, 'src/api'),
    '@app': path.join(webRoot, 'src/app'),
    '@config': path.join(webRoot, 'src/config'),
    '@features': path.join(webRoot, 'src/features'),
    '@auth': path.join(webRoot, 'src/features/auth'),
    '@dashboard': path.join(webRoot, 'src/features/dashboard'),
    '@demo': path.join(webRoot, 'src/features/demo'),
    '@catalog': path.join(webRoot, 'src/features/demo/catalog'),
    '@toast': path.join(webRoot, 'src/features/toast'),
    '@pages': path.join(webRoot, 'src/pages'),
    '@test': path.join(webRoot, 'src/test'),
    ...packageAliases,
    '@elements': path.join(repoRoot, 'packages/ui/src/elements'),
    '@components': path.join(repoRoot, 'packages/ui/src/components'),
    '@layouts': path.join(repoRoot, 'packages/ui/src/layouts'),
    '@containers': path.join(repoRoot, 'packages/ui/src/layouts/containers'),
    '@layers': path.join(repoRoot, 'packages/ui/src/layouts/layers'),
    '@shells': path.join(repoRoot, 'packages/ui/src/layouts/shells'),
    '@hooks': path.join(repoRoot, 'packages/ui/src/hooks'),
    '@theme': path.join(repoRoot, 'packages/ui/src/theme'),
    '@utils': path.join(repoRoot, 'packages/ui/src/utils'),
    '@contracts': path.join(repoRoot, 'packages/core/src/contracts'),
    '@stores': path.join(repoRoot, 'packages/core/src/stores'),
    '@validation': path.join(repoRoot, 'packages/core/src/validation'),
    '@tanstack/react-query': path.join(repoRoot, 'packages/ui/src/test/mocks/react-query.ts'),
  };
}

function getServerAliases(): Array<{ find: string; replacement: string }> {
  return [
    { find: '@', replacement: path.join(repoRoot, 'apps/server/src') },
    { find: '@config', replacement: path.join(repoRoot, 'apps/server/src/config') },
    { find: '@modules', replacement: path.join(repoRoot, 'apps/server/src/modules') },
    { find: '@scripts', replacement: path.join(repoRoot, 'apps/server/src/scripts') },
    { find: '@shared', replacement: path.join(repoRoot, 'apps/server/src/shared') },
    { find: '@types', replacement: path.join(repoRoot, 'apps/server/src/types') },
    { find: '@infra', replacement: path.join(repoRoot, 'apps/server/src/infra') },
    { find: '@crypto', replacement: path.join(repoRoot, 'apps/server/src/infra/crypto') },
    { find: '@database', replacement: path.join(repoRoot, 'apps/server/src/infra/database') },
    { find: '@schema', replacement: path.join(repoRoot, 'apps/server/src/infra/database/schema') },
    { find: '@email', replacement: path.join(repoRoot, 'apps/server/src/infra/email') },
    { find: '@health', replacement: path.join(repoRoot, 'apps/server/src/infra/health') },
    { find: '@http', replacement: path.join(repoRoot, 'apps/server/src/infra/http') },
    { find: '@pubsub', replacement: path.join(repoRoot, 'apps/server/src/infra/pubsub') },
    { find: '@rate-limit', replacement: path.join(repoRoot, 'apps/server/src/infra/rate-limit') },
    { find: '@security', replacement: path.join(repoRoot, 'apps/server/src/infra/security') },
    { find: '@storage', replacement: path.join(repoRoot, 'apps/server/src/infra/storage') },
    {
      find: '@providers',
      replacement: path.join(repoRoot, 'apps/server/src/infra/storage/providers'),
    },
    { find: '@websocket', replacement: path.join(repoRoot, 'apps/server/src/infra/websocket') },
    { find: '@auth', replacement: path.join(repoRoot, 'apps/server/src/modules/auth') },
    { find: '@admin', replacement: path.join(repoRoot, 'apps/server/src/modules/admin') },
    { find: '@users', replacement: path.join(repoRoot, 'apps/server/src/modules/users') },
    { find: '@utils', replacement: path.join(repoRoot, 'apps/server/src/modules/auth/utils') },
  ];
}

function getCoreAliases(): Record<string, string> {
  return {
    '@contracts': path.join(repoRoot, 'packages/core/src/contracts'),
    '@stores': path.join(repoRoot, 'packages/core/src/stores'),
    '@utils': path.join(repoRoot, 'packages/core/src/utils'),
    '@validation': path.join(repoRoot, 'packages/core/src/validation'),
  };
}

function getUiAliases(): Record<string, string> {
  return {
    '@components': path.join(repoRoot, 'packages/ui/src/components'),
    '@containers': path.join(repoRoot, 'packages/ui/src/layouts/containers'),
    '@elements': path.join(repoRoot, 'packages/ui/src/elements'),
    '@hooks': path.join(repoRoot, 'packages/ui/src/hooks'),
    '@layers': path.join(repoRoot, 'packages/ui/src/layouts/layers'),
    '@layouts': path.join(repoRoot, 'packages/ui/src/layouts'),
    '@shells': path.join(repoRoot, 'packages/ui/src/layouts/shells'),
    '@styles': path.join(repoRoot, 'packages/ui/src/styles'),
    '@test': path.join(repoRoot, 'packages/ui/src/test'),
    '@theme': path.join(repoRoot, 'packages/ui/src/theme'),
    '@utils': path.join(repoRoot, 'packages/ui/src/utils'),
    '@tanstack/react-query': path.join(repoRoot, 'packages/ui/src/test/mocks/react-query.ts'),
  };
}

function getSdkAliases(): Record<string, string> {
  return {
    '@persistence': path.join(repoRoot, 'packages/sdk/src/persistence'),
  };
}

function getDesktopAliases(): Record<string, string> {
  return {
    ...packageAliases,
  };
}

// Shared coverage exclusions
const coverageExclude = [
  '**/node_modules/**',
  '**/dist/**',
  '**/backup/**',
  '**/config/**',
  '**/tools/**',
  '**/*.config.{js,ts}',
  '**/*.d.ts',
  '**/index.ts', // Barrel exports only, no logic to test
  '**/media/image-processing.ts', // Browser-specific Canvas code, tested manually
  '**/packages/sdk/src/storage/idb.ts', // Browser-only IndexedDB wrapper
  '**/packages/sdk/src/api/react-query.ts', // ts-rest React Query integration
  '**/packages/sdk/src/storage/storage.ts', // Browser-only IndexedDB storage adapter
  '**/packages/sdk/src/realtime/RealtimeContext.tsx', // Complex React context, most coverage from integration tests
  '**/packages/sdk/src/storage/RecordStorage.ts', // Browser-only IndexedDB/localStorage backend code
  // Re-export only files (no logic)
  '**/apps/server/src/shared/validationError.ts',
  '**/apps/server/src/modules/auth/handlers.ts',
  // External service integrations (require running services for full testing)
  '**/apps/server/src/infra/email/smtp.ts', // SMTP transport needs real SMTP server
  '**/apps/server/src/infra/database/client.ts', // Database client needs real Postgres
  '**/apps/server/src/infra/database/schema/*.ts', // Schema functions need real database
  '**/apps/server/src/infra/websocket/websocket.ts', // WebSocket requires complex HTTP upgrade mocking
  '**/apps/server/src/app.ts', // Application bootstrap orchestrates many services
];

export const baseConfig = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/tests/unit/**/*.{test,spec}.{js,ts,tsx}', '**/src/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/tests/integration/**',
      '**/tests/e2e/**',
      '**/backup/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: coverageExclude,
      thresholds: {
        global: {
          branches: 95,
          functions: 95,
          lines: 95,
          statements: 95,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});

export const integrationConfig = mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ['**/tests/integration/**/*.{test,spec}.{js,ts}'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/backup/**'],
      testTimeout: 30000,
      hookTimeout: 30000,
    },
  }),
);

export const serverConfig = mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      setupFiles: [],
    },
    resolve: {
      alias: getServerAliases(),
    },
  }),
);

export const webConfig = mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      passWithNoTests: true,
      setupFiles: [`${webRoot}/src/test/setup.ts`],
      exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/*.spec.ts', '**/*.e2e.ts'],
    },
    resolve: {
      alias: getWebAliases(),
    },
  }),
);

export const coreConfig = mergeConfig(
  baseConfig,
  defineConfig({
    resolve: {
      alias: getCoreAliases(),
    },
    test: {
      include: ['src/**/*.{test,spec}.ts'],
    },
  }),
);

export const sdkConfig = mergeConfig(
  baseConfig,
  defineConfig({
    resolve: {
      alias: {
        '@abe-stack/core': packageAliases['@abe-stack/core'],
        ...getCoreAliases(),
        ...getSdkAliases(),
      },
    },
    test: {
      include: ['src/**/*.{test,spec}.ts'],
    },
  }),
);

export const uiConfig = mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [react()],
    resolve: {
      alias: getUiAliases(),
    },
    test: {
      environment: 'jsdom',
      setupFiles: [`${uiRoot}/src/test/setup.ts`],
      include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    },
  }),
);

export const desktopConfig = mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [react()],
    resolve: {
      alias: getDesktopAliases(),
    },
    test: {
      environment: 'node',
      include: [`${desktopRoot}/src/**/*.{test,spec}.{js,ts,tsx}`],
      exclude: ['**/node_modules/**', '**/dist/**'],
    },
  }),
);

const configMap = {
  base: baseConfig,
  core: coreConfig,
  desktop: desktopConfig,
  integration: integrationConfig,
  sdk: sdkConfig,
  server: serverConfig,
  ui: uiConfig,
  web: webConfig,
} as const;

const target = process.env.VITEST_TARGET as keyof typeof configMap | undefined;

export default target && configMap[target] ? configMap[target] : baseConfig;
