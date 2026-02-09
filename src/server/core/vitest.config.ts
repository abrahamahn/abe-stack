// src/server/core/vitest.config.ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      // Subpath imports must come before bare imports
      {
        find: /^@abe-stack\/shared\/(.*)$/,
        replacement: path.resolve(__dirname, '../../shared/src/$1/index.ts'),
      },
      {
        find: /^@abe-stack\/server-engine\/(.*)$/,
        replacement: path.resolve(__dirname, '../engine/src/$1/index.ts'),
      },
      {
        find: /^@abe-stack\/engine\/(.*)$/,
        replacement: path.resolve(__dirname, '../engine/src/$1/index.ts'),
      },
      {
        find: '@abe-stack/shared',
        replacement: path.resolve(__dirname, '../../shared/src/index.ts'),
      },
      {
        find: '@abe-stack/server-engine',
        replacement: path.resolve(__dirname, '../engine/src/index.ts'),
      },
      {
        find: /^@abe-stack\/db\/(.*)$/,
        replacement: path.resolve(__dirname, '../db/src/$1/index.ts'),
      },
      {
        find: '@abe-stack/db',
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
