// packages/auth/vitest.config.ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@abe-stack/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@abe-stack/core/infrastructure/crypto': path.resolve(
        __dirname,
        '../core/src/infrastructure/crypto/index.ts',
      ),
      '@abe-stack/core/config': path.resolve(
        __dirname,
        '../core/src/config/index.ts',
      ),
      '@abe-stack/db': path.resolve(__dirname, '../db/src/index.ts'),
      '@abe-stack/security': path.resolve(__dirname, '../security/src/index.ts'),
      '@abe-stack/security/rate-limit': path.resolve(
        __dirname,
        '../security/src/rate-limit/index.ts',
      ),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: ['dot'],
  },
});
