// apps/desktop/vitest.config.ts
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const repoRoot = path.resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.join(repoRoot, 'apps/web/src/__tests__/setup.ts')],
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
      // UI internal aliases (needed when importing @abe-stack/ui)
      '@elements': path.join(repoRoot, 'packages/ui/src/elements'),
      '@components': path.join(repoRoot, 'packages/ui/src/components'),
      '@layouts': path.join(repoRoot, 'packages/ui/src/layouts'),
      '@containers': path.join(repoRoot, 'packages/ui/src/layouts/containers'),
      '@layers': path.join(repoRoot, 'packages/ui/src/layouts/layers'),
      '@shells': path.join(repoRoot, 'packages/ui/src/layouts/shells'),
      '@hooks': path.join(repoRoot, 'packages/ui/src/hooks'),
      '@theme': path.join(repoRoot, 'packages/ui/src/theme'),
      '@utils': path.join(repoRoot, 'packages/ui/src/utils'),
      // Core internal aliases
      '@contracts': path.join(repoRoot, 'packages/core/src/contracts'),
      '@stores': path.join(repoRoot, 'packages/core/src/stores'),
      '@validation': path.join(repoRoot, 'packages/core/src/validation'),
    },
  },
});
