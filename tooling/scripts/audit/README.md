# 🔍 Dependency Audit Tools

Comprehensive suite of tools for monitoring and optimizing dependencies, security, and build performance.

## 📋 Available Tools

### `dependency-audit.ts`

**Purpose**: Analyze dependencies across all packages to identify unused, outdated, and large dependencies.

**Usage**:

```bash
pnpm audit:deps
```

**What it checks**:

- Unused dependencies in each package
- Outdated package versions
- Bundle size estimates
- Package usage patterns

**Output**: `dependency-audit-report.md`

### `security-audit.ts`

**Purpose**: Scan for security vulnerabilities in dependencies and provide update recommendations.

**Usage**:

```bash
pnpm audit:security
```

**What it checks**:

- Known CVEs and security vulnerabilities
- Outdated dependencies with security fixes
- Severity levels (critical, high, moderate, low)
- Available patches and updates

**Output**: `security-audit-report.md`
**Exit Codes**: Non-zero exit for critical/high vulnerabilities

### `build-optimizer.ts`

**Purpose**: Analyze build performance and suggest optimizations for faster builds.

**Usage**:

```bash
pnpm audit:build
```

**What it checks**:

- Import patterns and sizes
- Dynamic vs static imports
- Large dependency imports
- Deep import paths
- Code splitting opportunities

**Output**: `build-performance-report.md`

### `bundle-monitor.ts`

**Purpose**: Monitor bundle sizes and track changes over time.

**Usage**:

```bash
pnpm audit:bundle
```

**What it tracks**:

- Estimated bundle sizes per package
- Historical size comparisons
- Size regression alerts
- Gzipped vs uncompressed sizes

**Output**: `.bundle-sizes.json` (historical data)

## 🚀 Quick Commands

### Run All Audits

```bash
pnpm audit:all
```

### Individual Audits

```bash
pnpm audit:deps     # Dependency analysis
pnpm audit:security # Security scanning
pnpm audit:build    # Build optimization
pnpm audit:bundle   # Bundle monitoring
```

## 📊 Integration

### CI/CD Pipeline

Add to your CI/CD pipeline for automated monitoring:

```yaml
# GitHub Actions example
- name: Security Audit
  run: pnpm audit:security

- name: Bundle Size Check
  run: pnpm audit:bundle
```

### Pre-commit Hooks

Security audit is automatically run on pre-commit:

```json
{
  "pre-commit": "pnpm config:generate && pnpm sync:headers && pnpm sync:theme && pnpm lint-staged && pnpm type-check && pnpm audit:security"
}
```

## 📈 Metrics Tracked

### Bundle Sizes

- **Web App**: React + UI components + routing
- **Core Package**: Utilities and shared logic
- **SDK Package**: HTTP client and hooks
- **UI Package**: Components and styling

### Security Metrics

- Vulnerability counts by severity
- CVSS scores for risk assessment
- Patch availability status

### Performance Metrics

- Import analysis and optimization opportunities
- Build time estimates
- Code splitting effectiveness

## 🎯 Optimization Goals

### Bundle Size Targets

- **Web App**: < 500KB gzipped
- **Core Package**: < 200KB gzipped
- **SDK Package**: < 150KB gzipped
- **UI Package**: < 300KB gzipped

### Security Standards

- Zero critical vulnerabilities
- < 5 high-severity vulnerabilities
- Regular security updates (< 30 days)

### Build Performance

- Cold start: < 5 seconds
- Hot reload: < 500ms
- Bundle analysis: < 10 seconds

## 📋 Reports

All tools generate markdown reports in the project root:

- `dependency-audit-report.md`
- `security-audit-report.md`
- `build-performance-report.md`
- `.bundle-sizes.json` (historical data)

## 🔧 Configuration

### Custom Size Estimates

Update `sizeEstimates` in each tool for more accurate bundle size calculations.

### Security Thresholds

Modify exit codes in `security-audit.ts` to adjust CI failure thresholds.

### Build Analysis Rules

Customize import patterns and optimization rules in `build-optimizer.ts`.

## 🚨 Alerts

### Bundle Size Regressions

- Automatic detection of size increases > 50KB
- Historical comparison with previous builds

### Security Issues

- Critical/High severity vulnerabilities trigger CI failures
- Automated alerts for new vulnerabilities

### Performance Issues

- Large imports (>100KB) flagged for optimization
- Deep import paths (>4 levels) suggested for barrel exports

## 📚 Best Practices

1. **Run audits regularly** - Include in CI/CD pipeline
2. **Monitor bundle sizes** - Set up alerts for regressions
3. **Address security issues promptly** - Critical issues within 24 hours
4. **Optimize imports** - Use dynamic imports for large dependencies
5. **Keep dependencies updated** - Regular security and feature updates

## 🤝 Contributing

When adding new dependencies:

1. Run `pnpm audit:all` to check impact
2. Update size estimates if needed
3. Ensure no new security vulnerabilities
4. Test bundle size impact

---

**Maintained by**: ABE Stack Team
**Last Updated**: January 2026
