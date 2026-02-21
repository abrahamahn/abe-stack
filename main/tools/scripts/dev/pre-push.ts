// main/tools/scripts/dev/pre-push.ts
/**
 * Manual pre-push hook script.
 *
 * Runs all pre-commit checks plus tests:
 * 1. Pre-commit (format, lint, config gen, type-check)
 * 2. Full test suite (turbo cached)
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
  console.log('\n🚀 Pre-push checks (Robust Mode)...\n');

  // We rely on Turbo's caching to make this fast.
  // If no files changed, this should be near-instant.
  // If files changed, it ensures strict compliance.

  // 1. Run full suite (Lint, Type-Check, Test) via Turbo for parallelism and caching.

  console.log('🧾 Verifying header sync...');
  run('pnpm sync:headers:check');

  console.log('📦 Verifying project state (Lint, Type-Check, Test)...');

  // We run changed-only validation for fast local feedback and better cache reuse.
  // Set PRE_PUSH_FULL=1 to force full workspace validation.
  const fullValidation = process.env.PRE_PUSH_FULL === '1';
  const upstreamRef = tryRunOutput("git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'");
  const changedFilter = upstreamRef ? `[${upstreamRef}]` : '[HEAD^1]';
  const validateCommand = fullValidation
    ? 'pnpm exec turbo run validate --output-logs=new-only'
    : `pnpm exec turbo run validate --filter=${changedFilter} --output-logs=new-only`;

  try {
    run(validateCommand);
  } catch {
    console.error('\n❌ Pre-push checks failed. Please fix the errors above.');
    process.exit(1);
  }

  console.log('\n✅ Pre-push passed! Ready to fly. ✈️\n');
}

main();
