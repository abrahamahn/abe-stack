// client/vitest.config.ts

import path from 'node:path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

const corePkg = path.resolve(__dirname, '../../packages/shared/src');
const contractsPkg = path.resolve(__dirname, '../../packages/shared/src/contracts');

export default mergeConfig(baseConfig, {
  test: {
    name: 'client',
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', 'stores/**', 'ui/**'],
    server: {
      deps: {
        inline: ['@abe-stack/shared', '@abe-stack/shared'],
      },
    },
  },
  resolve: {
    alias: [
      { find: /^@abe-stack\/kernel\/(.*)$/, replacement: `${corePkg}/$1` },
      { find: '@abe-stack/shared', replacement: `${corePkg}/index.ts` },
      { find: /^@abe-stack\/kernel\/contracts\/(.*)$/, replacement: `${contractsPkg}/$1` },
      { find: '@abe-stack/shared', replacement: `${contractsPkg}/index.ts` },
    ],
  },
});
