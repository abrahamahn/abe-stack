// main/tools/scripts/dev/pre-push.ts
/**
 * Manual pre-push hook script.
 *
 * CI-parity by default (matches .github/workflows/continuous-integration.yml global-checks):
 * 1. Header consistency check
 * 2. Format check (CI mode)
 * 3. Lint (workspace)
 * 4. Storybook build validation
 *
 * Set PRE_PUSH_FAST=1 to run changed-scope lint + type-check instead.
 */

import { execSync } from 'child_process';

function run(cmd: string): void {
  try {
    execSync(cmd, { encoding: 'utf-8', stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
}

function tryRunOutput(cmd: string): string | null {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function main(): void {
  const fastMode = process.env.PRE_PUSH_FAST === '1';
  console.log(`\n🚀 Pre-push checks (${fastMode ? 'Fast Mode' : 'CI-Parity Mode'})...\n`);

  console.log('🧾 Verifying header sync...');
  run('pnpm sync:headers:check');

  if (!fastMode) {
    console.log('🧪 Running CI-parity local pipeline...');
    run('pnpm ci:local');

    console.log('\n✅ Pre-push passed (CI parity checks)!\n');
    return;
  }

  console.log('📦 Verifying project state (lint + type-check, changed scope)...');
  const upstreamRef = tryRunOutput("git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'");
  const changedFilter = upstreamRef ? `[${upstreamRef}]` : '[HEAD^1]';
  const validateCommand = `pnpm exec turbo run lint type-check --filter=${changedFilter} --output-logs=new-only`;

  try {
    run(validateCommand);
  } catch {
    console.error('\n❌ Pre-push checks failed. Please fix the errors above.');
    process.exit(1);
  }

  console.log('\n✅ Pre-push passed (fast mode)!\n');
}

main();
