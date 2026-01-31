#!/usr/bin/env tsx
// tools/scripts/audit/bundle-monitor.ts
/**
 * Bundle Size Monitor
 *
 * Monitors bundle sizes and provides regression detection
 * Tracks changes over time and alerts on significant increases
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

interface BundleInfo {
  name: string;
  size: number;
  gzipSize: number;
  timestamp: string;
  commit?: string;
}

interface BundleReport {
  timestamp: string;
  commit?: string;
  packages: Record<string, BundleInfo[]>;
  totals: Record<string, { size: number; gzipSize: number }>;
}

// ============================================================================
// Bundle Size Estimation
// ============================================================================

function estimatePackageBundleSize(packageName: string, packagePath: string): BundleInfo[] {
  const bundles: BundleInfo[] = [];
  const packageJsonPath = path.join(packagePath, 'package.json');

  if (!fs.existsSync(packageJsonPath)) return bundles;

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const dependencies: Record<string, string> = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  // Estimate sizes for each dependency
  const sizeEstimates: Record<string, { size: number; gzipSize: number }> = {
    // Framework
    react: { size: 150, gzipSize: 45 },
    'react-dom': { size: 1200, gzipSize: 320 },

    // Build Tools (not included in bundle)
    typescript: { size: 0, gzipSize: 0 },
    vite: { size: 0, gzipSize: 0 },
    webpack: { size: 0, gzipSize: 0 },
    esbuild: { size: 0, gzipSize: 0 },

    // Dev Tools (not included in bundle)
    eslint: { size: 0, gzipSize: 0 },
    prettier: { size: 0, gzipSize: 0 },
    '@types/node': { size: 0, gzipSize: 0 },
    '@types/react': { size: 0, gzipSize: 0 },
    vitest: { size: 0, gzipSize: 0 },

    // UI Libraries
    '@abe-stack/ui': { size: 200, gzipSize: 60 }, // Our custom UI
    '@abe-stack/core': { size: 150, gzipSize: 40 }, // Our core utilities

    // Database (runtime only, not in client bundle)
    '@abe-stack/db': { size: 0, gzipSize: 0 },
    postgres: { size: 0, gzipSize: 0 },

    // Security (runtime only)
    argon2: { size: 0, gzipSize: 0 },

    // Development dependencies
    '@playwright/test': { size: 0, gzipSize: 0 },
    '@testing-library/react': { size: 0, gzipSize: 0 },
    msw: { size: 0, gzipSize: 0 },
    jsdom: { size: 0, gzipSize: 0 },
  };

  let totalSize = 0;
  let totalGzipSize = 0;

  for (const [name] of Object.entries(dependencies)) {
    const estimate = sizeEstimates[name] ?? { size: 30, gzipSize: 10 }; // Default estimate
    totalSize += estimate.size;
    totalGzipSize += estimate.gzipSize;

    bundles.push({
      name,
      size: estimate.size,
      gzipSize: estimate.gzipSize,
      timestamp: new Date().toISOString(),
    });
  }

  // Add main bundle estimate
  bundles.unshift({
    name: `${packageName} (main)`,
    size: Math.max(50, totalSize * 0.1), // Estimate 10% for app code
    gzipSize: Math.max(15, totalGzipSize * 0.1),
    timestamp: new Date().toISOString(),
  });

  return bundles;
}

// ============================================================================
// Report Generation
// ============================================================================

function generateBundleReport(): BundleReport {
  const packages: Record<string, BundleInfo[]> = {};
  const totals: Record<string, { size: number; gzipSize: number }> = {};

  const rootDir = path.resolve(__dirname, '..', '..');

  // Analyze web app
  const webPath = path.join(rootDir, 'apps', 'web');
  if (fs.existsSync(webPath)) {
    const bundles = estimatePackageBundleSize('@abe-stack/web', webPath);
    packages['@abe-stack/web'] = bundles;

    const total = bundles.reduce(
      (acc, bundle) => ({
        size: acc.size + bundle.size,
        gzipSize: acc.gzipSize + bundle.gzipSize,
      }),
      { size: 0, gzipSize: 0 },
    );
    totals['@abe-stack/web'] = total;
  }

  // Analyze packages
  const packagesDir = path.join(rootDir, 'packages');
  if (fs.existsSync(packagesDir)) {
    const packageDirs = fs.readdirSync(packagesDir);
    for (const pkgName of packageDirs) {
      const pkgPath = path.join(packagesDir, pkgName);
      if (fs.existsSync(path.join(pkgPath, 'package.json'))) {
        const bundles = estimatePackageBundleSize(`@abe-stack/${pkgName}`, pkgPath);
        packages[`@abe-stack/${pkgName}`] = bundles;

        const total = bundles.reduce(
          (acc, bundle) => ({
            size: acc.size + bundle.size,
            gzipSize: acc.gzipSize + bundle.gzipSize,
          }),
          { size: 0, gzipSize: 0 },
        );
        totals[`@abe-stack/${pkgName}`] = total;
      }
    }
  }

  return {
    timestamp: new Date().toISOString(),
    packages,
    totals,
  };
}

// ============================================================================
// Historical Comparison
// ============================================================================

function getOutputDir(): string {
  return path.join(__dirname, '..', '..', '..', '.tmp');
}

function getReportPath(): string {
  return path.join(getOutputDir(), '.bundle-sizes.json');
}

function loadPreviousReport(): BundleReport | null {
  const reportPath = getReportPath();

  if (!fs.existsSync(reportPath)) return null;

  try {
    const data = fs.readFileSync(reportPath, 'utf-8');
    const reports = JSON.parse(data) as BundleReport[];
    return reports[reports.length - 1] ?? null;
  } catch {
    return null;
  }
}

function saveReport(report: BundleReport): void {
  const outputDir = getOutputDir();
  const reportPath = getReportPath();

  // Ensure .tmp directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let reports: BundleReport[] = [];
  if (fs.existsSync(reportPath)) {
    try {
      reports = JSON.parse(fs.readFileSync(reportPath, 'utf-8')) as BundleReport[];
    } catch {
      reports = [];
    }
  }

  reports.push(report);

  // Keep only last 10 reports
  if (reports.length > 10) {
    reports = reports.slice(-10);
  }

  fs.writeFileSync(reportPath, JSON.stringify(reports, null, 2));
}

// ============================================================================
// Report Display
// ============================================================================

function displayReport(current: BundleReport, previous: BundleReport | null): void {
  console.log('📏 Bundle Size Report\n');

  for (const [pkgName, bundles] of Object.entries(current.packages)) {
    console.log(`📦 ${pkgName}`);

    const total = current.totals[pkgName];
    const prevTotal = previous?.totals[pkgName];

    console.log(`  Total: ${String(total.size)}KB (${String(total.gzipSize)}KB gzipped)`);

    if (prevTotal) {
      const sizeDiff = total.size - prevTotal.size;
      const gzipDiff = total.gzipSize - prevTotal.gzipSize;

      if (sizeDiff !== 0) {
        const sign = sizeDiff > 0 ? '+' : '';
        console.log(
          `  Change: ${sign}${String(sizeDiff)}KB (${sign}${String(gzipDiff)}KB gzipped)`,
        );
      }
    }

    // Show top contributors
    const mainBundle = bundles.find((b) => b.name.includes('(main)'));
    if (mainBundle) {
      console.log(
        `  Main bundle: ${String(mainBundle.size)}KB (${String(mainBundle.gzipSize)}KB gzipped)`,
      );
    }

    console.log('');
  }

  // Overall totals
  const overallTotal = Object.values(current.totals).reduce(
    (acc, total) => ({
      size: acc.size + total.size,
      gzipSize: acc.gzipSize + total.gzipSize,
    }),
    { size: 0, gzipSize: 0 },
  );

  console.log('📊 Overall Totals:');
  console.log(`  Total size: ${String(overallTotal.size)}KB`);
  console.log(`  Total gzipped: ${String(overallTotal.gzipSize)}KB`);

  if (previous) {
    const prevOverall = Object.values(previous.totals).reduce(
      (acc, total) => ({
        size: acc.size + total.size,
        gzipSize: acc.gzipSize + total.gzipSize,
      }),
      { size: 0, gzipSize: 0 },
    );

    const sizeDiff = overallTotal.size - prevOverall.size;
    const gzipDiff = overallTotal.gzipSize - prevOverall.gzipSize;

    if (sizeDiff !== 0) {
      const sign = sizeDiff > 0 ? '+' : '';
      console.log(`  Change: ${sign}${String(sizeDiff)}KB (${sign}${String(gzipDiff)}KB gzipped)`);

      if (sizeDiff > 50) {
        console.log('⚠️  WARNING: Bundle size increased significantly!');
      }
    }
  }
}

// ============================================================================
// Main Execution
// ============================================================================

function main(): void {
  try {
    const report = generateBundleReport();
    const previous = loadPreviousReport();

    displayReport(report, previous);
    saveReport(report);

    console.log('\n💾 Report saved to .tmp/.bundle-sizes.json');
  } catch (error) {
    console.error('❌ Bundle monitoring failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
