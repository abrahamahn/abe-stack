// main/tools/scripts/export/server/server-config.ts
/**
 * Server Configuration Exporter
 *
 * Exports all configuration files from main/server/* packages into a single file.
 * Includes: config directories, package.json, tsconfig, vitest.config, and
 * recursively resolves import dependencies from config source files.
 *
 * @usage pnpm tsx main/tools/scripts/export/server/server-config.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');

/** Server sub-packages to scan for configuration */
const SERVER_PACKAGES = ['core', 'db', 'engine', 'media', 'realtime', 'websocket'] as const;

/** Config directory names to look for within each package */
const CONFIG_DIR_NAMES = ['config', 'configs'] as const;

/** Root-level config file patterns for each server package */
const CONFIG_FILE_PATTERNS: RegExp[] = [
  /^package\.json$/,
  /^tsconfig[.\w-]*\.json$/,
  /^vitest\.config\.(ts|js)$/,
  /^eslint\.config\.(ts|js)$/,
];

/** Package alias mappings to source directories for import resolution */
const PACKAGE_ALIASES: Record<string, string> = {
  '@bslt/server-engine': 'main/server/engine/src',
  '@bslt/shared': 'main/shared/src',
  '@bslt/ui': 'main/client/ui/src',
  '@bslt/react': 'main/client/react/src',
  '@bslt/db': 'main/server/db/src',
  '@bslt/media': 'main/server/media/src',
  '@bslt/websocket': 'main/server/websocket/src',
  '@bslt/core': 'main/server/core/src',
  '@bslt/api': 'main/client/api/src',
  '@bslt/client-engine': 'main/client/engine/src',
  '@bslt/realtime': 'main/server/realtime/src',
};

/** External packages to skip during import resolution */
const EXTERNAL_PACKAGES = ['zod', 'node:', 'vitest', 'fastify', 'drizzle', 'postgres'];

/** Set to track visited files and prevent infinite loops */
const visitedFiles = new Set<string>();

/** Set to collect all files to export */
const filesToExport = new Set<string>();

/**
 * Extracts import paths from TypeScript file content.
 * @param content - File content to parse
 * @returns Deduplicated array of import paths
 * @complexity O(n) where n is content length
 */
function extractImports(content: string): string[] {
  const imports: string[] = [];
  const importRegex = /(?:import|export)\s+(?:type\s+)?(?:[^'"]*)\s+from\s+['"]([^'"]+)['"]/g;
  const sideEffectRegex = /import\s+['"]([^'"]+)['"]/g;

  let match: RegExpExecArray | null;

  while ((match = importRegex.exec(content)) !== null) {
    const captured = match[1];
    if (captured !== undefined) imports.push(captured);
  }

  while ((match = sideEffectRegex.exec(content)) !== null) {
    const captured = match[1];
    if (captured !== undefined) imports.push(captured);
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
  if (EXTERNAL_PACKAGES.some((pkg) => importPath.startsWith(pkg))) {
    return true;
  }
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    const isKnownAlias = Object.keys(PACKAGE_ALIASES).some((alias) => importPath.startsWith(alias));
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
  if (isExternalPackage(importPath)) {
    return null;
  }

  let resolvedPath: string;

  for (const [alias, srcPath] of Object.entries(PACKAGE_ALIASES)) {
    if (importPath === alias) {
      resolvedPath = path.join(REPO_ROOT, srcPath, 'index.ts');
      return fs.existsSync(resolvedPath) ? resolvedPath : null;
    }
    if (importPath.startsWith(`${alias}/`)) {
      const subPath = importPath.slice(alias.length + 1);
      const basePath = path.join(REPO_ROOT, srcPath, subPath);

      resolvedPath = path.join(basePath, 'index.ts');
      if (fs.existsSync(resolvedPath)) return resolvedPath;

      resolvedPath = `${basePath}.ts`;
      if (fs.existsSync(resolvedPath)) return resolvedPath;

      return null;
    }
  }

  if (importPath.startsWith('.')) {
    const fromDir = path.dirname(fromFile);
    const basePath = path.resolve(fromDir, importPath);

    resolvedPath = `${basePath}.ts`;
    if (fs.existsSync(resolvedPath)) return resolvedPath;

    resolvedPath = path.join(basePath, 'index.ts');
    if (fs.existsSync(resolvedPath)) return resolvedPath;

    if (fs.existsSync(basePath)) return basePath;

    return null;
  }

  return null;
}

/**
 * Recursively processes a file and its imports, adding them to the export set.
 * @param filePath - Absolute path to the file
 * @complexity O(n * m) where n is file count and m is average imports per file
 */
function processFile(filePath: string): void {
  const normalizedPath = path.normalize(filePath);

  if (visitedFiles.has(normalizedPath)) {
    return;
  }

  if (!fs.existsSync(normalizedPath)) {
    return;
  }

  visitedFiles.add(normalizedPath);

  if (normalizedPath.endsWith('.test.ts')) {
    return;
  }

  filesToExport.add(normalizedPath);

  const content = fs.readFileSync(normalizedPath, 'utf-8');
  const imports = extractImports(content);

  for (const importPath of imports) {
    const resolvedPath = resolveImportPath(importPath, normalizedPath);
    if (resolvedPath !== null) {
      processFile(resolvedPath);
    }
  }
}

/**
 * Collects all TypeScript files from a directory recursively.
 * @param dirPath - Absolute directory path to walk
 * @returns Array of absolute file paths
 * @complexity O(n) where n is total file count in directory tree
 */
function collectFilesFromDirectory(dirPath: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dirPath)) {
    return files;
  }

  function walkDir(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.turbo') {
          walkDir(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }
  }

  walkDir(dirPath);
  return files;
}

