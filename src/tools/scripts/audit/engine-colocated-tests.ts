// src/tools/scripts/audit/engine-colocated-tests.ts
/**
 * Engine Colocated Test Audit
 *
 * Verifies a 1-to-1 mapping between source files and colocated unit tests in:
 *   src/server/engine/src/**
 *
 * Rules:
 * - For each `*.ts` file (excluding `index.ts`, `types.ts`, `*.d.ts`, and test files),
 *   there must be a colocated `basename.test.ts` or `basename.integration.test.ts`.
 * - Reports orphan tests whose corresponding `basename.ts` doesn't exist.
 *
 * Usage:
 *   pnpm audit:engine-tests
 */

import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';

type AuditResult = {
  root: string;
  sourcesConsidered: number;
  sourcesWithTest: number;
  missing: string[];
  orphanTests: string[];
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

function rel(p: string): string {
  return relative(process.cwd(), p).replaceAll(sep, '/');
}

function isTestFile(p: string): boolean {
  return (
    p.endsWith('.test.ts') ||
    p.endsWith('.integration.test.ts') ||
    p.endsWith('.spec.ts') ||
    p.endsWith('.bench.ts')
  );
}

function shouldIgnoreSource(p: string): boolean {
  const base = basename(p);
  if (base === 'index.ts' || base === 'types.ts') return true;
  if (base.endsWith('.d.ts')) return true;
  if (isTestFile(p)) return true;
  return false;
}

function hasColocatedTest(sourcePath: string): boolean {
  const dir = dirname(sourcePath);
  const base = basename(sourcePath, '.ts');
  const candidates = [
    join(dir, `${base}.test.ts`),
    join(dir, `${base}.integration.test.ts`),
    join(dir, `${base}.spec.ts`),
  ];
  return candidates.some((c) => existsSync(c));
}

function sourcePeerForTest(testPath: string): string {
  const dir = dirname(testPath);
  const name = basename(testPath);

  let base = name;
  for (const suffix of ['.integration.test.ts', '.test.ts', '.spec.ts', '.bench.ts']) {
    if (base.endsWith(suffix)) {
      base = base.slice(0, -suffix.length);
      break;
    }
  }
  return join(dir, `${base}.ts`);
}

function audit(rootDir: string): AuditResult {
  const rootAbs = resolve(rootDir);
  const files = walk(rootAbs);

  const sources = files.filter((p) => p.endsWith('.ts') && !shouldIgnoreSource(p));
  const missing: string[] = [];
  const withTest: string[] = [];

  for (const s of sources) {
    if (hasColocatedTest(s)) withTest.push(s);
    else missing.push(s);
  }

  const tests = files.filter((p) => isTestFile(p));
  const orphanTests: string[] = [];
  for (const t of tests) {
    const peer = sourcePeerForTest(t);
    if (!existsSync(peer)) orphanTests.push(t);
  }

  return {
    root: rel(rootAbs),
    sourcesConsidered: sources.length,
    sourcesWithTest: withTest.length,
    missing: missing.map(rel).sort(),
    orphanTests: orphanTests.map(rel).sort(),
  };
}

function print(result: AuditResult): void {
  console.log('Engine Colocated Test Audit');
  console.log(`- Root: ${result.root}`);
  console.log(`- Sources considered: ${result.sourcesConsidered}`);
  console.log(`- Sources with colocated test: ${result.sourcesWithTest}`);
  console.log(`- Sources missing colocated test: ${result.missing.length}`);
  console.log(`- Orphan tests: ${result.orphanTests.length}`);

  if (result.missing.length > 0) {
    console.log('\nMissing colocated tests:');
    for (const p of result.missing) console.log(`- ${p}`);
  }

  if (result.orphanTests.length > 0) {
    console.log('\nOrphan tests (no matching source peer):');
    for (const p of result.orphanTests) console.log(`- ${p}`);
  }
}

async function main(): Promise<void> {
  const result = audit('src/server/engine/src');
  print(result);

  const strict = process.argv.includes('--strict');
  if (result.missing.length > 0 || (strict && result.orphanTests.length > 0)) {
    process.exit(1);
  }
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main().catch((err) => {
    console.error('Audit crashed:', err);
    process.exit(1);
  });
}
