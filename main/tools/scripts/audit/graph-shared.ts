// main/tools/scripts/audit/graph-shared.ts
/**
 * Shared Package Dependency Graph
 *
 * Generates SVG dependency graphs for each layer of main/shared/src
 * using madge. Outputs to main/shared/_graphs/.
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve('main', 'shared');
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, '_graphs');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

// Exclude test files, compiled dist output, and TypeScript declaration files.
// Without /dist/ and \.d\.ts, madge follows workspace packages into their
// compiled output and reports hundreds of false circular dependencies.
const EXCLUDE = String.raw`(__tests__|\.test\.|\.spec\.|/dist/|\.d\.ts$)`;

const targets = [
  { name: 'shared-src', dir: SRC },
  { name: 'shared-primitives', dir: join(SRC, 'primitives') },
  { name: 'shared-system', dir: join(SRC, 'system') },
  { name: 'shared-core', dir: join(SRC, 'core') },
  { name: 'shared-contracts', dir: join(SRC, 'contracts') },
  { name: 'shared-api', dir: join(SRC, 'api') },
  { name: 'shared-config', dir: join(SRC, 'config') },
];

for (const t of targets) {
  if (!existsSync(t.dir)) {
    console.log(`\nSkipping ${t.name} (directory not found)`);
    continue;
  }
  const outFile = join(OUT, `${t.name}.svg`);
  const cmd = [
    'npx madge',
    `"${t.dir}"`,
    `--ts-config "${join(ROOT, 'tsconfig.json')}"`,
    '--extensions ts',
    `--exclude "${EXCLUDE}"`,
    `--image "${outFile}"`,
  ].join(' ');

  console.log(`\n> ${t.name}`);
  execSync(cmd, { stdio: 'inherit' });
}

console.log(`\nGraphs written to: ${OUT}`);
