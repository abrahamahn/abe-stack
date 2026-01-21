// apps/desktop/vitest.config.ts
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.stryker-tmp/**',
      '**/backup/**',
      '**/*.spec.ts', // Playwright e2e tests
    ],
  },
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src'),
      '@ipc': path.join(__dirname, 'src/electron/ipc'),
      '@abe-stack/core': path.join(repoRoot, 'packages/core/src'),
      '@abe-stack/sdk': path.join(repoRoot, 'packages/sdk/src'),
      '@abe-stack/ui': path.join(repoRoot, 'packages/ui/src'),
    },
  },
});
