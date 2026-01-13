# ABE Stack Architecture Guide

Concrete implementation overview for ABE Stack's layered architecture and package layout. This file is intentionally short. Use the modules below for details.

## Quick Summary

- Four layers: Presentation, State, Business Logic, Data.
- One-way dependencies: apps -> packages -> shared.
- Framework-agnostic core in `packages/core`.

## Modules

- `./layers.md` → Layer responsibilities and boundaries.
- `./dependencies.md` → Dependency direction rules.
- `./structure.md` → Package layout and naming.
- `./patterns.md` → Structural patterns in practice.
- `./env.md` → Environment config shape and flow.
- `./testing.md` → Architecture-aware test organization.
- `./appendix-examples.md` → Concrete code examples.

## Key Patterns/Commands

| Name             | Description                   | Link                |
| ---------------- | ----------------------------- | ------------------- |
| Layer boundaries | What belongs where            | `./layers.md`       |
| Dependency flow  | Enforced direction of imports | `./dependencies.md` |
| Structure map    | Folder and naming conventions | `./structure.md`    |

See Also:

- `../principles/index.md`
- `../patterns/index.md`
