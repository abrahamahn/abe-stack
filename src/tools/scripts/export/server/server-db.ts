// src/tools/scripts/export/server/server-db.ts
/**
 * Database Package Code Exporter
 *
 * Exports all source code from src/server/db (schema, migrations, repositories)
 * into a single file for code review or AI context.
 *
 * @usage pnpm tsx src/tools/scripts/export/server/server-db.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const DB_PACKAGE_ROOT = path.join(REPO_ROOT, 'src', 'server', 'db');
const OUTPUT_DIR = path.join(REPO_ROOT, '.tmp');
const EXPORT_FILE = path.join(OUTPUT_DIR, 'server-db.txt');

const IGNORED_DIRS = new Set(['node_modules', 'dist', '.turbo']);
const ALLOWED_EXTS = new Set(['.ts', '.sql', '.json']);

/**
 * Recursively scans a directory for files matching allowed extensions.
 * @param dir - Absolute directory path to scan
 * @returns Array of absolute file paths
 * @complexity O(n) where n is total entries in tree
 */
function scanDir(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);

  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORED_DIRS.has(file)) {
        results.push(...scanDir(fullPath));
      }
    } else {
      const ext = path.extname(file);
      if (ALLOWED_EXTS.has(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

/**
 * Main export function. Scans db package and writes concatenated output.
 */
function run(): void {
  console.log(`Scanning ${DB_PACKAGE_ROOT}...`);
  const files = scanDir(DB_PACKAGE_ROOT);

  let output = '';

  for (const file of files) {
    const relPath = path.relative(REPO_ROOT, file);

    // Only include files actually in src/server/db (sanity check)
    if (!relPath.startsWith(path.join('src', 'server', 'db'))) continue;

    const content = fs.readFileSync(file, 'utf-8');

    output += `\n---\npath: ${relPath}\n---\n`;
    output += content;
    output += '\n';
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(EXPORT_FILE, output);
  console.log(`Exported ${String(files.length)} files to ${EXPORT_FILE}`);
}

run();
