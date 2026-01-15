# Environment Configuration

## Type-Safe Env Vars

- Define schemas with Zod in `packages/core/src/env.ts`.
- Validate at startup for server apps.
- Use explicit defaults only when safe.

## Client Usage

- Use `VITE_`-prefixed variables for web.
- Keep secrets server-side.

See Also:

- [Patterns Guide](../patterns/index.md)
- [Dependencies](./dependencies.md)
