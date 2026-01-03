# Testing Commands and Workflow

## Running Tests - Targeted (During Iterations)

```bash
# Test specific files (fast feedback)
pnpm test -- --run path/to/specific.test.tsx

# Test multiple specific files
pnpm test -- --run path/to/first.test.tsx path/to/second.test.tsx

# Test with glob pattern
pnpm test -- --run src/elements/__tests__/*.test.tsx
```

## Running Tests - Full Suite (End of Session)

```bash
pnpm test                    # Run all tests
pnpm test --filter <package> # Run tests for specific package
pnpm test:watch              # Watch mode
pnpm test:coverage           # With coverage report
```

## Complete Quality Check - Targeted

Run these for ONLY the files you changed:

```bash
# Format changed files
npx prettier --config config/.prettierrc --write path/to/file.tsx

# Lint changed files
npx eslint path/to/file.tsx

# Type-check affected package
pnpm --filter <package-name> type-check

# Test changed files
pnpm test -- --run path/to/file.test.tsx
```

## Package Filter Names

- Apps: `@abe-stack/web`, `@abe-stack/server`, `@abe-stack/desktop`, `@abe-stack/mobile`
- Packages: `abeahn-ui`, `abeahn-shared`, `abeahn-api-client`, `abeahn-db`, `abeahn-storage`

## TDD Loop (Required)

1. Run the new test and confirm it fails.
2. Implement the minimal fix in production code.
3. Re-run the test and confirm it passes.
4. Refactor and keep tests green.

## Workflow Summary

| When                | What to Run                                        |
| ------------------- | -------------------------------------------------- |
| During iterations   | Targeted: format, lint, type-check, test (changed) |
| End of session      | Full: `pnpm build`                                 |
| Before marking done | Full: `pnpm build`                                 |

See Also:

- `dev/workflows/index.md`
- `dev/workflows/precompletion.md`
