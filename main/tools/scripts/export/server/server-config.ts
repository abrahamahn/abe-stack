// main/tools/scripts/export/server/server-config.ts
/**
 * Server Configuration Exporter
 *
 * Exports all non-test .ts files from config directories:
 *   - main/apps/server/src/config
 *   - main/server/system/src/config
 *   - main/shared/src/config
 *   - config/env/*.example
 *
 * No import resolution — only files physically inside these directories.
 *
 * @usage pnpm export:server-config
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');

const CONFIG_TARGETS = [
  {
    label: 'apps/server',
    dir: path.join(REPO_ROOT, 'main', 'apps', 'server', 'src', 'config'),
  },
  {
    label: 'server-system',
    dir: path.join(REPO_ROOT, 'main', 'server', 'system', 'src', 'config'),
  },
  {
    label: 'shared',
    dir: path.join(REPO_ROOT, 'main', 'shared', 'src', 'config'),
  },
] as const;

const ENV_EXAMPLE_DIR = path.join(REPO_ROOT, 'config', 'env');

const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo']);

/**
 * Recursively collects all non-test .ts files from a directory.
 * @param dirPath - Absolute directory path
 * @returns Array of absolute file paths
 */
function collectTsFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];

  const files: string[] = [];

  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        files.push(full);
      }
    }
  }

  walk(dirPath);
  return files;
}

/**
 * Collects all .example files from a directory (non-recursive).
 * @param dirPath - Absolute directory path
 * @returns Array of absolute file paths
 */
function collectExampleFiles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.example'))
    .map((e) => path.join(dirPath, e.name));
}

function exportServerConfig(): void {
  console.log('Exporting server config files...\n');

  const allFiles: string[] = [];

  for (const target of CONFIG_TARGETS) {
    if (!fs.existsSync(target.dir)) {
      console.log(`  - ${target.label}/src/config: not found`);
      continue;
    }
    const files = collectTsFiles(target.dir);
    allFiles.push(...files);
    console.log(`  ${target.label}: ${String(files.length)} files`);
  }

  const envExamples = collectExampleFiles(ENV_EXAMPLE_DIR);
  allFiles.push(...envExamples);
  console.log(`  config/env: ${String(envExamples.length)} .example files`);

  const sorted = allFiles.map((f) => path.relative(REPO_ROOT, f)).sort();

  let output = '';
  output += '# BSLT - Server Configuration Export\n\n';
  output += `Generated: ${new Date().toISOString()}\n`;
  output += `Files: ${String(sorted.length)}\n\n`;
  output += '---\n\n';

  for (const rel of sorted) {
    const content = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf-8');
    output += `\n================================================================================\n`;
    output += `FILE: ${rel}\n`;
    output += `================================================================================\n\n`;
    output += content;
    output += `\n`;
  }

  const outputDir = path.join(REPO_ROOT, '.tmp');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, 'server-config.txt');
  fs.writeFileSync(outputPath, output.trim());

  console.log(`\nExported ${String(sorted.length)} files to ${outputPath}`);
}

exportServerConfig();
