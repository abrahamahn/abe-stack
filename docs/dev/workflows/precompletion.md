# Pre-Completion Checklist

## During Iterations - Targeted Checks

Run these for ONLY the files you changed or created:

```bash
# Format changed files
npx prettier --config config/.prettierrc --write path/to/file.ts path/to/file2.tsx

# Lint changed files
npx eslint path/to/file.ts path/to/file2.tsx

# Type-check affected package
pnpm --filter @abe-stack/web type-check    # for apps/web changes
pnpm --filter @abe-stack/ui type-check      # for packages/ui changes

# Test changed files
pnpm test -- --run path/to/specific.test.tsx
```

## End of Session - Full Suite

Before marking any task complete, run full build:

```bash
pnpm build  # Runs format, lint, test, type-check, and build
```

If any step fails:

- If the failure is caused by your changes, fix and re-run all checks.
- If the failure is pre-existing/unrelated, do not fix automatically; report it clearly and proceed only with requested scope.

## Package Filter Names

- Apps: `@abe-stack/web`, `@abe-stack/server`, `@abe-stack/desktop`
- Packages: `@abe-stack/ui`, `@abe-stack/shared`, `@abe-stack/sdk`

## Example Workflow

After editing `packages/ui/src/elements/Button.tsx`:

```bash
# 1. Format changed files
npx prettier --config config/.prettierrc --write packages/ui/src/elements/Button.tsx packages/ui/src/elements/__tests__/Button.test.tsx

# 2. Lint changed files
npx eslint packages/ui/src/elements/Button.tsx packages/ui/src/elements/__tests__/Button.test.tsx

# 3. Type-check the package
pnpm --filter @abe-stack/ui type-check

# 4. Run relevant tests
pnpm test -- --run packages/ui/src/elements/__tests__/Button.test.tsx

# 5. At end of session only
pnpm build
```
