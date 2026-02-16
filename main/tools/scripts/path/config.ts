// main/tools/scripts/path/config.ts
/**
 * Exports configuration and infrastructure files to .tmp/PATH-config.md
 * Target folders: Root, tools, infra, config, .github, client/ui/src/styles
 * @module tools/scripts/path/config
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

/** Target directories for config files */
const CONFIG_DIRECTORIES = [
  'main/tools',
  'infra',
  'config',
  '.github',
  'main/client/ui/src/styles',
];

/** Root-level file extensions to include */
const ROOT_FILE_EXTENSIONS = new Set([
  '.ts',
  '.js',
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.env',
  '.gitignore',
  '.prettierignore',
  '.prettierrc',
  '.editorconfig',
  '.txt',
]);

/**
 * Checks if a file is a root-level config file
 * @param fileName - Name of the file
 * @returns True if it's a config file
 */
function isRootConfigFile(fileName: string): boolean {
  // Check exact matches
  const exactMatches = new Set([
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

  if (exactMatches.has(fileName)) {
    return true;
  }

  // Check extensions
  const ext = path.extname(fileName);
  if (ROOT_FILE_EXTENSIONS.has(ext)) {
    return true;
  }

  // Check if it starts with a dot (hidden config files)
  if (fileName.startsWith('.') && !fileName.includes('/')) {
    return true;
  }

  return false;
}

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
      // Exclude markdown files (they go to PATH-md.md)
      if (!relativePath.endsWith('.md')) {
        files.push(relativePath);
      }
    }
  }

  return files;
}

/**
 * Gets root-level config files
 * @returns Array of root config file paths
 */
function getRootConfigFiles(): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(REPO_ROOT, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && isRootConfigFile(entry.name)) {
      // Exclude markdown files
      if (!entry.name.endsWith('.md')) {
        files.push(entry.name);
      }
    }
  }

  return files.sort();
}

/**
 * Exports configuration files to PATH-config.md
 */
function exportConfigFiles(): void {
  console.log('⚙️  Scanning for configuration files...');

  let output = '# Configuration & Infrastructure Files\n';
  let count = 0;

  // Root files
  const rootFiles = getRootConfigFiles();
  if (rootFiles.length > 0) {
    output += '\n## Root\n';
    for (const file of rootFiles) {
      output += `- [ ] ${file}\n`;
      count++;
    }
  }

  // Config directories
  for (const configDir of CONFIG_DIRECTORIES) {
    const dirPath = path.join(REPO_ROOT, configDir);
    const files = walkDir(dirPath);

    if (files.length > 0) {
      output += `\n## ${configDir}\n`;
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

  const outputPath = path.join(outputDir, 'PATH-config.md');
  fs.writeFileSync(outputPath, output.trim() + '\n');

  console.log(`✅ Exported ${count} config files to ${outputPath}`);
}

export { CONFIG_DIRECTORIES, getRootConfigFiles };
exportConfigFiles();
