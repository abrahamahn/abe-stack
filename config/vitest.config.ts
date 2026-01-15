import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vitest/config';

import {
  getServerAliases,
  getUiAliases,
  getWebAliases,
  packageAliases,
  uiRoot,
  webRoot,
} from './aliases';

// Shared coverage exclusions
const coverageExclude = [
  '**/node_modules/**',
  '**/dist/**',
  '**/backup/**',
  '**/config/**',
  '**/tools/**',
  '**/*.config.{js,ts}',
  '**/*.d.ts',
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
      '@abe-stack/core': packageAliases['@abe-stack/core'],
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
    alias: getUiAliases(),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [`${uiRoot}/src/test/setup.ts`],
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
