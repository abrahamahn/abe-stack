// infra/realtime/vitest.config.ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@abe-stack/core/infrastructure/pubsub': path.resolve(
        __dirname,
        '../core/src/infrastructure/pubsub/index.ts',
      ),
      '@abe-stack/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@abe-stack/db': path.resolve(__dirname, '../db/src/index.ts'),
      '@abe-stack/http': path.resolve(__dirname, '../http/src/index.ts'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: ['dot'],
  },
});
