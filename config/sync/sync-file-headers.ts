#!/usr/bin/env node
// config/sync/sync-file-headers.ts
/**
 * Ensures files start with a path header comment.
 *
 * Usage:
 *   pnpm sync:headers          # Sync once
 *   pnpm sync:headers:check    # Check mode
 *   pnpm sync:headers:watch    # Watch mode
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

const SCAN_DIRS = ['apps', 'packages', 'tools', 'config'];
const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.cache',
  '.turbo',
  'dist',
  'build',
  'coverage',
  '.git',
  '__tests__',
]);

const FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.cts', '.mts', '.cjs', '.mjs']);

interface SyncResult {
  path: string;
  status: 'ok' | 'updated' | 'skipped';
}

function shouldSkipDir(dirPath: string): boolean {
  return EXCLUDE_DIRS.has(path.basename(dirPath));
}

function shouldProcessFile(filePath: string): boolean {
  if (!FILE_EXTENSIONS.has(path.extname(filePath))) return false;
  if (filePath.endsWith('.d.ts')) return false;
  return true;
}

function ensureHeader(content: string, header: string): { updated: boolean; next: string } {
  const lines = content.split('\n');
  const headerLine = `// ${header}`;

  if (lines[0]?.startsWith('#!')) {
    if (lines[1] === headerLine) {
      return { updated: false, next: content };
    }
    const nextLines = [...lines];
    if (lines[1]?.startsWith('//')) {
      nextLines[1] = headerLine;
    } else {
      nextLines.splice(1, 0, headerLine);
    }
    return { updated: true, next: nextLines.join('\n') };
  }

  if (lines[0] === headerLine) {
    return { updated: false, next: content };
  }

  const nextLines = [...lines];
  if (lines[0]?.startsWith('//')) {
    nextLines[0] = headerLine;
  } else {
    nextLines.unshift(headerLine);
  }
  return { updated: true, next: nextLines.join('\n') };
}

function syncFile(filePath: string, checkOnly: boolean): SyncResult {
  if (!shouldProcessFile(filePath)) return { path: filePath, status: 'skipped' };

  const relativePath = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf-8');
  const { updated, next } = ensureHeader(content, relativePath);

  if (updated && !checkOnly) {
    fs.writeFileSync(filePath, next);
  }

  return { path: relativePath, status: updated ? 'updated' : 'ok' };
}

function collectFiles(dirPath: string): string[] {
  const files: string[] = [];
  const stack: string[] = [dirPath];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    if (shouldSkipDir(current)) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function syncAll(checkOnly: boolean): { ok: SyncResult[]; updated: SyncResult[] } {
  const results: SyncResult[] = [];
  for (const dir of SCAN_DIRS) {
    const fullPath = path.join(ROOT, dir);
    if (!fs.existsSync(fullPath)) continue;
    for (const file of collectFiles(fullPath)) {
      results.push(syncFile(file, checkOnly));
    }
  }

  return {
    ok: results.filter((r) => r.status === 'ok'),
    updated: results.filter((r) => r.status === 'updated'),
  };
}

function watchFiles(): void {
  log('Watching for file changes...\n');
  syncAll(false);
  log('\n[sync-file-headers] Watching for changes... (Ctrl+C to stop)\n');

  let syncTimeout: NodeJS.Timeout | null = null;
  for (const dir of SCAN_DIRS) {
    const fullPath = path.join(ROOT, dir);
    if (!fs.existsSync(fullPath)) continue;
    const watcher = fs.watch(fullPath, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        const filePath = path.join(fullPath, filename);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const result = syncFile(filePath, false);
          if (result.status === 'updated') {
            log(`[sync-file-headers] Updated: ${result.path}`);
          }
        }
      }, 100);
    });
    watcher.on('error', () => {});
  }
}

function main(): void {
  const checkOnly = process.argv.includes('--check');
  const watch = process.argv.includes('--watch');

  if (watch) {
    watchFiles();
    return;
  }

  log(checkOnly ? 'Checking file headers...\n' : 'Syncing file headers...\n');
  const { ok, updated } = syncAll(checkOnly);

  if (checkOnly) {
    if (updated.length > 0) {
      log(`\n${String(updated.length)} file(s) need header updates:\n`);
      for (const item of updated.slice(0, 10)) {
        log(`  - ${item.path}`);
      }
      if (updated.length > 10) {
        log(`  ... and ${String(updated.length - 10)} more`);
      }
      log('\nRun without --check to update files.');
      process.exit(1);
    }
    log(`✓ All ${String(ok.length)} files have correct headers`);
    return;
  }

  if (updated.length > 0) {
    log(`\nUpdated ${String(updated.length)} file(s):`);
    for (const item of updated.slice(0, 10)) {
      log(`  ✓ ${item.path}`);
    }
    if (updated.length > 10) {
      log(`  ... and ${String(updated.length - 10)} more`);
    }
  }

  log(`\n✓ ${String(ok.length + updated.length)} files synced (${String(updated.length)} updated)`);
}

main();
