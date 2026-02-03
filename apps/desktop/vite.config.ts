// apps/desktop/vite.config.ts
import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { pickAvailablePort } from '@abe-stack/shared/shared';

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
        '@abe-stack/shared': resolveAlias('kernel/src'),
        '@abe-stack/ui': resolveAlias('client/ui/src'),
        '@abe-stack/api': resolveAlias('client/api/src'),
        '@abe-stack/engine': resolveAlias('premium/client/engine/src'),
        '@abe-stack/shared': resolveAlias('kernel/src/contracts'),
        '@abe-stack/react': resolveAlias('client/react/src'),
        '@abe-stack/db': resolveAlias('infra/src'),
        '@abe-stack/media': resolveAlias('premium/media/src'),
        // UI package internal aliases
        '@components': resolveAlias('client/ui/src/components'),
        '@containers': resolveAlias('client/ui/src/layouts/containers'),
        '@elements': resolveAlias('client/ui/src/elements'),
        '@hooks': resolveAlias('client/react/src/hooks'),
        '@layers': resolveAlias('client/ui/src/layouts/layers'),
        '@layouts': resolveAlias('client/ui/src/layouts'),
        '@providers': resolveAlias('client/react/src/providers'),
        '@router': resolveAlias('client/react/src/router'),
        '@shells': resolveAlias('client/ui/src/layouts/shells'),
        '@theme': resolveAlias('client/ui/src/theme'),
        '@types': resolveAlias('client/ui/src/types'),
        '@utils': resolveAlias('client/ui/src/utils'),
        // Core package internal aliases
        '@contracts': resolveAlias('kernel/src/contracts'),
        '@shared': resolveAlias('kernel/src/shared'),
        // Web app aliases (Shared with Desktop)
        '@': resolveAlias('apps/web/src'),
        '@admin': resolveAlias('apps/web/src/features/admin'),
        '@api': resolveAlias('apps/web/src/api'),
        '@app': resolveAlias('apps/web/src/app'),
        '@auth': resolveAlias('apps/web/src/features/auth'),
        '@billing': resolveAlias('apps/web/src/features/billing'),
        '@catalog': resolveAlias('apps/web/src/features/demo/catalog'),
        '@config': resolveAlias('apps/web/src/config'),
        '@dashboard': resolveAlias('apps/web/src/features/dashboard'),
        '@demo': resolveAlias('apps/web/src/features/demo'),
        '@features': resolveAlias('apps/web/src/features'),
        '@pages': resolveAlias('apps/web/src/pages'),
        '@settings': resolveAlias('apps/web/src/features/settings'),
        // Desktop specific aliases
        '@desktop': resolveAlias('apps/desktop/src'),
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
      fs: {
        allow: [repoRoot],
      },
    },
  };
});
