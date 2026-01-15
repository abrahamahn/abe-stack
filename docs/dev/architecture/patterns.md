# Architecture Patterns

## DRY Enforcement

- Extract shared logic to `packages/core`.
- Use `packages/ui` only for reusable UI components.
- Keep API contracts in shared and consume from server/client.

## Framework-Agnostic Core

- Shared logic must not import React or platform APIs.
- Provide React hooks in `packages/sdk` or app layers.

## API Client Split

- Framework-agnostic client in `packages/sdk/src`.
- React Query hooks in `packages/sdk/src/react-query`.

## Import Order

1. External dependencies
2. Internal packages
3. Relative imports
4. Styles

See Also:

- [Examples](./appendix-examples.md)
- [Environment](./env.md)
