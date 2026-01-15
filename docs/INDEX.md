# Documentation Index

_Last Updated: January 15, 2026_

**Agent Loading Order (Critical for Token Efficiency):**

1. Load this file first - it routes everything.
2. Use specific paths only when needed.
3. Never load full folders - prefer index.md tables for overviews.
4. For complex tasks: Load agent/session-bridge.md + agent/workflows.md next.

Token Budget Tips:

- Index files: ~200-500 tokens each
- Appendix examples: ~1-2K tokens max
- Full docs (e.g., use-cases): Only if explicitly needed

---

## Quick Navigation

| Area         | Entry Point                         | Purpose                          |
| ------------ | ----------------------------------- | -------------------------------- |
| Overview     | `README.md`                         | Project overview and quick start |
| Roadmap      | `ROADMAP.md`                        | Milestones and task tracking     |
| Changelog    | `CHANGELOG.md`                      | Detailed change history          |
| Agent Guide  | `AGENTS.md`                         | AI agent development guide       |
| Architecture | `dev/architecture.md`               | System design and structure      |
| Security     | `todo/security/phase-1-complete.md` | Security implementation          |
| Dev Guide    | `dev/`                              | Developer reference docs         |
| UI Package   | `ui/todo.md`                        | UI component priorities          |

---

## Architecture Documentation

| Document              | Purpose                              |
| --------------------- | ------------------------------------ |
| `dev/architecture.md` | Architecture overview (consolidated) |

---

## Security Documentation

| Document                            | Purpose                   |
| ----------------------------------- | ------------------------- |
| `todo/security/index.md`            | Security overview         |
| `todo/security/phase-1-complete.md` | Phase 1 completion report |
| `todo/security/phase-2-roadmap.md`  | Phase 2 roadmap and tasks |

---

## Developer Documentation (dev/)

### Principles & Architecture

- `dev/principles.md` - Principles, patterns, anti-patterns, standards (consolidated)
- `dev/architecture.md` - Technical architecture (consolidated)

### Testing

- `dev/testing.md` - Consolidated testing strategy

### Other

- `dev/performance.md` - Performance guidelines
- `dev/use-cases.md` - Common use cases

---

## Agent Documentation (agent/)

| Document                    | Purpose                     |
| --------------------------- | --------------------------- |
| `agent/agent-prompts.md`    | Agent prompt templates      |
| `agent/agent-self-check.md` | Self-verification checklist |
| `agent/complex-tasks.md`    | Complex task guidance       |
| `agent/session-bridge.md`   | Session continuation        |
| `agent/workflows.md`        | Agent workflows             |

---

## Recommended Reading Paths

### Agent Work

1. `agent/workflows.md`
2. `agent/complex-tasks.md`
3. `agent/agent-prompts.md`
4. `agent/agent-self-check.md`
5. `agent/session-bridge.md`

### Development Work

1. `dev/principles.md`
2. `dev/architecture.md`
3. `dev/testing.md`
4. `dev/performance.md`
5. `dev/use-cases.md`

## Keyword Routing

| Keyword                | Document                           |
| ---------------------- | ---------------------------------- |
| task classification    | `agent/workflows.md`               |
| pre-completion checks  | `agent/workflows.md`               |
| dependency rules       | `dev/architecture.md`              |
| layer boundaries       | `dev/architecture.md`              |
| hexagonal architecture | `dev/architecture.md`              |
| import order           | `dev/principles.md`                |
| testing commands       | `dev/testing.md`                   |
| patterns               | `dev/principles.md`                |
| anti-patterns          | `dev/principles.md`                |
| coding standards       | `dev/principles.md`                |
| resume session         | `agent/session-bridge.md`          |
| file organization      | `AGENTS.md` (Section 5)            |
| path aliases           | `AGENTS.md` (Section 5)            |
| v5 migration           | `dev/architecture.md`              |
| real-time sync         | `dev/architecture.md`              |
| security phase 2       | `todo/security/phase-2-roadmap.md` |
| roadmap                | `ROADMAP.md`                       |

---

## Scope Guide

- `agent/` - AI agent workflow and behavior docs only
- `dev/` - Shared technical reference (architecture, principles, testing)
- `security/` - Security implementation and roadmap
- `ui/` - UI package priorities and todos

## Reference Convention

- All paths are relative to `docs/`
- Use `dev/...` for technical docs (architecture, principles, testing)
- Use `agent/...` for agent workflows
- Prefer specific modules over overviews when precision is needed
