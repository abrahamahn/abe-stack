// config/schema/build.ts
/**
 * Build Configuration Schema - Vite & Vitest Settings
 *
 * Edit this file to change build settings across the monorepo.
 * Run: pnpm config:generate
 *
 * For path aliases, see: aliases.ts
 */

import path from 'node:path';

// Re-export aliases for backwards compatibility
export { aliasDefinitions } from './aliases';

/**
 * Repository root (computed at runtime)
 */
export const getRepoRoot = (): string => path.resolve(__dirname, '../..');

/**
 * Package paths helper
 */
export const getPaths = (): {
  repoRoot: string;
  apps: { web: string; server: string; desktop: string };
  packages: { core: string; sdk: string; ui: string };
} => {
  const repoRoot = getRepoRoot();
  return {
    repoRoot,
    apps: {
      web: path.join(repoRoot, 'apps/web'),
      server: path.join(repoRoot, 'apps/server'),
      desktop: path.join(repoRoot, 'apps/desktop'),
    },
    packages: {
      core: path.join(repoRoot, 'packages/core'),
      sdk: path.join(repoRoot, 'packages/sdk'),
      ui: path.join(repoRoot, 'packages/ui'),
    },
  };
};

/**
 * Shared Vite plugins configuration
 */
export const vitePlugins = {
  react: true,
} as const;

/**
 * Vite configuration for web app
 * Uses explicit aliases from config/schema/aliases.ts
 */
export const viteWeb = {
  plugins: ['react'],
} as const;

/**
 * Vite configuration for desktop app
 */
export const viteDesktop = {
  plugins: ['react'],
  base: './',
  portPreferences: [5173, 5174, 5175],
} as const;

/**
 * Shared Vitest coverage exclusions
 */
export const coverageExclude = [
  '**/node_modules/**',
  '**/dist/**',
  '**/backup/**',
  '**/config/**',
  '**/tools/**',
  '**/*.config.{js,ts}',
  '**/*.d.ts',
] as const;

/**
 * Base Vitest configuration
 */
export const vitestBase = {
  globals: true,
  environment: 'node' as const,
  include: ['**/tests/unit/**/*.{test,spec}.{js,ts,tsx}', '**/src/**/*.{test,spec}.{js,ts,tsx}'],
  exclude: [
    '**/node_modules/**',
    '**/dist/**',
    '**/tests/integration/**',
    '**/tests/e2e/**',
    '**/backup/**',
  ],
  coverage: {
    provider: 'v8' as const,
    reporter: ['text', 'json', 'html'],
    exclude: [...coverageExclude],
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
} as const;

/**
 * Vitest configuration for web app
 */
export const vitestWeb = {
  environment: 'jsdom' as const,
  passWithNoTests: true,
  setupFiles: ['src/test/setup.ts'],
  exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/*.spec.ts', '**/*.e2e.ts'],
} as const;

/**
 * Vitest configuration for server app
 */
export const vitestServer = {
  environment: 'node' as const,
  setupFiles: [] as string[],
} as const;

/**
 * Vitest configuration for core package
 */
export const vitestCore = {
  environment: 'node' as const,
  include: ['src/**/*.{test,spec}.ts'],
  coverage: {
    provider: 'v8' as const,
    reporter: ['text', 'json'],
  },
} as const;

/**
 * Vitest configuration for SDK package
 */
export const vitestSdk = {
  environment: 'node' as const,
  include: ['src/**/*.{test,spec}.ts'],
  coverage: {
    provider: 'v8' as const,
    reporter: ['text', 'json'],
  },
} as const;

/**
 * Vitest configuration for UI package
 */
export const vitestUi = {
  environment: 'jsdom' as const,
  setupFiles: ['src/test/setup.ts'],
  include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
  exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
} as const;

/**
 * Vitest configuration for integration tests
 */
export const vitestIntegration = {
  include: ['**/tests/integration/**/*.{test,spec}.{js,ts}'],
  exclude: ['**/node_modules/**', '**/dist/**', '**/backup/**'],
  testTimeout: 30000,
  hookTimeout: 30000,
} as const;
