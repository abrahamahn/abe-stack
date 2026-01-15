# Documentation Index

_Last Updated: January 15, 2026_

**Agent Loading Order (Critical for Token Efficiency):**

1. Load this file first - it routes everything.
2. Use specific paths only when needed.
3. Never load full folders - prefer index.md tables for overviews.
4. For complex tasks: Load agent/session-bridge.md + dev/workflows/classification.md next.

Token Budget Tips:

- Index files: ~200-500 tokens each
- Appendix examples: ~1-2K tokens max
- Full docs (e.g., use-cases): Only if explicitly needed

---

## Quick Navigation

| Area         | Entry Point                    | Purpose                          |
| ------------ | ------------------------------ | -------------------------------- |
| Overview     | `README.md`                    | Project overview and quick start |
| Roadmap      | `ROADMAP.md`                   | Milestones and task tracking     |
| Changelog    | `CHANGELOG.md`                 | Detailed change history          |
| Agent Guide  | `AGENTS.md`                    | AI agent development guide       |
| Architecture | `dev/architecture/index.md`    | System design and structure      |
| Security     | `security/phase-1-complete.md` | Security implementation          |
| Dev Guide    | `dev/`                         | Developer reference docs         |
| UI Package   | `ui/todo.md`                   | UI component priorities          |

---

## Architecture Documentation

| Document                    | Purpose                              |
| --------------------------- | ------------------------------------ |
| `dev/architecture/index.md` | Architecture overview (consolidated) |

---

## Security Documentation

| Document                       | Purpose                   |
| ------------------------------ | ------------------------- |
| `security/index.md`            | Security overview         |
| `security/phase-1-complete.md` | Phase 1 completion report |
| `security/phase-2-roadmap.md`  | Phase 2 roadmap and tasks |

---

## Developer Documentation (dev/)

### Principles & Architecture

- `dev/principles/index.md` - Principles, patterns, anti-patterns, standards (consolidated)
- `dev/architecture/index.md` - Technical architecture (consolidated)

### Testing

- `dev/testing/index.md` - Testing overview
- `dev/testing/overview.md` - Testing philosophy
- `dev/testing/levels.md` - Test levels (unit/integration/E2E)
- `dev/testing/commands.md` - Test commands
- `dev/testing/examples.md` - Test examples

### Workflows

- `dev/workflows/index.md` - Workflow overview
- `dev/workflows/classification.md` - Task classification
- `dev/workflows/precompletion.md` - Pre-completion checks
- `dev/workflows/development.md` - Development flow
- `dev/workflows/commands.md` - Workflow commands

### Other

- `dev/performance/index.md` - Performance guidelines
- `dev/use-cases/index.md` - Common use cases

---

## Agent Documentation (agent/)

| Document                    | Purpose                     |
| --------------------------- | --------------------------- |
| `agent/agent-prompts.md`    | Agent prompt templates      |
| `agent/agent-self-check.md` | Self-verification checklist |
| `agent/complex-tasks.md`    | Complex task guidance       |
| `agent/session-bridge.md`   | Session continuation        |

---

## Keyword Routing

| Keyword                | Document                          |
| ---------------------- | --------------------------------- |
| task classification    | `dev/workflows/classification.md` |
| pre-completion checks  | `dev/workflows/precompletion.md`  |
| dependency rules       | `dev/architecture/index.md`       |
| layer boundaries       | `dev/architecture/index.md`       |
| hexagonal architecture | `dev/architecture/index.md`       |
| import order           | `dev/principles/index.md`         |
| testing commands       | `dev/testing/commands.md`         |
| patterns               | `dev/principles/index.md`         |
| anti-patterns          | `dev/principles/index.md`         |
| coding standards       | `dev/principles/index.md`         |
| resume session         | `agent/session-bridge.md`         |
| file organization      | `AGENTS.md` (Section 5)           |
| path aliases           | `AGENTS.md` (Section 5)           |
| v5 migration           | `dev/architecture/index.md`       |
| real-time sync         | `dev/architecture/index.md`       |
| security phase 2       | `security/phase-2-roadmap.md`     |
| roadmap                | `ROADMAP.md`                      |

---

## Scope Guide

- `agent/` - AI agent workflow and behavior docs only
- `dev/` - Shared technical reference (architecture, principles, testing, workflows)
- `security/` - Security implementation and roadmap
- `ui/` - UI package priorities and todos

## Reference Convention

- All paths are relative to `docs/`
- Use `dev/...` for technical docs (architecture, principles, testing, workflows)
- Use `agent/...` for agent workflows
- Prefer specific modules over overviews when precision is needed
