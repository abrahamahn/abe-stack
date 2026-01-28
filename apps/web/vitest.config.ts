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
    alias: [
      // Handle subpath imports first (regex patterns must come before exact matches)
      {
        find: /^@abe-stack\/contracts\/(.*)$/,
        replacement: path.resolve(__dirname, '../../packages/contracts/src/$1'),
      },
      {
        find: /^@abe-stack\/core\/(.*)$/,
        replacement: path.resolve(__dirname, '../../packages/core/src/$1'),
      },
      {
        find: /^@abe-stack\/ui\/(.*)$/,
        replacement: path.resolve(__dirname, '../../packages/ui/src/$1'),
      },
      {
        find: /^@abe-stack\/sdk\/(.*)$/,
        replacement: path.resolve(__dirname, '../../packages/sdk/src/$1'),
      },
      {
        find: /^@abe-stack\/stores\/(.*)$/,
        replacement: path.resolve(__dirname, '../../packages/stores/src/$1'),
      },
      // Handle main package imports
      {
        find: '@abe-stack/contracts',
        replacement: path.resolve(__dirname, '../../packages/contracts/src/index.ts'),
      },
      {
        find: '@abe-stack/core',
        replacement: path.resolve(__dirname, '../../packages/core/src/index.ts'),
      },
      {
        find: '@abe-stack/ui',
        replacement: path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      },
      {
        find: '@abe-stack/sdk',
        replacement: path.resolve(__dirname, '../../packages/sdk/src/index.ts'),
      },
      {
        find: '@abe-stack/stores',
        replacement: path.resolve(__dirname, '../../packages/stores/src/index.ts'),
      },
      // Web app feature module aliases - must match tsconfig.json paths
      { find: '@app', replacement: path.resolve(__dirname, './src/app') },
      { find: '@api', replacement: path.resolve(__dirname, './src/api') },
      { find: '@admin', replacement: path.resolve(__dirname, './src/features/admin') },
      { find: '@auth', replacement: path.resolve(__dirname, './src/features/auth') },
      { find: '@billing', replacement: path.resolve(__dirname, './src/features/billing') },
      { find: '@catalog', replacement: path.resolve(__dirname, './src/features/demo/catalog') },
      { find: '@config', replacement: path.resolve(__dirname, './src/config') },
      { find: '@dashboard', replacement: path.resolve(__dirname, './src/features/dashboard') },
      { find: '@demo', replacement: path.resolve(__dirname, './src/features/demo') },
      { find: '@features', replacement: path.resolve(__dirname, './src/features') },
      { find: '@pages', replacement: path.resolve(__dirname, './src/pages') },
      { find: '@settings', replacement: path.resolve(__dirname, './src/features/settings') },
      // UI package internal aliases - for tests that import UI components
      { find: '@utils', replacement: path.resolve(__dirname, '../../packages/ui/src/utils') },
      { find: '@elements', replacement: path.resolve(__dirname, '../../packages/ui/src/elements') },
      {
        find: '@components',
        replacement: path.resolve(__dirname, '../../packages/ui/src/components'),
      },
      { find: '@hooks', replacement: path.resolve(__dirname, '../../packages/ui/src/hooks') },
      { find: '@theme', replacement: path.resolve(__dirname, '../../packages/ui/src/theme') },
      { find: '@layouts', replacement: path.resolve(__dirname, '../../packages/ui/src/layouts') },
      {
        find: '@providers',
        replacement: path.resolve(__dirname, '../../packages/ui/src/providers'),
      },
      {
        find: '@shells',
        replacement: path.resolve(__dirname, '../../packages/ui/src/layouts/shells'),
      },
      {
        find: '@layers',
        replacement: path.resolve(__dirname, '../../packages/ui/src/layouts/layers'),
      },
      {
        find: '@containers',
        replacement: path.resolve(__dirname, '../../packages/ui/src/layouts/containers'),
      },
    ],
  },
  test: {
    name: 'web',
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
  },
});
