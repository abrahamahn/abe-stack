# Documentation

_Last Updated: January 22, 2026_

Central index for ABE Stack documentation.

---

## Quick Navigation

| Area          | Entry Point           | Purpose                          |
| ------------- | --------------------- | -------------------------------- |
| Overview      | Root `README.md`      | Project overview and quick start |
| Agent Guide   | `AGENTS.md`           | AI agent behavioral rules        |
| Specs         | `specs/README.md`     | Architecture and principles      |
| Dev Guides    | `dev/README.md`       | Workflow, testing, tooling       |
| Reference     | `reference/README.md` | Legacy patterns and migration    |
| What to Build | `todo/TODO.md`        | Active tasks and priorities      |
| Deferred      | `todo/ROADMAP.md`     | Future features (not now)        |
| Deployment    | `deploy/README.md`    | Production deployment guides     |
| Weekly Logs   | `log/`                | Development changelog            |

---

## Documentation Structure

```
docs/
├── README.md           # This file - documentation index
├── AGENTS.md           # Agent behavioral rules (symlink to .claude/CLAUDE.md)
│
├── specs/              # Specifications (architecture & design)
│   ├── README.md       # Specs index
│   ├── architecture.md # Monorepo structure, layering
│   └── principles.md   # Coding standards, patterns
│
├── dev/                # Development guides (workflow & tooling)
│   ├── README.md       # Dev docs index
│   ├── workflow.md     # Development workflow
│   ├── configuration.md # Build configuration
│   ├── testing.md      # Test strategy and patterns
│   ├── sync-scripts.md # DX automation
│   ├── security.md     # Security architecture
│   └── performance.md  # Optimization techniques
│
├── reference/          # Reference material
│   ├── README.md       # Reference index
│   └── legacy.md       # Legacy migration patterns
│
├── todo/               # Task tracking
│   ├── TODO.md         # Active tasks and priorities
│   ├── ROADMAP.md      # Deferred features
│   └── QUALITY-TEST.md # Quality test checklist
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
2. `specs/architecture.md` - Understand structure
3. `specs/principles.md` - Coding standards
4. `dev/workflow.md` - Set up workflow

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
| architecture, layers, hexagonal    | `specs/architecture.md`   |
| patterns, anti-patterns, standards | `specs/principles.md`     |
| testing, TDD, vitest               | `dev/testing.md`          |
| security, auth, tokens             | `dev/security.md`         |
| path aliases, barrel exports       | `dev/sync-scripts.md`     |
| CI/CD, git hooks, docker           | `dev/workflow.md`         |
| legacy, migration                  | `reference/legacy.md`     |
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
