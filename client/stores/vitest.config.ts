// client/stores/vitest.config.ts

import path from 'path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

export default mergeConfig(baseConfig, {
  resolve: {
    alias: [
      // Handle subpath imports first
      {
        find: /^@abe-stack\/core\/(.*)$/,
        replacement: path.resolve(__dirname, '../../core/src/$1'),
      },
      {
        find: /^@abe-stack\/contracts\/(.*)$/,
        replacement: path.resolve(__dirname, '../../infra/contracts/src/$1'),
      },
      // Handle main package imports
      {
        find: '@abe-stack/core',
        replacement: path.resolve(__dirname, '../../core/src/index.ts'),
      },
      {
        find: '@abe-stack/contracts',
        replacement: path.resolve(__dirname, '../../infra/contracts/src/index.ts'),
      },
    ],
  },
  test: {
    name: 'stores',
    environment: 'jsdom',
    isolate: true,
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
  },
});
