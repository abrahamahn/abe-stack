// tools/scripts/path/barrels.ts
/**
 * Exports barrel export files (index.ts) to .tmp/PATH-barrels.md
 * @module tools/scripts/path/barrels
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');

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
  'tools',
  'infra',
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
 * Groups files by their package/app directory
 * @param files - Array of file paths
 * @returns Map of directory to files
 */
function groupByPackage(files: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const file of files) {
    const parts = file.split('/');
    let groupKey: string;

    if (parts[0] === 'apps' || parts[0] === 'packages') {
      groupKey = `${parts[0]}/${parts[1]}`;
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

  // Define section order
  const sectionOrder = [
    'apps/desktop',
    'apps/server',
    'apps/web',
    'infra/contracts',
    'core',
    'infra/db',
    'infra/media',
    'client',
    'client/stores',
    'client/ui',
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
