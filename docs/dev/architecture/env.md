# Environment Configuration

## Type-Safe Env Vars

- Define schemas with Zod in `packages/shared/src/env.ts`.
- Validate at startup for server apps.
- Use explicit defaults only when safe.

## Client Usage

- Use `VITE_`-prefixed variables for web.
- Keep secrets server-side.

See Also:

- `dev/patterns/index.md`
- `dev/architecture/dependencies.md`
