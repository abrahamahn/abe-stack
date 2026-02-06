// tools/scripts/export/export-db.ts

import fs from 'fs';
import path from 'path';

// Config
const DB_PACKAGE_ROOT = path.resolve(__dirname, '../../../backend/db');
const EXPORT_FILE = path.resolve(process.cwd(), 'db-code-export.txt');

const IGNORED_DIRS = ['node_modules', 'dist', '.turbo'];
const ALLOWED_EXTS = ['.ts', '.sql', '.json'];

function scanDir(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);

  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORED_DIRS.includes(file)) {
        results.push(...scanDir(fullPath));
      }
    } else {
      const ext = path.extname(file);
      if (ALLOWED_EXTS.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function run() {
  console.log(`Scanning ${DB_PACKAGE_ROOT}...`);
  const files = scanDir(DB_PACKAGE_ROOT);

  let output = '';

  for (const file of files) {
    // format: backend/db/...
    const relPath = path.relative(path.resolve(__dirname, '../../..'), file);

    // Only include files actually in backend/db (sanity check)
    if (!relPath.startsWith('backend/db')) continue;

    const content = fs.readFileSync(file, 'utf-8');

    output += `\n---\npath: ${relPath}\n---\n`;
    output += content;
    output += '\n';
  }

  fs.writeFileSync(EXPORT_FILE, output);
  console.log(`Exported ${files.length} files to ${EXPORT_FILE}`);
}

run();
