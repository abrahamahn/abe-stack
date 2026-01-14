#!/usr/bin/env tsx
// tools/dev/bundle-size.ts
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Bundle Size Benchmark Tool
 *
 * Measures and reports bundle sizes for the UI package and web app.
 * Useful for tracking size regressions as the codebase grows.
 *
 * Usage:
 *   tsx tools/dev/bundle-size.ts           # Measure all packages
 *   tsx tools/dev/bundle-size.ts --json    # Output as JSON
 *   tsx tools/dev/bundle-size.ts --save    # Save to benchmark history
 */

type BundleInfo = {
  name: string;
  path: string;
  size: number;
  gzipSize: number;
};

type BenchmarkResult = {
  timestamp: string;
  commit?: string;
  packages: Record<string, BundleInfo[]>;
  totals: Record<string, { size: number; gzipSize: number }>;
};

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const BENCHMARK_FILE = path.join(ROOT_DIR, '.bundle-sizes.json');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'] as const;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = parseFloat((bytes / Math.pow(k, i)).toFixed(2));
  const unit = sizes[i] ?? 'B';
  return `${String(value)} ${unit}`;
}

function getGzipSize(filePath: string): number {
  try {
    const result = execSync(`gzip -c "${filePath}" | wc -c`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    return parseInt(result.trim(), 10);
  } catch {
    return 0;
  }
}

function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

function getGitCommit(): string | undefined {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return undefined;
  }
}

function findFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  function walkDir(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walkDir(fullPath);
        }
      } else if (entry.isFile()) {
        if (extensions.some((ext) => entry.name.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    }
  }

  walkDir(dir);
  return files;
}

function measurePackage(name: string, distPath: string): BundleInfo[] {
  const bundles: BundleInfo[] = [];
  const jsFiles = findFiles(distPath, ['.js', '.mjs', '.cjs']);
  const cssFiles = findFiles(distPath, ['.css']);

  for (const file of [...jsFiles, ...cssFiles]) {
    const size = getFileSize(file);
    if (size > 0) {
      bundles.push({
        name: path.relative(distPath, file),
        path: file,
        size,
        gzipSize: getGzipSize(file),
      });
    }
  }

  // Sort by size descending
  bundles.sort((a, b) => b.size - a.size);
  return bundles;
}

function printTable(bundles: BundleInfo[], packageName: string): void {
  console.log(`\n${colors.bold}${colors.blue}${packageName}${colors.reset}`);
  console.log(`${colors.dim}${'─'.repeat(70)}${colors.reset}`);

  if (bundles.length === 0) {
    console.log(`${colors.yellow}  No build output found. Run 'pnpm build' first.${colors.reset}`);
    return;
  }

  // Header
  console.log(
    `${colors.dim}  ${'File'.padEnd(40)} ${'Size'.padStart(12)} ${'Gzip'.padStart(12)}${colors.reset}`,
  );
  console.log(
    `${colors.dim}  ${'─'.repeat(40)} ${'─'.repeat(12)} ${'─'.repeat(12)}${colors.reset}`,
  );

  let totalSize = 0;
  let totalGzip = 0;

  for (const bundle of bundles) {
    const name = bundle.name.length > 38 ? '...' + bundle.name.slice(-35) : bundle.name;
    const sizeStr = formatBytes(bundle.size);
    const gzipStr = formatBytes(bundle.gzipSize);

    // Color code by size
    let sizeColor = colors.green;
    if (bundle.size > 100 * 1024) sizeColor = colors.yellow;
    if (bundle.size > 500 * 1024) sizeColor = colors.red;

    console.log(
      `  ${name.padEnd(40)} ${sizeColor}${sizeStr.padStart(12)}${colors.reset} ${colors.cyan}${gzipStr.padStart(12)}${colors.reset}`,
    );

    totalSize += bundle.size;
    totalGzip += bundle.gzipSize;
  }

  console.log(
    `${colors.dim}  ${'─'.repeat(40)} ${'─'.repeat(12)} ${'─'.repeat(12)}${colors.reset}`,
  );
  console.log(
    `  ${colors.bold}${'Total'.padEnd(40)}${colors.reset} ${colors.bold}${formatBytes(totalSize).padStart(12)}${colors.reset} ${colors.bold}${formatBytes(totalGzip).padStart(12)}${colors.reset}`,
  );
}