/**
 * Checks if a filename matches a config file pattern.
 * @param filename - The filename to check
 * @returns True if the file is a config file
 * @complexity O(p) where p is number of config patterns
 */
function isConfigFile(filename: string): boolean {
  return CONFIG_FILE_PATTERNS.some((pattern) => pattern.test(filename));
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
 * Scans main/server packages for config files and their dependencies,
 * writes output to .tmp/server-config.txt.
 */
function exportServerConfig(): void {
  console.log('Exporting server configuration files and dependencies...\n');

  const serverBase = path.join(REPO_ROOT, 'src', 'server');
  const seedFiles: string[] = [];

  // Step 1: Collect config files from each server package
  for (const pkg of SERVER_PACKAGES) {
    const pkgDir = path.join(serverBase, pkg);
    if (!fs.existsSync(pkgDir)) continue;

    // Collect root-level config files (package.json, tsconfig.json, vitest.config.ts)
    const rootEntries = fs.readdirSync(pkgDir, { withFileTypes: true });
    for (const entry of rootEntries) {
      if (entry.isFile() && isConfigFile(entry.name)) {
        const fullPath = path.join(pkgDir, entry.name);
        filesToExport.add(fullPath);
      }
    }

    // Collect config directory contents
    for (const configDirName of CONFIG_DIR_NAMES) {
      const configDir = path.join(pkgDir, 'src', configDirName);
      if (fs.existsSync(configDir)) {
        const files = collectFilesFromDirectory(configDir);
        seedFiles.push(...files);
        console.log(`  ✓ ${pkg}/src/${configDirName}: ${String(files.length)} files`);
      }
    }
  }

  // Step 2: Process seed files and resolve import dependencies
  if (seedFiles.length > 0) {
    console.log('\nResolving import dependencies...');
    for (const file of seedFiles) {
      processFile(file);
    }
  }

  // Step 3: Sort files for consistent output
  const sortedFiles = [...filesToExport].map(toRelativePath).sort();

  // Step 4: Build output content
  let output = '';
  let count = 0;

  output += '# BSLT - Server Configuration Export\n\n';
  output += `Generated: ${new Date().toISOString()}\n`;
  output += `Source: main/server/*/\n\n`;
  output += '---\n\n';

  for (const relativePath of sortedFiles) {
    const fullPath = path.join(REPO_ROOT, relativePath);
    const content = fs.readFileSync(fullPath, 'utf-8');

    output += `\n================================================================================\n`;
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

  console.log(`\n✅ Exported ${String(count)} config files to ${outputPath}`);

  // Summary by package
  console.log('\nSummary:');
  for (const pkg of SERVER_PACKAGES) {
    const prefix = path.join('src', 'server', pkg);
    const pkgFiles = sortedFiles.filter((f) => f.startsWith(prefix));
    if (pkgFiles.length > 0) {
      console.log(`   ${pkg}: ${String(pkgFiles.length)} files`);
    }
  }
  const depFiles = sortedFiles.filter((f) => !f.startsWith(path.join('src', 'server')));
  if (depFiles.length > 0) {
    console.log(`   External dependencies: ${String(depFiles.length)} files`);
  }
}

exportServerConfig();
