// tools/scripts/test/run-tests.ts
/**
 * Sequential Test Runner with Aggregated Results
 *
 * Runs tests for all packages sequentially to avoid memory issues,
 * then displays a summary with total counts.
 */

import { execSync } from 'node:child_process';
import * as path from 'node:path';

interface PackageResult {
  name: string;
  testFiles: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: string;
  success: boolean;
}

/**
 * Packages to test in order (dependencies first).
 */
const PACKAGES: Array<[string, string]> = [
  ['core', 'shared/core'],
  ['client', 'client'],
  ['stores', 'client/stores'],
  ['server', 'apps/server'],
  ['web', 'apps/web'],
];

/**
 * ANSI color codes for terminal output.
 */
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

/**
 * Strip ANSI color codes from string.
 */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * Parse vitest output to extract test counts.
 */
function parseVitestOutput(output: string): Omit<PackageResult, 'name' | 'success'> {
  const clean = stripAnsi(output);

  const testFilesMatch = clean.match(/Test Files\s+(?:(\d+) failed\s*\|\s*)?(\d+) passed/);
  const testFiles = testFilesMatch
    ? parseInt(testFilesMatch[2] ?? '0', 10) + parseInt(testFilesMatch[1] ?? '0', 10)
    : 0;

  const testsMatch = clean.match(/Tests\s+(?:(\d+) failed\s*\|\s*)?(\d+) passed(?:\s*\|\s*(\d+) skipped)?/);
  const failed = testsMatch ? parseInt(testsMatch[1] ?? '0', 10) : 0;
  const passed = testsMatch ? parseInt(testsMatch[2] ?? '0', 10) : 0;
  const skipped = testsMatch ? parseInt(testsMatch[3] ?? '0', 10) : 0;

  const durationMatch = clean.match(/Duration\s+([\d.]+s)/);
  const duration = durationMatch ? durationMatch[1] : '0s';

  return { testFiles, passed, failed, skipped, duration };
}

/**
 * Run tests for a single package.
 */
function runPackageTests(name: string, packagePath: string, verbose: boolean): PackageResult {
  const projectRoot = process.cwd();
  const pkgDir = path.join(projectRoot, packagePath);

  let output = '';
  let success = true;

  try {
    output = execSync('npx vitest run --reporter=dot --silent=passed-only', {
      cwd: pkgDir,
      encoding: 'utf8',
      stdio: verbose ? 'inherit' : 'pipe',
      env: { ...process.env, FORCE_COLOR: '1' },
    });
  } catch (err) {
    success = false;
    if (err && typeof err === 'object' && 'stdout' in err) {
      output = String(err.stdout ?? '');
    }
  }

  const parsed = parseVitestOutput(output);

  // Print progress line
  const icon = success ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
  const stats = success
    ? `${c.green}${parsed.passed} passed${c.reset}`
    : `${c.red}${parsed.failed} failed${c.reset}, ${c.green}${parsed.passed} passed${c.reset}`;
  const skipStr = parsed.skipped > 0 ? `, ${c.yellow}${parsed.skipped} skipped${c.reset}` : '';

  console.log(`  ${icon} ${c.bold}${name.padEnd(8)}${c.reset} ${stats}${skipStr} ${c.dim}(${parsed.duration})${c.reset}`);

  return { name, ...parsed, success };
}

/**
 * Print the final summary table.
 */
function printSummary(results: PackageResult[]): void {
  const totals = results.reduce(
    (acc, r) => ({
      testFiles: acc.testFiles + r.testFiles,
      passed: acc.passed + r.passed,
      failed: acc.failed + r.failed,
      skipped: acc.skipped + r.skipped,
    }),
    { testFiles: 0, passed: 0, failed: 0, skipped: 0 },
  );

  const allPassed = results.every((r) => r.success);
  const totalTests = totals.passed + totals.failed + totals.skipped;

  console.log('');
  console.log(`${c.bold}${'═'.repeat(60)}${c.reset}`);
  console.log(`${c.bold}${c.cyan}  TEST SUMMARY${c.reset}`);
  console.log(`${c.bold}${'═'.repeat(60)}${c.reset}`);
  console.log('');

  console.log(`  ${c.dim}Package${c.reset}       ${c.dim}Files${c.reset}    ${c.dim}Passed${c.reset}    ${c.dim}Failed${c.reset}   ${c.dim}Skipped${c.reset}`);
  console.log(`  ${c.dim}${'─'.repeat(54)}${c.reset}`);

  for (const r of results) {
    const status = r.success ? c.green : c.red;
    const failColor = r.failed > 0 ? c.red : c.dim;
    const skipColor = r.skipped > 0 ? c.yellow : c.dim;
    console.log(
      `  ${status}${r.name.padEnd(12)}${c.reset}  ${String(r.testFiles).padStart(5)}    ${c.green}${String(r.passed).padStart(6)}${c.reset}    ${failColor}${String(r.failed).padStart(6)}${c.reset}   ${skipColor}${String(r.skipped).padStart(7)}${c.reset}`,
    );
  }

  console.log(`  ${c.dim}${'─'.repeat(54)}${c.reset}`);
  const failTotalColor = totals.failed > 0 ? c.red + c.bold : c.dim;
  const skipTotalColor = totals.skipped > 0 ? c.yellow : c.dim;
  console.log(
    `  ${c.bold}${'Total'.padEnd(12)}${c.reset}  ${String(totals.testFiles).padStart(5)}    ${c.green}${c.bold}${String(totals.passed).padStart(6)}${c.reset}    ${failTotalColor}${String(totals.failed).padStart(6)}${c.reset}   ${skipTotalColor}${String(totals.skipped).padStart(7)}${c.reset}`,
  );
  console.log('');

  if (allPassed) {
    console.log(`  ${c.green}${c.bold}✓ All ${totalTests} tests passed${c.reset}`);
  } else {
    const failedPackages = results.filter((r) => !r.success).map((r) => r.name);
    console.log(`  ${c.red}${c.bold}✗ ${totals.failed} tests failed${c.reset} in: ${failedPackages.join(', ')}`);
  }

  console.log('');
  console.log(`${c.bold}${'═'.repeat(60)}${c.reset}`);
}

/**
 * Main entry point.
 */
function main(): void {
  const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
  const startTime = Date.now();

  console.log('');
  console.log(`${c.bold}${c.magenta}  Running tests sequentially...${c.reset}`);
  console.log('');

  const results: PackageResult[] = [];

  for (const [name, pkgPath] of PACKAGES) {
    const result = runPackageTests(name, pkgPath, verbose);
    results.push(result);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  printSummary(results);
  console.log(`  ${c.dim}Total time: ${elapsed}s${c.reset}`);
  console.log('');

  const hasFailures = results.some((r) => !r.success);
  process.exit(hasFailures ? 1 : 0);
}

main();
