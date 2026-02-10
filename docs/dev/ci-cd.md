# CI/CD End-to-End Workflow (Local -> GitHub -> DigitalOcean)

Last updated: 2026-02-10

This document is the operational source of truth for how code moves from local development to production deployment on the DigitalOcean droplet.

## Goals Of Current Design

- Keep local feedback fast.
- Enforce required quality gates before deploy.
- Build once in CI and deploy the exact built artifact (no rebuild during deploy).
- Support deterministic rollback.
- Keep deploy host resolution robust (artifact + secret/variable fallback).

## Source Of Truth Files

- `infra/git-hooks/pre-commit`
- `infra/git-hooks/pre-push`
- `src/tools/scripts/dev/pre-push.ts`
- `package.json`
- `turbo.json`
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `.github/workflows/rollback.yml`
- `.github/workflows/security.yml`
- `.github/workflows/infra-test.yml`
- `.github/workflows/infra-deploy.yml`
- `.github/workflows/infra-destroy.yml`
- `.github/workflows/auto-merge.yml`

## Local Development

Nothing runs automatically while editing files unless you run scripts manually.

Common manual commands:

- `pnpm dev`
- `pnpm lint`
- `pnpm type-check`
- `pnpm test`
- `pnpm sync:headers` (write/fix header paths)
- `pnpm sync:headers:check` (check-only)

## Local Commit (`git commit`)

Hook chain:

1. Git runs `infra/git-hooks/pre-commit` via `core.hooksPath`.
2. It runs `npx lint-staged`.

What `lint-staged` does:

- For staged `*.{js,jsx,ts,tsx}`:
- `prettier --write`
- `eslint --fix`
- For staged `*.{json,css,md}`:
- `prettier --write`

What it does not do:

- It does not run tests.
- It does not run type-check.
- It does not run `sync:headers:check`.

## Local Push (`git push`)

Hook chain:

1. Git runs `infra/git-hooks/pre-push` via `core.hooksPath`.
2. It runs `pnpm run pre-push`.
3. That executes `src/tools/scripts/dev/pre-push.ts`.

What pre-push script runs now:

1. `pnpm sync:headers:check`
2. `npx turbo run validate --output-logs=new-only`

Turbo `validate` includes:

- `lint`
- `type-check`
- `test`

Result:

- Push is blocked if headers, lint, type-check, or tests fail locally.

## GitHub Workflow Overview

## 1) CI (`.github/workflows/ci.yml`)

### Triggers

- `push` on `main`, `dev`
- `pull_request`
- `workflow_dispatch` (optional `full_build`)
- nightly `schedule`

### Concurrency

- `concurrency.group = ci-${{ github.ref }}`
- in-progress CI for same ref is canceled.

### Job flow

1. `setup`

- determines mode (`is_full_build`)
- installs dependencies and populates cache

2. `sanity-checks` (PR/fast mode)

- `pnpm sync:headers:check`
- `pnpm format:check`
- `pnpm lint`
- `pnpm type-check`
- `pnpm test`

3. `build-and-verify` (push/schedule/manual full mode)

- `pnpm sync:headers:check`
- `pnpm build`

4. `docker-build-publish` (only on `push` to `main`)

- runs only if `build-and-verify` passed
- builds and pushes API and Web images once
- writes `deployment-images.json` containing:
- commit SHA
- registry/name
- immutable image refs by digest (`image@sha256:...`)
- uploads artifact `deployment-images`

### Why this matters

- Deploy does not rebuild images.
- Deploy receives immutable refs produced by CI.

## 2) Deploy (`.github/workflows/deploy.yml`)

### Triggers

- `workflow_run` from `CI` on branch `main` (only when CI completed)
- `workflow_dispatch` (manual)

### Concurrency

- `concurrency.group = deploy-<env>-<app_name>`
- prevents overlapping deploys for same target.

### Gate behavior

- For `workflow_run`, deploy jobs run only if CI conclusion is `success`.

### Job flow

1. `get-infrastructure-info`

- tries deployment artifact `deployment-info-<env>-<provider>`
- fallback host resolution:
- `inputs.instance_ip`
- `vars.INSTANCE_IP`
- `vars.DEPLOY_HOST`
- `secrets.SERVER_HOST`
- fallback domain:
- `inputs.domain`
- `vars.DOMAIN`
- `secrets.DOMAIN`
- if domain unavailable, defaults to instance IP

