# Dependency Flow Rules

## One-Way Dependencies

```
apps -> packages/ui -> packages/shared
apps -> packages/api-client -> packages/shared
apps -> packages/db -> packages/shared
```

Rules:

- No reverse dependencies from `packages/shared` to apps.
- No cross-app imports.
- Shared types and validation must live in `packages/shared`.

## Package.json Dependencies

- Apps depend on packages, never the other way around.
- Avoid adding dependencies unless they provide clear value.

## Enforcement

- TypeScript project references
- ESLint import rules

See Also:

- `dev/architecture/patterns.md`
- `dev/architecture/structure.md`
