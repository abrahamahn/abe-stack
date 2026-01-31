// tools/scripts/audit/health-check.ts

import { spawn } from 'child_process';

async function runAudit() {
  console.log('🔍 Starting Monorepo Health Audit...');
  console.log('   Running: turbo run lint type-check --continue\n');

  const start = Date.now();

  // We explicitly bake in --continue here regardless of package.json to be safe,
  // but since we updated package.json it's redundant but harmless.
  const child = spawn('turbo', ['run', 'lint', 'type-check', '--continue'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  let output = '';
  let stderrOutput = '';

  child.stdout?.on('data', (data) => {
    const str = data.toString();
    output += str;
    process.stdout.write(str); // Stream to user
  });

  child.stderr?.on('data', (data) => {
    const str = data.toString();
    stderrOutput += str;
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
  const eslintRegex = /✖ (\d+) problems \((\d+) errors, (\d+) warnings\)/g;

  // Regex for TSC: "Found 12 errors." or "Found 1 error."
  const tscRegex = /Found (\d+) error/;

  // We need to associate errors with packages.
  // Turbo output prefixes lines with package name colorfully, e.g. "@abe-stack/server:lint: ..."
  // We can scan line by line to attribute errors, or just sum totals.
  // For "Comprehensive Total", summing is sufficient.

  let totalLintErrors = 0;
  let totalLintWarnings = 0;
  let totalTypeErrors = 0;

  const packageStats: Record<string, { lint: number; type: number }> = {};

  const lines = fullLog.split('\n');
  let currentPackage = 'unknown';

  for (const rawLine of lines) {
    // Strip ANSI codes for accurate regex matching
    // eslint-disable-next-line no-control-regex
    const line = rawLine.replace(/\x1B\[\d+m/g, '');

    // Attempt to detect package from turbo prefix
    // Prefix might look like: "@abe-stack/server:lint: " or "package:command: "
    // Only works if prefix is present (turbo 2.x streams usually have it)
    const prefixMatch = line.match(/^(@?[a-zA-Z0-9\-\/]+):([a-z\-]+):/);
    if (prefixMatch) {
      currentPackage = prefixMatch[1];
    }

    // ESLint check
    const eslintMatch = new RegExp(/✖ (\d+) problems \((\d+) errors, (\d+) warnings\)/).exec(line);
    if (eslintMatch) {
      const errors = parseInt(eslintMatch[2], 10);
      const warnings = parseInt(eslintMatch[3], 10);

      totalLintErrors += errors;
      totalLintWarnings += warnings;

      if (!packageStats[currentPackage]) packageStats[currentPackage] = { lint: 0, type: 0 };
      packageStats[currentPackage].lint += errors;
    }

    // TSC check
    // TSC output is often multi-line, but the summary "Found X errors" is usually printed at the end of that package's stream.
    const tscMatch = new RegExp(/Found (\d+) error/).exec(line);
    if (tscMatch) {
       const errors = parseInt(tscMatch[1], 10);
       totalTypeErrors += errors;

       if (!packageStats[currentPackage]) packageStats[currentPackage] = { lint: 0, type: 0 };
       packageStats[currentPackage].type += errors;
    } else {
       // Fallback: Count individual "error TS..." lines if no summary found
       if (line.includes(': error TS')) {
          totalTypeErrors++;
           if (!packageStats[currentPackage]) packageStats[currentPackage] = { lint: 0, type: 0 };
           packageStats[currentPackage].type++;
       }
    }
  }

  console.log(`\n🔴 Total Lint Errors:   ${totalLintErrors}`);
  console.log(`🟡 Total Lint Warnings: ${totalLintWarnings}`);
  console.log(`🔵 Total Type Errors:   ${totalTypeErrors}`);
  console.log(`💥 GRAND TOTAL ISSUES:  ${totalLintErrors + totalTypeErrors}`);

  console.log('\n📋 Breakdown by Package (Top Offenders):');

  const sortedStats = Object.entries(packageStats)
    .sort(([, a], [, b]) => (b.lint + b.type) - (a.lint + a.type));

  if (sortedStats.length === 0) {
     console.log('   (No explicit summary lines found - check output details above)');
  } else {
    sortedStats.forEach(([pkg, stats]) => {
      const total = stats.lint + stats.type;
      console.log(`   - ${pkg.padEnd(30)}: ${total.toString().padEnd(5)} (Lint: ${stats.lint}, Type: ${stats.type})`);
    });
  }
  console.log('──────────────────────────────────────────────────────────────────────────────\n');
}

runAudit();
