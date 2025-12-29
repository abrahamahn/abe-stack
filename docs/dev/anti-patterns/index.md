# ABE Stack Anti-Patterns

Table-first summary for quick lookup. Full examples live in the appendix.

Quick Summary:

- Keep business logic out of UI components.
- Avoid cross-app imports; move shared code to packages.
- Preserve type safety; no `any` without justification.

## Modules

- `dev/anti-patterns/appendix-examples.md` → Full anti-pattern examples.

## Key Patterns/Commands

| Anti-Pattern                 | Risk                       | Fix                       | Example                                  |
| ---------------------------- | -------------------------- | ------------------------- | ---------------------------------------- |
| Business logic in components | Hard to test, not reusable | Move to `packages/shared` | `dev/anti-patterns/appendix-examples.md` |
| Duplicate type definitions   | Drift and bugs             | Single source in shared   | `dev/anti-patterns/appendix-examples.md` |
| Cross-app imports            | Broken boundaries          | Shared package instead    | `dev/anti-patterns/appendix-examples.md` |
| Prop drilling                | Fragile UI                 | Context/hooks/containers  | `dev/anti-patterns/appendix-examples.md` |
| Using `any`                  | Type safety loss           | Proper types + Zod        | `dev/anti-patterns/appendix-examples.md` |

See Also:

- `dev/anti-patterns/appendix-examples.md`
- `dev/coding-standards/index.md`
