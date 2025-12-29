# ABE Stack Architecture Guide

Concrete implementation overview for ABE Stack's layered architecture and package layout. This file is intentionally short. Use the modules below for details.

## Quick Summary

- Four layers: Presentation, State, Business Logic, Data.
- One-way dependencies: apps -> packages -> shared.
- Framework-agnostic core in `packages/shared`.

## Modules

- `dev/architecture/layers.md`
- `dev/architecture/dependencies.md`
- `dev/architecture/structure.md`
- `dev/architecture/patterns.md`
- `dev/architecture/env.md`
- `dev/architecture/testing.md`
- `dev/architecture/appendix-examples.md`

See Also:

- `dev/principles/index.md`
- `dev/patterns/index.md`
