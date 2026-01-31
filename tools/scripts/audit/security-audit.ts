#!/usr/bin/env tsx
// tools/audit/security-audit.ts
/**
 * Security Vulnerability Scanner
 *
 * Scans dependencies for known security vulnerabilities
 * Provides automated security updates and alerts
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

interface Vulnerability {
  package: string;
  version: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  description: string;
  cwe: string[];
  cvss: {
    score: number;
    vector: string;
  };
  references: string[];
  patches: Array<{
    id: string;
    url: string;
  }>;
}

interface AuditResult {
  summary: {
    total: number;
    critical: number;
    high: number;
    moderate: number;
    low: number;
  };
  vulnerabilities: Vulnerability[];
  recommendations: string[];
}

// ============================================================================
// Vulnerability Scanning
// ============================================================================

function scanVulnerabilities(): AuditResult {
  const result: AuditResult = {
    summary: { total: 0, critical: 0, high: 0, moderate: 0, low: 0 },
    vulnerabilities: [],
    recommendations: [],
  };

  try {
    // Run npm audit in JSON format
    const auditOutput = execSync('npm audit --audit-level=moderate --json', {
      encoding: 'utf-8',
      cwd: path.resolve(__dirname, '..', '..'),
      timeout: 60000, // 1 minute timeout
    });

    interface VulnData {
      version?: string;
      severity?: 'low' | 'moderate' | 'high' | 'critical';
      title?: string;
      overview?: string;
      cwe?: string[];
      cvss?: { score: number; vector: string };
      references?: string[];
      patches?: Array<{ id: string; url: string }>;
    }

    interface AuditData {
      vulnerabilities?: Record<string, VulnData>;
    }

    const auditData = JSON.parse(auditOutput) as AuditData;

    if (auditData.vulnerabilities) {
      for (const [pkgName, vulnData] of Object.entries(auditData.vulnerabilities)) {
        const vulnerability: Vulnerability = {
          package: pkgName,
          version: vulnData.version ?? 'unknown',
          severity: vulnData.severity ?? 'low',
          title: vulnData.title ?? 'Unknown vulnerability',
          description: vulnData.overview ?? vulnData.title ?? 'No description available',
          cwe: vulnData.cwe ?? [],
          cvss: vulnData.cvss ?? { score: 0, vector: '' },
          references: vulnData.references ?? [],
          patches: vulnData.patches ?? [],
        };

        result.vulnerabilities.push(vulnerability);

        // Update summary
        result.summary.total++;
        result.summary[vulnerability.severity]++;
      }
    }
  } catch {
    // npm audit might fail or return non-zero exit code with vulnerabilities
    console.warn('⚠️  npm audit encountered issues, results may be incomplete');
  }

  // Generate recommendations
  result.recommendations = generateSecurityRecommendations(result);

  return result;
}

// ============================================================================
// Security Recommendations
// ============================================================================

function generateSecurityRecommendations(result: AuditResult): string[] {
  const recommendations: string[] = [];

  if (result.summary.critical > 0) {
    recommendations.push('🚨 CRITICAL: Address critical vulnerabilities immediately');
  }

  if (result.summary.high > 0) {
    recommendations.push('⚠️  HIGH: Address high-severity vulnerabilities within 7 days');
  }

  if (result.summary.moderate > 0) {
    recommendations.push('📋 MODERATE: Address moderate vulnerabilities within 30 days');
  }

  if (result.vulnerabilities.length > 0) {
    recommendations.push('Run `npm audit fix` to automatically fix fixable vulnerabilities');
    recommendations.push('Review dependency updates with `npm outdated`');
    recommendations.push('Consider using `npm audit --audit-level=critical` for CI builds');
  }

  // General security recommendations
  recommendations.push('Keep dependencies updated regularly');
  recommendations.push('Use `npm audit` in CI/CD pipelines');
  recommendations.push('Consider using Snyk or similar security scanning tools');
  recommendations.push('Review dependency licenses with `npm license`');

  return recommendations;
}

// ============================================================================
// Dependency Update Analysis
// ============================================================================

interface OutdatedDepInfo {
  current?: string;
  latest?: string;
  type?: string;
}

function checkOutdatedDependencies(): Array<{
  name: string;
  current: string;
  latest: string;
  type: string;
}> {
  const outdated: Array<{ name: string; current: string; latest: string; type: string }> = [];

  try {
    const outdatedOutput = execSync('npm outdated --json', {
      encoding: 'utf-8',
      cwd: path.resolve(__dirname, '..', '..'),
      timeout: 30000,
    });

    const outdatedData = JSON.parse(outdatedOutput) as Record<string, OutdatedDepInfo>;

    for (const [name, data] of Object.entries(outdatedData)) {
      outdated.push({
        name,
        current: data.current ?? 'unknown',
        latest: data.latest ?? 'unknown',
        type: data.type ?? 'unknown',
      });
    }
  } catch {
    console.warn('⚠️  Could not check for outdated dependencies');
  }

  return outdated;
}

// ============================================================================
// Report Generation
// ============================================================================

function generateSecurityReport(
  result: AuditResult,
  outdated: Array<{ name: string; current: string; latest: string; type: string }>,
): string {
  let report = '# 🔒 Security Audit Report\n\n';

  // Summary
  report += '## 📊 Summary\n\n';
  report += `| Severity | Count |\n`;
  report += `|----------|-------|\n`;
  report += `| Critical | ${String(result.summary.critical)} |\n`;
  report += `| High     | ${String(result.summary.high)} |\n`;
  report += `| Moderate | ${String(result.summary.moderate)} |\n`;
  report += `| Low      | ${String(result.summary.low)} |\n`;
  report += `| **Total** | **${String(result.summary.total)}** |\n\n`;

  // Vulnerabilities
  if (result.vulnerabilities.length > 0) {
    report += '## 🚨 Vulnerabilities\n\n';

    const sortedVulns = result.vulnerabilities.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, moderate: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });

    for (const vuln of sortedVulns) {
      report += `### ${vuln.severity.toUpperCase()}: ${vuln.package} (${vuln.version})\n\n`;
      report += `**${vuln.title}**\n\n`;
      report += `${vuln.description}\n\n`;

      if (vuln.cvss.score > 0) {
        report += `**CVSS Score**: ${String(vuln.cvss.score)}\n\n`;
      }

      if (vuln.references.length > 0) {
        report += '**References**:\n';
        for (const ref of vuln.references) {
          report += `- ${ref}\n`;
        }
        report += '\n';
      }

      if (vuln.patches.length > 0) {
        report += '**Patches Available**:\n';
        for (const patch of vuln.patches) {
          report += `- [${patch.id}](${patch.url})\n`;
        }
        report += '\n';
      }
    }
  }

  // Outdated Dependencies
  if (outdated.length > 0) {
    report += '## 📅 Outdated Dependencies\n\n';
    report += '| Package | Current | Latest | Type |\n';
    report += '|---------|---------|--------|------|\n';

    for (const dep of outdated) {
      report += `| ${dep.name} | ${dep.current} | ${dep.latest} | ${dep.type} |\n`;
    }
    report += '\n';
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    report += '## 💡 Recommendations\n\n';
    for (const rec of result.recommendations) {
      report += `- ${rec}\n`;
    }
    report += '\n';
  }

  return report;
}

// ============================================================================
// Main Execution
// ============================================================================

function main(): void {
  try {
    console.log('🔍 Scanning for security vulnerabilities...\n');

    const vulnerabilities = scanVulnerabilities();
    const outdated = checkOutdatedDependencies();
    const report = generateSecurityReport(vulnerabilities, outdated);

    console.log(report);

    // Save report to .tmp directory
    const outputDir = path.join(__dirname, '..', '..', '..', '.tmp');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    const reportPath = path.join(outputDir, 'security-audit-report.md');
    fs.writeFileSync(reportPath, report);
    console.log(`\n📄 Report saved to: ${reportPath}`);

    // Exit with error code if critical/high vulnerabilities found
    if (vulnerabilities.summary.critical > 0 || vulnerabilities.summary.high > 0) {
      console.log('\n❌ Security issues found - review required');
      process.exit(1);
    } else if (vulnerabilities.summary.total > 0) {
      console.log('\n⚠️  Minor security issues found');
      process.exit(0);
    } else {
      console.log('\n✅ No security vulnerabilities found');
    }
  } catch (error) {
    console.error('❌ Security audit failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
