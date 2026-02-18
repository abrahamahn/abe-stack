# Development Guides

Workflow, testing, configuration, and tooling documentation for BSLT.

---

## Quick Navigation

| Document                            | Purpose                                    | When to Read                 |
| ----------------------------------- | ------------------------------------------ | ---------------------------- |
| [Workflow](./workflow.md)           | Development workflow, linting, CI/CD       | Getting started, CI issues   |
| [Configuration](./configuration.md) | TypeScript, path aliases, Vite, build      | Config changes, build issues |
| [Testing](./testing.md)             | Test strategy, TDD, React testing patterns | Writing tests                |
| [Sync Scripts](./sync-scripts.md)   | DX automation scripts                      | Understanding automation     |
| [Security](./security.md)           | Auth, tokens, rate limiting, auditing      | Security-related changes     |
| [Security CI](./security-ci.md)     | CodeQL, Semgrep, OSV, Gitleaks, Trivy      | Security pipeline & triage   |
| [Performance](./performance.md)     | Database and frontend optimization         | Performance issues           |

---

## Documents

### Setup & Workflow

| Document                            | Description                                                |
| ----------------------------------- | ---------------------------------------------------------- |
| [Workflow](./workflow.md)           | Development workflow, commands, linting, CI/CD, Docker     |
| [Configuration](./configuration.md) | TypeScript configuration, path aliases, Vite, build system |

### Quality

| Document                | Description                                                |
| ----------------------- | ---------------------------------------------------------- |
| [Testing](./testing.md) | TDD workflow, unit/integration/E2E patterns, React testing |

### Automation

| Document                          | Description                                                       |
| --------------------------------- | ----------------------------------------------------------------- |
| [Sync Scripts](./sync-scripts.md) | DX automation (path aliases, barrel exports, file headers, theme) |
| [Security CI](./security-ci.md)   | CI security scanning pipeline and tuning (private repo friendly)  |

### Production

| Document                        | Description                                                 |
| ------------------------------- | ----------------------------------------------------------- |
| [Security](./security.md)       | Password hashing, JWT tokens, refresh tokens, rate limiting |
| [Security CI](./security-ci.md) | Code scanning pipeline, severity tuning, blocking strategy  |
| [Performance](./performance.md) | Database optimization, N+1 fixes, frontend code splitting   |

---

## Related Documentation

- [Specifications](../specs/) - Architecture and principles
- [Reference](../reference/) - Migration guides and legacy patterns
- [TODO](../todo/TODO.md) - Planned features and tasks
- [Weekly Logs](../log/) - Development progress
