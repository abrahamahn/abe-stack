# Security CI

Security scanning pipeline defined in `.github/workflows/security.yml` and `.github/workflows/audit.yml`.

## Overview

| Scanner     | Type           | What It Finds                                               |
| ----------- | -------------- | ----------------------------------------------------------- |
| CodeQL      | SAST           | Code-level vulnerabilities (XSS, injection, auth flaws)     |
| Semgrep     | SAST           | Pattern-based security issues with auto-config rules        |
| OSV Scanner | SCA            | Known vulnerabilities in dependencies                       |
| pnpm audit  | SCA            | npm advisory database matches                               |
| Gitleaks    | Secrets        | Leaked credentials, API keys, tokens in git history         |
| Trivy       | Container + FS | OS-level CVEs in Docker images + filesystem vulnerabilities |

## Security Scanning Workflow

**Triggers:**

- Push to `main` or `dev`
- Pull requests to `main` or `dev`
- Weekly schedule (Monday 00:00 UTC)
- Manual dispatch

**Permissions:** `contents: read`, `actions: read`, `security-events: write`

### CodeQL

Runs GitHub's CodeQL analysis for JavaScript/TypeScript with `security-extended` and `security-and-quality` query suites.

```yaml
- Initialize CodeQL (languages: javascript-typescript)
- Autobuild (automatic code compilation)
- Analyze (upload results to GitHub Security tab)
```

Results appear in the repository's **Security > Code scanning alerts** tab.

### Semgrep (SAST)

Runs Semgrep with `--config auto` (community rules) and outputs SARIF format.

- Results uploaded to GitHub Security tab via `codeql-action/upload-sarif`
- SARIF artifact also saved for offline review (`semgrep-sarif`)

### Dependencies (pnpm audit + OSV)

Two-pronged dependency scanning:

1. **pnpm audit** with `--audit-level moderate` (continues on failure for visibility)
2. **OSV Scanner** (Google's Open Source Vulnerability scanner) with recursive scanning and SARIF output

OSV results are uploaded to GitHub Security tab and saved as artifacts.

### Gitleaks (Secrets)

Scans the full git history (`fetch-depth: 0`) for leaked secrets using Gitleaks v2. Runs with `GITLEAKS_ENABLE_COMMENTS: false` to avoid noisy PR comments.

### Trivy (Container + Filesystem)

Runs two scans:

1. **Image scan**: Builds the Docker image (`infra/docker/Dockerfile`) and scans for CRITICAL and HIGH severity CVEs. Skipped if Docker build fails.
2. **Filesystem scan**: Scans the repository for CRITICAL and HIGH vulnerabilities in language-specific files.

Both results are uploaded to GitHub Security tab as separate categories (`trivy-image`, `trivy-fs`).

## Daily Audit Workflow

**File:** `.github/workflows/audit.yml`

**Triggers:** Daily at 04:00 UTC + manual dispatch

Runs `pnpm audit --prod` to check production dependencies against the npm advisory database. This is a lightweight daily check separate from the full security scanning workflow.

## Non-Blocking Mode

All security scan jobs use:

```yaml
continue-on-error: ${{ vars.SECURITY_SCAN_NON_BLOCKING != 'false' }}
```

By default, `SECURITY_SCAN_NON_BLOCKING` is `true` (set in CI defaults), meaning security scan failures do not block the pipeline. To make scans blocking:

1. Go to **Settings > Variables and secrets > Variables**
2. Set `SECURITY_SCAN_NON_BLOCKING` to `false`

This is useful for enforcing zero-vulnerability policies before releases.

## SARIF Upload

All scanners output SARIF format and upload results via `github/codeql-action/upload-sarif`. This integrates with the GitHub **Security** tab, providing:

- Centralized view of all findings across scanners
- Automatic deduplication across scan runs
- Dismissal and triage workflow
- PR annotations for new findings

Each scanner uploads to a distinct category (`codeql`, `semgrep`, `osv`, `trivy-image`, `trivy-fs`) for clear attribution.

## Triaging Findings

### In GitHub Security Tab

1. Navigate to **Security > Code scanning alerts**
2. Filter by tool (CodeQL, Semgrep, Trivy, OSV)
3. Review each finding: severity, affected code, suggested fix
4. Mark as **Dismissed** with reason (false positive, won't fix, used in tests) or **Open** to track

### Priority Matrix

| Severity | Scanner        | Action                                     |
| -------- | -------------- | ------------------------------------------ |
| Critical | Any            | Fix immediately, block merge               |
| High     | CodeQL/Semgrep | Fix before next release                    |
| High     | Trivy/OSV      | Update dependency or assess exploitability |
| Medium   | Any            | Track in backlog, fix within sprint        |
| Low/Info | Any            | Review, dismiss if non-applicable          |

### Common False Positives

- **Semgrep**: Generic pattern matches on test fixtures or documentation strings
- **OSV/Trivy**: Dev-only dependencies that are never bundled in production
- **Gitleaks**: Example API keys in documentation or test files

Use GitHub's dismissal workflow with an appropriate reason to suppress repeat alerts.
