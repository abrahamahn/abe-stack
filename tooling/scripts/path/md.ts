// tooling/scripts/path/md.ts
/**
 * Exports all markdown (.md) files in the project to .tmp/PATH-md.md
 * @module tooling/scripts/path/md
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
]);

/**
 * Recursively walks a directory and collects all files matching the filter
 * @param dir - Directory to walk
 * @param filter - Function to filter files
 * @param files - Accumulator for found files
 * @returns Array of relative file paths
 */
function walkDir(
  dir: string,
  filter: (filePath: string) => boolean,
  files: string[] = []
): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(REPO_ROOT, fullPath);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        walkDir(fullPath, filter, files);
      }
    } else if (entry.isFile() && filter(relativePath)) {
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Groups files by their top-level directory
 * @param files - Array of file paths
 * @returns Map of directory to files
 */
function groupByDirectory(files: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const file of files) {
    const parts = file.split('/');
    let groupKey: string;

    if (parts[0] === 'docs') {
      groupKey = parts.length > 1 ? `docs/${parts[1]}` : 'docs';
    } else if (parts[0] === 'packages' && parts.length > 2 && parts[2] === 'docs') {
      groupKey = `${parts[0]}/${parts[1]}/docs`;
    } else if (parts[0] === 'apps' || parts[0] === 'packages') {
      groupKey = `${parts[0]}/${parts[1]}`;
    } else if (parts[0].startsWith('.')) {
      groupKey = parts[0];
    } else {
      groupKey = 'Root';
    }

    const existing = groups.get(groupKey) ?? [];
    existing.push(file);
    groups.set(groupKey, existing);
  }

  return groups;
}

/**
 * Exports all markdown files to PATH-md.md
 */
function exportMarkdownFiles(): void {
  console.log('📝 Scanning for markdown files...');

  const mdFiles = walkDir(REPO_ROOT, (filePath) => filePath.endsWith('.md'));
  mdFiles.sort();

  const grouped = groupByDirectory(mdFiles);

  // Define section order
  const sectionOrder = [
    'Root',
    'docs/deploy',
    'docs/dev',
    'docs/log',
    'docs/reference',
    'docs/specs',
    'docs/todo',
    '.config',
    'apps/desktop',
    'apps/server',
    'apps/web',
    'infra',
    'packages/contracts',
    'packages/core',
    'packages/sdk',
    'packages/ui/docs',
    'packages/ui',
    'tooling',
  ];

  let output = '# Documentation (Markdown)\n';
  let count = 0;

  // Output in defined order first
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

  // Output remaining sections
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

  const outputPath = path.join(outputDir, 'PATH-md.md');
  fs.writeFileSync(outputPath, output.trim() + '\n');

  console.log(`✅ Exported ${count} markdown files to ${outputPath}`);
}

exportMarkdownFiles();
