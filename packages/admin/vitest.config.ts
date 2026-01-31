// packages/admin/vitest.config.ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Sub-path aliases MUST come before root aliases (Vite resolves in order)
      '@abe-stack/core/infrastructure/crypto': path.resolve(
        __dirname,
        '../core/src/infrastructure/crypto/index.ts',
      ),
      '@abe-stack/core/config': path.resolve(
        __dirname,
        '../core/src/config/index.ts',
      ),
      '@abe-stack/core': path.resolve(__dirname, '../core/src/index.ts'),
      '@abe-stack/db': path.resolve(__dirname, '../db/src/index.ts'),
      '@abe-stack/http': path.resolve(__dirname, '../http/src/index.ts'),
      '@abe-stack/security/rate-limit': path.resolve(
        __dirname,
        '../security/src/rate-limit/index.ts',
      ),
      '@abe-stack/security': path.resolve(__dirname, '../security/src/index.ts'),
      '@abe-stack/auth': path.resolve(__dirname, '../auth/src/index.ts'),
      '@abe-stack/billing': path.resolve(__dirname, '../billing/src/index.ts'),
      '@abe-stack/contracts': path.resolve(__dirname, '../contracts/src/index.ts'),
      '@abe-stack/jobs': path.resolve(__dirname, '../jobs/src/index.ts'),
      '@abe-stack/storage': path.resolve(__dirname, '../storage/src/index.ts'),
    },
  },
  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: ['dot'],
  },
});
