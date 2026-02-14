// main/tools/scripts/export/server/server-engine.ts
/**
 * Server Engine Package Code Exporter
 *
 * Exports all source code from main/server/engine into a single file
 * for code review or AI context. Excludes test files and build artifacts.
 *
 * @usage pnpm tsx main/tools/scripts/export/server/server-engine.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..', '..', '..', '..');
const packagePath = path.join(root, 'src', 'server', 'engine');
const outputDir = path.join(root, '.tmp');
const outputPath = path.join(outputDir, 'server-engine.txt');

const excludedDirs = new Set<string>([
  'node_modules',
  'dist',
  'build',
  '.turbo',
  '__tests__',
  'coverage',
]);

const extensionWhitelist = new Set<string>([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.yaml',
  '.yml',
  '.sql',
]);

/**
 * Checks if a file or its path indicates it's a test file.
 * @param filename - The file name to check
 * @param relPath - The relative path from the package root
 * @returns True if the file is a test file
 */
const isTestFile = (filename: string, relPath: string): boolean => {
  if (filename.includes('.test.') || filename.includes('.spec.')) return true;
  if (
    relPath
      .split(path.sep)
      .some((part) => part === 'test' || part === 'tests' || part === '__tests__')
  )
    return true;
  return false;
};

/**
 * Recursively lists all relevant files in a directory.
 * @param dir - The absolute directory path to scan
 * @param base - The relative path accumulator for recursion
 * @returns Array of relative file paths matching the whitelist
 * @complexity O(n) where n is the total number of filesystem entries
 */
const listFiles = (dir: string, base = ''): string[] => {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (excludedDirs.has(entry.name)) continue;

    const rel = path.join(base, entry.name);
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFiles(full, rel));
    } else {
      if (isTestFile(entry.name, rel)) continue;
      const ext = path.extname(entry.name);
      if (extensionWhitelist.has(ext)) {
        files.push(rel);
      }
    }
  }

  return files;
};

/**
 * Exports all source files from main/server/engine into .tmp/server-engine.txt.
 * Excludes test files, node_modules, dist, and other build artifacts.
 */
const run = (): void => {
  console.log('Exporting @abe-stack/server-engine source code...');

  if (!fs.existsSync(packagePath)) {
    console.error(`Error: ${packagePath} does not exist.`);
    process.exit(1);
  }

  const allFiles = listFiles(packagePath);
  allFiles.sort();

  let output = '';
  output += '================================================================================\n';
  output += 'ABE STACK - SERVER ENGINE PACKAGE SOURCE CODE EXPORT\n';
  output += `Generated: ${new Date().toISOString()}\n`;
  output += `Total Files: ${String(allFiles.length)}\n`;
  output += '================================================================================\n\n';

  let exportedCount = 0;

  for (const relPath of allFiles) {
    const fullPath = path.join(packagePath, relPath);
    const displayPath = path.join('src', 'server', 'engine', relPath);

    try {
      const content = fs.readFileSync(fullPath, 'utf8');

      output +=
        '--------------------------------------------------------------------------------\n';
      output += `FILE: ${displayPath}\n`;
      output +=
        '--------------------------------------------------------------------------------\n';
      output += content;
      if (!content.endsWith('\n')) {
        output += '\n';
      }
      output += '\n';

      exportedCount++;
    } catch (error) {
      console.error(`Error reading ${displayPath}: ${(error as Error).message}`);
    }
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, output, 'utf8');

  console.log(`\n✅ Server engine code exported to ${outputPath}`);
  console.log(`   Files included: ${String(exportedCount)}`);
  console.log(`   Total size: ${(output.length / 1024).toFixed(2)} KB`);
};

run();
