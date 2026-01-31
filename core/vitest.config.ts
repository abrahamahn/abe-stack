// core/vitest.config.ts

import path from 'path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../vitest.config';

export default mergeConfig(baseConfig, {
  resolve: {
    alias: [
      // Handle subpath imports first (e.g., @abe-stack/contracts/auth)
      {
        find: /^@abe-stack\/contracts\/(.*)$/,
        replacement: path.resolve(__dirname, '../infra/contracts/src/$1'),
      },
      // Handle main package import
      {
        find: '@abe-stack/contracts',
        replacement: path.resolve(__dirname, '../infra/contracts/src/index.ts'),
      },
    ],
  },
  test: {
    name: 'core',
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
  },
});
