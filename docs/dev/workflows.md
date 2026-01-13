# Development Workflows

_Last Updated: January 10, 2026_

Development workflows, CI/CD, and quality gates for ABE Stack.

---

## Local Development

### Quick Start

```bash
# Install dependencies
pnpm install

# Start all services
pnpm dev

# Start specific app
pnpm --filter @abe-stack/web dev
pnpm --filter @abe-stack/server dev
```

### Environment Setup

```bash
# Copy example env
cp config/.env.example config/.env.development

# Required variables
DATABASE_URL=postgresql://user:pass@localhost:5432/abestack
JWT_SECRET=your-secret-key
```

### Database

```bash
# Start Postgres (Docker)
docker compose -f config/docker/docker-compose.yml up -d postgres

# Run migrations
pnpm db:migrate

# Seed test data
pnpm db:seed
```

---

## Quality Gates

### Pre-Commit Checks

Enforced via `simple-git-hooks` + `lint-staged`:

```bash
# Runs on every commit
pnpm format:check   # Prettier formatting
pnpm lint           # ESLint rules
```

### Pre-Push Checks

```bash
# Runs before push
pnpm type-check     # TypeScript compilation
pnpm test           # Unit/integration tests
```

### Full Build

```bash
# Complete validation (run before PRs)
pnpm build

# This runs:
# 1. pnpm format:check
# 2. pnpm lint
# 3. pnpm type-check
# 4. pnpm test
# 5. pnpm build (compilation)
```

---

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile
      - run: pnpm format:check
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm test
      - run: pnpm build
```

### Branch Strategy

| Branch      | Purpose      | CI Checks          |
| ----------- | ------------ | ------------------ |
| `main`      | Production   | Full suite         |
| `develop`   | Integration  | Full suite         |
| `feature/*` | New features | Lint + Type + Unit |
| `fix/*`     | Bug fixes    | Lint + Type + Unit |

---

## Code Review Checklist

### Before Opening PR

- [ ] `pnpm build` passes locally
- [ ] Tests added for new functionality
- [ ] No `console.log` or debug code
- [ ] TypeScript types are explicit (no `any`)
- [ ] Documentation updated if needed

### PR Description Template

```markdown
## Summary

Brief description of changes

## Type

- [ ] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation

## Testing

- [ ] Unit tests added
- [ ] E2E tests added (if applicable)
- [ ] Manual testing done

## Checklist

- [ ] `pnpm build` passes
- [ ] No breaking changes (or documented)
```

---

## Git Commit Convention

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type       | Description                     |
| ---------- | ------------------------------- |
| `feat`     | New feature                     |
| `fix`      | Bug fix                         |
| `docs`     | Documentation only              |
| `style`    | Formatting, no code change      |
| `refactor` | Code change without fix/feature |
| `test`     | Adding tests                    |
| `chore`    | Build, config, tooling          |

### Examples

```bash
feat(auth): add refresh token rotation
fix(ui): correct button disabled state
docs: update README quickstart
refactor(api): extract validation helpers
test(ui): add Switch accessibility tests
chore: update dependencies
```

---

## Iterative Development

### During Active Development

Run targeted tests for fast feedback:

```bash
# Watch mode for specific file
pnpm vitest watch packages/ui/src/components/__tests__/Button.test.tsx

# Run tests matching pattern
pnpm vitest run -t "Button"

# Type-check single package
pnpm --filter @abe-stack/ui type-check
```

### Before Committing

```bash
# Quick validation
pnpm lint && pnpm type-check

# Full validation
pnpm build
```

---

## Troubleshooting

### Common Issues

**Build fails with type errors**

```bash
# Clear TypeScript cache
rm -rf **/tsconfig.tsbuildinfo
pnpm type-check
```

**Tests fail after dependency update**

```bash
# Clear test cache
rm -rf node_modules/.vitest
pnpm test
```

**Stale dependencies**

```bash
# Clean install
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Debug Mode

```bash
# Verbose Turbo logs
TURBO_LOG=debug pnpm build

# Vitest UI for debugging
pnpm vitest --ui
```

---

## Scripts Reference

| Script              | Description                |
| ------------------- | -------------------------- |
| `pnpm dev`          | Start all apps in dev mode |
| `pnpm build`        | Full build with all checks |
| `pnpm test`         | Run all tests              |
| `pnpm test:watch`   | Run tests in watch mode    |
| `pnpm lint`         | ESLint check               |
| `pnpm lint:fix`     | ESLint auto-fix            |
| `pnpm format`       | Prettier format            |
| `pnpm format:check` | Prettier check             |
| `pnpm type-check`   | TypeScript compilation     |
| `pnpm db:migrate`   | Run database migrations    |
| `pnpm db:seed`      | Seed database              |

---

## Related Documentation

- [Testing Guide](./testing.md) - Testing patterns
- [Architecture](../architecture/index.md) - Code organization
- [Roadmap](../ROADMAP.md) - CI/CD milestones
