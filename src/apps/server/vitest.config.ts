// src/apps/server/vitest.config.ts
import path from 'node:path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../../vitest.config';

const modulesPkg = path.resolve(__dirname, '../../server/core/src');
const infraPkg = path.resolve(__dirname, '../../server/engine/src');
const dbPkg = path.resolve(__dirname, '../../server/db/src');
const corePkg = path.resolve(__dirname, '../../shared/src');
const realtimePkg = path.resolve(__dirname, '../../server/realtime/src');
const websocketPkg = path.resolve(__dirname, '../../server/websocket/src');

export default mergeConfig(baseConfig, {
  test: {
    name: 'server',
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    // Inline local modules to ensure mocks work correctly with path aliases
    server: {
      deps: {
        inline: [
          /src\//,
          '@abe-stack/core',
          '@abe-stack/db',
          '@abe-stack/server-engine',
          '@abe-stack/shared',
          '@abe-stack/realtime',
          '@abe-stack/websocket',
        ],
      },
    },
  },
  resolve: {
    alias: [
      // Core package shortcut exports (must come before regex)
      {
        find: '@abe-stack/packages/shared/http',
        replacement: `${corePkg}/infrastructure/http/index.ts`,
      },
      {
        find: '@abe-stack/packages/shared/crypto',
        replacement: `${corePkg}/infrastructure/crypto/index.ts`,
      },
      {
        find: '@abe-stack/packages/shared/errors',
        replacement: `${corePkg}/infrastructure/errors/index.ts`,
      },
      {
        find: '@abe-stack/packages/shared/shared',
        replacement: `${corePkg}/packages/shared/index.ts`,
      },
      { find: '@abe-stack/packages/shared/utils', replacement: `${corePkg}/utils/index.ts` },
      { find: '@abe-stack/packages/shared/env', replacement: `${corePkg}/config/index.ts` },
      {
        find: '@abe-stack/packages/shared/pubsub/postgres',
        replacement: `${corePkg}/infrastructure/pubsub/postgres-pubsub.ts`,
      },
      {
        find: '@abe-stack/packages/shared/pubsub',
        replacement: `${corePkg}/infrastructure/pubsub/index.ts`,
      },
      { find: '@abe-stack/packages/shared/config', replacement: `${corePkg}/config/index.ts` },
      // Handle subpath imports with regex
      // @abe-stack/core subpath exports (modules consolidation)
      {
        find: /^@abe-stack\/core\/(.*)$/,
        replacement: `${modulesPkg}/$1/index.ts`,
      },
      { find: '@abe-stack/core', replacement: `${modulesPkg}/index.ts` },
      // Subpath imports for remaining packages
      { find: /^@abe-stack\/realtime\/(.*)$/, replacement: `${realtimePkg}/$1` },
      // Engine subpath exports (must come before main package catch-all)
      {
        find: '@abe-stack/server-engine/config',
        replacement: `${infraPkg}/config/index.ts`,
      },
      // Shared subpath exports (must come before main package catch-all)
      { find: '@abe-stack/shared/domain', replacement: `${corePkg}/domain/index.ts` },
      { find: '@abe-stack/shared/config', replacement: `${corePkg}/config/index.ts` },
      {
        find: '@abe-stack/shared/pubsub/postgres',
        replacement: `${corePkg}/utils/pubsub/postgres-pubsub.ts`,
      },
      {
        find: '@abe-stack/shared/pubsub',
        replacement: `${corePkg}/utils/pubsub/index.ts`,
      },
      // Handle main package imports
      { find: '@abe-stack/server-engine', replacement: `${infraPkg}/index.ts` },
      { find: '@abe-stack/db', replacement: `${dbPkg}/index.ts` },
      { find: '@abe-stack/shared', replacement: `${corePkg}/index.ts` },
      { find: '@abe-stack/realtime', replacement: `${realtimePkg}/index.ts` },
      { find: '@abe-stack/websocket', replacement: `${websocketPkg}/index.ts` },
      // Server-specific local aliases
      { find: /^@health\/(.*)$/, replacement: path.resolve(__dirname, 'src/health/$1') },
      { find: '@health', replacement: path.resolve(__dirname, 'src/health/index.ts') },
      { find: /^@logger\/(.*)$/, replacement: path.resolve(__dirname, 'src/logger/$1') },
      { find: '@logger', replacement: path.resolve(__dirname, 'src/logger/index.ts') },
      { find: /^@routes\/(.*)$/, replacement: path.resolve(__dirname, 'src/routes/$1') },
      { find: '@routes', replacement: path.resolve(__dirname, 'src/routes/index.ts') },
      { find: /^@shared\/(.*)$/, replacement: path.resolve(__dirname, 'src/types/$1') },
      { find: '@shared', replacement: path.resolve(__dirname, 'src/types/context.ts') },
      { find: /^@config\/(.*)$/, replacement: path.resolve(__dirname, 'src/config/$1') },
      { find: '@config', replacement: path.resolve(__dirname, 'src/config/index.ts') },
      // Catch-all for @/ prefix
      {
        find: /^@\/(.*)$/,
        replacement: path.resolve(__dirname, 'src/$1'),
      },
    ],
  },
});
