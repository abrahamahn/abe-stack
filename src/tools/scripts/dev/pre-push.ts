// src/tools/scripts/dev/pre-push.ts
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

function main(): void {
  console.log('\n🚀 Pre-push checks (Robust Mode)...\n');

  // We rely on Turbo's caching to make this fast.
  // If no files changed, this should be near-instant.
  // If files changed, it ensures strict compliance.

  // 1. Run full suite (Lint, Type-Check, Test)
  // We use the `check:all` alias but run it via Turbo to ensure parallelism and caching
  // actually, `check:all` in package.json is a serial script.
  // Let's invoke turbo directly for maximum speed.

  console.log('🧾 Verifying header sync...');
  run('pnpm sync:headers:check');

  console.log('📦 Verifying project state (Lint, Type-Check, Test)...');

  // We run 'validate' pipeline which includes lint, type-check, and test
  // This is defined in turbo.json
  try {
    run('npx turbo run validate --output-logs=new-only');
  } catch {
    console.error('\n❌ Pre-push checks failed. Please fix the errors above.');
    process.exit(1);
  }

  console.log('\n✅ Pre-push passed! Ready to fly. ✈️\n');
}

main();
