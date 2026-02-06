// tools/scripts/git/pre-push.ts
/**
 * Manual pre-push hook script.
 *
 * Runs all pre-commit checks plus tests:
 * 1. Pre-commit (format, lint, config gen, type-check)
 * 2. Full test suite (turbo cached)
 */

import { execSync } from 'node:child_process';

function run(cmd: string): void {
  try {
    execSync(cmd, { encoding: 'utf-8', stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
}

function main(): void {
  console.log('\n🚀 Pre-push checks...\n');

  // 1. Run pre-commit checks
  console.log('📋 Running pre-commit checks...');
  run('pnpm pre-commit');

  // 2. Run full test suite
  console.log('\n🧪 Running tests...');
  run('pnpm test');

  console.log('\n✅ Pre-push passed!\n');
}

main();
