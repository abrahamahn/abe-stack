import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  publicDir: path.join(__dirname, 'public'),
  build: {
    outDir: path.join(__dirname, 'dist'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.join(__dirname, 'src'),
      '@abe-stack/api-client': path.resolve(__dirname, '../../packages/api-client/src'),
      '@abe-stack/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@abe-stack/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@api': path.join(__dirname, 'src/api'),
      '@app': path.join(__dirname, 'src/app'),
      '@config': path.join(__dirname, 'src/config'),
      '@features': path.join(__dirname, 'src/features'),
      '@auth': path.join(__dirname, 'src/features/auth'),
      '@dashboard': path.join(__dirname, 'src/features/dashboard'),
      '@demo': path.join(__dirname, 'src/features/demo'),
      '@pages': path.join(__dirname, 'src/pages'),
      '@test': path.join(__dirname, 'src/test'),
    },
  },
});
