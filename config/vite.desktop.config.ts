// config/vite.desktop.config.ts
import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { pickAvailablePort } from '../packages/core/src/utils/port';

const repoRoot = path.resolve(__dirname, '..');
const appsRoot = path.join(repoRoot, 'apps');
const desktopRoot = path.join(appsRoot, 'desktop');

function getDesktopAliases(): Record<string, string> {
  return {
    '@': path.join(desktopRoot, 'src'),
    '@services': path.join(desktopRoot, 'src/services'),
    '@routes': path.join(desktopRoot, 'src/routes'),
    '@api': path.join(desktopRoot, 'src/api'),
    '@abe-stack/core': path.join(repoRoot, 'packages/core/src'),
    '@abe-stack/sdk': path.join(repoRoot, 'packages/sdk/src'),
    '@abe-stack/ui': path.join(repoRoot, 'packages/ui/src'),
    '@contracts': path.join(repoRoot, 'packages/core/src/contracts'),
    '@stores': path.join(repoRoot, 'packages/core/src/stores'),
    '@validation': path.join(repoRoot, 'packages/core/src/validation'),
  };
}

export default defineConfig(async ({ command }) => {
  const host = process.env.VITE_HOST || '0.0.0.0';

  const baseConfig = {
    plugins: [react()],
    base: './',
    build: {
      outDir: `${desktopRoot}/dist/renderer`,
    },
    resolve: {
      alias: getDesktopAliases(),
    },
  };

  if (command === 'build') {
    return baseConfig;
  }

  const rendererPortPreference = Number(process.env.DESKTOP_PORT || process.env.VITE_PORT || 5173);
  const rendererPort = await pickAvailablePort([rendererPortPreference, 5173, 5174, 5175], host);

  process.env.DESKTOP_RENDERER_PORT = String(rendererPort);

  return {
    ...baseConfig,
    server: {
      host,
      port: rendererPort,
      strictPort: true,
    },
  };
});
