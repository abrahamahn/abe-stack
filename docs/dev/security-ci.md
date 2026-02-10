# Security CI (Private Repo Friendly)

This project uses a 5-tool security pipeline in `.github/workflows/security.yml` that works for private repositories.

## Tools

1. **CodeQL**

- Purpose: semantic static analysis for TypeScript/JavaScript (security + code quality rules).
- Output: SARIF uploaded to GitHub Security.

2. **Semgrep**

- Purpose: fast SAST rules for common app-layer issues.
- Output: `semgrep.sarif` uploaded to GitHub Security and saved as artifact.

3. **Dependency Scanning**

- `pnpm audit`: npm advisory-based dependency checks.
- `OSV-Scanner`: ecosystem-wide vulnerability database checks.
- Output: `osv-results.sarif` uploaded to GitHub Security and saved as artifact.

4. **Gitleaks**

- Purpose: secret scanning in git history and code.
- Output: workflow findings (no SARIF in current config).

5. **Trivy**

- Purpose: container image and filesystem vulnerability scanning.
- Output: `trivy-image.sarif` and `trivy-fs.sarif` uploaded to GitHub Security and saved as artifacts.

## Triggers

- `push` to `main`, `dev`
- `pull_request` to `main`, `dev`
- weekly schedule (`0 0 * * 1`)
- manual run (`workflow_dispatch`)

## Blocking vs Non-Blocking

Security jobs are non-blocking by default.

- Repository variable:
  - `SECURITY_SCAN_NON_BLOCKING=true` or unset: non-blocking
  - `SECURITY_SCAN_NON_BLOCKING=false`: block CI on security failures

## Private Repo Notes

- Scans still run in private repos.
- SARIF visibility in the GitHub Security UI depends on your GitHub plan/features.
- Artifacts are uploaded as fallback so results remain downloadable even when UI integration is limited.

## Typical Tuning

1. **Reduce noise first**

- Start with non-blocking mode.
- Triage repeated false positives and tune rules/configs gradually.

2. **Promote to blocking**

- Flip `SECURITY_SCAN_NON_BLOCKING=false` only after baseline cleanup.

3. **Keep severity focused**

- Current Trivy config targets `CRITICAL,HIGH`.
- Expand to `MEDIUM` only when teams can keep up with triage.

## Local Commands (Quick Checks)

```bash
pnpm audit --audit-level moderate
```

For full parity, prefer running the GitHub workflow since it includes all scanners and SARIF handling.
