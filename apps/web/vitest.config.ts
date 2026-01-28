// apps/web/vitest.config.ts
/**
 * Vitest configuration for web app tests.
 *
 * Key configuration:
 * - Uses jsdom for browser environment simulation
 * - Aliases workspace packages to source (not dist) for consistent module resolution
 * - Aliases UI package internal paths for tests that import UI components
 */
import react from '@vitejs/plugin-react';
import path from 'path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

export default mergeConfig(baseConfig, {
  plugins: [react()],
  resolve: {
    alias: {
      // Workspace package aliases - CRITICAL: Point to source, not dist
      // This ensures all imports resolve to the same module instance,
      // preventing issues where contexts (RouterContext, QueryCacheContext)
      // are created twice when importing from both source and compiled code.
      //
      // Root package imports (e.g., import { X } from '@abe-stack/ui')
      '@abe-stack/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@abe-stack/sdk': path.resolve(__dirname, '../../packages/sdk/src/index.ts'),
      '@abe-stack/stores': path.resolve(__dirname, '../../packages/stores/src/index.ts'),
      //
      // Deep imports (e.g., import { X } from '@abe-stack/core/infrastructure/transactions')
      // Note: These must come BEFORE the root import to match first
      '@abe-stack/core/infrastructure/transactions': path.resolve(
        __dirname,
        '../../packages/core/src/infrastructure/transactions/index.ts',
      ),
      '@abe-stack/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),

      // UI package internal aliases - for tests that import UI components
      // These resolve internal @alias imports within the UI package source
      '@utils': path.resolve(__dirname, '../../packages/ui/src/utils'),
      '@elements': path.resolve(__dirname, '../../packages/ui/src/elements'),
      '@components': path.resolve(__dirname, '../../packages/ui/src/components'),
      '@hooks': path.resolve(__dirname, '../../packages/ui/src/hooks'),
      '@theme': path.resolve(__dirname, '../../packages/ui/src/theme'),
      '@layouts': path.resolve(__dirname, '../../packages/ui/src/layouts'),
      '@providers': path.resolve(__dirname, '../../packages/ui/src/providers'),
      '@shells': path.resolve(__dirname, '../../packages/ui/src/layouts/shells'),
      '@layers': path.resolve(__dirname, '../../packages/ui/src/layouts/layers'),
      '@containers': path.resolve(__dirname, '../../packages/ui/src/layouts/containers'),
    },
  },
  test: {
    name: 'web',
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
