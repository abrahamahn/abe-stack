// apps/desktop/vitest.config.ts
import react from '@vitejs/plugin-react';
import path from 'path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

export default mergeConfig(baseConfig, {
  plugins: [react()],
  resolve: {
    alias: [
      // Handle subpath imports first
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
    ],
  },
  test: {
    name: 'desktop',
    environment: 'jsdom',
    setupFiles: ['../web/src/__tests__/setup.ts'],
  },
});
