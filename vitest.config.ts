// vitest.config.ts
/// <reference types="vitest" />
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

/**
 * Shared base configuration for all vitest projects in the monorepo.
 * Individual packages extend this via mergeConfig in their vitest.config.ts.
 */
export const baseConfig = defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/backup/**', '**/*.spec.ts'],
    testTimeout: 10000,
  },
});

export default baseConfig;
