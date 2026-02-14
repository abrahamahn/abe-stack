// main/client/engine/vitest.config.ts

import path from 'node:path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../../vitest.config';

const corePkg = path.resolve(__dirname, '../../shared/src');
const apiPkg = path.resolve(__dirname, '../api/src');

export default mergeConfig(baseConfig, {
  test: {
    name: 'client',
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', 'stores/**', 'ui/**'],
    server: {
      deps: {
        inline: ['@abe-stack/shared', '@abe-stack/api'],
      },
    },
  },
  resolve: {
    alias: [
      { find: '@abe-stack/api', replacement: `${apiPkg}/index.ts` },
      { find: /^@abe-stack\/kernel\/(.*)$/, replacement: `${corePkg}/$1` },
      { find: '@abe-stack/shared', replacement: `${corePkg}/index.ts` },
      { find: '@abe-stack/shared', replacement: `${corePkg}/index.ts` },
    ],
  },
});
