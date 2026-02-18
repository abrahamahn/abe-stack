// main/tools/vitest.config.ts
/**
 * Vitest configuration for tools/scripts/ tests.
 *
 * Provides @bslt/* package alias resolution so tests that mock
 * these packages can resolve the module specifiers. Since all
 * @bslt/* imports are mocked in the DB script tests, only the
 * type declarations need to be reachable.
 */
import path from 'path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

const corePkg = path.resolve(__dirname, '../server/core/src');
const sharedPkg = path.resolve(__dirname, '../shared/src');
const dbPkg = path.resolve(__dirname, '../server/db/src');

export default mergeConfig(baseConfig, {
  test: {
    name: 'tools',
    environment: 'node',
    include: ['main/tools/scripts/**/*.test.ts'],
    server: {
      deps: {
        inline: ['@bslt/core', '@bslt/shared', '@bslt/db'],
      },
    },
  },
  resolve: {
    alias: [
      { find: /^@bslt\/core\/(.*)$/, replacement: `${corePkg}/$1/index.ts` },
      { find: '@bslt/core', replacement: `${corePkg}/index.ts` },
      { find: '@bslt/shared', replacement: `${sharedPkg}/index.ts` },
      { find: '@bslt/db', replacement: `${dbPkg}/index.ts` },
    ],
  },
});
