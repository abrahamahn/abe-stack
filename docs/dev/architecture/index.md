# ABE Stack Architecture Guide

Concrete implementation overview for ABE Stack's layered architecture and package layout. This file is intentionally short. Use the modules below for details.

## Quick Summary

- Four layers: Presentation, State, Business Logic, Data.
- One-way dependencies: apps -> packages -> shared.
- Framework-agnostic core in `packages/shared`.

## Modules

- `dev/architecture/layers.md` → Layer responsibilities and boundaries.
- `dev/architecture/dependencies.md` → Dependency direction rules.
- `dev/architecture/structure.md` → Package layout and naming.
- `dev/architecture/patterns.md` → Structural patterns in practice.
- `dev/architecture/env.md` → Environment config shape and flow.
- `dev/architecture/testing.md` → Architecture-aware test organization.
- `dev/architecture/appendix-examples.md` → Concrete code examples.

## Key Patterns/Commands

| Name             | Description                   | Link                               |
| ---------------- | ----------------------------- | ---------------------------------- |
| Layer boundaries | What belongs where            | `dev/architecture/layers.md`       |
| Dependency flow  | Enforced direction of imports | `dev/architecture/dependencies.md` |
| Structure map    | Folder and naming conventions | `dev/architecture/structure.md`    |

See Also:

- `dev/principles/index.md`
- `dev/patterns/index.md`
