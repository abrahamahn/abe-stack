// config/vite.desktop.config.ts
import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { pickAvailablePort } from '../packages/core/src/utils/port';
import {
  desktopAliases,
  packageAliases,
  uiInternalAliases,
  coreInternalAliases,
} from './schema/aliases';

const repoRoot = path.resolve(__dirname, '..');
const desktopRoot = path.join(repoRoot, 'apps/desktop');

/**
 * Resolves relative alias paths to absolute paths
 */
function resolveAliases(aliases: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(aliases).map(([key, value]) => [key, path.join(repoRoot, value)]),
  );
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
      alias: {
        ...resolveAliases(desktopAliases),
        ...resolveAliases(packageAliases),
        ...resolveAliases(uiInternalAliases),
        ...resolveAliases(coreInternalAliases),
      },
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
