// tools/scripts/path/code.ts
/**
 * Exports source code files (.ts, .tsx, etc.) to .tmp/PATH-code.md
 * Excludes: index.ts, types.ts, config files, markdown, tools, infra
 * @module tools/scripts/path/code
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
  // Config directories (exported by config.ts)
  'tools',
  'infra',
  '.config',
  '.github',
]);

/** Paths to exclude (relative to REPO_ROOT) */
const EXCLUDED_PATHS = new Set([
  'shared/ui/src/styles', // CSS files go to config
]);

/** File extensions to include (source code only) */
const INCLUDED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

/** File name patterns to exclude (config files) */
const EXCLUDED_FILE_PATTERNS = [
  /^vitest\.config\./,
  /^vite\.config\./,
  /^tsconfig\./,
  /^eslint\.config\./,
  /^prettier\.config\./,
  /^playwright\.config\./,
];

/** File names to exclude (handled by separate scripts) */
const EXCLUDED_FILE_NAMES = new Set(['index.ts', 'types.ts']);

/**
 * Checks if a path should be excluded
 * @param relativePath - Relative path to check
 * @returns True if path should be excluded
 */
function shouldExcludePath(relativePath: string): boolean {
  for (const excluded of EXCLUDED_PATHS) {
    if (relativePath.startsWith(excluded + '/') || relativePath === excluded) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a file is a root-level config file (should be excluded)
 * @param fileName - Name of the file
 * @returns True if it's a root config file
 */
function isRootConfigFile(fileName: string): boolean {
  const rootConfigFiles = new Set([
    '.env',
    '.gitignore',
    '.prettierignore',
    '.prettierrc',
    'turbo.json',
    'package.json',
    'pnpm-workspace.yaml',
    'tsconfig.json',
    'eslint.config.ts',
    'vitest.config.ts',
    'config.txt',
  ]);

  return rootConfigFiles.has(fileName) || fileName.startsWith('.');
}

/**
 * Recursively walks a directory and collects source files
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
      if (!EXCLUDED_DIRS.has(entry.name) && !shouldExcludePath(relativePath)) {
        walkDir(fullPath, files);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);

      // Only include source code extensions
      if (!INCLUDED_EXTENSIONS.has(ext)) {
        continue;
      }

      // Skip index.ts and types.ts (handled by separate scripts)
      if (EXCLUDED_FILE_NAMES.has(entry.name)) {
        continue;
      }

      // Skip config file patterns
      if (EXCLUDED_FILE_PATTERNS.some((pattern) => pattern.test(entry.name))) {
        continue;
      }

      // Skip excluded paths
      if (shouldExcludePath(relativePath)) {
        continue;
      }

      // Skip root config files
      if (!relativePath.includes('/') && isRootConfigFile(entry.name)) {
        continue;
      }

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
 * Exports source code files to PATH-code.md
 */
function exportCodeFiles(): void {
  console.log('💻 Scanning for source code files...');

  const codeFiles = walkDir(REPO_ROOT);
  codeFiles.sort();

  const grouped = groupByPackage(codeFiles);

  // Define section order
  const sectionOrder = [
    'apps/desktop',
    'apps/server',
    'apps/web',
    'infra/contracts',
    'shared/core',
    'infra/db',
    'infra/media',
    'client',
    'client/stores',
    'shared/ui',
  ];

  let output = '# Source Code Files\n';
  output += '\n> Excludes: index.ts (barrel exports), types.ts (type definitions)\n';
  let count = 0;

  // Output source files in defined order
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

  // Output remaining source files
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

  const outputPath = path.join(outputDir, 'PATH-code.md');
  fs.writeFileSync(outputPath, output.trim() + '\n');

  console.log(`✅ Exported ${count} source files to ${outputPath}`);
}

exportCodeFiles();
