#!/usr/bin/env node
// tools/sync/sync-tsconfig.ts
/**
 * Synchronizes TypeScript project references for workspace packages/apps.
 *
 * Usage:
 *   pnpm sync:tsconfig        # Sync once
 *   pnpm sync:tsconfig:check  # Check if up to date
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

const WORKSPACE_FILE = path.join(ROOT, 'pnpm-workspace.yaml');
const ROOT_TSCONFIG = path.join(ROOT, 'tsconfig.json');

const isCheckOnly = process.argv.includes('--check');
const isQuiet = process.argv.includes('--quiet');

function log(...args: unknown[]): void {
  if (!isQuiet) console.log(...args);
}

function readJson(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;
}

function writeJson(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function parseWorkspaceGlobs(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf-8');
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

function expandWorkspacePattern(pattern: string): string[] {
  const normalized = pattern.replace(/\\/g, '/').replace(/\/$/, '');
  if (!normalized.includes('*')) {
    return [path.join(ROOT, normalized)];
  }

  if (normalized.endsWith('/*')) {
    const baseDir = path.join(ROOT, normalized.slice(0, -2));
    if (!fs.existsSync(baseDir)) return [];
    return fs
      .readdirSync(baseDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(baseDir, entry.name));
  }

  return [];
}

type WorkspaceProject = {
  name: string;
  dir: string;
  tsconfigPath: string;
};

function getWorkspaceProjects(): WorkspaceProject[] {
  if (!fs.existsSync(WORKSPACE_FILE)) return [];
  const patterns = parseWorkspaceGlobs(WORKSPACE_FILE);
  const dirs = new Set<string>();

  for (const pattern of patterns) {
    for (const dir of expandWorkspacePattern(pattern)) {
      dirs.add(dir);
    }
  }

  const projects: WorkspaceProject[] = [];
  for (const dir of dirs) {
    const pkgPath = path.join(dir, 'package.json');
    const tsconfigPath = path.join(dir, 'tsconfig.json');
    if (!fs.existsSync(pkgPath) || !fs.existsSync(tsconfigPath)) continue;
    const pkg = readJson(pkgPath) as { name?: string };
    if (!pkg.name) continue;
    projects.push({ name: pkg.name, dir, tsconfigPath });
  }

  return projects.sort((a, b) => a.dir.localeCompare(b.dir));
}

function normalizeRelativePath(fromDir: string, toDir: string): string {
  let rel = path.relative(fromDir, toDir).replace(/\\/g, '/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

type PackageJsonDeps = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

function collectWorkspaceDeps(pkg: PackageJsonDeps): Set<string> {
  const deps = new Set<string>();
  for (const section of [
    pkg.dependencies,
    pkg.devDependencies,
    pkg.peerDependencies,
    pkg.optionalDependencies,
  ]) {
    if (!section) continue;
    for (const name of Object.keys(section)) deps.add(name);
  }
  return deps;
}

function syncProjectReferences(
  project: WorkspaceProject,
  nameToProject: Map<string, WorkspaceProject>,
  checkOnly: boolean,
): boolean {
  const tsconfig = readJson(project.tsconfigPath) as Record<string, unknown>;
  const pkg = readJson(path.join(project.dir, 'package.json')) as PackageJsonDeps;
  const deps = collectWorkspaceDeps(pkg);

  const references = Array.from(deps)
    .filter((dep) => nameToProject.has(dep))
    .map((dep) => nameToProject.get(dep))
    .filter((depProject): depProject is WorkspaceProject => Boolean(depProject))
    .filter((depProject) => depProject.dir !== project.dir)
    .map((depProject) => ({ path: normalizeRelativePath(project.dir, depProject.dir) }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const next = { ...tsconfig } as Record<string, unknown>;

  if (references.length > 0) {
    next.references = references;
  } else if ('references' in next) {
    delete next.references;
  }

  const changed = JSON.stringify(tsconfig) !== JSON.stringify(next);
  if (changed && !checkOnly) writeJson(project.tsconfigPath, next);
  return !changed;
}

function syncRootReferences(projects: WorkspaceProject[], checkOnly: boolean): boolean {
  if (!fs.existsSync(ROOT_TSCONFIG)) return true;
  const tsconfig = readJson(ROOT_TSCONFIG) as Record<string, unknown>;
  const references = projects
    .map((project) => ({
      path: normalizeRelativePath(path.dirname(ROOT_TSCONFIG), project.dir),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const next = { ...tsconfig } as Record<string, unknown>;
  next.references = references;
  const changed = JSON.stringify(tsconfig) !== JSON.stringify(next);
  if (changed && !checkOnly) writeJson(ROOT_TSCONFIG, next);
  return !changed;
}

function main(): void {
  const projects = getWorkspaceProjects();
  if (projects.length === 0) {
    console.error('No workspace projects found.');
    process.exit(1);
  }

  const nameToProject = new Map(projects.map((p) => [p.name, p]));

  const okRoot = syncRootReferences(projects, isCheckOnly);
  const okProjects = projects.map((p) => syncProjectReferences(p, nameToProject, isCheckOnly));
  const okAll = okRoot && okProjects.every(Boolean);

  if (isCheckOnly && !okAll) {
    console.error('tsconfig references are out of sync. Run "pnpm sync:tsconfig".');
    process.exit(1);
  }

  if (!isCheckOnly) {
    log('✓ tsconfig references synced.');
  }
}

main();
