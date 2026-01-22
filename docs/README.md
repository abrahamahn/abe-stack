# Documentation

_Last Updated: January 22, 2026_

Central index for ABE Stack documentation.

---

## Quick Navigation

| Area          | Entry Point        | Purpose                           |
| ------------- | ------------------ | --------------------------------- |
| Overview      | Root `README.md`   | Project overview and quick start  |
| Agent Guide   | `AGENTS.md`        | AI agent behavioral rules         |
| What to Build | `todo/TODO.md`     | Active tasks and priorities       |
| Deferred      | `todo/ROADMAP.md`  | Future features (not now)         |
| Weekly Logs   | `log/`             | Development changelog             |
| Dev Reference | `dev/README.md`    | Architecture, testing, principles |
| Deployment    | `deploy/README.md` | Production deployment guides      |

---

## Documentation Structure

```
docs/
├── README.md           # This file - documentation index
├── AGENTS.md           # Agent behavioral rules (symlink to .claude/CLAUDE.md)
│
├── todo/               # Task tracking
│   ├── TODO.md         # Active tasks and priorities
│   ├── ROADMAP.md      # Deferred features
│   └── QUALITY-TEST.md # Quality test checklist
│
├── dev/                # Developer reference
│   ├── README.md       # Dev docs index
│   ├── architecture.md # Monorepo structure, layering
│   ├── principles.md   # Coding standards, patterns
│   ├── testing.md      # Test strategy and patterns
│   ├── security.md     # Security architecture
│   ├── config-setup.md # Build configuration
│   ├── dev-environment.md # Development workflow
│   ├── sync-scripts.md # DX automation
│   ├── performance.md  # Optimization techniques
│   ├── api-test-plan.md # API test coverage
│   └── legacy.md       # Legacy migration reference
│
├── deploy/             # Deployment guides
│   ├── README.md       # Deployment overview
│   ├── digitalocean.md # DigitalOcean deployment
│   ├── gcp.md          # Google Cloud deployment
│   ├── reverse-proxy.md # Caddy configuration
│   └── trusted-proxy-setup.md # Proxy security
│
├── agent/              # Agent-specific docs
│   ├── workflows.md    # Task workflows
│   ├── complex-tasks.md # Complex task guidance
│   └── agent-prompts.md # Prompt templates
│
└── log/                # Weekly development logs
    ├── README.md       # Log format guide
    ├── 2026-W01.md
    ├── 2026-W02.md
    ├── 2026-W03.md
    └── 2026-W04.md     # Current week
```

---

## Reading Paths

### New to the Codebase

1. Root `README.md` - Project overview
2. `dev/architecture.md` - Understand structure
3. `dev/principles.md` - Coding standards
4. `dev/dev-environment.md` - Set up workflow

### Agent Development

1. `AGENTS.md` - Behavioral rules
2. `agent/workflows.md` - Task classification
3. `agent/complex-tasks.md` - Complex task handling

### Deployment

1. `deploy/README.md` - Overview
2. `deploy/digitalocean.md` or `deploy/gcp.md` - Platform guide
3. `deploy/reverse-proxy.md` - Caddy setup

---

## Keyword Routing

| Keyword                            | Document                  |
| ---------------------------------- | ------------------------- |
| architecture, layers, hexagonal    | `dev/architecture.md`     |
| patterns, anti-patterns, standards | `dev/principles.md`       |
| testing, TDD, vitest               | `dev/testing.md`          |
| security, auth, tokens             | `dev/security.md`         |
| path aliases, barrel exports       | `dev/sync-scripts.md`     |
| CI/CD, git hooks, docker           | `dev/dev-environment.md`  |
| deployment, production             | `deploy/README.md`        |
| digitalocean, droplet              | `deploy/digitalocean.md`  |
| gcp, google cloud                  | `deploy/gcp.md`           |
| caddy, reverse proxy, TLS          | `deploy/reverse-proxy.md` |
| task classification, checkpoints   | `agent/workflows.md`      |
| changelog, history                 | `log/`                    |
| roadmap, deferred                  | `todo/ROADMAP.md`         |
| todo, priorities                   | `todo/TODO.md`            |

---

## Token Budget Tips (for Agents)

- Index files: ~200-500 tokens each
- Load specific docs only when needed
- Never load full folders - use index tables
- For complex tasks: Load `agent/workflows.md` first
