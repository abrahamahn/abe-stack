import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const appRoot = path.resolve(__dirname, '../../apps/web');

export default defineConfig({
  root: appRoot,
  plugins: [react(), tsconfigPaths({ projects: [path.join(appRoot, 'tsconfig.json')] })],
  envDir: path.join(appRoot, 'env'),
  publicDir: path.join(appRoot, 'public'),
  build: {
    outDir: path.join(appRoot, 'dist'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.join(appRoot, 'src'),
      '@abe-stack/api-client': path.resolve(appRoot, '../../packages/api-client/src'),
      '@abe-stack/shared': path.resolve(appRoot, '../../packages/shared/src'),
      '@abe-stack/ui': path.resolve(appRoot, '../../packages/ui/src'),
      '@components': path.join(appRoot, 'src/components'),
      '@hooks': path.join(appRoot, 'src/hooks'),
      '@services': path.join(appRoot, 'src/services'),
      '@config': path.join(appRoot, 'src/config'),
      '@layouts': path.join(appRoot, 'src/layouts'),
      '@routes': path.join(appRoot, 'src/routes'),
      '@utils': path.join(appRoot, 'src/utils'),
      '@api': path.join(appRoot, 'src/api'),
    },
  },
});
