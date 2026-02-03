// modules/users/vitest.config.ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Sub-path aliases MUST come before root aliases (Vite resolves in order)
      '@abe-stack/packages/shared/config': path.resolve(__dirname, '../../packages/shared/src/config/index.ts'),
      '@abe-stack/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      '@abe-stack/db': path.resolve(__dirname, '../../packages/backend-core/src/index.ts'),
      '@abe-stack/auth': path.resolve(__dirname, '../auth/src/index.ts'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: ['dot'],
  },
});
