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
        inline: ['@bslt/shared', '@bslt/api'],
      },
    },
  },
  resolve: {
    alias: [
      { find: '@bslt/api', replacement: `${apiPkg}/index.ts` },
      { find: /^@bslt\/kernel\/(.*)$/, replacement: `${corePkg}/$1` },
      { find: '@bslt/shared', replacement: `${corePkg}/index.ts` },
      { find: '@bslt/shared', replacement: `${corePkg}/index.ts` },
    ],
  },
});
