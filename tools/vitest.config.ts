// tools/vitest.config.ts
/**
 * Vitest configuration for tools/scripts/ tests.
 *
 * Provides @abe-stack/* package alias resolution so tests that mock
 * these packages can resolve the module specifiers. Since all
 * @abe-stack/* imports are mocked in the DB script tests, only the
 * type declarations need to be reachable.
 */
import path from 'node:path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../vitest.config';

const authPkg = path.resolve(__dirname, '../modules/auth/src');
const corePkg = path.resolve(__dirname, '../kernel/src');
const infraPkg = path.resolve(__dirname, '../packages/backend-core/src');

export default mergeConfig(baseConfig, {
  test: {
    name: 'tools',
    environment: 'node',
    include: ['tools/scripts/**/*.test.ts'],
    server: {
      deps: {
        inline: ['@abe-stack/auth', '@abe-stack/shared', '@abe-stack/db'],
      },
    },
  },
  resolve: {
    alias: [
      { find: '@abe-stack/auth', replacement: `${authPkg}/index.ts` },
      { find: '@abe-stack/shared', replacement: `${corePkg}/index.ts` },
      { find: '@abe-stack/db', replacement: `${infraPkg}/index.ts` },
    ],
  },
});
