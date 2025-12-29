# ABE Stack Development Workflows

This file is a short index. Detailed workflows are split into focused modules.

## Quick Summary

- Classify task complexity before starting.
- Use checkpointed execution for medium/complex tasks.
- Run full quality gates before completion.

## Modules

- `dev/workflows/classification.md` → Task sizing and routing.
- `dev/workflows/precompletion.md` → Required quality gates.
- `dev/workflows/development.md` → Step-by-step execution flow.
- `dev/workflows/communication.md` → Status and reporting style.
- `dev/workflows/commands.md` → Command quick reference.
- `dev/workflows/appendix-examples.md` → Real workflow examples.

## Key Patterns/Commands

| Name                  | Description                 | Link                              |
| --------------------- | --------------------------- | --------------------------------- |
| Task classification   | Decide simple vs complex    | `dev/workflows/classification.md` |
| Pre-completion checks | Format/lint/type-check/test | `dev/workflows/precompletion.md`  |
| Command list          | Common workflow commands    | `dev/workflows/commands.md`       |

See Also:

- `agent/agent-prompts.md`
- `agent/agent-self-check.md`
