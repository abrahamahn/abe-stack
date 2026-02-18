// main/tools/scripts/audit/graph-db.ts
/**
 * DB Package Dependency Graph
 *
 * Generates SVG dependency graphs for each layer of main/server/db/src
 * using madge. Outputs to main/server/db/_graphs/.
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve('main', 'server', 'db');
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, '_graphs');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

// Exclude test files, compiled dist output, and TypeScript declaration files.
// Without /dist/ and \.d\.ts, madge follows workspace packages into their
// compiled output and reports hundreds of false circular dependencies.
const EXCLUDE = String.raw`(__tests__|\.test\.|\.spec\.|/dist/|\.d\.ts$)`;

const targets = [
  { name: 'db-src', dir: SRC },
  { name: 'db-builder', dir: join(SRC, 'builder') },
  { name: 'db-schema', dir: join(SRC, 'schema') },
  { name: 'db-repositories', dir: join(SRC, 'repositories') },
  { name: 'db-queue', dir: join(SRC, 'queue') },
  { name: 'db-search', dir: join(SRC, 'search') },
  { name: 'db-utils', dir: join(SRC, 'utils') },
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
