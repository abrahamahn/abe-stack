// main/server/core/vitest.config.ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      // Subpath imports must come before bare imports
      {
        find: /^@bslt\/shared\/(.*)$/,
        replacement: path.resolve(__dirname, '../../shared/src/$1/index.ts'),
      },
      {
        find: /^@bslt\/server-system\/(.*)$/,
        replacement: path.resolve(__dirname, '../system/src/$1/index.ts'),
      },
      {
        find: '@bslt/shared',
        replacement: path.resolve(__dirname, '../../shared/src/index.ts'),
      },
      {
        find: '@bslt/server-system',
        replacement: path.resolve(__dirname, '../system/src/index.ts'),
      },
      {
        find: /^@bslt\/db\/(.*)$/,
        replacement: path.resolve(__dirname, '../db/src/$1/index.ts'),
      },
      {
        find: '@bslt/db',
        replacement: path.resolve(__dirname, '../db/src/index.ts'),
      },
    ],
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: ['dot'],
    pool: 'threads',
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
