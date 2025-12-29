# Testing Overview

Goal: reliable refactoring with fast, focused tests guided by TDD.

## Test Pyramid

- Unit: many, fast, isolated
- Contract: validate ts-rest schemas
- Integration: routes + DB
- E2E: critical user flows only

## TDD Loop (Required)

1. Red: write a failing test that models real usage and edge cases.
2. Green: implement the minimal fix in production code.
3. Refactor: clean up without changing behavior, keep tests green.

## Speed Targets

- Unit: < 1s
- Contract: < 5s
- Integration: < 10s
- E2E: < 30s

See Also:

- `dev/testing/levels.md`
- `dev/testing/organization.md`
