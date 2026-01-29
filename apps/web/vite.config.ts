// apps/web/vite.config.ts
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

const repoRoot = path.resolve(__dirname, '../../');
const webRoot = path.join(repoRoot, 'apps/web');

/**
 * Resolves alias paths relative to repo root
 */
function resolveAlias(relativePath: string): string {
  return path.join(repoRoot, relativePath);
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Monorepo packages → source files (not dist/)
      '@abe-stack/core': resolveAlias('packages/core/src'),
      '@abe-stack/ui': resolveAlias('packages/ui/src'),
      '@abe-stack/sdk': resolveAlias('packages/sdk/src'),
      '@abe-stack/contracts': resolveAlias('packages/contracts/src'),
      '@abe-stack/stores': resolveAlias('packages/stores/src'),
      '@abe-stack/db': resolveAlias('packages/db/src'),
      '@abe-stack/media': resolveAlias('packages/media/src'),
      // UI package internal aliases
      '@components': resolveAlias('packages/ui/src/components'),
      '@containers': resolveAlias('packages/ui/src/layouts/containers'),
      '@elements': resolveAlias('packages/ui/src/elements'),
      '@hooks': resolveAlias('packages/ui/src/hooks'),
      '@layers': resolveAlias('packages/ui/src/layouts/layers'),
      '@layouts': resolveAlias('packages/ui/src/layouts'),
      '@providers': resolveAlias('packages/ui/src/providers'),
      '@router': resolveAlias('packages/ui/src/router'),
      '@shells': resolveAlias('packages/ui/src/layouts/shells'),
      '@theme': resolveAlias('packages/ui/src/theme'),
      '@types': resolveAlias('packages/ui/src/types'),
      '@utils': resolveAlias('packages/ui/src/utils'),
      // Core package internal aliases
      '@contracts': resolveAlias('packages/core/src/contracts'),
      '@shared': resolveAlias('packages/core/src/shared'),
      // Web app aliases
      '@': resolveAlias('apps/web/src'),
      '@admin': resolveAlias('apps/web/src/features/admin'),
      '@api': resolveAlias('apps/web/src/api'),
      '@app': resolveAlias('apps/web/src/app'),
      '@auth': resolveAlias('apps/web/src/features/auth'),
      '@billing': resolveAlias('apps/web/src/features/billing'),
      '@catalog': resolveAlias('apps/web/src/features/demo/catalog'),
      '@config': resolveAlias('apps/web/src/config'),
      '@dashboard': resolveAlias('apps/web/src/features/dashboard'),
      '@demo': resolveAlias('apps/web/src/features/demo'),
      '@features': resolveAlias('apps/web/src/features'),
      '@pages': resolveAlias('apps/web/src/pages'),
      '@settings': resolveAlias('apps/web/src/features/settings'),
    },
  },
  publicDir: `${webRoot}/public`,
  build: {
    outDir: `${webRoot}/dist`,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 300,
    cssCodeSplit: true,
    minify: 'esbuild',
    target: 'es2020',
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
