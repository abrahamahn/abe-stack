# Testing Levels

## Unit Tests (Vitest)

Use for pure functions, validation schemas, and shared utilities.
Include invalid inputs, boundary values, and failure modes.

## Contract Tests (Vitest)

Validate ts-rest contracts and server handlers.
Include schema violations and error responses.

## Integration Tests (Vitest)

Test route + DB behavior using fastify.inject.
Include failure cases (missing records, invalid payloads, auth failures).

## End-to-End Tests (Playwright)

Cover critical user flows only.

See Also:

- `dev/testing/examples.md`
