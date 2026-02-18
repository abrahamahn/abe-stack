// main/client/ui/vitest.config.ts

import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../../vitest.config';

const srcDir = path.resolve(__dirname, 'src');

export default mergeConfig(baseConfig, {
  plugins: [tsconfigPaths({ projects: [path.resolve(__dirname, 'tsconfig.json')] })],
  resolve: {
    alias: [
      {
        find: '@bslt/client-engine',
        replacement: path.resolve(__dirname, '..', 'engine', 'src'),
      },
      {
        find: /^@bslt\/api\/(.*)$/,
        replacement: path.resolve(__dirname, '..', 'api', 'src', '$1'),
      },
      {
        find: '@bslt/api',
        replacement: path.resolve(__dirname, '..', 'api', 'src', 'index.ts'),
      },
      {
        find: /^@bslt\/shared\/(.*)$/,
        replacement: path.resolve(__dirname, '..', '..', 'shared', 'src', '$1'),
      },
      {
        find: '@bslt/shared',
        replacement: path.resolve(__dirname, '..', '..', 'shared', 'src', 'index.ts'),
      },
      { find: '@bslt/react', replacement: path.resolve(__dirname, '..', 'react', 'src') },
      {
        find: /^@bslt\/client\/(.*)$/,
        replacement: path.resolve(__dirname, '..', 'engine', 'src', '$1'),
      },
      { find: '@components', replacement: path.join(srcDir, 'components') },
      { find: '@containers', replacement: path.join(srcDir, 'layouts/containers') },
      { find: '@elements', replacement: path.join(srcDir, 'elements') },
      { find: '@hooks', replacement: path.resolve(__dirname, '..', 'react', 'src', 'hooks') },
      { find: '@layers', replacement: path.join(srcDir, 'layouts/layers') },
      { find: '@layouts', replacement: path.join(srcDir, 'layouts') },
      {
        find: '@providers',
        replacement: path.resolve(__dirname, '..', 'react', 'src', 'providers'),
      },
      { find: '@router', replacement: path.resolve(__dirname, '..', 'react', 'src', 'router') },
      { find: '@shells', replacement: path.join(srcDir, 'layouts/shells') },
      { find: '@theme', replacement: path.join(srcDir, 'theme') },
      { find: '@types', replacement: path.join(srcDir, 'types') },
      { find: '@utils', replacement: path.join(srcDir, 'utils') },
    ],
  },
  test: {
    name: 'ui',
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.spec.ts'],
    testTimeout: 10000,
    pool: 'threads',
    maxConcurrency: 4,
  },
});
