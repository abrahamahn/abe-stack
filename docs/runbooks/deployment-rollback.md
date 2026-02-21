# Deployment Rollback Runbook

## When to Rollback

- Error rate spikes immediately after deployment
- Health check (`/health`) returns non-200 status
- Critical functionality broken (login, payments, data saving)
- Performance degradation affecting users

**Rule of thumb:** If you cannot identify and fix the issue within 15 minutes, rollback first, investigate later.

## How to Rollback

### Option 1: GitHub Actions workflow (recommended)

1. Go to **Actions > Rollback Deployment > Run workflow**
2. Fill in the parameters:
   - **environment:** `production` or `staging`
   - **provider:** `digitalocean` or `gcp`
   - **target_tag:** The Docker image tag to rollback to (required)
   - **app_name:** Application slug (default: `bslt`)
3. The workflow will:
   - Pull the specified Docker images
   - Stop current containers
   - Start containers with the rollback images
   - Wait for health checks to pass

### Finding the previous tag

```bash
# List recent Docker image tags from the registry
gh api repos/<owner>/<repo>/packages?package_type=container \
  | jq '.[].name'

# Or check recent deployment logs in GitHub Actions
gh run list --workflow=application-deploy.yml --limit=5
```

### Option 2: Manual SSH rollback

```bash
ssh user@your-server

cd ~/deployments/bslt/production

# Update docker-compose to use the previous image tag
# Edit docker-compose.prod.yml: change image tags to the previous version

docker compose --project-name bslt-production -f docker-compose.prod.yml down --timeout 30
docker compose --project-name bslt-production -f docker-compose.prod.yml up -d
```

## Database Considerations

Migrations are forward-only. When rolling back application code:

- **If the new deployment added columns/tables:** The old code simply ignores them. Safe to rollback.
- **If the new deployment renamed or dropped columns:** The old code may fail. You must manually restore the old schema (see `docs/runbooks/database-emergency.md`).
- **If the new deployment changed data formats:** You may need to reverse the data transformation manually.

**Best practice:** Always make schema changes backward-compatible. Add new columns as nullable, deprecate old columns before removing them.

## Post-Rollback Verification

1. **Health check:**
   ```bash
   curl -s https://your-api-url/health | jq .
   ```
2. **Smoke tests:** Log in, navigate key pages, create/read data
3. **Error rate:** Monitor application logs for 15 minutes to confirm error rate returns to baseline
4. **Database state:** Verify no data corruption from the partial deployment:
   ```sql
   SELECT count(*) FROM users;
   SELECT count(*) FROM tenants;
   ```

## Communication

1. **Team:** Post in the team channel with: what happened, when rollback was triggered, current status
2. **Status page:** If user-facing downtime exceeded 5 minutes, update the status page
3. **Follow-up:** Schedule a root cause investigation and postmortem for P1/P2 incidents (see `docs/runbooks/incident-response.md`)
