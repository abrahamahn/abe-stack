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
        replacement: path.resolve(__dirname, '../../infra/contracts/src/$1'),
      },
      {
        find: /^@abe-stack\/core\/(.*)$/,
        replacement: path.resolve(__dirname, '../../core/src/$1'),
      },
      {
        find: /^@abe-stack\/ui\/(.*)$/,
        replacement: path.resolve(__dirname, '../../client/ui/src/$1'),
      },
      {
        find: /^@abe-stack\/client\/(.*)$/,
        replacement: path.resolve(__dirname, '../../client/src/$1'),
      },
      {
        find: /^@abe-stack\/stores\/(.*)$/,
        replacement: path.resolve(__dirname, '../../client/stores/src/$1'),
      },
      // Handle main package imports
      {
        find: '@abe-stack/contracts',
        replacement: path.resolve(__dirname, '../../infra/contracts/src/index.ts'),
      },
      {
        find: '@abe-stack/core',
        replacement: path.resolve(__dirname, '../../core/src/index.ts'),
      },
      {
        find: '@abe-stack/ui',
        replacement: path.resolve(__dirname, '../../client/ui/src/index.ts'),
      },
      {
        find: '@abe-stack/client',
        replacement: path.resolve(__dirname, '../../client/src/index.ts'),
      },
      {
        find: '@abe-stack/stores',
        replacement: path.resolve(__dirname, '../../client/stores/src/index.ts'),
      },
    ],
  },
  test: {
    name: 'desktop',
    environment: 'jsdom',
    setupFiles: ['../web/src/__tests__/setup.ts'],
  },
});
