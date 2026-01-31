// modules/admin/vitest.config.ts
import path from 'node:path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

const pkg = (name: string) => path.resolve(__dirname, `../${name}/src`);

export default mergeConfig(baseConfig, {
  resolve: {
    alias: [
      { find: /^@abe-stack\/core\/(.*)$/, replacement: `${pkg('core')}/$1` },
      { find: '@abe-stack/core', replacement: `${pkg('core')}/index.ts` },
      { find: /^@abe-stack\/db\/(.*)$/, replacement: `${pkg('db')}/$1` },
      { find: '@abe-stack/db', replacement: `${pkg('db')}/index.ts` },
      { find: /^@abe-stack\/auth\/(.*)$/, replacement: `${pkg('auth')}/$1` },
      { find: '@abe-stack/auth', replacement: `${pkg('auth')}/index.ts` },
      { find: /^@abe-stack\/billing\/(.*)$/, replacement: `${pkg('billing')}/$1` },
      { find: '@abe-stack/billing', replacement: `${pkg('billing')}/index.ts` },
      { find: /^@abe-stack\/http\/(.*)$/, replacement: `${pkg('http')}/$1` },
      { find: '@abe-stack/http', replacement: `${pkg('http')}/index.ts` },
      { find: /^@abe-stack\/contracts\/(.*)$/, replacement: `${pkg('contracts')}/$1` },
      { find: '@abe-stack/contracts', replacement: `${pkg('contracts')}/index.ts` },
      { find: /^@abe-stack\/jobs\/(.*)$/, replacement: `${pkg('jobs')}/$1` },
      { find: '@abe-stack/jobs', replacement: `${pkg('jobs')}/index.ts` },
      { find: /^@abe-stack\/security\/(.*)$/, replacement: `${pkg('security')}/$1` },
      { find: '@abe-stack/security', replacement: `${pkg('security')}/index.ts` },
    ],
  },
  test: {
    name: 'admin',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: ['dot'],
  },
});
