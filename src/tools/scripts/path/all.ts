// src/tools/scripts/path/all.ts
/**
 * Exports ALL project files to .tmp/PATH-all.md in a categorized format.
 * Categories: Root, docs, infra, .config, .github, src/apps/*, src/client/*, src/server/*, src/shared, src/tools, Styles, Barrels, Markdown
 * @module tools/scripts/path/all
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
]);

/**
 * Recursively walks a directory and collects all files.
 * @param dir - Directory to walk
 * @param files - Accumulator for found files
 * @returns Array of relative file paths
 * @complexity O(n) where n is total filesystem entries
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
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Gets root-level files.
 * @returns Array of root file paths
 */
function getRootFiles(): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(REPO_ROOT, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile()) {
      files.push(entry.name);
    }
  }

  return files.sort();
}

interface CategorizedFiles {
  root: string[];
  docs: string[];
  infra: string[];
  config: string[];
  github: string[];
  /** Source code packages keyed by e.g. 'src/apps/web', 'src/shared' */
  packages: Map<string, string[]>;
  styles: string[];
  barrels: string[];
  markdown: string[];
}

/**
 * Categorizes files into groups matching the current monorepo structure.
 * @param allFiles - All file paths relative to REPO_ROOT
 * @returns Categorized files
 * @complexity O(n) where n is number of files
 */
function categorizeFiles(allFiles: string[]): CategorizedFiles {
  const result: CategorizedFiles = {
    root: [],
    docs: [],
    infra: [],
    config: [],
    github: [],
    packages: new Map<string, string[]>(),
    styles: [],
    barrels: [],
    markdown: [],
  };

  for (const file of allFiles) {
    const parts = file.split('/');

    // Markdown files
    if (file.endsWith('.md')) {
      result.markdown.push(file);
      continue;
    }

    // Barrel exports
    if (file.endsWith('/index.ts')) {
      result.barrels.push(file);
      continue;
    }

    // CSS/Styles
    if (file.endsWith('.css') || file.startsWith('src/client/ui/src/styles/')) {
      result.styles.push(file);
      continue;
    }

    // Root files (no directory)
    if (!file.includes('/')) {
      result.root.push(file);
      continue;
    }

    // Categorize by top-level directory
    switch (parts[0]) {
      case 'src': {
        // Group src/ files by package: src/<layer>/<pkg> or src/shared, src/tools
        let pkgKey: string;
        if (parts.length >= 3 && parts[1] !== 'shared' && parts[1] !== 'tools') {
          pkgKey = `src/${parts[1]}/${parts[2]}`;
        } else {
          pkgKey = `src/${parts[1]}`;
        }
        const existing = result.packages.get(pkgKey) ?? [];
        existing.push(file);
        result.packages.set(pkgKey, existing);
        break;
      }
      case 'docs':
        result.docs.push(file);
        break;
      case 'infra':
        result.infra.push(file);
        break;
      case 'config':
      case '.config':
        result.config.push(file);
        break;
      case '.github':
        result.github.push(file);
        break;
      default:
        result.root.push(file);
    }
  }

  return result;
}

/**
 * Builds a markdown section with a title and file list.
 * @param title - Section title
 * @param files - Files in section
 * @returns Formatted section string (empty string if no files)
 */
function buildSection(title: string, files: string[]): string {
  if (files.length === 0) {
    return '';
  }

  let output = `\n## ${title}\n`;
  for (const file of files.sort()) {
    output += `- [ ] ${file}\n`;
  }
  return output;
}

/**
 * Exports all files to PATH-all.md.
 */
function exportAllFiles(): void {
  console.log('📦 Scanning all project files...');

  const allFiles = walkDir(REPO_ROOT);
  const rootFiles = getRootFiles();

  // Add root files that weren't caught by walkDir
  for (const file of rootFiles) {
    if (!allFiles.includes(file)) {
      allFiles.push(file);
    }
  }

  allFiles.sort();
  const categorized = categorizeFiles(allFiles);

  let output = '# All Project Files\n';
  let count = 0;

  // Configuration & Infrastructure section
  output += '\n---\n\n# Configuration & Infrastructure\n';

  output += buildSection('Root', categorized.root);
  count += categorized.root.length;

  output += buildSection('docs', categorized.docs);
  count += categorized.docs.length;

  output += buildSection('infra', categorized.infra);
  count += categorized.infra.length;

  output += buildSection('.config', categorized.config);
  count += categorized.config.length;

  output += buildSection('.github', categorized.github);
  count += categorized.github.length;

  // Source Code section (hexagonal order: shared → server → client → apps → tools)
  output += '\n---\n\n# Source Code\n';

  const packageOrder = [
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

  for (const pkg of packageOrder) {
    const files = categorized.packages.get(pkg);
    if (files && files.length > 0) {
      output += buildSection(pkg, files);
      count += files.length;
      categorized.packages.delete(pkg);
    }
  }

  // Remaining packages not in the predefined order
  const remainingKeys = Array.from(categorized.packages.keys()).sort();
  for (const key of remainingKeys) {
    const files = categorized.packages.get(key);
    if (files && files.length > 0) {
      output += buildSection(key, files);
      count += files.length;
    }
  }

  // Special sections
  output += '\n---\n\n# Styles (CSS)\n';
  for (const file of categorized.styles.sort()) {
    output += `- [ ] ${file}\n`;
    count++;
  }

  output += '\n---\n\n# Barrel Exports (index.ts)\n';
  for (const file of categorized.barrels.sort()) {
    output += `- [ ] ${file}\n`;
    count++;
  }

  output += '\n---\n\n# Documentation (Markdown)\n';
  for (const file of categorized.markdown.sort()) {
    output += `- [ ] ${file}\n`;
    count++;
  }

  // Ensure .tmp directory exists
  const outputDir = path.join(REPO_ROOT, '.tmp');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'PATH-all.md');
  fs.writeFileSync(outputPath, output.trim() + '\n');

  console.log(`✅ Exported ${count} total files to ${outputPath}`);
}

exportAllFiles();
