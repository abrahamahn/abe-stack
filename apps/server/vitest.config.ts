import { defineConfig, mergeConfig } from 'vitest/config';

import baseConfig from '../../config/vitest.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: 'node',
      globals: true,
      setupFiles: [],
    },
  }),
);
