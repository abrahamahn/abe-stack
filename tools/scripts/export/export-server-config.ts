// tools/scripts/export/export-server-config.ts
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');

/** Directories to scan for config files */
const CONFIG_DIRECTORIES = [
  'apps/server/src/config',
  'shared/core/src/config',
];

/** Package alias mappings to source directories */
const PACKAGE_ALIASES: Record<string, string> = {
  '@abe-stack/core': 'shared/core/src',
  '@abe-stack/contracts': 'infra/contracts/src',
  '@abe-stack/sdk': 'sdk/src',
  '@abe-stack/ui': 'shared/ui/src',
  '@abe-stack/stores': 'infra/stores/src',
  '@abe-stack/media': 'infra/media/src',
  '@abe-stack/db': 'infra/db/src',
};

/** External packages to skip (not local files) */
const EXTERNAL_PACKAGES = ['zod', 'node:', 'vitest', 'fastify', 'drizzle'];

/** Set to track visited files and prevent infinite loops */
const visitedFiles = new Set<string>();

/** Set to collect all files to export */
const filesToExport = new Set<string>();

/**
 * Extracts import paths from TypeScript file content.
 * Handles: import ... from '...', import type ... from '...', export ... from '...'
 * @param content - File content to parse
 * @returns Array of import paths
 * @complexity O(n) where n is content length
 */
function extractImports(content: string): string[] {
  const imports: string[] = [];
  // Match: import/export [type] [...] from '...' or "..."
  const importRegex = /(?:import|export)\s+(?:type\s+)?(?:[^'"]*)\s+from\s+['"]([^'"]+)['"]/g;
  // Match: import '...' (side-effect imports)
  const sideEffectRegex = /import\s+['"]([^'"]+)['"]/g;

  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  while ((match = sideEffectRegex.exec(content)) !== null) {
    imports.push(match[1]);
  }

  return [...new Set(imports)];
}

/**
 * Checks if an import path is an external package.
 * @param importPath - Import path to check
 * @returns True if external, false if local
 * @complexity O(k) where k is number of external package prefixes
 */
function isExternalPackage(importPath: string): boolean {
  // Check explicit external packages
  if (EXTERNAL_PACKAGES.some((pkg) => importPath.startsWith(pkg))) {
    return true;
  }
  // Check if it's a bare module specifier (not starting with . or /)
  // but also not a known package alias
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    const isKnownAlias = Object.keys(PACKAGE_ALIASES).some((alias) =>
      importPath.startsWith(alias)
    );
    return !isKnownAlias;
  }
  return false;
}

/**
 * Resolves an import path to an absolute file path.
 * Handles package aliases and relative imports.
 * @param importPath - Import path from source file
 * @param fromFile - Absolute path of the importing file
 * @returns Resolved absolute path or null if unresolvable
 * @complexity O(k) where k is number of package aliases
 */
function resolveImportPath(importPath: string, fromFile: string): string | null {
  // Skip external packages
  if (isExternalPackage(importPath)) {
    return null;
  }

  let resolvedPath: string;

  // Handle package aliases
  for (const [alias, srcPath] of Object.entries(PACKAGE_ALIASES)) {
    if (importPath === alias) {
      // Direct package import: @abe-stack/core -> shared/core/src/index.ts
      resolvedPath = path.join(REPO_ROOT, srcPath, 'index.ts');
      return fs.existsSync(resolvedPath) ? resolvedPath : null;
    }
    if (importPath.startsWith(`${alias}/`)) {
      // Subpath import: @abe-stack/core/config -> shared/core/src/config/index.ts
      const subPath = importPath.slice(alias.length + 1);
      const basePath = path.join(REPO_ROOT, srcPath, subPath);

      // Try directory with index.ts
      resolvedPath = path.join(basePath, 'index.ts');
      if (fs.existsSync(resolvedPath)) return resolvedPath;

      // Try direct .ts file
      resolvedPath = `${basePath}.ts`;
      if (fs.existsSync(resolvedPath)) return resolvedPath;

      return null;
    }
  }

  // Handle relative imports
  if (importPath.startsWith('.')) {
    const fromDir = path.dirname(fromFile);
    const basePath = path.resolve(fromDir, importPath);

    // Try direct .ts file
    resolvedPath = `${basePath}.ts`;
    if (fs.existsSync(resolvedPath)) return resolvedPath;

    // Try directory with index.ts
    resolvedPath = path.join(basePath, 'index.ts');
    if (fs.existsSync(resolvedPath)) return resolvedPath;

    // Try exact path (if it already has extension)
    if (fs.existsSync(basePath)) return basePath;

    return null;
  }

  return null;
}

