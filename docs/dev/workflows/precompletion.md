# Pre-Completion Checklist

Run these commands in order before marking any task complete:

```bash
pnpm format
pnpm lint:fix
pnpm lint
pnpm type-check
pnpm test
pnpm build # for production changes
```

If any step fails:

- If the failure is caused by your changes, fix and re-run all checks.
- If the failure is pre-existing/unrelated, do not fix automatically; report it clearly and proceed only with requested scope.

## Balanced Testing Matrix (30% Fast / 70% Full)

Fast loop (30% of runs):

- `pnpm type-check --filter <package>`
- `pnpm lint --filter <package>`
- `pnpm test --filter <package>` or `pnpm test <focused-test>`

Full suite (70% of runs):

- `pnpm format`
- `pnpm lint`
- `pnpm type-check`
- `pnpm test`

Rule: fast loop during edits, full suite before marking complete.
