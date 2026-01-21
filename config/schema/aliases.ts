// config/schema/aliases.ts
/**
 * Path Alias Definitions - Single Source of Truth
 *
 * All path aliases for the monorepo are defined here.
 * Used by: Vite, Vitest, and referenced by TypeScript configs.
 *
 * Paths are relative to repo root (without leading ./)
 */

/**
 * Workspace package aliases (used by apps importing packages)
 */
export const packageAliases = {
  '@abe-stack/core': 'packages/core/src',
  '@abe-stack/sdk': 'packages/sdk/src',
  '@abe-stack/ui': 'packages/ui/src',
} as const;

/**
 * UI package internal aliases
 * Needed when bundling apps that use @abe-stack/ui
 */
export const uiInternalAliases = {
  '@elements': 'packages/ui/src/elements',
  '@components': 'packages/ui/src/components',
  '@layouts': 'packages/ui/src/layouts',
  '@containers': 'packages/ui/src/layouts/containers',
  '@layers': 'packages/ui/src/layouts/layers',
  '@shells': 'packages/ui/src/layouts/shells',
  '@hooks': 'packages/ui/src/hooks',
  '@theme': 'packages/ui/src/theme',
  '@utils': 'packages/ui/src/utils',
} as const;

/**
 * Core package internal aliases
 * Needed when bundling apps that use @abe-stack/core
 */
export const coreInternalAliases = {
  '@contracts': 'packages/core/src/contracts',
  '@stores': 'packages/core/src/stores',
  '@validation': 'packages/core/src/validation',
} as const;

/**
 * Web app aliases
 */
export const webAliases = {
  '@': 'apps/web/src',
  '@api': 'apps/web/src/api',
  '@app': 'apps/web/src/app',
  '@config': 'apps/web/src/config',
  '@features': 'apps/web/src/features',
  '@auth': 'apps/web/src/features/auth',
  '@dashboard': 'apps/web/src/features/dashboard',
  '@demo': 'apps/web/src/features/demo',
  '@catalog': 'apps/web/src/features/demo/catalog',
  '@toast': 'apps/web/src/features/toast',
  '@pages': 'apps/web/src/pages',
  '@test': 'apps/web/src/test',
} as const;

/**
 * Server app aliases
 */
export const serverAliases = {
  '@': 'apps/server/src',
  '@config': 'apps/server/src/config',
  '@modules': 'apps/server/src/modules',
  '@scripts': 'apps/server/src/scripts',
  '@shared': 'apps/server/src/shared',
  '@types': 'apps/server/src/types',
  '@infrastructure': 'apps/server/src/infrastructure',
  // Data layer (database, storage, files)
  '@data': 'apps/server/src/infrastructure/data',
  '@database': 'apps/server/src/infrastructure/data/database',
  '@schema': 'apps/server/src/infrastructure/data/database/schema',
  '@storage': 'apps/server/src/infrastructure/data/storage',
  '@providers': 'apps/server/src/infrastructure/data/storage/providers',
  '@files': 'apps/server/src/infrastructure/data/files',
  // Messaging layer (email, pubsub, websocket)
  '@messaging': 'apps/server/src/infrastructure/messaging',
  '@email': 'apps/server/src/infrastructure/messaging/email',
  '@pubsub': 'apps/server/src/infrastructure/messaging/pubsub',
  '@websocket': 'apps/server/src/infrastructure/messaging/websocket',
  // Security layer (crypto, permissions, rate-limit)
  '@security': 'apps/server/src/infrastructure/security',
  '@crypto': 'apps/server/src/infrastructure/security/crypto',
  '@permissions': 'apps/server/src/infrastructure/security/permissions',
  '@rate-limit': 'apps/server/src/infrastructure/security/rate-limit',
  // HTTP layer (middleware, router, pagination)
  '@http': 'apps/server/src/infrastructure/http',
  '@http-middleware': 'apps/server/src/infrastructure/http/middleware',
  '@router': 'apps/server/src/infrastructure/http/router',
  '@pagination': 'apps/server/src/infrastructure/http/pagination',
  // Jobs layer (queue, write)
  '@jobs': 'apps/server/src/infrastructure/jobs',
  '@queue': 'apps/server/src/infrastructure/jobs/queue',
  '@write': 'apps/server/src/infrastructure/jobs/write',
  // Monitor layer (health, logger)
  '@monitor': 'apps/server/src/infrastructure/monitor',
  '@health': 'apps/server/src/infrastructure/monitor/health',
  '@logger': 'apps/server/src/infrastructure/monitor/logger',
  // Media layer
  '@media': 'apps/server/src/infrastructure/media',
  // Modules
  '@auth': 'apps/server/src/modules/auth',
  '@admin': 'apps/server/src/modules/admin',
  '@users': 'apps/server/src/modules/users',
  '@utils': 'apps/server/src/modules/auth/utils',
} as const;

/**
 * Desktop app aliases (unique to desktop)
 */
export const desktopAliases = {
  '@': 'apps/desktop/src',
  '@ipc': 'apps/desktop/src/electron/ipc',
  '@services': 'apps/desktop/src/services',
  '@routes': 'apps/desktop/src/routes',
  '@api': 'apps/desktop/src/api',
} as const;

/**
 * Core package aliases (for core's own tests/build)
 */
export const coreAliases = {
  '@contracts': 'packages/core/src/contracts',
  '@stores': 'packages/core/src/stores',
  '@utils': 'packages/core/src/utils',
  '@validation': 'packages/core/src/validation',
} as const;

/**
 * UI package aliases (for UI's own tests/build)
 */
export const uiAliases = {
  '@components': 'packages/ui/src/components',
  '@containers': 'packages/ui/src/layouts/containers',
  '@elements': 'packages/ui/src/elements',
  '@hooks': 'packages/ui/src/hooks',
  '@layers': 'packages/ui/src/layouts/layers',
  '@layouts': 'packages/ui/src/layouts',
  '@shells': 'packages/ui/src/layouts/shells',
  '@styles': 'packages/ui/src/styles',
  '@test': 'packages/ui/src/test',
  '@theme': 'packages/ui/src/theme',
  '@utils': 'packages/ui/src/utils',
} as const;

/**
 * SDK package aliases (for SDK's own tests/build)
 */
export const sdkAliases = {
  '@persistence': 'packages/sdk/src/persistence',
} as const;

/**
 * Combined alias definitions (for backwards compatibility with generators)
 */
export const aliasDefinitions = {
  packages: packageAliases,
  uiInternal: uiInternalAliases,
  coreInternal: coreInternalAliases,
  web: webAliases,
  server: serverAliases,
  desktop: desktopAliases,
  core: coreAliases,
  ui: uiAliases,
  sdk: sdkAliases,
} as const;
