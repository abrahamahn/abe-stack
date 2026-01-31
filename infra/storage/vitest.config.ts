import path from 'node:path';
import { mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.config';

const corePkg = path.resolve(__dirname, '../../shared/core/src');

export default mergeConfig(baseConfig, {
  test: {
    name: 'storage',
    environment: 'node',
  },
  resolve: {
    alias: [
      { find: /^@abe-stack\/core\/(.*)$/, replacement: `${corePkg}/$1` },
      { find: '@abe-stack/core', replacement: `${corePkg}/index.ts` },
      { find: /^@\/(.*)$/, replacement: path.resolve(__dirname, 'src/$1') },
    ],
  },
});
