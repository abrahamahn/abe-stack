import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { getWebAliases, webRoot } from './aliases';

export default defineConfig({
  plugins: [react()],
  publicDir: `${webRoot}/public`,
  build: {
    outDir: `${webRoot}/dist`,
    emptyOutDir: true,
  },
  resolve: {
    alias: getWebAliases(),
  },
});
