# Testing Overview

Goal: reliable refactoring with fast, focused tests.

## Test Pyramid

- Unit: many, fast, isolated
- Contract: validate ts-rest schemas
- Integration: routes + DB
- E2E: critical user flows only

## Speed Targets

- Unit: < 1s
- Contract: < 5s
- Integration: < 10s
- E2E: < 30s

See Also:

- `dev/testing/levels.md`
- `dev/testing/organization.md`
