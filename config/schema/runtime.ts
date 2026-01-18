// WARNING: This file is auto-generated. DO NOT EDIT DIRECTLY.
// Edit config/schema/*.ts and run: pnpm config:generate

/**
 * Runtime path aliases for Vite and Vitest configurations.
 * Generated from config/schema/build.ts alias definitions.
 */
import path from 'node:path';

export const repoRoot = path.resolve(__dirname, '../..');

// Package paths
export const packagesRoot = path.join(repoRoot, 'packages');
export const coreRoot = path.join(packagesRoot, 'core');
export const sdkRoot = path.join(packagesRoot, 'sdk');
export const uiRoot = path.join(packagesRoot, 'ui');

// App paths
export const appsRoot = path.join(repoRoot, 'apps');
export const webRoot = path.join(appsRoot, 'web');
export const serverRoot = path.join(appsRoot, 'server');
export const desktopRoot = path.join(appsRoot, 'desktop');

/**
 * Shared package aliases used across all apps
 */
export const packageAliases = {
  '@abe-stack/core': path.join(repoRoot, 'packages/core/src'),
  '@abe-stack/sdk': path.join(repoRoot, 'packages/sdk/src'),
  '@abe-stack/ui': path.join(repoRoot, 'packages/ui/src'),
};

/**
 * UI package internal aliases - needed for web build to resolve UI's internal imports
 * These must match the paths defined in packages/ui/tsconfig.json
 */
export const uiInternalAliases = {
  '@elements': path.join(repoRoot, 'packages/ui/src/elements'),
  '@components': path.join(repoRoot, 'packages/ui/src/components'),
  '@layouts': path.join(repoRoot, 'packages/ui/src/layouts'),
  '@containers': path.join(repoRoot, 'packages/ui/src/layouts/containers'),
  '@layers': path.join(repoRoot, 'packages/ui/src/layouts/layers'),
  '@shells': path.join(repoRoot, 'packages/ui/src/layouts/shells'),
  '@hooks': path.join(repoRoot, 'packages/ui/src/hooks'),
  '@theme': path.join(repoRoot, 'packages/ui/src/theme'),
  '@utils': path.join(repoRoot, 'packages/ui/src/utils'),
};

/**
 * Core package internal aliases - needed for bundlers to resolve core's internal imports
 * When bundling apps that import from @abe-stack/core source, these aliases are needed
 */
export const coreInternalAliases = {
  '@contracts': path.join(repoRoot, 'packages/core/src/contracts'),
  '@stores': path.join(repoRoot, 'packages/core/src/stores'),
  '@validation': path.join(repoRoot, 'packages/core/src/validation'),
};

/**
 * Web app aliases
 */
export function getWebAliases(): Record<string, string> {
  return {
    '@': path.join(webRoot, 'src'),
    '@api': path.join(webRoot, 'src/api'),
    '@app': path.join(webRoot, 'src/app'),
    '@config': path.join(webRoot, 'src/config'),
    '@features': path.join(webRoot, 'src/features'),
    '@auth': path.join(webRoot, 'src/features/auth'),
    '@dashboard': path.join(webRoot, 'src/features/dashboard'),
    '@demo': path.join(webRoot, 'src/features/demo'),
    '@catalog': path.join(webRoot, 'src/features/demo/catalog'),
    '@toast': path.join(webRoot, 'src/features/toast'),
    '@pages': path.join(webRoot, 'src/pages'),
    '@test': path.join(webRoot, 'src/test'),
    ...packageAliases,
    ...uiInternalAliases,
    ...coreInternalAliases,
    // Note: @utils is provided by uiInternalAliases for UI component compatibility
    // Core utils should be imported via @abe-stack/core
  };
}

/**
 * Desktop app aliases
 */
export function getDesktopAliases(): Record<string, string> {
  return {
    ...packageAliases,
    ...uiInternalAliases,
    ...coreInternalAliases,
    // Desktop's own aliases override package aliases where needed
    '@': path.join(desktopRoot, 'src'),
    '@services': path.join(desktopRoot, 'src/services'),
    '@routes': path.join(desktopRoot, 'src/routes'),
    '@api': path.join(desktopRoot, 'src/api'),
  };
}

/**
 * Server app aliases (array format for Vitest)
 */
export function getServerAliases(): Array<{ find: string; replacement: string }> {
  return [
    { find: '@', replacement: path.join(repoRoot, 'apps/server/src') },
    { find: '@config', replacement: path.join(repoRoot, 'apps/server/src/config') },
    { find: '@modules', replacement: path.join(repoRoot, 'apps/server/src/modules') },
    { find: '@scripts', replacement: path.join(repoRoot, 'apps/server/src/scripts') },
    { find: '@shared', replacement: path.join(repoRoot, 'apps/server/src/shared') },
    { find: '@types', replacement: path.join(repoRoot, 'apps/server/src/types') },
    { find: '@infra', replacement: path.join(repoRoot, 'apps/server/src/infra') },
    { find: '@crypto', replacement: path.join(repoRoot, 'apps/server/src/infra/crypto') },
    { find: '@database', replacement: path.join(repoRoot, 'apps/server/src/infra/database') },
    { find: '@schema', replacement: path.join(repoRoot, 'apps/server/src/infra/database/schema') },
    { find: '@email', replacement: path.join(repoRoot, 'apps/server/src/infra/email') },
    { find: '@health', replacement: path.join(repoRoot, 'apps/server/src/infra/health') },
    { find: '@http', replacement: path.join(repoRoot, 'apps/server/src/infra/http') },
    { find: '@pubsub', replacement: path.join(repoRoot, 'apps/server/src/infra/pubsub') },
    { find: '@rate-limit', replacement: path.join(repoRoot, 'apps/server/src/infra/rate-limit') },
    { find: '@security', replacement: path.join(repoRoot, 'apps/server/src/infra/security') },
    { find: '@storage', replacement: path.join(repoRoot, 'apps/server/src/infra/storage') },
    { find: '@providers', replacement: path.join(repoRoot, 'apps/server/src/infra/storage/providers') },
    { find: '@websocket', replacement: path.join(repoRoot, 'apps/server/src/infra/websocket') },
    { find: '@auth', replacement: path.join(repoRoot, 'apps/server/src/modules/auth') },
    { find: '@admin', replacement: path.join(repoRoot, 'apps/server/src/modules/admin') },
    { find: '@users', replacement: path.join(repoRoot, 'apps/server/src/modules/users') },
    { find: '@utils', replacement: path.join(repoRoot, 'apps/server/src/modules/auth/utils') },
  ];
}

/**
 * Core package aliases
 */
export function getCoreAliases(): Record<string, string> {
  return {
    '@contracts': path.join(repoRoot, 'packages/core/src/contracts'),
    '@stores': path.join(repoRoot, 'packages/core/src/stores'),
    '@utils': path.join(repoRoot, 'packages/core/src/utils'),
    '@validation': path.join(repoRoot, 'packages/core/src/validation'),
  };
}

/**
 * UI package aliases
 */
export function getUiAliases(): Record<string, string> {
  return {
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
  };
}

/**
 * SDK package aliases
 */
export function getSdkAliases(): Record<string, string> {
  return {
    '@persistence': path.join(repoRoot, 'packages/sdk/src/persistence'),
  };
}
