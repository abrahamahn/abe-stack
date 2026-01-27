// packages/ui/vitest.config.ts

import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

export default mergeConfig(baseConfig, {
  test: {
    name: 'ui',
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
  },
});
