#!/usr/bin/env tsx
// src/tools/sync/sync-file-headers.ts
/**
 * Ensures files start with a path header comment.
 *
 * Usage:
 *   pnpm sync:headers          # Sync once
 *   pnpm sync:headers:check    # Check mode
 *   pnpm sync:headers:watch    # Watch mode
 */
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  watch as fsWatch,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, extname, join, relative, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');

const isQuiet = process.argv.includes('--quiet');
function log(...args: unknown[]): void {
  if (!isQuiet) console.log(...args);
}

const SCAN_DIRS = ['src'];
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
  return EXCLUDE_DIRS.has(basename(dirPath));
}

function shouldProcessFile(filePath: string): boolean {
  if (!FILE_EXTENSIONS.has(extname(filePath))) return false;
  if (filePath.endsWith('.d.ts')) return false;
  return true;
}

function ensureHeader(content: string, header: string): { updated: boolean; next: string } {
  const lines = content.split('\n');
  const headerLine = `// ${header}`;

  if (lines[0]?.startsWith('#!') ?? false) {
    if (lines[1] === headerLine) {
      return { updated: false, next: content };
    }
    const nextLines = [...lines];
    if (lines[1]?.startsWith('//') ?? false) {
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
  if (lines[0]?.startsWith('//') ?? false) {
    nextLines[0] = headerLine;
  } else {
    nextLines.unshift(headerLine);
  }
  return { updated: true, next: nextLines.join('\n') };
}

function syncFile(filePath: string, checkOnly: boolean): SyncResult {
  if (!shouldProcessFile(filePath)) return { path: filePath, status: 'skipped' };

  const relativePath = relative(ROOT, filePath).replace(/\\/g, '/');
  const content = readFileSync(filePath, 'utf-8');
  const { updated, next } = ensureHeader(content, relativePath);

  if (updated && !checkOnly) {
    writeFileSync(filePath, next);
  }

  return { path: relativePath, status: updated ? 'updated' : 'ok' };
}

function collectFiles(dirPath: string): string[] {
  const files: string[] = [];
  const stack: string[] = [dirPath];

  while (stack.length > 0) {
    const current = stack.pop();
    if (typeof current !== 'string') continue;
    if (shouldSkipDir(current)) continue;
    const entries = readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
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
    const fullPath = join(ROOT, dir);
    if (!existsSync(fullPath)) continue;
    for (const file of collectFiles(fullPath)) {
      results.push(syncFile(file, checkOnly));
    }
  }

  return {
    ok: results.filter((r) => r.status === 'ok'),
    updated: results.filter((r) => r.status === 'updated'),
  };
}

function getStagedFiles(): string[] {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACMR', {
      cwd: ROOT,
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    return output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '')
      .map((relativePath) => join(ROOT, relativePath))
      .filter((fullPath) => existsSync(fullPath) && statSync(fullPath).isFile());
  } catch {
    return [];
  }
}

function syncFiles(
  files: string[],
  checkOnly: boolean,
): { ok: SyncResult[]; updated: SyncResult[] } {
  const results: SyncResult[] = [];
  for (const file of files) {
    results.push(syncFile(file, checkOnly));
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
    const fullPath = join(ROOT, dir);
    if (!existsSync(fullPath)) continue;
    const watcher = fsWatch(fullPath, { recursive: true }, (_event, filename) => {
      if (typeof filename !== 'string' || filename === '') return;
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        const filePath = join(fullPath, filename);
        if (existsSync(filePath) && statSync(filePath).isFile()) {
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
  const stagedOnly = process.argv.includes('--staged');

  if (watch) {
    watchFiles();
    return;
  }

  log(checkOnly ? 'Checking file headers...\n' : 'Syncing file headers...\n');
  const { ok, updated } = stagedOnly ? syncFiles(getStagedFiles(), checkOnly) : syncAll(checkOnly);

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

  if (stagedOnly && !checkOnly && updated.length > 0) {
    const filesToStage = updated.map((item) => `"${item.path}"`).join(' ');
    execSync(`git add ${filesToStage}`, { cwd: ROOT, stdio: 'pipe' });
  }

  log(`\n✓ ${String(ok.length + updated.length)} files synced (${String(updated.length)} updated)`);
}

main();
