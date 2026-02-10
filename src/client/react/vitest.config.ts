// src/client/react/vitest.config.ts

import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../../vitest.config';

const srcDir = path.resolve(__dirname, 'src');

export default mergeConfig(baseConfig, {
  plugins: [tsconfigPaths({ projects: [path.resolve(__dirname, 'tsconfig.json')] })],
  resolve: {
    alias: [
      {
        find: '@abe-stack/client-engine',
        replacement: path.resolve(__dirname, '..', 'engine', 'src'),
      },
      {
        find: '@abe-stack/api',
        replacement: path.resolve(__dirname, '..', 'api', 'src', 'index.ts'),
      },
      {
        find: '@abe-stack/shared',
        replacement: path.resolve(__dirname, '..', '..', 'shared', 'src'),
      },
      { find: '@hooks', replacement: path.join(srcDir, 'hooks') },
      { find: '@providers', replacement: path.join(srcDir, 'providers') },
      { find: '@router', replacement: path.join(srcDir, 'router') },
      { find: '@theme', replacement: path.join(srcDir, 'theme') },
    ],
  },
  test: {
    name: 'react',
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
    testTimeout: 10000,
    pool: 'threads',
    maxConcurrency: 4,
  },
});
