import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vitest/config';

const repoRoot = path.resolve(__dirname, '..');
const webRoot = path.join(repoRoot, 'apps/web');
const serverRoot = path.join(repoRoot, 'apps/server');
const uiRoot = path.join(repoRoot, 'packages/ui');

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
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/backup/**',
        '**/config/**',
        '**/tools/**',
        '**/*.config.{js,ts}',
        '**/*.d.ts',
      ],
      thresholds: {
        global: {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
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
      environment: 'node',
      globals: true,
      include: ['**/tests/integration/**/*.{test,spec}.{js,ts}'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/backup/**'],
      testTimeout: 30000,
      hookTimeout: 30000,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          '**/node_modules/**',
          '**/dist/**',
          '**/backup/**',
          '**/config/**',
          '**/tools/**',
          '**/*.config.{js,ts}',
          '**/*.d.ts',
        ],
      },
    },
  }),
);

export const serverConfig = mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: 'node',
      globals: true,
      setupFiles: [],
    },
    resolve: {
      alias: [
        { find: '@', replacement: path.join(serverRoot, 'src') },
        { find: '@config', replacement: path.join(serverRoot, 'src/config') },
        { find: '@modules', replacement: path.join(serverRoot, 'src/modules') },
        { find: '@scripts', replacement: path.join(serverRoot, 'src/scripts') },
        { find: '@shared', replacement: path.join(serverRoot, 'src/shared') },
        { find: '@types', replacement: path.join(serverRoot, 'src/types') },
        { find: '@infra', replacement: path.join(serverRoot, 'src/infra') },
        { find: '@crypto', replacement: path.join(serverRoot, 'src/infra/crypto') },
        { find: '@database', replacement: path.join(serverRoot, 'src/infra/database') },
        { find: '@email', replacement: path.join(serverRoot, 'src/infra/email') },
        { find: '@http', replacement: path.join(serverRoot, 'src/infra/http') },
        { find: '@pubsub', replacement: path.join(serverRoot, 'src/infra/pubsub') },
        { find: '@rate-limit', replacement: path.join(serverRoot, 'src/infra/rate-limit') },
        { find: '@security', replacement: path.join(serverRoot, 'src/infra/security') },
        { find: '@storage', replacement: path.join(serverRoot, 'src/infra/storage') },
        { find: '@websocket', replacement: path.join(serverRoot, 'src/infra/websocket') },
      ],
    },
  }),
);

export const webConfig = mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      passWithNoTests: true,
      setupFiles: ['./src/test/setup.ts'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/*.spec.ts', '**/*.e2e.ts'],
    },
    resolve: {
      alias: {
        '@': path.join(webRoot, 'src'),
        '@abe-stack/sdk': path.join(repoRoot, 'packages/sdk/src'),
        '@abe-stack/core': path.join(repoRoot, 'packages/core/src'),
        '@abe-stack/ui': path.join(repoRoot, 'packages/ui/src'),
        '@api': path.join(webRoot, 'src/api'),
        '@app': path.join(webRoot, 'src/app'),
        '@config': path.join(webRoot, 'src/config'),
        '@features': path.join(webRoot, 'src/features'),
        '@auth': path.join(webRoot, 'src/features/auth'),
        '@dashboard': path.join(webRoot, 'src/features/dashboard'),
        '@demo': path.join(webRoot, 'src/features/demo'),
        '@toast': path.join(webRoot, 'src/features/toast'),
        '@pages': path.join(webRoot, 'src/pages'),
        '@test': path.join(webRoot, 'src/test'),
      },
    },
  }),
);

export const coreConfig = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
    },
  },
});

export const sdkConfig = defineConfig({
  resolve: {
    alias: {
      '@abe-stack/core': path.join(repoRoot, 'packages/core/src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json'],
    },
  },
});

export const uiConfig = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@components': path.join(uiRoot, 'src/components'),
      '@elements': path.join(uiRoot, 'src/elements'),
      '@hooks': path.join(uiRoot, 'src/hooks'),
      '@layouts': path.join(uiRoot, 'src/layouts'),
      '@styles': path.join(uiRoot, 'src/styles'),
      '@test': path.join(uiRoot, 'src/test'),
      '@theme': path.join(uiRoot, 'src/theme'),
      '@utils': path.join(uiRoot, 'src/utils'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  },
});

const configMap = {
  base: baseConfig,
  core: coreConfig,
  integration: integrationConfig,
  sdk: sdkConfig,
  server: serverConfig,
  ui: uiConfig,
  web: webConfig,
} as const;

const target = process.env.VITEST_TARGET as keyof typeof configMap | undefined;

export default target && configMap[target] ? configMap[target] : baseConfig;
