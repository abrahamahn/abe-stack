# Incident Response Runbook

## Detection

Incidents are detected through:

- **Health check failures:** `/health` endpoint returns non-200 status
- **Error rate spikes:** Application logs show elevated error counts
- **User reports:** Support tickets or direct reports of broken functionality
- **Monitoring alerts:** CPU, memory, disk, or response time thresholds exceeded

## Triage: Severity Classification

| Severity | Criteria | Response time | Examples |
|----------|----------|---------------|----------|
| **P1** | Service down, data loss, security breach | Immediate (< 15 min) | API unreachable, database corruption, auth bypass |
| **P2** | Major feature broken, degraded for many users | < 1 hour | Login failing, payments broken, data not saving |
| **P3** | Minor feature broken, workaround exists | < 4 hours | UI glitch, non-critical notification failure |
| **P4** | Cosmetic, low-impact | Next business day | Typo, minor styling issue |

### Notification

- **P1/P2:** Notify the on-call engineer and team lead immediately
- **P3:** Post in the team channel, assign to next sprint
- **P4:** Create a ticket, address when convenient

## Mitigation: Immediate Actions

### 1. Rollback deployment (if caused by a recent deploy)

```bash
# Use the rollback workflow (see docs/runbooks/deployment-rollback.md)
# Or manually via GitHub Actions: Actions > Rollback Deployment > Run workflow
```

### 2. Enable maintenance mode

Set `MAINTENANCE_MODE=true` in the environment to return 503 to all requests while investigating.

### 3. Disable a feature via feature flag

```sql
UPDATE feature_flags SET is_enabled = false WHERE key = 'problematic_feature';
```

### 4. Rate limit or block abusive traffic

Apply rate limiting at the reverse proxy level (Nginx/Caddy) or cloud firewall.

## Resolution

1. **Identify root cause:** Check application logs, database state, recent deployments
2. **Develop fix:** Follow normal development workflow (branch, test, review)
3. **Deploy fix:** Push through CI/CD pipeline or use hotfix deployment
4. **Verify:** Confirm health check passes, error rate returns to baseline, affected users can operate normally

## Postmortem Template

Complete within 48 hours of P1/P2 resolution:

```markdown
## Incident: [Title]
**Date:** YYYY-MM-DD
**Duration:** HH:MM
**Severity:** P1/P2/P3

### Timeline
- HH:MM — Issue detected (how)
- HH:MM — Investigation started
- HH:MM — Root cause identified
- HH:MM — Fix deployed
- HH:MM — Incident resolved

### Impact
- Number of affected users
- Features impacted
- Data loss (if any)

### Root Cause
[Clear description of what went wrong and why]

### Action Items
- [ ] [Preventive measure 1]
- [ ] [Preventive measure 2]
- [ ] [Monitoring improvement]
```
