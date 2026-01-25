// apps/server/vitest.config.ts
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const repoRoot = path.join(__dirname, '../..');

export default defineConfig({
  test: {
    name: 'server',
    root: path.join(repoRoot, 'apps/server'),
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.stryker-tmp/**',
      '**/backup/**',
      '**/*.spec.ts', // Playwright e2e tests
      '**/__tests__/templates/**', // Template tests
    ],
    // Define test tiers for filtering
    testNamePattern: process.env.TEST_TIER
      ? process.env.TEST_TIER === 'unit'
        ? '(unit|fast|quick)'
        : process.env.TEST_TIER === 'integration'
          ? '(integration|critical|end-to-end|e2e)'
          : undefined
      : undefined,
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.join(repoRoot, 'apps/server/src') },
      { find: '@config', replacement: path.join(repoRoot, 'apps/server/src/config') },
      { find: '@modules', replacement: path.join(repoRoot, 'apps/server/src/modules') },
      { find: '@scripts', replacement: path.join(repoRoot, 'apps/server/src/scripts') },
      { find: '@shared', replacement: path.join(repoRoot, 'apps/server/src/shared') },
      { find: '@types', replacement: path.join(repoRoot, 'apps/server/src/types') },
      {
        find: '@infrastructure',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure'),
      },
      // Data layer
      {
        find: '@data',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/data'),
      },
      {
        find: '@database',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/data/database'),
      },
      {
        find: '@schema',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/data/database/schema'),
      },
      {
        find: '@storage',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/data/storage'),
      },
      {
        find: '@providers',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/data/storage/providers'),
      },
      {
        find: '@files',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/data/files'),
      },
      // Messaging layer
      {
        find: '@messaging',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/messaging'),
      },
      {
        find: '@email',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/messaging/email'),
      },
      {
        find: '@pubsub',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/messaging/pubsub'),
      },
      {
        find: '@websocket',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/messaging/websocket'),
      },
      // Security layer
      {
        find: '@security',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/security'),
      },
      {
        find: '@crypto',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/security/crypto'),
      },
      {
        find: '@permissions',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/security/permissions'),
      },
      {
        find: '@rate-limit',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/security/rate-limit'),
      },
      // HTTP layer
      {
        find: '@http',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/http'),
      },
      {
        find: '@http-middleware',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/http/middleware'),
      },
      {
        find: '@router',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/http/router'),
      },
      {
        find: '@pagination',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/http/pagination'),
      },
      // Jobs layer
      {
        find: '@jobs',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/jobs'),
      },
      {
        find: '@queue',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/jobs/queue'),
      },
      {
        find: '@write',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/jobs/write'),
      },
      // Monitor layer
      {
        find: '@monitor',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/monitor'),
      },
      {
        find: '@health',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/monitor/health'),
      },
      {
        find: '@logger',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/monitor/logger'),
      },
      // Media layer
      {
        find: '@media',
        replacement: path.join(repoRoot, 'apps/server/src/infrastructure/media'),
      },
      { find: '@auth', replacement: path.join(repoRoot, 'apps/server/src/modules/auth') },
      { find: '@admin', replacement: path.join(repoRoot, 'apps/server/src/modules/admin') },
      { find: '@users', replacement: path.join(repoRoot, 'apps/server/src/modules/users') },
      {
        find: '@utils',
        replacement: path.join(repoRoot, 'apps/server/src/modules/auth/utils'),
      },
      // @abe-stack/core subpaths (must come before main alias)
      {
        find: '@abe-stack/core/http',
        replacement: path.join(repoRoot, 'packages/core/src/infrastructure/http/index.ts'),
      },
      {
        find: '@abe-stack/core/crypto',
        replacement: path.join(repoRoot, 'packages/core/src/infrastructure/crypto/index.ts'),
      },
      {
        find: '@abe-stack/core/errors',
        replacement: path.join(repoRoot, 'packages/core/src/errors/index.ts'),
      },
      {
        find: '@abe-stack/contracts',
        replacement: path.join(repoRoot, 'packages/core/src/contracts/index.ts'),
      },
      {
        find: '@abe-stack/core/shared',
        replacement: path.join(repoRoot, 'packages/core/src/utils/index.ts'),
      },
      {
        find: '@abe-stack/core/env',
        replacement: path.join(repoRoot, 'packages/core/src/env.ts'),
      },
      {
        find: '@abe-stack/core/shared',
        replacement: path.join(repoRoot, 'packages/core/src/shared/index.ts'),
      },
      {
        find: '@abe-stack/core/infrastructure',
        replacement: path.join(repoRoot, 'packages/core/src/infrastructure/index.ts'),
      },
      {
        find: '@abe-stack/core/modules/auth',
        replacement: path.join(repoRoot, 'packages/core/src/domains/auth/index.ts'),
      },
      {
        find: '@abe-stack/core/modules/users',
        replacement: path.join(repoRoot, 'packages/core/src/domains/users/index.ts'),
      },
      {
        find: '@abe-stack/core/modules/pagination',
        replacement: path.join(repoRoot, 'packages/core/src/domains/pagination/index.ts'),
      },
      {
        find: '@abe-stack/core/modules/admin',
        replacement: path.join(repoRoot, 'packages/core/src/domains/admin/index.ts'),
      },
      {
        find: '@abe-stack/media',
        replacement: path.join(repoRoot, 'packages/media/src/index.ts'),
      },
      { find: '@abe-stack/core', replacement: path.join(repoRoot, 'packages/core/src') },
    ],
  },
});
