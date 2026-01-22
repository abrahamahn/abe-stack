# Developer Documentation

Technical reference for ABE Stack development, architecture, and best practices.

---

## Quick Navigation

| Document                                | Purpose                                          | When to Read                            |
| --------------------------------------- | ------------------------------------------------ | --------------------------------------- |
| [Architecture](./architecture.md)       | Monorepo structure, layering, hexagonal patterns | Adding dependencies, cross-package work |
| [Principles](./principles.md)           | Coding standards, patterns, anti-patterns        | Before any code change                  |
| [Dev Environment](./dev-environment.md) | Workflow, testing, linting, CI/CD                | Getting started, CI issues              |
| [Config Setup](./config-setup.md)       | TypeScript, path aliases, Vite, build            | Config changes, build issues            |
| [Testing](./testing.md)                 | Test strategy, patterns, examples                | Writing tests                           |
| [Security](./security.md)               | Auth, tokens, rate limiting, auditing            | Security-related changes                |

---

## Getting Started

New to the codebase? Read in this order:

1. **[Architecture](./architecture.md)** - Understand the monorepo structure
2. **[Principles](./principles.md)** - Learn the coding standards
3. **[Dev Environment](./dev-environment.md)** - Set up your workflow
4. **[Testing](./testing.md)** - Write your first tests

---

## Document Index

### Core Concepts

| Document                          | Description                                                                                    |
| --------------------------------- | ---------------------------------------------------------------------------------------------- |
| [Architecture](./architecture.md) | Monorepo structure, package layout, dependency flow, hexagonal architecture for server modules |
| [Principles](./principles.md)     | Non-negotiable rules, coding standards, patterns to follow, anti-patterns to avoid             |

### Development Workflow

| Document                                | Description                                                               |
| --------------------------------------- | ------------------------------------------------------------------------- |
| [Dev Environment](./dev-environment.md) | Development workflow, testing commands, linting, CI/CD, Docker setup      |
| [Config Setup](./config-setup.md)       | TypeScript configuration, path aliases, Vite setup, build system, caching |
| [Sync Scripts](./sync-scripts.md)       | DX automation scripts (path aliases, barrel exports, file headers)        |

### Testing

| Document                            | Description                                                                              |
| ----------------------------------- | ---------------------------------------------------------------------------------------- |
| [Testing](./testing.md)             | Test strategy, TDD workflow, unit/integration/E2E patterns, React testing best practices |
| [API Test Plan](./api-test-plan.md) | API endpoint test coverage, integration test status, testing priorities                  |

### Security & Performance

| Document                        | Description                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------- |
| [Security](./security.md)       | Password hashing, JWT tokens, refresh tokens, rate limiting, security events |
| [Performance](./performance.md) | Database optimization, frontend performance, profiling techniques            |

### Reference

| Document              | Description                                                               |
| --------------------- | ------------------------------------------------------------------------- |
| [Legacy](./legacy.md) | Migration guide from legacy codebase, reusable patterns, effort estimates |

---

## Related Documentation

- [Deployment Guide](../deploy/README.md) - Production deployment
- [TODO](../todo/TODO.md) - Planned features and tasks
- [ROADMAP](../todo/ROADMAP.md) - Deferred features
- [Weekly Logs](../log/) - Development progress
