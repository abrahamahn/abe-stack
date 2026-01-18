// config/generators/vite.gen.ts
/**
 * Vite Configuration Generator
 *
 * Generates:
 *   config/schema/runtime.ts
 */

import * as path from 'path';
import * as fs from 'fs';

import { aliasDefinitions } from '../schema/build';
import { createLogger, ROOT, writeTsFile, TS_HEADER } from './utils';

interface GeneratorResult {
  generated: string[];
  unchanged: string[];
  errors: string[];
}

/**
 * Generate object entries as code lines
 */
function generateObjectEntries(
  entries: Record<string, string>,
  pathPrefix: string,
  indent: string = '  ',
): string {
  return Object.entries(entries)
    .map(
      ([alias, relativePath]) =>
        `${indent}'${alias}': path.join(${pathPrefix}, '${relativePath.replace(pathPrefix.toLowerCase().replace('root', ''), '').replace(/^(packages\/|apps\/)/, '')}'),`,
    )
    .join('\n');
}

/**
 * Generate the aliases.ts file content
 */
function generateAliasesContent(): string {
  // Generate object entries for static exports
  const packageAliasEntries = Object.entries(aliasDefinitions.packages)
    .map(([alias, relativePath]) => `  '${alias}': path.join(repoRoot, '${relativePath}'),`)
    .join('\n');

  const uiInternalEntries = Object.entries(aliasDefinitions.uiInternal)
    .map(([alias, relativePath]) => `  '${alias}': path.join(repoRoot, '${relativePath}'),`)
    .join('\n');

  const coreInternalEntries = Object.entries(aliasDefinitions.coreInternal)
    .map(([alias, relativePath]) => `  '${alias}': path.join(repoRoot, '${relativePath}'),`)
    .join('\n');

  // Generate web aliases (specific paths relative to webRoot)
  const webAliasEntries = Object.entries(aliasDefinitions.web)
    .map(([alias, relativePath]) => {
      const subPath = relativePath.replace('apps/web/', '');
      return `    '${alias}': path.join(webRoot, '${subPath}'),`;
    })
    .join('\n');

  // Generate desktop aliases
  const desktopAliasEntries = Object.entries(aliasDefinitions.desktop)
    .map(([alias, relativePath]) => {
      const subPath = relativePath.replace('apps/desktop/', '');
      return `    '${alias}': path.join(desktopRoot, '${subPath}'),`;
    })
    .join('\n');

  // Generate server aliases (array format)
  const serverAliasEntries = Object.entries(aliasDefinitions.server)
    .map(
      ([alias, relativePath]) =>
        `    { find: '${alias}', replacement: path.join(repoRoot, '${relativePath}') },`,
    )
    .join('\n');

  // Generate core aliases
  const coreAliasEntries = Object.entries(aliasDefinitions.core)
    .map(([alias, relativePath]) => `    '${alias}': path.join(repoRoot, '${relativePath}'),`)
    .join('\n');

  // Generate UI aliases
  const uiAliasEntries = Object.entries(aliasDefinitions.ui)
    .map(([alias, relativePath]) => `    '${alias}': path.join(repoRoot, '${relativePath}'),`)
    .join('\n');

  // Generate SDK aliases
  const sdkAliasEntries = Object.entries(aliasDefinitions.sdk)
    .map(([alias, relativePath]) => `    '${alias}': path.join(repoRoot, '${relativePath}'),`)
    .join('\n');

  return `/**
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
${packageAliasEntries}
};

/**
 * UI package internal aliases - needed for web build to resolve UI's internal imports
 * These must match the paths defined in packages/ui/tsconfig.json
 */
export const uiInternalAliases = {
${uiInternalEntries}
};

/**
 * Core package internal aliases - needed for bundlers to resolve core's internal imports
 * When bundling apps that import from @abe-stack/core source, these aliases are needed
 */
export const coreInternalAliases = {
${coreInternalEntries}
};

/**
 * Web app aliases
 */
export function getWebAliases(): Record<string, string> {
  return {
${webAliasEntries}
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
${desktopAliasEntries}
    ...packageAliases,
    ...coreInternalAliases,
  };
}

/**
 * Server app aliases (array format for Vitest)
 */
export function getServerAliases(): Array<{ find: string; replacement: string }> {
  return [
${serverAliasEntries}
  ];
}

/**
 * Core package aliases
 */
export function getCoreAliases(): Record<string, string> {
  return {
${coreAliasEntries}
  };
}

/**
 * UI package aliases
 */
export function getUiAliases(): Record<string, string> {
  return {
${uiAliasEntries}
  };
}

/**
 * SDK package aliases
 */
export function getSdkAliases(): Record<string, string> {
  return {
${sdkAliasEntries}
  };
}
`;
}

/**
 * Generate the runtime.ts file that vite configs import from
 */
export function generateViteAliases(
  options: { checkOnly?: boolean; quiet?: boolean } = {},
): GeneratorResult {
  const { checkOnly = false, quiet = false } = options;
  const log = createLogger(quiet);
  const result: GeneratorResult = { generated: [], unchanged: [], errors: [] };

  log.log('\nVite aliases now inlined in config files - no generation needed.');

  // Runtime.ts has been removed - aliases are now inlined in each config file
  // This avoids import issues during development

  return result;
}
