// infra/jobs/vitest.config.ts

import path from 'path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

export default mergeConfig(baseConfig, {
  resolve: {
    alias: [
      {
        find: /^@abe-stack\/core\/(.*)$/,
        replacement: path.resolve(__dirname, '../core/src/$1'),
      },
      {
        find: '@abe-stack/core',
        replacement: path.resolve(__dirname, '../core/src/index.ts'),
      },
      {
        find: '@abe-stack/db',
        replacement: path.resolve(__dirname, '../db/src/index.ts'),
      },
    ],
  },
  test: {
    name: 'jobs',
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
  },
});
