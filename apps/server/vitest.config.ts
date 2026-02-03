// apps/server/vitest.config.ts
import path from 'node:path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

const adminPkg = path.resolve(__dirname, '../../modules/admin/src');
const authPkg = path.resolve(__dirname, '../../modules/auth/src');
const billingPkg = path.resolve(__dirname, '../../modules/billing/src');
const infraPkg = path.resolve(__dirname, '../../packages/backend-core/src');
const contractsPkg = path.resolve(__dirname, '../../packages/shared/src/contracts');
const corePkg = path.resolve(__dirname, '../../packages/shared/src');
const notificationsPkg = path.resolve(__dirname, '../../modules/notifications/src');
const realtimePkg = path.resolve(__dirname, '../../modules/realtime/src');
const usersPkg = path.resolve(__dirname, '../../modules/users/src');
const websocketPkg = path.resolve(__dirname, '../../premium/websocket/src');

export default mergeConfig(baseConfig, {
  test: {
    name: 'server',
    environment: 'node',
    // Inline local modules to ensure mocks work correctly with path aliases
    server: {
      deps: {
        inline: [
          /src\//,
          '@abe-stack/admin',
          '@abe-stack/auth',
          '@abe-stack/billing',
          '@abe-stack/db',
          '@abe-stack/shared',
          '@abe-stack/notifications',
          '@abe-stack/realtime',
          '@abe-stack/users',
          '@abe-stack/websocket',
        ],
      },
    },
  },
  resolve: {
    alias: [
      // Core package shortcut exports (must come before regex)
      { find: '@abe-stack/packages/shared/http', replacement: `${corePkg}/infrastructure/http/index.ts` },
      { find: '@abe-stack/packages/shared/crypto', replacement: `${corePkg}/infrastructure/crypto/index.ts` },
      { find: '@abe-stack/packages/shared/errors', replacement: `${corePkg}/infrastructure/errors/index.ts` },
      { find: '@abe-stack/packages/shared/shared', replacement: `${corePkg}/packages/shared/index.ts` },
      { find: '@abe-stack/packages/shared/utils', replacement: `${corePkg}/utils/index.ts` },
      { find: '@abe-stack/packages/shared/env', replacement: `${corePkg}/config/index.ts` },
      {
        find: '@abe-stack/packages/shared/pubsub/postgres',
        replacement: `${corePkg}/infrastructure/pubsub/postgres-pubsub.ts`,
      },
      { find: '@abe-stack/packages/shared/pubsub', replacement: `${corePkg}/infrastructure/pubsub/index.ts` },
      { find: '@abe-stack/packages/shared/config', replacement: `${corePkg}/config/index.ts` },
      // Handle subpath imports with regex
      {
        find: /^@abe-stack\/contracts\/(.*)$/,
        replacement: `${contractsPkg}/$1`,
      },
      {
        find: /^@abe-stack\/core\/(.*)$/,
        replacement: `${corePkg}/$1`,
      },
      // Subpath imports for migrated packages (regex must come before exact matches)
      { find: /^@abe-stack\/admin\/(.*)$/, replacement: `${adminPkg}/$1` },
      { find: /^@abe-stack\/auth\/(.*)$/, replacement: `${authPkg}/$1` },
      { find: /^@abe-stack\/notifications\/(.*)$/, replacement: `${notificationsPkg}/$1` },
      { find: /^@abe-stack\/realtime\/(.*)$/, replacement: `${realtimePkg}/$1` },
      { find: /^@abe-stack\/users\/(.*)$/, replacement: `${usersPkg}/$1` },
      // Handle main package imports
      { find: '@abe-stack/admin', replacement: `${adminPkg}/index.ts` },
      { find: '@abe-stack/auth', replacement: `${authPkg}/index.ts` },
      { find: '@abe-stack/billing', replacement: `${billingPkg}/index.ts` },
      { find: '@abe-stack/db', replacement: `${infraPkg}/index.ts` },
      { find: '@abe-stack/shared', replacement: `${contractsPkg}/index.ts` },
      { find: '@abe-stack/shared', replacement: `${corePkg}/index.ts` },
      { find: '@abe-stack/notifications', replacement: `${notificationsPkg}/index.ts` },
      { find: '@abe-stack/realtime', replacement: `${realtimePkg}/index.ts` },
      { find: '@abe-stack/users', replacement: `${usersPkg}/index.ts` },
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
