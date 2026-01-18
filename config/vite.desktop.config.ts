// config/vite.desktop.config.ts
import net from 'node:net';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { desktopRoot, getDesktopAliases } from './schema/runtime';

function uniquePorts(ports: Array<number | undefined>): number[] {
  return Array.from(new Set(ports.filter((port): port is number => Number.isFinite(port))));
}

function isPortFree(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.listen({ port, host }, () => {
      server.close(() => {
        resolve(true);
      });
    });
  });
}

async function pickAvailablePort(ports: number[], host: string): Promise<number> {
  for (const port of uniquePorts(ports)) {
    if (await isPortFree(port, host)) {
      return port;
    }
  }

  throw new Error(`No available desktop dev ports found in list: ${ports.join(', ')}`);
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
