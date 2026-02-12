# Code Review Checklist

## Code Quality

- [ ] No `any` types -- use proper types or Zod inference (`z.infer<typeof schema>`)
- [ ] No escape hatches: no `@ts-ignore`, `@ts-expect-error`, `eslint-disable`
- [ ] No wildcard exports (`export *`) -- use explicit named exports in barrel files
- [ ] No namespace imports (`import * as foo`) -- use named imports (exception: test files needing `vi.spyOn`)
- [ ] DRY -- shared logic lives in `src/shared/`, not duplicated across apps
- [ ] Code is minimal -- no unused variables, dead code, or speculative abstractions
- [ ] Declarative style preferred (`.filter()`, `.map()`) over imperative loops

## Architecture

- [ ] Code is in the correct layer:
  - Pure UI components in `src/client/ui/`
  - Business logic/validation in `src/shared/`
  - API hooks in `src/client/api/`
  - Route handlers in `src/server/core/`
- [ ] No cross-app imports (apps import from packages, never from each other)
- [ ] Barrel exports (`index.ts`) updated with explicit named exports for new public APIs
- [ ] Path aliases used instead of deep relative imports (`@auth/...` not `../../features/auth/...`)
- [ ] Server follows hexagonal architecture: `server/core/` for logic, `server/engine/` for adapters

## Security

- [ ] No hardcoded secrets, API keys, or credentials (use env vars via `@abe-stack/shared/config`)
- [ ] All external input validated with Zod schemas at the boundary
- [ ] Database queries use parameterized inputs (Drizzle enforces this by default)
- [ ] Auth-protected routes check appropriate permissions
- [ ] Sensitive data not logged (passwords, tokens, secrets)

## Testing

- [ ] New files have colocated test files (`feature.ts` + `feature.test.ts`)
- [ ] Changed behavior has updated tests
- [ ] Tests verify behavior, not implementation details
- [ ] Edge cases covered: empty inputs, invalid data, error paths
- [ ] Mocks are minimal -- only mock external dependencies, not the unit under test
- [ ] No `waitFor` + `vi.useFakeTimers()` combination (causes infinite hangs)

## Styling (Frontend)

- [ ] All colors use CSS variables (`var(--ui-color-*)`) -- no hardcoded hex/rgb values
- [ ] Spacing uses design tokens (`var(--ui-gap-*)`) -- no arbitrary `px` values (exception: `1px` borders)
- [ ] UI components from `@abe-stack/ui` used instead of raw HTML elements
- [ ] Utility classes preferred over inline styles

## Documentation

- [ ] API changes reflected in route metadata (method, path, schema)
- [ ] New env vars documented in `docs/deploy/env.md`
- [ ] TODO.md updated: items added if work is incomplete, removed if done
- [ ] Comments explain "why" not "what"

## Before Approving

- [ ] `pnpm lint` passes on changed files
- [ ] `pnpm type-check` passes for affected packages
- [ ] `pnpm test` passes for related test files
- [ ] No TODO/FIXME comments left without a tracking issue