function compareWithPrevious(current: BenchmarkResult): void {
  if (!fs.existsSync(BENCHMARK_FILE)) {
    return;
  }

  try {
    const history = JSON.parse(fs.readFileSync(BENCHMARK_FILE, 'utf-8')) as BenchmarkResult[];
    if (history.length === 0) return;

    const previous = history[history.length - 1];

    console.log(`\n${colors.bold}${colors.blue}Comparison with previous${colors.reset}`);
    console.log(
      `${colors.dim}Previous: ${previous.timestamp} (${previous.commit || 'unknown'})${colors.reset}`,
    );
    console.log(`${colors.dim}${'─'.repeat(70)}${colors.reset}`);

    for (const [pkg, totals] of Object.entries(current.totals)) {
      const prevTotals = previous.totals[pkg];
      if (!prevTotals) continue;

      const sizeDiff = totals.size - prevTotals.size;
      const gzipDiff = totals.gzipSize - prevTotals.gzipSize;

      const sizeChange =
        sizeDiff === 0
          ? '='
          : sizeDiff > 0
            ? `+${formatBytes(sizeDiff)}`
            : `-${formatBytes(-sizeDiff)}`;
      const gzipChange =
        gzipDiff === 0
          ? '='
          : gzipDiff > 0
            ? `+${formatBytes(gzipDiff)}`
            : `-${formatBytes(-gzipDiff)}`;

      const sizeColor = sizeDiff > 0 ? colors.red : sizeDiff < 0 ? colors.green : colors.dim;
      const gzipColor = gzipDiff > 0 ? colors.red : gzipDiff < 0 ? colors.green : colors.dim;

      console.log(
        `  ${pkg.padEnd(20)} Size: ${sizeColor}${sizeChange.padStart(12)}${colors.reset}  Gzip: ${gzipColor}${gzipChange.padStart(12)}${colors.reset}`,
      );
    }
  } catch {
    // Ignore parse errors
  }
}

function saveBenchmark(result: BenchmarkResult): void {
  let history: BenchmarkResult[] = [];

  if (fs.existsSync(BENCHMARK_FILE)) {
    try {
      history = JSON.parse(fs.readFileSync(BENCHMARK_FILE, 'utf-8')) as BenchmarkResult[];
    } catch {
      history = [];
    }
  }

  // Keep last 50 entries
  history.push(result);
  if (history.length > 50) {
    history = history.slice(-50);
  }

  fs.writeFileSync(BENCHMARK_FILE, JSON.stringify(history, null, 2));
  console.log(`\n${colors.green}✓ Benchmark saved to ${BENCHMARK_FILE}${colors.reset}`);
}

function main(): void {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes('--json');
  const saveResult = args.includes('--save');

  const packages: Record<string, { name: string; distPath: string }> = {
    ui: {
      name: '@abe-stack/ui',
      distPath: path.join(ROOT_DIR, 'packages/ui/dist'),
    },
    core: {
      name: '@abe-stack/contracts',
      distPath: path.join(ROOT_DIR, 'packages/core/dist'),
    },
    sdk: {
      name: '@abe-stack/sdk',
      distPath: path.join(ROOT_DIR, 'packages/sdk/dist'),
    },
    web: {
      name: '@abe-stack/web',
      distPath: path.join(ROOT_DIR, 'apps/web/dist'),
    },
  };

  const result: BenchmarkResult = {
    timestamp: new Date().toISOString(),
    commit: getGitCommit(),
    packages: {},
    totals: {},
  };

  if (!jsonOutput) {
    console.log(`\n${colors.bold}${colors.cyan}📦 Bundle Size Report${colors.reset}`);
    console.log(`${colors.dim}Timestamp: ${result.timestamp}${colors.reset}`);
    if (result.commit) {
      console.log(`${colors.dim}Commit: ${result.commit}${colors.reset}`);
    }
  }

  for (const [key, pkg] of Object.entries(packages)) {
    const bundles = measurePackage(pkg.name, pkg.distPath);
    result.packages[key] = bundles;

    const totalSize = bundles.reduce((sum, b) => sum + b.size, 0);
    const totalGzip = bundles.reduce((sum, b) => sum + b.gzipSize, 0);
    result.totals[key] = { size: totalSize, gzipSize: totalGzip };

    if (!jsonOutput) {
      printTable(bundles, pkg.name);
    }
  }

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    // Print summary
    console.log(`\n${colors.bold}${colors.blue}Summary${colors.reset}`);
    console.log(`${colors.dim}${'─'.repeat(70)}${colors.reset}`);

    let grandTotal = 0;
    let grandTotalGzip = 0;

    for (const [key, totals] of Object.entries(result.totals)) {
      const pkg = packages[key];
      console.log(
        `  ${pkg.name.padEnd(25)} ${formatBytes(totals.size).padStart(12)} ${colors.cyan}${formatBytes(totals.gzipSize).padStart(12)}${colors.reset}`,
      );
      grandTotal += totals.size;
      grandTotalGzip += totals.gzipSize;
    }

    console.log(
      `${colors.dim}  ${'─'.repeat(25)} ${'─'.repeat(12)} ${'─'.repeat(12)}${colors.reset}`,
    );
    console.log(
      `  ${colors.bold}${'Grand Total'.padEnd(25)}${colors.reset} ${colors.bold}${formatBytes(grandTotal).padStart(12)}${colors.reset} ${colors.bold}${formatBytes(grandTotalGzip).padStart(12)}${colors.reset}`,
    );

    compareWithPrevious(result);

    if (saveResult) {
      saveBenchmark(result);
    } else {
      console.log(`\n${colors.dim}Tip: Use --save to track size changes over time${colors.reset}`);
    }
  }
}

main();
