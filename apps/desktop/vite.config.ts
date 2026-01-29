// apps/desktop/vite.config.ts
import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { pickAvailablePort } from '../../packages/core/src/shared/port';

const repoRoot = path.resolve(__dirname, '../../');
const desktopRoot = path.join(repoRoot, 'apps/desktop');

/**
 * Resolves alias paths relative to repo root
 */
function resolveAlias(relativePath: string): string {
  return path.join(repoRoot, relativePath);
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
        // Monorepo packages → source files
        '@abe-stack/core': resolveAlias('packages/core/src'),
        '@abe-stack/ui': resolveAlias('packages/ui/src'),
        '@abe-stack/sdk': resolveAlias('packages/sdk/src'),
        '@abe-stack/contracts': resolveAlias('packages/contracts/src'),
        '@abe-stack/stores': resolveAlias('packages/stores/src'),
        '@abe-stack/db': resolveAlias('packages/db/src'),
        '@abe-stack/media': resolveAlias('packages/media/src'),
        // UI package internal aliases
        '@components': resolveAlias('packages/ui/src/components'),
        '@containers': resolveAlias('packages/ui/src/layouts/containers'),
        '@elements': resolveAlias('packages/ui/src/elements'),
        '@hooks': resolveAlias('packages/ui/src/hooks'),
        '@layers': resolveAlias('packages/ui/src/layouts/layers'),
        '@layouts': resolveAlias('packages/ui/src/layouts'),
        '@providers': resolveAlias('packages/ui/src/providers'),
        '@router': resolveAlias('packages/ui/src/router'),
        '@shells': resolveAlias('packages/ui/src/layouts/shells'),
        '@theme': resolveAlias('packages/ui/src/theme'),
        '@types': resolveAlias('packages/ui/src/types'),
        '@utils': resolveAlias('packages/ui/src/utils'),
        // Core package internal aliases
        '@contracts': resolveAlias('packages/core/src/contracts'),
        '@shared': resolveAlias('packages/core/src/shared'),
        // Desktop app aliases
        '@': resolveAlias('apps/desktop/src'),
        '@ipc': resolveAlias('apps/desktop/src/electron/ipc'),
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
