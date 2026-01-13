# V5 Architecture Proposal

**Last Updated: January 13, 2026**

Proposal for restructuring ABE Stack from role-based to layer-based organization.

---

## Current State

```
abe-stack/
├── apps/
│   ├── web/           # Vite + React web app
│   ├── desktop/       # Electron desktop app
│   └── server/        # Fastify API server
│       └── src/
│           ├── modules/   # Feature modules (auth, users)
│           └── infra/     # Database, storage, security, pubsub
├── packages/
│   ├── core/          # Contracts, validation, stores, utils
│   ├── ui/            # Shared UI components
│   └── sdk/           # Type-safe API client
└── config/
```

### Current Strengths

1. **Server infrastructure consolidated**: Database, storage, security all under `apps/server/src/infra/`
2. **Clean package separation**: `core` (logic), `ui` (components), `sdk` (client)
3. **Framework-agnostic core**: No React in `packages/core`

### Remaining Issues

1. **Mixed layers in packages/**: `ui` is frontend-only, `sdk` is frontend-only, but they're alongside `core`
2. **No explicit frontend grouping**: Web and desktop apps are separate but could share more structure

---

## Proposed State (V5)

```
abe-stack/
├── frontend/
│   ├── web/           # Vite + React web app
│   ├── desktop/       # Electron desktop app
│   ├── mobile/        # React Native mobile app (future)
│   ├── ui/            # Shared UI library
│   └── sdk/           # Frontend API client
├── backend/
│   ├── server/        # Fastify API server
│   │   └── src/
│   │       ├── modules/
│   │       └── infra/
│   └── jobs/          # Background jobs (future)
├── shared/            # Cross-layer contracts & types
│   ├── contracts/     # ts-rest API contracts
│   ├── types/         # Shared TypeScript types
│   └── validation/    # Zod schemas
└── config/            # Environment, Docker, CI
```

---

## Benefits

### 1. Clear Layer Separation

- **Frontend**: Everything that runs in browser/app
- **Backend**: Everything that runs on server
- **Shared**: Types and contracts both layers use

### 2. Build Optimization

```typescript
// Turborepo can now parallelize by layer
{
  "pipeline": {
    "frontend#build": { "dependsOn": ["shared#build"] },
    "backend#build": { "dependsOn": ["shared#build"] },
    "shared#build": {}
  }
}
```

### 3. Enforced Boundaries

```typescript
// tsconfig.json in frontend/
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["../shared/*"],
      // NO paths to backend/* - compile error if imported
    }
  }
}
```

### 4. Simpler Mental Model

| Question                            | Answer              |
| ----------------------------------- | ------------------- |
| Where does the Button component go? | `frontend/ui/`      |
| Where does the API handler go?      | `backend/server/`   |
| Where does the API contract go?     | `shared/contracts/` |
| Where does the WebSocket server go? | `backend/server/`   |

---

## Migration Strategy

### Phase 1: Preparation (Non-Breaking)

1. Create new directory structure
2. Add path aliases pointing to new locations
3. Update Turborepo config to recognize new paths
4. No code moves yet - just setup

### Phase 2: Move Frontend

```bash
mkdir -p frontend
mv packages/ui frontend/ui
mv packages/sdk frontend/sdk
mv apps/web frontend/web
mv apps/desktop frontend/desktop

# Update imports in frontend packages
# Run: pnpm lint --fix, pnpm type-check
```

### Phase 3: Move Backend

```bash
mkdir -p backend
mv apps/server backend/server

# Update imports in backend packages
```

### Phase 4: Move Shared

```bash
mkdir -p shared
mv packages/core/src/contracts shared/contracts
mv packages/core/src/types shared/types
mv packages/core/src/validation shared/validation
mv packages/core/src/stores shared/stores
mv packages/core/src/utils shared/utils

# Update all cross-layer imports
```

### Phase 5: Cleanup

```bash
rm -rf apps/ packages/
# Update all documentation
# Update CI/CD pipelines
# Update Docker configurations
```

---

## Path Alias Changes

### Before (Current)

```typescript
import { Button } from '@abe-stack/ui';
import { apiContract } from '@abe-stack/core';
import { createApiClient } from '@abe-stack/sdk';
```

### After (V5)

```typescript
// Frontend code
import { Button } from '@frontend/ui';
import { apiClient } from '@frontend/sdk';

// Backend code
import { db } from '@backend/server/infra/database';

// Both layers
import { apiContract } from '@shared/contracts';
import { UserSchema } from '@shared/validation';
```

---

## Package.json Updates

### Root package.json

```json
{
  "workspaces": ["frontend/*", "backend/*", "shared/*", "config"]
}
```

### Turborepo (turbo.json)

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "frontend#build": {
      "dependsOn": ["shared#build"]
    },
    "backend#build": {
      "dependsOn": ["shared#build"]
    }
  }
}
```

---

## Risks and Mitigations

| Risk                       | Mitigation                          |
| -------------------------- | ----------------------------------- |
| Breaking import paths      | Run codemod to update all imports   |
| CI/CD failures             | Test in branch before merging       |
| Documentation drift        | Update docs in same PR              |
| Third-party tool confusion | Update tool configs (.vscode, etc.) |

---

## Timeline

This migration can be done incrementally across multiple PRs:

1. **PR 1**: Create structure, add aliases (no code moves)
2. **PR 2**: Move frontend packages
3. **PR 3**: Move backend packages
4. **PR 4**: Move shared, cleanup old directories
5. **PR 5**: Update all documentation

Each PR should pass all tests before merging.

---

## Decision Status

**Status**: Proposed

Waiting for:

- [ ] Team review of structure
- [ ] Verification of build system changes
- [ ] Assessment of third-party tool impacts

---

## Related Documentation

- [Architecture Overview](./index.md)
- [CHET-Stack Comparison](./chet-comparison.md)
- [Roadmap](../ROADMAP.md)
