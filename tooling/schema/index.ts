// config/schema/index.ts
/**
 * Centralized Configuration Schema - Main Entry Point
 *
 * This is the single source of truth for all configuration in the monorepo.
 * Edit the individual schema files to change settings, then run:
 *
 *   pnpm config:generate
 *
 * Generated files will have "DO NOT EDIT" headers.
 */

// Path aliases
export {
  packageAliases,
  uiInternalAliases,
  coreInternalAliases,
  webAliases,
  serverAliases,
  desktopAliases,
  coreAliases,
  uiAliases,
  sdkAliases,
  aliasDefinitions,
} from './aliases';

// TypeScript configuration
export {
  baseCompilerOptions,
  reactCompilerOptions,
  nodeCompilerOptions,
  baseExclude,
  excludedAliasNames,
  skipDirs,
  maxAliasDepth,
  projects,
  packageDirs,
  type ProjectConfig,
} from './typescript';

// Build configuration (Vite & Vitest)
export {
  getRepoRoot,
  getPaths,
  vitePlugins,
  viteWeb,
  viteDesktop,
  coverageExclude,
  vitestBase,
  vitestWeb,
  vitestServer,
  vitestCore,
  vitestSdk,
  vitestUi,
  vitestIntegration,
} from './build';

// Lint configuration
export {
  prettier,
  prettierIgnore,
  eslintExtensions,
  vscodeSettings,
  vscodeAdditionalSettings,
} from './lint';

// Package configuration
export { sharedScripts, libraryScripts, packageScripts, rootScripts } from './packages';
