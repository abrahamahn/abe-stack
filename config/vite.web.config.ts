import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const repoRoot = path.resolve(__dirname, '..');
const appRoot = path.join(repoRoot, 'apps/web');

export default defineConfig({
  plugins: [react(), tsconfigPaths({ projects: [path.join(appRoot, 'tsconfig.json')] })],
  publicDir: path.join(appRoot, 'public'),
  build: {
    outDir: path.join(appRoot, 'dist'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.join(appRoot, 'src'),
      '@abe-stack/sdk': path.join(repoRoot, 'packages/sdk/src'),
      '@abe-stack/core': path.join(repoRoot, 'packages/core/src'),
      '@abe-stack/ui': path.join(repoRoot, 'packages/ui/src'),
      '@api': path.join(appRoot, 'src/api'),
      '@app': path.join(appRoot, 'src/app'),
      '@config': path.join(appRoot, 'src/config'),
      '@features': path.join(appRoot, 'src/features'),
      '@auth': path.join(appRoot, 'src/features/auth'),
      '@dashboard': path.join(appRoot, 'src/features/dashboard'),
      '@demo': path.join(appRoot, 'src/features/demo'),
      '@pages': path.join(appRoot, 'src/pages'),
      '@test': path.join(appRoot, 'src/test'),
    },
  },
});
