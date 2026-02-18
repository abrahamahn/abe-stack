#!/usr/bin/env tsx
// main/tools/scripts/audit/server-dependency-dag.ts
/**
 * Server Dependency DAG Audit
 *
 * Generates a package-level dependency DAG and import-edge counts for:
 * - main/server/*
 * - main/apps/server
 *
 * Usage:
 *   pnpm audit:server-dag
 *   pnpm audit:server-dag --write
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

interface PackageSpec {
  name: string;
  path: string;
  label: string;
}

interface WorkspacePackageJson {
  dependencies?: Record<string, string>;
}

const ROOT = resolve(__dirname, '..', '..', '..', '..');
const OUTPUT_FILE = resolve(ROOT, 'docs/architecture/server-dependency-dag.md');
const today = new Date().toISOString().slice(0, 10);

const TARGET_PACKAGES: ReadonlyArray<PackageSpec> = [
  { name: '@bslt/server', path: 'main/apps/server', label: 'apps/server' },
  { name: '@bslt/core', path: 'main/server/core', label: 'server/core' },
  { name: '@bslt/server-engine', path: 'main/server/engine', label: 'server/engine' },
  { name: '@bslt/realtime', path: 'main/server/realtime', label: 'server/realtime' },
  { name: '@bslt/websocket', path: 'main/server/websocket', label: 'server/websocket' },
  { name: '@bslt/media', path: 'main/server/media', label: 'server/media' },
  { name: '@bslt/db', path: 'main/server/db', label: 'server/db' },
  { name: '@bslt/shared', path: 'main/shared', label: 'shared' },
];

const packageByName = new Map(TARGET_PACKAGES.map((pkg) => [pkg.name, pkg]));
const packageNames = new Set(TARGET_PACKAGES.map((pkg) => pkg.name));
const SOURCE_AUDIT_PACKAGES = TARGET_PACKAGES.filter((pkg) => pkg.name !== '@bslt/shared');

function hasArg(flag: string): boolean {
  return process.argv.includes(flag);
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, 'utf8')) as T;
}

function getWorkspaceDeps(pkg: PackageSpec): string[] {
  const packageJsonPath = resolve(ROOT, pkg.path, 'package.json');
  const packageJson = readJson<WorkspacePackageJson>(packageJsonPath);
  const deps = Object.keys(packageJson.dependencies ?? {});
  return deps.filter((dep) => packageNames.has(dep));
}

function walkSourceFiles(dir: string): string[] {
  const files: string[] = [];

  const visit = (current: string): void => {
    for (const entry of readdirSync(current)) {
      if (entry === 'node_modules' || entry === 'dist') continue;
      const full = join(current, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        visit(full);
        continue;
      }
      if (/\.(ts|tsx|mts|cts)$/.test(entry)) {
        files.push(full);
      }
    }
  };

  visit(dir);
  return files;
}

function collectImportCounts(): Map<string, number> {
  const counts = new Map<string, number>();
  const importRegex =
    /from\s+['"](@bslt\/(?:server|core|server-engine|realtime|websocket|media|db|shared)(?:\/[^'"]*)?)['"]/g;

  for (const pkg of SOURCE_AUDIT_PACKAGES) {
    const srcDir = resolve(ROOT, pkg.path, 'src');
    const files = walkSourceFiles(srcDir);

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      let match: RegExpExecArray | null = null;
      while ((match = importRegex.exec(content)) !== null) {
        const fullImport = match[1];
        const target = fullImport.split('/').slice(0, 2).join('/');
        if (!packageNames.has(target)) continue;
        const key = `${pkg.name} -> ${target}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
  }

  return counts;
}

function renderMermaid(workspaceDeps: Map<string, string[]>): string {
  const lines: string[] = [];
  lines.push('```mermaid');
  lines.push('graph TD');

  const mermaidId = (pkgName: string): string =>
    pkgName.replace('@bslt/', '').replace(/-/g, '_').replace('/', '_');

  for (const pkg of TARGET_PACKAGES) {
    lines.push(`  ${mermaidId(pkg.name)}["${pkg.label}"]`);
  }

  for (const [from, deps] of workspaceDeps.entries()) {
    for (const dep of deps) {
      lines.push(`  ${mermaidId(from)} --> ${mermaidId(dep)}`);
    }
  }

  lines.push('```');
  return lines.join('\n');
}

function renderMarkdown(): string {
  const workspaceDeps = new Map<string, string[]>();
  for (const pkg of TARGET_PACKAGES) {
    workspaceDeps.set(pkg.name, getWorkspaceDeps(pkg));
  }

  const importCounts = collectImportCounts();
  const importRows = [...importCounts.entries()]
    .filter(([edge]) => !edge.startsWith('@bslt/shared -> '))
    .filter(([edge]) => !edge.endsWith(' -> @bslt/shared'))
    .filter(([edge]) => {
      const [from, to] = edge.split(' -> ');
      return from !== to;
    })
    .sort((a, b) => b[1] - a[1]);

  const pkgRows = TARGET_PACKAGES.map((pkg) => {
    const deps = workspaceDeps.get(pkg.name) ?? [];
    const depLabels = deps.map((name) => packageByName.get(name)?.label ?? name).join(', ') || '—';
    return `| \`${pkg.label}\` | \`${pkg.name}\` | ${depLabels} |`;
  }).join('\n');

  const edgeRows = importRows
    .map(([edge, count]) => {
      const [from, to] = edge.split(' -> ');
      const fromLabel = packageByName.get(from)?.label ?? from;
      const toLabel = packageByName.get(to)?.label ?? to;
      return `| \`${fromLabel}\` | \`${toLabel}\` | ${String(count)} |`;
    })
    .join('\n');

  return [
    '# Server Dependency DAG',
    '',
    `Last generated: ${today}`,
    '',
    '## Package DAG (workspace dependencies)',
    '',
    renderMermaid(workspaceDeps),
    '',
    '| Layer | Package | Workspace deps |',
    '| --- | --- | --- |',
    pkgRows,
    '',
    '## Import Edge Hotspots (source-level)',
    '',
    '> Counts are import occurrences across `main/apps/server/src` + `main/server/*/src`.',
    '> Self-imports and `-> shared` edges are excluded from this hotspot list.',
    '',
    '| From | To | Import count |',
    '| --- | --- | ---: |',
    edgeRows,
    '',
    '## Refactor Guidance',
    '',
    '- Keep `server/core` as reusable domain/business logic package.',
    '- Keep `apps/server` as composition/integration shell (bootstrap, wiring, plugins, runtime registration).',
    '- Move code from `server/core` to `apps/server` only when it is app-runtime-specific.',
    '- App-runtime-specific examples: Fastify plugin lifecycle, process/env bootstrap, app-only adapters.',
    '- Do not collapse `server/core` into `apps/server`; this would couple domain logic to app runtime and reduce testability/reuse.',
    '',
  ].join('\n');
}

function main(): void {
  const markdown = renderMarkdown();

  if (hasArg('--write')) {
    writeFileSync(OUTPUT_FILE, markdown, 'utf8');
    console.log(`Wrote ${OUTPUT_FILE}`);
    return;
  }

  console.log(markdown);
}

main();
