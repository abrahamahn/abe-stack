// main/tools/scripts/audit/graph-server.ts
/**
 * Server App Dependency Graph
 *
 * Generates SVG dependency graphs for each layer of main/apps/server/src
 * using madge. Outputs to main/apps/server/_graphs/.
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve('main', 'apps', 'server');
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, '_graphs');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

// Exclude test files, compiled dist output, and TypeScript declaration files.
// Without /dist/ and \.d\.ts, madge follows workspace packages into their
// compiled output and reports hundreds of false circular dependencies.
const EXCLUDE = String.raw`(__tests__|\.test\.|\.spec\.|/dist/|\.d\.ts$)`;

const targets = [
  { name: 'server-src', dir: SRC },
  { name: 'server-config', dir: join(SRC, 'config') },
  { name: 'server-http', dir: join(SRC, 'http') },
  { name: 'server-middleware', dir: join(SRC, 'middleware') },
  { name: 'server-routes', dir: join(SRC, 'routes') },
  { name: 'server-types', dir: join(SRC, 'types') },
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
