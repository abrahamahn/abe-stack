# Architecture Layers

This file describes the four layers, their responsibilities, and boundaries. Keep examples minimal here. See [Examples](./appendix-examples.md) for code.

## Layer 1: Presentation (React Components)

Responsibilities:

- Render UI based on props/state
- Handle user interactions
- Manage UI-only state (open/closed, selected tab)

Avoid:

- Business logic, data fetching, or validation

## Layer 2: State Management (React Query)

Responsibilities:

- Server state caching
- Request orchestration
- Loading/error state
- Optimistic updates

Avoid:

- Business rules or DB-specific logic

## Layer 3: Business Logic (Shared Package)

Responsibilities:

- Domain rules and validation (Zod)
- Data transformations and calculations
- Framework-agnostic utilities

Avoid:

- React hooks or UI-only concerns

## Layer 4: Data Layer (Server + Database)

Responsibilities:

- API routes and handlers
- Authentication and authorization
- DB schemas, queries, and migrations

Avoid:

- UI rendering concerns

## Cross-Layer Notes

- React is a renderer only. Keep logic in `packages/core`.
- API client is the boundary between UI and server.
- Keep validation in shared to enforce contracts across apps.

See Also:

- [Dependencies](./dependencies.md)
- [Examples](./appendix-examples.md)
