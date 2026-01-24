// tools/git/pre-commit.ts
/**
 * Manual pre-commit hook script.
 * Replaces lint-staged + simple-git-hooks with ~50 lines of code.
 *
 * Runs on staged files only:
 * 1. Prettier (format)
 * 2. ESLint (lint)
 * 3. Re-stages formatted files
 *
 * Then runs full checks:
 * 4. Config generation
 * 5. Type-check (turbo cached)
 */

import { execSync } from 'node:child_process';

const PRETTIER_EXTENSIONS = /\.(ts|tsx|js|jsx|cjs|mjs|cts|mts|json|css|scss|md)$/;
const ESLINT_EXTENSIONS = /\.(ts|tsx|js|jsx|cjs|mjs|cts|mts)$/;

function run(cmd: string, silent = false): string {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      stdio: silent ? 'pipe' : 'inherit',
    });
  } catch (error) {
    if (!silent) process.exit(1);
    throw error;
  }
}

function getStagedFiles(): string[] {
  const output = run('git diff --cached --name-only --diff-filter=ACMR', true);
  return output
    .split('\n')
    .map((f) => f.trim())
    .filter(Boolean);
}

function main(): void {
  console.log('\n🔍 Pre-commit checks...\n');

  const staged = getStagedFiles();
  if (staged.length === 0) {
    console.log('No staged files, skipping.\n');
    return;
  }

  // Filter by extension
  const prettierFiles = staged.filter((f) => PRETTIER_EXTENSIONS.test(f));
  const eslintFiles = staged.filter((f) => ESLINT_EXTENSIONS.test(f));

  // 1. Format staged files
  if (prettierFiles.length > 0) {
    console.log(`📝 Formatting ${String(prettierFiles.length)} files...`);
    const files = prettierFiles.map((f) => `"${f}"`).join(' ');
    run(
      `pnpm prettier --config config/.prettierrc --ignore-path config/.prettierignore --write ${files}`,
    );
    // Re-stage formatted files
    run(`git add ${files}`, true);
  }

  // 2. Lint staged files
  if (eslintFiles.length > 0) {
    console.log(`🔎 Linting ${String(eslintFiles.length)} files...`);
    const files = eslintFiles.map((f) => `"${f}"`).join(' ');
    run(
      `pnpm eslint --cache --cache-location .cache/eslint/.cache --report-unused-disable-directives --max-warnings=0 --no-warn-ignored ${files}`,
    );
  }

  // 3. Run config generation + sync scripts
  console.log('⚙️  Config generation...');
  run('pnpm config:generate');
  run('pnpm sync:headers');
  run('pnpm sync:theme');

  // 4. Type-check (turbo cached)
  console.log('🔷 Type-check...');
  run('pnpm type-check');

  console.log('\n✅ Pre-commit passed!\n');
}

main();
