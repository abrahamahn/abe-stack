# ABE Stack Testing Strategy

Primary goal: reliable refactoring with fast, focused tests.

## Quick Summary

- Test business logic thoroughly, test React sparingly.
- Use unit tests for shared logic.
- Use contract tests to validate ts-rest contracts.
- Use integration tests for routes + DB.
- Use E2E tests for critical user flows only.

## Modules

- `dev/testing/overview.md` → Strategy summary and priorities.
- `dev/testing/levels.md` → Unit/integration/E2E expectations.
- `dev/testing/organization.md` → Where tests live and why.
- `dev/testing/commands.md` → Fast loop vs full suite commands.
- `dev/testing/examples.md` → Example tests and patterns.

## Key Patterns/Commands

| Name        | Description                        | Link                      |
| ----------- | ---------------------------------- | ------------------------- |
| Fast loop   | Package-scoped checks during edits | `dev/testing/commands.md` |
| Full suite  | Required checks before completion  | `dev/testing/commands.md` |
| Test levels | Unit/integration/E2E guidance      | `dev/testing/levels.md`   |

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
