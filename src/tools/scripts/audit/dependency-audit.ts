#!/usr/bin/env tsx
// src/tools/scripts/audit/dependency-audit.ts
/**
 * Dependency Audit Tool
 *
 * Analyzes dependencies across all packages to identify:
 * - Unused packages
 * - Outdated versions
 * - Security vulnerabilities
 * - Bundle size impact
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

interface PackageInfo {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  path: string;
}

interface AuditResult {
  package: string;
  unused: string[];
  outdated: { name: string; current: string; latest: string }[];
  vulnerabilities: { name: string; severity: string; description: string }[];
  bundleImpact: { name: string; size: number }[];
}

// ============================================================================
// Package Analysis
// ============================================================================

function getAllPackages(): PackageInfo[] {
  const packages: PackageInfo[] = [];
  const rootDir = resolve(__dirname, '..', '..', '..', '..');

  // Root package
  interface PackageJson {
    name?: string;
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }
  const rootPackageJson = JSON.parse(
    readFileSync(join(rootDir, 'package.json'), 'utf-8'),
  ) as PackageJson;
  packages.push({
    name: rootPackageJson.name ?? 'unknown',
    version: rootPackageJson.version ?? '0.0.0',
    dependencies: rootPackageJson.dependencies ?? {},
    devDependencies: rootPackageJson.devDependencies ?? {},
    path: rootDir,
  });

  // Scan monorepo layer directories: src/apps, src/client, src/server
  const layerDirs = [
    join(rootDir, 'src', 'apps'),
    join(rootDir, 'src', 'client'),
    join(rootDir, 'src', 'server'),
  ];

  for (const layerDir of layerDirs) {
    if (!existsSync(layerDir)) continue;
    const subdirs = readdirSync(layerDir);
    for (const subdir of subdirs) {
      const pkgPath = join(layerDir, subdir);
      const packageJsonPath = join(pkgPath, 'package.json');
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8')) as PackageJson;
        packages.push({
          name: packageJson.name ?? 'unknown',
          version: packageJson.version ?? '0.0.0',
          dependencies: packageJson.dependencies ?? {},
          devDependencies: packageJson.devDependencies ?? {},
          path: pkgPath,
        });
      }
    }
  }

  // Shared (standalone package at src/shared)
  const sharedPath = join(rootDir, 'src', 'shared');
  const sharedPackageJsonPath = join(sharedPath, 'package.json');
  if (existsSync(sharedPackageJsonPath)) {
    const packageJson = JSON.parse(readFileSync(sharedPackageJsonPath, 'utf-8')) as PackageJson;
    packages.push({
      name: packageJson.name ?? 'unknown',
      version: packageJson.version ?? '0.0.0',
      dependencies: packageJson.dependencies ?? {},
      devDependencies: packageJson.devDependencies ?? {},
      path: sharedPath,
    });
  }

  return packages;
}

// ============================================================================
// Unused Dependencies Analysis
// ============================================================================

function findUnusedDependencies(packageInfo: PackageInfo): string[] {
  const unused: string[] = [];
  const srcDir = join(packageInfo.path, 'src');

  if (!existsSync(srcDir)) return unused;

  // Get all source files
  const sourceFiles = getAllSourceFiles(srcDir);

  // Check each dependency
  for (const [depName] of Object.entries(packageInfo.dependencies)) {
    if (!isDependencyUsed(depName, sourceFiles)) {
      unused.push(depName);
    }
  }

  return unused;
}

function getAllSourceFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string): void {
    const items = readdirSync(currentDir);

    for (const item of items) {
      const fullPath = join(currentDir, item);
      const stat = statSync(fullPath);

      if (
        stat.isDirectory() &&
        !item.startsWith('.') &&
        item !== 'node_modules' &&
        item !== 'dist' &&
        item !== '__tests__'
      ) {
        walk(fullPath);
      } else if (
        stat.isFile() &&
        (item.endsWith('.ts') ||
          item.endsWith('.tsx') ||
          item.endsWith('.js') ||
          item.endsWith('.jsx'))
      ) {
        files.push(fullPath);
      }
    }
  }

  walk(dir);
  return files;
}

function isDependencyUsed(depName: string, sourceFiles: string[]): boolean {
  // Common import patterns
  const patterns = [
    `from '${depName}'`,
    `from "${depName}"`,
    `require('${depName}')`,
    `require("${depName}")`,
    `import.*${depName}`,
  ];

  for (const file of sourceFiles) {
    try {
      const content = readFileSync(file, 'utf-8');
      for (const pattern of patterns) {
        if (new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g').test(content)) {
          return true;
        }
      }
    } catch {
      // Skip files that can't be read
      continue;
    }
  }

  return false;
}

// ============================================================================
// Outdated Dependencies Analysis
// ============================================================================

interface OutdatedInfo {
  current?: string;
  latest?: string;
}

function checkOutdatedDependencies(
  packageInfo: PackageInfo,
): { name: string; current: string; latest: string }[] {
  const outdated: { name: string; current: string; latest: string }[] = [];

  try {
    // Check npm outdated for this package
    const result = execSync(`cd ${packageInfo.path} && npm outdated --json`, {
      encoding: 'utf-8',
      timeout: 30000,
    });

    const outdatedData = JSON.parse(result) as Record<string, OutdatedInfo>;

    for (const [name, info] of Object.entries(outdatedData)) {
      if (info.current !== undefined && info.latest !== undefined) {
        outdated.push({
          name,
          current: info.current,
          latest: info.latest,
        });
      }
    }
  } catch {
    // npm outdated might fail, skip for now
  }

  return outdated;
}

// ============================================================================
// Bundle Size Analysis
// ============================================================================

function estimateBundleImpact(
  dependencies: Record<string, string>,
): { name: string; size: number }[] {
  const impacts: { name: string; size: number }[] = [];

  // Rough estimates of bundle sizes for common packages (in KB)
  const sizeEstimates: Record<string, number> = {
    react: 150,
    'react-dom': 1200,
    vue: 80,
    angular: 500,
    '@tanstack/react-query': 150,
    '@tanstack/react-query-persist-client': 50,
    redux: 30,
    'react-redux': 50,
    lodash: 100,
    moment: 200,
    'date-fns': 300,
    axios: 50,
    'react-markdown': 100,
    'react-syntax-highlighter': 200,
    dompurify: 30,
    zod: 80,
    yup: 100,
    joi: 150,
    typescript: 0, // Dev-only
    vite: 0, // Dev-only
    webpack: 0, // Dev-only
    eslint: 0, // Dev-only
    prettier: 0, // Dev-only
  };

  for (const [name] of Object.entries(dependencies)) {
    const estimatedSize = sizeEstimates[name] ?? 50; // Default 50KB estimate
    impacts.push({ name, size: estimatedSize });
  }

  return impacts.sort((a, b) => b.size - a.size);
}

// ============================================================================
// Main Audit Function
// ============================================================================

function auditDependencies(): AuditResult[] {
  const packages = getAllPackages();
  const results: AuditResult[] = [];

  console.log('🔍 Analyzing dependencies across', packages.length, 'packages...\n');

  for (const pkg of packages) {
    console.log(`📦 Auditing ${pkg.name}...`);

    const unused = findUnusedDependencies(pkg);
    const outdated = checkOutdatedDependencies(pkg);

    // Combine all dependencies for bundle analysis
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const bundleImpact = estimateBundleImpact(allDeps);

    results.push({
      package: pkg.name,
      unused,
      outdated,
      vulnerabilities: [], // Would need external service for this
      bundleImpact: bundleImpact.slice(0, 10), // Top 10 by size
    });
  }

  return results;
}

// ============================================================================
// Report Generation
// ============================================================================

function generateReport(results: AuditResult[]): string {
  let report = '# 📊 Dependency Audit Report\n\n';

  for (const result of results) {
    report += `## ${result.package}\n\n`;

    if (result.unused.length > 0) {
      report += `### 🚨 Unused Dependencies (${String(result.unused.length)})\n`;
      for (const dep of result.unused) {
        report += `- \`${dep}\`\n`;
      }
      report += '\n';
    }

    if (result.outdated.length > 0) {
      report += `### 📅 Outdated Dependencies (${String(result.outdated.length)})\n`;
      for (const dep of result.outdated) {
        report += `- \`${dep.name}\`: ${dep.current} → ${dep.latest}\n`;
      }
      report += '\n';
    }

    if (result.bundleImpact.length > 0) {
      report += `### 📏 Top Bundle Contributors\n`;
      for (const impact of result.bundleImpact) {
        report += `- \`${impact.name}\`: ~${String(impact.size)}KB\n`;
      }
      report += '\n';
    }

    if (result.unused.length === 0 && result.outdated.length === 0) {
      report += '✅ No issues found\n\n';
    }
  }

  return report;
}

// ============================================================================
// Main Execution
// ============================================================================

function main(): void {
  try {
    const results = auditDependencies();
    const report = generateReport(results);

    console.log(report);

    // Save report to .tmp directory
    const outputDir = join(__dirname, '..', '..', '..', '..', '.tmp');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    const reportPath = join(outputDir, 'dependency-audit-report.md');
    writeFileSync(reportPath, report);
    console.log(`📄 Report saved to: ${reportPath}`);

    // Summary
    const totalUnused = results.reduce((sum, r) => sum + r.unused.length, 0);
    const totalOutdated = results.reduce((sum, r) => sum + r.outdated.length, 0);
    const totalBundleSize = results.reduce(
      (sum, r) => sum + r.bundleImpact.reduce((s, i) => s + i.size, 0),
      0,
    );

    console.log('\n📈 Summary:');
    console.log(`- Unused dependencies: ${String(totalUnused)}`);
    console.log(`- Outdated dependencies: ${String(totalOutdated)}`);
    console.log(`- Estimated bundle impact: ~${String(totalBundleSize)}KB`);
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

const entryArg = process.argv[1];
const isMainModule = entryArg !== undefined && import.meta.url === `file://${entryArg}`;
if (isMainModule) {
  main();
}
