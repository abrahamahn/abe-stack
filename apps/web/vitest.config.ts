import path from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig, mergeConfig } from 'vitest/config';

import baseConfig from '../../config/vitest.config';

const appRoot = path.resolve(__dirname);

export default mergeConfig(
  baseConfig,
  defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      passWithNoTests: true,
      setupFiles: ['./src/test/setup.ts'],
    },
    resolve: {
      alias: {
        '@': path.join(appRoot, 'src'),
        '@abe-stack/api-client': path.resolve(appRoot, '../../packages/api-client/src'),
        '@abe-stack/shared': path.resolve(appRoot, '../../packages/shared/src'),
        '@abe-stack/ui': path.resolve(appRoot, '../../packages/ui/src'),
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
  }),
);
