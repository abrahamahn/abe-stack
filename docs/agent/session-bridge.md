# Session Bridge

Use this to resume multi-interaction tasks without losing context.

## Resume Protocol

1. Load last entry in `log/log.md`.
2. Run: `git log --oneline --since="last session date"`.
3. Generate a State Summary:
   - Goal: one sentence
   - Progress: completed checkpoints + outcomes
   - Next: immediate step
   - Risks: blockers or drift
4. Proceed only if the summary matches task classification.

## Resume Mode Template

```markdown
Resume Mode:

- Previous State Summary: [paste]
- Alignment check: [match/mismatch]
- Drift: [none or description]
- Next action: [step]
```

See Also:

- `dev/workflows/classification.md`
- `agent/agent-self-check.md`
