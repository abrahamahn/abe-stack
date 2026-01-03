# Commands

## Development

- `pnpm dev`
- `pnpm dev:web`
- `pnpm dev:server`

## Quality - Targeted (During Iterations)

Run these for ONLY the files you changed:

```bash
# Format specific files
npx prettier --config config/.prettierrc --write path/to/file.ts

# Lint specific files
npx eslint path/to/file.ts path/to/file2.tsx

# Type-check specific package
pnpm --filter @abe-stack/web type-check
pnpm --filter abeahn-ui type-check

# Test specific files
pnpm test -- --run path/to/specific.test.tsx
```

## Quality - Full Suite (End of Session)

- `pnpm format` - Format all files
- `pnpm lint` - Lint all files
- `pnpm lint:fix` - Auto-fix linting issues
- `pnpm type-check` - Type-check all packages
- `pnpm test` - Run all tests
- `pnpm build` - Full battery (format, lint, test, type-check, build)

## Package Filter Names

- Apps: `@abe-stack/web`, `@abe-stack/server`, `@abe-stack/desktop`, `@abe-stack/mobile`
- Packages: `abeahn-ui`, `abeahn-shared`, `abeahn-api-client`, `abeahn-db`, `abeahn-storage`

## Build

- `pnpm build`
- `pnpm build:web`
- `pnpm build:server`

## Database

- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:seed`

See Also:

- `dev/workflows/precompletion.md`
