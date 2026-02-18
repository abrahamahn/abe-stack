// main/tools/scripts/audit/graph-server-system.ts
/**
 * Server System Package Dependency Graph
 *
 * Generates SVG dependency graphs for each layer of main/server/system/src
 * using madge. Outputs to main/server/system/_graphs/.
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve('main', 'server', 'system');
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, '_graphs');

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const EXCLUDE = String.raw`(__tests__|\.test\.|\.spec\.)`;

const targets = [
  { name: 'system-src', dir: SRC },
  { name: 'system-cache', dir: join(SRC, 'cache') },
  { name: 'system-config', dir: join(SRC, 'config') },
  { name: 'system-geo-ip', dir: join(SRC, 'geo-ip') },
  { name: 'system-logger', dir: join(SRC, 'logger') },
  { name: 'system-mailer', dir: join(SRC, 'mailer') },
  { name: 'system-middleware', dir: join(SRC, 'middleware') },
  { name: 'system-observability', dir: join(SRC, 'observability') },
  { name: 'system-queue', dir: join(SRC, 'queue') },
  { name: 'system-routing', dir: join(SRC, 'routing') },
  { name: 'system-search', dir: join(SRC, 'search') },
  { name: 'system-security', dir: join(SRC, 'security') },
  { name: 'system-sms', dir: join(SRC, 'sms') },
  { name: 'system-storage', dir: join(SRC, 'storage') },
  { name: 'system-system', dir: join(SRC, 'system') },
  { name: 'system-utils', dir: join(SRC, 'utils') },
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
