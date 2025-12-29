# Testing Commands and Workflow

## Running Tests

- `pnpm test`
- `pnpm test --filter <package>`
- `pnpm test:watch`
- `pnpm test:coverage`

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

Rule: use fast loop during edits, full suite before marking complete.

See Also:

- `dev/workflows/index.md`
