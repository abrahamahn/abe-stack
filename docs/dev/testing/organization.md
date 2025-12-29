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
- Add explicit edge-case and failure-mode tests per suite.
- Do not change tests to "make them pass" when behavior is wrong; fix the code.

## Targets

- Shared logic: high coverage with edge cases
- UI: critical components only, include real usage flows
- E2E: auth + critical flows, include failure states

See Also:

- `dev/testing/commands.md`
