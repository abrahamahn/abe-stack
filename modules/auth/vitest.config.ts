// modules/auth/vitest.config.ts
import path from 'node:path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

const infraPkg = path.resolve(__dirname, '../../packages/backend-core/src');
const shared = (name: string) => path.resolve(__dirname, `../../packages/shared/${name}/src`);
const contractsPkg = path.resolve(__dirname, '../../packages/shared/src/contracts');

export default mergeConfig(baseConfig, {
  resolve: {
    alias: [
      { find: /^@abe-stack\/core\/(.*)$/, replacement: `${shared('core')}/$1` },
      { find: '@abe-stack/shared', replacement: `${shared('core')}/index.ts` },
      { find: '@abe-stack/db', replacement: `${infraPkg}/index.ts` },
      { find: /^@abe-stack\/kernel\/contracts\/(.*)$/, replacement: `${contractsPkg}/$1` },
      { find: '@abe-stack/shared', replacement: `${contractsPkg}/index.ts` },
    ],
  },
  test: {
    name: 'auth',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: ['dot'],
  },
});
