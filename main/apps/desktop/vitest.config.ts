// main/apps/desktop/vitest.config.ts
import react from '@vitejs/plugin-react';
import path from 'path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../../vitest.config';

export default mergeConfig(baseConfig, {
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: 'react-router-dom',
        replacement: path.resolve(__dirname, '../web/src/__tests__/mocks/react-router-dom.tsx'),
      },
      // Handle subpath imports first
      {
        find: /^@abe-stack\/shared\/(.*)$/,
        replacement: path.resolve(__dirname, '../../shared/src/$1'),
      },
      {
        find: /^@abe-stack\/ui\/(.*)$/,
        replacement: path.resolve(__dirname, '../../client/ui/src/$1'),
      },
      {
        find: /^@abe-stack\/api\/(.*)$/,
        replacement: path.resolve(__dirname, '../../client/api/src/$1'),
      },
      {
        find: /^@abe-stack\/client-engine\/(.*)$/,
        replacement: path.resolve(__dirname, '../../client/engine/src/$1'),
      },
      {
        find: /^@abe-stack\/react\/(.*)$/,
        replacement: path.resolve(__dirname, '../../client/react/src/$1'),
      },
      // Handle main package imports
      {
        find: '@abe-stack/shared',
        replacement: path.resolve(__dirname, '../../shared/src/index.ts'),
      },
      {
        find: '@abe-stack/ui',
        replacement: path.resolve(__dirname, '../../client/ui/src/index.ts'),
      },
      {
        find: '@abe-stack/api',
        replacement: path.resolve(__dirname, '../../client/api/src/index.ts'),
      },
      {
        find: '@abe-stack/client-engine',
        replacement: path.resolve(__dirname, '../../client/engine/src/index.ts'),
      },
      {
        find: '@abe-stack/react',
        replacement: path.resolve(__dirname, '../../client/react/src/index.ts'),
      },
      {
        find: '@hooks',
        replacement: path.resolve(__dirname, '../../client/react/src/hooks'),
      },
      {
        find: '@providers',
        replacement: path.resolve(__dirname, '../../client/react/src/providers'),
      },
      {
        find: '@router',
        replacement: path.resolve(__dirname, '../../client/react/src/router'),
      },
    ],
  },
  test: {
    name: 'desktop',
    environment: 'jsdom',
    setupFiles: ['../web/src/__tests__/setup.ts'],
  },
});
