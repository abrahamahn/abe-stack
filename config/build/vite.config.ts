import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const projectRoot = path.resolve(__dirname, '../..');
const webRoot = path.join(projectRoot, 'frontend/web');

export default defineConfig({
  root: webRoot,
  plugins: [
    react(),
    tsconfigPaths({ root: projectRoot }),
  ],
  envDir: path.join(webRoot, 'env'),
  publicDir: path.join(webRoot, 'public'),
  build: {
    outDir: path.join(webRoot, 'dist'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      // Path aliases - vite-tsconfig-paths handles most, but explicit for clarity
      '@ui': path.join(projectRoot, 'shared/ui'),
      '@contracts': path.join(projectRoot, 'shared/contracts'),
      '@api-client': path.join(projectRoot, 'shared/api-client'),
      '@stores': path.join(projectRoot, 'shared/stores'),
      '@utils': path.join(projectRoot, 'shared/utils'),
      '@shared': path.join(projectRoot, 'shared'),
      '@web': webRoot,
    },
  },
});
