// apps/server/vitest.config.ts
import path from 'node:path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../vitest.config';

const adminPkg = path.resolve(__dirname, '../../modules/admin/src');
const authPkg = path.resolve(__dirname, '../../modules/auth/src');
const billingPkg = path.resolve(__dirname, '../../modules/billing/src');
const cachePkg = path.resolve(__dirname, '../../infra/cache/src');
const contractsPkg = path.resolve(__dirname, '../../infra/contracts/src');
const corePkg = path.resolve(__dirname, '../../shared/core/src');
const dbPkg = path.resolve(__dirname, '../../infra/db/src');
const emailPkg = path.resolve(__dirname, '../../infra/email/src');
const httpPkg = path.resolve(__dirname, '../../infra/http/src');
const jobsPkg = path.resolve(__dirname, '../../infra/jobs/src');
const notificationsPkg = path.resolve(__dirname, '../../infra/notifications/src');
const realtimePkg = path.resolve(__dirname, '../../infra/realtime/src');
const securityPkg = path.resolve(__dirname, '../../infra/security/src');
const storagePkg = path.resolve(__dirname, '../../infra/storage/src');
const usersPkg = path.resolve(__dirname, '../../infra/users/src');

export default mergeConfig(baseConfig, {
  test: {
    name: 'server',
    environment: 'node',
    // Inline local modules to ensure mocks work correctly with path aliases
    server: {
      deps: {
        inline: [/src\//, '@abe-stack/admin', '@abe-stack/auth', '@abe-stack/billing', '@abe-stack/cache', '@abe-stack/core', '@abe-stack/db', '@abe-stack/email', '@abe-stack/http', '@abe-stack/jobs', '@abe-stack/notifications', '@abe-stack/realtime', '@abe-stack/security', '@abe-stack/storage', '@abe-stack/users'],
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
      // Subpath imports for migrated packages (regex must come before exact matches)
      { find: /^@abe-stack\/admin\/(.*)$/, replacement: `${adminPkg}/$1` },
      { find: /^@abe-stack\/auth\/(.*)$/, replacement: `${authPkg}/$1` },
      { find: /^@abe-stack\/notifications\/(.*)$/, replacement: `${notificationsPkg}/$1` },
      { find: /^@abe-stack\/realtime\/(.*)$/, replacement: `${realtimePkg}/$1` },
      { find: /^@abe-stack\/users\/(.*)$/, replacement: `${usersPkg}/$1` },
      { find: /^@abe-stack\/http\/(.*)$/, replacement: `${httpPkg}/$1` },
      { find: /^@abe-stack\/security\/(.*)$/, replacement: `${securityPkg}/$1` },
      // Handle main package imports
      { find: '@abe-stack/admin', replacement: `${adminPkg}/index.ts` },
      { find: '@abe-stack/auth', replacement: `${authPkg}/index.ts` },
      { find: '@abe-stack/billing', replacement: `${billingPkg}/index.ts` },
      { find: '@abe-stack/cache', replacement: `${cachePkg}/index.ts` },
      { find: '@abe-stack/contracts', replacement: `${contractsPkg}/index.ts` },
      { find: '@abe-stack/core', replacement: `${corePkg}/index.ts` },
      { find: /^@abe-stack\/db\/(.*)$/, replacement: `${dbPkg}/$1` },
      { find: '@abe-stack/db', replacement: `${dbPkg}/index.ts` },
      { find: '@abe-stack/email', replacement: `${emailPkg}/index.ts` },
      { find: '@abe-stack/http', replacement: `${httpPkg}/index.ts` },
      { find: '@abe-stack/jobs', replacement: `${jobsPkg}/index.ts` },
      { find: '@abe-stack/notifications', replacement: `${notificationsPkg}/index.ts` },
      { find: '@abe-stack/realtime', replacement: `${realtimePkg}/index.ts` },
      { find: '@abe-stack/security', replacement: `${securityPkg}/index.ts` },
      { find: /^@abe-stack\/storage\/(.*)$/, replacement: `${storagePkg}/$1` },
      { find: '@abe-stack/storage', replacement: `${storagePkg}/index.ts` },
      { find: '@abe-stack/users', replacement: `${usersPkg}/index.ts` },
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
