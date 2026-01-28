// apps/server/vitest.config.ts
import path from 'node:path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

export default mergeConfig(baseConfig, {
  test: {
    name: 'server',
    environment: 'node',
    // Inline local modules to ensure mocks work correctly with path aliases
    server: {
      deps: {
        inline: [/src\//, '@abe-stack/core'],
      },
    },
  },
  resolve: {
    alias: {
      '@/': path.resolve(__dirname, 'src') + '/',
    },
  },
});
