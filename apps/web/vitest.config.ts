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
      exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/*.spec.ts', '**/*.e2e.ts'],
    },
    resolve: {
      alias: {
        '@': path.join(appRoot, 'src'),
        '@abe-stack/sdk': path.resolve(appRoot, '../../packages/sdk/src'),
        '@abe-stack/shared': path.resolve(appRoot, '../../packages/shared/src'),
        '@abe-stack/ui': path.resolve(appRoot, '../../packages/ui/src'),
        '@api': path.join(appRoot, 'src/api'),
        '@app': path.join(appRoot, 'src/app'),
        '@config': path.join(appRoot, 'src/config'),
        '@features': path.join(appRoot, 'src/features'),
        '@auth': path.join(appRoot, 'src/features/auth'),
        '@dashboard': path.join(appRoot, 'src/features/dashboard'),
        '@demo': path.join(appRoot, 'src/features/demo'),
        '@toast': path.join(appRoot, 'src/features/toast'),
        '@pages': path.join(appRoot, 'src/pages'),
        '@test': path.join(appRoot, 'src/test'),
      },
    },
  }),
);
