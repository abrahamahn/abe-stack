# Documentation Index

**Agent Loading Order (Critical for Token Efficiency):**

1. Load this file first — it routes everything.
2. Use search_pdf_attachment or browse_pdf_attachment on specific paths only.
3. Never load full folders — prefer index.md tables for overviews.
4. For complex tasks: Load agent/session-bridge.md + dev/workflows/classification.md next.

Token Budget Tips:

- Index files: ~200-500 tokens each
- Appendix examples: ~1-2K tokens max
- Full docs (e.g., use-cases): Only if explicitly needed

Use this index to load only what you need.

## Quick Starts

- Essentials: `CLAUDE.md`
- Agent guide: `AGENTS.md`
- Developer docs: `dev/`
- Agent workflows: `agent/`
- Logs: `log/`

## Scope Guide

- `agent/` contains AI agent workflow and behavior docs only.
- `dev/` contains shared technical reference for both humans and agents.
- `log/` contains historical change tracking (session and milestone logs).

## Reference Convention

- All paths are relative to `docs/`.
- Use `dev/...` for technical docs.
- Use `agent/...` for agent workflows.
- Prefer specific modules over overviews when precision is needed.

## Core

- Principles: `dev/principles/index.md`
- Principles core: `dev/principles/principles-core.md`
- Principles rationale: `dev/principles/principles-why.md`
- Architecture overview: `dev/architecture/index.md`
- Testing overview: `dev/testing/index.md`
- Workflows overview: `dev/workflows/index.md`

## Keyword Routing

- task classification: `dev/workflows/classification.md`
- pre-completion checks: `dev/workflows/precompletion.md`
- dependency rules: `dev/architecture/dependencies.md`
- layer boundaries: `dev/architecture/layers.md`
- import order: `dev/coding-standards/index.md`
- testing commands: `dev/testing/commands.md`
- api client pattern: `dev/patterns/appendix-examples.md`
- anti-pattern examples: `dev/anti-patterns/appendix-examples.md`
- resume session: `agent/session-bridge.md`

## Architecture Modules

- Layers: `dev/architecture/layers.md`
- Dependencies: `dev/architecture/dependencies.md`
- Structure and naming: `dev/architecture/structure.md`
- Patterns: `dev/architecture/patterns.md`
- Env config: `dev/architecture/env.md`
- Testing org: `dev/architecture/testing.md`
- Examples: `dev/architecture/appendix-examples.md`

## Testing Modules

- Overview: `dev/testing/overview.md`
- Levels: `dev/testing/levels.md`
- Organization: `dev/testing/organization.md`
- Commands: `dev/testing/commands.md`
- Examples: `dev/testing/examples.md`

## Workflow Modules

- Classification: `dev/workflows/classification.md`
- Pre-completion: `dev/workflows/precompletion.md`
- Development flow: `dev/workflows/development.md`
- Communication: `dev/workflows/communication.md`
- Commands: `dev/workflows/commands.md`
- Examples: `dev/workflows/appendix-examples.md`

## Patterns and Anti-Patterns

- Patterns: `dev/patterns/index.md`
- Patterns appendix: `dev/patterns/appendix-examples.md`
- Anti-patterns: `dev/anti-patterns/index.md`
- Anti-patterns appendix: `dev/anti-patterns/appendix-examples.md`
- Coding standards: `dev/coding-standards/index.md`
- Performance: `dev/performance/index.md`
- Use cases: `dev/use-cases/index.md`
