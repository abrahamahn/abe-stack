// config/vite.web.config.ts
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const repoRoot = path.resolve(__dirname, '..');
const packagesRoot = path.join(repoRoot, 'packages');
const appsRoot = path.join(repoRoot, 'apps');

const webRoot = path.join(appsRoot, 'web');
const coreRoot = path.join(packagesRoot, 'core');
const sdkRoot = path.join(packagesRoot, 'sdk');
const uiRoot = path.join(packagesRoot, 'ui');

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
