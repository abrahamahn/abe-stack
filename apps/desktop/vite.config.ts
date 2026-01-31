// apps/desktop/vite.config.ts
import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { pickAvailablePort } from '../../shared/core/src/shared/port';

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
        '@abe-stack/core': resolveAlias('shared/core/src'),
        '@abe-stack/ui': resolveAlias('shared/ui/src'),
        '@abe-stack/sdk': resolveAlias('sdk/src'),
        '@abe-stack/contracts': resolveAlias('infra/contracts/src'),
        '@abe-stack/stores': resolveAlias('infra/stores/src'),
        '@abe-stack/db': resolveAlias('infra/db/src'),
        '@abe-stack/media': resolveAlias('infra/media/src'),
        // UI package internal aliases
        '@components': resolveAlias('shared/ui/src/components'),
        '@containers': resolveAlias('shared/ui/src/layouts/containers'),
        '@elements': resolveAlias('shared/ui/src/elements'),
        '@hooks': resolveAlias('shared/ui/src/hooks'),
        '@layers': resolveAlias('shared/ui/src/layouts/layers'),
        '@layouts': resolveAlias('shared/ui/src/layouts'),
        '@providers': resolveAlias('shared/ui/src/providers'),
        '@router': resolveAlias('shared/ui/src/router'),
        '@shells': resolveAlias('shared/ui/src/layouts/shells'),
        '@theme': resolveAlias('shared/ui/src/theme'),
        '@types': resolveAlias('shared/ui/src/types'),
        '@utils': resolveAlias('shared/ui/src/utils'),
        // Core package internal aliases
        '@contracts': resolveAlias('shared/core/src/contracts'),
        '@shared': resolveAlias('shared/core/src/shared'),
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
