# ABE Stack Common Patterns

Table-first summary for quick lookup. Full examples live in the appendix.

Quick Summary:

- Use shared contracts and clients to avoid drift.
- Prefer Zod validation before IO boundaries.
- Keep patterns framework-agnostic in `packages/core`.

## Modules

- `dev/patterns/appendix-examples.md` → Full pattern examples.

## Key Patterns/Commands

| Pattern          | When to Use        | Core Rule                               | Example                             |
| ---------------- | ------------------ | --------------------------------------- | ----------------------------------- |
| API client split | Any network access | Framework-agnostic client + React hooks | `dev/patterns/appendix-examples.md` |
| Form handling    | User input         | Validate with Zod before submit         | `dev/patterns/appendix-examples.md` |
| Env variables    | Config             | Zod schema in shared                    | `dev/patterns/appendix-examples.md` |
| DB queries       | Persistence        | Use Drizzle with typed schemas          | `dev/patterns/appendix-examples.md` |

See Also:

- `dev/patterns/appendix-examples.md`
- `dev/coding-standards/index.md`
