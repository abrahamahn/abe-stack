#!/usr/bin/env node
// config/lint/sync-test-folders.ts
/**
 * Creates missing __tests__ folders in code directories.
 *
 * Usage:
 *   pnpm sync:tests          # Sync once
 *   pnpm sync:tests:check    # Check mode
 *   pnpm sync:tests:watch    # Watch mode
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

const SCAN_ROOTS = ['apps', 'packages'];
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '__tests__',
  '.cache',
  '.turbo',
  'dist',
  'build',
  'coverage',
  '.git',
]);

const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.cts', '.mts', '.mjs', '.cjs']);

interface DirectoryCheck {
  path: string;
  hasTests: boolean;
}

function shouldSkipDir(dirPath: string): boolean {
  if (EXCLUDED_DIRS.has(path.basename(dirPath))) return true;
  if (dirPath.includes(`${path.sep}src${path.sep}test`)) return true;
  if (dirPath.includes(`${path.sep}src${path.sep}tests`)) return true;
  return false;
}

function isBarrelFile(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let inMultiLineExport = false;
  let inMultiLineImport = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip comments
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

    // Handle multi-line exports
    if (inMultiLineExport) {
      if (trimmed.includes('}')) {
        inMultiLineExport = false;
      }
      continue;
    }

    // Handle multi-line imports
    if (inMultiLineImport) {
      if (trimmed.includes('}')) {
        inMultiLineImport = false;
      }
      continue;
    }

    // Re-exports: export { ... } from '...' or export * from '...'
    if (/^export\s+(type\s+)?\{[^}]*\}\s+from\s+['"]/.test(trimmed)) continue;
    if (/^export\s+(type\s+)?\*\s+from\s+['"]/.test(trimmed)) continue;

    // Multi-line re-export starting
    if (/^export\s+(type\s+)?\{/.test(trimmed) && !trimmed.includes('}')) {
      inMultiLineExport = true;
      continue;
    }

    // Import statements (barrels can import for re-export)
    if (/^import\s+/.test(trimmed)) {
      if (trimmed.includes('{') && !trimmed.includes('}')) {
        inMultiLineImport = true;
      }
      continue;
    }

    // Any other code means this is not a barrel-only file
    return false;
  }

  return true;
}

function directoryHasCode(dirPath: string): boolean {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const fileEntries = entries.filter((entry) => entry.isFile());

  if (fileEntries.length === 0) return false;

  const codeFiles = fileEntries.filter((entry) => {
    const ext = path.extname(entry.name);
    if (!CODE_EXTENSIONS.has(ext)) return false;
    if (entry.name.endsWith('.d.ts')) return false;
    if (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx')) return false;
    if (entry.name.endsWith('.spec.ts') || entry.name.endsWith('.spec.tsx')) return false;
    return true;
  });

  if (codeFiles.length === 0) return false;

  if (codeFiles.length === 1 && codeFiles[0].name.startsWith('index.')) {
    const indexPath = path.join(dirPath, codeFiles[0].name);
    return !isBarrelFile(indexPath);
  }

  return true;
}

function findCodeDirectories(): string[] {
  const results: string[] = [];
  for (const root of SCAN_ROOTS) {
    const basePath = path.join(ROOT, root);
    if (!fs.existsSync(basePath)) continue;
    const stack: string[] = [basePath];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;
      if (shouldSkipDir(current)) continue;
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          stack.push(path.join(current, entry.name));
        }
      }
      if (current.includes(`${path.sep}src${path.sep}`)) {
        if (directoryHasCode(current)) {
          results.push(current);
        }
      }
    }
  }
  return results;
}

function ensureTestFolder(dirPath: string, checkOnly: boolean): DirectoryCheck {
  const testDir = path.join(dirPath, '__tests__');
  const hasTests = fs.existsSync(testDir);
  if (!hasTests && !checkOnly) {
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, '.gitkeep'), '');
  }
  return { path: dirPath, hasTests };
}

function syncAll(checkOnly: boolean): { created: DirectoryCheck[]; ok: DirectoryCheck[] } {
  const created: DirectoryCheck[] = [];
  const ok: DirectoryCheck[] = [];
  for (const dirPath of findCodeDirectories()) {
    const result = ensureTestFolder(dirPath, checkOnly);
    if (result.hasTests) {
      ok.push(result);
    } else {
      created.push(result);
    }
  }
  return { created, ok };
}

function watchDirectories(): void {
  log('Watching for directory changes...\n');
  syncAll(false);
  log('\n[sync-test-folders] Watching for changes... (Ctrl+C to stop)\n');

  let syncTimeout: NodeJS.Timeout | null = null;
  for (const root of SCAN_ROOTS) {
    const basePath = path.join(ROOT, root);
    if (!fs.existsSync(basePath)) continue;
    const watcher = fs.watch(basePath, { recursive: true }, () => {
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        log('\n[sync-test-folders] Directory change detected, checking...');
        syncAll(false);
      }, 500);
    });
    watcher.on('error', () => {});
  }
}

function main(): void {
  const checkOnly = process.argv.includes('--check');
  const watch = process.argv.includes('--watch');

  if (watch) {
    watchDirectories();
    return;
  }

  log(
    checkOnly
      ? 'Checking for missing __tests__ folders...\n'
      : 'Creating missing __tests__ folders...\n',
  );
  const { created, ok } = syncAll(checkOnly);

  if (checkOnly) {
    if (created.length > 0) {
      log(`\n${String(created.length)} directories need __tests__ folders:\n`);
      for (const item of created.slice(0, 20)) {
        log(`  - ${path.relative(ROOT, item.path).replace(/\\/g, '/')}`);
      }
      if (created.length > 20) {
        log(`  ... and ${String(created.length - 20)} more`);
      }
      log('\nRun without --check to create them.');
      process.exit(1);
    }
    log('✓ All code directories have __tests__ folders');
    return;
  }

  if (created.length > 0) {
    log(`\nCreated __tests__ folders in ${String(created.length)} directories:`);
    for (const item of created.slice(0, 20)) {
      log(`  ✓ ${path.relative(ROOT, item.path).replace(/\\/g, '/')}/__tests__/`);
    }
    if (created.length > 20) {
      log(`  ... and ${String(created.length - 20)} more`);
    }
  } else {
    log('✓ All code directories already have __tests__ folders');
  }

  log(`\n✓ ${String(ok.length + created.length)} directories checked`);
}

main();
