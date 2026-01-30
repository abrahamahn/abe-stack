// packages/sdk/vitest.config.ts

import path from 'node:path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

const corePkg = path.resolve(__dirname, '../core/src');
const contractsPkg = path.resolve(__dirname, '../contracts/src');

export default mergeConfig(baseConfig, {
  test: {
    name: 'sdk',
    environment: 'node',
    server: {
      deps: {
        inline: ['@abe-stack/core', '@abe-stack/contracts'],
      },
    },
  },
  resolve: {
    alias: [
      { find: /^@abe-stack\/core\/(.*)$/, replacement: `${corePkg}/$1` },
      { find: '@abe-stack/core', replacement: `${corePkg}/index.ts` },
      { find: /^@abe-stack\/contracts\/(.*)$/, replacement: `${contractsPkg}/$1` },
      { find: '@abe-stack/contracts', replacement: `${contractsPkg}/index.ts` },
    ],
  },
});