2. `deploy`

- checks out target commit (workflow_run SHA)
- resolves image naming variables
- downloads `deployment-images` artifact from the triggering CI run (via `run-id`)
- chooses image refs:
- preferred: digest refs from artifact
- fallback (manual mode): `<registry>/<image>:<tag>-api|web`
- SSHes to droplet and deploys into namespaced path:
- `$HOME/deployments/<app_name>/<environment>`
- compose project name:
- `<app_name>-<environment>`
- pulls exact image refs and starts containers
- verifies health endpoint (`https` then `http` fallback)

### Build-once guarantee

- Mainline automatic deploy path uses artifact from CI build for the same commit.

## 3) Rollback (`.github/workflows/rollback.yml`)

### Trigger

- manual only (`workflow_dispatch`)

### Inputs

- `environment`
- `provider`
- `target_tag` (required)
- `app_name`
- `instance_ip` (optional host fallback)

### Behavior

- resolves target host from deployment artifact or fallback host sources
- uses same namespaced deployment path and compose project naming as deploy
- rewrites compose image tags to `target_tag`
- restarts and health-waits

Note: rollback currently uses tag-based refs, while normal deploy prefers digest-based refs.

## 4) Security (`.github/workflows/security.yml`)

### Triggers

- `push` on `main`, `dev`
- `pull_request` to `main`, `dev`
- weekly schedule
- manual dispatch

### Jobs

- CodeQL v4 (`javascript-typescript`)
- Semgrep SAST scan
- dependency vulnerability scanning (`pnpm audit`, `OSV-Scanner`)
- Gitleaks secret scanning
- Docker Trivy image/filesystem scanning

Security jobs are non-blocking by default and can be made blocking with repo variable `SECURITY_SCAN_NON_BLOCKING=false`.

## 5) Infra Workflows

- `infra-test.yml`: validates Terraform and infra config on `infra/**` changes and manual runs.
- `infra-deploy.yml`: manual Terraform plan/apply + emits deployment-info artifact.
- `infra-destroy.yml`: manual destroy with explicit `DESTROY` confirmation.

## 6) Auto-Merge (`.github/workflows/auto-merge.yml`)

- On push to `main`: auto merge `main -> dev`.
- On push to `claude/**`: auto merge that branch into `dev`.

## Exactly When Header Sync Checks Run

`sync:headers` (write mode):

- runs only when explicitly invoked (manual).

`sync:headers:check` (check mode):

- local pre-push hook
- CI sanity-checks job
- CI build-and-verify job

It no longer runs inside deploy workflow.

## Event Timelines

### A) Typical PR

1. local pre-commit (lint-staged)
2. local pre-push (headers check + validate)
3. GitHub CI sanity checks
4. security scans
5. no deploy

### B) Push to `main`

1. local pre-commit
2. local pre-push
3. GitHub CI full build
4. CI docker-build-publish creates immutable image artifact
5. security scans
6. deploy workflow_run starts after CI success
7. deploy pulls artifact images and deploys to droplet

### C) Manual deploy

1. run `deploy.yml` manually
2. infra info resolved from artifact/fallback host
3. artifact image refs used if available; otherwise fallback tag refs
4. deploy to droplet

## Required Secrets/Variables (Deploy Path)

Commonly used by deploy/CI:

- `REGISTRY_USERNAME`
- `REGISTRY_PASSWORD`
- `SSH_PRIVATE_KEY`
- `SERVER_HOST` (fallback host)
- `SERVER_USER` (optional; default root fallback exists)
- `POSTGRES_PASSWORD` or `DB_PASSWORD`
- `JWT_SECRET`
- `SESSION_SECRET`
- `ACME_EMAIL`
- `DOMAIN` (optional but recommended)

Variables:

- `IMAGE_NAME` (if missing owner prefix, workflow auto-prefixes)
- `REGISTRY` (optional if secret `REGISTRY` is used)
- `SSH_USERNAME`, `SSH_PORT` (optional overrides)

## Recommended Team Habits

- Before large commits: `pnpm sync:headers`
- Before push if uncertain: `pnpm sync:headers:check`
- For full confidence before release: `pnpm build`
- Keep `main` protected with required CI checks and production environment approval.
