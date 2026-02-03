import path from 'node:path';
import { mergeConfig } from 'vitest/config';
import baseConfig from '../../vitest.config';

const corePkg = path.resolve(__dirname, '../../packages/shared/src');
const infraPkg = path.resolve(__dirname, '../../packages/backend-core/src');

export default mergeConfig(baseConfig, {
  test: {
    name: 'notifications',
    environment: 'node',
  },
  resolve: {
    alias: [
      { find: '@abe-stack/shared', replacement: `${corePkg}/index.ts` },
      { find: '@abe-stack/db', replacement: `${infraPkg}/index.ts` },
    ],
  },
});
