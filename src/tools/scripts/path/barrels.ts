// src/tools/scripts/path/barrels.ts
/**
 * Exports barrel export files (index.ts) to .tmp/PATH-barrels.md
 * @module tools/scripts/path/barrels
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../..');

/** Directories to exclude from scanning */
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
  '.config',
  '.github',
]);

/**
 * Recursively walks a directory and collects index.ts files
 * @param dir - Directory to walk
 * @param files - Accumulator for found files
 * @returns Array of relative file paths
 */
function walkDir(dir: string, files: string[] = []): string[] {
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
    } else if (entry.isFile() && entry.name === 'index.ts') {
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Groups files by their package directory under src/
 * @param files - Array of file paths relative to REPO_ROOT
 * @returns Map of group key to files
 * @complexity O(n) where n is number of files
 */
function groupByPackage(files: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const file of files) {
    const parts = file.split('/');
    let groupKey: string;

    if (parts[0] === 'src' && parts.length >= 3) {
      groupKey =
        parts[1] === 'shared' || parts[1] === 'tools'
          ? `src/${parts[1]}`
          : `src/${parts[1]}/${parts[2]}`;
    } else if (parts[0] === 'docs' || parts[0] === 'infra') {
      groupKey = parts[0];
    } else {
      groupKey = 'Other';
    }

    const existing = groups.get(groupKey) ?? [];
    existing.push(file);
    groups.set(groupKey, existing);
  }

  return groups;
}

/**
 * Exports barrel export files to PATH-barrels.md
 */
function exportBarrelFiles(): void {
  console.log('📦 Scanning for barrel export files (index.ts)...');

  const indexFiles = walkDir(REPO_ROOT);
  indexFiles.sort();

  const grouped = groupByPackage(indexFiles);

  // Define section order (hexagonal: shared → server → client → apps)
  const sectionOrder = [
    'src/shared',
    'src/server/core',
    'src/server/db',
    'src/server/engine',
    'src/server/media',
    'src/server/realtime',
    'src/server/websocket',
    'src/client/api',
    'src/client/engine',
    'src/client/react',
    'src/client/ui',
    'src/apps/desktop',
    'src/apps/server',
    'src/apps/web',
    'src/apps/storybook',
    'src/tools',
  ];

  let output = '# Barrel Exports (index.ts)\n';
  let count = 0;

  // Output files in defined order
  for (const section of sectionOrder) {
    const files = grouped.get(section);
    if (files && files.length > 0) {
      output += `\n## ${section}\n`;
      for (const file of files.sort()) {
        output += `- [ ] ${file}\n`;
        count++;
      }
      grouped.delete(section);
    }
  }

  // Output remaining files
  const remainingKeys = Array.from(grouped.keys()).sort();
  for (const key of remainingKeys) {
    const files = grouped.get(key);
    if (files && files.length > 0) {
      output += `\n## ${key}\n`;
      for (const file of files.sort()) {
        output += `- [ ] ${file}\n`;
        count++;
      }
    }
  }

  // Ensure .tmp directory exists
  const outputDir = path.join(REPO_ROOT, '.tmp');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'PATH-barrels.md');
  fs.writeFileSync(outputPath, output.trim() + '\n');

  console.log(`✅ Exported ${count} barrel files to ${outputPath}`);
}

exportBarrelFiles();
