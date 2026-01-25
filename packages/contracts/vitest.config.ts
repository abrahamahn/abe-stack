// packages/contracts/vitest.config.ts

import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../.config/vitest.base';

export default mergeConfig(baseConfig, {
  test: {
    name: 'contracts',
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
  },
});
