// main/server/system/vitest.config.ts

import path from 'path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../../vitest.config';

export default mergeConfig(baseConfig, {
  resolve: {
    alias: [
      {
        find: /^@bslt\/db\/(.*)$/,
        replacement: path.resolve(__dirname, '../db/src/$1'),
      },
      {
        find: '@bslt/db',
        replacement: path.resolve(__dirname, '../db/src/index.ts'),
      },
      {
        find: /^@bslt\/shared\/(.*)$/,
        replacement: path.resolve(__dirname, '../../shared/src/$1'),
      },
      {
        find: '@bslt/shared',
        replacement: path.resolve(__dirname, '../../shared/src/index.ts'),
      },
    ],
  },
  test: {
    name: 'engine',
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
  },
});
