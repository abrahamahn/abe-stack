// apps/server/vitest.config.ts
import path from 'node:path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

const billingPkg = path.resolve(__dirname, '../../packages/billing/src');
const cachePkg = path.resolve(__dirname, '../../packages/cache/src');
const contractsPkg = path.resolve(__dirname, '../../packages/contracts/src');
const corePkg = path.resolve(__dirname, '../../packages/core/src');
const dbPkg = path.resolve(__dirname, '../../packages/db/src');
const storagePkg = path.resolve(__dirname, '../../packages/storage/src');

export default mergeConfig(baseConfig, {
  test: {
    name: 'server',
    environment: 'node',
    // Inline local modules to ensure mocks work correctly with path aliases
    server: {
      deps: {
        inline: [/src\//, '@abe-stack/billing', '@abe-stack/cache', '@abe-stack/core', '@abe-stack/db', '@abe-stack/storage'],
      },
    },
  },
  resolve: {
    alias: [
      // Core package shortcut exports (must come before regex)
      { find: '@abe-stack/core/http', replacement: `${corePkg}/infrastructure/http/index.ts` },
      { find: '@abe-stack/core/crypto', replacement: `${corePkg}/infrastructure/crypto/index.ts` },
      { find: '@abe-stack/core/errors', replacement: `${corePkg}/infrastructure/errors/index.ts` },
      { find: '@abe-stack/core/shared', replacement: `${corePkg}/shared/index.ts` },
      { find: '@abe-stack/core/utils', replacement: `${corePkg}/utils/index.ts` },
      { find: '@abe-stack/core/env', replacement: `${corePkg}/config/index.ts` },
      { find: '@abe-stack/core/pubsub/postgres', replacement: `${corePkg}/infrastructure/pubsub/postgres-pubsub.ts` },
      { find: '@abe-stack/core/pubsub', replacement: `${corePkg}/infrastructure/pubsub/index.ts` },
      { find: '@abe-stack/core/config', replacement: `${corePkg}/config/index.ts` },
      // Handle subpath imports with regex
      {
        find: /^@abe-stack\/contracts\/(.*)$/,
        replacement: `${contractsPkg}/$1`,
      },
      {
        find: /^@abe-stack\/core\/(.*)$/,
        replacement: `${corePkg}/$1`,
      },
      // Handle main package imports
      { find: '@abe-stack/billing', replacement: `${billingPkg}/index.ts` },
      { find: '@abe-stack/cache', replacement: `${cachePkg}/index.ts` },
      { find: '@abe-stack/contracts', replacement: `${contractsPkg}/index.ts` },
      { find: '@abe-stack/core', replacement: `${corePkg}/index.ts` },
      { find: /^@abe-stack\/db\/(.*)$/, replacement: `${dbPkg}/$1` },
      { find: '@abe-stack/db', replacement: `${dbPkg}/index.ts` },
      { find: /^@abe-stack\/storage\/(.*)$/, replacement: `${storagePkg}/$1` },
      { find: '@abe-stack/storage', replacement: `${storagePkg}/index.ts` },
      // Server-specific aliases
      {
        find: /^@\/(.*)$/,
        replacement: path.resolve(__dirname, 'src/$1'),
      },
    ],
  },
});
