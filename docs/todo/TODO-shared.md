# Shared Package Refactor Plan

## Goal Description

Refactor `@bslt/shared` to eliminate redundancy and "spaghetti code" by implementing a strict 4-Layer Architecture.

## The 4-Layer Architecture

`Contracts` -> `Core` (Business) -> `Engine` (Infra) -> `Primitives` (Base).

1.  **Primitives** (Base Layer)
    - **Dependencies**: Zero.
    - **Contents**: Brand Types (IDs), Global Constants, Type Guards.
2.  **Engine** (Infrastructure Layer)
    - **Dependencies**: Primitives.
    - **Contents**: `AppError`, `Logger`, `Jobs`, `Results`.
3.  **Core** (Business Domain Layer)
    - **Dependencies**: Engine, Primitives.
    - **Contents**: Feature modules (`auth`, `users`) with Schemas and Types.
    - **Rule**: No "Sideways Imports". `Core/Auth` cannot import `Core/Billing`.
4.  **Contracts** (Public API Layer)
    - **Dependencies**: Core.
    - **Contents**: API Definitions, Event Contracts.

## Migration Checklist

### Phase 1: Primitives

- [ ] Extract Brand Types (IDs)
- [ ] Extract Constants
- [ ] Extract Type Guards

### Phase 2: Engine

- [ ] Implement `AppError` / `BaseError`
- [ ] Implement `Logger` interfaces
- [ ] Implement `Result` pattern

### Phase 3: Core

- [ ] Refactor Auth Domain (using `createSchema`)
- [ ] Refactor Users Domain
- [ ] ...other domains

### Phase 4: Contracts

- [ ] Centralize API definitions

### Phase 5: Cleanup

- [ ] Move `types.ts`, `utils.ts` to `_legacy/`
