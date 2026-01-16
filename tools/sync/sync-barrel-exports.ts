#!/usr/bin/env node
// tools/sync/sync-barrel-exports.ts
/**
 * Automatically creates and updates index.ts barrel files.
 *
 * Usage:
 *   pnpm sync:barrels          # Update all barrel files
 *   pnpm sync:barrels:check    # Check if barrels are up to date
 *   pnpm sync:barrels:watch    # Watch mode
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

const SCAN_ROOTS = [
  'apps/web/src',
  'apps/server/src',
  'apps/desktop/src',
  'packages/core/src',
  'packages/sdk/src',
  'packages/ui/src',
];

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

const FILE_EXTENSIONS = new Set(['.ts', '.tsx']);
const AUTO_MARKER = '// @auto-generated - Do not edit manually';

interface ExportEntry {
  name: string;
  isType: boolean;
  isDefault: boolean;
}

interface BarrelResult {
  created: string[];
  updated: string[];
}

function shouldSkipDir(dirPath: string): boolean {
  const base = path.basename(dirPath);
  if (EXCLUDED_DIRS.has(base)) return true;
  if (dirPath.endsWith(`${path.sep}src`)) return true;
  if (dirPath.includes(`${path.sep}tools${path.sep}dev${path.sep}export`)) return true;
  if (dirPath.includes(`${path.sep}tools${path.sep}packages`)) return true;
  if (dirPath.includes(`${path.sep}src${path.sep}test`)) return true;
  if (dirPath.includes(`${path.sep}src${path.sep}tests`)) return true;
  return false;
}

function collectDirectories(root: string): string[] {
  const dirs: string[] = [];
  const stack: string[] = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    if (shouldSkipDir(current)) continue;
    dirs.push(current);
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        stack.push(path.join(current, entry.name));
      }
    }
  }

  return dirs;
}

function parseExports(filePath: string): ExportEntry[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const exports: ExportEntry[] = [];

  // First, collect all type names (interfaces and type aliases) declared in the file
  const typeNames = new Set<string>();
  const interfaceRegex = /(?:^|\n)\s*(?:export\s+)?interface\s+([A-Za-z0-9_]+)/g;
  const typeAliasRegex = /(?:^|\n)\s*(?:export\s+)?type\s+([A-Za-z0-9_]+)\s*[=<]/g;

  let typeMatch: RegExpExecArray | null = null;
  while ((typeMatch = interfaceRegex.exec(content)) !== null) {
    typeNames.add(typeMatch[1]);
  }
  while ((typeMatch = typeAliasRegex.exec(content)) !== null) {
    typeNames.add(typeMatch[1]);
  }

  const pushUnique = (entry: ExportEntry): void => {
    if (
      !exports.some((existing) => existing.name === entry.name && existing.isType === entry.isType)
    ) {
      exports.push(entry);
    }
  };

  const namedRegexes: Array<{ regex: RegExp; isType: boolean }> = [
    { regex: /export\s+const\s+([A-Za-z0-9_]+)/g, isType: false },
    { regex: /export\s+function\s+([A-Za-z0-9_]+)/g, isType: false },
    { regex: /export\s+class\s+([A-Za-z0-9_]+)/g, isType: false },
    { regex: /export\s+enum\s+([A-Za-z0-9_]+)/g, isType: false },
    { regex: /export\s+interface\s+([A-Za-z0-9_]+)/g, isType: true },
    { regex: /export\s+type\s+([A-Za-z0-9_]+)\s*[=<]/g, isType: true },
  ];

  for (const { regex, isType } of namedRegexes) {
    let match: RegExpExecArray | null = null;
    while ((match = regex.exec(content)) !== null) {
      pushUnique({ name: match[1], isType, isDefault: false });
    }
  }

  // Handle inline exports: export { Foo, Bar }
  const inlineExportRegex = /export\s*\{([^}]+)\}(?!\s*from)/g;
  let match: RegExpExecArray | null = null;
  while ((match = inlineExportRegex.exec(content)) !== null) {
    const names = match[1]
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
    for (const name of names) {
      const parts = name.split(/\s+as\s+/i).map((part) => part.trim());
      const exportName = parts.length > 1 ? parts[1] : parts[0];
      if (!exportName) continue;
      if (exportName.startsWith('type ')) continue;
      // Check if this is a known type from the file
      const isType = typeNames.has(exportName);
      pushUnique({ name: exportName, isType, isDefault: false });
    }
  }

  // Handle explicit type exports: export type { Foo, Bar }
  const inlineTypeExportRegex = /export\s+type\s*\{([^}]+)\}(?!\s*from)/g;
  while ((match = inlineTypeExportRegex.exec(content)) !== null) {
    const names = match[1]
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
    for (const name of names) {
      const parts = name.split(/\s+as\s+/i).map((part) => part.trim());
      const exportName = parts.length > 1 ? parts[1] : parts[0];
      if (!exportName) continue;
      pushUnique({ name: exportName, isType: true, isDefault: false });
    }
  }

  return exports;
}

function isAutoGeneratedBarrel(filePath: string): boolean {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf-8');
  return content.includes(AUTO_MARKER);
}

function listExportableFiles(dirPath: string): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => FILE_EXTENSIONS.has(path.extname(name)))
    .filter((name) => !name.startsWith('index.'))
    .filter((name) => !name.endsWith('.test.ts'))
    .filter((name) => !name.endsWith('.test.tsx'))
    .filter((name) => !name.endsWith('.spec.ts'))
    .filter((name) => !name.endsWith('.spec.tsx'));
}

function listSubdirectories(dirPath: string): string[] {
  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => !EXCLUDED_DIRS.has(name));
}

function buildBarrelContent(dirPath: string): string | null {
  const exportLines: string[] = [];
  const relativeDir = path.relative(ROOT, dirPath).replace(/\\/g, '/');
  const header = `// ${relativeDir}/index.ts`;

  const files = listExportableFiles(dirPath);
  const subdirs = listSubdirectories(dirPath);

  for (const fileName of files.sort()) {
    const filePath = path.join(dirPath, fileName);
    const exports = parseExports(filePath);
    if (exports.length === 0) continue;
    const fileBase = `./${path.basename(fileName, path.extname(fileName))}`;
    const valueExports = exports
      .filter((entry) => !entry.isType && !entry.isDefault)
      .map((e) => e.name)
      .sort();
    const typeExports = exports
      .filter((entry) => entry.isType)
      .map((e) => e.name)
      .sort();
    if (valueExports.length > 0) {
      exportLines.push(`export { ${valueExports.join(', ')} } from '${fileBase}';`);
    }
    if (typeExports.length > 0) {
      exportLines.push(`export type { ${typeExports.join(', ')} } from '${fileBase}';`);
    }
  }

  for (const dirName of subdirs.sort()) {
    const subIndex = path.join(dirPath, dirName, 'index.ts');
    if (!fs.existsSync(subIndex)) continue;
    const exports = parseExports(subIndex);
    if (exports.length === 0) continue;
    const valueExports = exports
      .filter((entry) => !entry.isType && !entry.isDefault)
      .map((e) => e.name)
      .sort();
    const typeExports = exports
      .filter((entry) => entry.isType)
      .map((e) => e.name)
      .sort();
    if (valueExports.length > 0) {
      exportLines.push(`export { ${valueExports.join(', ')} } from './${dirName}';`);
    }
    if (typeExports.length > 0) {
      exportLines.push(`export type { ${typeExports.join(', ')} } from './${dirName}';`);
    }
  }

  if (exportLines.length === 0) return null;

  return [header, AUTO_MARKER, '', ...exportLines, ''].join('\n');
}

function syncBarrel(dirPath: string, checkOnly: boolean): { changed: boolean; created: boolean } {
  const indexPath = path.join(dirPath, 'index.ts');
  const exists = fs.existsSync(indexPath);
  const content = buildBarrelContent(dirPath);
  if (!content) return { changed: false, created: false };

  if (exists && !isAutoGeneratedBarrel(indexPath)) {
    return { changed: false, created: false };
  }

  const current = exists ? fs.readFileSync(indexPath, 'utf-8') : '';
  if (current === content) {
    return { changed: false, created: false };
  }

  if (checkOnly) {
    return { changed: true, created: !exists };
  }

  fs.writeFileSync(indexPath, content);
  return { changed: true, created: !exists };
}

function syncAllBarrels(checkOnly: boolean): BarrelResult {
  const created: string[] = [];
  const updated: string[] = [];

  for (const root of SCAN_ROOTS) {
    const fullRoot = path.join(ROOT, root);
    if (!fs.existsSync(fullRoot)) continue;
    for (const dirPath of collectDirectories(fullRoot)) {
      const result = syncBarrel(dirPath, checkOnly);
      if (!result.changed) continue;
      const relative = path.relative(ROOT, dirPath).replace(/\\/g, '/');
      if (result.created) {
        created.push(relative);
      } else {
        updated.push(relative);
      }
    }
  }

  return { created, updated };
}

function watchMode(): void {
  log('Watching for file changes...');
  const watchedDirs = new Set<string>();
  const debounceTimers = new Map<string, NodeJS.Timeout>();

  const watchDirectory = (dirPath: string): void => {
    if (watchedDirs.has(dirPath)) return;
    if (shouldSkipDir(dirPath)) return;
    watchedDirs.add(dirPath);
    const watcher = fs.watch(dirPath, { recursive: true }, () => {
      if (debounceTimers.has(dirPath)) {
        clearTimeout(debounceTimers.get(dirPath));
      }
      debounceTimers.set(
        dirPath,
        setTimeout(() => {
          const result = syncBarrel(dirPath, false);
          if (result.changed) {
            const relativePath = path.relative(ROOT, dirPath).replace(/\\/g, '/');
            const action = result.created ? 'Created' : 'Updated';
            log(`${action}: ${relativePath}/index.ts`);
          }
        }, 300),
      );
    });
    watcher.on('error', () => {});
  };

  const initial = syncAllBarrels(false);
  if (initial.created.length > 0) {
    log(`Created ${String(initial.created.length)} barrel files`);
  }
  if (initial.updated.length > 0) {
    log(`Updated ${String(initial.updated.length)} barrel files`);
  }

  for (const root of SCAN_ROOTS) {
    watchDirectory(path.join(ROOT, root));
  }

  log(`Watching ${String(watchedDirs.size)} directories...`);
}

function main(): void {
  const checkOnly = process.argv.includes('--check');
  const watch = process.argv.includes('--watch');

  if (watch) {
    watchMode();
    return;
  }

  const result = syncAllBarrels(checkOnly);
  if (checkOnly) {
    if (result.created.length > 0 || result.updated.length > 0) {
      log(
        `\n${String(result.created.length + result.updated.length)} barrel file(s) need updates.`,
      );
      if (result.created.length > 0) {
        log(`Created ${String(result.created.length)} barrel files:`);
        for (const file of result.created) {
          log(`  ${file}/index.ts`);
        }
      }
      if (result.updated.length > 0) {
        log(`Updated ${String(result.updated.length)} barrel files:`);
        for (const file of result.updated) {
          log(`  ${file}/index.ts`);
        }
      }
      process.exit(1);
    } else {
      log('All barrel files are up to date.');
    }
    return;
  }

  if (result.created.length > 0) {
    log(`Created ${String(result.created.length)} barrel files:`);
    for (const file of result.created) {
      log(`  ${file}/index.ts`);
    }
  }
  if (result.updated.length > 0) {
    log(`Updated ${String(result.updated.length)} barrel files:`);
    for (const file of result.updated) {
      log(`  ${file}/index.ts`);
    }
  }
  if (result.created.length === 0 && result.updated.length === 0) {
    log('All barrel files are up to date.');
  }
}

main();
