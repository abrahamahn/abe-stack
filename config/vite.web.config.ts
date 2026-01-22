// config/vite.web.config.ts
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import { packageAliases, uiInternalAliases, coreInternalAliases } from './schema/aliases';

const repoRoot = path.resolve(__dirname, '..');
const packagesRoot = path.join(repoRoot, 'packages');
const appsRoot = path.join(repoRoot, 'apps');

const webRoot = path.join(appsRoot, 'web');

/**
 * Resolves relative alias paths to absolute paths
 */
function resolveAliases(aliases: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(aliases).map(([key, value]) => [key, path.join(repoRoot, value)]),
  );
}

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths({
      // Include web app tsconfig for its own aliases
      projects: [`${webRoot}/tsconfig.json`],
    }),
  ],
  resolve: {
    alias: {
      // Monorepo packages → source files (not dist/)
      ...resolveAliases(packageAliases),
      // UI package internal aliases (needed when importing from UI source)
      ...resolveAliases(uiInternalAliases),
      // Core package internal aliases
      ...resolveAliases(coreInternalAliases),
    },
  },
  publicDir: `${webRoot}/public`,
  build: {
    outDir: `${webRoot}/dist`,
    emptyOutDir: true,
    // Split vendor chunks for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // React core - changes rarely
          'vendor-react': ['react', 'react-dom'],
        },
      },
    },
    // Smaller chunks for better lazy loading
    chunkSizeWarningLimit: 300,
    // CSS code splitting
    cssCodeSplit: true,
    // Minification
    minify: 'esbuild',
    target: 'es2020',
  },
  server: {
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
