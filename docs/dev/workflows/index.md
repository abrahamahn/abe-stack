# ABE Stack Development Workflows

This file is a short index. Detailed workflows are split into focused modules.

## Quick Summary

- Classify task complexity before starting.
- Use checkpointed execution for medium/complex tasks.
- Run full quality gates before completion.

## Modules

- `./classification.md` → Task sizing and routing.
- `./precompletion.md` → Required quality gates.
- `./development.md` → Step-by-step execution flow.
- `./communication.md` → Status and reporting style.
- `./commands.md` → Command quick reference.
- `./appendix-examples.md` → Real workflow examples.

## Key Patterns/Commands

| Name                  | Description                 | Link                              |
| --------------------- | --------------------------- | --------------------------------- |
| Task classification   | Decide simple vs complex    | `./classification.md`             |
| Pre-completion checks | Format/lint/type-check/test | `./precompletion.md`              |
| Command list          | Common workflow commands    | `./commands.md`                   |

See Also:

- `../../agent/agent-prompts.md`
- `../../agent/agent-self-check.md`
