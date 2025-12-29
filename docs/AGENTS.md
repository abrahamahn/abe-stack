# Agent Guide for ABE Stack

ABE Stack is optimized for agentic workflows (Codex, Claude Code, Gemini CLI, etc.).

## Start Here

- Essentials: `CLAUDE.md`
- Docs router: `INDEX.md`
- Agent workflows: `agent/`

## Core Rules (Always Follow)

- Load `INDEX.md` first, then fetch only the modules you need.
- Classify tasks via `dev/workflows/classification.md`.
- For medium/complex tasks, use `agent/complex-tasks.md` and templates in `agent/agent-prompts.md`.
- Run checkpoints using `agent/agent-self-check.md`.
- Resume long tasks with `agent/session-bridge.md`.

## Stack-Specific Tips

- DB changes → `packages/db` first, then migrations.
- API changes → update shared contracts before server/client.
- UI changes → prefer `packages/ui` and reuse primitives.
- Logic changes → keep framework-agnostic code in `packages/shared`.

## Agent Workflow Docs

- `agent/agent-prompts.md`
- `agent/agent-self-check.md`
- `agent/complex-tasks.md`
- `agent/session-bridge.md`

## Reference Convention

- All paths are relative to `docs/`.
- Use `dev/...` for technical docs.
- Use `agent/...` for agent workflows.
- Prefer specific modules over overviews when precision is needed.
