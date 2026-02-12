// src/tools/scripts/audit/colocated-test-pairs.ts
/**
 * Colocated Test Pair Audit
 *
 * Enforces colocated test/source pairing for unit tests.
 *
 * Default mode:
 * - Fails on orphan colocated unit tests (test file exists without source peer).
 *
 * Strict mode (`--strict`):
 * - Also fails on source files that require tests but do not have a colocated peer.
 *
 * Exclusions:
 * - Integration/e2e/smoke tests
 * - `__tests__` folders
 * - `index.*`, `types.*`, declaration files
 * - `src/shared/**` for source->test strict checks (shared is validated with broader integration tests)
 */

import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';

const ROOTS = ['src/apps', 'src/client', 'src/server', 'src/shared'] as const;
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs']);

function toPosix(pathValue: string): string {
  return pathValue.replaceAll(sep, '/');
}

function rel(pathValue: string): string {
  return toPosix(relative(process.cwd(), pathValue));
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (
      entry.name === 'node_modules' ||
      entry.name === 'dist' ||
      entry.name === 'build' ||
      entry.name === 'coverage' ||
      entry.name === '.cache' ||
      entry.name === '.turbo' ||
      entry.name === '.next'
    ) {
      continue;
    }

    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(fullPath));
    else out.push(fullPath);
  }
  return out;
}

function isTestFile(pathValue: string): boolean {
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(pathValue);
}

function isIntegrationStyleTest(pathValue: string): boolean {
  return (
    pathValue.includes('/__tests__/') ||
    pathValue.includes('.integration.test.') ||
    pathValue.includes('integration.test.') ||
    pathValue.includes('.e2e.') ||
    pathValue.includes('.smoke.')
  );
}

function sourcePeersForTest(testPath: string): string[] {
  const dir = dirname(testPath);
  const file = basename(testPath);

  let stem = file.replace(/\.(test|spec)\.(ts|tsx|js|jsx)$/, '');
  stem = stem.replace(/\.integration$/, '').replace(/\.bench$/, '');

  const peers: string[] = [];
  for (const ext of SOURCE_EXTENSIONS) {
    peers.push(join(dir, `${stem}${ext}`));
    peers.push(join(dir, stem, `index${ext}`));
  }
  return peers;
}

function hasSourcePeer(testPath: string): boolean {
  return sourcePeersForTest(testPath).some((candidate) => existsSync(candidate));
}

function shouldRequireColocatedTest(sourcePath: string): boolean {
  const normalized = toPosix(sourcePath);
  const base = basename(sourcePath);
  const ext = extname(sourcePath);

  if (!SOURCE_EXTENSIONS.has(ext)) return false;
  if (base.endsWith('.d.ts')) return false;
  if (isTestFile(normalized)) return false;
  if (isIntegrationStyleTest(normalized)) return false;
  if (base === 'index.ts' || base === 'index.tsx' || base === 'index.js' || base === 'index.jsx')
    return false;
  if (base === 'types.ts' || base === 'types.tsx' || base === 'types.js' || base === 'types.jsx')
    return false;
  if (base.includes('.stories.')) return false;
  if (base.includes('.config.')) return false;

  // Shared package is validated by broader contract/integration coverage.
  if (normalized.startsWith('src/shared/')) return false;

  return true;
}

function hasTestPeer(sourcePath: string): boolean {
  const dir = dirname(sourcePath);
  const base = basename(sourcePath, extname(sourcePath));
  const candidates = [
    join(dir, `${base}.test.ts`),
    join(dir, `${base}.test.tsx`),
    join(dir, `${base}.test.js`),
    join(dir, `${base}.test.jsx`),
    join(dir, `${base}.spec.ts`),
    join(dir, `${base}.spec.tsx`),
    join(dir, `${base}.spec.js`),
    join(dir, `${base}.spec.jsx`),
  ];
  return candidates.some((candidate) => existsSync(candidate));
}

function main(): void {
  const strict = process.argv.includes('--strict');
  const roots = ROOTS.map((root) => resolve(root)).filter((root) => existsSync(root));

  const files = roots.flatMap((root) => walk(root));
  const normalizedFiles = files.map((pathValue) => toPosix(pathValue));

  const orphanTests = normalizedFiles
    .filter((pathValue) => isTestFile(pathValue))
    .filter((pathValue) => !isIntegrationStyleTest(pathValue))
    .filter((pathValue) => !hasSourcePeer(pathValue))
    .map((pathValue) => rel(pathValue))
    .sort();

  const missingTests = strict
    ? normalizedFiles
        .filter((pathValue) => shouldRequireColocatedTest(pathValue))
        .filter((pathValue) => !hasTestPeer(pathValue))
        .map((pathValue) => rel(pathValue))
        .sort()
    : [];

  if (orphanTests.length === 0 && missingTests.length === 0) {
    console.log('Colocated test pair audit passed.');
    return;
  }

  if (orphanTests.length > 0) {
    console.error('Orphan unit tests (no colocated source peer):');
    for (const pathValue of orphanTests) console.error(`- ${pathValue}`);
  }

  if (strict && missingTests.length > 0) {
    console.error('Source files missing colocated tests (strict mode):');
    for (const pathValue of missingTests) console.error(`- ${pathValue}`);
  }

  process.exit(1);
}

main();
