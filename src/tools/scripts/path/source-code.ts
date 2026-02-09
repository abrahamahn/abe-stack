// src/tools/scripts/path/source-code.ts
/**
 * Exports package source code paths to .tmp/PATH-source-code.md
 * Includes: src/... .ts(x) (excluding tests) + config files (tsconfig, package.json, eslint, etc.)
 * @module tools/scripts/path/source-code
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../..');

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.turbo',
  '.next',
  '.cache',
  '.tmp',
  '.pnpm-store',
]);

const INCLUDED_EXTENSIONS = new Set(['.ts', '.tsx']);

const CONFIG_FILE_EXACT = new Set([
  'package.json',
  'pnpm-workspace.yaml',
  'turbo.json',
  'tsconfig.json',
  'eslint.config.ts',
  'eslint.config.js',
  'vitest.config.ts',
  'vitest.config.js',
  'vite.config.ts',
  'vite.config.js',
  'jest.config.ts',
  'jest.config.js',
  '.prettierrc',
  '.prettierignore',
  '.editorconfig',
  '.nvmrc',
]);

const CONFIG_FILE_PATTERNS = [/^tsconfig\..*\.json$/, /^eslint\.config\./, /^prettier\.config\./];

function isConfigFile(fileName: string): boolean {
  if (CONFIG_FILE_EXACT.has(fileName)) return true;
  return CONFIG_FILE_PATTERNS.some((pattern) => pattern.test(fileName));
}

function isTestPath(relativePath: string): boolean {
  const lowerPath = relativePath.toLowerCase();
  if (/\.(test|spec)\.(ts|tsx)$/.test(lowerPath)) return true;

  const segments = lowerPath.split(path.sep);
  return segments.includes('__tests__') || segments.includes('tests') || segments.includes('test');
}

function walkDir(
  dir: string,
  files: { src: string[]; config: string[] },
): { src: string[]; config: string[] } {
  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(REPO_ROOT, fullPath);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        walkDir(fullPath, files);
      }
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name);
    if (isConfigFile(entry.name)) {
      files.config.push(relativePath);
      continue;
    }

    if (!INCLUDED_EXTENSIONS.has(ext)) continue;
    if (!relativePath.includes(`${path.sep}src${path.sep}`)) continue;
    if (isTestPath(relativePath)) continue;

    files.src.push(relativePath);
  }

  return files;
}

/**
 * Groups files by their top-level package directory
 * @param files - Array of file paths relative to REPO_ROOT
 * @returns Map of group key to files
 * @complexity O(n) where n is number of files
 */
function groupByTopLevel(files: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const file of files) {
    const parts = file.split(path.sep);
    let key = 'Other';

    if (parts.length === 1) {
      key = 'Root';
    } else if (parts[0] === 'src' && parts.length >= 3) {
      // src/shared/... → 'src/shared', src/apps/web/... → 'src/apps/web'
      key =
        parts[1] === 'shared' || parts[1] === 'tools'
          ? `src/${parts[1]}`
          : `src/${parts[1]}/${parts[2]}`;
    } else if (parts[0] === 'docs' || parts[0] === 'infra' || parts[0] === 'config') {
      key = parts[0];
    } else {
      key = parts[0];
    }

    const existing = groups.get(key) ?? [];
    existing.push(file);
    groups.set(key, existing);
  }

  return groups;
}

function exportSourceCodePaths(): void {
  console.log('🧭 Scanning packages for src .ts/.tsx files...');

  let output = '# Package Source Code Paths\n';
  output += '\n> Includes **/src/**/*.ts(x) (excluding tests) and config files\n';
  let count = 0;

  const collected = walkDir(REPO_ROOT, { src: [], config: [] });
  collected.src.sort();
  collected.config.sort();

  const configGroups = groupByTopLevel(collected.config);
  const configKeys = Array.from(configGroups.keys()).sort();
  if (configKeys.length > 0) {
    for (const key of configKeys) {
      const files = configGroups.get(key);
      if (!files || files.length === 0) continue;

      output += `\n## ${key} Config\n`;
      for (const file of files.sort()) {
        output += `- [ ] ${file}\n`;
        count += 1;
      }
    }
  }

  const sourceGroups = groupByTopLevel(collected.src);
  const sourceKeys = Array.from(sourceGroups.keys()).sort();
  for (const key of sourceKeys) {
    const files = sourceGroups.get(key);
    if (!files || files.length === 0) continue;

    output += `\n## ${key}\n`;
    for (const file of files.sort()) {
      output += `- [ ] ${file}\n`;
      count += 1;
    }
  }

  const outputDir = path.join(REPO_ROOT, '.tmp');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'PATH-source-code.md');
  fs.writeFileSync(outputPath, output.trim() + '\n');

  console.log(`✅ Exported ${count} paths to ${outputPath}`);
}

exportSourceCodePaths();
