// main/tools/scripts/export/all-config.ts
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../..');

/** Directory names to skip during recursive traversal. */
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.tmp',
  '.turbo',
  'dist',
  'coverage',
  '.cache',
  '.pnpm',
]);

/**
 * Config file base names matched exactly.
 * @complexity O(1) lookup via Set
 */
const CONFIG_BASENAMES = new Set([
  'package.json',
  'turbo.json',
  'pnpm-workspace.yaml',
  '.prettierrc',
  '.prettierignore',
  '.editorconfig',
  '.gitignore',
]);

/**
 * Prefixes for config files matched by startsWith.
 * Captures tsconfig.json, tsconfig.node.json, tsconfig.lint.json, etc.
 */
const CONFIG_PREFIXES = ['tsconfig', '.env'];

/**
 * Regex patterns for config file names that follow naming conventions.
 * Matches: eslint.config.ts, vite.config.ts, vitest.config.ts,
 * vitest.base.ts, vitest.workspace.ts, playwright.config.ts,
 * drizzle.config.ts, etc.
 */
const CONFIG_PATTERN = /^(eslint|vite|vitest|playwright|drizzle)[\w.-]*\.(ts|js|mjs|cjs|json)$/;

/**
 * Determines whether a file name represents a configuration file.
 * @param name - The base file name to check
 * @returns True if the file matches any config pattern
 * @complexity O(p) where p is the number of prefix patterns (constant)
 */
function isConfigFile(name: string): boolean {
  if (CONFIG_BASENAMES.has(name)) {
    return true;
  }

  for (const prefix of CONFIG_PREFIXES) {
    if (name.startsWith(prefix)) {
      return true;
    }
  }

  return CONFIG_PATTERN.test(name);
}

/**
 * Recursively walks a directory and collects config file paths.
 * Skips excluded directories to avoid traversing node_modules, .git, etc.
 * @param dir - The absolute directory path to walk
 * @param relativeTo - The root path for computing relative paths
 * @returns Array of relative config file paths
 * @complexity O(n) where n is the total number of files in the tree
 */
function findConfigFiles(dir: string, relativeTo: string): string[] {
  const results: string[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        results.push(...findConfigFiles(path.join(dir, entry.name), relativeTo));
      }
    } else if (entry.isFile() && isConfigFile(entry.name)) {
      results.push(path.relative(relativeTo, path.join(dir, entry.name)));
    }
  }

  return results;
}

/**
 * Exports all discovered configuration files into a single .tmp/config.txt.
 * Dynamically discovers config files by walking the repository tree,
 * rather than relying on a hardcoded list.
 */
function exportConfig(): void {
  console.log('Exporting monorepo configurations to .tmp/all-config.txt...\n');

  const configFiles = findConfigFiles(REPO_ROOT, REPO_ROOT).sort();

  let output = '';
  let count = 0;

  for (const relativePath of configFiles) {
    const fullPath = path.join(REPO_ROOT, relativePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    output += `\n\n================================================================================\n`;
    output += `FILE: ${relativePath}\n`;
    output += `================================================================================\n\n`;
    output += content;
    output += `\n`;
    count++;
    console.log(`  ${relativePath}`);
  }

  const outputDir = path.join(REPO_ROOT, '.tmp');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, 'all-config.txt');
  fs.writeFileSync(outputPath, output.trim());

  console.log(`\nSuccessfully exported ${count} config files to ${outputPath}`);
}

exportConfig();
