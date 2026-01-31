// modules/auth/vitest.config.ts
import path from 'node:path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

const infra = (name: string) => path.resolve(__dirname, `../../infra/${name}/src`);
const shared = (name: string) => path.resolve(__dirname, `../../shared/${name}/src`);

export default mergeConfig(baseConfig, {
  resolve: {
    alias: [
      { find: /^@abe-stack\/core\/(.*)$/, replacement: `${shared('core')}/$1` },
      { find: '@abe-stack/core', replacement: `${shared('core')}/index.ts` },
      { find: /^@abe-stack\/db\/(.*)$/, replacement: `${infra('db')}/$1` },
      { find: '@abe-stack/db', replacement: `${infra('db')}/index.ts` },
      { find: /^@abe-stack\/security\/(.*)$/, replacement: `${infra('security')}/$1` },
      { find: '@abe-stack/security', replacement: `${infra('security')}/index.ts` },
      { find: /^@abe-stack\/http\/(.*)$/, replacement: `${infra('http')}/$1` },
      { find: '@abe-stack/http', replacement: `${infra('http')}/index.ts` },
      { find: /^@abe-stack\/email\/(.*)$/, replacement: `${infra('email')}/$1` },
      { find: '@abe-stack/email', replacement: `${infra('email')}/index.ts` },
      { find: /^@abe-stack\/contracts\/(.*)$/, replacement: `${infra('contracts')}/$1` },
      { find: '@abe-stack/contracts', replacement: `${infra('contracts')}/index.ts` },
    ],
  },
  test: {
    name: 'auth',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    reporters: ['dot'],
  },
});
