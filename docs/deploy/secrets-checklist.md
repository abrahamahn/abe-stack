# Secrets Checklist

This checklist ensures all required GitHub secrets and variables are configured before deployment.

## Repository Variables (GitHub Settings -> Secrets and variables -> Variables)

Set these in your repository variables.

### Container Registry

```bash
REGISTRY=ghcr.io                  # Optional, defaults to ghcr.io
IMAGE_NAME=your-org/bslt          # Optional, defaults to <owner>/<repo>
```

### Deployment Target

```bash
DOMAIN=yourdomain.com             # Optional fallback if DOMAIN secret is not set
INSTANCE_IP=your-server-ip        # Recommended fallback host for deploy workflow
DEPLOY_HOST=your-server-ip        # Alternate fallback key accepted by workflow
SSH_USERNAME=bslt                 # Optional, defaults to root
SSH_PORT=22                       # Optional, defaults to 22
```

### Optional Infrastructure Inputs

```bash
DO_REGION=nyc1
DO_INSTANCE_SIZE=s-1vcpu-1gb
DO_ENABLE_MANAGED_DB=false
DO_DATABASE_SIZE=db-s-1vcpu-1gb
```

## Repository Secrets (GitHub Settings -> Secrets and variables -> Secrets)

Set these encrypted secrets.

### Required for App Deploy

```bash
SSH_PRIVATE_KEY=-----BEGIN OPENSSH PRIVATE KEY-----...
ACME_EMAIL=admin@yourdomain.com
DB_PASSWORD=strong-random-value             # Or use POSTGRES_PASSWORD
JWT_SECRET=strong-random-value
COOKIE_SECRET=strong-random-value
OAUTH_TOKEN_ENCRYPTION_KEY=strong-random-value
REGISTRY_USERNAME=your-registry-username
REGISTRY_PASSWORD=your-registry-password
```

### Optional Deploy Fallbacks

```bash
SERVER_HOST=your-server-ip-or-domain
SERVER_USER=bslt
SERVER_PORT=22
DOMAIN=yourdomain.com
POSTGRES_PASSWORD=strong-random-value
```

### Required if Using Terraform Infra Workflow

```bash
DIGITALOCEAN_TOKEN=dop_v1_xxx
SSH_PUBLIC_KEY=ssh-ed25519 AAAA...
```

## Pre-Deployment Checklist

- [ ] All required secrets are set.
- [ ] `SSH_PRIVATE_KEY` matches a public key in the droplet user's `authorized_keys`.
- [ ] DNS `A`/`AAAA` records point to the droplet.
- [ ] Firewall allows `22`, `80`, `443`.
- [ ] `DB_PASSWORD` (or `POSTGRES_PASSWORD`) is random and strong.
- [ ] `JWT_SECRET`, `COOKIE_SECRET`, and `OAUTH_TOKEN_ENCRYPTION_KEY` are unique per environment.

## Notes

- The deploy workflow writes the remote `.env` file automatically on each deploy.
- Infrastructure deployment artifact retention is 30 days, so keeping `INSTANCE_IP` or `DEPLOY_HOST` set as a variable avoids future deploy interruptions.

## Secret Generation

```bash
openssl rand -base64 32
```

## Troubleshooting

### SSH connection failed

- Verify `SSH_PRIVATE_KEY` and target host/user values.
- Test manually: `ssh -i ~/.ssh/id_ed25519 user@host`.
- Confirm the same public key is present in `~/.ssh/authorized_keys` on the server.

### Registry push failed

- Verify `REGISTRY_USERNAME` and `REGISTRY_PASSWORD`.
- Confirm package publish permissions for your repository.

### Deployment failed after infra artifact expired

- Set repo variable `INSTANCE_IP` (or `DEPLOY_HOST`) and `DOMAIN`.
