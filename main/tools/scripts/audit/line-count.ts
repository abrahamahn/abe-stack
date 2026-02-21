// main/tools/scripts/audit/line-count.ts
/**
 * Line Count Audit
 *
 * Counts lines of TypeScript/TSX source code per package,
 * excluding tests, node_modules, dist, build, and coverage.
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';

const MAIN_DIR = resolve('main');
const EXTENSIONS = new Set(['.ts', '.tsx']);
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.turbo']);
const TEST_PATTERN = /\.(test|spec)\.(ts|tsx)$/;

function countLines(filePath: string): number {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let count = 0;
  let inBlockComment = false;

  for (const raw of lines) {
    const line = raw.trim();

    if (inBlockComment) {
      if (line.includes('*/')) inBlockComment = false;
      continue;
    }

    if (line.startsWith('/*')) {
      if (!line.includes('*/')) inBlockComment = true;
      continue;
    }

    // Skip blank lines, single-line comments, and JSDoc-style comments
    if (line === '' || line.startsWith('//') || line.startsWith('*')) continue;

    count++;
  }

  return count;
}

function walkFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full));
    } else if (
      EXTENSIONS.has(extname(entry.name)) &&
      !TEST_PATTERN.test(entry.name) &&
      entry.name !== 'index.ts'
    ) {
      results.push(full);
    }
  }
  return results;
}

interface PackageInfo {
  name: string;
  dir: string;
  lines: number;
}

function findPackages(dir: string): PackageInfo[] {
  const packages: PackageInfo[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (!entry.isDirectory()) continue;
    const pkgJson = join(full, 'package.json');
    try {
      const raw = readFileSync(pkgJson, 'utf-8');
      const parsed = JSON.parse(raw) as { name?: string };
      const srcDir = join(full, 'src');
      const files = existsSync(srcDir) ? walkFiles(srcDir) : [];
      const lines = files.reduce((sum, f) => sum + countLines(f), 0);
      packages.push({ name: parsed.name ?? 'unknown', dir: full, lines });
    } catch {
      packages.push(...findPackages(full));
    }
  }
  return packages;
}

const packages = findPackages(MAIN_DIR).sort((a, b) => b.lines - a.lines);
const maxLabel = Math.max(
  ...packages.map((p) => `${p.name} (${relative(MAIN_DIR, p.dir)})`.length),
);

console.log('Lines of Code by Package (excluding tests, comments, and blank lines):');
console.log('-'.repeat(maxLabel + 12));

let total = 0;
for (const pkg of packages) {
  const label = `${pkg.name} (${relative(MAIN_DIR, pkg.dir)})`;
  console.log(`${label.padEnd(maxLabel)}  : ${pkg.lines}`);
  total += pkg.lines;
}

console.log('-'.repeat(maxLabel + 12));
console.log(
  `Total Source Lines of Code (excluding tests, index.ts, comments, blank lines): ${total}`,
);
