# ABE Stack Principles & Standards

**Last Updated: January 17, 2026**

Comprehensive guide to principles, coding standards, patterns, and anti-patterns.

## When to Read

- Before any code change or refactor.
- When creating new patterns or shared utilities.

## How to Apply

1. Review **Principles** for non-negotiables.
2. Use **Coding Standards** for implementation details.
3. Check **Patterns** and **Anti-Patterns** before writing new code.

---

## Vision

**ABE Stack is a production-ready, developer-velocity-first monorepo that teams can understand quickly and ship without surprises.**

### Core Values

1. **Velocity over Perfection** - Ship working software fast, iterate based on real usage
2. **Simplicity over Cleverness** - Prefer boring, obvious solutions
3. **Type Safety over Runtime Checks** - Catch errors at compile time
4. **Framework-Agnostic Core** - Business logic independent of UI frameworks
5. **Lean but Complete** - Minimal dependencies, maximum production-readiness

---

## Principles

### Architecture

| #   | Principle                     | Why                                         | Fix When Violated         |
| --- | ----------------------------- | ------------------------------------------- | ------------------------- |
| 1   | **DRY** - One source of truth | Prevents drift, reduces maintenance         | Extract to `shared/core`  |
| 2   | **Separation of Concerns**    | Easier testing, platform flexibility        | Split into layers         |
| 3   | **React as Renderer Only**    | Testable, migratable, reusable              | Move logic to shared      |
| 4   | **Framework-Agnostic Core**   | Platform portability, migration flexibility | No React in `shared/core` |
| 5   | **Minimal Dependencies**      | Smaller bundles, fewer vulnerabilities      | Implement in <50 lines    |
| 6   | **Type Safety Everywhere**    | Catch bugs at compile time                  | Strict TypeScript + Zod   |

### Development

| #   | Principle                     | Why                                  | Fix When Violated                           |
| --- | ----------------------------- | ------------------------------------ | ------------------------------------------- |
| 7   | **TDD** - Failing test first  | Fast feedback, regression protection | Write test before fix                       |
| 8   | **Documentation as Code**     | Onboarding, knowledge retention      | Update docs every session                   |
| 9   | **Quality Gates**             | Prevents broken code in main         | `pnpm format && lint && type-check && test` |
| 10  | **Production-Ready Defaults** | Ship to production day 1             | Include auth, validation, errors            |

### Organization

| #   | Principle                  | Why                                | Fix When Violated                   |
| --- | -------------------------- | ---------------------------------- | ----------------------------------- |
| 11  | **Monorepo Boundaries**    | Clear ownership, no circular deps  | One-way: `apps → packages → shared` |
| 12  | **Colocate Related Code**  | Easier to find, reduces navigation | Test next to source                 |
| 13  | **Explicit Over Implicit** | Code is read more than written     | Named exports, explicit errors      |

### Security

| #   | Principle               | Why                        | Fix When Violated                   |
| --- | ----------------------- | -------------------------- | ----------------------------------- |
| 14  | **Security by Default** | Prevents incidents         | HTTPS, JWT, httpOnly, rate limiting |
| 15  | **Validate All Input**  | Prevents injection attacks | Zod at all boundaries               |
| 16  | **Never Log Secrets**   | Prevents data leaks        | Use `env` vars, redact PII          |

### Communication

| #   | Principle                  | Why                                    | Fix When Violated       |
| --- | -------------------------- | -------------------------------------- | ----------------------- |
| 17  | **Comments Explain "Why"** | Code explains "what"                   | Remove obvious comments |
| 18  | **Document Decisions**     | Future context, prevents re-litigating | Add to `CHANGELOG.md`   |

---

## Coding Standards

### TypeScript

- **Strict mode required** - No `any`, no `@ts-ignore` without explanation
- **Zod validation** - All external data validated at runtime
- **Infer types from schemas** - `type User = z.infer<typeof userSchema>`

### File Naming

| Convention | Use For                     | Examples                                         |
| ---------- | --------------------------- | ------------------------------------------------ |
| PascalCase | Components, Classes, Types  | `UserProfile.tsx`, `ApiClient.ts`                |
| camelCase  | Functions, hooks, utilities | `formatCurrency.ts`, `useUser.ts`                |
| kebab-case | Configuration files         | `vite.config.ts`, `.config/env/.env.development` |

### Import Order

1. External dependencies (alphabetical)
2. Internal packages (`@abe-stack/*`)
3. Alias imports (`@auth/*`, `@features/*`)
4. Styles (last)

### Error Handling

- **Server**: Try/catch with typed error responses (400, 404, 500)
- **Client**: React Query's `error`/`isLoading` states
- **Never**: Silent failures or swallowed errors

### Documentation

- **Comments**: Explain "why", not "what"
- **Self-documenting**: Use descriptive function/variable names
- **File headers**: New files start with path comment
- **Auto-generated headers**: Managed by `sync-file-headers`; avoid manual edits

---

## Patterns

### API Client Split

Separate framework-agnostic client from React hooks:

- `client/src/client.ts` - Pure TypeScript client
- `client/src/react-query.ts` - React Query hooks

### Form Validation

1. Define schema in `shared/core/src/validation/`
2. Use `safeParse()` before submit
3. Display field errors from `error.flatten().fieldErrors`

### Environment Variables

1. Define Zod schema in `shared/core/src/env.ts`
2. Parse at app startup: `serverEnvSchema.parse(process.env)`
3. Use validated `env` object everywhere

### Database Queries

1. Define schema in `apps/server/src/infra/database/schema/`
2. Infer types: `type User = typeof users.$inferSelect`
3. Query with full type safety via Drizzle

---

## Anti-Patterns

| Anti-Pattern                            | Risk                       | Fix                            |
| --------------------------------------- | -------------------------- | ------------------------------ |
| Business logic in components            | Hard to test, not reusable | Move to `shared/core`          |
| Duplicate type definitions              | Drift and bugs             | Single source in `shared/core` |
| Cross-app imports                       | Broken boundaries          | Use shared packages            |
| Prop drilling                           | Fragile UI                 | Context/hooks/containers       |
| Using `any`                             | Type safety loss           | Proper types + Zod             |
| **Wildcard exports** (`export *`)       | Unclear API surface        | Explicit named exports         |
| **Deep relative imports** (`../../../`) | Fragile, hard to refactor  | Use path aliases               |

### Path Aliases

| Alias               | Path                   |
| ------------------- | ---------------------- |
| `@`                 | `./src/*`              |
| `@auth`             | `./src/features/auth`  |
| `@features`         | `./src/features`       |
| `@abe-stack/shared`   | Business logic package |
| `@abe-stack/ui`     | UI component package   |
| `@abe-stack/engine` | API client package     |

Aliases are auto-generated by `sync-path-aliases`. Update directories (with `index.ts`) instead of editing `tsconfig.json` paths by hand.

---

## Quality Gates (Non-Negotiable)

```bash
pnpm format      # Prettier
pnpm lint        # ESLint
pnpm type-check  # TypeScript strict
pnpm test        # Vitest
```

**All must pass before merge. No exceptions.**

---

## Summary

**Philosophy**: Build simple, typed, tested systems that ship fast and scale confidently.

**Optimize for**:

- Developer velocity
- Code clarity
- Long-term maintainability
- Production confidence

**Don't optimize for**:

- Absolute performance (optimize when needed)
- Minimal file count (clarity > conciseness)
- Latest trends (boring > clever)

---

## See Also

- [Architecture Overview](./architecture.md)
- [Testing Guide](../dev/testing.md)
- [Workflows](../agent/workflows.md)

---

_Last Updated: January 17, 2026_
