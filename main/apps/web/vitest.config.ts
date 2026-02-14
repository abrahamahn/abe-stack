// main/apps/web/vitest.config.ts
/**
 * Vitest configuration for web app tests.
 *
 * Key configuration:
 * - Uses jsdom for browser environment simulation
 * - Custom resolveId plugin (enforce: 'pre') ensures workspace packages resolve
 *   to source (not dist), overriding vite-tsconfig-paths from the base config
 * - Aliases UI/React package internal paths for tests that import UI components
 *
 * @module vitest-config-web
 */
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { mergeConfig } from 'vitest/config';
import { baseConfig } from '../../../vitest.config';

import type { Plugin } from 'vite';

/**
 * Map of workspace package names to their source entry points.
 * Used by the resolveWorkspaceToSource plugin to redirect imports
 * from dist (via package.json exports) to source (for test transforms).
 *
 * @complexity O(1) per lookup
 */
const workspacePackages: Record<string, string> = {
  '@abe-stack/shared': path.resolve(__dirname, '../../shared/src/index.ts'),
  '@abe-stack/api': path.resolve(__dirname, '../../client/api/src/index.ts'),
  '@abe-stack/ui': path.resolve(__dirname, '../../client/ui/src/index.ts'),
  '@abe-stack/client-engine': path.resolve(__dirname, '../../client/engine/src/index.ts'),
  '@abe-stack/react': path.resolve(__dirname, '../../client/react/src/index.ts'),
};

/**
 * Map of workspace subpath imports (regex) to their source directories.
 * Handles imports like `@abe-stack/ui/elements` → source path.
 *
 * @complexity O(n) where n is the number of subpath patterns
 */
const workspaceSubpaths: Array<{ pattern: RegExp; base: string }> = [
  {
    pattern: /^@abe-stack\/kernel\/(.+)$/,
    base: path.resolve(__dirname, '../../shared/src/'),
  },
  {
    pattern: /^@abe-stack\/ui\/(.+)$/,
    base: path.resolve(__dirname, '../../client/ui/src/'),
  },
  {
    pattern: /^@abe-stack\/client\/(.+)$/,
    base: path.resolve(__dirname, '../../client/engine/src/'),
  },
  {
    pattern: /^@abe-stack\/react\/(.+)$/,
    base: path.resolve(__dirname, '../../client/react/src/'),
  },
];

/**
 * Custom Vite plugin that resolves workspace package imports to source
 * directories instead of dist. Uses `enforce: 'pre'` to run before
 * vite-tsconfig-paths (from base config) which would resolve to dist
 * via package.json exports.
 *
 * This is necessary because dist files contain unresolved TypeScript
 * path aliases (e.g., `@utils/cn`) that cannot be resolved at runtime.
 *
 * @returns Vite plugin
 * @complexity O(n) per resolve call where n is number of subpath patterns
 */
/**
 * Resolve a file path, trying common extensions and index files.
 * Handles both direct file paths and directory paths (→ index.ts).
 *
 * @param basePath - The base path to resolve
 * @returns The resolved file path, or undefined if not found
 * @complexity O(1) - bounded number of filesystem checks
 */
function resolveFilePath(basePath: string): string | undefined {
  // Try exact path with common extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  for (const ext of extensions) {
    const filePath = basePath + ext;
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }

  // Try as directory with index file
  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    for (const ext of extensions) {
      const indexPath = path.join(basePath, 'index' + ext);
      if (fs.existsSync(indexPath)) {
        return indexPath;
      }
    }
  }

  // Try exact path (might be a full filename already)
  if (fs.existsSync(basePath)) {
    return basePath;
  }

  return undefined;
}

function resolveWorkspaceToSource(): Plugin {
  return {
    name: 'resolve-workspace-to-source',
    enforce: 'pre',
    resolveId(source: string) {
      // Check exact package matches first
      const exactMatch = workspacePackages[source];
      if (exactMatch !== undefined) {
        return exactMatch;
      }

      // Check subpath patterns
      for (const { pattern, base } of workspaceSubpaths) {
        const match = source.match(pattern);
        if (match !== null && match[1] !== undefined) {
          const resolved = resolveFilePath(path.join(base, match[1]));
          if (resolved !== undefined) {
            return resolved;
          }
        }
      }

      return undefined;
    },
  };
}

export default mergeConfig(baseConfig, {
  plugins: [react(), resolveWorkspaceToSource()],
  resolve: {
    alias: [
      // Web app feature module aliases - must match tsconfig.json paths
      { find: '@app', replacement: path.resolve(__dirname, './src/app') },
      { find: '@api', replacement: path.resolve(__dirname, './src/api') },
      { find: '@admin', replacement: path.resolve(__dirname, './src/features/admin') },
      { find: '@auth', replacement: path.resolve(__dirname, './src/features/auth') },
      { find: '@billing', replacement: path.resolve(__dirname, './src/features/billing') },
      {
        find: '@catalog',
        replacement: path.resolve(__dirname, './src/features/ui-library/catalog'),
      },
      { find: '@config', replacement: path.resolve(__dirname, './src/config') },
      { find: '@dashboard', replacement: path.resolve(__dirname, './src/features/dashboard') },
      { find: '@ui-library', replacement: path.resolve(__dirname, './src/features/ui-library') },
      { find: '@features', replacement: path.resolve(__dirname, './src/features') },
      { find: '@home', replacement: path.resolve(__dirname, './src/features/home') },
      { find: '@pages', replacement: path.resolve(__dirname, './src/pages') },
      { find: '@settings', replacement: path.resolve(__dirname, './src/features/settings') },
      // UI package internal aliases - for tests that import UI components
      { find: '@utils', replacement: path.resolve(__dirname, '../../client/ui/src/utils') },
      { find: '@elements', replacement: path.resolve(__dirname, '../../client/ui/src/elements') },
      {
        find: '@components',
        replacement: path.resolve(__dirname, '../../client/ui/src/components'),
      },
      { find: '@hooks', replacement: path.resolve(__dirname, '../../client/react/src/hooks') },
      { find: '@theme', replacement: path.resolve(__dirname, '../../client/ui/src/theme') },
      { find: '@layouts', replacement: path.resolve(__dirname, '../../client/ui/src/layouts') },
      {
        find: '@providers',
        replacement: path.resolve(__dirname, '../../client/react/src/providers'),
      },
      {
        find: '@shells',
        replacement: path.resolve(__dirname, '../../client/ui/src/layouts/shells'),
      },
      {
        find: '@layers',
        replacement: path.resolve(__dirname, '../../client/ui/src/layouts/layers'),
      },
      {
        find: '@containers',
        replacement: path.resolve(__dirname, '../../client/ui/src/layouts/containers'),
      },
    ],
  },
  test: {
    name: 'web',
    environment: 'jsdom',
    setupFiles: ['./src/__tests__/setup.ts'],
    // Timeout for individual tests
    testTimeout: 10000,
    // Vitest 4: Use threads pool with limited concurrency for better memory management
    pool: 'threads',
    maxConcurrency: 4,
  },
});
