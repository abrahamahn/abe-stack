// main/tools/scripts/dev/workflow-dump.ts
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface Args {
  runId?: string;
  branch: string;
  outDir: string;
}

function run(cmd: string): string {
  return execSync(cmd, {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    branch: 'main',
    outDir: '.artifacts/workflow-dumps',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      console.log(
        [
          'Usage: pnpm workflow:dump [--run-id <id>] [--branch <name>] [--out-dir <path>]',
          '',
          'Examples:',
          '  pnpm workflow:dump --run-id 123456789',
          '  pnpm workflow:dump --branch main',
          '',
          'Behavior:',
          '  - If --run-id is omitted, resolves latest failed run on branch (default: main).',
          '  - If no failed run exists, falls back to latest run on branch.',
        ].join('\n'),
      );
      process.exit(0);
    }

    if (arg === '--run-id' && argv[i + 1] != null) {
      args.runId = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--branch' && argv[i + 1] != null) {
      args.branch = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--out-dir' && argv[i + 1] != null) {
      args.outDir = argv[i + 1];
      i += 1;
      continue;
    }
  }

  return args;
}

function resolveRunId(branch: string): string {
  const failed = run(
    `gh run list --branch "${branch}" --status failure --limit 1 --json databaseId -q '.[0].databaseId' || true`,
  );
  if (failed) return failed;

  const latest = run(
    `gh run list --branch "${branch}" --limit 1 --json databaseId -q '.[0].databaseId'`,
  );
  if (!latest) {
    throw new Error(`No workflow runs found for branch "${branch}".`);
  }
  return latest;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));

  try {
    run('gh --version');
  } catch {
    console.error('GitHub CLI (gh) is required. Install it and run `gh auth login`.');
    process.exit(1);
  }

  const runId = args.runId ?? resolveRunId(args.branch);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseDir = resolve(args.outDir, `${runId}-${timestamp}`);
  mkdirSync(baseDir, { recursive: true });

  const metaText = run(`gh run view ${runId}`);
  writeFileSync(resolve(baseDir, 'run-meta.txt'), `${metaText}\n`, 'utf-8');

  const metaJson = run(
    `gh run view ${runId} --json databaseId,name,workflowName,headBranch,headSha,status,conclusion,url,event,createdAt,startedAt,updatedAt,jobs`,
  );
  writeFileSync(resolve(baseDir, 'run-meta.json'), `${metaJson}\n`, 'utf-8');

  const failedLogs = run(`gh run view ${runId} --log-failed || true`);
  writeFileSync(resolve(baseDir, 'run-failed.log'), `${failedLogs}\n`, 'utf-8');

  const fullLogs = run(`gh run view ${runId} --log`);
  writeFileSync(resolve(baseDir, 'run-full.log'), `${fullLogs}\n`, 'utf-8');

  const reviewBundle = [
    '=== RUN META ===',
    metaText,
    '',
    '=== FAILED LOGS ===',
    failedLogs || '(no failed logs found)',
    '',
    '=== FULL LOGS ===',
    fullLogs,
  ].join('\n');
  const bundlePath = resolve(baseDir, 'workflow-review.txt');
  writeFileSync(bundlePath, `${reviewBundle}\n`, 'utf-8');

  console.log(`Saved workflow dump for run ${runId} in: ${baseDir}`);
  console.log(`Single-file review bundle: ${bundlePath}`);
}

main();
