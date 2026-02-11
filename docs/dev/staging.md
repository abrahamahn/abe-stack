# Staging Environment & PR Preview Deployments

## Staging Environment

### How to Deploy

**Automatic:** Push or merge to the `staging` branch triggers `.github/workflows/staging.yml`.

```bash
# Deploy current branch to staging
git push origin my-branch:staging
```

**Manual:** Trigger via GitHub Actions > "Deploy to Staging" > Run workflow. Optionally specify a branch name.

### Environment Configuration

Staging uses the GitHub `staging` environment, which requires its own set of secrets and variables. These mirror production but point to isolated resources:

| Variable / Secret | Description |
|---|---|
| `REGISTRY` | Container registry (defaults to `ghcr.io`) |
| `IMAGE_NAME` | Docker image name |
| `SSH_PRIVATE_KEY` | SSH key for staging server |
| `INSTANCE_IP` | Staging server IP (or via deployment artifact) |
| `DB_PASSWORD` | Staging database password (separate from production) |
| `JWT_SECRET` | Staging JWT secret (separate from production) |
| `SESSION_SECRET` | Staging session secret (separate from production) |
| `STRIPE_SECRET_KEY` | Stripe **test mode** key |
| `STRIPE_WEBHOOK_SECRET` | Stripe test webhook secret |

### Accessing Staging

Once deployed, staging is accessible at the domain configured in the `staging` GitHub environment. Staging uses the same Docker Compose stack as production but with smaller resource allocations.

### Relationship to Production Deploy

The staging workflow (`staging.yml`) runs build and test validation before deploying. For full infrastructure deployment (Terraform), use the existing `infra-deploy.yml` workflow with `environment: staging`. The production `deploy.yml` also supports staging via its `environment` input when triggered manually.

## PR Preview Deployments

### How It Works

1. Open a PR (or push to an existing PR) -- `.github/workflows/preview.yml` triggers automatically.
2. The workflow builds the project and generates a preview URL: `pr-{number}.preview.abe-stack.dev`.
3. A comment is posted (or updated) on the PR with the preview URL.
4. When the PR is closed or merged, the preview environment is cleaned up automatically.

### Preview URLs

Each PR gets a unique, deterministic URL:

```
https://pr-123.preview.abe-stack.dev
```

The comment on the PR is updated on each push (not duplicated), showing the latest commit and timestamp.

### Cleanup

The `cleanup` job runs when a PR is closed (merged or abandoned). It removes the preview environment and any associated resources.

### Infrastructure Requirements

Preview deployments require infrastructure that supports dynamic environments. Options include:

- **Container-based:** Spin up isolated Docker Compose stacks per PR on a shared preview server
- **Platform-based:** Use a platform with built-in preview support (Vercel, Railway, Render)
- **Kubernetes:** Deploy to a shared cluster with namespace-per-PR isolation

The current workflows contain placeholder deploy/cleanup steps. Replace these with actual deployment commands once infrastructure is provisioned.
