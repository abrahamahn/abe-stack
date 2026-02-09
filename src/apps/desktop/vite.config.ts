// src/apps/desktop/vite.config.ts
import net from 'node:net';
import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Checks if a port is free (not in use) by attempting to bind to it.
 * Inlined here to avoid transitive dependency on @abe-stack/shared
 * which fails under Node's strict ESM resolver at config-load time.
 *
 * @param port - The port number to check
 * @param host - The host to bind to
 * @returns Whether the port is available
 */
function isPortFree(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen({ port, host }, () => {
      server.close(() => resolve(true));
    });
  });
}

/**
 * Picks the first available (free) port from a list of preferred ports.
 * Inlined to avoid loading @abe-stack/shared during Vite config resolution.
 *
 * @param preferredPorts - Array of port numbers to try, in order of preference
 * @param host - The host to check availability on
 * @returns The first available port
 * @throws Error if no ports are available
 */
async function pickAvailablePort(
  preferredPorts: Array<number | undefined>,
  host: string = '0.0.0.0',
): Promise<number> {
  const ports = Array.from(new Set(preferredPorts.filter((p): p is number => Number.isFinite(p))));
  for (const port of ports) {
    if (await isPortFree(port, host)) {
      return port;
    }
  }
  throw new Error(`No available ports found in list: ${ports.join(', ')}`);
}

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
      conditions: ['source'],
      alias: {
        // Monorepo packages → source files
        '@abe-stack/shared': resolveAlias('shared/src'),
        '@abe-stack/ui': resolveAlias('client/ui/src'),
        '@abe-stack/api': resolveAlias('client/api/src'),
        '@abe-stack/client-engine': resolveAlias('client/engine/src'),
        '@abe-stack/react': resolveAlias('client/react/src'),
        '@abe-stack/db': resolveAlias('server/db/src'),
        '@abe-stack/media': resolveAlias('server/media/src'),
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
        '@domain': resolveAlias('shared/src/domain'),
        '@shared': resolveAlias('shared/src'), // Assuming this was the intent, or maybe src/shared?
        // Web app aliases (Shared with Desktop)
        '@': resolveAlias('apps/web/src'),
        '@admin': resolveAlias('apps/web/src/features/admin'),
        '@api': resolveAlias('apps/web/src/api'),
        '@app': resolveAlias('apps/web/src/app'),
        '@auth': resolveAlias('apps/web/src/features/auth'),
        '@billing': resolveAlias('apps/web/src/features/billing'),
        '@catalog': resolveAlias('apps/web/src/features/ui-library/catalog'),
        '@config': resolveAlias('apps/web/src/config'),
        '@dashboard': resolveAlias('apps/web/src/features/dashboard'),
        '@ui-library': resolveAlias('apps/web/src/features/ui-library'),
        '@features': resolveAlias('apps/web/src/features'),
        '@home': resolveAlias('apps/web/src/features/home'),
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
