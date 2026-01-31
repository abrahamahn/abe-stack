// client/ui/vitest.config.ts

import path from 'node:path';
import tsconfigPaths from 'vite-tsconfig-paths';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

const srcDir = path.resolve(__dirname, 'src');

export default mergeConfig(baseConfig, {
  plugins: [tsconfigPaths({ projects: [path.resolve(__dirname, 'tsconfig.json')] })],
  resolve: {
    alias: [
      { find: '@abe-stack/client', replacement: path.resolve(__dirname, '..', 'src') },
      {
        find: /^@abe-stack\/client\/(.*)$/,
        replacement: path.resolve(__dirname, '..', 'src', '$1'),
      },
      { find: '@components', replacement: path.join(srcDir, 'components') },
      { find: '@containers', replacement: path.join(srcDir, 'layouts/containers') },
      { find: '@elements', replacement: path.join(srcDir, 'elements') },
      { find: '@hooks', replacement: path.join(srcDir, 'hooks') },
      { find: '@layers', replacement: path.join(srcDir, 'layouts/layers') },
      { find: '@layouts', replacement: path.join(srcDir, 'layouts') },
      { find: '@providers', replacement: path.join(srcDir, 'providers') },
      { find: '@router', replacement: path.join(srcDir, 'router') },
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
  },
});
