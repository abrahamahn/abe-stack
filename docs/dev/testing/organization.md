# Testing Organization

## Folder Layout

```
apps/
├── web/src/
│   ├── __tests__/              # App-level tests
│   ├── api/__tests__/          # API provider tests
│   ├── app/__tests__/          # Root component tests
│   └── features/auth/
│       ├── contexts/__tests__/ # Auth context tests
│       └── hooks/__tests__/    # Auth hook tests
├── server/src/
│   ├── __tests__/              # Integration tests
│   ├── modules/auth/utils/     # Auth utility tests (co-located)
│   └── infra/
│       ├── database/__tests__/ # Database tests
│       └── storage/__tests__/  # Storage tests
└── desktop/src/__tests__/      # Desktop app tests

packages/
├── core/src/
│   ├── __tests__/              # Core utility tests
│   └── stores/__tests__/       # Store tests
├── sdk/src/__tests__/          # SDK client tests
└── ui/src/
    ├── components/__tests__/   # Component tests
    ├── elements/__tests__/     # Element tests
    └── hooks/__tests__/        # Hook tests
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
