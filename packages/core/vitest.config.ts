// packages/core/vitest.config.ts

import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

export default mergeConfig(baseConfig, {
  test: {
    name: 'core',
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
  },
});
