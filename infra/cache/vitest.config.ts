// infra/cache/vitest.config.ts

import path from 'path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

export default mergeConfig(baseConfig, {
  resolve: {
    alias: [
      // Handle subpath imports first (e.g., @abe-stack/core/infrastructure)
      {
        find: /^@abe-stack\/core\/(.*)$/,
        replacement: path.resolve(__dirname, '../../shared/core/src/$1'),
      },
      // Handle main package import
      {
        find: '@abe-stack/core',
        replacement: path.resolve(__dirname, '../../shared/core/src/index.ts'),
      },
      // Handle contracts import (transitive dependency via core)
      {
        find: '@abe-stack/contracts',
        replacement: path.resolve(__dirname, '../contracts/src/index.ts'),
      },
    ],
  },
  test: {
    name: 'cache',
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
  },
});
