# ABE Stack Testing Strategy

Primary goal: reliable refactoring with fast, focused tests driven by TDD.

## Quick Start

**New to testing React components?** Start with `./best-practices.md` for a comprehensive modern guide.

## Quick Summary

- Use TDD: write failing tests first, then fix code to pass.
- Test user behavior, not implementation details.
- Use unit tests for shared logic (utils, validators).
- Use component/integration tests for React (70% of tests).
- Use contract tests to validate ts-rest contracts.
- Use integration tests for routes + DB.
- Use E2E tests for critical user flows only (~10% of tests).

## Modules

- `./best-practices.md` → Modern React testing guide (START HERE)
- `./setup.md` → Testing framework setup and configuration (Vitest, RTL, MSW, Playwright)
- `./overview.md` → Strategy summary and priorities.
- `./levels.md` → Unit/integration/E2E expectations.
- `./organization.md` → Where tests live and why.
- `./commands.md` → Fast loop vs full suite commands.
- `./examples.md` → Example tests and patterns.
- `./edge-cases.md` → Edge case testing and TDD conventions (REQUIRED READING).

## Key Patterns/Commands

| Name        | Description                        | Link            |
| ----------- | ---------------------------------- | --------------- |
| Fast loop   | Package-scoped checks during edits | `./commands.md` |
| Full suite  | Required checks before completion  | `./commands.md` |
| Test levels | Unit/integration/E2E guidance      | `./levels.md`   |

## Edge Case & Error Handling

**All tests must verify more than just the happy path:**

- **Boundary Conditions:** Test empty states, maximum limits, and threshold values.
- **Invalid Inputs:** Test malformed data, wrong types, and unexpected characters.
- **Error States:** Test network failures, API errors, and null/undefined handling.
- **Regression:** Ensure previously fixed bugs have regression tests.

## TDD Non-Negotiables

- Write tests to reflect real usage flows and edge cases.
- Include negative paths that would break code if not handled (invalid inputs, boundary values, error states).
- Confirm the test fails before changing implementation.
- Fix the code to pass the test; do not change tests to make failures disappear unless the requirement changed.

## File Header Convention (New Files)

All newly created files must start with a first-line comment containing the
workspace-relative path. Examples:

- `// packages/ui/src/primitives/__tests__/Switch.test.tsx`
- `<!-- docs/dev/testing/index.md -->`

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

- `../workflows/index.md`
