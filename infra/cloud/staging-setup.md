# Staging Environment Setup

Staging mirrors production using a separate **Terraform workspace**. Each
workspace has its own isolated state file — staging and production never share
state, so a plan in one environment never touches resources in the other.

## Prerequisites

- Terraform >= 1.0
- DigitalOcean API token (or GCP credentials)
- SSH key pair for server access
- Domain name for staging (e.g., `staging.yourdomain.com`)

---

## 1. Create workspaces (first time only)

```bash
cd infra/cloud

terraform workspace new staging
terraform workspace new production

# Confirm
terraform workspace list
#   default
# * staging
#   production
```

> Never deploy from the `default` workspace. It exists only as Terraform's
> built-in fallback and has no corresponding environment.

---

## 2. Configure variables

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and fill in your credentials. For staging, use
smaller instance sizes and disable managed DB to keep costs low:

```hcl
domain              = "staging.yourdomain.com"
ssh_public_key      = "ssh-ed25519 AAAA... your-key"
digitalocean_token  = "dop_v1_..."

instance_size           = "s-1vcpu-1gb"
enable_managed_database = false
database_node_count     = 1

# Restrict SSH to your IP in staging too
ssh_allowed_cidrs = ["your.ip.address/32"]
```

---

## 3. Deploy staging

```bash
terraform workspace select staging
terraform init       # only needed once per workspace
terraform plan
terraform apply
```

---

## 4. Deploy production

```bash
terraform workspace select production
terraform plan
terraform apply
```

Production should use larger resources — override in `terraform.tfvars` or
pass `-var` flags:

```bash
terraform apply \
  -var="instance_size=s-2vcpu-4gb" \
  -var="enable_managed_database=true" \
  -var="database_node_count=2"
```

---

## 5. Application deployment

After infrastructure is provisioned, deploy the application stack:

```bash
# SSH in (IP from terraform output)
ssh bslt@$(terraform output -raw instance_public_ip)

# On the server — pull the compose stack and run it
git clone <repo-url> /home/bslt/bslt
cd /home/bslt/bslt
docker compose -f infra/docker/production/docker-compose.prod.yml \
  --env-file config/env/.env.staging up -d
```

---

## 6. CI/CD integration

Trigger workspace-aware deploys from GitHub Actions:

```yaml
deploy-staging:
  if: github.ref == 'refs/heads/staging'
  environment: staging
  steps:
    - uses: actions/checkout@v4
    - uses: hashicorp/setup-terraform@v3
    - run: |
        terraform workspace select staging
        terraform apply -auto-approve
      env:
        DIGITALOCEAN_TOKEN: ${{ secrets.DO_TOKEN_STAGING }}
        AWS_ACCESS_KEY_ID: ${{ secrets.SPACES_KEY }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.SPACES_SECRET }}
```

---

## 7. Resource comparison

| Resource   | Staging       | Production                 |
| ---------- | ------------- | -------------------------- |
| Compute    | s-1vcpu-1gb   | s-2vcpu-4gb+               |
| Managed DB | Disabled      | Optional (2+ nodes for HA) |
| Backups    | Disabled      | Enabled                    |
| TLS        | Let's Encrypt | Let's Encrypt              |
| Monitoring | Enabled       | Enabled                    |

---

## 8. Teardown

```bash
terraform workspace select staging
terraform destroy
```
