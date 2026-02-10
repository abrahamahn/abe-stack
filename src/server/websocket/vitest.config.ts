// src/server/websocket/vitest.config.ts

import path from 'node:path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../../vitest.config';

export default mergeConfig(baseConfig, {
  resolve: {
    alias: [
      {
        find: /^@abe-stack\/db\/(.*)$/,
        replacement: path.resolve(__dirname, '../db/src/$1'),
      },
      {
        find: '@abe-stack/db',
        replacement: path.resolve(__dirname, '../db/src/index.ts'),
      },
      {
        find: /^@abe-stack\/shared\/(.*)$/,
        replacement: path.resolve(__dirname, '../../shared/src/$1'),
      },
      {
        find: '@abe-stack/shared',
        replacement: path.resolve(__dirname, '../../shared/src/index.ts'),
      },
      {
        find: /^@abe-stack\/server-engine\/(.*)$/,
        replacement: path.resolve(__dirname, '../engine/src/$1'),
      },
      {
        find: '@abe-stack/server-engine',
        replacement: path.resolve(__dirname, '../engine/src/index.ts'),
      },
    ],
  },
  test: {
    name: 'websocket',
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
  },
});
