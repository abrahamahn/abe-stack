# DigitalOcean Auto-Deploy (Push to Deploy)

This project already includes GitHub Actions workflows for automated DigitalOcean deployment.

What you get:

- `main` push -> CI builds/pushes Docker images -> production deploy workflow runs automatically.
- `staging` push -> staging build/test/deploy workflow runs automatically.
- Droplet update is remote and automated over SSH.

## 1) One-time Ubuntu setup on droplet

On a fresh Ubuntu 24.04 droplet:

```bash
ssh root@<droplet_ip>
```

Run the bootstrap script from this repo:

```bash
# inside repository on your local machine
scp infra/cloud/digitalocean/bootstrap-once.sh root@<droplet_ip>:/root/bootstrap-once.sh
ssh root@<droplet_ip> 'chmod +x /root/bootstrap-once.sh && /root/bootstrap-once.sh --app-name bslt --deploy-user bslt'
```

After this, your server has Docker, UFW, fail2ban, unattended upgrades, and a deploy user.

## 2) GitHub secrets and variables required

Set these in GitHub repo settings.

Secrets:

- `DIGITALOCEAN_TOKEN` (needed if you run Terraform infra workflow)
- `SSH_PUBLIC_KEY` (for Terraform droplet creation)
- `SSH_PRIVATE_KEY` (private key used by deploy workflow to SSH into droplet)
- `SERVER_USER` (optional, defaults to `root`)
- `SERVER_PORT` (optional, defaults to `22`)
- `SERVER_HOST` (required if no infrastructure artifact is available)
- `DOMAIN` (or set as variable)
- `ACME_EMAIL`
- `DB_PASSWORD` or `POSTGRES_PASSWORD`
- `JWT_SECRET`
- `COOKIE_SECRET`
- `OAUTH_TOKEN_ENCRYPTION_KEY`
- `REGISTRY_USERNAME`
- `REGISTRY_PASSWORD`

Variables:

- `REGISTRY` (default `ghcr.io`)
- `IMAGE_NAME` (e.g. `your-org/bslt`)
- `INSTANCE_IP` or `DEPLOY_HOST` (recommended fallback if infra artifact expires)
- `DOMAIN` (optional if set as secret)
- `SSH_USERNAME` (optional)
- `SSH_PORT` (optional)
- Optional DO sizing values used by infra workflow (`DO_REGION`, `DO_INSTANCE_SIZE`, etc.)

## 3) Create infrastructure (one-time)

Option A: GitHub Actions Terraform workflow (recommended)

- Run `Infrastructure Deploy` workflow.
- Inputs:
  - `environment=production`
  - `provider=digitalocean`
  - `action=apply`
  - `auto_approve=true`

Option B: Manually create droplet and point DNS, then set `SERVER_HOST` + `DOMAIN`.

## 4) Deploy application

- Automatic production deploy path is already configured:
  - Push to `main`
  - CI workflow publishes images
  - `Deploy` workflow is triggered via `workflow_run` on CI success

- Staging deploy path is already configured:
  - Push to `staging`

## 5) Verify

- GitHub Actions:
  - `CI` succeeds
  - `Deploy` succeeds
- On server:

```bash
ssh <user>@<droplet_ip>
docker ps
curl -I https://<domain>/health
```

## Notes

- Deployment info artifacts from infra workflow are retained for 30 days. Set `INSTANCE_IP`/`DEPLOY_HOST` + `DOMAIN` as repo variables for stable long-term deploys.
- Keep SSH access restricted (set `ssh_allowed_cidrs` in Terraform for production).
