// config/aliases.ts
/**
 * Shared path aliases for Vite and Vitest configurations.
 * Single source of truth for all alias definitions.
 */
import path from 'node:path';

export const repoRoot = path.resolve(__dirname, '..');

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
  '@abe-stack/core': path.join(coreRoot, 'src'),
  '@abe-stack/sdk': path.join(sdkRoot, 'src'),
  '@abe-stack/ui': path.join(uiRoot, 'src'),
};

/**
 * UI package internal aliases - needed for web build to resolve UI's internal imports
 * These must match the paths defined in packages/ui/tsconfig.json
 */
export const uiInternalAliases = {
  '@elements': path.join(uiRoot, 'src/elements'),
  '@components': path.join(uiRoot, 'src/components'),
  '@layouts': path.join(uiRoot, 'src/layouts'),
  '@containers': path.join(uiRoot, 'src/layouts/containers'),
  '@layers': path.join(uiRoot, 'src/layouts/layers'),
  '@shells': path.join(uiRoot, 'src/layouts/shells'),
  '@hooks': path.join(uiRoot, 'src/hooks'),
  '@theme': path.join(uiRoot, 'src/theme'),
  '@utils': path.join(uiRoot, 'src/utils'),
};

/**
 * Core package internal aliases - needed for bundlers to resolve core's internal imports
 * When bundling apps that import from @abe-stack/core source, these aliases are needed
 */
export const coreInternalAliases = {
  '@contracts': path.join(coreRoot, 'src/contracts'),
  '@stores': path.join(coreRoot, 'src/stores'),
  '@validation': path.join(coreRoot, 'src/validation'),
};

/**
 * Web app aliases
 */
export function getWebAliases(): Record<string, string> {
  return {
    '@': path.join(webRoot, 'src'),
    ...packageAliases,
    ...uiInternalAliases,
    ...coreInternalAliases,
    // Note: @utils is provided by uiInternalAliases for UI component compatibility
    // Core utils should be imported via @abe-stack/core
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
  };
}

/**
 * Desktop app aliases
 */
export function getDesktopAliases(): Record<string, string> {
  return {
    '@': path.join(desktopRoot, 'src'),
    ...packageAliases,
    ...coreInternalAliases,
    '@components': path.join(desktopRoot, 'src/components'),
    '@hooks': path.join(desktopRoot, 'src/hooks'),
    '@services': path.join(desktopRoot, 'src/services'),
    '@config': path.join(desktopRoot, 'src/config'),
    '@layouts': path.join(desktopRoot, 'src/layouts'),
    '@routes': path.join(desktopRoot, 'src/routes'),
    // Desktop's own @utils overrides core's @utils
    '@utils': path.join(desktopRoot, 'src/utils'),
    '@api': path.join(desktopRoot, 'src/api'),
  };
}

/**
 * Server app aliases (array format for Vitest)
 */
export function getServerAliases(): Array<{ find: string; replacement: string }> {
  return [
    { find: '@', replacement: path.join(serverRoot, 'src') },
    { find: '@config', replacement: path.join(serverRoot, 'src/config') },
    { find: '@modules', replacement: path.join(serverRoot, 'src/modules') },
    { find: '@scripts', replacement: path.join(serverRoot, 'src/scripts') },
    { find: '@shared', replacement: path.join(serverRoot, 'src/shared') },
    { find: '@types', replacement: path.join(serverRoot, 'src/types') },
    { find: '@infra', replacement: path.join(serverRoot, 'src/infra') },
    // Infra subdirectories
    { find: '@crypto', replacement: path.join(serverRoot, 'src/infra/crypto') },
    { find: '@database', replacement: path.join(serverRoot, 'src/infra/database') },
    { find: '@schema', replacement: path.join(serverRoot, 'src/infra/database/schema') },
    { find: '@email', replacement: path.join(serverRoot, 'src/infra/email') },
    { find: '@health', replacement: path.join(serverRoot, 'src/infra/health') },
    { find: '@http', replacement: path.join(serverRoot, 'src/infra/http') },
    { find: '@pubsub', replacement: path.join(serverRoot, 'src/infra/pubsub') },
    { find: '@rate-limit', replacement: path.join(serverRoot, 'src/infra/rate-limit') },
    { find: '@security', replacement: path.join(serverRoot, 'src/infra/security') },
    { find: '@storage', replacement: path.join(serverRoot, 'src/infra/storage') },
    { find: '@providers', replacement: path.join(serverRoot, 'src/infra/storage/providers') },
    { find: '@websocket', replacement: path.join(serverRoot, 'src/infra/websocket') },
    // Module subdirectories
    { find: '@auth', replacement: path.join(serverRoot, 'src/modules/auth') },
    { find: '@admin', replacement: path.join(serverRoot, 'src/modules/admin') },
    { find: '@users', replacement: path.join(serverRoot, 'src/modules/users') },
    { find: '@utils', replacement: path.join(serverRoot, 'src/modules/auth/utils') },
  ];
}

/**
 * Core package aliases
 */
export function getCoreAliases(): Record<string, string> {
  return {
    '@contracts': path.join(coreRoot, 'src/contracts'),
    '@stores': path.join(coreRoot, 'src/stores'),
    '@utils': path.join(coreRoot, 'src/utils'),
    '@validation': path.join(coreRoot, 'src/validation'),
  };
}

/**
 * UI package aliases
 */
export function getUiAliases(): Record<string, string> {
  return {
    '@components': path.join(uiRoot, 'src/components'),
    '@containers': path.join(uiRoot, 'src/layouts/containers'),
    '@elements': path.join(uiRoot, 'src/elements'),
    '@hooks': path.join(uiRoot, 'src/hooks'),
    '@layers': path.join(uiRoot, 'src/layouts/layers'),
    '@layouts': path.join(uiRoot, 'src/layouts'),
    '@shells': path.join(uiRoot, 'src/layouts/shells'),
    '@styles': path.join(uiRoot, 'src/styles'),
    '@test': path.join(uiRoot, 'src/test'),
    '@theme': path.join(uiRoot, 'src/theme'),
    '@utils': path.join(uiRoot, 'src/utils'),
  };
}

/**
 * SDK package aliases
 */
export function getSdkAliases(): Record<string, string> {
  return {
    '@persistence': path.join(sdkRoot, 'src/persistence'),
  };
}
