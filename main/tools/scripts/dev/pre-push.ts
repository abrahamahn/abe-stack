// main/tools/scripts/dev/pre-push.ts
/**
 * Manual pre-push hook script.
 *
 * Fast by default:
 * 1. Header consistency check
 * 2. Changed-scope lint + type-check
 *
 * Set PRE_PUSH_FULL=1 to run full workspace validate (slow).
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
  console.log('\n🚀 Pre-push checks (Fast Mode)...\n');

  console.log('🧾 Verifying header sync...');
  run('pnpm sync:headers:check');

  console.log('📦 Verifying project state (lint + type-check)...');

  // Default is changed-only and avoids full test execution locally.
  // CI remains the authoritative full gate.
  const fullValidation = process.env.PRE_PUSH_FULL === '1';
  const upstreamRef = tryRunOutput("git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'");
  const changedFilter = upstreamRef ? `[${upstreamRef}]` : '[HEAD^1]';
  const validateCommand = fullValidation
    ? 'pnpm exec turbo run validate --output-logs=new-only'
    : `pnpm exec turbo run lint type-check --filter=${changedFilter} --output-logs=new-only`;

  try {
    run(validateCommand);
  } catch {
    console.error('\n❌ Pre-push checks failed. Please fix the errors above.');
    process.exit(1);
  }

  console.log('\n✅ Pre-push passed! Ready to fly. ✈️\n');
}

main();
