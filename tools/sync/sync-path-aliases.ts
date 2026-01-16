#!/usr/bin/env node
// tools/sync/sync-path-aliases.ts
/**
 * Synchronizes TypeScript path aliases with directory structure.
 *
 * Scans directories with index.ts and creates path aliases in tsconfig.json.
 *
 * Usage:
 *   pnpm sync:aliases          # Sync once
 *   pnpm sync:aliases:check    # Check if up to date
 *   pnpm sync:aliases:watch    # Watch mode
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const isQuiet = process.argv.includes('--quiet');
function log(...args: unknown[]): void {
  if (!isQuiet) console.log(...args);
}

interface ProjectConfig {
  tsconfigPath: string;
  srcDir: string;
  aliasPrefix: string;
  scanDirs: string[];
}

const PROJECTS: ProjectConfig[] = [
  {
    tsconfigPath: path.join(ROOT, 'apps/web/tsconfig.json'),
    srcDir: path.join(ROOT, 'apps/web/src'),
    aliasPrefix: '@',
    scanDirs: ['apps/web/src', 'apps/web/src/features'],
  },
  {
    tsconfigPath: path.join(ROOT, 'apps/server/tsconfig.json'),
    srcDir: path.join(ROOT, 'apps/server/src'),
    aliasPrefix: '@',
    scanDirs: ['apps/server/src', 'apps/server/src/infra', 'apps/server/src/modules'],
  },
  {
    tsconfigPath: path.join(ROOT, 'apps/desktop/tsconfig.json'),
    srcDir: path.join(ROOT, 'apps/desktop/src'),
    aliasPrefix: '@',
    scanDirs: ['apps/desktop/src'],
  },
];

const SKIP_DIRS = new Set(['node_modules', '__tests__', 'dist', '.turbo', '.cache', 'build', 'coverage', '.git']);

// Directory names that are too common to create aliases for (use relative imports instead)
const EXCLUDED_ALIAS_NAMES = new Set(['utils', 'helpers', 'types', 'constants']);

// Maximum depth for path aliases (relative to srcDir)
// Level 1: src/features, Level 2: src/features/auth, Level 3: src/features/auth/components
const MAX_ALIAS_DEPTH = 3;

function hasIndexFile(dirPath: string): boolean {
  return (
    fs.existsSync(path.join(dirPath, 'index.ts')) ||
    fs.existsSync(path.join(dirPath, 'index.tsx'))
  );
}

function findAliasDirectoriesRecursive(baseDir: string): string[] {
  const results: string[] = [];

  function walk(currentDir: string, depth: number): void {
    if (!fs.existsSync(currentDir)) return;
    if (depth > MAX_ALIAS_DEPTH) return;

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (SKIP_DIRS.has(entry.name)) continue;

      const subDir = path.join(currentDir, entry.name);

      // Only add directories that have an index file
      if (hasIndexFile(subDir)) {
        results.push(subDir);
      }

      // Continue scanning subdirectories (only if within depth limit)
      walk(subDir, depth + 1);
    }
  }

  walk(baseDir, 1);
  return results;
}

function generatePaths(project: ProjectConfig): Record<string, string[]> {
  const paths: Record<string, string[]> = {
    '@/*': ['./src/*'],
  };

  // Recursively find all directories with index.ts files
  const dirs = findAliasDirectoriesRecursive(project.srcDir);

  // Sort by depth (shallower directories first) so they win for duplicate names
  const sortedDirs = dirs.sort((a, b) => {
    const depthA = a.split(path.sep).length;
    const depthB = b.split(path.sep).length;
    return depthA - depthB;
  });

  for (const dir of sortedDirs) {
    const dirName = path.basename(dir);

    // Skip commonly named directories that would cause conflicts
    if (EXCLUDED_ALIAS_NAMES.has(dirName)) continue;

    const relativePath = './' + path.relative(path.dirname(project.tsconfigPath), dir).replace(/\\/g, '/');

    const aliasKey = `${project.aliasPrefix}${dirName}`;

    // Only add if not already defined (shallower directories win for duplicates)
    if (!paths[aliasKey]) {
      paths[aliasKey] = [relativePath];
      paths[`${aliasKey}/*`] = [`${relativePath}/*`];
    }
  }

  // Sort keys alphabetically
  const sortedPaths: Record<string, string[]> = {};
  for (const key of Object.keys(paths).sort()) {
    sortedPaths[key] = paths[key];
  }

  return sortedPaths;
}

function syncProject(project: ProjectConfig, checkOnly: boolean): { updated: boolean; name: string } {
  const name = path.relative(ROOT, path.dirname(project.tsconfigPath));

  if (!fs.existsSync(project.tsconfigPath)) {
    return { updated: false, name };
  }

  const content = fs.readFileSync(project.tsconfigPath, 'utf-8');
  const tsconfig = JSON.parse(content);

  const currentPaths = tsconfig.compilerOptions?.paths ?? {};
  const expectedPaths = generatePaths(project);

  const currentJson = JSON.stringify(currentPaths, null, 2);
  const expectedJson = JSON.stringify(expectedPaths, null, 2);

  if (currentJson === expectedJson) {
    return { updated: false, name };
  }

  if (checkOnly) {
    return { updated: true, name };
  }

  tsconfig.compilerOptions = tsconfig.compilerOptions ?? {};
  tsconfig.compilerOptions.paths = expectedPaths;

  fs.writeFileSync(project.tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n');
  return { updated: true, name };
}

function syncAll(checkOnly: boolean): boolean {
  const results = PROJECTS.map((p) => syncProject(p, checkOnly));
  const needsUpdate = results.filter((r) => r.updated);

  if (checkOnly) {
    if (needsUpdate.length > 0) {
      log(`\n${String(needsUpdate.length)} project(s) need alias updates:`);
      for (const r of needsUpdate) {
        log(`  - ${r.name}`);
      }
      log('\nRun without --check to update them.');
      return false;
    }
    log('✓ All path aliases are up to date.');
    return true;
  }

  if (needsUpdate.length > 0) {
    log(`\nUpdated ${String(needsUpdate.length)} project(s):`);
    for (const r of needsUpdate) {
      log(`  ✓ ${r.name}`);
    }
  } else {
    log('✓ All path aliases already up to date.');
  }
  return true;
}

function watchMode(): void {
  log('Watching for directory changes...\n');
  syncAll(false);
  log('\n[sync-path-aliases] Watching... (Ctrl+C to stop)\n');

  let timeout: NodeJS.Timeout | null = null;
  const debounce = (): void => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      log('[sync-path-aliases] Change detected, syncing...');
      syncAll(false);
    }, 300);
  };

  for (const project of PROJECTS) {
    for (const scanDir of project.scanDirs) {
      const fullPath = path.join(ROOT, scanDir);
      if (!fs.existsSync(fullPath)) continue;

      fs.watch(fullPath, { recursive: false }, (event, filename) => {
        if (filename && !filename.includes('__tests__')) {
          debounce();
        }
      });
    }
  }
}

function main(): void {
  const checkOnly = process.argv.includes('--check');
  const watchArg = process.argv.includes('--watch');

  if (watchArg) {
    watchMode();
    return;
  }

  log(checkOnly ? 'Checking path aliases...\n' : 'Syncing path aliases...\n');
  const success = syncAll(checkOnly);
  if (!success) process.exit(1);
}

main();