/**
 * Recursively processes a file and its imports.
 * @param filePath - Absolute path to the file
 * @complexity O(n * m) where n is file count and m is average imports per file
 */
function processFile(filePath: string): void {
  // Normalize path and check if already visited
  const normalizedPath = path.normalize(filePath);

  if (visitedFiles.has(normalizedPath)) {
    return;
  }

  if (!fs.existsSync(normalizedPath)) {
    return;
  }

  visitedFiles.add(normalizedPath);

  // Skip test files
  if (normalizedPath.endsWith('.test.ts')) {
    return;
  }

  // Add to export list
  filesToExport.add(normalizedPath);

  // Read and parse imports
  const content = fs.readFileSync(normalizedPath, 'utf-8');
  const imports = extractImports(content);

  // Recursively process each import
  for (const importPath of imports) {
    const resolvedPath = resolveImportPath(importPath, normalizedPath);
    if (resolvedPath !== null) {
      processFile(resolvedPath);
    }
  }
}

/**
 * Collects all TypeScript files from a directory recursively.
 * @param dirPath - Directory path relative to REPO_ROOT
 * @returns Array of absolute file paths
 * @complexity O(n) where n is total file count in directory tree
 */
function collectFilesFromDirectory(dirPath: string): string[] {
  const absoluteDir = path.join(REPO_ROOT, dirPath);
  const files: string[] = [];

  if (!fs.existsSync(absoluteDir)) {
    console.warn(`⚠️  Directory not found: ${dirPath}`);
    return files;
  }

  function walkDir(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }
  }

  walkDir(absoluteDir);
  return files;
}

/**
 * Converts absolute path to relative path from REPO_ROOT.
 * @param absolutePath - Absolute file path
 * @returns Relative path from repository root
 * @complexity O(1)
 */
function toRelativePath(absolutePath: string): string {
  return path.relative(REPO_ROOT, absolutePath);
}

/**
 * Main export function.
 * Collects config files and their dependencies, writes to server-config.txt.
 */
function exportServerConfig(): void {
  console.log('🚀 Exporting server config files and dependencies...\n');

  // Step 1: Collect all files from config directories
  const seedFiles: string[] = [];
  for (const dir of CONFIG_DIRECTORIES) {
    const files = collectFilesFromDirectory(dir);
    seedFiles.push(...files);
    console.log(`📁 Found ${files.length} files in ${dir}`);
  }

  // Step 2: Process each file and its imports recursively
  console.log('\n🔍 Resolving import dependencies...');
  for (const file of seedFiles) {
    processFile(file);
  }

  // Step 3: Sort files for consistent output
  const sortedFiles = [...filesToExport].map(toRelativePath).sort();

  // Step 4: Build output content
  let output = '';
  let count = 0;

  for (const relativePath of sortedFiles) {
    const fullPath = path.join(REPO_ROOT, relativePath);
    const content = fs.readFileSync(fullPath, 'utf-8');

    output += `\n\n================================================================================\n`;
    output += `FILE: ${relativePath}\n`;
    output += `================================================================================\n\n`;
    output += content;
    output += `\n`;
    count++;
  }

  // Step 5: Write to output file
  const outputDir = path.join(REPO_ROOT, '.tmp');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const outputPath = path.join(outputDir, 'server-config.txt');
  fs.writeFileSync(outputPath, output.trim());

  console.log(`\n✅ Successfully exported ${count} files to ${outputPath}`);

  // Summary by directory
  const byCoreConfig = sortedFiles.filter((f) => f.startsWith('shared/core/src/config'));
  const byServerConfig = sortedFiles.filter((f) => f.startsWith('apps/server/src/config'));
  const byDependencies = sortedFiles.filter(
    (f) => !f.startsWith('shared/core/src/config') && !f.startsWith('apps/server/src/config')
  );

  console.log(`\n📊 Summary:`);
  console.log(`   - shared/core/src/config: ${byCoreConfig.length} files`);
  console.log(`   - apps/server/src/config: ${byServerConfig.length} files`);
  console.log(`   - Dependencies: ${byDependencies.length} files`);
}

exportServerConfig();
