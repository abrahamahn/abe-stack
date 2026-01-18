#!/usr/bin/env node
// config/lint/sync-import-aliases.ts
/**
 * Converts relative imports to path aliases where available.
 *
 * Usage:
 *   pnpm sync:imports          # Update once
 *   pnpm sync:imports:check    # Check mode
 *   pnpm sync:imports:watch    # Watch mode
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const isQuiet = process.argv.includes('--quiet');
function log(...args: unknown[]): void {
  if (!isQuiet) console.log(...args);
}

const PROJECT_ROOTS = ['apps', 'packages'];
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '__tests__',
  '.cache',
  '.turbo',
  'dist',
  'build',
  'coverage',
  '.git',
]);

const EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'];

interface ProjectConfig {
  root: string;
  tsconfigPath: string;
  srcPath: string;
}

interface AliasMapping {
  alias: string;
  targetDir: string;
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function listProjectConfigs(): ProjectConfig[] {
  const projects: ProjectConfig[] = [];
  for (const root of PROJECT_ROOTS) {
    const basePath = path.join(ROOT, root);
    if (!fs.existsSync(basePath)) continue;
    for (const entry of fs.readdirSync(basePath, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const projectRoot = path.join(basePath, entry.name);
      const tsconfigPath = path.join(projectRoot, 'tsconfig.json');
      const srcPath = path.join(projectRoot, 'src');
      if (!fs.existsSync(tsconfigPath) || !fs.existsSync(srcPath)) continue;
      projects.push({ root: projectRoot, tsconfigPath, srcPath });
    }
  }
  return projects;
}

function loadAliasMappings(project: ProjectConfig): AliasMapping[] {
  const tsconfig = readJson(project.tsconfigPath) as Record<string, unknown>;
  const compilerOptions = (tsconfig.compilerOptions ?? {}) as Record<string, unknown>;
  const paths = (compilerOptions.paths ?? {}) as Record<string, string[]>;
  const mappings: AliasMapping[] = [];

  for (const [alias, targets] of Object.entries(paths)) {
    const aliasBase = alias.replace(/\/*$/, '').replace(/\/\*$/, '');
    if (!aliasBase.startsWith('@')) continue;
    for (const target of targets) {
      const targetBase = target.replace(/\/*$/, '').replace(/\/\*$/, '');
      const absoluteTarget = path.resolve(project.root, targetBase);
      if (!absoluteTarget.startsWith(project.root)) continue;
      mappings.push({ alias: aliasBase, targetDir: absoluteTarget });
    }
  }

  return mappings.sort((a, b) => b.targetDir.length - a.targetDir.length);
}

function shouldSkipDir(dirPath: string): boolean {
  const name = path.basename(dirPath);
  if (EXCLUDED_DIRS.has(name)) return true;
  if (dirPath.includes(`${path.sep}src${path.sep}test`)) return true;
  if (dirPath.includes(`${path.sep}src${path.sep}tests`)) return true;
  return false;
}

function collectFiles(srcPath: string): string[] {
  const files: string[] = [];
  const stack: string[] = [srcPath];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    if (shouldSkipDir(current)) continue;
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.d.ts')) continue;
        if (EXTENSIONS.includes(path.extname(entry.name))) {
          files.push(fullPath);
        }
      }
    }
  }
  return files;
}

function resolveImport(filePath: string, specifier: string): string | null {
  const basePath = path.resolve(path.dirname(filePath), specifier);
  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath;
  }
  for (const ext of EXTENSIONS) {
    const candidate = `${basePath}${ext}`;
    if (fs.existsSync(candidate)) return candidate;
  }
  if (fs.existsSync(basePath) && fs.statSync(basePath).isDirectory()) {
    for (const ext of EXTENSIONS) {
      const candidate = path.join(basePath, `index${ext}`);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

function toAliasPath(resolvedPath: string, mappings: AliasMapping[]): string | null {
  for (const mapping of mappings) {
    if (!resolvedPath.startsWith(mapping.targetDir)) continue;
    const relative = path.relative(mapping.targetDir, resolvedPath).replace(/\\/g, '/');
    const withoutExt = relative.replace(/\.[a-zA-Z0-9]+$/, '');
    const normalized = withoutExt.replace(/\/index$/, '');
    if (!normalized || normalized === '.') return mapping.alias;
    return `${mapping.alias}/${normalized}`;
  }
  return null;
}

function isSameDirectoryImport(spec: string): boolean {
  // Same-directory imports: ./foo, ./foo.ts (no further path segments)
  // NOT same-directory: ./foo/bar, ../foo
  return /^\.\/[^/]+$/.test(spec);
}

function isBarrelFile(filePath: string): boolean {
  const fileName = path.basename(filePath);
  if (!fileName.startsWith('index.')) return false;

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  let inMultiLineExport = false;
  let inMultiLineImport = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) continue;

    if (inMultiLineExport) {
      if (trimmed.includes('}')) inMultiLineExport = false;
      continue;
    }
    if (inMultiLineImport) {
      if (trimmed.includes('}')) inMultiLineImport = false;
      continue;
    }

    // Re-exports
    if (/^export\s+(type\s+)?\{[^}]*\}\s+from\s+['"]/.test(trimmed)) continue;
    if (/^export\s+(type\s+)?\*\s+(as\s+\w+\s+)?from\s+['"]/.test(trimmed)) continue;
    if (/^export\s+(type\s+)?\{/.test(trimmed) && !trimmed.includes('}')) {
      inMultiLineExport = true;
      continue;
    }

    // Imports
    if (/^import\s+/.test(trimmed)) {
      if (trimmed.includes('{') && !trimmed.includes('}')) inMultiLineImport = true;
      continue;
    }

    return false;
  }
  return true;
}

function isReExportLine(line: string): boolean {
  const trimmed = line.trim();
  // Single-line: export { ... } from '...'
  if (/^export\s+(type\s+)?\{[^}]*\}\s+from\s+['"]/.test(trimmed)) return true;
  // export * from '...' or export * as name from '...'
  if (/^export\s+(type\s+)?\*\s+(as\s+\w+\s+)?from\s+['"]/.test(trimmed)) return true;
  return false;
}

function isMultiLineExportStart(line: string): boolean {
  const trimmed = line.trim();
  // Start of multi-line export: export { or export type {
  return /^export\s+(type\s+)?\{/.test(trimmed) && !trimmed.includes('}');
}

function isMultiLineExportEnd(line: string): boolean {
  const trimmed = line.trim();
  // End of multi-line export: } from '...'
  return /^\}\s+from\s+['"]/.test(trimmed);
}

function replaceImports(
  content: string,
  filePath: string,
  mappings: AliasMapping[],
): {
  updated: string;
  changed: number;
} {
  // Skip barrel files entirely - they should use relative imports for re-exports
  if (isBarrelFile(filePath)) {
    return { updated: content, changed: 0 };
  }

  const isIndexFile = path.basename(filePath).startsWith('index.');
  let changeCount = 0;

  const replaceSpec = (full: string, prefix: string, spec: string, suffix: string): string => {
    if (!spec.startsWith('.')) return full;
    // Skip same-directory imports (./foo) - they're fine as relative
    if (isSameDirectoryImport(spec)) return full;
    const resolved = resolveImport(filePath, spec);
    if (!resolved) return full;
    const alias = toAliasPath(resolved, mappings);
    if (!alias) return full;
    changeCount += 1;
    return `${prefix}${alias}${suffix}`;
  };

  const dynamicRegex = /(import\(\s*['"])([^'"]+)(['"]\s*\))/g;
  const requireRegex = /(require\(\s*['"])([^'"]+)(['"]\s*\))/g;

  // For index.ts files, process line by line to preserve re-exports
  if (isIndexFile) {
    const lines = content.split('\n');
    let inMultiLineExport = false;
    const updatedLines = lines.map((line) => {
      // Track multi-line exports
      if (isMultiLineExportStart(line)) {
        inMultiLineExport = true;
        return line;
      }
      if (inMultiLineExport) {
        if (isMultiLineExportEnd(line)) {
          inMultiLineExport = false;
        }
        return line; // Skip all lines in multi-line export
      }
      // Skip single-line re-export lines - they should keep relative imports
      if (isReExportLine(line)) return line;
      // Only convert import lines and dynamic imports
      let updated = line.replace(/(from\s+['"])([^'"]+)(['"])/g, replaceSpec);
      updated = updated.replace(dynamicRegex, replaceSpec);
      updated = updated.replace(requireRegex, replaceSpec);
      return updated;
    });
    return { updated: updatedLines.join('\n'), changed: changeCount };
  }

  // For non-index files, convert everything
  const staticRegex = /(from\s+['"])([^'"]+)(['"])/g;
  let updated = content.replace(staticRegex, replaceSpec);
  updated = updated.replace(dynamicRegex, replaceSpec);
  updated = updated.replace(requireRegex, replaceSpec);

  return { updated, changed: changeCount };
}

function processFile(
  filePath: string,
  mappings: AliasMapping[],
  checkOnly: boolean,
): {
  changed: boolean;
  changeCount: number;
} {
  const content = fs.readFileSync(filePath, 'utf-8');
  const { updated, changed } = replaceImports(content, filePath, mappings);
  if (changed > 0 && !checkOnly) {
    fs.writeFileSync(filePath, updated);
  }
  return { changed: changed > 0, changeCount: changed };
}

function syncAll(checkOnly: boolean): boolean {
  const projects = listProjectConfigs();
  const needsUpdate: Array<{ path: string; changes: number }> = [];
  const updated: Array<{ path: string; changes: number }> = [];

  for (const project of projects) {
    const mappings = loadAliasMappings(project);
    if (mappings.length === 0) continue;
    for (const filePath of collectFiles(project.srcPath)) {
      const { changed, changeCount } = processFile(filePath, mappings, checkOnly);
      if (changed) {
        const relativePath = path.relative(ROOT, filePath).replace(/\\/g, '/');
        if (checkOnly) {
          needsUpdate.push({ path: relativePath, changes: changeCount });
        } else {
          updated.push({ path: relativePath, changes: changeCount });
        }
      }
    }
  }

  if (checkOnly) {
    if (needsUpdate.length > 0) {
      log(`\n${String(needsUpdate.length)} file(s) have relative imports that can use aliases:\n`);
      for (const item of needsUpdate.slice(0, 15)) {
        log(`  - ${item.path} (${String(item.changes)} import${item.changes > 1 ? 's' : ''})`);
      }
      if (needsUpdate.length > 15) {
        log(`  ... and ${String(needsUpdate.length - 15)} more`);
      }
      log('\nRun without --check to convert them.');
      return false;
    }
    log('✓ All imports use path aliases where available');
    return true;
  }

  if (updated.length > 0) {
    log(`\nConverted imports in ${String(updated.length)} file(s):`);
    for (const item of updated.slice(0, 15)) {
      log(`  ✓ ${item.path} (${String(item.changes)} import${item.changes > 1 ? 's' : ''})`);
    }
    if (updated.length > 15) {
      log(`  ... and ${String(updated.length - 15)} more`);
    }
  } else {
    log('✓ All imports already use path aliases');
  }

  return true;
}

function watchFiles(): void {
  log('Watching for file changes...\n');
  const projectAliases = new Map<string, AliasMapping[]>();

  for (const project of listProjectConfigs()) {
    projectAliases.set(project.root, loadAliasMappings(project));
  }

  let syncTimeout: NodeJS.Timeout | null = null;
  for (const project of listProjectConfigs()) {
    const watcher = fs.watch(project.srcPath, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      if (syncTimeout) clearTimeout(syncTimeout);
      syncTimeout = setTimeout(() => {
        const filePath = path.join(project.srcPath, filename);
        if (!fs.existsSync(filePath)) return;
        if (!fs.statSync(filePath).isFile()) return;
        const mappings = projectAliases.get(project.root);
        if (!mappings) return;
        const { changed, changeCount } = processFile(filePath, mappings, false);
        if (changed) {
          const relativePath = path.relative(ROOT, filePath).replace(/\\/g, '/');
          log(
            `[sync-import-aliases] Converted ${String(changeCount)} import${
              changeCount > 1 ? 's' : ''
            } in: ${relativePath}`,
          );
        }
      }, 200);
    });
    watcher.on('error', () => {});
  }

  syncAll(false);
  log('\n[sync-import-aliases] Watching for changes... (Ctrl+C to stop)\n');
}

function main(): void {
  const checkOnly = process.argv.includes('--check');
  const watch = process.argv.includes('--watch');

  if (watch) {
    watchFiles();
    return;
  }

  log(checkOnly ? 'Checking import aliases...\n' : 'Converting to import aliases...\n');
  const ok = syncAll(checkOnly);
  if (!ok) process.exit(1);
}

main();
