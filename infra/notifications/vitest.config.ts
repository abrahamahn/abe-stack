import path from 'node:path';
import { mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.config';

const corePkg = path.resolve(__dirname, '../../shared/core/src');
const dbPkg = path.resolve(__dirname, '../db/src');
const httpPkg = path.resolve(__dirname, '../http/src');

export default mergeConfig(baseConfig, {
  test: {
    name: 'notifications',
    environment: 'node',
  },
  resolve: {
    alias: [
      { find: /^@abe-stack\/core\/(.*)$/, replacement: `${corePkg}/$1` },
      { find: '@abe-stack/core', replacement: `${corePkg}/index.ts` },
      { find: /^@abe-stack\/db\/(.*)$/, replacement: `${dbPkg}/$1` },
      { find: '@abe-stack/db', replacement: `${dbPkg}/index.ts` },
      { find: /^@abe-stack\/http\/(.*)$/, replacement: `${httpPkg}/$1` },
      { find: '@abe-stack/http', replacement: `${httpPkg}/index.ts` },
    ],
  },
});
