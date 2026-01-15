import net from 'node:net';
import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

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

const repoRoot = path.resolve(__dirname, '..');
const appRoot = path.join(repoRoot, 'apps/desktop');

export default defineConfig(async ({ command }) => {
  const host = process.env.VITE_HOST || '0.0.0.0';

  const baseConfig = {
    plugins: [react()],
    base: './',
    build: {
      outDir: path.join(appRoot, 'dist/renderer'),
    },
    resolve: {
      alias: {
        '@': path.join(appRoot, 'src'),
        '@abe-stack/core': path.join(repoRoot, 'packages/core/src'),
        '@abe-stack/ui': path.join(repoRoot, 'packages/ui/src'),
        '@components': path.join(appRoot, 'src/components'),
        '@hooks': path.join(appRoot, 'src/hooks'),
        '@services': path.join(appRoot, 'src/services'),
        '@config': path.join(appRoot, 'src/config'),
        '@layouts': path.join(appRoot, 'src/layouts'),
        '@routes': path.join(appRoot, 'src/routes'),
        '@utils': path.join(appRoot, 'src/utils'),
        '@api': path.join(appRoot, 'src/api'),
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
