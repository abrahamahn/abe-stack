# Development Workflow

## Before Starting

- Read `TODO.md` and `log/log.md`.
- Confirm the task classification.
- Identify similar code before writing new code.

## Making Changes

For new features:

- Add types + validation in shared.
- Add DB schema + queries.
- Add API contract + routes.
- Add API client + hooks.
- Add UI components.

For bug fixes:

- Reproduce with a failing test.
- Fix root cause.
- Add regression tests.

For legacy removal:

- Find all usages.
- Remove code and update exports.
- Run type-check and tests.

See Also:

- `dev/workflows/precompletion.md`
- `agent/session-bridge.md`
