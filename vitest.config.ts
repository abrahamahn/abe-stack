// vitest.config.ts
/**
 * Vitest Configuration
 *
 * Defines per-package test configs. Run `pnpm test` from root.
 */
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const repoRoot = __dirname;

const commonExclude = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.stryker-tmp/**',
  '**/backup/**',
  '**/*.spec.ts', // Playwright e2e tests
];

export default defineConfig({
  plugins: [react()],
  test: {
    projects: [
      // packages/core
      {
        test: {
          name: 'core',
          root: path.join(repoRoot, 'packages/core'),
          environment: 'node',
          globals: true,
          include: ['src/**/*.{test,spec}.ts'],
          exclude: commonExclude,
        },
        resolve: {
          alias: {
            '@contracts': path.join(repoRoot, 'packages/core/src/contracts'),
            '@validation': path.join(repoRoot, 'packages/core/src/validation'),
            '@utils': path.join(repoRoot, 'packages/core/src/utils'),
          },
        },
      },

      // packages/stores
      {
        test: {
          name: 'stores',
          root: path.join(repoRoot, 'packages/stores'),
          environment: 'node',
          globals: true,
          include: ['src/**/*.{test,spec}.ts'],
          exclude: commonExclude,
        },
        resolve: {
          alias: {
            '@abe-stack/core': path.join(repoRoot, 'packages/core/src'),
            '@abe-stack/core/infrastructure/transactions': path.join(
              repoRoot,
              'packages/core/src/infrastructure/transactions/index.ts',
            ),
          },
        },
      },

      // packages/media
      {
        test: {
          name: 'media',
          root: path.join(repoRoot, 'packages/media'),
          environment: 'node',
          globals: true,
          include: ['src/**/*.{test,spec}.ts'],
          exclude: commonExclude,
        },
      },

      // packages/db
      {
        test: {
          name: 'db',
          root: path.join(repoRoot, 'packages/db'),
          environment: 'node',
          globals: true,
          include: ['src/**/*.{test,spec}.ts'],
          exclude: commonExclude,
        },
      },

      // packages/sdk
      {
        test: {
          name: 'sdk',
          root: path.join(repoRoot, 'packages/sdk'),
          environment: 'node',
          globals: true,
          include: ['src/**/*.{test,spec}.ts'],
          exclude: commonExclude,
        },
        resolve: {
          alias: {
            '@abe-stack/core': path.join(repoRoot, 'packages/core/src'),
            '@abe-stack/media': path.join(repoRoot, 'packages/media/src'),
            '@abe-stack/sdk': path.join(repoRoot, 'packages/sdk/src'),
            '@abe-stack/stores': path.join(repoRoot, 'packages/stores/src'),
            '@abe-stack/ui': path.join(repoRoot, 'packages/ui/src'),
            '@contracts': path.join(repoRoot, 'packages/core/src/contracts'),
            '@validation': path.join(repoRoot, 'packages/core/src/validation'),
            '@persistence': path.join(repoRoot, 'packages/sdk/src/persistence'),
          },
        },
      },

      // packages/ui
      {
        plugins: [react()],
        test: {
          name: 'ui',
          root: path.join(repoRoot, 'packages/ui'),
          environment: 'jsdom',
          globals: true,
          setupFiles: [path.join(repoRoot, 'packages/ui/src/__tests__/setup.ts')],
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          exclude: commonExclude,
        },
        resolve: {
          alias: {
            '@components': path.join(repoRoot, 'packages/ui/src/components'),
            '@containers': path.join(repoRoot, 'packages/ui/src/layouts/containers'),
            '@elements': path.join(repoRoot, 'packages/ui/src/elements'),
            '@hooks': path.join(repoRoot, 'packages/ui/src/hooks'),
            '@layers': path.join(repoRoot, 'packages/ui/src/layouts/layers'),
            '@layouts': path.join(repoRoot, 'packages/ui/src/layouts'),
            '@shells': path.join(repoRoot, 'packages/ui/src/layouts/shells'),
            '@styles': path.join(repoRoot, 'packages/ui/src/styles'),
            '@test': path.join(repoRoot, 'packages/ui/src/test'),
            '@theme': path.join(repoRoot, 'packages/ui/src/theme'),
            '@utils': path.join(repoRoot, 'packages/ui/src/utils'),
            '@abe-stack/core': path.join(repoRoot, 'packages/core/src'),
            '@abe-stack/media': path.join(repoRoot, 'packages/media/src'),
            '@abe-stack/sdk': path.join(repoRoot, 'packages/sdk/src'),
            '@abe-stack/stores': path.join(repoRoot, 'packages/stores/src'),
            '@abe-stack/ui': path.join(repoRoot, 'packages/ui/src'),
          },
        },
      },

      // apps/server
      {
        test: {
          name: 'server',
          root: path.join(repoRoot, 'apps/server'),
          environment: 'node',
          globals: true,
          include: ['src/**/*.{test,spec}.ts'],
          exclude: commonExclude,
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
              replacement: path.join(
                repoRoot,
                'apps/server/src/infrastructure/data/database/schema',
              ),
            },
            {
              find: '@storage',
              replacement: path.join(repoRoot, 'apps/server/src/infrastructure/data/storage'),
            },
            {
              find: '@providers',
              replacement: path.join(
                repoRoot,
                'apps/server/src/infrastructure/data/storage/providers',
              ),
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
              replacement: path.join(
                repoRoot,
                'apps/server/src/infrastructure/messaging/websocket',
              ),
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
              replacement: path.join(
                repoRoot,
                'apps/server/src/infrastructure/security/permissions',
              ),
            },
            {
              find: '@rate-limit',
              replacement: path.join(
                repoRoot,
                'apps/server/src/infrastructure/security/rate-limit',
              ),
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
              find: '@abe-stack/core/contracts',
              replacement: path.join(repoRoot, 'packages/core/src/contracts/index.ts'),
            },
            {
              find: '@abe-stack/core/utils',
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
              find: '@abe-stack/core/domains/auth',
              replacement: path.join(repoRoot, 'packages/core/src/domains/auth/index.ts'),
            },
            {
              find: '@abe-stack/core/domains/users',
              replacement: path.join(repoRoot, 'packages/core/src/domains/users/index.ts'),
            },
            {
              find: '@abe-stack/core/domains/pagination',
              replacement: path.join(repoRoot, 'packages/core/src/domains/pagination/index.ts'),
            },
            {
              find: '@abe-stack/core/domains/admin',
              replacement: path.join(repoRoot, 'packages/core/src/domains/admin/index.ts'),
            },
            {
              find: '@abe-stack/media',
              replacement: path.join(repoRoot, 'packages/media/src/index.ts'),
            },
            { find: '@abe-stack/core', replacement: path.join(repoRoot, 'packages/core/src') },
          ],
        },
      },

      // apps/web
      {
        plugins: [react()],
        test: {
          name: 'web',
          root: path.join(repoRoot, 'apps/web'),
          environment: 'jsdom',
          globals: true,
          setupFiles: [path.join(repoRoot, 'apps/web/src/__tests__/setup.ts')],
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          exclude: commonExclude,
        },
        resolve: {
          alias: {
            '@': path.join(repoRoot, 'apps/web/src'),
            '@api': path.join(repoRoot, 'apps/web/src/api'),
            '@app': path.join(repoRoot, 'apps/web/src/app'),
            '@config': path.join(repoRoot, 'apps/web/src/config'),
            '@features': path.join(repoRoot, 'apps/web/src/features'),
            '@auth': path.join(repoRoot, 'apps/web/src/features/auth'),
            '@dashboard': path.join(repoRoot, 'apps/web/src/features/dashboard'),
            '@demo': path.join(repoRoot, 'apps/web/src/features/demo'),
            '@catalog': path.join(repoRoot, 'apps/web/src/features/demo/catalog'),
            '@toast': path.join(repoRoot, 'apps/web/src/features/toast'),
            '@pages': path.join(repoRoot, 'apps/web/src/pages'),
            '@test': path.join(repoRoot, 'apps/web/src/__tests__'),
            '@abe-stack/core': path.join(repoRoot, 'packages/core/src'),
            '@abe-stack/media': path.join(repoRoot, 'packages/media/src'),
            '@abe-stack/sdk': path.join(repoRoot, 'packages/sdk/src'),
            '@abe-stack/stores': path.join(repoRoot, 'packages/stores/src'),
            '@abe-stack/ui': path.join(repoRoot, 'packages/ui/src'),
            '@elements': path.join(repoRoot, 'packages/ui/src/elements'),
            '@components': path.join(repoRoot, 'packages/ui/src/components'),
            '@layouts': path.join(repoRoot, 'packages/ui/src/layouts'),
            '@containers': path.join(repoRoot, 'packages/ui/src/layouts/containers'),
            '@layers': path.join(repoRoot, 'packages/ui/src/layouts/layers'),
            '@shells': path.join(repoRoot, 'packages/ui/src/layouts/shells'),
            '@hooks': path.join(repoRoot, 'packages/ui/src/hooks'),
            '@theme': path.join(repoRoot, 'packages/ui/src/theme'),
            '@utils': path.join(repoRoot, 'packages/ui/src/utils'),
            '@contracts': path.join(repoRoot, 'packages/core/src/contracts'),
            '@validation': path.join(repoRoot, 'packages/core/src/validation'),
          },
        },
      },

      // apps/desktop
      {
        plugins: [react()],
        test: {
          name: 'desktop',
          root: path.join(repoRoot, 'apps/desktop'),
          environment: 'jsdom',
          globals: true,
          setupFiles: [path.join(repoRoot, 'apps/web/src/__tests__/setup.ts')],
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          exclude: commonExclude,
        },
        resolve: {
          alias: {
            '@': path.join(repoRoot, 'apps/desktop/src'),
            '@ipc': path.join(repoRoot, 'apps/desktop/src/electron/ipc'),
            '@abe-stack/core': path.join(repoRoot, 'packages/core/src'),
            '@abe-stack/media': path.join(repoRoot, 'packages/media/src'),
            '@abe-stack/sdk': path.join(repoRoot, 'packages/sdk/src'),
            '@abe-stack/stores': path.join(repoRoot, 'packages/stores/src'),
            '@abe-stack/ui': path.join(repoRoot, 'packages/ui/src'),
            // UI internal aliases (needed when importing @abe-stack/ui)
            '@elements': path.join(repoRoot, 'packages/ui/src/elements'),
            '@components': path.join(repoRoot, 'packages/ui/src/components'),
            '@layouts': path.join(repoRoot, 'packages/ui/src/layouts'),
            '@containers': path.join(repoRoot, 'packages/ui/src/layouts/containers'),
            '@layers': path.join(repoRoot, 'packages/ui/src/layouts/layers'),
            '@shells': path.join(repoRoot, 'packages/ui/src/layouts/shells'),
            '@hooks': path.join(repoRoot, 'packages/ui/src/hooks'),
            '@theme': path.join(repoRoot, 'packages/ui/src/theme'),
            '@utils': path.join(repoRoot, 'packages/ui/src/utils'),
            // Core internal aliases
            '@contracts': path.join(repoRoot, 'packages/core/src/contracts'),
            '@validation': path.join(repoRoot, 'packages/core/src/validation'),
          },
        },
      },
    ],
  },
});
