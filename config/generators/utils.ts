// config/generators/utils.ts
/**
 * Shared utilities for config generators
 */

import * as fs from 'fs';
import * as path from 'path';

export const ROOT = path.resolve(__dirname, '../..');

/**
 * Header for generated JSON files
 */
export const JSON_HEADER = `// WARNING: This file is auto-generated. DO NOT EDIT DIRECTLY.
// Edit config/schema/*.ts and run: pnpm config:generate
`;

/**
 * Header comment for generated TypeScript files
 */
export const TS_HEADER = `// WARNING: This file is auto-generated. DO NOT EDIT DIRECTLY.
// Edit config/schema/*.ts and run: pnpm config:generate
`;

/**
 * Writes a JSON file with optional header comment
 * Returns true if file was changed
 */
export function writeJsonFile(
  filePath: string,
  data: unknown,
  options: { header?: boolean } = {},
): boolean {
  const json = JSON.stringify(data, null, 2) + '\n';
  const content = options.header ? JSON_HEADER + json : json;

  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';

  if (existing === content) {
    return false;
  }

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content);
  return true;
}

/**
 * Writes a TypeScript file with header comment
 * Returns true if file was changed
 */
export function writeTsFile(filePath: string, content: string): boolean {
  const fullContent = TS_HEADER + '\n' + content;

  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';

  if (existing === fullContent) {
    return false;
  }

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, fullContent);
  return true;
}

/**
 * Writes a plain text file (no header)
 * Returns true if file was changed
 */
export function writeTextFile(filePath: string, content: string): boolean {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';

  if (existing === content) {
    return false;
  }

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content);
  return true;
}

/**
 * Reads a JSON file
 */
export function readJsonFile<T = unknown>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as T;
}

/**
 * Check if a directory has an index.ts or index.tsx file
 */
export function hasIndexFile(dirPath: string): boolean {
  return (
    fs.existsSync(path.join(dirPath, 'index.ts')) || fs.existsSync(path.join(dirPath, 'index.tsx'))
  );
}

/**
 * Find all directories with index files recursively
 */
export function findAliasDirectories(
  baseDir: string,
  options: {
    maxDepth: number;
    skipDirs: Set<string>;
    excludedNames: Set<string>;
  },
): string[] {
  const results: string[] = [];

  function walk(currentDir: string, depth: number): void {
    if (!fs.existsSync(currentDir)) return;
    if (depth > options.maxDepth) return;

    const entries = fs
      .readdirSync(currentDir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (options.skipDirs.has(entry.name)) continue;

      const subDir = path.join(currentDir, entry.name);

      if (hasIndexFile(subDir)) {
        results.push(subDir);
      }

      walk(subDir, depth + 1);
    }
  }

  walk(baseDir, 1);
  return results;
}

/**
 * Generate path aliases from directory structure
 */
export function generatePathAliases(
  projectDir: string,
  scanDirs: string[],
  options: {
    maxDepth: number;
    skipDirs: Set<string>;
    excludedNames: Set<string>;
    aliasPrefix?: string;
  },
): Record<string, string[]> {
  const paths: Record<string, string[]> = {
    '@/*': ['./src/*'],
  };

  const srcDir = path.join(projectDir, 'src');
  const allDirs: string[] = [];

  // Scan each configured directory
  for (const scanDir of scanDirs) {
    const fullScanDir = path.join(srcDir, scanDir);
    const dirs = findAliasDirectories(fullScanDir, {
      maxDepth: options.maxDepth,
      skipDirs: options.skipDirs,
      excludedNames: options.excludedNames,
    });
    allDirs.push(...dirs);
  }

  // Sort by depth (shallower directories first)
  const sortedDirs = allDirs.sort((a, b) => {
    const depthA = a.split(path.sep).length;
    const depthB = b.split(path.sep).length;
    if (depthA !== depthB) return depthA - depthB;
    return a.localeCompare(b);
  });

  const prefix = options.aliasPrefix ?? '@';

  for (const dir of sortedDirs) {
    const dirName = path.basename(dir);

    if (options.excludedNames.has(dirName)) continue;

    const relativePath = './' + path.relative(projectDir, dir).replace(/\\/g, '/');
    const aliasKey = `${prefix}${dirName}`;

    // Only add if not already defined (shallower wins)
    if (!paths[aliasKey]) {
      paths[aliasKey] = [relativePath];
      paths[`${aliasKey}/*`] = [`${relativePath}/*`];
    }
  }

  // Sort keys alphabetically
  const sortedPaths: Record<string, string[]> = {};
  for (const key of Object.keys(paths).sort()) {
    sortedPaths[key] = paths[key];
  }

  return sortedPaths;
}

/**
 * Parse pnpm-workspace.yaml to get workspace patterns
 */
export function parseWorkspacePatterns(workspaceFile: string): string[] {
  if (!fs.existsSync(workspaceFile)) return [];

  const content = fs.readFileSync(workspaceFile, 'utf-8');
  const lines = content.split(/\r?\n/);
  const patterns: string[] = [];
  let inPackages = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('packages:')) {
      inPackages = true;
      continue;
    }
    if (!inPackages) continue;
    if (trimmed.startsWith('#') || trimmed.length === 0) continue;
    if (!trimmed.startsWith('-')) {
      if (!line.startsWith(' ') && !line.startsWith('\t')) inPackages = false;
      continue;
    }
    const value = trimmed.replace(/^-+\s*/, '').replace(/['"]/g, '');
    if (value) patterns.push(value);
  }

  return patterns;
}

/**
 * Expand workspace pattern to actual directories
 */
export function expandWorkspacePattern(pattern: string, root: string): string[] {
  const normalized = pattern.replace(/\\/g, '/').replace(/\/$/, '');

  if (!normalized.includes('*')) {
    return [path.join(root, normalized)];
  }

  if (normalized.endsWith('/*')) {
    const baseDir = path.join(root, normalized.slice(0, -2));
    if (!fs.existsSync(baseDir)) return [];
    return fs
      .readdirSync(baseDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(baseDir, entry.name));
  }

  return [];
}

/**
 * Get all workspace projects
 */
export function getWorkspaceProjects(
  root: string,
): Array<{ name: string; dir: string; packageJson: string }> {
  const workspaceFile = path.join(root, 'pnpm-workspace.yaml');
  const patterns = parseWorkspacePatterns(workspaceFile);
  const dirs = new Set<string>();

  for (const pattern of patterns) {
    for (const dir of expandWorkspacePattern(pattern, root)) {
      dirs.add(dir);
    }
  }

  const projects: Array<{ name: string; dir: string; packageJson: string }> = [];

  for (const dir of dirs) {
    const pkgPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;

    const pkg = readJsonFile<{ name?: string }>(pkgPath);
    if (!pkg?.name) continue;

    projects.push({ name: pkg.name, dir, packageJson: pkgPath });
  }

  return projects.sort((a, b) => a.dir.localeCompare(b.dir));
}

/**
 * Logger with quiet mode support
 */
export function createLogger(quiet: boolean) {
  return {
    log: (...args: unknown[]) => {
      if (!quiet) console.log(...args);
    },
    error: (...args: unknown[]) => {
      console.error(...args);
    },
  };
}
