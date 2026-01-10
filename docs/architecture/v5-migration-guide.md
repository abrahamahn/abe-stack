# V5 Migration Guide

**Last Updated: January 10, 2026**

Step-by-step guide for migrating from V4 (role-based) to V5 (layer-based) architecture.

---

## Overview

This guide documents the migration strategy for each package from the current `apps/` and `packages/` structure to the new `frontend/`, `backend/`, and `shared/` layer-based structure.

---

## Current vs Target Structure

### Current (V4)

```
abe-stack/
├── apps/
│   ├── web/           → frontend/web/
│   ├── desktop/       → frontend/desktop/
│   └── server/        → backend/server/
├── packages/
│   ├── api-client/    → frontend/api-client/
│   ├── db/            → backend/db/
│   ├── setup/         → (evaluate: tools/ or remove)
│   ├── shared/        → shared/
│   ├── storage/       → backend/storage/
│   └── ui/            → frontend/ui/
└── config/            → config/ (no change)
```

### Target (V5)

```
abe-stack/
├── frontend/
│   ├── web/           # Vite + React web app
│   ├── desktop/       # Electron desktop app
│   ├── mobile/        # React Native (future)
│   ├── ui/            # Shared UI library
│   └── api-client/    # Frontend API client
├── backend/
│   ├── server/        # Fastify API server
│   ├── db/            # Database layer (Drizzle)
│   ├── storage/       # File storage (S3/local)
│   └── jobs/          # Background jobs (future)
├── shared/
│   ├── contracts/     # ts-rest API contracts
│   ├── types/         # Shared TypeScript types
│   └── validation/    # Zod schemas
└── config/            # Environment, Docker, CI
```

---

## Package Migration Strategies

### Backend Packages (Phase 2)

#### 1. `packages/storage/` → `backend/storage/`

**Dependencies:** None (leaf package)
**Dependents:** `packages/db`, `apps/server`

```bash
# Migration steps
mv packages/storage backend/storage

# Update package.json
# - name: @abe-stack/storage → @backend/storage (optional)
# - repository.directory: packages/storage → backend/storage

# Update imports in dependents
# - packages/db/src/*
# - apps/server/src/*
```

**Import changes:**

```typescript
// Before
import { storage } from '@abe-stack/storage';

// After (V5)
import { storage } from '@backend/storage';
```

---

#### 2. `packages/db/` → `backend/db/`

**Dependencies:** `packages/storage`
**Dependents:** `apps/server`

```bash
# Migration steps (after storage is moved)
mv packages/db backend/db

# Update tsconfig.json paths
# Update package.json repository path
```

**Import changes:**

```typescript
// Before
import { db } from '@abe-stack/db';

// After (V5)
import { db } from '@backend/db';
```

---

#### 3. `apps/server/` → `backend/server/`

**Dependencies:** `packages/shared`, `packages/db`, `packages/storage`
**Dependents:** None (application)

```bash
# Migration steps (after db and storage are moved)
mv apps/server backend/server

# Update all internal imports
# Update package.json repository path
# Update Docker configurations
```

---

### Frontend Packages (Phase 3)

#### 4. `packages/ui/` → `frontend/ui/`

**Dependencies:** None (leaf package)
**Dependents:** `apps/web`, `apps/desktop`

```bash
mv packages/ui frontend/ui
```

**Import changes:**

```typescript
// Before
import { Button } from '@abe-stack/ui';

// After (V5)
import { Button } from '@frontend/ui';
```

---

#### 5. `packages/api-client/` → `frontend/api-client/`

**Dependencies:** `packages/shared`
**Dependents:** `apps/web`, `apps/desktop`

```bash
mv packages/api-client frontend/api-client
```

**Import changes:**

```typescript
// Before
import { apiClient } from '@abe-stack/api-client';

// After (V5)
import { apiClient } from '@frontend/api-client';
```

---

#### 6. `apps/web/` → `frontend/web/`

**Dependencies:** `packages/ui`, `packages/api-client`, `packages/shared`
**Dependents:** None (application)

```bash
mv apps/web frontend/web

# Update vite.config.ts paths
# Update tsconfig.json references
```

---

#### 7. `apps/desktop/` → `frontend/desktop/`

**Dependencies:** `packages/ui`, `packages/api-client`, `packages/shared`
**Dependents:** None (application)

```bash
mv apps/desktop frontend/desktop

# Update electron-builder paths
# Update tsconfig.json references
```

---

### Shared Layer (Phase 4)

#### 8. `packages/shared/` → `shared/`

The shared package will be restructured into subdirectories:

```bash
# Current structure
packages/shared/src/
├── contracts/
├── env.ts
├── stores/
├── utils/
└── validation/

# Target structure
shared/
├── contracts/     # API contracts (ts-rest)
├── types/         # TypeScript type definitions
├── validation/    # Zod schemas
├── utils/         # Shared utilities
└── stores/        # Shared state (if needed)
```

**Import changes:**

```typescript
// Before
import { apiContract } from '@abe-stack/shared/contracts';
import { UserSchema } from '@abe-stack/shared';

// After (V5)
import { apiContract } from '@shared/contracts';
import { UserSchema } from '@shared/validation';
```

---

## Path Alias Configuration

### Root tsconfig paths (to be added)

After migration, the base tsconfig will include:

```json
{
  "compilerOptions": {
    "paths": {
      "@frontend/*": ["./frontend/*"],
      "@backend/*": ["./backend/*"],
      "@shared/*": ["./shared/*"]
    }
  }
}
```

### Per-layer restrictions

**Frontend packages:** Can only import from `@shared/*` and other `@frontend/*`
**Backend packages:** Can only import from `@shared/*` and other `@backend/*`
**Shared packages:** Cannot import from `@frontend/*` or `@backend/*`

---

## Migration Checklist Template

For each package migration:

- [ ] Move directory to new location
- [ ] Update `package.json`:
  - [ ] `name` (optional: new naming convention)
  - [ ] `repository.directory`
- [ ] Update `tsconfig.json`:
  - [ ] `extends` path
  - [ ] `paths` mappings
  - [ ] `references`
- [ ] Update imports in all source files
- [ ] Update imports in dependent packages
- [ ] Run `pnpm install` to update workspace links
- [ ] Run `pnpm type-check` to verify
- [ ] Run `pnpm test` to verify
- [ ] Run `pnpm build` to verify

---

## Rollback Strategy

If issues arise during migration:

1. Each phase should be a separate PR
2. Revert the PR if tests fail
3. All changes are directory moves + import updates (no logic changes)
4. Git history preserved with `git mv`

---

## Post-Migration Cleanup

After all phases complete:

1. Remove empty `apps/` directory
2. Remove empty `packages/` directory
3. Update all documentation references
4. Update CI/CD pipeline paths
5. Update Docker build contexts
6. Update VS Code workspace settings
7. Update README getting started guide

---

## Related Documentation

- [V5 Proposal](./v5-proposal.md) - Architecture proposal and rationale
- [ROADMAP](../ROADMAP.md) - Project milestones and task tracking
