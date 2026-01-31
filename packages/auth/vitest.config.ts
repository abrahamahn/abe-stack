// packages/auth/vitest.config.ts
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
      { find: /^@abe-stack\/security\/(.*)$/, replacement: `${pkg('security')}/$1` },
      { find: '@abe-stack/security', replacement: `${pkg('security')}/index.ts` },
      { find: /^@abe-stack\/http\/(.*)$/, replacement: `${pkg('http')}/$1` },
      { find: '@abe-stack/http', replacement: `${pkg('http')}/index.ts` },
      { find: /^@abe-stack\/email\/(.*)$/, replacement: `${pkg('email')}/$1` },
      { find: '@abe-stack/email', replacement: `${pkg('email')}/index.ts` },
      { find: /^@abe-stack\/contracts\/(.*)$/, replacement: `${pkg('contracts')}/$1` },
      { find: '@abe-stack/contracts', replacement: `${pkg('contracts')}/index.ts` },
    ],
  },
  test: {
    name: 'auth',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: ['dot'],
  },
});
