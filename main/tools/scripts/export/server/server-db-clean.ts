// main/tools/scripts/export/server/server-db-clean.ts
/**
 * DB Package Code Exporter
 *
 * Exports all source code from main/server/db with comments stripped,
 * excluding test files. Output written to the repo root as server-db.txt.
 *
 * @usage pnpm tsx main/tools/scripts/export/server/server-db-clean.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const PACKAGE_SRC = path.join(REPO_ROOT, 'main', 'server', 'db', 'src');
const OUTPUT_FILE = path.join(REPO_ROOT, 'server-db.txt');

const EXCLUDED_DIRS = new Set(['node_modules', 'dist', '.turbo', '__tests__', 'coverage']);
const EXCLUDED_FILE_PATTERNS = [/\.test\.(ts|tsx)$/, /\.spec\.(ts|tsx)$/, /\.d\.ts$/];

/**
 * Strips TypeScript/JavaScript comments from source code while preserving
 * string literal contents and overall structure. Handles single-line (//),
 * block (/* *\/), and JSDoc (/** *\/) comments.
 *
 * @param content - Raw source file content
 * @returns Source with all comments removed and excessive blank lines collapsed
 * @complexity O(n) where n is content length
 */
function stripComments(content: string): string {
  let result = '';
  let i = 0;
  const len = content.length;

  while (i < len) {
    const ch = content[i];
    const next = i + 1 < len ? content[i + 1] : '';

    // String literal — skip entire contents to avoid false comment matches
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      result += ch;
      i++;
      while (i < len) {
        const sc = content[i];
        if (sc === '\\' && i + 1 < len) {
          result += sc + content[i + 1];
          i += 2;
          continue;
        }
        result += sc;
        i++;
        if (sc === quote) break;
      }
      continue;
    }

    // Block comment — preserve newlines to maintain line structure
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < len) {
        if (content[i] === '*' && i + 1 < len && content[i + 1] === '/') {
          i += 2;
          break;
        }
        if (content[i] === '\n') result += '\n';
        i++;
      }
      continue;
    }

    // Line comment — skip to end of line
    if (ch === '/' && next === '/') {
      i += 2;
      while (i < len && content[i] !== '\n') i++;
      continue;
    }

    result += ch;
    i++;
  }

  // Collapse 3+ consecutive newlines to 2, trim trailing whitespace per line
  return result
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Recursively collects .ts source files, excluding tests and build artifacts.
 * @param dir - Absolute directory to scan
 * @param base - Relative path accumulator
 * @returns Sorted array of relative file paths
 * @complexity O(n) where n is total filesystem entries
 */
function collectFiles(dir: string, base = ''): string[] {
  if (!fs.existsSync(dir)) return [];

  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;

    const rel = path.join(base, entry.name);
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectFiles(full, rel));
    } else if (
      path.extname(entry.name) === '.ts' &&
      !EXCLUDED_FILE_PATTERNS.some((p) => p.test(entry.name))
    ) {
      files.push(rel);
    }
  }

  return files.sort();
}

function run(): void {
  console.log(`Scanning ${PACKAGE_SRC}...`);

  if (!fs.existsSync(PACKAGE_SRC)) {
    console.error(`Error: ${PACKAGE_SRC} does not exist.`);
    process.exit(1);
  }

  const files = collectFiles(PACKAGE_SRC);

  let output = '';
  output += '================================================================================\n';
  output += 'ABE STACK — SERVER DB SOURCE CODE EXPORT (COMMENTS STRIPPED)\n';
  output += `Generated: ${new Date().toISOString()}\n`;
  output += `Source: main/server/db/src\n`;
  output += `Total Files: ${String(files.length)}\n`;
  output += '================================================================================\n\n';

  for (const relPath of files) {
    const fullPath = path.join(PACKAGE_SRC, relPath);
    const displayPath = path.join('main', 'server', 'db', 'src', relPath);

    try {
      const raw = fs.readFileSync(fullPath, 'utf8');
      const stripped = stripComments(raw);

      output += '--------------------------------------------------------------------------------\n';
      output += `FILE: ${displayPath}\n`;
      output += '--------------------------------------------------------------------------------\n';
      output += stripped;
      output += '\n\n';
    } catch (err) {
      console.error(`Error reading ${displayPath}: ${(err as Error).message}`);
    }
  }

  fs.writeFileSync(OUTPUT_FILE, output, 'utf8');

  console.log(`\n✅ Exported ${String(files.length)} files to ${OUTPUT_FILE}`);
  console.log(`   Output size: ${(output.length / 1024).toFixed(2)} KB`);
}

run();
