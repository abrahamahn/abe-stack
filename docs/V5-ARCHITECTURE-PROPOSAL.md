# V5 Architecture Proposal

## Overview

This document describes the proposed "Layer-Based" architecture for abe-stack, consolidating from 7+ top-level folders to 5 clean layers.

## Proposed Structure

```
abe-stack/
├── frontend/           # All client-side code
│   ├── web/           # React web app
│   ├── desktop/       # Electron app
│   └── shared/        # Frontend-only shared code
│       ├── stores/    # Zustand stores
│       ├── ui/        # React components, hooks, theme
│       └── utils/     # Frontend utilities
│
├── backend/           # All server-side code
│   ├── api/           # API contracts + handlers (colocated)
│   │   ├── auth/route.ts
│   │   ├── users/route.ts
│   │   └── _lib/schemas.ts
│   ├── db/            # Database (Drizzle)
│   ├── server/        # Fastify server
│   └── storage/       # File storage (S3/local)
│
├── shared/            # Truly shared (frontend + backend)
│   ├── config/        # Build configs, docker, prettier, vitest
│   ├── env/           # Environment validation (single source of truth)
│   │   ├── server.ts  # ServerEnv with Zod validation
│   │   └── client.ts  # ClientEnv (frontend-safe)
│   └── scripts/       # Dev tools (kill-port, setup, etc.)
│
├── docs/              # Documentation
└── .github/           # CI/CD workflows
```

## Key Principles

### 1. Colocated API Contracts
Instead of separate `contracts/` and `routes/` folders, each API resource has a single file:
```typescript
// backend/api/auth/route.ts
export const authContract = c.router({ ... });  // Contract
export function createAuthRouter(app) { ... }   // Handler
```

### 2. Single Source of Truth for Environment
```typescript
// shared/env/server.ts - Zod-validated ServerEnv
// shared/env/client.ts - Frontend-safe ClientEnv
```

### 3. Frontend-Specific Shared Code
Stores, UI components, and frontend utils are NOT truly shared with backend, so they belong in `frontend/shared/`.

### 4. Path Aliases
```json
{
  "@ui": "frontend/shared/ui",
  "@stores": "frontend/shared/stores",
  "@utils": "frontend/shared/utils",
  "@api": "backend/api",
  "@db": "backend/db",
  "@server": "backend/server",
  "@storage": "backend/storage",
  "@shared": "shared"
}
```

## Migration Challenges

When attempting to merge this architecture with the security hardening work on main, we encountered:

1. **~100+ merge conflicts** due to:
   - Files renamed to different locations on both branches
   - Significant security features added to auth (account lockout, progressive delays, refresh token rotation)
   - Demo page refactoring on main
   - New UI components and hooks added on main

2. **Structural conflicts**:
   - Old `apps/` and `packages/` structure on main vs new `frontend/` and `backend/` structure
   - Import paths using `@abe-stack/db` vs `@db`

## Recommended Approach

To implement this architecture cleanly:

1. **Start fresh from current main** (with security features intact)
2. **Apply changes incrementally**:
   - Step 1: Move `apps/web/` → `frontend/web/`
   - Step 2: Move `apps/server/` → `backend/server/`
   - Step 3: Move `packages/db/` → `backend/db/`
   - Step 4: Move `packages/ui/` → `frontend/shared/ui/`
   - Step 5: Update path aliases
   - Step 6: Consolidate env and config

3. **Test after each step** to catch issues early

## Previous Attempt

Branch: `claude/compare-chet-stack-architecture-6nh3u`

This branch successfully implemented the V5 structure but diverged significantly from main due to concurrent security work. The merge was too complex to resolve cleanly.

## Status

**Proposed** - Needs fresh implementation from current main branch.
