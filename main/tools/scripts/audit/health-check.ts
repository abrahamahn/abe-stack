// main/tools/scripts/audit/health-check.ts

import { spawn, spawnSync } from 'child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

async function runAudit() {
  console.log('🔍 Starting Monorepo Health Audit...');
  console.log('   Running: turbo run lint type-check --continue\n');

  const start = Date.now();

  // We explicitly bake in --continue here regardless of package.json to be safe,
  // but since we updated package.json it's redundant but harmless.
  const child = spawn('turbo', ['run', 'lint', 'type-check', 'test', '--continue'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  let output = '';

  child.stdout?.on('data', (data) => {
    const str = data.toString();
    output += str;
    process.stdout.write(str); // Stream to user
  });

  child.stderr?.on('data', (data) => {
    const str = data.toString();
    output += str; // Capture all for parsing
    process.stderr.write(str);
  });

  child.on('close', (code) => {
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    console.log(`\n\n🏁 Audit completed in ${duration}s (Exit Code: ${code})`);

    parseOutput(output);

    // Exit with the original code
    process.exit(code ?? 1);
  });
}

function parseOutput(fullLog: string) {
  console.log('\n──────────────────────────────────────────────────────────────────────────────');
  console.log('📊 MONOREPO HEALTH REPORT');
  console.log('──────────────────────────────────────────────────────────────────────────────');

  // Regex to match standard ESLint summary line: "✖ 1377 problems (1377 errors, 0 warnings)"
  // Format may vary slightly by ESLint version or formatter, but this is standard.
  const ESLINT_REGEX = /✖ (\d+) problems \((\d+) errors, (\d+) warnings\)/;

  // Regex for TSC: "Found 12 errors." or "Found 1 error."
  const TSC_REGEX = /Found (\d+) error/;

  // We need to associate errors with packages.
  // Turbo output prefixes lines with package name colorfully, e.g. "@bslt/server:lint: ..."
  // We can scan line by line to attribute errors, or just sum totals.
  // For "Comprehensive Total", summing is sufficient.

  let totalLintErrors = 0;
  let totalLintWarnings = 0;
  let totalTypeErrors = 0;
  let totalTestErrors = 0;

  const packageStats: Record<string, { lint: number; type: number; test: number }> = {};

  // Pre-populate package list to ensure we show all packages, even those with 0 output
  interface PnpmPackageInfo {
    name?: string;
  }

  try {
    const listProc = spawnSync('pnpm', ['m', 'ls', '--json', '--depth=-1'], {
      encoding: 'utf-8',
    });
    if (listProc.error) throw listProc.error;
    if (listProc.stderr && listProc.stderr.length > 0) process.stderr.write(listProc.stderr);

    const packages = JSON.parse(listProc.stdout) as PnpmPackageInfo[];
    for (const pkg of packages) {
      if (pkg.name && pkg.name !== '@bslt/root') {
        packageStats[pkg.name] = { lint: 0, type: 0, test: 0 };
      }
    }
  } catch {
    console.warn('⚠️ Could not auto-detect package list via pnpm, trying fallback...');
    // Fallback: use find to locate package.json files
    try {
      const findProc = spawnSync(
        'find',
        ['.', '-name', 'package.json', '-not', '-path', '*/node_modules/*'],
        { encoding: 'utf-8' },
      );
      const files = findProc.stdout.split('\n').filter(Boolean);
      for (const f of files) {
        try {
          const pkgContent = readFileSync(resolve(process.cwd(), f), 'utf-8');
          const pkg = JSON.parse(pkgContent) as PnpmPackageInfo;
          if (pkg.name && pkg.name !== '@bslt/root') {
            packageStats[pkg.name] = { lint: 0, type: 0, test: 0 };
          }
        } catch {
          /* ignore invalid json */
        }
      }
    } catch {
      console.warn('⚠️ Could not auto-detect package list via fallback either.');
    }
  }

  const lines = fullLog.split('\n');
  let currentPackage = 'unknown';

  for (const rawLine of lines) {
    // Strip ANSI codes (robustly handling params like 31;1)
    const line = rawLine.replace(/\x1B\[[0-9;]*m/g, '');

    // Attempt to detect package from turbo prefix
    // Prefix might look like: "@bslt/server:lint: " or "package:command: "
    // Only works if prefix is present (turbo 2.x streams usually have it)
    const prefixMatch = line.match(/^(@?[a-zA-Z0-9\-\/]+):([a-z\-]+):/);
    if (prefixMatch) {
      currentPackage = prefixMatch[1];
    }

    // ESLint check
    const eslintMatch = ESLINT_REGEX.exec(line);
    if (eslintMatch) {
      const errors = parseInt(eslintMatch[2], 10);
      const warnings = parseInt(eslintMatch[3], 10);

      totalLintErrors += errors;
      totalLintWarnings += warnings;

      if (!packageStats[currentPackage])
        packageStats[currentPackage] = { lint: 0, type: 0, test: 0 };
      packageStats[currentPackage].lint += errors;
    }

    // TSC check
    // TSC output is often multi-line, but the summary "Found X errors" is usually printed at the end of that package's stream.
    const tscMatch = TSC_REGEX.exec(line);
    if (tscMatch) {
      const errors = parseInt(tscMatch[1], 10);
      totalTypeErrors += errors;

      if (!packageStats[currentPackage])
        packageStats[currentPackage] = { lint: 0, type: 0, test: 0 };
      packageStats[currentPackage].type += errors;
    } else {
      // Fallback: Count individual "error TS..." lines if no summary found
      if (line.includes(': error TS')) {
        totalTypeErrors++;
        if (!packageStats[currentPackage])
          packageStats[currentPackage] = { lint: 0, type: 0, test: 0 };
        packageStats[currentPackage].type++;
      }
    }
    // Jest/Vitest check: "Tests:       3 failed, 7 passed, 10 total"
    // Or "Tests  1 failed | 3 passed"
    const vitestMatch = /Tests\s+(\d+)\s+failed/.exec(line);
    if (vitestMatch) {
      const errors = parseInt(vitestMatch[1], 10);
      totalTestErrors += errors;

      if (!packageStats[currentPackage])
        packageStats[currentPackage] = { lint: 0, type: 0, test: 0 };
      packageStats[currentPackage].test += errors;
    }

    // Count individual failed test lines if summary is missed, but summaries are reliable in Vitest
  }

  console.log(`\n🔴 Total Lint Errors:   ${totalLintErrors}`);
  console.log(`🟡 Total Lint Warnings: ${totalLintWarnings}`);
  console.log(`🔵 Total Type Errors:   ${totalTypeErrors}`);
  console.log(`🟣 Total Test Errors:   ${totalTestErrors}`);
  console.log(`💥 GRAND TOTAL ISSUES:  ${totalLintErrors + totalTypeErrors + totalTestErrors}`);

  // If exit code was failure but we found 0 errors, likely a crash or config error
  if (totalLintErrors + totalTypeErrors === 0 && fullLog.includes('Exit code:')) {
    console.log('\n⚠️  WARNING: Command failed but zero standard errors were parsed.');
    console.log('   This usually indicates a configuration error, crash, or non-standard output.');
    console.log('   Check the raw output above for details.');
  }

  console.log('\n📋 Package Status:');

  const sortedStats = Object.entries(packageStats).sort(
    ([, a], [, b]) => b.lint + b.type + b.test - (a.lint + a.type + a.test),
  );

  if (sortedStats.length === 0) {
    console.log('   (No explicit summary lines found - check output details above)');
  } else {
    sortedStats.forEach(([pkg, stats]) => {
      const total = stats.lint + stats.type + stats.test;
      const statusIcon = total === 0 ? '✅' : '❌';
      console.log(
        `   ${statusIcon} ${pkg.padEnd(30)}: ${total.toString().padEnd(5)} (Lint: ${stats.lint}, Type: ${stats.type}, Test: ${stats.test})`,
      );
    });
  }
  console.log('──────────────────────────────────────────────────────────────────────────────\n');
}

// Handle unhandled Rejections to ensure we exit with error
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
  process.exit(1);
});

runAudit();
