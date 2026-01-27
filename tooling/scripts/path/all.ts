// tooling/scripts/path/all.ts
/**
 * Exports ALL project files to .tmp/PATH-all.md in a categorized format
 * Categories: Root, tooling, infra, .config, .github, apps/*, packages/*, Styles, Barrel Exports, Documentation
 * @module tooling/scripts/path/all
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
 * Recursively walks a directory and collects all files
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
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }

  return files;
}

/**
 * Gets root-level files
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

/**
 * Categorizes files into groups
 * @param allFiles - All file paths
 * @returns Categorized files
 */
function categorizeFiles(allFiles: string[]): {
  root: string[];
  tooling: string[];
  infra: string[];
  config: string[];
  github: string[];
  apps: Map<string, string[]>;
  packages: Map<string, string[]>;
  styles: string[];
  barrels: string[];
  markdown: string[];
} {
  const result = {
    root: [] as string[],
    tooling: [] as string[],
    infra: [] as string[],
    config: [] as string[],
    github: [] as string[],
    apps: new Map<string, string[]>(),
    packages: new Map<string, string[]>(),
    styles: [] as string[],
    barrels: [] as string[],
    markdown: [] as string[],
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
    if (file.endsWith('.css') || file.startsWith('packages/ui/src/styles/')) {
      result.styles.push(file);
      continue;
    }

    // Root files
    if (!file.includes('/')) {
      result.root.push(file);
      continue;
    }

    // Categorize by top-level directory
    switch (parts[0]) {
      case 'tooling':
        result.tooling.push(file);
        break;
      case 'infra':
        result.infra.push(file);
        break;
      case '.config':
        result.config.push(file);
        break;
      case '.github':
        result.github.push(file);
        break;
      case 'apps': {
        const appName = `apps/${parts[1]}`;
        const existing = result.apps.get(appName) ?? [];
        existing.push(file);
        result.apps.set(appName, existing);
        break;
      }
      case 'packages': {
        const pkgName = `packages/${parts[1]}`;
        const existing = result.packages.get(pkgName) ?? [];
        existing.push(file);
        result.packages.set(pkgName, existing);
        break;
      }
      default:
        // Other files go to root
        result.root.push(file);
    }
  }

  return result;
}

/**
 * Builds output section
 * @param title - Section title
 * @param files - Files in section
 * @returns Formatted section string
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
 * Exports all files to PATH-all.md
 */
function exportAllFiles(): void {
  console.log('📦 Scanning all project files...');

  // Get all files
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

  // Root
  output += buildSection('Root', categorized.root);
  count += categorized.root.length;

  // tooling
  output += buildSection('tooling', categorized.tooling);
  count += categorized.tooling.length;

  // infra
  output += buildSection('infra', categorized.infra);
  count += categorized.infra.length;

  // .config
  output += buildSection('.config', categorized.config);
  count += categorized.config.length;

  // .github
  output += buildSection('.github', categorized.github);
  count += categorized.github.length;

  // Source Code section
  output += '\n---\n\n# Source Code\n';

  // Apps
  const appOrder = ['apps/desktop', 'apps/server', 'apps/web'];
  for (const app of appOrder) {
    const files = categorized.apps.get(app);
    if (files && files.length > 0) {
      output += buildSection(app, files);
      count += files.length;
    }
  }

  // Packages
  const pkgOrder = [
    'packages/contracts',
    'packages/core',
    'packages/db',
    'packages/media',
    'packages/sdk',
    'packages/stores',
    'packages/ui',
  ];
  for (const pkg of pkgOrder) {
    const files = categorized.packages.get(pkg);
    if (files && files.length > 0) {
      output += buildSection(pkg, files);
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
