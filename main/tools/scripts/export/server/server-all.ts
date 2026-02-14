// main/tools/scripts/export/server/server-all.ts
/**
 * Server Packages Code Exporter
 *
 * Exports all source code from main/server/* (core, db, engine, media, realtime, websocket)
 * into a single file for code review or AI context. Excludes test files.
 *
 * @usage pnpm tsx main/tools/scripts/export/server/server-all.ts
 * @usage pnpm tsx main/tools/scripts/export/server/server-all.ts --verbose
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..', '..', '..', '..', '..');
const serverRoot = path.join(root, 'src', 'server');
const outputDir = path.join(root, '.tmp');
const outputPath = path.join(outputDir, 'server-all.txt');

/** Server sub-packages to export in order */
const SERVER_PACKAGES = ['core', 'db', 'engine', 'media', 'realtime', 'websocket'] as const;

const excludedDirs = new Set<string>([
  'node_modules',
  '.git',
  'dist',
  '__tests__',
  '.turbo',
  'coverage',
]);

const excludedFilePatterns: RegExp[] = [
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
  /\.d\.ts$/,
  /\.map$/,
];

const sourceExtensions = new Set<string>(['.ts', '.tsx', '.js', '.jsx', '.sql', '.json']);

/**
 * Checks if a filename matches an excluded pattern.
 * @param filename - The filename to check
 * @returns True if the file should be excluded
 * @complexity O(p) where p is the number of exclusion patterns
 */
const shouldExcludeFile = (filename: string): boolean =>
  excludedFilePatterns.some((pattern) => pattern.test(filename));

/**
 * Checks if a file has a source-code extension.
 * @param filename - The filename to check
 * @returns True if the file is a source file
 * @complexity O(1) via Set lookup
 */
const isSourceFile = (filename: string): boolean => {
  const ext = path.extname(filename);
  return sourceExtensions.has(ext);
};

/**
 * Recursively lists source files in a directory, excluding tests and build artifacts.
 * @param dir - Absolute directory path to scan
 * @param base - Relative path accumulator for recursion
 * @returns Array of relative file paths
 * @complexity O(n) where n is total filesystem entries
 */
const listFiles = (dir: string, base = ''): string[] => {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (excludedDirs.has(entry.name)) continue;

    const rel = path.join(base, entry.name);
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFiles(full, rel));
    } else if (isSourceFile(entry.name) && !shouldExcludeFile(entry.name)) {
      files.push(rel);
    }
  }

  return files;
};

/**
 * Exports all server package source code to .tmp/server-all.txt.
 * Iterates through each server sub-package and concatenates their source files.
 */
const run = (): void => {
  console.log('Exporting all server package source code...\n');

  if (!fs.existsSync(serverRoot)) {
    console.error(`Error: Server root not found: ${serverRoot}`);
    process.exit(1);
  }

  let output = '';
  let totalFiles = 0;
  const packageStats: Array<{ name: string; count: number }> = [];

  output += '# ABE Stack - Server Packages Source Code Export\n\n';
  output += `Generated: ${new Date().toISOString()}\n`;
  output += `Source: main/server/ (${SERVER_PACKAGES.join(', ')})\n\n`;
  output += '---\n\n';

  for (const pkg of SERVER_PACKAGES) {
    const pkgDir = path.join(serverRoot, pkg);
    if (!fs.existsSync(pkgDir)) {
      console.log(`  ⚠ Skipping ${pkg} (directory not found)`);
      continue;
    }

    const files = listFiles(pkgDir);
    files.sort();

    if (files.length === 0) {
      console.log(`  ⚠ Skipping ${pkg} (no source files)`);
      continue;
    }

    output += `## ${pkg}\n\n`;

    for (const file of files) {
      const fullPath = path.join(pkgDir, file);
      const relativePath = path.join('src', 'server', pkg, file);

      output += `### ${relativePath}\n\n`;

      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        const ext = path.extname(file).slice(1) || 'txt';
        output += `\`\`\`${ext}\n`;
        output += content;
        if (!content.endsWith('\n')) {
          output += '\n';
        }
        output += '```\n\n';
      } catch (error) {
        output += '```\n';
        output += `(ERROR READING FILE: ${(error as Error).message})\n`;
        output += '```\n\n';
      }
    }

    output += '---\n\n';
    totalFiles += files.length;
    packageStats.push({ name: pkg, count: files.length });
    console.log(`  ✓ ${pkg}: ${String(files.length)} files`);
  }

  output += '## Statistics\n\n';
  output += '```\n';
  for (const stat of packageStats) {
    output += `  ${stat.name.padEnd(12)} ${String(stat.count).padStart(5)} files\n`;
  }
  output += `  ${'─'.repeat(20)}\n`;
  output += `  ${'Total'.padEnd(12)} ${String(totalFiles).padStart(5)} files\n`;
  output += `Output size: ${(output.length / 1024).toFixed(2)} KB\n`;
  output += '```\n';

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(outputPath, output, 'utf8');

  console.log(`\n✅ Server code exported to ${outputPath}`);
  console.log(`   Total files: ${String(totalFiles)}`);
  console.log(`   Output size: ${(output.length / 1024).toFixed(2)} KB`);
};

const entryArg = process.argv[1];
const isMain = entryArg !== undefined && import.meta.url === pathToFileURL(entryArg).href;

if (isMain) {
  run();
}
