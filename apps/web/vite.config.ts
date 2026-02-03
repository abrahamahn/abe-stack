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
      '@abe-stack/shared': resolveAlias('kernel/src'),
      '@abe-stack/ui': resolveAlias('client/ui/src'),
      '@abe-stack/api': resolveAlias('client/api/src'),
      '@abe-stack/react': resolveAlias('client/react/src'),
      '@abe-stack/engine': resolveAlias('premium/client/engine/src'),
      '@abe-stack/shared': resolveAlias('kernel/src/contracts'),
      '@abe-stack/db': resolveAlias('infra/src'),
      '@abe-stack/media': resolveAlias('premium/media/src'),
      // UI package internal aliases
      '@components': resolveAlias('client/ui/src/components'),
      '@containers': resolveAlias('client/ui/src/layouts/containers'),
      '@elements': resolveAlias('client/ui/src/elements'),
      '@hooks': resolveAlias('client/react/src/hooks'),
      '@layers': resolveAlias('client/ui/src/layouts/layers'),
      '@layouts': resolveAlias('client/ui/src/layouts'),
      '@providers': resolveAlias('client/react/src/providers'),
      '@router': resolveAlias('client/react/src/router'),
      '@shells': resolveAlias('client/ui/src/layouts/shells'),
      '@theme': resolveAlias('client/ui/src/theme'),
      '@types': resolveAlias('client/ui/src/types'),
      '@utils': resolveAlias('client/ui/src/utils'),
      // Core package internal aliases
      '@contracts': resolveAlias('kernel/src/contracts'),
      '@shared': resolveAlias('kernel/src/shared'),
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
