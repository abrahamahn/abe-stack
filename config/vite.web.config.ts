// config/vite.web.config.ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

import { coreRoot, sdkRoot, uiRoot, webRoot } from './schema/runtime';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths({
      // Include all projects that web imports from
      projects: [
        `${webRoot}/tsconfig.json`,
        `${coreRoot}/tsconfig.json`,
        `${uiRoot}/tsconfig.json`,
        `${sdkRoot}/tsconfig.json`,
      ],
    }),
  ],
  publicDir: `${webRoot}/public`,
  build: {
    outDir: `${webRoot}/dist`,
    emptyOutDir: true,
  },
});
