// client/vitest.config.ts

import path from 'node:path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../vitest.config';

const corePkg = path.resolve(__dirname, '../core/src');
const contractsPkg = path.resolve(__dirname, '../infra/contracts/src');

export default mergeConfig(baseConfig, {
  test: {
    name: 'client',
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', 'stores/**', 'ui/**'],
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
