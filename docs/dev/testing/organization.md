# Testing Organization

## Folder Layout

```
apps/web/src/__tests__
apps/server/src/__tests__
packages/shared/src/__tests__
packages/api-client/src/__tests__
packages/ui/src/__tests__
```

## Best Practices

- Group related tests in a single suite.
- Use setup/teardown for shared fixtures.
- Prefer AAA (Arrange, Act, Assert).
- Test one behavior per test.

## Targets

- Shared logic: high coverage
- UI: critical components only
- E2E: auth + critical flows

See Also:

- `dev/testing/commands.md`
