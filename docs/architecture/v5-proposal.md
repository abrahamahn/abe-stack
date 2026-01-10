# V5 Architecture Proposal

**Last Updated: January 10, 2026**

Proposal for restructuring ABE Stack from role-based to layer-based organization.

---

## Current State (V4)

```
abe-stack/
├── apps/           # Applications by platform
│   ├── web/
│   ├── desktop/
│   └── server/
├── packages/       # Shared packages by function
│   ├── ui/
│   ├── api-client/
│   ├── db/
│   ├── shared/
│   └── storage/
└── config/
```

### Problems with Current Structure

1. **Unclear Boundaries**: `packages/` mixes frontend (`ui`) and backend (`db`) code
2. **Import Confusion**: Easy to accidentally import backend code in frontend
3. **Build Complexity**: Turborepo must figure out cross-layer dependencies
4. **Mental Overhead**: "Is this a frontend or backend package?" requires knowledge

---

## Proposed State (V5)

```
abe-stack/
├── frontend/
│   ├── web/           # Vite + React web app
│   ├── desktop/       # Electron desktop app
│   ├── mobile/        # React Native mobile app
│   ├── ui/            # Shared UI library
│   └── api-client/    # Frontend API client
├── backend/
│   ├── server/        # Fastify API server
│   ├── db/            # Database layer (Drizzle)
│   ├── storage/       # File storage (S3/local)
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
| Where does the database schema go?  | `backend/db/`       |
| Where does the API contract go?     | `shared/contracts/` |
| Where does the WebSocket server go? | `backend/server/`   |

---

## Migration Strategy

### Phase 1: Preparation (Non-Breaking)

1. Create new directory structure
2. Add path aliases pointing to new locations
3. Update Turborepo config to recognize new paths
4. No code moves yet - just setup

### Phase 2: Move Backend

```bash
# Order matters - move leaf packages first
mv packages/storage backend/storage
mv packages/db backend/db
mv apps/server backend/server

# Update imports in backend packages
# Run: pnpm lint --fix, pnpm type-check
```

### Phase 3: Move Frontend

```bash
mv packages/ui frontend/ui
mv packages/api-client frontend/api-client
mv apps/web frontend/web
mv apps/desktop frontend/desktop
mv apps/mobile frontend/mobile

# Update imports in frontend packages
```

### Phase 4: Move Shared

```bash
mv packages/shared/src/contracts shared/contracts
mv packages/shared/src/types shared/types
mv packages/shared/src/validation shared/validation

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

### Before (V4)

```typescript
import { Button } from '@abeahn/ui';
import { db } from '@abeahn/db';
import { apiContract } from '@abeahn/shared';
```

### After (V5)

```typescript
// Frontend code
import { Button } from '@frontend/ui';
import { apiClient } from '@frontend/api-client';

// Backend code
import { db } from '@backend/db';
import { storage } from '@backend/storage';

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
2. **PR 2**: Move backend packages
3. **PR 3**: Move frontend packages
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
- [Roadmap - V5 Migration](../ROADMAP.md#milestone-1-v5-architecture-migration)
