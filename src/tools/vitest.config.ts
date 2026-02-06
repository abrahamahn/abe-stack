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

const corePkg = path.resolve(__dirname, '../backend/core/src');
const sharedPkg = path.resolve(__dirname, '../kernel/src');
const infraPkg = path.resolve(__dirname, '../backend/engine/src');

export default mergeConfig(baseConfig, {
  test: {
    name: 'tools',
    environment: 'node',
    include: ['tools/scripts/**/*.test.ts'],
    server: {
      deps: {
        inline: ['@abe-stack/core', '@abe-stack/shared', '@abe-stack/db'],
      },
    },
  },
  resolve: {
    alias: [
      { find: /^@abe-stack\/core\/(.*)$/, replacement: `${corePkg}/$1/index.ts` },
      { find: '@abe-stack/core', replacement: `${corePkg}/index.ts` },
      { find: '@abe-stack/shared', replacement: `${sharedPkg}/index.ts` },
      { find: '@abe-stack/db', replacement: `${infraPkg}/index.ts` },
    ],
  },
});
