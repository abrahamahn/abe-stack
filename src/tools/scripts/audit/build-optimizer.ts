#!/usr/bin/env tsx
// tools/scripts/audit/build-optimizer.ts
/**
 * Build Performance Optimizer
 *
 * Analyzes build performance and suggests optimizations
 * Identifies slow imports, large dependencies, and optimization opportunities
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

interface ImportAnalysis {
  file: string;
  imports: {
    name: string;
    source: string;
    type: 'static' | 'dynamic';
    size?: number;
  }[];
}

interface BuildAnalysis {
  totalFiles: number;
  totalImports: number;
  dynamicImports: number;
  largeImports: { file: string; import: string; size: number }[];
  slowImports: { file: string; import: string; reason: string }[];
  optimizationSuggestions: string[];
}

// ============================================================================
// Import Analysis
// ============================================================================

function analyzeImports(filePath: string): ImportAnalysis['imports'] {
  const imports: ImportAnalysis['imports'] = [];

  try {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Static imports
    const staticImportRegex = /import\s+{[^}]*}\s+from\s+['"]([^'"]+)['"]/g;
    const defaultImportRegex = /import\s+[^'"]*\s+from\s+['"]([^'"]+)['"]/g;
    const sideEffectImportRegex = /import\s+['"]([^'"]+)['"]/g;

    let match;

    // Analyze static imports
    [staticImportRegex, defaultImportRegex, sideEffectImportRegex].forEach((regex) => {
      while ((match = regex.exec(content)) !== null) {
        const source = match[1];
        imports.push({
          name: 'static',
          source,
          type: 'static',
          size: estimateImportSize(source),
        });
      }
    });

    // Dynamic imports
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      const source = match[1];
      imports.push({
        name: 'dynamic',
        source,
        type: 'dynamic',
        size: estimateImportSize(source),
      });
    }
  } catch {
    // Skip files that can't be read
  }

  return imports;
}

function estimateImportSize(importSource: string): number {
  // Size estimates for common imports (in KB)
  const sizeMap: Record<string, number> = {
    react: 150,
    'react-dom': 1200,
    '@abe-stack/ui': 200,
    '@abe-stack/shared': 150,
    '@abe-stack/engine': 100,
    zod: 80,
    'date-fns': 300,
    lodash: 100,
    // Add more as needed
  };

  // Check for exact matches
  if (sizeMap[importSource]) {
    return sizeMap[importSource];
  }

  // Check for partial matches (e.g., 'lodash/fp' -> 'lodash')
  for (const [key, size] of Object.entries(sizeMap)) {
    if (importSource.startsWith(key)) {
      return Math.ceil(size * 0.5); // Estimate partial import as 50% of full
    }
  }

  return 10; // Default small size
}

// ============================================================================
// File Analysis
// ============================================================================

function analyzeBuildPerformance(): BuildAnalysis {
  const analysis: BuildAnalysis = {
    totalFiles: 0,
    totalImports: 0,
    dynamicImports: 0,
    largeImports: [],
    slowImports: [],
    optimizationSuggestions: [],
  };

  const rootDir = path.resolve(__dirname, '..', '..');

  // Analyze source files
  const sourceDirs = [
    path.join(rootDir, 'apps', 'web', 'src'),
    path.join(rootDir, 'packages', 'ui', 'src'),
    path.join(rootDir, 'client', 'src'),
    path.join(rootDir, 'packages', 'core', 'src'),
  ];

  for (const dir of sourceDirs) {
    if (!fs.existsSync(dir)) continue;

    const files = getAllSourceFiles(dir);

    for (const file of files) {
      analysis.totalFiles++;
      const imports = analyzeImports(file);

      analysis.totalImports += imports.length;
      analysis.dynamicImports += imports.filter((imp) => imp.type === 'dynamic').length;

      // Check for large imports
      for (const imp of imports) {
        if (imp.size && imp.size > 100) {
          // > 100KB
          analysis.largeImports.push({
            file: path.relative(rootDir, file),
            import: imp.source,
            size: imp.size,
          });
        }
      }

      // Check for potentially slow imports
      for (const imp of imports) {
        if (imp.source.includes('node_modules') && imp.type === 'static') {
          // Large static imports from node_modules
          if (imp.size && imp.size > 50) {
            analysis.slowImports.push({
              file: path.relative(rootDir, file),
              import: imp.source,
              reason: 'Large static import from node_modules',
            });
          }
        }

        // Deep path imports
        if (imp.source.split('/').length > 4) {
          analysis.slowImports.push({
            file: path.relative(rootDir, file),
            import: imp.source,
            reason: 'Deep import path may cause slow resolution',
          });
        }
      }
    }
  }

  // Generate optimization suggestions
  analysis.optimizationSuggestions = generateSuggestions(analysis);

  return analysis;
}

function getAllSourceFiles(dir: string): string[] {
  const files: string[] = [];

  function walk(currentDir: string): void {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

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

// ============================================================================
// Optimization Suggestions
// ============================================================================

function generateSuggestions(analysis: BuildAnalysis): string[] {
  const suggestions: string[] = [];

  // Dynamic imports
  if (analysis.dynamicImports < analysis.totalImports * 0.1) {
    suggestions.push(
      'Consider converting large static imports to dynamic imports for better code splitting',
    );
  }

  // Large imports
  if (analysis.largeImports.length > 0) {
    suggestions.push(
      `Found ${String(analysis.largeImports.length)} large imports (>100KB). Consider lazy loading or code splitting`,
    );
  }

  // Slow imports
  if (analysis.slowImports.length > 0) {
    suggestions.push(
      `Found ${String(analysis.slowImports.length)} potentially slow imports. Review import paths and consider barrel exports`,
    );
  }

  // General suggestions
  suggestions.push('Use barrel exports (index.ts) to reduce import path depth');
  suggestions.push('Consider using tree-shakable imports (e.g., lodash/fp instead of lodash)');
  suggestions.push('Implement route-based code splitting for better initial load performance');
  suggestions.push('Use dynamic imports for heavy components or libraries');

  return suggestions;
}

// ============================================================================
// Report Generation
// ============================================================================

function generateReport(analysis: BuildAnalysis): string {
  let report = '# 🚀 Build Performance Analysis\n\n';

  report += `## 📊 Overview\n\n`;
  report += `- **Total Files**: ${String(analysis.totalFiles)}\n`;
  report += `- **Total Imports**: ${String(analysis.totalImports)}\n`;
  report += `- **Dynamic Imports**: ${String(analysis.dynamicImports)} (${((analysis.dynamicImports / analysis.totalImports) * 100).toFixed(1)}%)\n\n`;

  if (analysis.largeImports.length > 0) {
    report += `## 📏 Large Imports (>100KB)\n\n`;
    for (const imp of analysis.largeImports) {
      report += `- **${imp.import}** (${String(imp.size)}KB) in \`${imp.file}\`\n`;
    }
    report += '\n';
  }

  if (analysis.slowImports.length > 0) {
    report += `## 🐌 Potentially Slow Imports\n\n`;
    for (const imp of analysis.slowImports) {
      report += `- **${imp.import}** in \`${imp.file}\`: ${imp.reason}\n`;
    }
    report += '\n';
  }

  report += `## 💡 Optimization Suggestions\n\n`;
  for (const suggestion of analysis.optimizationSuggestions) {
    report += `- ${suggestion}\n`;
  }

  return report;
}

// ============================================================================
// Main Execution
// ============================================================================

function main(): void {
  try {
    console.log('🔍 Analyzing build performance...\n');

    const analysis = analyzeBuildPerformance();
    const report = generateReport(analysis);

    console.log(report);

    // Save report to .tmp directory
    const outputDir = path.join(__dirname, '..', '..', '..', '.tmp');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const reportPath = path.join(outputDir, 'build-performance-report.md');
    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 Report saved to: ${reportPath}`);
  } catch (error) {
    console.error('❌ Build analysis failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
