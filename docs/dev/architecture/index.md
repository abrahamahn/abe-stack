# ABE Stack Architecture Guide

**Last Updated: January 15, 2026**

Comprehensive architecture documentation for ABE Stack's layered architecture, package layout, and planned features.

## Quick Summary

- **Four layers:** Presentation, State, Business Logic, Data
- **One-way dependencies:** apps -> packages -> shared
- **Framework-agnostic core** in `packages/core`
- **Hexagonal architecture** on server with infra/modules separation

## Core Architecture

| Document                           | Description                           |
| ---------------------------------- | ------------------------------------- |
| [Layers](./layers.md)              | Layer responsibilities and boundaries |
| [Dependencies](./dependencies.md)  | Dependency direction rules            |
| [Structure](./structure.md)        | Package layout and naming             |
| [Patterns](./patterns.md)          | Structural patterns in practice       |
| [Environment](./env.md)            | Environment config shape and flow     |
| [Testing](./testing.md)            | Architecture-aware test organization  |
| [Examples](./appendix-examples.md) | Concrete code examples                |

## Advanced Topics

| Document                                      | Description                                        |
| --------------------------------------------- | -------------------------------------------------- |
| [CHET-Stack Comparison](./chet-comparison.md) | Comparison with CHET-Stack patterns, adoption plan |
| [V5 Proposal](./v5-proposal.md)               | Layer-based reorganization proposal                |

## Real-Time Architecture (Planned)

Documentation for planned real-time collaboration features based on CHET-Stack patterns.

| Document                                                   | Description                            |
| ---------------------------------------------------------- | -------------------------------------- |
| [Realtime Index](./realtime/index.md)                      | Overview and document navigation       |
| [Realtime Overview](./realtime/overview.md)                | Quick start and feature summary        |
| [Realtime Architecture](./realtime/architecture.md)        | Detailed sync system design            |
| [Implementation Guide](./realtime/implementation-guide.md) | Step-by-step implementation plan       |
| [Patterns](./realtime/patterns.md)                         | Common real-time patterns and examples |

## Key Concepts

### Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Presentation Layer                     │
│         (React Components, UI Elements, Hooks)          │
├─────────────────────────────────────────────────────────┤
│                     State Layer                          │
│           (React Query, Context, Local State)           │
├─────────────────────────────────────────────────────────┤
│                  Business Logic Layer                    │
│          (Services, Validators, Transformers)           │
├─────────────────────────────────────────────────────────┤
│                     Data Layer                           │
│         (API Client, Database, Storage, Cache)          │
└─────────────────────────────────────────────────────────┘
```

### Dependency Flow

```
    apps/web, apps/desktop
            │
            ▼
    packages/ui, packages/sdk
            │
            ▼
       packages/core

    apps/server
            │
            ▼
    apps/server/src/infra/*
            │
            ▼
       packages/core
```

**Rules:**

- Apps can import from packages, never from other apps
- `packages/core` is framework-agnostic (no React)
- `packages/ui` and `packages/sdk` can import from `packages/core`
- Server infra modules are internal to the server app

## See Also

- [Principles](../principles/index.md) - Core design philosophy
- [Patterns](../patterns/index.md) - Implementation patterns
- [Anti-Patterns](../anti-patterns/index.md) - What to avoid
