# Documentation Index

_Last Updated: January 10, 2026_

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
| Architecture | `architecture/index.md`        | System design and structure      |
| Security     | `security/phase-1-complete.md` | Security implementation          |
| Dev Guide    | `dev/`                         | Developer reference docs         |
| UI Package   | `ui/todo.md`                   | UI component priorities          |

---

## Architecture Documentation

| Document                                        | Purpose                              |
| ----------------------------------------------- | ------------------------------------ |
| `architecture/index.md`                         | Architecture overview and principles |
| `architecture/v5-proposal.md`                   | V5 layer-based restructure proposal  |
| `architecture/chet-comparison.md`               | CHET-Stack feature comparison        |
| `architecture/realtime/overview.md`             | Real-time features quick start       |
| `architecture/realtime/architecture.md`         | Real-time sync architecture          |
| `architecture/realtime/implementation-guide.md` | Step-by-step implementation          |
| `architecture/realtime/patterns.md`             | Common real-time patterns            |

---

## Security Documentation

| Document                       | Purpose                   |
| ------------------------------ | ------------------------- |
| `security/phase-1-complete.md` | Phase 1 completion report |
| `security/phase-2-roadmap.md`  | Phase 2 roadmap and tasks |

---

## Developer Documentation (dev/)

### Principles & Architecture

- `dev/principles/index.md` - Core principles overview
- `dev/principles/principles-core.md` - Core principles detail
- `dev/principles/principles-why.md` - Rationale behind principles
- `dev/architecture/index.md` - Technical architecture
- `dev/architecture/layers.md` - Layer boundaries
- `dev/architecture/dependencies.md` - Dependency rules
- `dev/architecture/structure.md` - File/folder structure
- `dev/architecture/patterns.md` - Architecture patterns
- `dev/architecture/env.md` - Environment configuration

### Testing

- `dev/testing.md` - Testing guide (new consolidated)
- `dev/testing/index.md` - Testing overview
- `dev/testing/overview.md` - Testing philosophy
- `dev/testing/levels.md` - Test levels (unit/integration/E2E)
- `dev/testing/commands.md` - Test commands
- `dev/testing/examples.md` - Test examples

### Workflows

- `dev/workflows.md` - Workflows guide (new consolidated)
- `dev/workflows/index.md` - Workflow overview
- `dev/workflows/classification.md` - Task classification
- `dev/workflows/precompletion.md` - Pre-completion checks
- `dev/workflows/development.md` - Development flow
- `dev/workflows/commands.md` - Workflow commands

### Patterns & Standards

- `dev/patterns/index.md` - Pattern overview
- `dev/patterns/appendix-examples.md` - Pattern examples
- `dev/anti-patterns/index.md` - Anti-pattern overview
- `dev/anti-patterns/appendix-examples.md` - Anti-pattern examples
- `dev/coding-standards/index.md` - Coding standards
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

| Keyword               | Document                                 |
| --------------------- | ---------------------------------------- |
| task classification   | `dev/workflows/classification.md`        |
| pre-completion checks | `dev/workflows/precompletion.md`         |
| dependency rules      | `dev/architecture/dependencies.md`       |
| layer boundaries      | `dev/architecture/layers.md`             |
| import order          | `dev/coding-standards/index.md`          |
| testing commands      | `dev/testing/commands.md`                |
| api client pattern    | `dev/patterns/appendix-examples.md`      |
| anti-pattern examples | `dev/anti-patterns/appendix-examples.md` |
| resume session        | `agent/session-bridge.md`                |
| file organization     | `AGENTS.md` (Section 5)                  |
| path aliases          | `AGENTS.md` (Section 5)                  |
| v5 migration          | `architecture/v5-proposal.md`            |
| real-time sync        | `architecture/realtime/overview.md`      |
| chet-stack            | `architecture/chet-comparison.md`        |
| security phase 2      | `security/phase-2-roadmap.md`            |
| roadmap               | `ROADMAP.md`                             |

---

## Scope Guide

- `agent/` - AI agent workflow and behavior docs only
- `dev/` - Shared technical reference for both humans and agents
- `architecture/` - System architecture and design proposals
- `security/` - Security implementation and roadmap
- `ui/` - UI package priorities and todos

## Reference Convention

- All paths are relative to `docs/`
- Use `dev/...` for technical docs
- Use `agent/...` for agent workflows
- Use `architecture/...` for system design
- Prefer specific modules over overviews when precision is needed
